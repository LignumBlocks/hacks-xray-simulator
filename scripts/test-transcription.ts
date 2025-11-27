import { YouTubeTranscriptionService } from '../src/infrastructure/youtube/YouTubeTranscriptionService';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function main() {
    const url = process.argv[2];

    if (!url) {
        console.error('Please provide a YouTube URL as an argument.');
        console.error('Usage: npx tsx scripts/test-transcription.ts <youtube_url>');
        process.exit(1);
    }

    console.log(`Transcribing video: ${url}...`);

    if (!process.env.OPENAI_API_KEY) {
        console.warn('WARNING: OPENAI_API_KEY is not set in environment variables.');
    }

    const service = new YouTubeTranscriptionService();

    try {
        const result = await service.transcribeFromUrl(url);

        if (result.ok) {
            console.log('\n--- Transcription Success ---');
            console.log('Video ID:', result.result.meta.videoId);
            console.log('Duration:', result.result.meta.estimatedDurationSec, 'seconds');
            console.log('\nTranscript:');
            console.log(result.result.transcript);
            console.log('\n-----------------------------');
        } else {
            console.error('\n--- Transcription Failed ---');
            console.error('Code:', result.error.code);
            console.error('Message:', result.error.message);
            console.error('----------------------------');
        }
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

main();
