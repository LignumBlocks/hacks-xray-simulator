export class FeatureFlagService {
    isYouTubeIngestionEnabled(): boolean {
        return process.env.ENABLE_YOUTUBE_INGESTION === 'true';
    }
}
