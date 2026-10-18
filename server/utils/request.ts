import type { Request } from "express";

export function getRequestPath(req: Request): string {
  return req.originalUrl.split('?')[0];
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}
