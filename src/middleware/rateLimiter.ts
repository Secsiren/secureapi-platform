import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiResponse } from '../types';

// A handler that runs when the rate limit is exceeded
// We return our standard ApiResponse shape instead of express-rate-limit's default
const rateLimitHandler = (_req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    error: 'Too many requests. Please try again later.',
  };
  res.status(429).json(response);
};

// globalLimiter — applied to every route on the API
// 100 requests per 15 minutes per IP is generous for legitimate use
// but stops basic scraping and abuse
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,   // Sends RateLimit-* headers so clients know their limit
  legacyHeaders: false,    // Disables the old X-RateLimit-* headers
  handler: rateLimitHandler,
});

// authLimiter — applied only to /auth/register and /auth/login
// Much stricter: 10 attempts per 15 minutes per IP
// This is your main defence against credential stuffing and brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// refreshLimiter — applied to /auth/refresh
// Slightly relaxed vs authLimiter — legitimate apps refresh tokens frequently
// But still capped to stop token farming
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
