import { LabReport, validateLabReport } from '../domain/labReport';
import { HackXRayLLMClient, HackReportRepository, HackReportToSave, XRayEventRepository } from '../domain/ports';
import { validateCoherence } from '../domain/validateCoherence';
import { ensureNoUnsafePhrases } from '../domain/unsafePhrases';
import { buildXRayEvent } from '../domain/xrayEventService';

export type HackXRayInput = {
    hackText: string;
    sourceLink?: string | null;
    country?: string;
    clientIpHash?: string;
    userAgent?: string;
};

export type HackXRayOutput = {
    id?: string; // Optional in case DB save fails
    labReport: LabReport;
};

export async function runHackXRayUseCase(
    input: HackXRayInput,
    deps: {
        llmClient: HackXRayLLMClient;
        hackReportRepository: HackReportRepository;
        xrayEventRepository?: XRayEventRepository; // Optional for backward compat/testing
    }
): Promise<HackXRayOutput> {
    const country = input.country || 'US';

    // 0. Check for existing report (Deduplication)
    if (input.sourceLink) {
        try {
            const existing = await deps.hackReportRepository.findBySourceLink(input.sourceLink);
            if (existing) {
                console.log(`[HackXRay] Found existing report for ${input.sourceLink}, skipping analysis.`);

                // HU07: Log event for cache hit (optional, but good for tracking usage)
                // For now, we only log NEW executions as per ticket "Cada ejecución del X-Ray debe generar un evento"
                // But if we return cached, is it an execution? 
                // Ticket says "HackReport represents analyzed hacks, xray_events represents usage".
                // So we SHOULD log usage even if cached.
                if (deps.xrayEventRepository) {
                    const event = buildXRayEvent({
                        labReport: existing.report,
                        reportId: existing.id,
                        sourceType: 'url',
                        sourceHost: input.sourceLink ? new URL(input.sourceLink).hostname : undefined,
                        country,
                        clientIpHash: input.clientIpHash,
                        userAgent: input.userAgent,
                    });
                    // Fire and forget
                    deps.xrayEventRepository.save(event).catch(err => console.error('[HackXRay] Failed to log cached event:', err));
                }

                return { id: existing.id, labReport: existing.report };
            }
        } catch (error) {
            console.warn('[HackXRay] Failed to check for existing report:', error);
            // Continue with analysis if check fails
        }
    }

    // 1. Call LLM
    const report = await deps.llmClient.generateLabReport(input.hackText, country);

    // 2. Validate Structure & Basic Rules (HU01)
    validateLabReport(report);

    // 3. Validate Coherence (HU05)
    validateCoherence(report);

    // 4. Check for Unsafe Phrases (HU05 - YMYL Compliance)
    ensureNoUnsafePhrases(report);

    // 5. Save to database (graceful failure)
    let id: string | undefined;
    try {
        const toSave: HackReportToSave = {
            hackText: input.hackText,
            sourceLink: input.sourceLink,
            country,
            hackType: report.hackNormalized.hackType,
            primaryCategory: report.hackNormalized.primaryCategory,
            verdictLabel: report.verdict.label,
            riskLevel: report.evaluationPanel.legalityCompliance.label,
            rawLabReport: report,
        };

        id = await deps.hackReportRepository.save(toSave);

        // HU07: Log XRay Event
        if (id && deps.xrayEventRepository) {
            const event = buildXRayEvent({
                labReport: report,
                reportId: id,
                sourceType: input.sourceLink ? 'url' : 'text',
                sourceHost: input.sourceLink ? new URL(input.sourceLink).hostname : undefined,
                country,
                clientIpHash: input.clientIpHash,
                userAgent: input.userAgent,
            });
            // Fire and forget to not block response
            deps.xrayEventRepository.save(event).catch(err => console.error('[HackXRay] Failed to log event:', err));
        }

    } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to save hack report to database:', error);
        // UX > logging: return the report even if DB fails
    }

    // 6. Return
    return { id, labReport: report };
}
