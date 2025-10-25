import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  // Only protect sensitive routes
  if (url.pathname.startsWith('/api/admin/') || url.pathname.startsWith('/mod/')) {
    const session = await getServerSession(req, NextResponse.next(), authOptions);
    if (!session) return NextResponse.redirect('/auth/signin');
    const lastSudo = session.user.lastSudo || 0;
    const now = Date.now();
    // 5 minute sudo timeout
    if (now - lastSudo > 5 * 60 * 1000) {
      url.pathname = '/sudo';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*', '/mod/:path*'],
};
