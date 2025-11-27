import { LLMOutputIncoherentError } from './errors';
import { LabReport, LegalityComplianceLabel, VerdictLabel } from './labReport';

/**
 * Validates coherence between evaluation panel scores and verdict
 * Throws LLMOutputIncoherentError if inconsistencies are found
 */
export function validateCoherence(report: LabReport): void {
    const { evaluationPanel, verdict } = report;
    const legality = evaluationPanel.legalityCompliance.label;
    const verdictLabel = verdict.label;
    const risk = evaluationPanel.riskFragility.score0to10;
    const impact = evaluationPanel.mathRealImpact.score0to10;
    const practicality = evaluationPanel.practicalityFriction.score0to10;
    const usesQuirk = evaluationPanel.systemQuirkLoophole.usesSystemQuirk;

    // Rule 1: red_flag or illegal legality → cannot have positive verdict
    if (
        (legality === LegalityComplianceLabel.RedFlag || legality === LegalityComplianceLabel.Illegal) &&
        (verdictLabel === VerdictLabel.Solid ||
            verdictLabel === VerdictLabel.Promising ||
            verdictLabel === VerdictLabel.GameChanger ||
            verdictLabel === VerdictLabel.WorksOnlyIf)
    ) {
        throw new LLMOutputIncoherentError(
            `Inconsistent: legality is "${legality}" but verdict is "${verdictLabel}". Red flag/illegal hacks cannot have positive verdicts.`
        );
    }

    // Rule 2: High risk (>=7) + Low impact (<=3) → must be trash
    if (risk >= 7 && impact <= 3 && verdictLabel !== VerdictLabel.Trash) {
        throw new LLMOutputIncoherentError(
            `Inconsistent: high risk (${risk}) with low impact (${impact}) must have "trash" verdict, got "${verdictLabel}".`
        );
    }

    // Rule 3: Very low practicality (<=2) → cannot have positive verdict
    if (
        practicality <= 2 &&
        verdictLabel !== VerdictLabel.Trash
    ) {
        throw new LLMOutputIncoherentError(
            `Inconsistent: very low practicality (${practicality}) must have "trash" verdict, got "${verdictLabel}".`
        );
    }

    // Rule 4: System quirk + gray area → cannot have positive verdict
    if (
        usesQuirk &&
        legality === LegalityComplianceLabel.GrayArea &&
        (verdictLabel === VerdictLabel.Solid ||
            verdictLabel === VerdictLabel.Promising ||
            verdictLabel === VerdictLabel.GameChanger)
    ) {
        throw new LLMOutputIncoherentError(
            `Inconsistent: system quirk with gray area legality cannot have positive verdict "${verdictLabel}".`
        );
    }
}
