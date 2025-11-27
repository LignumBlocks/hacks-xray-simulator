import { UnsafeOutputError } from './errors';
import { LabReport } from './labReport';

/**
 * List of prohibited phrases for YMYL compliance
 * These phrases make unrealistic guarantees or dangerous claims
 */
const UNSAFE_PHRASES = [
    'guaranteed',
    'risk-free',
    'risk free',
    'everyone can',
    'you will definitely',
    'free money',
    'no downside',
    'bypass the system',
    'loophole that always works',
    'always works',
    'never fails',
    '100% success',
    'cant lose',
    "can't lose",
    'zero risk',
];

/**
 * Checks if text contains any unsafe phrases (case-insensitive)
 */
function containsUnsafePhrase(text: string): string | null {
    const lowerText = text.toLowerCase();
    for (const phrase of UNSAFE_PHRASES) {
        if (lowerText.includes(phrase.toLowerCase())) {
            return phrase;
        }
    }
    return null;
}

/**
 * Validates that the Lab Report doesn't contain unsafe YMYL phrases
 * Throws UnsafeOutputError if prohibited phrases are found
 */
export function ensureNoUnsafePhrases(report: LabReport): void {
    // Check detailedSummary
    const unsafeInSummary = containsUnsafePhrase(report.hackNormalized.detailedSummary);
    if (unsafeInSummary) {
        throw new UnsafeOutputError(
            `Unsafe phrase "${unsafeInSummary}" found in detailed summary. YMYL compliance violation.`
        );
    }

    // Check verdict headline
    const unsafeInHeadline = containsUnsafePhrase(report.verdict.headline);
    if (unsafeInHeadline) {
        throw new UnsafeOutputError(
            `Unsafe phrase "${unsafeInHeadline}" found in verdict headline. YMYL compliance violation.`
        );
    }

    // Check keyRisks
    for (const risk of report.keyPoints.keyRisks) {
        const unsafeInRisk = containsUnsafePhrase(risk);
        if (unsafeInRisk) {
            throw new UnsafeOutputError(
                `Unsafe phrase "${unsafeInRisk}" found in key risks. YMYL compliance violation.`
            );
        }
    }
}
