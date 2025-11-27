import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YouTubeTranscriptionService } from '../../../../infrastructure/youtube/YouTubeTranscriptionService';
import { YouTubeAudioFetcher } from '../../../../infrastructure/youtube/YouTubeAudioFetcher';
import { TranscriptionProvider } from '../../../../infrastructure/youtube/TranscriptionProvider';
import { Readable } from 'stream';

// Mocks
vi.mock('../../../../infrastructure/youtube/YouTubeAudioFetcher');
vi.mock('../../../../infrastructure/youtube/TranscriptionProvider');

describe('YouTubeTranscriptionService', () => {
    let service: YouTubeTranscriptionService;
    let mockFetcher: any;
    let mockProvider: any;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new YouTubeTranscriptionService();
        // Access mocked instances
        mockFetcher = (YouTubeAudioFetcher as any).mock.instances[0];
        mockProvider = (TranscriptionProvider as any).mock.instances[0];
    });

    it('should transcribe a valid video successfully', async () => {
        // Setup mocks
        const mockMeta = { videoId: '123', title: 'Test Video', durationSec: 100 };
        const mockStream = new Readable();
        const mockTranscript = 'Hello world';

        vi.spyOn(mockFetcher, 'getVideoMeta').mockResolvedValue(mockMeta);
        vi.spyOn(mockFetcher, 'fetchAudioStream').mockResolvedValue(mockStream);
        vi.spyOn(mockProvider, 'transcribe').mockResolvedValue(mockTranscript);

        // Execute
        const result = await service.transcribeFromUrl('https://youtube.com/watch?v=123');

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.result.transcript).toBe('Hello world');
            expect(result.result.meta.videoId).toBe('123');
        }
    });

    it('should return error if video is too long', async () => {
        const error = { code: 'VIDEO_TOO_LONG', message: 'Too long' };
        vi.spyOn(mockFetcher, 'getVideoMeta').mockRejectedValue(error);

        const result = await service.transcribeFromUrl('https://youtube.com/watch?v=long');

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe('VIDEO_TOO_LONG');
        }
    });

    it('should return error if transcription fails', async () => {
        const mockMeta = { videoId: '123', title: 'Test Video', durationSec: 100 };
        const mockStream = new Readable();
        const error = { code: 'TRANSCRIPTION_FAILED', message: 'API Error' };

        vi.spyOn(mockFetcher, 'getVideoMeta').mockResolvedValue(mockMeta);
        vi.spyOn(mockFetcher, 'fetchAudioStream').mockResolvedValue(mockStream);
        vi.spyOn(mockProvider, 'transcribe').mockRejectedValue(error);

        const result = await service.transcribeFromUrl('https://youtube.com/watch?v=fail');

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe('TRANSCRIPTION_FAILED');
        }
    });
});
