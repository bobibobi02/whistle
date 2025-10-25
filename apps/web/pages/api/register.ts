import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

declare global { var __prisma_register: PrismaClient | undefined; }
const prisma = global.__prisma_register ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__prisma_register = prisma;

// Basic email regex; feel free to swap with a better validator
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

    const cleanEmail = (email ?? '').trim().toLowerCase();
    const cleanName = (name ?? '').trim();
    const pwd = password ?? '';

    if (!emailRe.test(cleanEmail)) return res.status(400).json({ ok: false, error: 'Invalid email' });
    if (pwd.length < 6) return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' });

    // existing?
    const exists = await prisma.user.findUnique({ where: { email: cleanEmail }, select: { id: true } });
    if (exists) return res.status(409).json({ ok: false, error: 'Email already registered' });

    const hash = await bcrypt.hash(pwd, 12);

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        name: cleanName || cleanEmail.split('@')[0],
        password: hash,
      },
      select: { id: true, email: true, name: true },
    });

    return res.status(201).json({ ok: true, user });
  } catch (e: any) {
    console.error('POST /api/register error:', e);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
