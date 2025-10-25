// pages/api/comments/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { PrismaClient, Prisma } from '@prisma/client';
import authOptions from '../auth/[...nextauth]';

const prisma = new PrismaClient();

type ErrorRes = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ErrorRes>
) {
  try {
    if (req.method === 'GET') {
      const postId = String(req.query.postId || '');
      if (!postId) return res.status(400).json({ error: 'Missing postId' });

      try {
        const rows = await prisma.comment.findMany({
          where: { postId },
          orderBy: { createdAt: 'asc' },
          select: selectBody(),
        });
        return res.status(200).json(rows.map(shapeFromBody));
      } catch (e: any) {
        if (looksLikeUnknownField(e, 'body')) {
          const rows = await prisma.comment.findMany({
            where: { postId },
            orderBy: { createdAt: 'asc' },
            select: selectContent(),
          });
          return res.status(200).json(rows.map(shapeFromContent));
        }
        throw e;
      }
    }

    if (req.method === 'POST') {
      const session = await getServerSession(req, res, authOptions as any);
      if (!session?.user?.email) return res.status(401).json({ error: 'Please log in.' });

      const userEmail = String(session.user.email).toLowerCase();
      const postId = String(req.body?.postId || '');
      const parentId = req.body?.parentId ? String(req.body.parentId) : null;
      const text =
        typeof req.body?.body === 'string'
          ? req.body.body
          : typeof req.body?.content === 'string'
          ? req.body.content
          : '';

      if (!postId) return res.status(400).json({ error: 'Missing postId' });
      if (!text.trim()) return res.status(400).json({ error: 'Missing body' });

      try {
        const created = await prisma.comment.create({
          data: {
            postId,
            userEmail,
            body: text,
            parentId: parentId || undefined,
          } as any,
          select: selectBody(),
        });
        return res.status(200).json(shapeFromBody(created));
      } catch (e: any) {
        if (looksLikeUnknownField(e, 'body')) {
          const created = await prisma.comment.create({
            data: {
              postId,
              userEmail,
              content: text,
              parentId: parentId || undefined,
            } as any,
            select: selectContent(),
          });
          return res.status(200).json(shapeFromContent(created));
        }
        throw e;
      }
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('[api/comments] Error:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}

function selectBody(): Prisma.CommentSelect {
  return {
    id: true,
    postId: true,
    userEmail: true,
    parentId: true,
    createdAt: true,
    updatedAt: true,
    body: true,
  };
}

function selectContent(): Prisma.CommentSelect {
  return {
    id: true,
    postId: true,
    userEmail: true,
    parentId: true,
    createdAt: true,
    updatedAt: true,
    content: true as any,
  } as any;
}

function shapeFromBody(row: any) {
  return {
    ...row,
    body: row.body,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

function shapeFromContent(row: any) {
  return {
    ...row,
    body: row.content,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

function looksLikeUnknownField(e: any, field: string) {
  const msg = String(e?.message || '');
  return /Unknown field/i.test(msg) && new RegExp('`' + field + '`').test(msg);
}
