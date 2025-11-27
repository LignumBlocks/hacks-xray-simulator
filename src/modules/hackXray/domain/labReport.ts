import { HackXRayValidationError } from './errors';

export enum HackType {
    QuickFix = 'quick_fix',
    SystemLoophole = 'system_loophole',
    BehavioralTweak = 'behavioral_tweak',
    IncomeBooster = 'income_booster',
    Unknown = 'unknown',
}

export enum VerdictLabel {
    Trash = 'trash',
    WorksOnlyIf = 'works_only_if',
    Solid = 'solid',
    Promising = 'promising',
    GameChanger = 'game_changer',
}

export enum LegalityComplianceLabel {
    Clean = 'clean',
    GrayArea = 'gray_area',
    RedFlag = 'red_flag',
    Illegal = 'illegal',
}

export enum RiskLevel {
    Low = 'low',
    Medium = 'medium',
    High = 'high',
    Critical = 'critical',
}

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
        hackType: string; // Can validate against HackType enum
        primaryCategory: string;
    };
    evaluationPanel: {
        legalityCompliance: {
            label: string; // Can validate against LegalityComplianceLabel enum
            notes: string;
        };
        mathRealImpact: { score0to10: number };
        riskFragility: { score0to10: number };
        practicalityFriction: { score0to10: number };
        systemQuirkLoophole: { usesSystemQuirk: boolean };
    };
    verdict: {
        label: string; // Can validate against VerdictLabel enum
        headline: string;
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

    // Business Rule: If Red Flag or Illegal, Verdict cannot be Promising or Game Changer
    const legality = report.evaluationPanel.legalityCompliance.label;
    const verdict = report.verdict.label;

    if (
        (legality === LegalityComplianceLabel.RedFlag ||
            legality === LegalityComplianceLabel.Illegal) &&
        (verdict === VerdictLabel.Promising ||
            verdict === VerdictLabel.GameChanger)
    ) {
        throw new HackXRayValidationError(
            `Cannot mark report as ${verdict} if legality is ${legality}`
        );
    }
}
