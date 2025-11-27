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

            // Use format 140 which is M4A audio that YouTube always has available
            // This avoids format conversion issues and works without FFmpeg
            const execFlags: any = {
                output: '-', // Stdout
                format: '140/bestaudio[ext=m4a]/bestaudio', // Format 140 = M4A, fallback to best M4A, then any
                noWarnings: true,
            };

            if (this.cookiesPath) {
                execFlags.cookies = this.cookiesPath;
            }

            const subprocess = this.ytDlp.exec(url, execFlags);

            if (!subprocess.stdout) {
                throw new Error('Failed to spawn yt-dlp process (no stdout)');
            }

            return subprocess.stdout;

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
