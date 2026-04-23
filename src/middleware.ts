import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, timingSafeCompare } from '@/lib/auth';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // POST /api/requests — agent creates a request (Bearer token)
  if (pathname === '/api/requests' && method === 'POST') {
    const bearerToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!bearerToken || !validateApiKey(bearerToken)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: valid Bearer token required' },
        { status: 401 }
      );
    }
  }

  // GET /api/requests — list all requests (admin secret)
  if (pathname === '/api/requests' && method === 'GET') {
    const secret = req.headers.get('x-admin-secret') || '';
    const expected = process.env.ADMIN_SECRET || '';
    if (!secret || !expected || !timingSafeCompare(secret, expected)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: missing or invalid x-admin-secret header' },
        { status: 401 }
      );
    }
  }

  // POST /api/mcp — MCP tool calls (auth handled in route itself)
  // GET/PATCH /api/requests/[id] — no auth (magic link pattern)
  // GET /api/requests/[id]/wait — no auth

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/requests/:path*', '/api/mcp/:path*'],
};
