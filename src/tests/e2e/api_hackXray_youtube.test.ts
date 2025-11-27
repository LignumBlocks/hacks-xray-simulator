import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/hack-xray/route';
import { NextRequest } from 'next/server';

// Define mock functions outside to be accessible in the factory
const mockTranscribeFromUrl = vi.fn();
const mockExtract = vi.fn();
const mockIsYouTubeIngestionEnabled = vi.fn();

// Mock dependencies
vi.mock('@/infrastructure/youtube/YouTubeTranscriptionService', () => {
    return {
        YouTubeTranscriptionService: class {
            transcribeFromUrl = mockTranscribeFromUrl;
        }
    };
});

vi.mock('@/modules/hackXray/infrastructure/OpenAIHackFromTranscriptExtractor', () => {
    return {
        OpenAIHackFromTranscriptExtractor: class {
            extract = mockExtract;
        }
    };
});

vi.mock('@/infrastructure/config/FeatureFlagService', () => {
    return {
        FeatureFlagService: class {
            isYouTubeIngestionEnabled = mockIsYouTubeIngestionEnabled;
        }
    };
});

vi.mock('@/infrastructure/observability/IngestionMetrics'); // Auto-mock class

vi.mock('@/modules/hackXray/infrastructure/hackXRayOpenAILLMClient');
vi.mock('@/modules/hackXray/infrastructure/hackXRayGeminiLLMClient');
vi.mock('@/modules/hackXray/infrastructure/hackXRayMockLLMClient');
vi.mock('@/modules/hackXray/infrastructure/hackReportPrismaRepository');
vi.mock('@/modules/hackXray/application/runHackXRayUseCase', () => ({
    runHackXRayUseCase: vi.fn().mockResolvedValue({
        id: 'mock-id',
        labReport: { verdict: { label: 'solid' } }
    })
}));

describe('POST /api/hack-xray - YouTube Integration', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Default to enabled
        mockIsYouTubeIngestionEnabled.mockReturnValue(true);
    });

    it('should return 403 when feature flag is disabled', async () => {
        mockIsYouTubeIngestionEnabled.mockReturnValue(false);

        const req = new NextRequest('http://localhost/api/hack-xray', {
            method: 'POST',
            body: JSON.stringify({
                sourceLink: 'https://www.youtube.com/watch?v=disabled'
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.errorCode).toBe('FEATURE_DISABLED');
    });

    it('should process a valid YouTube URL without hackText', async () => {
        // Mock successful transcription
        mockTranscribeFromUrl.mockResolvedValue({
            ok: true,
            result: {
                transcript: 'This is a transcript',
                meta: { videoId: '123', estimatedDurationSec: 60 }
            }
        });

        // Mock successful extraction
        mockExtract.mockResolvedValue('This is the extracted hack text.');

        const req = new NextRequest('http://localhost/api/hack-xray', {
            method: 'POST',
            body: JSON.stringify({
                sourceLink: 'https://www.youtube.com/watch?v=123'
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        expect(mockTranscribeFromUrl).toHaveBeenCalledWith('https://www.youtube.com/watch?v=123');
        expect(mockExtract).toHaveBeenCalledWith('This is a transcript');
    });

    it('should return 400 if transcription fails', async () => {
        mockTranscribeFromUrl.mockResolvedValue({
            ok: false,
            error: { code: 'VIDEO_TOO_LONG', message: 'Video too long' }
        });

        const req = new NextRequest('http://localhost/api/hack-xray', {
            method: 'POST',
            body: JSON.stringify({
                sourceLink: 'https://www.youtube.com/watch?v=long'
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.errorCode).toBe('VIDEO_TOO_LONG');
    });

    it('should return 422 if extraction fails', async () => {
        mockTranscribeFromUrl.mockResolvedValue({
            ok: true,
            result: { transcript: '...' }
        });

        mockExtract.mockRejectedValue(new Error('Extraction failed'));

        const req = new NextRequest('http://localhost/api/hack-xray', {
            method: 'POST',
            body: JSON.stringify({
                sourceLink: 'https://www.youtube.com/watch?v=fail'
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(422);
        const data = await res.json();
        expect(data.errorCode).toBe('EXTRACTION_FAILED');
    });

    it('should return 400 if extracted text is too noisy', async () => {
        mockTranscribeFromUrl.mockResolvedValue({
            ok: true,
            result: {
                transcript: '...',
                meta: { videoId: 'noisy', estimatedDurationSec: 10 }
            }
        });

        // Mock extraction returning noisy text
        mockExtract.mockResolvedValue('😀😀😀');

        const req = new NextRequest('http://localhost/api/hack-xray', {
            method: 'POST',
            body: JSON.stringify({
                sourceLink: 'https://www.youtube.com/watch?v=noisy'
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.errorCode).toBe('VALIDATION_ERROR');
    });
});
