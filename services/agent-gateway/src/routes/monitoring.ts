import { Router } from 'express';
import {
    globalCostTracker,
    globalCircuitBreaker
} from '../utils/openrouter-error-handler.js';
import { validateModel, DEFAULT_MODEL } from '../config/environment.js';

const router = Router();
type CircuitMetrics = ReturnType<typeof globalCircuitBreaker.getMetrics>;

router.get('/', (_req, res) => {
    const costs = globalCostTracker.getStats();
    const circuit = globalCircuitBreaker.getMetrics();

    res.json({
        success: true,
        timestamp: Date.now(),
        data: {
            costs,
            circuitBreaker: formatCircuitMetrics(circuit)
        }
    });
});

router.get('/costs', (_req, res) => {
    const stats = globalCostTracker.getStats();

    res.json({
        success: true,
        timestamp: Date.now(),
        data: stats
    });
});

router.get('/circuit-breaker', (_req, res) => {
    const metrics = globalCircuitBreaker.getMetrics();

    res.json({
        success: true,
        timestamp: Date.now(),
        data: formatCircuitMetrics(metrics)
    });
});

router.get('/openrouter', (_req, res) => {
    const model = validateModel(process.env.OPENROUTER_MODEL || DEFAULT_MODEL);
    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

    res.json({
        success: true,
        timestamp: Date.now(),
        data: {
            model,
            baseUrl
        }
    });
});

function formatCircuitMetrics(metrics: CircuitMetrics) {
    const nextAttemptISO = metrics.nextAttempt ? new Date(metrics.nextAttempt).toISOString() : null;

    return {
        state: metrics.state,
        failureCount: metrics.failureCount,
        successCount: metrics.successCount,
        nextAttempt: metrics.nextAttempt,
        nextAttemptISO,
        config: metrics.config
    };
}

export default router;
