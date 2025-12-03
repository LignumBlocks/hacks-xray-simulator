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

    async getBasicStats(params: {
        from?: Date;
        to?: Date;
        country?: string;
        sourceHost?: string;
        verdictLabel?: string;
        primaryCategory?: string;
    }): Promise<BasicXRayStats> {
        // Build where clause with all filters
        const where: any = {};
        if (params.from || params.to) {
            where.submittedAt = {};
            if (params.from) where.submittedAt.gte = params.from;
            if (params.to) where.submittedAt.lte = params.to;
        }
        if (params.country) where.country = params.country;
        if (params.sourceHost) where.sourceHost = params.sourceHost;
        if (params.verdictLabel) where.verdictLabel = params.verdictLabel;
        if (params.primaryCategory) where.primaryCategory = params.primaryCategory;

        const [
            totalEvents,
            byVerdictLabel,
            bySourceHost,
            byCountry,
            avgScores,
            timeSeriesRaw,
            adherenceRaw,
            categoriesRaw,
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
                take: 10,
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

            // V2: Time series (daily buckets)
            prisma.$queryRaw<Array<{
                bucket_start: Date;
                total_events: bigint;
                avg_math: number | null;
                avg_risk: number | null;
                avg_practicality: number | null;
            }>>`
                SELECT
                    DATE_TRUNC('day', "submittedAt") AS bucket_start,
                    COUNT(*)::bigint AS total_events,
                    AVG("mathScore0to10") AS avg_math,
                    AVG("riskScore0to10") AS avg_risk,
                    AVG("practicalityScore0to10") AS avg_practicality
                FROM "xray_events"
                WHERE
                    (${params.from ? params.from : null}::timestamp IS NULL OR "submittedAt" >= ${params.from ? params.from : null}::timestamp)
                    AND (${params.to ? params.to : null}::timestamp IS NULL OR "submittedAt" <= ${params.to ? params.to : null}::timestamp)
                    AND (${params.country ? params.country : null}::text IS NULL OR "country" = ${params.country ? params.country : null}::text)
                    AND (${params.sourceHost ? params.sourceHost : null}::text IS NULL OR "sourceHost" = ${params.sourceHost ? params.sourceHost : null}::text)
                    AND (${params.verdictLabel ? params.verdictLabel : null}::text IS NULL OR "verdictLabel" = ${params.verdictLabel ? params.verdictLabel : null}::text)
                    AND (${params.primaryCategory ? params.primaryCategory : null}::text IS NULL OR "primaryCategory" = ${params.primaryCategory ? params.primaryCategory : null}::text)
                GROUP BY bucket_start
                ORDER BY bucket_start ASC
            `,

            // V2: Adherence distribution
            prisma.xRayEvent.groupBy({
                by: ['adherenceLevel'],
                _count: { adherenceLevel: true },
                where: {
                    ...where,
                    adherenceLevel: { not: null },
                },
            }),

            // V2: Category distribution (top 10)
            prisma.xRayEvent.groupBy({
                by: ['primaryCategory'],
                _count: { primaryCategory: true },
                where: {
                    ...where,
                    primaryCategory: { not: null },
                },
                orderBy: { _count: { primaryCategory: 'desc' } },
                take: 10,
            }),
        ]);

        // Transform aggregations
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
            // V2 fields
            timeSeries: timeSeriesRaw.map(row => ({
                bucketStart: row.bucket_start.toISOString(),
                totalEvents: Number(row.total_events),
                avgMathScore0to10: Number(row.avg_math) || 0,
                avgRiskScore0to10: Number(row.avg_risk) || 0,
                avgPracticalityScore0to10: Number(row.avg_practicality) || 0,
            })),
            adherenceDistribution: adherenceRaw.map((item: { adherenceLevel: string | null; _count: { adherenceLevel: number } }) => ({
                label: item.adherenceLevel || 'unknown',
                count: item._count.adherenceLevel,
            })),
            categoryDistribution: categoriesRaw.map((item: { primaryCategory: string | null; _count: { primaryCategory: number } }) => ({
                label: item.primaryCategory || 'unknown',
                count: item._count.primaryCategory,
            })),
        };
    }
}
