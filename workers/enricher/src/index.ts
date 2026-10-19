import 'dotenv/config';
import { connect, StringCodec, NatsConnection } from 'nats';
import pkg from 'pg';
import Tesseract from 'tesseract.js';
import { Jimp } from 'jimp';

const { Pool } = pkg;
const sc = StringCodec();

// Simple console logger for worker
const logger = {
  info: (msg: string, data?: any) => console.log(JSON.stringify({ level: 'info', msg, ...data, timestamp: new Date().toISOString() })),
  error: (msg: string, data?: any) => console.error(JSON.stringify({ level: 'error', msg, ...data, timestamp: new Date().toISOString() })),
  warn: (msg: string, data?: any) => console.warn(JSON.stringify({ level: 'warn', msg, ...data, timestamp: new Date().toISOString() })),
};

interface PhotoUploadedEvent {
  photoId: string;
  openingId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  url: string;
  timestamp: string;
}

async function extractTextFromImage(imageUrl: string): Promise<string> {
  try {
    // For now, return placeholder - full implementation would download image and run OCR
    logger.info('OCR processing skipped (placeholder)', { imageUrl });
    return '';
    
    // Full implementation would be:
    // const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng');
    // return text;
  } catch (error: any) {
    logger.error('OCR failed', { error: error.message, imageUrl });
    return '';
  }
}

async function generateThumbnail(imageUrl: string): Promise<string> {
  try {
    // Placeholder - full implementation would resize and store thumbnail
    logger.info('Thumbnail generation skipped (placeholder)', { imageUrl });
    return imageUrl;
    
    // Full implementation would be:
    // const image = await Jimp.read(imageUrl);
    // const thumbnail = await image.resize({ w: 200, h: 200 }).getBase64('image/jpeg');
    // // Upload thumbnail to S3/storage
    // return thumbnailUrl;
  } catch (error: any) {
    logger.error('Thumbnail generation failed', { error: error.message, imageUrl });
    return imageUrl;
  }
}

async function enrichPhoto(pool: any, event: PhotoUploadedEvent): Promise<void> {
  const { photoId, url, openingId, organizationId } = event;
  
  logger.info('Enriching photo', { photoId, url, organizationId });
  
  try {
    // Extract text via OCR
    const extractedText = await extractTextFromImage(url);
    
    // Generate thumbnail
    const thumbnailUrl = await generateThumbnail(url);
    
    // Extract EXIF data (placeholder)
    const exifData = {
      processed: true,
      timestamp: new Date().toISOString(),
      worker: 'enricher',
    };
    
    // Update photo record with enriched data
    await pool.query(`
      UPDATE photos 
      SET 
        thumbnail_url = $1,
        extracted_text = $2,
        exif_data = $3,
        processing_status = 'enriched',
        enriched_at = NOW()
      WHERE id = $4
    `, [thumbnailUrl, extractedText, JSON.stringify(exifData), photoId]);
    
    logger.info('Photo enriched successfully', {
      photoId,
      hasExtractedText: extractedText.length > 0,
      hasThumbnail: !!thumbnailUrl,
      organizationId,
    });
  } catch (error: any) {
    logger.error('Photo enrichment failed', {
      error: error.message,
      photoId,
      organizationId,
    });
    
    // Mark as failed
    await pool.query(`
      UPDATE photos 
      SET processing_status = 'failed'
      WHERE id = $1
    `, [photoId]);
  }
}

async function main() {
  const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    logger.error('DATABASE_URL not configured', {});
    process.exit(1);
  }
  
  try {
    // Connect to NATS
    const nc: NatsConnection = await connect({ 
      servers: natsUrl,
      maxReconnectAttempts: -1,
      reconnectTimeWait: 2000,
    });
    logger.info('Connected to NATS', { server: natsUrl });
    
    // Connect to database
    const pool = new Pool({ connectionString: databaseUrl });
    logger.info('Connected to database', {});
    
    // Subscribe to photo.uploaded events
    const sub = nc.subscribe('photo.uploaded');
    logger.info('Enricher worker listening on photo.uploaded', {});
    
    // Process events
    for await (const m of sub) {
      try {
        const event: PhotoUploadedEvent = JSON.parse(sc.decode(m.data));
        logger.info('Received photo.uploaded event', { photoId: event.photoId });
        
        await enrichPhoto(pool, event);
      } catch (error: any) {
        logger.error('Event processing error', { 
          error: error.message,
          stack: error.stack,
        });
      }
    }
  } catch (error: any) {
    logger.error('Worker startup failed', { 
      error: error.message,
      natsUrl,
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully', {});
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully', {});
  process.exit(0);
});

main().catch((error) => {
  logger.error('Fatal error', { error: error.message });
  process.exit(1);
});
