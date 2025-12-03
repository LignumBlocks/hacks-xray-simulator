import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runHackXRayUseCase } from '@/modules/hackXray/application/runHackXRayUseCase';
import { HackXRayOpenAILLMClient } from '@/modules/hackXray/infrastructure/hackXRayOpenAILLMClient';
import { HackXRayGeminiLLMClient } from '@/modules/hackXray/infrastructure/hackXRayGeminiLLMClient';
import { HackXRayMockLLMClient } from '@/modules/hackXray/infrastructure/hackXRayMockLLMClient';
import { HackReportPrismaRepository } from '@/modules/hackXray/infrastructure/hackReportPrismaRepository';
import { XRayEventPrismaRepository } from '@/modules/hackXray/infrastructure/xrayEventPrismaRepository';
import { hashClientIp } from '@/modules/hackXray/domain/xrayEventService';
import {
    HackXRayValidationError,
    HackXRayLLMOutputError,
    LLMOutputInvalidError,
    LLMOutputIncoherentError,
    UnsafeOutputError,
} from '@/modules/hackXray/domain/errors';

import { YouTubeTranscriptionService } from '@/infrastructure/youtube/YouTubeTranscriptionService';
import { OpenAIHackFromTranscriptExtractor } from '@/modules/hackXray/infrastructure/OpenAIHackFromTranscriptExtractor';
import { FeatureFlagService } from '@/infrastructure/config/FeatureFlagService';
import { IngestionMetrics } from '@/infrastructure/observability/IngestionMetrics';

// ... (existing imports)

const schema = z.object({
    hackText: z.string().optional().default(''),
    sourceLink: z.string().url().optional().nullable(),
    country: z.string().default('US'),
}).refine(data => {
    // If sourceLink is NOT a YouTube URL, hackText must be >= 20 chars
    const isYouTube = data.sourceLink && (data.sourceLink.includes('youtube.com') || data.sourceLink.includes('youtu.be'));
    if (!isYouTube) {
        return data.hackText.trim().length >= 20;
    }
    return true;
}, {
    message: 'hackText must be at least 20 characters long, unless a valid YouTube link is provided.',
    path: ['hackText'],
});

// Semantic validation: detect noisy/meaningless text
function isTextTooNoisy(text: string): boolean {
    const cleaned = text.replace(/\s+/g, '');
    if (!cleaned) return true;

    const alnumCount = (cleaned.match(/[0-9a-zA-Z]/g) || []).length;
    const ratio = alnumCount / cleaned.length;

    return ratio < 0.3; // Less than 30% alphanumeric = too noisy
}

export async function POST(req: NextRequest) {
    const metrics = new IngestionMetrics();
    const featureFlags = new FeatureFlagService();
    const startTime = Date.now();

    try {
        const body = await req.json();
        const validated = schema.parse(body);

        // Instantiate repositories
        const hackReportRepository = new HackReportPrismaRepository();
        const xrayEventRepository = new XRayEventPrismaRepository();

        // Extract client IP and user agent for HU07
        const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || undefined;
        const clientIpHash = hashClientIp(clientIp);
        const userAgent = req.headers.get('user-agent') || undefined;

        // 0. Deduplication Check (Early Exit)
        if (validated.sourceLink) {
            try {
                const existing = await hackReportRepository.findBySourceLink(validated.sourceLink);
                if (existing) {
                    console.log(`[HackXRay API] Found existing report for ${validated.sourceLink}, returning immediately.`);
                    return NextResponse.json({
                        id: existing.id,
                        labReport: existing.report
                    });
                }
            } catch (error) {
                console.warn('[HackXRay API] Failed to check for existing report:', error);
            }
        }

        let finalHackText = validated.hackText;
        let transcriptionMeta = null;
        let extractedFromVideo = false;

        // Check if we need to transcribe
        const isYouTube = validated.sourceLink && (validated.sourceLink.includes('youtube.com') || validated.sourceLink.includes('youtu.be'));
        const isTextEmpty = !finalHackText || finalHackText.trim().length < 20;

        if (isYouTube && isTextEmpty) {
            // HU13C: Feature Flag Check
            if (!featureFlags.isYouTubeIngestionEnabled()) {
                metrics.logFeatureDisabled(validated.sourceLink!);
                return NextResponse.json(
                    {
                        errorCode: 'FEATURE_DISABLED',
                        message: "Automatic extraction from video links is not available right now. Please paste the hack in your own words."
                    },
                    { status: 403 } // Or 400/422 depending on preference, ticket said "error tipado"
                );
            }

            // HU13 Flow
            metrics.incrementAttempt();
            try {
                const transcriptionService = new YouTubeTranscriptionService();
                const transcriptionResult = await transcriptionService.transcribeFromUrl(validated.sourceLink!);

                if (!transcriptionResult.ok) {
                    metrics.incrementFailure(transcriptionResult.error.code, Date.now() - startTime);
                    return NextResponse.json(
                        {
                            errorCode: transcriptionResult.error.code,
                            message: transcriptionResult.error.message || "Failed to transcribe video.",
                        },
                        { status: 400 }
                    );
                }

                const extractor = new OpenAIHackFromTranscriptExtractor();
                finalHackText = await extractor.extract(transcriptionResult.result.transcript);

                transcriptionMeta = transcriptionResult.result.meta;
                extractedFromVideo = true;

                metrics.incrementSuccess(transcriptionMeta.videoId, Date.now() - startTime);

            } catch (err: any) {
                console.error('Transcription/Extraction Error:', err);
                metrics.incrementFailure('EXTRACTION_FAILED', Date.now() - startTime);
                return NextResponse.json(
                    {
                        errorCode: 'EXTRACTION_FAILED',
                        message: "We couldn't auto-extract the hack from this video. Please describe it in your own words.",
                    },
                    { status: 422 }
                );
            }
        }

        // Semantic validation on the final text (whether user provided or extracted)
        if (isTextTooNoisy(finalHackText)) {
            return NextResponse.json(
                {
                    errorCode: 'VALIDATION_ERROR',
                    message: "We couldn't detect a meaningful money hack in the text (or video). Please describe it in your own words.",
                },
                { status: 400 }
            );
        }

        // Select LLM provider based on environment variables
        // Priority: Mock > Gemini > OpenAI
        let llmClient;
        if (process.env.USE_MOCK_LLM === 'true') {
            llmClient = new HackXRayMockLLMClient();
        } else if (process.env.GEMINI_API_KEY) {
            llmClient = new HackXRayGeminiLLMClient();
        } else {
            llmClient = new HackXRayOpenAILLMClient();
        }

        // Prepare input for use case
        const useCaseInput = {
            ...validated,
            hackText: finalHackText,
            clientIpHash,
            userAgent,
        };

        const result = await runHackXRayUseCase(useCaseInput, {
            llmClient,
            hackReportRepository,
            xrayEventRepository
        });

        // TODO: We might want to save the transcription meta in the report, but runHackXRayUseCase might not support it yet.
        // For now, we just run the use case with the extracted text.

        return NextResponse.json({
            id: result.id,
            labReport: result.labReport
        });

    } catch (error: any) {
        // ... (existing error handling)
        console.error('API Error:', error);

        if (error instanceof z.ZodError) {
            const message = error.errors[0]?.message || 'Validation failed';
            return NextResponse.json(
                { errorCode: 'VALIDATION_ERROR', message },
                { status: 400 }
            );
        }

        // HU05: LLM Output validation errors
        if (error instanceof LLMOutputInvalidError) {
            return NextResponse.json(
                { errorCode: 'LLM_OUTPUT_INVALID', message: 'The LLM returned a malformed Lab Report.' },
                { status: 502 }
            );
        }

        if (error instanceof LLMOutputIncoherentError) {
            return NextResponse.json(
                { errorCode: 'LLM_OUTPUT_INCOHERENT', message: error.message },
                { status: 502 }
            );
        }

        if (error instanceof UnsafeOutputError) {
            return NextResponse.json(
                { errorCode: 'UNSAFE_OUTPUT', message: error.message },
                { status: 502 }
            );
        }

        if (error instanceof HackXRayValidationError) {
            return NextResponse.json(
                { errorCode: 'BUSINESS_RULE_VIOLATION', message: error.message },
                { status: 422 }
            );
        }

        if (error instanceof HackXRayLLMOutputError) {
            return NextResponse.json(
                { errorCode: 'LLM_ERROR', message: 'Unable to generate a valid report. Please try again.' },
                { status: 502 }
            );
        }

        return NextResponse.json(
            { errorCode: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);

        // Parse query parameters
        const filters = {
            hackType: url.searchParams.get('hackType') ?? undefined,
            primaryCategory: url.searchParams.get('primaryCategory') ?? undefined,
            verdictLabel: url.searchParams.get('verdictLabel') ?? undefined,
            createdFrom: url.searchParams.get('createdFrom')
                ? new Date(url.searchParams.get('createdFrom')!)
                : undefined,
            createdTo: url.searchParams.get('createdTo')
                ? new Date(url.searchParams.get('createdTo')!)
                : undefined,
            page: Math.max(1, Number(url.searchParams.get('page') ?? 1)), // Normalize page >= 1
            pageSize: Number(url.searchParams.get('pageSize') ?? 20),
        };

        const repository = new HackReportPrismaRepository();
        const { items, total } = await repository.findManyWithFilters(filters);

        return NextResponse.json({
            items,
            pagination: {
                page: filters.page,
                pageSize: filters.pageSize,
                total,
                totalPages: Math.ceil(total / filters.pageSize),
            },
        });
    } catch (error: any) {
        console.error('GET /api/hack-xray Error:', error);
        return NextResponse.json(
            { errorCode: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' },
            { status: 500 }
        );
    }
}
