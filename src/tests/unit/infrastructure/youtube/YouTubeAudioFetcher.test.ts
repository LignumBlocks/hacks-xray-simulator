import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YouTubeAudioFetcher } from '../../../../infrastructure/youtube/YouTubeAudioFetcher';
import ytDlp from 'yt-dlp-exec';
import { Readable } from 'stream';

// Mock yt-dlp-exec
vi.mock('yt-dlp-exec', async () => {
    const actual = await vi.importActual('yt-dlp-exec');
    // We mock the default export (function) and the 'exec' property
    const mockFn = vi.fn();
    (mockFn as any).exec = vi.fn();
    return {
        default: mockFn,
    };
});

describe('YouTubeAudioFetcher', () => {
    let fetcher: YouTubeAudioFetcher;
    const mockYtDlp = ytDlp as unknown as ReturnType<typeof vi.fn> & { exec: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        vi.clearAllMocks();
        fetcher = new YouTubeAudioFetcher();
    });

    it('should validate URL correctly', async () => {
        // Valid URL
        const validUrl = 'https://www.youtube.com/watch?v=123';
        // We mock the info call to return something valid so it doesn't fail later
        mockYtDlp.mockResolvedValue({ title: 'Test', duration: 100 });
        (mockYtDlp.exec as any).mockReturnValue({ stdout: new Readable() });

        await expect(fetcher.fetchAudioStream(validUrl)).resolves.toBeInstanceOf(Readable);

        // Invalid URL
        const invalidUrl = 'https://notyoutube.com/video';
        await expect(fetcher.fetchAudioStream(invalidUrl)).rejects.toMatchObject({
            code: 'UNSUPPORTED_URL',
        });
    });

    it('should throw VIDEO_TOO_LONG if duration exceeds limit', async () => {
        const url = 'https://www.youtube.com/watch?v=long';
        mockYtDlp.mockResolvedValue({ title: 'Long Video', duration: 3600 }); // 1 hour

        await expect(fetcher.fetchAudioStream(url)).rejects.toMatchObject({
            code: 'VIDEO_TOO_LONG',
        });
    });

    it('should fetch audio stream successfully', async () => {
        const url = 'https://www.youtube.com/watch?v=good';
        mockYtDlp.mockResolvedValue({ title: 'Good Video', duration: 100 });

        const mockStdout = new Readable();
        (mockYtDlp.exec as any).mockReturnValue({ stdout: mockStdout });

        const stream = await fetcher.fetchAudioStream(url);
        expect(stream).toBe(mockStdout);
        expect(mockYtDlp).toHaveBeenCalledWith(url, expect.objectContaining({ dumpJson: true }));
        expect(mockYtDlp.exec).toHaveBeenCalledWith(url, expect.objectContaining({ output: '-' }));
    });

    it('should handle yt-dlp errors', async () => {
        const url = 'https://www.youtube.com/watch?v=error';
        mockYtDlp.mockRejectedValue(new Error('Network error'));

        await expect(fetcher.fetchAudioStream(url)).rejects.toMatchObject({
            code: 'FETCH_FAILED',
        });
    });
});
