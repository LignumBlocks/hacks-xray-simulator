import { describe, it, expect, vi, afterEach } from 'vitest';
import { FeatureFlagService } from '../../../../infrastructure/config/FeatureFlagService';

describe('FeatureFlagService', () => {
    const service = new FeatureFlagService();

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should return true when ENABLE_YOUTUBE_INGESTION is "true"', () => {
        vi.stubEnv('ENABLE_YOUTUBE_INGESTION', 'true');
        expect(service.isYouTubeIngestionEnabled()).toBe(true);
    });

    it('should return false when ENABLE_YOUTUBE_INGESTION is "false"', () => {
        vi.stubEnv('ENABLE_YOUTUBE_INGESTION', 'false');
        expect(service.isYouTubeIngestionEnabled()).toBe(false);
    });

    it('should return false when ENABLE_YOUTUBE_INGESTION is undefined', () => {
        vi.stubEnv('ENABLE_YOUTUBE_INGESTION', undefined);
        expect(service.isYouTubeIngestionEnabled()).toBe(false);
    });

    it('should return false when ENABLE_YOUTUBE_INGESTION is anything else', () => {
        vi.stubEnv('ENABLE_YOUTUBE_INGESTION', 'foo');
        expect(service.isYouTubeIngestionEnabled()).toBe(false);
    });
});
