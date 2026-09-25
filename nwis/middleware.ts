import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware — protects all routes except public landing and auth pages.
 * Also enforces role-based access for /admin routes.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = pathname === '/' || pathname === '/login' || pathname === '/signup';
  const token = request.cookies.get('nwis_token')?.value;

  // Protect all non-public routes
  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    const role = request.cookies.get('nwis_role')?.value;
    if (role !== 'admin') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except Next.js internals and static assets
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
