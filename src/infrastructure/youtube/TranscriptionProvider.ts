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

            // DIAGNOSTIC: Log stream properties
            console.log('[TranscriptionProvider] Stream properties:', {
                path: stream.path,
                readable: stream.readable,
                readableObjectMode: stream.readableObjectMode,
                constructor: stream.constructor?.name,
            });

            // DIAGNOSTIC: Read first few bytes to detect actual format
            let firstChunk: Buffer | null = null;
            const originalOn = stream.on.bind(stream);
            stream.on = function (event: string, handler: any) {
                if (event === 'data' && !firstChunk) {
                    return originalOn('data', (chunk: Buffer) => {
                        if (!firstChunk && chunk.length > 0) {
                            firstChunk = chunk.slice(0, Math.min(20, chunk.length));
                            console.log('[TranscriptionProvider] First bytes (hex):', firstChunk.toString('hex'));
                            console.log('[TranscriptionProvider] First bytes (ascii):', firstChunk.toString('ascii').replace(/[^\x20-\x7E]/g, '.'));

                            // Detect format from magic bytes
                            const hex = firstChunk.toString('hex');
                            if (hex.startsWith('fff1') || hex.startsWith('fff9')) {
                                console.log('[TranscriptionProvider] Detected format: AAC/M4A');
                            } else if (hex.startsWith('494433')) {
                                console.log('[TranscriptionProvider] Detected format: MP3 (ID3)');
                            } else if (hex.startsWith('fffb') || hex.startsWith('fff3')) {
                                console.log('[TranscriptionProvider] Detected format: MP3');
                            } else if (hex.startsWith('4f676753')) {
                                console.log('[TranscriptionProvider] Detected format: OGG/Opus');
                            } else if (hex.startsWith('1a45dfa3')) {
                                console.log('[TranscriptionProvider] Detected format: WebM/Matroska');
                            } else if (hex.includes('667479706d703432') || hex.includes('6674797069736f6d')) {
                                console.log('[TranscriptionProvider] Detected format: MP4/M4A');
                            } else {
                                console.log('[TranscriptionProvider] Unknown format, hex:', hex);
                            }
                        }
                        handler(chunk);
                    });
                }
                return originalOn(event, handler);
            };

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
