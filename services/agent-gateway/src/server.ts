/**
 * T071: Express Server with Security Middleware
 * Main server setup with helmet, cors, rate-limit per comment-1.md
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import healthRouter from './routes/health';
import aguiRouter from './routes/agui';

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
  origin: (origin, callback) => {
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
const limiter = rateLimit({
  windowMs: 1000, // 1 second window
  max: 10, // 10 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'rate_limit_exceeded',
      message: 'Too many requests. Maximum 10 requests per second.',
      retry_after: 1,
    });
  },
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'ERPNext Coagents - Agent Gateway',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      agui_stream: 'POST /agui',
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
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Agent Gateway running on http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
    console.log(`🤖 AG-UI endpoint: http://${HOST}:${PORT}/agui`);
    console.log(`🔒 CORS allowed origins: ${allowedOrigins.join(', ')}`);
    console.log(`⏱️  Rate limit: 10 req/sec per IP`);
  });
}

export default app;
