import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiResponse } from '../types';

// authGuard is a middleware function
// Middleware sits between the incoming request and your route handler
// It runs first — if it calls next(), the request continues to the route handler
// If it calls res.json(), the request stops here and never reaches the route handler
export const authGuard = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // The Authorization header looks like: "Bearer eyJhbGciOiJIUzI1NiJ9..."
    // We split on the space and take the second part — the actual token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse = {
        success: false,
        error: 'Authorization header missing or malformed',
      };
      res.status(401).json(response);
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'Token not provided',
      };
      res.status(401).json(response);
      return;
    }

    // verifyToken() will throw if the token is expired, tampered with, or invalid
    const payload = verifyToken(token);

    // Make sure this is an access token — not a refresh token being used as access
    // This prevents a class of token confusion attacks
    if (payload.type !== 'access') {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid token type',
      };
      res.status(401).json(response);
      return;
    }

    // Attach the decoded payload to req.user
    // Every route handler after this middleware can read req.user.userId and req.user.email
    req.user = payload;

    // Call next() to pass control to the actual route handler
    next();
  } catch (error) {
    // verifyToken() threw — token is expired, invalid signature, or malformed
    // We return the same generic message for all cases
    // Never tell the client WHY the token failed — that helps attackers
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or expired token',
    };
    res.status(401).json(response);
  }
};
