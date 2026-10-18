import type { Response } from "express";
import { ZodError } from "zod";
import { DualScanConflictError } from "../dual-scan-storage";

/**
 * Centralized error handler for validation and general errors
 * Returns 400 for validation errors, 500 for server errors
 * 
 * @param error - The error to handle
 * @param res - Express response object
 * @param logger - Optional logger function for dependency injection (maintains audit context)
 */
export function handleValidationError(
  error: unknown, 
  res: Response,
  logger?: (error: Error, context?: any) => void
): Response {
  if (error instanceof DualScanConflictError) {
    return res.status(409).json({ error: error.message });
  }
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Validation error",
      details: error.errors,
    });
  }
  
  if (logger) {
    logger(error instanceof Error ? error : new Error(String(error)), { context: 'validation-error' });
  }
  
  return res.status(500).json({ error: "Internal server error" });
}
