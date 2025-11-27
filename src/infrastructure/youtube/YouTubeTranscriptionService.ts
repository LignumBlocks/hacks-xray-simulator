import { YouTubeAudioFetcher } from './YouTubeAudioFetcher';
import { TranscriptionProvider } from './TranscriptionProvider';
import { YouTubeTranscriptionResult, YouTubeTranscriptionResponse, YouTubeTranscriptionError } from './types';

export class YouTubeTranscriptionService {
    private fetcher: YouTubeAudioFetcher;
    private provider: TranscriptionProvider;

    constructor() {
        this.fetcher = new YouTubeAudioFetcher();
        this.provider = new TranscriptionProvider();
    }

    async transcribeFromUrl(videoUrl: string): Promise<YouTubeTranscriptionResponse> {
        try {
            // 1. Get video metadata first (to check duration, etc.)
            const meta = await this.fetcher.getVideoMeta(videoUrl);

            // 2. Fetch audio stream
            const audioStream = await this.fetcher.fetchAudioStream(videoUrl);

            // 3. Transcribe
            const transcript = await this.provider.transcribe(audioStream);

            // 4. Sanitize (basic)
            const sanitizedTranscript = this.sanitizeTranscript(transcript);

            const result: YouTubeTranscriptionResult = {
                transcript: sanitizedTranscript,
                meta: {
                    videoUrl,
                    videoId: meta.videoId,
                    estimatedDurationSec: meta.durationSec,
                    source: 'youtube_ytdl',
                },
                rawTranscript: transcript,
            };

            return { ok: true, result };

        } catch (err: any) {
            // If it's a known error type
            if (err.code && typeof err.code === 'string') {
                return { ok: false, error: err as YouTubeTranscriptionError };
            }

            // Unknown error
            return {
                ok: false,
                error: {
                    code: 'TRANSCRIPTION_FAILED',
                    message: err.message || 'Unknown error during transcription process',
                },
            };
        }
    }

    private sanitizeTranscript(text: string): string {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
            .trim();
    }
}
