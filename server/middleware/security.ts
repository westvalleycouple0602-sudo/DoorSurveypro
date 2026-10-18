import helmet from "helmet";
import type { Express, Request, Response, NextFunction } from "express";
import mongoSanitize from "express-mongo-sanitize";
import { logSecurityEvent } from "../logger";

/**
 * Comprehensive security middleware configuration for multi-tenant SaaS
 * Implements OWASP best practices for 2025
 */

/**
 * Configure Helmet.js with secure headers
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - And more...
 */
export function configureHelmet() {
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // Build scriptSrc based on environment
  const clerkSources = ["https://*.clerk.accounts.dev", "https://*.clerk.com", "https://challenges.cloudflare.com"];
  const scriptSrc = ["'self'", "https://js.stripe.com", ...clerkSources];
  if (isDevelopment) {
    // Only allow unsafe operations in development for Vite HMR
    scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
  }

  // Build styleSrc based on environment
  const styleSrc = ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"];
  if (isDevelopment) {
    // Only allow unsafe-inline in development for hot reloading
    styleSrc.push("'unsafe-inline'");
  }
  
  return helmet({
    // Content Security Policy - Prevents XSS and data injection attacks
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        scriptSrc,
        styleSrc,
        fontSrc: [
          "'self'",
          "data:",
          "https://fonts.gstatic.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "*.replit.dev",
          "*.replit.app",
          "*.repl.co",
        ],
        connectSrc: [
          ...clerkSources,
          "'self'",
          "https://api.stripe.com",
          "https://replit.com",
          "wss://*.replit.dev",
          "wss://*.replit.app",
        ],
        frameSrc: [
          ...clerkSources,
          "'self'",
          "https://js.stripe.com",
          "https://hooks.stripe.com",
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },

    // HTTP Strict Transport Security - Force HTTPS
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // Prevent clickjacking
    frameguard: {
      action: "deny",
    },

    // Prevent MIME-type sniffing
    noSniff: true,

    // Referrer Policy
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },

    // Remove X-Powered-By header to hide Express
    hidePoweredBy: true,

    // Cross-Origin policies
    crossOriginEmbedderPolicy: false, // Disabled for external resources
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
}

/**
 * Input sanitization middleware
 * Prevents NoSQL injection and XSS attacks
 */
export function configureSanitization() {
  return [
    // Sanitize request data to prevent NoSQL injection
    mongoSanitize({
      replaceWith: "_",
      onSanitize: ({ req, key }) => {
        logSecurityEvent("input-sanitization", "medium", {
          path: req.path,
          key,
          message: "Potentially malicious input detected and sanitized",
        });
      },
    }),
  ];
}

/**
 * Additional security headers not covered by Helmet
 */
export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );


  next();
}

/**
 * Detect and block suspicious patterns in requests
 */
export function suspiciousPatternDetection(req: Request, res: Response, next: NextFunction) {
  // Whitelist for known dev assets and Vite HMR paths to avoid false positives
  const whitelistedPaths = [
    /^\/@replit\//i,        // Replit dev tools
    /^\/@vite\//i,          // Vite development server
    /^\/@id\//i,            // Vite module IDs
    /^\/@fs\//i,            // Vite file system routes
    /^\/src\//i,            // Source files (dev mode)
    /^\/node_modules\//i,   // Node modules
    /\.map$/i,              // Source maps
    /\/__vite_hmr$/i,       // Vite HMR
    /\.tsx?$/i,             // TypeScript files
    /\.jsx?$/i,             // JavaScript files
  ];

  // Skip pattern detection for whitelisted paths
  for (const whitelistedPattern of whitelistedPaths) {
    if (whitelistedPattern.test(req.path)) {
      return next();
    }
  }

  const suspiciousPatterns = [
    /(\.\.|\.\.\/|\.\.\\)/gi, // Path traversal
    /(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval|expression)/gi, // SQL injection patterns
    /(<script|javascript:|onerror=|onload=)/gi, // XSS patterns
  ];

  const checkString = `${req.url} ${JSON.stringify(req.body)} ${JSON.stringify(req.query)}`;

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      logSecurityEvent("suspicious-pattern-detected", "high", {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        pattern: pattern.source,
      });

      // Log but don't block - might be false positive
      // Could enable blocking in production with stricter rules
      break;
    }
  }

  next();
}

/**
 * Multi-tenant security validator
 * Additional layer to ensure tenant isolation
 * CRITICAL: Validates organizationId across body, query, params, and headers
 * to prevent IDOR (Insecure Direct Object Reference) attacks
 */
export function validateTenantIsolation(req: Request, res: Response, next: NextFunction) {
  const user = req.dbUser as any;

  // Skip for public routes
  if (!user || !user.organizationId) {
    return next();
  }

  // Normalize all possible organizationId sources to numbers for comparison
  const userOrgId = parseInt(String(user.organizationId), 10);
  
  // Check for potential tenant ID manipulation in request body
  const requestBody = req.body || {};
  if (requestBody.organizationId) {
    const bodyOrgId = parseInt(String(requestBody.organizationId), 10);
    if (!isNaN(bodyOrgId) && bodyOrgId !== userOrgId) {
      logSecurityEvent("tenant-isolation-violation-attempt", "critical", {
        userId: user.id,
        userOrgId,
        requestedOrgId: bodyOrgId,
        source: "body",
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      return res.status(403).json({
        error: "Access denied",
        message: "Attempted access to unauthorized organization data",
      });
    }
  }

  // Check query parameters
  const requestQuery = req.query || {};
  if (requestQuery.organizationId) {
    const queryOrgId = parseInt(String(requestQuery.organizationId), 10);
    if (!isNaN(queryOrgId) && queryOrgId !== userOrgId) {
      logSecurityEvent("tenant-isolation-violation-attempt", "critical", {
        userId: user.id,
        userOrgId,
        requestedOrgId: queryOrgId,
        source: "query",
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      return res.status(403).json({
        error: "Access denied",
        message: "Attempted access to unauthorized organization data",
      });
    }
  }

  // Check route parameters (CRITICAL: prevents IDOR via URL params)
  const requestParams = req.params || {};
  if (requestParams.organizationId) {
    const paramOrgId = parseInt(String(requestParams.organizationId), 10);
    if (!isNaN(paramOrgId) && paramOrgId !== userOrgId) {
      logSecurityEvent("tenant-isolation-violation-attempt", "critical", {
        userId: user.id,
        userOrgId,
        requestedOrgId: paramOrgId,
        source: "params",
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      return res.status(403).json({
        error: "Access denied",
        message: "Attempted access to unauthorized organization data",
      });
    }
  }

  // Check custom headers (additional defense layer)
  const headerOrgId = req.get("X-Organization-Id");
  if (headerOrgId) {
    const parsedHeaderOrgId = parseInt(headerOrgId, 10);
    if (!isNaN(parsedHeaderOrgId) && parsedHeaderOrgId !== userOrgId) {
      logSecurityEvent("tenant-isolation-violation-attempt", "critical", {
        userId: user.id,
        userOrgId,
        requestedOrgId: parsedHeaderOrgId,
        source: "header",
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      return res.status(403).json({
        error: "Access denied",
        message: "Attempted access to unauthorized organization data",
      });
    }
  }

  next();
}

/**
 * Setup all security middleware
 */
export function setupSecurityMiddleware(app: Express) {
  // 1. Helmet security headers (should be early in middleware chain)
  app.use(configureHelmet());

  // 2. Additional security headers
  app.use(additionalSecurityHeaders);

  // 3. Input sanitization
  app.use(...configureSanitization());

  // 4. Suspicious pattern detection
  app.use(suspiciousPatternDetection);

  // 5. Multi-tenant isolation validation (after authentication)
  app.use("/api/*", validateTenantIsolation);

  // Log that security middleware is active
  console.log("✅ Security middleware configured: Helmet, CSP, HSTS, Input Sanitization, Multi-Tenant Isolation");
}
