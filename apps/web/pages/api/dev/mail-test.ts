// pages/api/dev/mail-test.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).end();
    const { to = "you@example.com" } = (req.body || {}) as { to?: string };
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(400).json({ error: "RESEND_API_KEY missing" });
    const resend = new Resend(apiKey);
    const from = process.env.EMAIL_FROM || "no-reply@whistle.local";
    const r = await resend.emails.send({
      from,
      to,
      subject: "Whistle test email",
      html: "<p>This is a test email from Whistle via Resend.</p>",
    });
    return res.status(200).json({ ok: true, id: r?.data?.id || null });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "mail failed" });
  }
}
