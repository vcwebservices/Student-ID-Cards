import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
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