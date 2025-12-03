import { create as createYtDlp } from 'yt-dlp-exec';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { YouTubeTranscriptionError } from './types';
import fs from 'fs';
import path from 'path';

type VideoMeta = {
    videoId?: string;
    title?: string;
    durationSec: number | null;
};

export class YouTubeAudioFetcher {
    private readonly MAX_DURATION_SECONDS = 1200; // 20 minutes
    private readonly META_TIMEOUT_MS = 60_000; // 60s para meta
    // Nota: El timeout de descarga ya no es tan crítico porque es stream, 
    // pero lo mantenemos para evitar procesos zombies si se cuelga.

    private ytDlpBinaryPath: string;
    private cookiesPath?: string;

    // Instancia wrapper para metadata (promesas)
    private ytDlpJsonClient: ReturnType<typeof createYtDlp>;

    // Cache simple en memoria
    private metaCache = new Map<string, VideoMeta>();

    constructor() {
        // 1. Resolver path del binario
        this.ytDlpBinaryPath = path.resolve(
            process.cwd(),
            'node_modules/yt-dlp-exec/bin/yt-dlp'
        );
        console.log(
            `[YouTubeAudioFetcher] Using yt-dlp binary at: ${this.ytDlpBinaryPath}`
        );

        // 2. Resolver cookies
        const cookiesPath = path.resolve(process.cwd(), 'youtube-cookies.txt');
        if (fs.existsSync(cookiesPath)) {
            this.cookiesPath = cookiesPath;
            console.log(
                `[YouTubeAudioFetcher] Using cookies from: ${cookiesPath}`
            );
        } else {
            console.log(
                `[YouTubeAudioFetcher] No cookies file found at ${cookiesPath}, proceeding without cookies`
            );
        }

        // 3. Crear cliente para JSON (metadata) usando la ruta explícita
        this.ytDlpJsonClient = createYtDlp(this.ytDlpBinaryPath);
    }

    /**
     * Obtiene metadata. Usa cache para no repetir peticiones.
     */
    private async fetchVideoInfo(url: string): Promise<VideoMeta> {
        const cached = this.metaCache.get(url);
        if (cached) return cached;

        try {
            console.log(`[YouTubeAudioFetcher] Getting video info for: ${url}`);

            const metaFlags: any = {
                dumpJson: true,
                noWarnings: true,
                'no-playlist': true,  // Optimización: no escanear listas
                'skip-download': true // Optimización: explícita
            };

            if (this.cookiesPath) {
                metaFlags.cookies = this.cookiesPath;
            }

            // Usamos el wrapper de promesa para el JSON porque necesitamos esperar la respuesta
            const output = await (this.ytDlpJsonClient as any)(url, metaFlags, {
                timeout: this.META_TIMEOUT_MS,
            });

            const info = output as any;
            const durationSec = typeof info.duration === 'number' ? info.duration : null;

            const meta: VideoMeta = {
                videoId: info.id,
                title: info.title,
                durationSec,
            };

            this.metaCache.set(url, meta);
            return meta;
        } catch (err: any) {
            console.error(`[YouTubeAudioFetcher] Meta Error:`, err);
            throw {
                code: 'FETCH_FAILED',
                message: `Failed to fetch video meta: ${err.message}`,
            } as YouTubeTranscriptionError;
        }
    }

    /**
     * Obtiene el stream de audio optimizado directo a stdout.
     */
    async fetchAudioStream(url: string): Promise<Readable> {
        console.log(`[YouTubeAudioFetcher] Validating URL: ${url}`);

        // Validación Regex básica
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        if (!youtubeRegex.test(url)) {
            throw {
                code: 'UNSUPPORTED_URL',
                message: 'The provided URL is not a valid YouTube URL.',
            } as YouTubeTranscriptionError;
        }

        try {
            // 1) Obtener y validar metadata
            const info = await this.fetchVideoInfo(url);
            const durationSec = info.durationSec;

            console.log(`[YouTubeAudioFetcher] Video found: ${info.title} (${durationSec ?? 'unknown'}s)`);

            if (durationSec && durationSec > this.MAX_DURATION_SECONDS) {
                throw {
                    code: 'VIDEO_TOO_LONG',
                    message: `Video is too long (${durationSec}s). Max allowed is ${this.MAX_DURATION_SECONDS}s.`,
                } as YouTubeTranscriptionError;
            }

            console.log(`[YouTubeAudioFetcher] Starting optimized audio stream...`);

            // 2) Configurar flags para Streaming directo
            // 2) Configurar argumentos para Streaming directo con spawn
            // Prioridad: M4A nativo -> Cualquier Audio (Opus/WebM) -> Video fallback
            const args = [
                '--output', '-',
                '--format', 'bestaudio[ext=m4a]/bestaudio/best',
                '--no-playlist',
                '--concurrent-fragments', '4',
                '--buffer-size', '16k',
                '--limit-rate', '50M',
                '--quiet',
                '--no-warnings',
            ];

            if (this.cookiesPath) {
                args.push('--cookies', this.cookiesPath);
            }

            // URL al final
            args.push(url);

            // 3) Ejecutar proceso nativo con spawn
            console.log(`[YouTubeAudioFetcher] Spawning: ${this.ytDlpBinaryPath} ${args.join(' ')}`);

            const subprocess = spawn(this.ytDlpBinaryPath, args);

            if (!subprocess.stdout) {
                throw new Error('Failed to spawn yt-dlp process (no stdout).');
            }

            // Manejo básico de errores del proceso
            subprocess.stderr?.on('data', (data) => {
                const msg = data.toString();
                // Ignorar warnings de yt-dlp, solo errores reales
                if (msg.toLowerCase().includes('error')) {
                    console.error(`[YouTubeAudioFetcher] yt-dlp stderr: ${msg}`);
                }
            });

            // Retornamos directamente el stream
            return subprocess.stdout;

        } catch (err: any) {
            console.error(`[YouTubeAudioFetcher] Error in fetchAudioStream:`, err);

            if (err?.code && ['UNSUPPORTED_URL', 'VIDEO_TOO_LONG', 'FETCH_FAILED'].includes(err.code)) {
                throw err as YouTubeTranscriptionError;
            }

            throw {
                code: 'FETCH_FAILED',
                message: `Failed to fetch stream: ${err.message}`,
            } as YouTubeTranscriptionError;
        }
    }

    /**
     * API pública para obtener sólo metadata.
     */
    async getVideoMeta(url: string) {
        const info = await this.fetchVideoInfo(url);
        return {
            videoId: info.videoId,
            title: info.title,
            durationSec: info.durationSec,
        };
    }
}