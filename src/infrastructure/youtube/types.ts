export type YouTubeTranscriptionErrorCode =
    | "UNSUPPORTED_URL"
    | "VIDEO_TOO_LONG"
    | "FETCH_FAILED"
    | "TRANSCRIPTION_FAILED"
    | "TRANSCRIPTION_TIMEOUT";

export interface YouTubeTranscriptionResult {
    transcript: string;
    meta: {
        videoUrl: string;
        videoId: string;
        estimatedDurationSec: number;
        source: "youtube_ytdl";
    };
    rawTranscript?: string;
}

export interface YouTubeTranscriptionError {
    code: YouTubeTranscriptionErrorCode;
    message: string;
}

export type YouTubeTranscriptionResponse =
    | { ok: true; result: YouTubeTranscriptionResult }
    | { ok: false; error: YouTubeTranscriptionError };
