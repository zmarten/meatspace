import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // POST /api/requests — fast reject if no Authorization header at all.
  // Full async DB-backed key validation happens in the route handler.
  if (pathname === '/api/requests' && method === 'POST') {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Bearer token required' },
        { status: 401 }
      );
    }
  }

  // GET /api/requests — admin session required
  if (pathname === '/api/requests' && method === 'GET') {
    const session = req.cookies.get('hitl_admin_session')?.value;
    if (!(await validateAdminSession(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: admin session required' },
        { status: 401 }
      );
    }
  }

  // /api/admin/keys — admin session required (but not /api/admin/session which is the login endpoint)
  if (pathname.startsWith('/api/admin/keys')) {
    const session = req.cookies.get('hitl_admin_session')?.value;
    if (!(await validateAdminSession(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: admin session required' },
        { status: 401 }
      );
    }
  }

  // /dashboard — admin session with login redirect
  if (pathname.startsWith('/dashboard')) {
    const isLoginPage = pathname === '/dashboard/login';
    const hasValidSession = await validateAdminSession(req.cookies.get('hitl_admin_session')?.value);

    if (!hasValidSession && !isLoginPage) {
      return NextResponse.redirect(new URL('/dashboard/login', req.url));
    }

    if (hasValidSession && isLoginPage) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/requests/:path*', '/api/mcp/:path*', '/api/admin/:path*', '/dashboard/:path*'],
};
