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
