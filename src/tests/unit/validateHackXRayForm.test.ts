import { describe, it, expect } from 'vitest';

// Import the validation function (we'll need to export it from page.tsx or move it to a separate file)
// For now, we'll duplicate it here for testing
const MIN_LENGTH = 20;

interface FormErrors {
    hackText?: string;
    sourceLink?: string;
}

function validateHackXRayForm(values: { hackText: string; sourceLink?: string | null }): { isValid: boolean; errors: FormErrors } {
    const errors: FormErrors = {};

    const text = values.hackText?.trim() ?? '';
    if (!text) {
        errors.hackText = 'Please paste a money hack first.';
    } else if (text.length < MIN_LENGTH) {
        errors.hackText = 'Please paste a bit more context so we can analyze it.';
    }

    if (values.sourceLink) {
        const url = values.sourceLink.trim();
        const looksLikeUrl = url.startsWith('http://') || url.startsWith('https://');
        if (!looksLikeUrl) {
            errors.sourceLink = "This doesn't look like a valid link. You can leave it empty.";
        }
    }

    return { isValid: Object.keys(errors).length === 0, errors };
}

describe('Frontend Validation - validateHackXRayForm', () => {
    it('should return error when hackText is empty', () => {
        const result = validateHackXRayForm({ hackText: '' });
        expect(result.isValid).toBe(false);
        expect(result.errors.hackText).toBe('Please paste a money hack first.');
    });

    it('should return error when hackText is only spaces', () => {
        const result = validateHackXRayForm({ hackText: '   ' });
        expect(result.isValid).toBe(false);
        expect(result.errors.hackText).toBe('Please paste a money hack first.');
    });

    it('should return error when hackText is less than 20 characters', () => {
        const result = validateHackXRayForm({ hackText: 'Short text' });
        expect(result.isValid).toBe(false);
        expect(result.errors.hackText).toBe('Please paste a bit more context so we can analyze it.');
    });

    it('should return error when sourceLink does not start with http', () => {
        const result = validateHackXRayForm({
            hackText: 'This is a valid hack text with more than twenty characters',
            sourceLink: 'invalid-url.com'
        });
        expect(result.isValid).toBe(false);
        expect(result.errors.sourceLink).toBe("This doesn't look like a valid link. You can leave it empty.");
    });

    it('should be valid when hackText is >= 20 chars and no sourceLink', () => {
        const result = validateHackXRayForm({
            hackText: 'This is a valid hack text with more than twenty characters'
        });
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual({});
    });

    it('should be valid when hackText is >= 20 chars and sourceLink is valid', () => {
        const result = validateHackXRayForm({
            hackText: 'This is a valid hack text with more than twenty characters',
            sourceLink: 'https://example.com'
        });
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual({});
    });

    it('should be valid when sourceLink is null', () => {
        const result = validateHackXRayForm({
            hackText: 'This is a valid hack text with more than twenty characters',
            sourceLink: null
        });
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual({});
    });
});
