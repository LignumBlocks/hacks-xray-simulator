import { NextRequest, NextResponse } from 'next/server';
import { HackReportPrismaRepository } from '@/modules/hackXray/infrastructure/hackReportPrismaRepository';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const repository = new HackReportPrismaRepository();
        const report = await repository.findById(id);

        if (!report) {
            return NextResponse.json(
                { errorCode: 'NOT_FOUND', message: 'Report not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ labReport: report });
    } catch (error: any) {
        console.error('GET /api/hack-xray/:id Error:', error);
        return NextResponse.json(
            { errorCode: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' },
            { status: 500 }
        );
    }
}
