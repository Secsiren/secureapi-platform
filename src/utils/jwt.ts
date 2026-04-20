import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';
import { JwtPayload, AuthTokens } from '../types';

// generateTokens() creates both tokens at once after a successful login or register
// accessToken — short lived (15min), sent with every API request in the Authorization header
// refreshToken — long lived (7 days), used only to get a new accessToken when it expires
export const generateTokens = (userId: string, email: string): AuthTokens => {
  const accessPayload: JwtPayload = { userId, email, type: 'access' };
  const refreshPayload: JwtPayload = { userId, email, type: 'refresh' };

  const accessToken = jwt.sign(
    accessPayload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    refreshPayload,
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
};

// verifyToken() checks that a token was signed by us and has not expired
// Returns the payload (userId, email, type) if valid
// Throws an error if the token is invalid, expired, or tampered with
export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, config.jwt.secret);
  return decoded as JwtPayload;
};

// hashToken() creates a SHA-256 hash of the refresh token before storing it in the database
// We never store the raw refresh token — only its hash
// This way if the database is breached, the attacker cannot use the tokens
// Same principle as hashing passwords — store the hash, compare the hash
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// getRefreshTokenExpiry() calculates the exact timestamp when a refresh token expires
// We store this in the database so we can reject expired tokens without decoding them
export const getRefreshTokenExpiry = (): Date => {
  // JWT_REFRESH_EXPIRES_IN is '7d' — we parse the number and unit separately
  const expiresIn = config.jwt.refreshExpiresIn;
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  const expiry = new Date();

  if (unit === 'd') expiry.setDate(expiry.getDate() + value);
  else if (unit === 'h') expiry.setHours(expiry.getHours() + value);
  else if (unit === 'm') expiry.setMinutes(expiry.getMinutes() + value);

  return expiry;
};
