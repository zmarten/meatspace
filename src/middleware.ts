import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, validateApiKey } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  if (pathname === '/api/requests' && method === 'POST') {
    const bearerToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!bearerToken || !validateApiKey(bearerToken)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: valid Bearer token required' },
        { status: 401 }
      );
    }
  }

  if (pathname === '/api/requests' && method === 'GET') {
    const session = req.cookies.get('hitl_admin_session')?.value;
    if (!(await validateAdminSession(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: admin session required' },
        { status: 401 }
      );
    }
  }

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
  matcher: ['/api/requests/:path*', '/api/mcp/:path*', '/dashboard/:path*'],
};
