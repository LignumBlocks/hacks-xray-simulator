export interface HackFromTranscriptExtractor {
    extract(transcript: string): Promise<string>;
}
