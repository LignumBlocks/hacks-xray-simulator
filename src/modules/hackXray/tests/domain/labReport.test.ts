import { describe, it, expect } from 'vitest';
import {
    validateLabReport,
    HackType,
    VerdictLabel,
    LegalityComplianceLabel,
    LabReport,
} from '../../domain/labReport';
import { HackXRayValidationError } from '../../domain/errors';

describe('LabReport Domain Logic', () => {
    const validReport: LabReport = {
        meta: { version: '1.0', language: 'en', country: 'US' },
        hackNormalized: {
            title: 'Points Hack',
            shortSummary: 'Use card X',
            detailedSummary: 'Use card X for Y',
            hackType: HackType.IncomeBooster,
            primaryCategory: 'Credit Cards',
        },
        evaluationPanel: {
            legalityCompliance: { label: LegalityComplianceLabel.Clean, notes: 'Legal' },
            mathRealImpact: { score0to10: 8 },
            riskFragility: { score0to10: 2 },
            practicalityFriction: { score0to10: 9 },
            systemQuirkLoophole: { usesSystemQuirk: false },
        },
        verdict: { label: VerdictLabel.Solid, headline: 'Good hack' },
        keyPoints: { keyRisks: [] },
    };

    it('should accept a valid report', () => {
        expect(() => validateLabReport(validReport)).not.toThrow();
    });

    it('should throw error if Math Impact score is out of range', () => {
        const invalidReport = JSON.parse(JSON.stringify(validReport));
        invalidReport.evaluationPanel.mathRealImpact.score0to10 = 11;
        expect(() => validateLabReport(invalidReport)).toThrow(HackXRayValidationError);
        expect(() => validateLabReport(invalidReport)).toThrow(/Math & Real Impact/);
    });

    it('should throw error if Risk score is negative', () => {
        const invalidReport = JSON.parse(JSON.stringify(validReport));
        invalidReport.evaluationPanel.riskFragility.score0to10 = -1;
        expect(() => validateLabReport(invalidReport)).toThrow(HackXRayValidationError);
    });

    it('should enforce business rule: No Promising verdict for Red Flag legality', () => {
        const invalidReport = JSON.parse(JSON.stringify(validReport));
        invalidReport.evaluationPanel.legalityCompliance.label = LegalityComplianceLabel.RedFlag;
        invalidReport.verdict.label = VerdictLabel.Promising;

        expect(() => validateLabReport(invalidReport)).toThrow(HackXRayValidationError);
        expect(() => validateLabReport(invalidReport)).toThrow(/Cannot mark report/);
    });

    it('should allow Trash verdict for Red Flag legality', () => {
        const validRedFlag = JSON.parse(JSON.stringify(validReport));
        validRedFlag.evaluationPanel.legalityCompliance.label = LegalityComplianceLabel.RedFlag;
        validRedFlag.verdict.label = VerdictLabel.Trash;
        expect(() => validateLabReport(validRedFlag)).not.toThrow();
    });
});
