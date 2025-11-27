export class IngestionMetrics {
    incrementAttempt() {
        console.log(JSON.stringify({
            event: 'youtube_ingestion_attempt',
            timestamp: new Date().toISOString(),
        }));
    }

    incrementSuccess(videoId: string, durationMs: number) {
        console.log(JSON.stringify({
            event: 'youtube_ingestion_success',
            videoId,
            durationMs,
            timestamp: new Date().toISOString(),
        }));
    }

    incrementFailure(errorCode: string, durationMs: number) {
        console.log(JSON.stringify({
            event: 'youtube_ingestion_failed',
            errorCode,
            durationMs,
            timestamp: new Date().toISOString(),
        }));
    }

    logFeatureDisabled(videoUrl: string) {
        console.log(JSON.stringify({
            event: 'youtube_ingestion_feature_disabled',
            videoUrl,
            timestamp: new Date().toISOString(),
        }));
    }
}
