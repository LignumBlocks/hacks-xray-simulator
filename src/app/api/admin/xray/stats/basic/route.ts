import { NextRequest, NextResponse } from 'next/server';
import { XRayEventPrismaRepository } from '@/modules/hackXray/infrastructure/xrayEventPrismaRepository';

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);

        // Parse query parameters
        const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from')!) : undefined;
        const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')!) : undefined;

        const repository = new XRayEventPrismaRepository();
        const stats = await repository.getBasicStats({ from, to });

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error('GET /api/admin/xray/stats/basic Error:', error);
        return NextResponse.json(
            { errorCode: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
