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

            // YouTube Shorts don't have audio-only streams, so we need to extract audio from video
            // This requires yt-dlp to extract and convert the audio
            const tempDir = os.tmpdir();
            const tempFile = path.join(tempDir, `yt-audio-${Date.now()}.m4a`);

            console.log(`[YouTubeAudioFetcher] Downloading and extracting audio to: ${tempFile}`);

            const downloadFlags: any = {
                output: tempFile,
                extractAudio: true,
                audioFormat: 'm4a',
                audioQuality: 0, // Best quality
                noWarnings: true,
            };

            if (this.cookiesPath) {
                downloadFlags.cookies = this.cookiesPath;
            }

            console.log('[YouTubeAudioFetcher] yt-dlp flags:', JSON.stringify(downloadFlags, null, 2));

            try {
                // Download and extract audio
                await this.ytDlp(url, downloadFlags);
            } catch (extractError: any) {
                console.error('[YouTubeAudioFetcher] Audio extraction failed:', extractError.message);

                // If extraction fails (no FFmpeg), try downloading video and let OpenAI handle it
                console.log('[YouTubeAudioFetcher] Falling back to video download...');
                const videoFile = path.join(tempDir, `yt-video-${Date.now()}.mp4`);

                await this.ytDlp(url, {
                    output: videoFile,
                    format: 'best[ext=mp4]/best',
                    noWarnings: true,
                    cookies: this.cookiesPath,
                });

                // Use video file instead
                const videoSize = fs.statSync(videoFile).size;
                console.log(`[YouTubeAudioFetcher] Video downloaded as fallback, size: ${videoSize} bytes`);

                const videoStream = fs.createReadStream(videoFile);
                console.log(`[YouTubeAudioFetcher] TEMP FILE KEPT FOR DEBUGGING: ${videoFile}`);
                return videoStream;
            }

            // Verify file exists
            if (!fs.existsSync(tempFile)) {
                throw new Error('Failed to download audio file');
            }

            const fileSize = fs.statSync(tempFile).size;
            console.log(`[YouTubeAudioFetcher] Audio extracted, size: ${fileSize} bytes`);

            // Read first bytes to detect format
            const fd = fs.openSync(tempFile, 'r');
            const buffer = Buffer.alloc(20);
            fs.readSync(fd, buffer, 0, 20, 0);
            fs.closeSync(fd);
            console.log(`[YouTubeAudioFetcher] File magic bytes (hex): ${buffer.toString('hex')}`);

            // Create a read stream from the temp file
            const audioStream = fs.createReadStream(tempFile);

            // DISABLED: Clean up temp file for debugging
            // audioStream.on('end', () => {
            //     console.log(`[YouTubeAudioFetcher] Cleaning up temp file: ${tempFile}`);
            //     fs.unlink(tempFile, (err) => {
            //         if (err) console.error(`[YouTubeAudioFetcher] Failed to delete temp file:`, err);
            //     });
            // });

            // audioStream.on('error', () => {
            //     // Also clean up on error
            //     fs.unlink(tempFile, () => {});
            // });

            console.log(`[YouTubeAudioFetcher] TEMP FILE KEPT FOR DEBUGGING: ${tempFile}`);

            return audioStream;

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
