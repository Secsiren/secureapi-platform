import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import authRoutes from './modules/auth/auth.routes';
import { globalLimiter } from './middleware/rateLimiter';
import { ApiResponse } from './types';

const app = express();

// helmet() sets ~14 secure HTTP response headers in one call
// These protect against clickjacking, MIME sniffing, cross-site scripting, and more
// Always apply helmet before any routes so every response gets the headers
app.use(helmet());

app.use(cors({
  origin: config.isProduction ? process.env.ALLOWED_ORIGIN || '*' : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.disable('x-powered-by');

// Apply the global rate limiter to every route
// 100 requests per 15 minutes per IP
app.use(globalLimiter);

app.get('/health', (_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
    },
  };
  res.status(200).json(response);
});

app.use('/auth', authRoutes);

app.use((_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: 'Route not found',
  };
  res.status(404).json(response);
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err.message);
  const response: ApiResponse = {
    success: false,
    error: config.isProduction ? 'Internal server error' : err.message,
  };
  res.status(500).json(response);
});

app.listen(config.port, () => {
  console.log('========================================');
  console.log('  SecureAPI Platform');
  console.log('========================================');
  console.log(`  Environment : ${config.nodeEnv}`);
  console.log(`  Port        : ${config.port}`);
  console.log(`  Database    : ${config.db.host}:${config.db.port}/${config.db.name}`);
  console.log('========================================');
});

export default app;
