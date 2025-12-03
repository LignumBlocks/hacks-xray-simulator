import OpenAI from 'openai';
import { Readable } from 'stream';
import { YouTubeTranscriptionError } from './types';

export class TranscriptionProvider {
    private openai: OpenAI;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('[TranscriptionProvider] OPENAI_API_KEY is missing in environment variables!');
        } else {
            console.log('[TranscriptionProvider] OpenAI client initialized with API key (length: ' + apiKey.length + ')');
        }
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
            console.error('[TranscriptionProvider] Raw Error:', JSON.stringify(err, null, 2));

            // Detect empty error object (typical of network/connection issues)
            const isEmptyError = err && typeof err === 'object' && Object.keys(err).length === 0;
            const isConnectionError = isEmptyError || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT';

            let message = err.message;
            if (isConnectionError) {
                message = 'Connection to OpenAI API failed. Check DNS, Firewall, or Proxy settings on the VPS.';
            } else if (!message) {
                message = 'Unknown error occurred';
            }

            const error: YouTubeTranscriptionError = {
                code: 'TRANSCRIPTION_FAILED',
                message: `OpenAI transcription failed: ${message}`,
            };
            throw error;
        }
    }
}
