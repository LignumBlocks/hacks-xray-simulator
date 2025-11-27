import { describe, it, expect, vi } from 'vitest';
import { POST } from '../../app/api/hack-xray/route';
import { NextRequest } from 'next/server';

// Mock OpenAI
vi.mock('openai', () => {
    return {
        default: class OpenAI {
            chat = {
                completions: {
                    create: vi.fn().mockResolvedValue({
                        choices: [
                            {
                                message: {
                                    content: JSON.stringify({
                                        meta: { version: '1.0', language: 'en', country: 'US' },
                                        hackNormalized: {
                                            title: 'Mock Hack',
                                            shortSummary: 'Mock Summary',
                                            detailedSummary: 'Mock Detail',
                                            hackType: 'quick_fix',
                                            primaryCategory: 'Test',
                                        },
                                        evaluationPanel: {
                                            legalityCompliance: { label: 'clean', notes: 'ok' },
                                            mathRealImpact: { score0to10: 8 },
                                            riskFragility: { score0to10: 2 },
                                            practicalityFriction: { score0to10: 9 },
                                            systemQuirkLoophole: { usesSystemQuirk: false },
                                        },
                                        verdict: { label: 'solid', headline: 'Good' },
                                        keyPoints: { keyRisks: [] },
                                    }),
                                },
                            },
                        ],
                    }),
                },
            };
        },
    };
});

describe('POST /api/hack-xray', () => {
    it('should return 200 and a report for valid input', async () => {
        const req = new NextRequest('http://localhost/api/hack-xray', {
            method: 'POST',
            body: JSON.stringify({ hackText: 'This is a very long hack text that should be valid.' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.labReport).toBeDefined();
        expect(data.labReport.hackNormalized.title).toBe('Mock Hack');
    });

    it('should return 400 for invalid input (too short)', async () => {
        const req = new NextRequest('http://localhost/api/hack-xray', {
            method: 'POST',
            body: JSON.stringify({ hackText: 'Short' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data.errorCode).toBe('VALIDATION_ERROR');
    });
});
