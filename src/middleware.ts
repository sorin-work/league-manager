import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from './lib/session-cookie';

/**
 * Cheap gate for the admin area: without a session cookie there is no point
 * rendering the page. The session itself is validated by the admin layout and
 * by every API handler that changes data.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === '/admin/login' || req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = new URL('/admin/login', req.url);
  url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*'],
};
