import { PrismaClient } from '@prisma/client';
import { HackReportRepository, HackReportToSave, HackReportFilters, HackReportSummary } from '../domain/ports';
import { LabReport } from '../domain/labReport';

const prisma = new PrismaClient();

export class HackReportPrismaRepository implements HackReportRepository {
    async save(data: HackReportToSave): Promise<string> {
        const record = await prisma.hackReport.create({
            data: {
                hackText: data.hackText,
                sourceLink: data.sourceLink,
                country: data.country,
                hackType: data.hackType,
                primaryCategory: data.primaryCategory,
                verdictLabel: data.verdictLabel,
                riskLevel: data.riskLevel,
                rawLabReport: data.rawLabReport as any, // Prisma Json type
            },
        });
        return record.id;
    }

    async findById(id: string): Promise<{ report: LabReport; sourceLink?: string | null } | null> {
        const record = await prisma.hackReport.findUnique({
            where: { id },
        });

        if (!record) return null;

        const raw = record.rawLabReport as any;
        const report = this.adaptToV2(raw);

        return {
            report,
            sourceLink: record.sourceLink
        };
    }

    async findManyWithFilters(filters: HackReportFilters): Promise<{ items: HackReportSummary[]; total: number }> {
        const { page, pageSize, ...whereFilters } = filters;

        // Build dynamic where clause
        const where: any = {};

        if (whereFilters.hackType) {
            where.hackType = whereFilters.hackType;
        }

        if (whereFilters.primaryCategory) {
            where.primaryCategory = whereFilters.primaryCategory;
        }

        if (whereFilters.verdictLabel) {
            where.verdictLabel = whereFilters.verdictLabel;
        }

        if (whereFilters.createdFrom || whereFilters.createdTo) {
            where.createdAt = {};
            if (whereFilters.createdFrom) {
                where.createdAt.gte = whereFilters.createdFrom;
            }
            if (whereFilters.createdTo) {
                where.createdAt.lte = whereFilters.createdTo;
            }
        }

        // Get total count
        const total = await prisma.hackReport.count({ where });

        // Get paginated results
        const rows = await prisma.hackReport.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
        });

        // Map to summary format
        const items: HackReportSummary[] = rows.map(r => ({
            id: r.id,
            createdAt: r.createdAt,
            hackType: r.hackType,
            primaryCategory: r.primaryCategory,
            verdictLabel: r.verdictLabel,
            shortSummary: (r.rawLabReport as any)?.hackNormalized?.shortSummary ?? '',
        }));

        return { items, total };
    }

    private adaptToV2(raw: any): LabReport {
        // If it's already V2, return as is (assuming it's valid)
        if (raw?.meta?.version === '2.0') {
            return raw as LabReport;
        }

        // Adapt V1 (or unknown) to V2
        const adapted: LabReport = {
            ...raw,
            meta: {
                ...raw.meta,
                version: '2.0 (Legacy Adapted)',
            },
            evaluationPanel: {
                ...raw.evaluationPanel,
                legalityCompliance: {
                    ...raw.evaluationPanel?.legalityCompliance,
                    // Map old enums if necessary, or assume they are compatible strings
                    label: raw.evaluationPanel?.legalityCompliance?.label || 'gray_area',
                },
                systemQuirkLoophole: {
                    ...raw.evaluationPanel?.systemQuirkLoophole,
                    // New optional fields can be undefined
                }
            },
            adherence: {
                level: 'intermediate', // Default for legacy
                notes: 'Legacy report: Adherence not analyzed.',
            },
            verdict: {
                ...raw.verdict,
                // Map old enums if necessary
                label: raw.verdict?.label || 'works_if_profile_matches',
                recommendedProfiles: [],
                notForProfiles: [],
            },
        };

        return adapted;
    }
}
