import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import { generateTokens, hashToken, getRefreshTokenExpiry, verifyToken } from '../../utils/jwt';
import {
  findUserByEmail,
  findUserById,
  createUser,
  emailExists,
  saveRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} from '../users/user.store';
import { ApiResponse, UserPublic, AuthTokens } from '../../types';

// BCRYPT_ROUNDS controls how slow the hashing is
// 12 means 2^12 = 4096 iterations — takes ~300ms on modern hardware
// Slow enough to make brute force impractical, fast enough not to hurt real users
const BCRYPT_ROUNDS = 12;

// register() handles POST /auth/register
// Creates a new account, hashes the password, saves the user, returns tokens
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check that express-validator found no errors in the request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse = {
        success: false,
        error: errors.array()[0].msg,
      };
      res.status(400).json(response);
      return;
    }

    const { email, password, first_name, last_name } = req.body;

    // Normalize email to lowercase — prevents duplicate accounts for same address
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is already registered
    const exists = await emailExists(normalizedEmail);
    if (exists) {
      const response: ApiResponse = {
        success: false,
        error: 'An account with this email already exists',
      };
      res.status(409).json(response);
      return;
    }

    // Hash the password — bcrypt.hash() is async and slow by design
    // The plain text password is never stored anywhere
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Insert the new user into the database
    const user = await createUser(normalizedEmail, passwordHash, first_name, last_name);

    // Generate access + refresh tokens for the new user
    const tokens = generateTokens(user.id, user.email);

    // Hash the refresh token and save it to the database
    const tokenHash = hashToken(tokens.refreshToken);
    const expiresAt = getRefreshTokenExpiry();
    await saveRefreshToken(user.id, tokenHash, expiresAt);

    const response: ApiResponse<{ user: UserPublic; tokens: AuthTokens }> = {
      success: true,
      data: { user, tokens },
    };

    // 201 Created — correct status code for a resource being created
    res.status(201).json(response);
  } catch (error) {
    console.error('Register error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Registration failed. Please try again.',
    };
    res.status(500).json(response);
  }
};

// login() handles POST /auth/login
// Verifies credentials and returns fresh tokens
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse = {
        success: false,
        error: errors.array()[0].msg,
      };
      res.status(400).json(response);
      return;
    }

    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Look up the user by email
    const user = await findUserByEmail(normalizedEmail);

    // SECURITY: We use the exact same error message whether the email doesn't exist
    // or the password is wrong. This prevents user enumeration attacks —
    // an attacker cannot use different error messages to discover valid emails
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid email or password',
      };
      res.status(401).json(response);
      return;
    }

    // bcrypt.compare() hashes the incoming password and compares it to the stored hash
    // Returns true if they match, false if not
    // Even if the password is wrong, this takes ~300ms — preventing timing attacks
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid email or password',
      };
      res.status(401).json(response);
      return;
    }

    // Password is correct — generate fresh tokens
    const tokens = generateTokens(user.id, user.email);

    // Save the new refresh token
    const tokenHash = hashToken(tokens.refreshToken);
    const expiresAt = getRefreshTokenExpiry();
    await saveRefreshToken(user.id, tokenHash, expiresAt);

    // Build the public user object — never send password_hash to the client
    const userPublic: UserPublic = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      is_verified: user.is_verified,
      created_at: user.created_at,
    };

    const response: ApiResponse<{ user: UserPublic; tokens: AuthTokens }> = {
      success: true,
      data: { user: userPublic, tokens },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Login error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Login failed. Please try again.',
    };
    res.status(500).json(response);
  }
};

// getMe() handles GET /auth/me
// Returns the currently logged in user's profile
// Protected by authGuard middleware — req.user is guaranteed to exist here
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    // req.user was set by authGuard middleware after verifying the JWT
    const userId = req.user!.userId;

    const user = await findUserById(userId);

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<{ user: UserPublic }> = {
      success: true,
      data: { user },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('GetMe error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve user profile.',
    };
    res.status(500).json(response);
  }
};

// refresh() handles POST /auth/refresh
// Takes a refresh token, validates it, returns a new access token
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const response: ApiResponse = {
        success: false,
        error: 'Refresh token required',
      };
      res.status(400).json(response);
      return;
    }

    // Verify the token signature and expiry
    let payload;
    try {
      payload = verifyToken(refreshToken);
    } catch {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid or expired refresh token',
      };
      res.status(401).json(response);
      return;
    }

    // Make sure this is actually a refresh token
    if (payload.type !== 'refresh') {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid token type',
      };
      res.status(401).json(response);
      return;
    }

    // Check the token exists in the database and has not been revoked
    const tokenHash = hashToken(refreshToken);
    const storedToken = await findRefreshToken(tokenHash);

    if (!storedToken) {
      const response: ApiResponse = {
        success: false,
        error: 'Refresh token not found or revoked',
      };
      res.status(401).json(response);
      return;
    }

    // Rotate the refresh token — revoke the old one, issue a new one
    // Token rotation means a refresh token can only be used once
    // If an attacker steals a refresh token and uses it, the real user's next
    // request will fail and they will know their token was stolen
    await revokeRefreshToken(tokenHash);

    const newTokens = generateTokens(payload.userId, payload.email);
    const newTokenHash = hashToken(newTokens.refreshToken);
    const expiresAt = getRefreshTokenExpiry();
    await saveRefreshToken(storedToken.user_id, newTokenHash, expiresAt);

    const response: ApiResponse<{ tokens: AuthTokens }> = {
      success: true,
      data: { tokens: newTokens },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Refresh error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Token refresh failed.',
    };
    res.status(500).json(response);
  }
};

// logout() handles POST /auth/logout
// Revokes the refresh token so it cannot be used again
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await revokeRefreshToken(tokenHash);
    }

    const response: ApiResponse = {
      success: true,
      data: { message: 'Logged out successfully' },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Logout error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Logout failed.',
    };
    res.status(500).json(response);
  }
};

// logoutAll() handles POST /auth/logout-all
// Revokes ALL refresh tokens for this user — logs out every device at once
// Protected by authGuard — requires a valid access token
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    await revokeAllUserRefreshTokens(userId);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Logged out from all devices successfully' },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('LogoutAll error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Logout failed.',
    };
    res.status(500).json(response);
  }
};
