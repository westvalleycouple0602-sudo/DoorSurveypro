// CRITICAL: Sentry instrumentation MUST be imported FIRST
import './instrument';
import * as Sentry from '@sentry/node';

// Load environment variables from .env file (must be early)
import dotenv from 'dotenv';
dotenv.config();

// Validate environment configuration
import { validateStartupEnvironment, logStartupValidation } from './utils/startup-validation';
const validation = validateStartupEnvironment();
logStartupValidation(validation);

import express, { type Request, Response, NextFunction } from "express";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { resolveClerkUser } from "./clerkAuth";
import { sameOriginOperatorMutations } from "./middleware/operator-origin";
import compression from "compression";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logger, logError, logSecurityEvent } from "./logger";
import healthRouter from "./routes/health.routes";
import { setupSecurityMiddleware } from "./middleware/security";
import { performanceMiddleware } from "./utils/performance-alerts";
import { cache } from "./utils/cache";
import { cleanupZapierRateLimiting, cleanupGeneralRateLimiting } from "./zapier-middleware";
import { createAuditMiddleware } from "./audit-middleware";
import { storage } from "./storage";
import { webhookLimiter } from "./middleware/rateLimiting";
import docusignWebhookRouter from "./routes/webhooks/docusign";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const app = express();
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Health check routes (must be early - before auth/CSRF middleware)
app.use(healthRouter);

// Trust proxy for proper IP detection behind proxies (required for rate limiting)
// Set to 1 for most reverse proxy setups (nginx, Apache, Cloudflare, etc.)
app.set('trust proxy', 1);

// Security middleware (Helmet, CSP, HSTS, Input Sanitization, etc.)
// Must come early but AFTER trust proxy setting
setupSecurityMiddleware(app);
app.use("/api/super-admin", sameOriginOperatorMutations);

// Retired payment webhooks must not accept events or mutate historic records.
app.post("/api/stripe/webhook/:uuid", (_req, res) => {
  res.status(410).json({ error: "Online billing has been removed from this application." });
});

// DocuSign webhook with raw body capture for HMAC signature verification
// Must come BEFORE express.json() middleware to preserve raw body for signature validation
// SECURITY: Rate limiting applied first to prevent DoS attacks
app.use(
  "/api/webhooks/docusign",
  webhookLimiter,
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    // Store raw body for HMAC verification, then parse JSON
    if (req.body && Buffer.isBuffer(req.body)) {
      (req as any).rawBody = req.body.toString();
      try {
        req.body = JSON.parse(req.body.toString());
      } catch (e) {
        // Let handler deal with invalid JSON
      }
    }
    next();
  },
  docusignWebhookRouter
);

// Increase body size limit to 50MB for photo uploads (base64 images can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser());
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);
app.use("/api", resolveClerkUser);
// The separate operator console retains its credential-based session, scoped
// away from all Clerk-authenticated application routes.
app.use("/api/super-admin", session({
  name: "operator.sid",
  secret: process.env.SESSION_SECRET!,
  store: new (connectPg(session))({ pool, tableName: "sessions", createTableIfMissing: false }),
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 86400000 },
}));

// Enable gzip/brotli compression for all responses (reduces payload size by 60-80%)
// Automatically compresses JSON, HTML, CSS, JS, and other text-based responses
app.use(compression({
  filter: (req, res) => {
    // Don't compress if client explicitly disables it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // CRITICAL: Don't compress Server-Sent Events (SSE) - it breaks streaming
    // SSE requires immediate chunk delivery without buffering
    if (res.getHeader('Content-Type') === 'text/event-stream') {
      return false;
    }
    // Don't compress SSE endpoints by path (in case header isn't set yet)
    if (req.path === '/api/chat/completions') {
      return false;
    }
    // Use compression's default filter for everything else
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9, default 6 provides good balance)
  threshold: 1024, // Only compress responses larger than 1KB
}));

// Performance monitoring middleware
app.use(performanceMiddleware);

// Audit logging middleware for compliance tracking
// Excludes health checks and static assets
app.use(createAuditMiddleware({
  excludePaths: ['/health', '/api/health', '/assets/', '/src/'],
  includeBody: false, // Don't log request bodies for security (may contain PII/credentials)
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // SECURITY: Never log response bodies as they may contain tokens, PII, passwords, etc.
      // Only log safe metadata: method, path, status code, and duration
      const logData = {
        method: req.method,
        path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      };

      if (res.statusCode >= 400) {
        logger.warn('API request failed', logData);
      } else {
        logger.info('API request', logData);
      }

      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  // Initialize notification subscribers for event-driven email notifications
  try {
    const { initializeNotificationSubscribers } = await import("./events/notificationSubscriber.js");
    await initializeNotificationSubscribers();
    logger.info("Notification subscribers initialized");
  } catch (error) {
    logger.error("Failed to initialize notification subscribers", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Initialize trial notification scheduler for daily trial status checks
  try {
    const { initializeTrialNotificationScheduler } = await import("./jobs/trialNotificationScheduler.js");
    await initializeTrialNotificationScheduler();
  } catch (error) {
    logger.error("Failed to initialize trial notification scheduler", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Seed development organization if in development mode
  if (process.env.NODE_ENV === 'development') {
    const { db } = await import("./db");
    const { organizations } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.id, 'dev-org-001')
    });
    
    if (!existing) {
      await db.insert(organizations).values({
        id: 'dev-org-001',
        name: 'Development Organization',
        slug: 'dev-org',
        subscriptionTier: 'professional',
        subscriptionStatus: 'active',
        projectLimit: null,
        userLimit: null,
        activeAddons: ['engineeringReview'], // Include engineering review add-on for testing
      });
      logger.info('✅ Created development organization (dev-org-001) with engineering review access');
    } else if (!existing.activeAddons || !(existing.activeAddons as string[])?.includes?.('engineeringReview')) {
      // Update existing dev org to include engineering review add-on
      await db.update(organizations)
        .set({ activeAddons: ['engineeringReview'] })
        .where(eq(organizations.id, 'dev-org-001'));
      logger.info('✅ Updated development organization with engineering review access');
    }
  }

  const server = await registerRoutes(app);

  // Sentry error handler MUST be after all routes but BEFORE custom error handlers
  Sentry.setupExpressErrorHandler(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logError(err, {
      method: _req.method,
      path: _req.path,
      statusCode: status,
    });

    // Check if response headers were already sent to avoid double responses
    if (res.headersSent) {
      return _next(err);
    }

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  /**
   * Graceful Shutdown Handler
   * 
   * Ensures all resources are properly cleaned up on shutdown:
   * - Closes HTTP server and drains in-flight connections
   * - Clears all setInterval timers to prevent memory leaks
   * - Destroys in-memory cache cleanup intervals
   * - Stops rate limiting cleanup intervals
   */
  let isShuttingDown = false;
  
  async function gracefulShutdown(signal: string) {
    if (isShuttingDown) {
      logger.warn(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }
    
    isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    try {
      // Stop accepting new connections and wait for existing ones to complete
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            logger.error('Error closing HTTP server', { error: err });
            reject(err);
          } else {
            logger.info('HTTP server closed - all connections drained');
            resolve();
          }
        });
      });

      // Clean up all interval-based resources
      logger.info('Cleaning up intervals and timers...');
      
      // Clean up cache intervals (if using in-memory cache)
      if (!cache.isUsingRedis()) {
        cache.destroy();
        logger.info('In-memory cache cleanup complete');
      }
      
      // Clean up rate limiting intervals
      cleanupZapierRateLimiting();
      cleanupGeneralRateLimiting();
      logger.info('Rate limiting cleanup complete');
      
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    }
  }

  // Register shutdown handlers for various signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    // Suppress Redis connection reset errors (expected with Upstash idle connections)
    const errorMessage = error?.message || '';
    if (errorMessage.includes('ECONNRESET') || 
        errorMessage.includes('Connection is closed') ||
        errorMessage.includes('Socket closed unexpectedly')) {
      // These are expected with cloud Redis providers - connection will auto-reconnect
      return;
    }
    logger.error('Uncaught Exception', { error });
    gracefulShutdown('uncaughtException');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise) => {
    // Suppress Redis connection reset errors
    const reasonMessage = reason?.message || String(reason);
    if (reasonMessage.includes('ECONNRESET') || 
        reasonMessage.includes('Connection is closed') ||
        reasonMessage.includes('Socket closed unexpectedly')) {
      // These are expected with cloud Redis providers
      return;
    }
    logger.error('Unhandled Rejection', { reason, promise });
  });
})();
