import OpenAI from 'openai';
import { Readable } from 'stream';
import { YouTubeTranscriptionError } from './types';

export class TranscriptionProvider {
    private openai: OpenAI;

    constructor() {
        // Assuming OPENAI_API_KEY is in process.env
        this.openai = new OpenAI();
    }

    async transcribe(audioStream: Readable): Promise<string> {
        try {
            const stream: any = audioStream;

            // Set path for OpenAI to recognize the file
            // The actual format is determined by yt-dlp (usually webm/opus)
            stream.path = stream.path || 'audio.webm';

            console.log('[TranscriptionProvider] Transcribing audio, stream.path:', stream.path);

            const response = await this.openai.audio.transcriptions.create({
                file: stream,
                model: 'whisper-1',
                response_format: 'text',
            });

            return response as unknown as string;

        } catch (err: any) {
            console.error('[TranscriptionProvider] Raw Error:', err);
            const error: YouTubeTranscriptionError = {
                code: 'TRANSCRIPTION_FAILED',
                message: `OpenAI transcription failed: ${err.message}`,
            };
            throw error;
        }
    }
}
