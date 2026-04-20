import dotenv from 'dotenv';

// Load .env file into process.env
dotenv.config();

// Helper function — reads a variable and crashes if it's missing
// This is called "fail fast" — better to crash at startup than silently misbehave
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Helper for optional variables with a default fallback
function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config = {
  // App
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  port: parseInt(optionalEnv('PORT', '3000'), 10),

  // Database — all required, app cannot run without these
  db: {
    host: requireEnv('DB_HOST'),
    port: parseInt(optionalEnv('DB_PORT', '5432'), 10),
    name: requireEnv('DB_NAME'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
  },

  // JWT — required, app cannot run without these
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: optionalEnv('JWT_EXPIRES_IN', '15m'),
    refreshExpiresIn: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  // Convenience flag used throughout the app
  isDevelopment: optionalEnv('NODE_ENV', 'development') === 'development',
  isProduction: optionalEnv('NODE_ENV', 'development') === 'production',
};
