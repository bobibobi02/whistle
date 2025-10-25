// pages/api/auth/reset/confirm.ts
import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MIN_PASSWORD_LEN = 8;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { token, password } = req.body || {};
    if (!token || typeof token !== "string") return res.status(400).json({ error: "Missing token" });
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Missing password" });
    }
    if (password.length < MIN_PASSWORD_LEN) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LEN} characters` });
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error("Missing NEXTAUTH_SECRET");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    // Verify & decode token (contains email, optional redirectTo, and exp)
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const email = decoded?.email as string | undefined;
    if (!email) return res.status(400).json({ error: "Invalid token payload" });

    // Hash and save
    const hash = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { email },
      data: { password: hash },
      select: { id: true, email: true },
    });

    // Optional: support redirectTo if your frontend wants to navigate after success
    const redirectTo = typeof decoded?.redirectTo === "string" ? decoded.redirectTo : null;

    return res.json({ ok: true, user: updated, redirectTo });
  } catch (err: any) {
    console.error("reset/confirm error:", err?.message || err);
    // Normalize error to avoid leaking details
    return res.status(500).json({ error: "Failed to reset password" });
  }
}
