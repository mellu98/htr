import { NextRequest, NextResponse } from 'next/server';
import {
  buildUnauthorizedResponse,
  getSessionCookie,
  verifySessionToken,
} from '@/lib/auth/session';

// Routes that do not require authentication.
const PUBLIC_PATHS = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
]);

const PUBLIC_PREFIXES = [
  '/_next/',
  '/icons/',
  '/videos/',
  '/manifest',
  '/favicon.ico',
];

// Admin-only routes (prefix match so /ai and /ai/tutor are both covered).
const ADMIN_PREFIXES = ['/ai'];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function buildForbiddenResponse(request: NextRequest): NextResponse {
  const isApi = request.nextUrl.pathname.startsWith('/api/');
  if (isApi) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.redirect(new URL('/', request.url));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Always allow public assets and auth endpoints.
  if (isPublicPath(pathname)) {
    // Redirect already-authenticated users away from the login page.
    if (pathname === '/login') {
      const token = getSessionCookie(request);
      const session = await verifySessionToken(token);
      if (session) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    return NextResponse.next();
  }

  // Everything else requires a valid session.
  const token = getSessionCookie(request);
  const session = await verifySessionToken(token);
  if (!session) {
    return buildUnauthorizedResponse(request);
  }

  // Admin-only area.
  if (isAdminPath(pathname) && session.role !== 'admin') {
    return buildForbiddenResponse(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*$).*)'],
};
