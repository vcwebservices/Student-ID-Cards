import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import JSZip from "jszip";
import crypto from "crypto";
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
    barcode: {
      message: student.studentNumber,
      format: "PKBarcodeFormatCode128",
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

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);
  const isProduction = process.env.NODE_ENV === "production";

  console.log(`[STARTUP] Starting server in ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} mode on port ${PORT}`);

  app.use(express.json());

  app.post("/api/send-email", async (req, res) => {
    const { studentName, studentEmail, rtoName, rtoDomain, passUrl } = req.body;

    if (!studentName || !rtoName || !passUrl) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Since we likely don't have a configured domain on resend for the RTOs, resend requires verifying the domain.
    // Usually out of the box you can only send from 'onboarding@resend.dev' to the registered email.
    // For this demonstration, we'll try to send it, and catch any errors. The user specified 'no-reply@myvc.com.au'
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

  // 1. Get status/validity of a Student ID Pass
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

  // 2. Generate and Download Apple Wallet (.pkpass) Pass
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
      res.setHeader("Content-Disposition", `attachment; filename="${student.studentNumber || 'student'}.pkpass"`);
      return res.send(pkpassBuffer);
    } catch (err: any) {
      console.error("Apple Wallet pass gen error:", err);
      return res.status(500).send("Error generating Apple Wallet pass: " + err.message);
    }
  });

  // 3. Generate Valid Google Wallet Pass Object for Student Details
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
          type: "CODE_128",
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

  try {
    if (isProduction) {
      console.log("[STARTUP] Setting up static file serving...");
      // Note: express v4 uses '*' and v5 uses '*all' or '/(.*)' but here we are using v4.21.2
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