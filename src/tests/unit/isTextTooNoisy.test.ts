import { describe, it, expect } from 'vitest';

// Backend validation function
function isTextTooNoisy(text: string): boolean {
    const cleaned = text.replace(/\s+/g, '');
    if (!cleaned) return true;

    const alnumCount = (cleaned.match(/[0-9a-zA-Z]/g) || []).length;
    const ratio = alnumCount / cleaned.length;

    return ratio < 0.3; // Less than 30% alphanumeric = too noisy
}

describe('Backend Validation - isTextTooNoisy', () => {
    it('should return true for empty string', () => {
        expect(isTextTooNoisy('')).toBe(true);
    });

    it('should return true for only spaces', () => {
        expect(isTextTooNoisy('     ')).toBe(true);
    });

    it('should return true for only emojis', () => {
        expect(isTextTooNoisy('😀😃😄😁')).toBe(true);
    });

    it('should return true for mostly symbols', () => {
        expect(isTextTooNoisy('!@#$%^&*()_+{}|:"<>?')).toBe(true);
    });

    it('should return true for text with low alphanumeric ratio', () => {
        // "a!!!!!!!!!!!" = 1 alnum out of 12 = 8.3% < 30%
        expect(isTextTooNoisy('a!!!!!!!!!!!')).toBe(true);
    });

    it('should return false for normal text', () => {
        expect(isTextTooNoisy('This is a normal money hack description')).toBe(false);
    });

    it('should return false for text with some symbols but mostly alphanumeric', () => {
        expect(isTextTooNoisy('Use card X to get 5% back!')).toBe(false);
    });

    it('should return false for text with exactly 30% alphanumeric', () => {
        // "abc!!!!!!!" = 3 alnum out of 10 = 30%
        expect(isTextTooNoisy('abc!!!!!!!')).toBe(false);
    });

    it('should return false for text with numbers and letters', () => {
        expect(isTextTooNoisy('Get 100% cashback on purchases over $50')).toBe(false);
    });
});
