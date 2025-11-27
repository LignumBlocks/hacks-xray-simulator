import OpenAI from 'openai';
import { HackXRayLLMClient } from '../domain/ports';
import { LabReport } from '../domain/labReport';
import { HackXRayLLMOutputError } from '../domain/errors';

export class HackXRayOpenAILLMClient implements HackXRayLLMClient {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'dummy_key', // Fallback for build/test without env
        });
    }

    async generateLabReport(hackText: string, country: string): Promise<LabReport> {
        const systemPrompt = `
You are Hintsly Hack X-Ray, an expert financial analyst AI.
Your goal is to analyze a "money hack" and generate a structured Lab Report.
You must be objective, critical, and precise.
Follow the "Your Money Your Life" (YMYL) principles: be cautious, never guarantee results, and highlight risks.

Output MUST be a valid JSON object matching this structure:
{
  "meta": { "version": "1.0", "language": "en", "country": "${country}" },
  "hackNormalized": {
    "title": "Short catchy title",
    "shortSummary": "1 sentence summary",
    "detailedSummary": "2-3 sentences explanation",
    "hackType": "One of: quick_fix, system_loophole, behavioral_tweak, income_booster, unknown",
    "primaryCategory": "e.g. Credit Cards, Taxes, Investing"
  },
  "evaluationPanel": {
    "legalityCompliance": {
      "label": "One of: clean, gray_area, red_flag, illegal",
      "notes": "Brief explanation of legality"
    },
    "mathRealImpact": { "score0to10": number (0-10) },
    "riskFragility": { "score0to10": number (0-10) },
    "practicalityFriction": { "score0to10": number (0-10) },
    "systemQuirkLoophole": { "usesSystemQuirk": boolean }
  },
  "verdict": {
    "label": "One of: trash, works_only_if, solid, promising, game_changer",
    "headline": "Punchy verdict headline"
  },
  "keyPoints": {
    "keyRisks": ["Risk 1", "Risk 2", "Risk 3"]
  }
}
`;

        const userPrompt = `Analyze this hack for country ${country}:\n\n"${hackText}"`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini', // Or gpt-3.5-turbo, adjustable
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2,
            });

            const content = completion.choices[0].message.content;
            if (!content) {
                throw new Error('Empty response from LLM');
            }

            const parsed = JSON.parse(content);

            // Basic validation could happen here or rely on domain validation later
            return parsed as LabReport;

        } catch (error: any) {
            console.error('LLM Error:', error);
            throw new HackXRayLLMOutputError(`Failed to generate report: ${error.message}`);
        }
    }
}
