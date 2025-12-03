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
        response.cookies.set('admin_session', sessionHash, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
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
