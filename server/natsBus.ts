import { connect, NatsConnection, StringCodec, ConnectionOptions } from 'nats';
import { logger } from './logger';

let nc: NatsConnection | null = null;
const sc = StringCodec();

// In-memory fallback for when NATS is unavailable
const memoryQueue: Array<{ subject: string; data: any }> = [];
let useMemoryFallback = false;

export async function getNatsConnection(): Promise<NatsConnection | null> {
  if (nc && !nc.isClosed()) {
    return nc;
  }

  const natsUrl = process.env.NATS_URL;
  
  if (!natsUrl) {
    if (!useMemoryFallback) {
      logger.warn('NATS_URL not configured - using in-memory event queue (workers will not receive events)', {
        service: 'doorsurvey-pro',
      });
      useMemoryFallback = true;
    }
    return null;
  }

  try {
    const opts: ConnectionOptions = {
      servers: natsUrl,
      maxReconnectAttempts: -1, // Reconnect indefinitely
      reconnectTimeWait: 2000,   // Wait 2s between reconnect attempts
    };

    nc = await connect(opts);

    logger.info('✅ NATS connected', {
      service: 'doorsurvey-pro',
      server: natsUrl,
    });

    // Reset memory fallback flag
    if (useMemoryFallback) {
      logger.info('NATS connection restored - switching from in-memory to NATS', {
        service: 'doorsurvey-pro',
        queuedEvents: memoryQueue.length,
      });
      
      // Publish any queued events
      for (const { subject, data } of memoryQueue) {
        await publish(subject, data);
      }
      memoryQueue.length = 0;
      useMemoryFallback = false;
    }

    // Handle connection events
    (async () => {
      for await (const s of nc!.status()) {
        logger.info('NATS status change', {
          service: 'doorsurvey-pro',
          type: s.type,
          data: s.data,
        });
      }
    })().catch((err) => {
      logger.error('NATS status monitor error', {
        service: 'doorsurvey-pro',
        error: err.message,
      });
    });

    return nc;
  } catch (error: any) {
    logger.error('Failed to connect to NATS - using in-memory fallback', {
      service: 'doorsurvey-pro',
      error: error.message,
      natsUrl,
    });
    useMemoryFallback = true;
    return null;
  }
}

/**
 * Publish an event to NATS message bus
 * Falls back to in-memory queue if NATS is unavailable
 */
export async function publish(subject: string, data: any): Promise<void> {
  const connection = await getNatsConnection();

  if (!connection) {
    // Store in memory for later processing
    memoryQueue.push({ subject, data });
    logger.debug('Event queued in memory (NATS unavailable)', {
      service: 'doorsurvey-pro',
      subject,
      queueSize: memoryQueue.length,
    });
    return;
  }

  try {
    const payload = sc.encode(JSON.stringify(data));
    connection.publish(subject, payload);
    
    logger.debug('Event published', {
      service: 'doorsurvey-pro',
      subject,
      data: JSON.stringify(data).substring(0, 200),
    });
  } catch (error: any) {
    logger.error('Failed to publish event', {
      service: 'doorsurvey-pro',
      subject,
      error: error.message,
    });
    
    // Fallback to memory queue
    memoryQueue.push({ subject, data });
    useMemoryFallback = true;
  }
}

/**
 * Gracefully close NATS connection
 */
export async function closeNatsConnection(): Promise<void> {
  if (nc && !nc.isClosed()) {
    await nc.drain();
    await nc.close();
    logger.info('NATS connection closed', {
      service: 'doorsurvey-pro',
    });
  }
}

// Initialize NATS connection on module load
getNatsConnection().catch((err) => {
  logger.warn('Initial NATS connection failed - will retry on first publish', {
    service: 'doorsurvey-pro',
    error: err.message,
  });
});
