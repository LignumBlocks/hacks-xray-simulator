import OpenAI from 'openai';
import { HackFromTranscriptExtractor } from '../domain/HackFromTranscriptExtractor';

export class OpenAIHackFromTranscriptExtractor implements HackFromTranscriptExtractor {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
        });
    }

    async extract(transcript: string): Promise<string> {
        const systemPrompt = `
You are an expert editor. Your goal is to extract the core "money hack" or financial tip from a video transcript.
The transcript might be messy, contain filler words, intros, outros, or ads.

Instructions:
1. Ignore non-relevant content (greetings, "subscribe", ads, rambling).
2. Identify the specific financial advice, trick, or strategy described.
3. Rewrite it into a clear, concise paragraph (3-8 sentences).
4. Do not judge the hack (do not say if it works or not), just describe WHAT it is.
5. Use the first person ("I did this...") or second person ("You can do this...") matching the vibe of the transcript, or neutral third person if better.
6. If the transcript contains NO financial hack or is unintelligible, return "NO_HACK_FOUND".
`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: transcript },
                ],
                temperature: 0.3,
                max_tokens: 500,
            });

            const content = completion.choices[0].message.content?.trim();

            if (!content || content === 'NO_HACK_FOUND') {
                throw new Error('Could not extract a meaningful hack from the transcript.');
            }

            return content;
        } catch (error: any) {
            console.error('HackFromTranscriptExtractor Error:', error);
            throw new Error(`Failed to extract hack: ${error.message}`);
        }
    }
}
