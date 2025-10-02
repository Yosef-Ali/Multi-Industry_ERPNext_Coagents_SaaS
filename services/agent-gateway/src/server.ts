/**
 * T071: Express Server with Security Middleware
 * Main server setup with helmet, cors, rate-limit per comment-1.md
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

// Import and validate environment
import { validateEnvironment, logConfiguration } from './config/environment';

// Validate environment before proceeding
validateEnvironment();

// Import routes
import healthRouter from './routes/health';
import aguiRouter from './routes/agui';
import monitoringRouter from './routes/monitoring';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { correlationMiddleware } from './middleware/correlation';

const app: Application = express();
const PORT = process.env.GATEWAY_PORT || 3000;
const HOST = process.env.GATEWAY_HOST || '0.0.0.0';

// ============================================================================
// Security Middleware (comment-1.md requirement)
// ============================================================================

// Helmet: Secure HTTP headers
app.use(helmet());

// CORS: Allowlist-based origin validation
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173', // Frontend dev
  'http://localhost:8080', // ERPNext
];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
}));

// Body parsing with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting: 10 requests per second per IP (comment-1.md requirement)
// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 60, // Max 60 requests per minute (1 req/sec)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(60000 / 1000)
    });
  }
});

app.use(limiter);

// ============================================================================
// Custom Middleware
// ============================================================================

// Correlation ID middleware (for observability)
app.use(correlationMiddleware);

// ============================================================================
// Routes
// ============================================================================

app.use('/health', healthRouter);
app.use('/agui', aguiRouter);
app.use('/monitoring', monitoringRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'ERPNext Coagents - Agent Gateway',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      agui_stream: 'POST /agui',
      monitoring: 'GET /monitoring',
      monitoring_costs: 'GET /monitoring/costs',
      monitoring_circuit_breaker: 'GET /monitoring/circuit-breaker'
    },
  });
});

// ============================================================================
// Error Handling (must be last)
// ============================================================================

app.use(errorHandler);

// ============================================================================
// Server Start
// ============================================================================

if (require.main === module) {
  // Log configuration (with secrets masked)
  logConfiguration();

  const port = parseInt(PORT.toString(), 10);
  app.listen(port, HOST, () => {
    console.log(`🚀 Agent Gateway running on http://${HOST}:${port}`);
    console.log(`📊 Health check: http://${HOST}:${port}/health`);
    console.log(`🤖 AG-UI endpoint: http://${HOST}:${port}/agui`);
    console.log(`🔒 CORS allowed origins: ${allowedOrigins.join(', ')}`);
    console.log(`⏱️  Rate limit: 10 req/sec per IP`);
  });
}

export default app;
