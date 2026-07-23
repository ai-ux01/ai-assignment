/**
 * Main application entry point
 * Support Ticket Management System API
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestIdMiddleware, requestLoggerMiddleware } from './middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/errorMiddleware';
import logger from './utils/logger';
import { database } from './repositories/database';
import {
  healthCheckHandler,
  livenessProbeHandler,
  readinessProbeHandler,
} from './api/healthCheck';
import ticketRoutes from './api/ticketRoutes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Request ID middleware (must be first to ensure all logs have request IDs)
app.use(requestIdMiddleware);

// Request logging middleware (logs all incoming requests)
app.use(requestLoggerMiddleware);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
app.get('/health', healthCheckHandler);
app.get('/health/live', livenessProbeHandler);
app.get('/health/ready', readinessProbeHandler);

// API routes
app.use('/api/v1/tickets', ticketRoutes);

// 404 handler for undefined routes
app.use(notFoundMiddleware);

// Global error handler (must be last)
app.use(errorMiddleware);

/**
 * Initialize database connection and start server
 */
async function startServer() {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await database.connect();
    logger.info('Database connected successfully');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info('Server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string) {
  logger.info('Shutting down gracefully', { signal });

  try {
    // Close database connections
    await database.disconnect();
    logger.info('Database disconnected');

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

// Start the server
startServer();

export default app;
