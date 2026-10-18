import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";

// Initialize Sentry FIRST (before rendering)
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const environment = import.meta.env.MODE || 'development';

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    
    environment,
    
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    tracePropagationTargets: ['localhost', /^https:\/\/.+\.replit\.app/],
    
    // Session Replay
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: environment === 'production' ? 1.0 : 0,
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive URLs
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/(\?|&)(token|key|password)=[^&]*/gi, '$1$2=REDACTED');
      }
      return event;
    },
  });
  
  console.log(`✅ Sentry initialized (${environment})`);
} else {
  console.log('ℹ️  Sentry DSN not provided - error tracking disabled');
}

createRoot(document.getElementById("root")!).render(<App />);
// Cache bust: 1762914972
