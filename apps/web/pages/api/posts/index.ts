// pages/api/posts/index.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

type PostRow = {
  id: string
  title: string | null
  body: string | null
  mediaUrl: string | null
  userEmail: string
  subforumName: string | null
  createdAt: string
  updatedAt: string
  imageUrls: string[] // stored as TEXT JSON in SQLite
  _count: {
    comments: number
    votes: number
  }
}

function parseImageUrls(dbValue: any): string[] {
  if (!dbValue) return []
  if (Array.isArray(dbValue)) return dbValue as string[]
  try {
    const parsed = JSON.parse(String(dbValue))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function safeFindManyPaged({
  where,
  orderBy,
  limit,
}: {
  where: Prisma.PostWhereInput
  orderBy: Prisma.PostOrderByWithRelationInput
  limit: number
}): Promise<{ data: any[]; nextCursor?: string }> {
  const rows = await prisma.post.findMany({
    where,
    orderBy,
    take: limit + 1,
    select: {
      id: true,
      title: true,
      body: true, // <- IMPORTANT: body is the real column
      mediaUrl: true,
      userEmail: true,
      subforumName: true,
      createdAt: true,
      updatedAt: true,
      imageUrls: true as any, // SQLite TEXT JSON
      _count: {
        select: { comments: true, votes: true },
      },
    },
  })

  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows

  const mapped = pageRows.map((r) => ({
    id: r.id,
    title: r.title,
    // map DB "body" -> API "content" to preserve your existing UI
    content: r.body ?? '',
    mediaUrl: r.mediaUrl,
    userEmail: r.userEmail,
    subforumName: r.subforumName,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    imageUrls: parseImageUrls(r.imageUrls),
    _count: r._count,
  }))

  const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id : undefined
  return { data: mapped, nextCursor }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const limit = Math.max(1, Math.min(20, Number(req.query.limit || 12)))
    const sort = String(req.query.sort || 'popular')
    const windowParam = String(req.query.window || '7d')

    let where: Prisma.PostWhereInput = {}
    if (sort === 'popular' && windowParam) {
      const match = /^(\d+)([hdw])$/.exec(windowParam)
      if (match) {
        const n = Number(match[1])
        const unit = match[2]
        const ms =
          unit === 'h' ? n * 3600e3 :
          unit === 'd' ? n * 24 * 3600e3 :
          n * 7 * 24 * 3600e3
        const gte = new Date(Date.now() - ms)
        where = { createdAt: { gte } }
      }
    }

    const orderBy: Prisma.PostOrderByWithRelationInput =
      sort === 'latest' ? { createdAt: 'desc' } : { createdAt: 'desc' }

    const { data, nextCursor } = await safeFindManyPaged({ where, orderBy, limit })
    return res.status(200).json({ data, nextCursor })
  } catch (err) {
    console.error('API /posts error:', err)
    // Graceful empty response so UI still renders
    return res.status(200).json({ data: [], nextCursor: undefined })
  }
}
