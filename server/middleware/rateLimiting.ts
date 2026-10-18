import rateLimit from "express-rate-limit";
import { logger } from "../logger";

export const errorReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many error reports from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

export const leadCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many lead submissions from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

export const quoteRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many quote requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.dbUser,
});

export const fileUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many file uploads, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.dbUser,
});

export const aiAnalysisLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 100,
  message: "Daily AI analysis limit reached, please try again tomorrow",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.dbUser,
});

export const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: { error: "Too many webhook requests" },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Webhook rate limit exceeded', {
      ip: req.ip,
      path: req.originalUrl,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({ error: "Too many webhook requests" });
  }
});
