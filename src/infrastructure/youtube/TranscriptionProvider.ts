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
            // OpenAI expects a File object or something similar. 
            // 'openai' node library supports passing a ReadStream directly to audio.transcriptions.create
            // but we need to make sure it has a path or name so it knows the file type (e.g. mp3).
            // We can cast it or wrap it if needed, but usually passing the stream with a 'path' property works.

            // Hack: Add a 'path' property to the stream so OpenAI SDK knows it's an mp3 (or similar)
            // ytdl-core usually returns webm or mp4 audio, but we can try to hint it.
            // Better yet, we can rely on OpenAI's ability to detect. 
            // However, the SDK often requires a filename.

            const stream: any = audioStream;
            stream.path = 'audio.m4a'; // Mock filename for type detection (matches yt-dlp output format)

            const response = await this.openai.audio.transcriptions.create({
                file: stream,
                model: 'whisper-1',
                response_format: 'text', // We just want the text
            });

            // response is string because response_format is 'text'
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
