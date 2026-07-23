/**
 * Middleware exports
 * Central export point for all middleware modules
 */

// Authentication middleware
export {
  authenticateRequest,
  addRequestId,
  AuthenticatedRequest,
  AuthenticationError,
} from './auth.middleware';

// Request ID middleware
export { requestIdMiddleware } from './requestIdMiddleware';

// Request logging middleware
export { requestLoggerMiddleware } from './requestLogger';

// Error handling middleware
export { errorMiddleware, notFoundMiddleware, asyncHandler } from './errorMiddleware';
