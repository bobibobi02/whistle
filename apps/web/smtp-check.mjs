// smtp-check.mjs  (place at: apps/web/smtp-check.mjs)
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT = "465",
  SMTP_SECURE = "true",
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

// Fallback to process.env not being loaded when running plain node:
// provide quick inline overrides while testing if you want:
// process.env.SMTP_USER = "..."; process.env.SMTP_PASS = "...";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === "true",
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: {
    // Gmail & most providers are fine with this left default (false).
    // Flip to true ONLY if your network is doing TLS interception.
    rejectUnauthorized: false,
    servername: SMTP_HOST,
  },
});

const main = async () => {
  console.log("Testing SMTP…", { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_FROM });
  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to: SMTP_USER, // send to yourself
    subject: "SMTP check ✔",
    text: "If you got this, SMTP is working.",
  });
  console.log("OK:", info.messageId);
};

main().catch((e) => {
  console.error("SMTP FAILED:", e);
  process.exit(1);
});
