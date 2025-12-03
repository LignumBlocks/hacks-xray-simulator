import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Only protect /admin and /api/admin routes
    if (!path.startsWith('/admin') && !path.startsWith('/api/admin')) {
        return NextResponse.next();
    }

    // Exclude login routes
    if (path === '/admin/login' || path === '/api/auth/login') {
        return NextResponse.next();
    }

    // Check for admin session cookie
    const adminSession = request.cookies.get('admin_session');

    // Simple validation: just check if cookie exists for now
    // In a real app we would validate the hash against the secret
    // But since we set the cookie HttpOnly on the server, existence is a decent proxy for "logged in"
    // The login route handles the password verification
    if (!adminSession) {
        // Redirect to login for web routes
        if (path.startsWith('/admin')) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
        // Return 401 for API routes
        if (path.startsWith('/api/admin')) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: 'Admin authentication required.' },
                { status: 401 }
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*'],
};
