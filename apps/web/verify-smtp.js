// verify-smtp.js
require("dotenv").config();
const nodemailer = require("nodemailer");

function envBool(v, def=false) {
  if (v == null) return def;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

const user = (process.env.EMAIL_USER || "").trim();
const rawPass = process.env.EMAIL_PASS || "";
// Remove EVERYTHING except letters/numbers (so spaces, quotes, punctuation are ignored)
const pass = rawPass.replace(/[^a-zA-Z0-9]/g, "");

console.log("🔎 EMAIL_PASS raw length =", rawPass.length, "| sanitized length =", pass.length);
if (rawPass !== pass) console.log("ℹ️ Removed non-alphanumeric characters from EMAIL_PASS. Paste only the 16 chars Google shows.");

if (!user || !pass) {
  console.error("❌ Missing EMAIL_USER or EMAIL_PASS in .env (must use a Gmail App Password).");
  process.exit(1);
}
if (pass.length !== 16) {
  console.error(`❌ EMAIL_PASS must be exactly 16 letters/numbers. Got ${pass.length}.`);
  process.exit(1);
}

const combos = [
  { host: "smtp.gmail.com", port: 587, secure: false, label: "STARTTLS 587 (secure=false)" },
  { host: "smtp.gmail.com", port: 465, secure: true,  label: "SMTPS 465 (secure=true)"  },
];

async function tryCombo({ host, port, secure, label }) {
  const allowSelfSigned = envBool(process.env.SMTP_ALLOW_SELF_SIGNED, false);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,            // true=465, false=587
    auth: { user, pass },
    tls: allowSelfSigned ? { rejectUnauthorized: false } : undefined,
    requireTLS: !secure // enforce STARTTLS on 587
  });

  console.log(`\n🔧 Trying ${label} for ${host}:${port} as ${user}`);
  try {
    await transporter.verify();
    console.log(`✅ Works with ${label}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed with ${label}:`, err?.message || err);
    return false;
  }
}

(async () => {
  let ok = false;
  for (const c of combos) {
    // eslint-disable-next-line no-await-in-loop
    if (await tryCombo(c)) { ok = true; break; }
  }
  if (!ok) {
    console.error("\nStill failing? Check:");
    console.error("  • Use a Gmail **App Password** (not your normal password/OAuth token).");
    console.error("  • Google shows it like 'abcd efgh ijkl mnop' → paste as 'abcdefghijklmnop'.");
    console.error("  • Create it on the **same account** as EMAIL_USER, and approve security prompts.");
    console.error("  • Workspace admins can disable App Passwords; Advanced Protection disables them entirely.");
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
