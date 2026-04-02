import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = [
  { path: '/api/keys', methods: ['GET', 'POST'] },
  { path: '/api/config', methods: ['PATCH'] },
  { path: '/api/stats', methods: ['GET'] },
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // Protect admin endpoints
  const isProtected =
    PROTECTED_ROUTES.some(r => pathname.startsWith(r.path) && r.methods.includes(method)) ||
    (pathname.match(/^\/api\/requests\/[^/]+$/) && method === 'PATCH');

  if (isProtected) {
    const secret = req.headers.get('x-admin-secret');
    if (!secret || secret !== process.env.HITL_ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: missing or invalid x-admin-secret header' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/keys/:path*', '/api/config/:path*', '/api/stats/:path*', '/api/requests/:path*'],
};
