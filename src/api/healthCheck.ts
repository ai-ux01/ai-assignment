/**
 * Health Check API Endpoint
 *
 * Provides database health status and system monitoring
 *
 * Requirements:
 * - Non-Functional Reliability 3: Monitor database connection health
 */

import { Request, Response } from 'express';
import { database } from '../repositories/database';
import logger from '../utils/logger';

/**
 * Health check endpoint handler
 *
 * GET /health
 *
 * Returns system health status including database connectivity
 */
export async function healthCheckHandler(_req: Request, res: Response): Promise<void> {
  try {
    const dbHealth = await database.healthCheck();
    const poolStats = database.getPoolStats();

    const health = {
      status: dbHealth.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        ...dbHealth,
        pool: poolStats,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
    };

    const statusCode = dbHealth.healthy ? 200 : 503;
    res.status(statusCode).json(health);

    if (!dbHealth.healthy) {
      logger.warn('Health check failed', { health });
    }
  } catch (error) {
    logger.error('Health check endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
}

/**
 * Liveness probe endpoint handler
 *
 * GET /health/live
 *
 * Returns simple 200 OK if service is running
 */
export function livenessProbeHandler(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Readiness probe endpoint handler
 *
 * GET /health/ready
 *
 * Returns 200 OK if service is ready to accept traffic (database connected)
 */
export async function readinessProbeHandler(_req: Request, res: Response): Promise<void> {
  try {
    const isHealthy = database.isHealthy();

    if (isHealthy) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not connected',
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
    });
  }
}
