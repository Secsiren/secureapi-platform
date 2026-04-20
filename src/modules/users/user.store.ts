import { query } from '../../config/database';
import { User, UserPublic } from '../../types';

// findUserByEmail() is used during login to look up a user by their email
// Returns the full User including password_hash so we can verify the password
// Returns null if no user with that email exists
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const rows = await query<User>(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email]
  );
  return rows[0] || null;
};

// findUserById() is used by the auth middleware protected routes
// Returns the public-safe user object — no password_hash
// Returns null if no user with that ID exists
export const findUserById = async (id: string): Promise<UserPublic | null> => {
  const rows = await query<UserPublic>(
    `SELECT id, email, first_name, last_name, is_active, is_verified, created_at
     FROM users
     WHERE id = $1 AND is_active = true`,
    [id]
  );
  return rows[0] || null;
};

// createUser() inserts a new user row into the database
// We never insert the plain password — only the hash produced by bcrypt
// Returns the newly created user's public fields
export const createUser = async (
  email: string,
  passwordHash: string,
  firstName?: string,
  lastName?: string
): Promise<UserPublic> => {
  const rows = await query<UserPublic>(
    `INSERT INTO users (email, password_hash, first_name, last_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, first_name, last_name, is_active, is_verified, created_at`,
    [email, passwordHash, firstName || null, lastName || null]
  );
  return rows[0];
};

// emailExists() checks if an email is already registered
// Used during registration to return a clear error before trying to insert a duplicate
export const emailExists = async (email: string): Promise<boolean> => {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM users WHERE email = $1',
    [email]
  );
  return parseInt(rows[0].count, 10) > 0;
};

// saveRefreshToken() stores the hashed refresh token in the database
// We store the hash, not the raw token — same principle as storing password hashes
export const saveRefreshToken = async (
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<void> => {
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
};

// findRefreshToken() looks up a refresh token hash in the database
// Returns the token row if found, valid, and not revoked or expired
export const findRefreshToken = async (
  tokenHash: string
): Promise<{ id: string; user_id: string } | null> => {
  const rows = await query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM refresh_tokens
     WHERE token_hash = $1
     AND revoked_at IS NULL
     AND expires_at > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
};

// revokeRefreshToken() marks a refresh token as revoked
// Sets revoked_at to NOW() — the token stays in the database for audit purposes
// but will never pass the findRefreshToken() check again
export const revokeRefreshToken = async (tokenHash: string): Promise<void> => {
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
    [tokenHash]
  );
};

// revokeAllUserRefreshTokens() revokes every token for a user at once
// Used when a user changes their password or requests a logout from all devices
export const revokeAllUserRefreshTokens = async (userId: string): Promise<void> => {
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
};
