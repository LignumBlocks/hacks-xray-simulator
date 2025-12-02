import { HackXRayValidationError } from './errors';

export enum HackType {
    QuickFix = 'quick_fix',
    SystemLoophole = 'system_loophole',
    BehavioralTweak = 'behavioral_tweak',
    IncomeBooster = 'income_booster',
    Unknown = 'unknown',
}

export type LegalLabel = "clean" | "gray_area" | "red_flag";

export type AdherenceLevel =
    | "easy"
    | "intermediate"
    | "advanced"
    | "expert";

export type VerdictLabel =
    | "trash"
    | "dangerous_for_most"
    | "works_if_profile_matches"
    | "promising_superhack_part"
    | "solid";

export interface LabReport {
    meta: {
        version: string;
        language: string;
        country: string;
    };

    hackNormalized: {
        title: string;
        shortSummary: string;
        detailedSummary: string;
        hackType: string;
        primaryCategory: string;
    };

    evaluationPanel: {
        legalityCompliance: {
            label: LegalLabel;
            notes: string;
        };
        mathRealImpact: { score0to10: number };
        riskFragility: { score0to10: number };
        practicalityFriction: { score0to10: number };
        systemQuirkLoophole: {
            usesSystemQuirk: boolean;
            description?: string;
            fragilityNotes?: string[];
        };
    };

    adherence: {
        level: AdherenceLevel;
        notes: string;
    };

    verdict: {
        label: VerdictLabel;
        headline: string;
        recommendedProfiles: string[];
        notForProfiles: string[];
    };

    keyPoints: {
        keyRisks: string[];
    };
}

// Domain Functions (Pure Logic)

export function validateScore(score: number, fieldName: string): void {
    if (score < 0 || score > 10) {
        throw new HackXRayValidationError(`${fieldName} must be between 0 and 10. Got: ${score}`);
    }
}

export function validateLabReport(report: LabReport): void {
    validateScore(report.evaluationPanel.mathRealImpact.score0to10, 'Math & Real Impact');
    validateScore(report.evaluationPanel.riskFragility.score0to10, 'Risk & Fragility');
    validateScore(report.evaluationPanel.practicalityFriction.score0to10, 'Practicality & Friction');

    // Business Rule: If Red Flag, Verdict cannot be Solid or Promising
    const legality = report.evaluationPanel.legalityCompliance.label;
    const verdict = report.verdict.label;

    if (
        legality === 'red_flag' &&
        (verdict === 'solid' || verdict === 'promising_superhack_part')
    ) {
        throw new HackXRayValidationError(
            `Cannot mark report as ${verdict} if legality is ${legality}`
        );
    }
}
