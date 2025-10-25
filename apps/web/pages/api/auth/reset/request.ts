// pages/api/auth/reset/request.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { sendPasswordResetMail } from "../../../../src/lib/email";

const prisma = new PrismaClient();

const TOKEN_TTL_MIN = 30;

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

async function tableExists(name: string) {
  try {
    // SQLite-specific, safe in your env
    // @ts-ignore
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      name
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

async function columnExists(table: string, column: string) {
  try {
    // SQLite PRAGMA
    // @ts-ignore
    const rows: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}");`);
    return Array.isArray(rows) && rows.some((r) => r.name === column);
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ ok: false, error: "Email required" });

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000);

  try {
    // clean current tokens for that email (don’t leak existence)
    await prisma.passwordResetToken.deleteMany({ where: { email } });
  } catch (e) {
    // table may not exist yet — ignore
    console.warn("[reset/request] deleteMany warning:", e);
  }

  try {
    // Ensure table/column presence for dev resilience (SQLite)
    const hasTable = await tableExists("PasswordResetToken");
    if (!hasTable) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "PasswordResetToken" (
          "id" TEXT PRIMARY KEY,
          "email" TEXT NOT NULL,
          "tokenHash" TEXT NOT NULL,
          "expiresAt" DATETIME NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    const hasTokenHash = await columnExists("PasswordResetToken", "tokenHash");
    if (hasTokenHash) {
      await prisma.passwordResetToken.create({
        data: { email, tokenHash, expiresAt },
      });
    } else {
      const hasToken = await columnExists("PasswordResetToken", "token");
      if (hasToken) {
        // legacy schema support
        // @ts-ignore
        await prisma.passwordResetToken.create({
          // @ts-ignore
          data: { email, token, expiresAt },
        });
      } else {
        // very old/misapplied schema — insert raw with tokenHash
        await prisma.$executeRawUnsafe(
          `INSERT INTO "PasswordResetToken" ("id","email","tokenHash","expiresAt") VALUES (?,?,?,?)`,
          crypto.randomUUID(),
          email,
          tokenHash,
          expiresAt.toISOString()
        );
      }
    }
  } catch (e) {
    console.error("[reset/request] token insert failed:", e);
    // Still return 200 to avoid email enumeration.
    return res.status(200).json({ ok: true });
  }

  try {
    await sendPasswordResetMail({ to: email, token });
  } catch (e) {
    console.error("Email send failed:", e);
    // return 200 to avoid enumeration
  }

  return res.status(200).json({ ok: true });
}
