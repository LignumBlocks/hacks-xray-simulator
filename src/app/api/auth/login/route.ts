import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();
        const adminSecret = process.env.ADMIN_SECRET;

        if (!adminSecret) {
            console.error('ADMIN_SECRET not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        if (password !== adminSecret) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }

        // Create session hash
        const sessionHash = crypto.createHash('sha256').update(adminSecret).digest('hex');

        const response = NextResponse.json({ success: true });

        // Set cookie
        // In production, cookies should be secure (HTTPS only).
        // However, if the VPS is behind a proxy handling SSL or just testing on HTTP,
        // we might need to disable this.
        const isSecure = process.env.NODE_ENV === 'production' && process.env.DISABLE_SECURE_COOKIES !== 'true';

        response.cookies.set('admin_session', sessionHash, {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24, // 1 day
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
