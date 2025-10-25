// apps/web/pages/api/vote/stats.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Always send JSON, never empty responses. */
function sendJSON(res: NextApiResponse, code: number, data: any) {
  res.status(code).setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data ?? {}));
}

/** Parse safe JSON body (tolerates empty/invalid). */
function getBody<T = any>(req: NextApiRequest): T {
  if (!req.body) return {} as T;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }
  return req.body as T;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let ids: string[] = [];

    // Accept POST { ids: [...] } and GET ?ids=a,b,c
    if (req.method === 'POST') {
      const body = getBody<{ ids?: string[] | string }>(req);
      if (Array.isArray(body.ids)) {
        ids = body.ids;
      } else if (typeof body.ids === 'string' && body.ids) {
        ids = body.ids.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else if (req.method === 'GET') {
      const q = req.query.ids as string | string[] | undefined;
      if (Array.isArray(q)) {
        ids = q.flatMap((s) => s.split(',')).map((s) => s.trim()).filter(Boolean);
      } else if (typeof q === 'string' && q) {
        ids = q.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else {
      return sendJSON(res, 405, { error: 'Method not allowed' });
    }

    if (!ids.length) {
      return sendJSON(res, 400, { error: 'ids required' });
    }

    // Compute counts for each id
    const result: Record<string, { up: number; down: number }> = {};
    await Promise.all(
      ids.map(async (postId) => {
        const [up, down] = await Promise.all([
          prisma.vote.count({ where: { postId, value: 1 } }),
          prisma.vote.count({ where: { postId, value: -1 } }),
        ]);
        result[postId] = { up, down };
      })
    );

    return sendJSON(res, 200, result);
  } catch (e: any) {
    const msg = e?.message || 'Unexpected error';
    return sendJSON(res, 500, { error: msg });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
