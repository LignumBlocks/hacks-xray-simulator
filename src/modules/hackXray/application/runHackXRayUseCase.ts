import { LabReport, validateLabReport } from '../domain/labReport';
import { HackXRayLLMClient, HackReportRepository, HackReportToSave } from '../domain/ports';
import { validateCoherence } from '../domain/validateCoherence';
import { ensureNoUnsafePhrases } from '../domain/unsafePhrases';

export type HackXRayInput = {
    hackText: string;
    sourceLink?: string | null;
    country?: string;
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
    }
): Promise<HackXRayOutput> {
    const country = input.country || 'US';

    // 1. Call LLM
    const report = await deps.llmClient.generateLabReport(input.hackText, country);

    // 2. Validate Structure & Basic Rules (HU01)
    validateLabReport(report);

    // 3. Validate Coherence (HU05)
    validateCoherence(report);

    // 4. Check for Unsafe Phrases (HU05 - YMYL Compliance)
    ensureNoUnsafePhrases(report);

    // 3. Save to database (graceful failure)
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
    } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to save hack report to database:', error);
        // UX > logging: return the report even if DB fails
    }

    // 4. Return
    return { id, labReport: report };
}
