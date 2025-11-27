import { describe, it, expect, vi } from 'vitest';
import { POST } from '../../app/api/hack-xray/route';
import { NextRequest } from 'next/server';

// Mock the LLM clients
vi.mock('@/modules/hackXray/infrastructure/hackXRayOpenAILLMClient');
vi.mock('@/modules/hackXray/infrastructure/hackXRayGeminiLLMClient');
vi.mock('@/modules/hackXray/infrastructure/hackXRayMockLLMClient');

describe('POST /api/hack-xray - Validation', () => {
    it('should return 400 when hackText is too short', async () => {
        const req = new NextRequest('http://localhost/api/hack-xray', {
            method: 'POST',
            body: JSON.stringify({ hackText: 'Short' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data.errorCode).toBe('VALIDATION_ERROR');
        expect(data.message).toContain('20 characters');
    });

    it('should return 400 when hackText is empty', async () => {
        const req = new NextRequest('http://localhost/api/hack-xray', {
            method: 'POST',
            body: JSON.stringify({ hackText: '' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when hackText is only spaces', async () => {
        const req = new NextRequest('http://localhost/api/hack-xray', {
            method: 'POST',
            body: JSON.stringify({ hackText: '                    ' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when hackText is too noisy (only emojis)', async () => {
        const req = new NextRequest('http://localhost/api/hack-xray', {
            method: 'POST',
            body: JSON.stringify({ hackText: '😀😃😄😁😆😅🤣😂🙂🙃😉😊😇' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data.errorCode).toBe('VALIDATION_ERROR');
        expect(data.message).toContain('meaningful money hack');
    });

    it('should return 400 when sourceLink is invalid', async () => {
        const req = new NextRequest('http://localhost/api/hack-xray', {
            method: 'POST',
            body: JSON.stringify({
                hackText: 'This is a valid hack text with more than twenty characters',
                sourceLink: 'not-a-valid-url'
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data.errorCode).toBe('VALIDATION_ERROR');
    });
});
