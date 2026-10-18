import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'doorsurvey-pro' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

export function logIntegrationCall(
  service: string,
  action: string,
  metadata: Record<string, any>
) {
  logger.info('Integration call', {
    integration: service,
    action,
    ...metadata,
  });
}

export function logAuditEvent(
  userId: string,
  organizationId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, any>
) {
  logger.info('Audit event', {
    audit: true,
    userId,
    organizationId,
    action,
    resourceType,
    resourceId,
    ...metadata,
  });
}

export function logError(
  error: Error,
  context?: Record<string, any>
) {
  logger.error('Application error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...context,
  });
}

export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata: Record<string, any>
) {
  logger.warn('Security event', {
    security: true,
    event,
    severity,
    ...metadata,
  });
}
