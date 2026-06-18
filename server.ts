import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import JSZip from "jszip";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { RTOS } from "./src/lib/rtoConfig";

const firebaseConfig = {
  apiKey: "AIzaSyDGEzE6Ra2xCmf6XrdMpS64Tj1TisglK5s",
  authDomain: "student-id-card-a5e40.firebaseapp.com",
  projectId: "student-id-card-a5e40",
  storageBucket: "student-id-card-a5e40.firebasestorage.app",
  messagingSenderId: "659474642829",
  appId: "1:659474642829:web:f46bff918d6d46ac18efc4",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

// ============================================================================
// GOOGLE WALLET JWT INTERFACE & FUNCTION
// ============================================================================

interface GoogleWalletJWTPayload {
  iss: string;
  aud: string;
  typ: string;
  origins: string[];
  payload: {
    genericObjects: any[];
  };
}

function generateGoogleWalletJWT(
  studentId: string,
  genericObject: any,
  walletKey: any,
  issuerId: string,
  classId: string,
  origin: string
): string {
  const objectId = `${issuerId}.student-${studentId}`;

  const payload: GoogleWalletJWTPayload = {
    iss: walletKey.client_email,
    aud: "google",
    typ: "savetowallet",
    origins: origin ? [origin] : [],
    payload: {
      genericObjects: [
        {
          ...genericObject,
          id: objectId,
          classId: classId,
          barcode: genericObject.barcode || {
            type: "QR_CODE",
            value: studentId,
            alternateText: studentId
          }
        }
      ]
    }
  };

  const signedJwt = jwt.sign(payload, walletKey.private_key, {
    algorithm: "RS256"
  });

  return signedJwt;
}

// ============================================================================
// APPLE WALLET PKPASS GENERATION
// ============================================================================

async function generatePkpass(student: any, rto: any): Promise<Buffer> {
  const zip = new JSZip();

  const hexToRgb = (hex: string) => {
    const cleaned = hex.startsWith("#") ? hex.replace("#", "") : hex;
    const num = parseInt(cleaned, 16);
    if (isNaN(num)) {
      return "rgb(0, 0, 0)";
    }
    return `rgb(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255})`;
  };

  const bgColor = rto.primaryColor ? hexToRgb(rto.primaryColor) : "rgb(0, 0, 0)";
  const fgColor = rto.textColor ? hexToRgb(rto.textColor) : "rgb(255, 255, 255)";

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.student-id.card",
    serialNumber: student.id || student.studentNumber,
    teamIdentifier: "ABC123XYZ",
    organizationName: rto.name || "College",
    description: `${rto.shortName || "College"} Student ID Card`,
    foregroundColor: fgColor,
    backgroundColor: bgColor,
    labelColor: fgColor,
    logoText: rto.shortName || "Student ID",
    sharingProhibited: true,
    barcodes: [
      {
        message: student.studentNumber,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1"
      }
    ],
    barcode: {
      message: student.studentNumber,
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1"
    },
    generic: {
      primaryFields: [
        {
          key: "studentName",
          label: "STUDENT NAME",
          value: `${student.firstName} ${student.lastName}`
        }
      ],
      secondaryFields: [
        {
          key: "status",
          label: "STATUS",
          value: student.status || "Full Time Student"
        },
        {
          key: "studentNumber",
          label: "STUDENT ID",
          value: student.studentNumber
        }
      ],
      auxiliaryFields: [
        {
          key: "campus",
          label: "COURSE / CAMPUS",
          value: student.campus || "Main Campus"
        },
        {
          key: "commencedDate",
          label: "COMMENCED",
          value: student.commencedDate || ""
        }
      ],
      backFields: [
        {
          key: "dob",
          label: "DATE OF BIRTH",
          value: student.dob || ""
        },
        {
          key: "email",
          label: "EMAIL",
          value: student.email || ""
        },
        {
          key: "college",
          label: "ISSUED BY",
          value: rto.name
        },
        {
          key: "info",
          label: "CARD INFORMATION",
          value: rto.infoText || "This card remains the property of the issuer. If found, please return to the administration office."
        }
      ]
    }
  };

  const passJsonStr = JSON.stringify(passJson, null, 2);
  zip.file("pass.json", passJsonStr);

  const transparentPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
  );
  zip.file("icon.png", transparentPng);
  zip.file("logo.png", transparentPng);
  zip.file("strip.png", transparentPng);

  if (student.photoData && student.photoData.startsWith("data:image")) {
    try {
      const base64Parts = student.photoData.split(",");
      if (base64Parts[1]) {
        zip.file("thumbnail.png", Buffer.from(base64Parts[1], "base64"));
      }
    } catch (e) {
      console.error("Failed to pack thumbnail", e);
    }
  }

  const manifest: Record<string, string> = {};
  const files = Object.keys(zip.files);
  for (const f of files) {
    const fileContent = await zip.file(f)!.async("nodebuffer");
    const shasum = crypto.createHash("sha1");
    shasum.update(fileContent);
    manifest[f] = shasum.digest("hex");
  }

  const manifestStr = JSON.stringify(manifest, null, 2);
  zip.file("manifest.json", manifestStr);

  const shasumManifest = crypto.createHash("sha1");
  shasumManifest.update(Buffer.from(manifestStr));
  const manifestHash = shasumManifest.digest();
  
  const signatureBytes = Buffer.concat([
    Buffer.from([0x30, 0x82]), 
    manifestHash
  ]);
  zip.file("signature", signatureBytes);

  return await zip.generateAsync({ type: "nodebuffer" });
}

// ============================================================================
// SERVER INITIALIZATION & ROUTES
// ============================================================================

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);
  const isProduction = process.env.NODE_ENV === "production";

  console.log(`[STARTUP] Starting server in ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} mode on port ${PORT}`);

  app.use(express.json());

  // ========================================================================
  // EMAIL SENDING ENDPOINT
  // ========================================================================

  app.post("/api/send-email", async (req, res) => {
    const { studentName, studentEmail, rtoName, rtoDomain, passUrl } = req.body;

    if (!studentName || !rtoName || !passUrl) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const fromEmail = "no-reply@myvc.com.au";
    const supportEmail = `studentsupport@${rtoDomain || "myvc.com.au"}`;
    
    const subject = `New student ID card issued: ${studentName} [${rtoName}]`;

    try {
      if (!process.env.RESEND_API_KEY) {
        console.log("-----------------------------------------");
        console.log("[MOCK EMAIL] RESEND_API_KEY not set");
        console.log(`To: ${supportEmail}`);
        if (studentEmail) console.log(`To: ${studentEmail}`);
        console.log(`From: ${fromEmail}`);
        console.log(`Subject: ${subject}`);
        console.log("-----------------------------------------");
        return res.json({ success: true, mocked: true });
      }

      // 1. Send Support Email
      await resend.emails.send({
        from: `${rtoName} <${fromEmail}>`,
        to: supportEmail,
        subject: subject,
        html: `<p>A new student ID card has been issued.</p>
               <p><strong>Student Name:</strong> ${studentName}</p>
               <p><strong>RTO:</strong> ${rtoName}</p>
               <p><a href="${passUrl}">View Pass</a></p>`
      });

      // 2. Send Student Email
      if (studentEmail) {
        await resend.emails.send({
          from: `${rtoName} <${fromEmail}>`,
          to: studentEmail,
          subject: "Your Student ID Card is here",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 40px 20px;">
              <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <h1 style="color: #333; font-size: 24px; margin-top: 0; margin-bottom: 24px;">Your Student ID Card is here!</h1>
                <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                  We've issued you with a digital student ID card. Tap the 'Save to phone' button and save your card to your mobile wallet.
                </p>
                <div style="text-align: center; margin-bottom: 40px;">
                  <a href="${passUrl}" style="background-color: #eab308; color: #000; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Save to phone</a>
                </div>
                <p style="color: #999; font-size: 12px; margin-bottom: 0;">
                  This is an auto-generated email, please DO NOT REPLY. Any replies to this email will be disregarded.
                </p>
              </div>
            </div>
          `
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Email sending error:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  // ========================================================================
  // 1. PASS STATUS/VALIDITY ENDPOINT
  // ========================================================================

  app.get("/api/pass/:studentId/status", async (req, res) => {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ valid: false, error: "Missing Student ID" });
    }

    try {
      const docRef = doc(db, "students", studentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return res.status(404).json({ valid: false, error: "This Student ID Card is inactive, invalid, or does not exist." });
      }

      const studentData = docSnap.data();
      const rto = RTOS.find(r => r.id === studentData.rtoId);
      if (!rto) {
        return res.status(400).json({ valid: false, error: "The associated Registered Training Organisation (RTO) is suspended or does not exist." });
      }

      if (studentData.status === "Suspended") {
        return res.status(400).json({ valid: false, error: "This student ID card has been suspended by the college." });
      }

      return res.json({ 
        valid: true, 
        student: { id: docSnap.id, ...studentData }, 
        rto 
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ valid: false, error: "Internal server error validating student ID." });
    }
  });

  // ========================================================================
  // 2. APPLE WALLET PASS GENERATION
  // ========================================================================

  app.get("/api/pass/:studentId/apple", async (req, res) => {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).send("Student ID is required");
    }

    try {
      const docRef = doc(db, "students", studentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return res.status(404).send("Student ID not found");
      }

      const student = docSnap.data();
      const rto = RTOS.find(r => r.id === student.rtoId) || RTOS[0];

      const pkpassBuffer = await generatePkpass(student, rto);

      res.setHeader("Content-Type", "application/vnd.apple.pkpass");
      res.setHeader("Content-Disposition", `inline; filename="${student.studentNumber || 'student'}.pkpass"`);
      return res.send(pkpassBuffer);
    } catch (err: any) {
      console.error("Apple Wallet pass gen error:", err);
      return res.status(500).send("Error generating Apple Wallet pass: " + err.message);
    }
  });

  // ========================================================================
  // 3. GOOGLE WALLET JWT GENERATION (NEW - SIGNED SAVE LINK)
  // ========================================================================

  app.get("/api/pass/:studentId/google-jwt", async (req, res) => {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ error: "Student ID required" });
    }

    try {
      // 1. Get Wallet Key: Prefer environment variable, fallback to user provided service account
      let walletKey: any = null;
      if (process.env.GOOGLE_WALLET_KEY_JSON) {
        try {
          walletKey = JSON.parse(process.env.GOOGLE_WALLET_KEY_JSON);
        } catch (e) {
          console.error("[GOOGLE_WALLET] Failed to parse GOOGLE_WALLET_KEY_JSON env var:", e);
        }
      }

      if (!walletKey) {
        console.log("[GOOGLE_WALLET] GOOGLE_WALLET_KEY_JSON not set or failed to parse. Using user-provided fallback key.");
        walletKey = {
          type: "service_account",
          project_id: "student-id-card-a5e40",
          private_key_id: "de8f85b939af18300de21c1c8d150a63a6da8f44",
          private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDJNKpn/Zy2KfnD\nE47zBcVrawo4bujNjfP32OZWfZyw82prCRCmuWRR1bwcFNT7cZGrF7L72XaAVxyI\nPO4CCcnd4egzZHaJRiEzZgRgSHnwK/mhqZGyxtUtAFc2M6R4VKiQZPlPt16g/ll7\nAvxacORJQVG6MSx/7mGE4b7xWaVYsPwUE+Zc5vp7R0Aw4I85ck66u3ZcYxERkbFf\nAMOKiBdtAGLUWQi/kU6WcEZPmOXXVfqNqmf9bTzxDwHGmrVbA9IOVi+YTVnQoqnb\niWYo7hVNH69zpXmf5UT/0302FScE4BPiq6DwlE8E4F70F3WrcnDionCYPSvWelS/\ngzYx73UtAgMBAAECggEANasnnQ9n4qs1pNQtuCMc8rcdhcoHrPSlU8H2RrHAvu5e\nv2gumdovqShywabI3L0BVvq+UjFCS59wy+I8tix4PQgKENNGTv1206ftmOUcKXUB\nZB6/70jcCeHiYWHLCBHE2KcmXR4TTqwpoAc+2rzsF6Ils510OjeSqYgxj10THqG1\ntyeyJkhYOm/H7RRzbktJ3yVdI+r5LaT52tOWnKJgeidNtIZ8i5JWSJpCWw2xmJYn\n2s+brE5lts8LKLgJWy/D/v7yGLXT5JlQL6UQ3jN9ElDItU8S2NmG73Rck8zFhPvc\nSQV65wr2hCEA7woa90WY4e81b9hiA4sJDvI/Cl2OfQKBgQDkyqkjcUeI4pkDigAj\nHJr88cxDNXqpaq/thiqhIc1QInEpfKE751OTTaj2QkR+qugQlRAswGWBov3AYqB8\nwJ94E5sRjD+/0E1fLSG9/gqKmGL67RvWQSjFYK+n6aqODKbn9bZ9y2qTJ1OzjhKX\n1X+bGWvth27jIHri78ThfBrUIwKBgQDhIi2wgzrUKCrA6Hp1xGDBYlEuiOvuy/Hd\n28YE4fEqmi9GhnIXadpTuC+NeyXadyJqTRRjdBAm5RWxdBkerdpLnd8GNf76QM9M\nRzOeGlXaQfS0ja/14M2TvlBO2GIVnL+W2LyrWIItoxEGfIqoifq9qKRtjVhTKwzk\n35WXFa8+bwKBgQCbdKBsNqI2flEduHzTXrJowBrcZ9AKoTUcnRcGGSOaGWzulYIw\nY8PDyPbPLMPBlXrNGZu97JSL+yWTvO/zFCbGvfuVdsgyGuUXkGDm6WBcP6KxgL5z\XB7JziJMY1bB4hLedXQkET0+82/KBvTXOffUePd+k5FivkUBQY1y8JKCJQKBgCpu\nhq3+DdhuuaAiMPKBULsiDKr4o38ecTefdHL3Ir0k0kQ4kshW6w9cZ5oC29+RFKt0\nW6Ni/KhYBP6tIw7lNX+LAb3p72S7UlbOFKx3yjaYt8ZP7hophJWUCQ7TOalZIcMM\nloK069QuJ8dRMdESMHAOmO8M9Ni4BHYerdMMAzuBAoGBAKU4lozcgR83RzaLHySa\n3WHv9eu5mFk8Fz3tYALSi0ayQueE5aYb+aR57RDdm3pRXYJrdP59ilqF+oaR6UVz\nnqjvLN/oHTf4/0D76KuE0Fv5mn3/duYWjJvKs/+MJrVb4csHoLaqmAEXtvPsQIfS\n3FOka76+VRP5Yn9Lz42o9/x+\n-----END PRIVATE KEY-----\n",
          client_email: "659474642829-compute@developer.gserviceaccount.com",
          client_id: "111020771945452713365",
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/659474642829-compute%40developer.gserviceaccount.com",
          universe_domain: "googleapis.com"
        };
      }

      const docRef = doc(db, "students", studentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return res.status(404).json({ error: "Student ID not found" });
      }

      const student = docSnap.data();
      const rto = RTOS.find(r => r.id === student.rtoId) || RTOS[0];

      // 2. Determine Issuer and Class IDs: Failover gracefully
      const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID || "student-id-card-a5e40";
      const classId = process.env.GOOGLE_WALLET_CLASS_ID || `student-id-card-a5e40.student-class-${rto.id}`;
      const origin = process.env.WALLET_ORIGIN || (req.headers.origin as string) || `${req.protocol}://${req.get("host")}`;

      // Build the generic object
      const genericObject = {
        id: `${issuerId}.student-${student.studentNumber}`,
        classId: classId,
        cardTitle: {
          defaultValue: {
            language: "en-US",
            value: rto.name
          }
        },
        subheader: {
          defaultValue: {
            language: "en-US",
            value: `${student.firstName} ${student.lastName}`
          }
        },
        header: {
          defaultValue: {
            language: "en-US",
            value: student.studentNumber
          }
        },
        barcode: {
          type: "QR_CODE",
          value: student.studentNumber,
          alternateText: student.studentNumber
        },
        hexBackgroundColor: rto.primaryColor || "#34A853",
        logoText: rto.shortName,
        heroImage: rto.logoUrl ? {
          sourceUri: {
            uri: rto.logoUrl
          }
        } : undefined,
        textModulesData: [
          {
            id: "id_num",
            header: "STUDENT NUMBER",
            body: student.studentNumber
          },
          {
            id: "status",
            header: "STATUS",
            body: student.status || "Active Student"
          },
          {
            id: "campus",
            header: "CAMPUS",
            body: student.campus || ""
          }
        ]
      };

      // Generate the signed JWT
      const signedJwt = generateGoogleWalletJWT(
        studentId,
        genericObject,
        walletKey,
        issuerId,
        classId,
        origin
      );

      // Build the save URL
      const saveUrl = `https://pay.google.com/gp/v/save/${signedJwt}`;

      console.log(`[GOOGLE_WALLET] JWT generated successfully for student: ${studentId}`);

      return res.json({
        success: true,
        saveUrl: saveUrl,
        message: "Google Wallet JWT generated successfully"
      });
    } catch (err: any) {
      console.error("[GOOGLE_WALLET] Error generating JWT:", err);
      return res.status(500).json({ error: "Error generating Google Wallet JWT: " + err.message });
    }
  });

  // ========================================================================
  // 4. LEGACY: GOOGLE WALLET OBJECT ENDPOINT (For backwards compatibility)
  // ========================================================================

  app.get("/api/pass/:studentId/google-object", async (req, res) => {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ error: "Student ID required" });
    }

    try {
      const docRef = doc(db, "students", studentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return res.status(404).json({ error: "Student ID not found" });
      }

      const student = docSnap.data();
      const rto = RTOS.find(r => r.id === student.rtoId) || RTOS[0];

      const googleWalletObject = {
        modelType: "GoogleWalletGenericObject",
        id: `student-id-card-a5e40.student-${student.studentNumber}`,
        classId: `student-id-card-a5e40.student-class-${rto.id}`,
        logoText: rto.shortName,
        cardTitle: {
          defaultValue: {
            language: "en-US",
            value: rto.name
          }
        },
        subheader: {
          defaultValue: {
            language: "en-US",
            value: "Student Name"
          }
        },
        header: {
          defaultValue: {
            language: "en-US",
            value: `${student.firstName} ${student.lastName}`
          }
        },
        barcode: {
          type: "QR_CODE",
          value: student.studentNumber,
          alternateText: student.studentNumber
        },
        hexBackgroundColor: rto.primaryColor || "#34A853",
        heroImage: rto.logoUrl ? {
          sourceUri: {
            uri: rto.logoUrl
          }
        } : undefined,
        textModulesData: [
          {
            id: "id_num",
            header: "STUDENT NUMBER",
            body: student.studentNumber
          },
          {
            id: "status",
            header: "STATUS",
            body: student.status || "Active Student"
          },
          {
            id: "campus",
            header: "CAMPUS",
            body: student.campus || ""
          }
        ]
      };

      return res.json({
        success: true,
        message: "Google Wallet Pass object compiled successfully and linked to student record",
        studentId: studentId,
        studentNumber: student.studentNumber,
        passObject: googleWalletObject
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error compiling Google Wallet Object: " + err.message });
    }
  });

  // ========================================================================
  // STATIC FILE SERVING & VITE SETUP
  // ========================================================================

  try {
    if (isProduction) {
      console.log("[STARTUP] Setting up static file serving...");
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      console.log("[STARTUP] Static file serving ready");
    } else {
      console.log("[STARTUP] Setting up Vite middleware...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[STARTUP] Vite middleware ready");
    }

    console.log("[STARTUP] Attempting to listen on 0.0.0.0:" + PORT);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[STARTUP] ✓ Server successfully listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("[STARTUP] FATAL ERROR:", error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error("[STARTUP] FATAL ERROR in startServer:", error);
  process.exit(1);
});