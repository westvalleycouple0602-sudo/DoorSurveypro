import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request, Response } from "express";
import { logSecurityEvent } from "../logger";

/**
 * Enhanced rate limiting with detailed configurations
 * Implements tiered protection against DDoS and brute force attacks
 */

/**
 * Get client identifier (IP or user ID if authenticated)
 * Uses the library's ipKeyGenerator helper to properly handle IPv6 addresses
 * and prevent rate limit bypass by IPv6 rotation
 */
function getClientId(req: Request): string {
  const user = req.dbUser as any;
  if (user?.id) {
    return user.id;
  }
  // Use the library's ipKeyGenerator which properly handles IPv6 subnet normalization
  // Default /56 subnet is used for IPv6 to prevent bypass while still allowing reasonable limits
  return ipKeyGenerator(req.ip || "unknown");
}

/**
 * Log rate limit violations
 */
function logRateLimitHit(req: Request, rateLimitType: string) {
  const user = req.dbUser as any;
  logSecurityEvent("rate-limit-exceeded", "medium", {
    rateLimitType,
    userId: user?.id,
    organizationId: user?.organizationId,
    ip: req.ip,
    path: req.path,
    method: req.method,
    userAgent: req.get("user-agent"),
  });
}

/**
 * Aggressive rate limiting for authentication endpoints
 * Protects against brute force attacks
 */
export const authenticationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: "Too many authentication attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  handler: (req, res) => {
    logRateLimitHit(req, "authentication");
    res.status(429).json({
      error: "Too many requests",
      message: "Too many authentication attempts. Please try again in 15 minutes.",
      retryAfter: 15 * 60, // seconds
    });
  },
});

/**
 * Strict rate limiting for password reset endpoints
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  message: "Too many password reset requests",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  handler: (req, res) => {
    logRateLimitHit(req, "password-reset");
    res.status(429).json({
      error: "Too many requests",
      message: "Too many password reset requests. Please try again in 1 hour.",
      retryAfter: 60 * 60,
    });
  },
});

/**
 * Moderate rate limiting for general API endpoints
 */
export const apiGeneralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes
  message: "Too many requests from this IP",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  skip: (req) => {
    // Skip for authenticated users with master accounts
    const user = req.dbUser as any;
    return user?.isMasterAccount === "yes";
  },
  handler: (req, res) => {
    logRateLimitHit(req, "api-general");
    res.status(429).json({
      error: "Too many requests",
      message: "Rate limit exceeded. Please slow down your requests.",
      retryAfter: 15 * 60,
    });
  },
});

/**
 * File upload rate limiting
 */
export const fileUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 uploads per hour
  message: "Too many file uploads",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  handler: (req, res) => {
    logRateLimitHit(req, "file-upload");
    res.status(429).json({
      error: "Too many requests",
      message: "File upload limit exceeded. Please wait before uploading more files.",
      retryAfter: 60 * 60,
    });
  },
});

/**
 * AI/Heavy computation rate limiting
 */
export const aiAnalysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 AI requests per hour
  message: "Too many AI analysis requests",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  handler: (req, res) => {
    logRateLimitHit(req, "ai-analysis");
    res.status(429).json({
      error: "Too many requests",
      message: "AI analysis limit exceeded. Please wait before making more requests.",
      retryAfter: 60 * 60,
    });
  },
});

/**
 * Webhook rate limiting (for external services)
 */
export const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 webhook calls per 15 minutes
  message: "Webhook rate limit exceeded",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  handler: (req, res) => {
    logRateLimitHit(req, "webhook");
    res.status(429).json({
      error: "Too many requests",
      message: "Webhook rate limit exceeded.",
      retryAfter: 15 * 60,
    });
  },
});

/**
 * Email sending rate limiting
 */
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 emails per hour
  message: "Too many emails sent",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  handler: (req, res) => {
    logRateLimitHit(req, "email");
    res.status(429).json({
      error: "Too many requests",
      message: "Email sending limit exceeded. Please wait before sending more emails.",
      retryAfter: 60 * 60,
    });
  },
});

/**
 * Quote request rate limiting
 */
export const quoteRequestLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50, // 50 quote requests per day
  message: "Too many quote requests",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  handler: (req, res) => {
    logRateLimitHit(req, "quote-request");
    res.status(429).json({
      error: "Too many requests",
      message: "Quote request limit exceeded. Please contact support if you need to send more quotes.",
      retryAfter: 24 * 60 * 60,
    });
  },
});

/**
 * Export statement rate limiting (for printing/PDF generation)
 */
export const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 exports per 15 minutes
  message: "Too many export requests",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  handler: (req, res) => {
    logRateLimitHit(req, "export");
    res.status(429).json({
      error: "Too many requests",
      message: "Export limit exceeded. Please wait before generating more reports.",
      retryAfter: 15 * 60,
    });
  },
});

/**
 * Lead creation rate limiting (for marketing funnel)
 */
export const leadCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 leads per hour per IP
  message: "Too many lead submissions",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  handler: (req, res) => {
    logRateLimitHit(req, "lead-creation");
    res.status(429).json({
      error: "Too many requests",
      message: "Lead submission limit exceeded. Please try again later.",
      retryAfter: 60 * 60,
    });
  },
});

/**
 * Error reporting rate limiting (to prevent log flooding)
 */
export const errorReportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 error reports per 5 minutes
  message: "Too many error reports",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  handler: (req, res) => {
    logRateLimitHit(req, "error-report");
    res.status(429).json({
      error: "Too many requests",
      message: "Error reporting limit exceeded.",
      retryAfter: 5 * 60,
    });
  },
});
