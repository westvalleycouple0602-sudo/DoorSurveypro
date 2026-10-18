/**
 * Sentry Instrumentation
 * MUST be imported FIRST in server/index.ts before all other modules
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const sentryDsn = process.env.SENTRY_DSN;
const environment = process.env.NODE_ENV || 'development';

// Only initialize Sentry if DSN is provided
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    
    environment,
    
    integrations: [
      nodeProfilingIntegration(),
    ],
    
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Profiling (relative to tracesSampleRate)
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Request data (optional - enable for debugging, disable for privacy)
    sendDefaultPii: false,
    
    // Enable logging integration
    enableLogs: true,
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });

  console.log(`✅ Sentry initialized (${environment})`);
} else {
  console.log('ℹ️  Sentry DSN not provided - error tracking disabled');
}

export default Sentry;
