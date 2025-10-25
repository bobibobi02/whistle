import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.match(/^\/profile\/edit/) || pathname.match(/^\/api\/profile\//)) {
    const token = await getToken({ req, secret: SECRET });
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/api/auth/signin';
      url.searchParams.set('callbackUrl', req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/profile/edit', '/api/profile/:id*'],
};
