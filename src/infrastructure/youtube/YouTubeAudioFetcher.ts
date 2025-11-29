import ytDlpModule, { create as createYtDlp } from 'yt-dlp-exec';
import { Readable } from 'stream';
import { YouTubeTranscriptionError } from './types';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class YouTubeAudioFetcher {
    private readonly MAX_DURATION_SECONDS = 1200; // 20 minutes
    private ytDlp: ReturnType<typeof createYtDlp>;
    private cookiesPath?: string;

    constructor() {
        // Resolve absolute path to yt-dlp binary
        // In Next.js/Turbopack, relative paths may not work correctly
        const ytDlpBinary = path.resolve(process.cwd(), 'node_modules/yt-dlp-exec/bin/yt-dlp');
        console.log(`[YouTubeAudioFetcher] Using yt-dlp binary at: ${ytDlpBinary}`);

        // Check for cookies file (optional, helps avoid YouTube bot detection)
        const cookiesPath = path.resolve(process.cwd(), 'youtube-cookies.txt');
        if (fs.existsSync(cookiesPath)) {
            this.cookiesPath = cookiesPath;
            console.log(`[YouTubeAudioFetcher] Using cookies from: ${cookiesPath}`);
        } else {
            console.log(`[YouTubeAudioFetcher] No cookies file found at ${cookiesPath}, proceeding without cookies`);
        }

        // Create a custom instance with the explicit binary path
        this.ytDlp = createYtDlp(ytDlpBinary);
    }

    async fetchAudioStream(url: string): Promise<Readable> {
        console.log(`[YouTubeAudioFetcher] Validating URL: ${url}`);

        // Basic regex validation first to avoid spawning process for obvious bad inputs
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        if (!youtubeRegex.test(url)) {
            const error: YouTubeTranscriptionError = {
                code: 'UNSUPPORTED_URL',
                message: 'The provided URL is not a valid YouTube URL.',
            };
            throw error;
        }

        try {
            console.log(`[YouTubeAudioFetcher] Fetching video info with yt-dlp...`);
            const flags: any = {
                dumpJson: true,
                noWarnings: true,
            };

            // Add cookies if available
            if (this.cookiesPath) {
                flags.cookies = this.cookiesPath;
            }

            const output = await this.ytDlp(url, flags);

            // yt-dlp-exec returns the output as an object if dumpJson is true, 
            // but the types might be loose. It usually returns the parsed JSON.
            const info = output as any;
            const durationSec = info.duration;
            const title = info.title;

            console.log(`[YouTubeAudioFetcher] Video found: ${title} (${durationSec}s)`);

            if (durationSec > this.MAX_DURATION_SECONDS) {
                console.error(`[YouTubeAudioFetcher] Video too long: ${durationSec}s > ${this.MAX_DURATION_SECONDS}s`);
                const error: YouTubeTranscriptionError = {
                    code: 'VIDEO_TOO_LONG',
                    message: `Video is too long (${durationSec}s). Max allowed is ${this.MAX_DURATION_SECONDS}s.`,
                };
                throw error;
            }

            console.log(`[YouTubeAudioFetcher] Downloading audio stream...`);

            const tempDir = os.tmpdir();
            // We'll determine the filename dynamically based on success
            const baseTempPath = path.join(tempDir, `yt-audio-${Date.now()}`);

            // STRATEGY 1: FAST PATH
            // Try to download native M4A (format 140) directly without conversion.
            // This is much faster as it avoids FFmpeg re-encoding.
            try {
                const fastFile = `${baseTempPath}.m4a`;
                console.log(`[YouTubeAudioFetcher] Attempting FAST download (native M4A) to: ${fastFile}`);

                const fastFlags: any = {
                    output: fastFile,
                    format: '140/bestaudio[ext=m4a]', // Explicitly ask for M4A
                    noWarnings: true,
                };

                if (this.cookiesPath) {
                    fastFlags.cookies = this.cookiesPath;
                }

                await this.ytDlp(url, fastFlags);

                if (fs.existsSync(fastFile)) {
                    const fileSize = fs.statSync(fastFile).size;
                    console.log(`[YouTubeAudioFetcher] FAST download successful! Size: ${fileSize} bytes`);
                    return this.createCleanupStream(fastFile);
                }
            } catch (fastError: any) {
                console.log(`[YouTubeAudioFetcher] Fast download failed (format likely unavailable), falling back to conversion. Error: ${fastError.message}`);
            }

            // STRATEGY 2: ROBUST PATH (Slower)
            // Download whatever is available (likely WebM/Opus) and convert to M4A.
            // This requires FFmpeg and takes CPU/time.
            const convertFile = `${baseTempPath}-converted.m4a`;
            console.log(`[YouTubeAudioFetcher] Attempting ROBUST download (convert to M4A) to: ${convertFile}`);

            const convertFlags: any = {
                output: convertFile,
                extractAudio: true,
                audioFormat: 'm4a',
                // Removed audioQuality: 0 to use default (faster)
                noWarnings: true,
            };

            if (this.cookiesPath) {
                convertFlags.cookies = this.cookiesPath;
            }

            try {
                await this.ytDlp(url, convertFlags);

                if (fs.existsSync(convertFile)) {
                    const fileSize = fs.statSync(convertFile).size;
                    console.log(`[YouTubeAudioFetcher] Conversion successful! Size: ${fileSize} bytes`);
                    return this.createCleanupStream(convertFile);
                }
            } catch (extractError: any) {
                console.error('[YouTubeAudioFetcher] Audio extraction failed:', extractError.message);

                // STRATEGY 3: FALLBACK (Video)
                // If extraction fails (no FFmpeg), try downloading video and let OpenAI handle it
                console.log('[YouTubeAudioFetcher] Falling back to video download...');
                const videoFile = `${baseTempPath}.mp4`;

                await this.ytDlp(url, {
                    output: videoFile,
                    format: 'best[ext=mp4]/best',
                    noWarnings: true,
                    cookies: this.cookiesPath,
                });

                const videoSize = fs.statSync(videoFile).size;
                console.log(`[YouTubeAudioFetcher] Video downloaded as fallback, size: ${videoSize} bytes`);
                return this.createCleanupStream(videoFile);
            }

            // If neither fast nor robust download succeeded, throw an error
            throw new Error('All download strategies failed');

        } catch (err: any) {
            console.error(`[YouTubeAudioFetcher] Error:`, err);
            // If it's already one of our typed errors, rethrow
            if (err.code && ['UNSUPPORTED_URL', 'VIDEO_TOO_LONG'].includes(err.code)) {
                throw err;
            }

            // Wrap unknown errors
            const error: YouTubeTranscriptionError = {
                code: 'FETCH_FAILED',
                message: `Failed to fetch video info or stream: ${err.message}`,
            };
            throw error;
        }
    }

    private createCleanupStream(filePath: string): Readable {
        const stream = fs.createReadStream(filePath);

        stream.on('end', () => {
            console.log(`[YouTubeAudioFetcher] Cleaning up temp file: ${filePath}`);
            fs.unlink(filePath, (err) => {
                if (err) console.error(`[YouTubeAudioFetcher] Failed to delete temp file:`, err);
            });
        });

        stream.on('error', () => {
            fs.unlink(filePath, () => { });
        });

        return stream;
    }

    async getVideoMeta(url: string) {
        try {
            console.log(`[YouTubeAudioFetcher] Getting video meta for: ${url}`);
            const metaFlags: any = {
                dumpJson: true,
                noWarnings: true,
            };

            if (this.cookiesPath) {
                metaFlags.cookies = this.cookiesPath;
            }

            const output = await this.ytDlp(url, metaFlags);
            const info = output as any;

            return {
                videoId: info.id,
                title: info.title,
                durationSec: info.duration,
            };
        } catch (err: any) {
            console.error(`[YouTubeAudioFetcher] Meta Error:`, err);
            const error: YouTubeTranscriptionError = {
                code: 'FETCH_FAILED',
                message: `Failed to fetch video meta: ${err.message}`,
            };
            throw error;
        }
    }
}

