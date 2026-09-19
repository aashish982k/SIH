import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware — protects /admin routes.
 * Checks localStorage isn't available in middleware (Edge runtime),
 * so we use a cookie `nwis_role=admin` set on login.
 * The client also sets localStorage for Zustand hydration.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ['/admin/:path*'],
};
