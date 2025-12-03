import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { LabReport } from './labReport';
import { XRayEvent, XRaySourceType } from './ports';

const IP_HASH_SALT = process.env.IP_HASH_SALT || 'default_salt_change_me';

export function hashClientIp(ip?: string): string | undefined {
    if (!ip) return undefined;
    return crypto.createHmac('sha256', IP_HASH_SALT).update(ip).digest('hex');
}

export function buildXRayEvent(params: {
    labReport: LabReport;
    reportId: string;
    sourceType: XRaySourceType;
    sourceHost?: string;
    country: string;
    clientIpHash?: string;
    userAgent?: string;
}): XRayEvent {
    const nowIso = new Date().toISOString();

    return {
        id: uuidv4(),
        reportId: params.reportId,
        submittedAt: nowIso,
        sourceType: params.sourceType,
        sourceHost: params.sourceHost,
        country: params.country,
        clientIpHash: params.clientIpHash,
        userAgent: params.userAgent,
        verdictLabel: params.labReport.verdict.label,
        legalityLabel: params.labReport.evaluationPanel.legalityCompliance.label,
        mathScore0to10: params.labReport.evaluationPanel.mathRealImpact.score0to10,
        riskScore0to10: params.labReport.evaluationPanel.riskFragility.score0to10,
        practicalityScore0to10: params.labReport.evaluationPanel.practicalityFriction.score0to10,
        primaryCategory: params.labReport.hackNormalized.primaryCategory,
        adherenceLevel: params.labReport.adherence?.level,
        createdAt: nowIso,
    };
}
