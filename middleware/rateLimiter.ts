import { NextRequest, NextResponse } from 'next/server';
import LRU from 'lru-cache';

const RATE_LIMIT = 100; // requests
const WINDOW_MS = 60 * 1000; // 1 minute

const tokenCache = new LRU({
  max: 500,
  ttl: WINDOW_MS,
});

export function middleware(req: NextRequest) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const token = tokenCache.get(ip) || { count: 0, start: Date.now() };
  token.count += 1;

  if (token.count > RATE_LIMIT) {
    return new NextResponse('Rate limit exceeded', { status: 429 });
  }

  tokenCache.set(ip, token);
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
