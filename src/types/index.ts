// Central type definitions for the entire application
// Every module imports from here — types are never defined twice

// The shape of a user row coming back from the database
export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

// What gets embedded inside a JWT token
// We never put the password hash or sensitive fields in a token
export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

// The pair of tokens returned after login or register
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// The body expected when registering a new user
export interface RegisterInput {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

// The body expected when logging in
export interface LoginInput {
  email: string;
  password: string;
}

// The standard shape of every API response this server sends
// success: true means the operation worked, false means it failed
// data: the actual payload when successful
// error: human-readable message when failed
// meta: optional extra info like pagination
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

// What we return to the client about a user
// Never includes password_hash — that stays on the server
export interface UserPublic {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: Date;
}

// Extends Express's Request type so TypeScript knows about req.user
// After the auth middleware runs, req.user is available on protected routes
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
