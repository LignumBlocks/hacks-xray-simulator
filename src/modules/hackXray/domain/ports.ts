import { LabReport } from './labReport';

export interface HackXRayLLMClient {
    generateLabReport(hackText: string, country: string): Promise<LabReport>;
}

export type HackReportToSave = {
    hackText: string;
    sourceLink?: string | null;
    country: string;

    hackType: string;
    primaryCategory: string;
    verdictLabel: string;
    riskLevel: string;

    rawLabReport: any; // JSON completo validado
};

export type HackReportFilters = {
    hackType?: string;
    primaryCategory?: string;
    verdictLabel?: string;
    createdFrom?: Date;
    createdTo?: Date;
    page: number;
    pageSize: number;
};

export type HackReportSummary = {
    id: string;
    createdAt: Date;
    hackType: string;
    primaryCategory: string;
    verdictLabel: string;
    shortSummary: string;
};

export interface HackReportRepository {
    save(report: HackReportToSave): Promise<string>; // returns id
    findById(id: string): Promise<{ report: LabReport; sourceLink?: string | null } | null>;
    findBySourceLink(url: string): Promise<{ id: string; report: LabReport } | null>;
    findManyWithFilters(filters: HackReportFilters): Promise<{
        items: HackReportSummary[];
        total: number;
    }>;
}

export type XRaySourceType = "url" | "text";

export interface XRayEvent {
    id: string;
    reportId: string;
    submittedAt: string; // ISO string
    sourceType: XRaySourceType;
    sourceHost?: string;
    country: string;
    clientIpHash?: string;
    userAgent?: string;
    verdictLabel: string;
    legalityLabel: string;
    mathScore0to10: number;
    riskScore0to10: number;
    practicalityScore0to10: number;
    primaryCategory?: string;
    adherenceLevel?: string;
    createdAt: string; // ISO string
}

export interface BasicXRayStats {
    totalEvents: number;
    byVerdictLabel: Record<string, number>;
    bySourceHost: { host: string; count: number }[];
    byCountry: { country: string; count: number }[];
    avgScores: {
        mathScore0to10: number;
        riskScore0to10: number;
        practicalityScore0to10: number;
    };
    timeRange: {
        from?: string;
        to?: string;
    };
    // V2 fields
    timeSeries: TimeBucket[];
    adherenceDistribution: DistributionItem[];
    categoryDistribution: DistributionItem[];
}

export interface TimeBucket {
    bucketStart: string; // ISO date
    totalEvents: number;
    avgMathScore0to10: number;
    avgRiskScore0to10: number;
    avgPracticalityScore0to10: number;
}

export interface DistributionItem {
    label: string;
    count: number;
}

export interface XRayEventRepository {
    save(event: XRayEvent): Promise<void>;
    getBasicStats(params: {
        from?: Date;
        to?: Date;
        country?: string;
        sourceHost?: string;
        verdictLabel?: string;
        primaryCategory?: string;
    }): Promise<BasicXRayStats>;
}
