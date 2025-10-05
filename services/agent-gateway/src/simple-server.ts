/**
 * Simplified Agent Gateway Server
 * Works without complex dependencies while we debug the full version
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.GATEWAY_PORT || '3000', 10);

// ============================================================================
// Middleware
// ============================================================================

app.use(helmet());
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:8080'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'erpnext-coagent-gateway',
        version: '1.0.0-simplified',
        environment: process.env.NODE_ENV || 'development',
    });
});

// AG-UI endpoint (simplified)
app.post('/agui', async (req: Request, res: Response) => {
    console.log('[AG-UI] Request received:', req.body);

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connection message
    const sendEvent = (type: string, data: any) => {
        const event = {
            type,
            timestamp: new Date().toISOString(),
            data,
        };
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // Send connected status
    sendEvent('status', {
        status: 'connected',
        message: 'Agent gateway connected (simplified mode)'
    });

    // Send a welcome message
    setTimeout(() => {
        sendEvent('message', {
            content: '👋 Hello! I\'m the ERPNext Coagent assistant. The full backend is being debugged, but I\'m here in simplified mode. How can I help you today?',
            role: 'assistant',
        });
    }, 500);

    // Handle client disconnect
    req.on('close', () => {
        console.log('[AG-UI] Client disconnected');
        res.end();
    });

    // Keep connection alive
    const keepAlive = setInterval(() => {
        res.write(':\n\n'); // SSE comment keeps connection alive
    }, 15000);

    req.on('close', () => {
        clearInterval(keepAlive);
    });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
    res.json({
        service: 'ERPNext Coagents - Agent Gateway (Simplified)',
        version: '1.0.0-simplified',
        status: 'running',
        note: 'This is a simplified version while debugging the full backend',
        endpoints: {
            health: 'GET /health',
            agui: 'POST /agui (SSE streaming)',
        },
    });
});

// Error handling
app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'internal_error',
        message: 'An error occurred',
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// Server Start
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Simplified Agent Gateway running');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`🤖 AG-UI: http://localhost:${PORT}/agui`);
    console.log('');
    console.log('⚠️  Note: This is a simplified version');
    console.log('   Full backend with Anthropic AI and tools is being debugged');
    console.log('');
});
