import { PrismaClient } from '@prisma/client';
import { XRayEventRepository, XRayEvent, BasicXRayStats } from '../domain/ports';

const prisma = new PrismaClient();

export class XRayEventPrismaRepository implements XRayEventRepository {
    async save(event: XRayEvent): Promise<void> {
        await prisma.xRayEvent.create({
            data: {
                id: event.id,
                reportId: event.reportId,
                submittedAt: event.submittedAt,
                sourceType: event.sourceType,
                sourceHost: event.sourceHost,
                country: event.country,
                clientIpHash: event.clientIpHash,
                userAgent: event.userAgent,
                verdictLabel: event.verdictLabel,
                legalityLabel: event.legalityLabel,
                mathScore0to10: event.mathScore0to10,
                riskScore0to10: event.riskScore0to10,
                practicalityScore0to10: event.practicalityScore0to10,
                primaryCategory: event.primaryCategory,
                adherenceLevel: event.adherenceLevel,
                createdAt: event.createdAt,
            },
        });
    }

    async getBasicStats(params: { from?: Date; to?: Date }): Promise<BasicXRayStats> {
        const where: any = {};
        if (params.from || params.to) {
            where.submittedAt = {};
            if (params.from) where.submittedAt.gte = params.from;
            if (params.to) where.submittedAt.lte = params.to;
        }

        const [
            totalEvents,
            byVerdictLabel,
            bySourceHost,
            byCountry,
            avgScores
        ] = await Promise.all([
            // Total events
            prisma.xRayEvent.count({ where }),

            // Group by verdict
            prisma.xRayEvent.groupBy({
                by: ['verdictLabel'],
                _count: { verdictLabel: true },
                where,
            }),

            // Group by source host
            prisma.xRayEvent.groupBy({
                by: ['sourceHost'],
                _count: { sourceHost: true },
                where,
                orderBy: { _count: { sourceHost: 'desc' } },
                take: 10, // Top 10 hosts
            }),

            // Group by country
            prisma.xRayEvent.groupBy({
                by: ['country'],
                _count: { country: true },
                where,
                orderBy: { _count: { country: 'desc' } },
            }),

            // Average scores
            prisma.xRayEvent.aggregate({
                _avg: {
                    mathScore0to10: true,
                    riskScore0to10: true,
                    practicalityScore0to10: true,
                },
                where,
            }),
        ]);

        // Transform aggregations to expected format
        const verdictMap: Record<string, number> = {};
        byVerdictLabel.forEach((item: { verdictLabel: string; _count: { verdictLabel: number } }) => {
            verdictMap[item.verdictLabel] = item._count.verdictLabel;
        });

        return {
            totalEvents,
            byVerdictLabel: verdictMap,
            bySourceHost: bySourceHost.map((item: { sourceHost: string | null; _count: { sourceHost: number } }) => ({
                host: item.sourceHost || 'unknown',
                count: item._count.sourceHost,
            })),
            byCountry: byCountry.map((item: { country: string; _count: { country: number } }) => ({
                country: item.country,
                count: item._count.country,
            })),
            avgScores: {
                mathScore0to10: avgScores._avg.mathScore0to10 || 0,
                riskScore0to10: avgScores._avg.riskScore0to10 || 0,
                practicalityScore0to10: avgScores._avg.practicalityScore0to10 || 0,
            },
            timeRange: {
                from: params.from?.toISOString(),
                to: params.to?.toISOString(),
            },
        };
    }
}
