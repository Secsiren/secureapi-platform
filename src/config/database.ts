import { Pool } from 'pg';
import { config } from './env';

// A pool maintains multiple open connections to the database
// When a request comes in, it borrows a connection, uses it, then returns it
// Much faster than opening a new connection on every request
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  // Maximum number of connections in the pool
  max: 20,
  // How long to wait for a connection before throwing an error (30 seconds)
  connectionTimeoutMillis: 30000,
  // How long a connection can sit idle before being closed (10 minutes)
  idleTimeoutMillis: 600000,
});

// Test the connection when the app starts
// If the database is unreachable, we know immediately
pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(1);
});

// query() is a helper that borrows a connection from the pool,
// runs your SQL, returns the result, then returns the connection to the pool
// The <T> generic means results are typed — TypeScript knows what rows look like
export const query = async <T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  // Log slow queries in development so you can catch performance problems early
  if (config.isDevelopment && duration > 100) {
    console.warn(`Slow query detected (${duration}ms):`, text);
  }

  return result.rows as T[];
};

// getClient() is used when you need a transaction
// A transaction groups multiple queries — if any one fails, all are rolled back
// Example: deducting from one account and adding to another must both succeed or both fail
export const getClient = () => pool.connect();

export default pool;
