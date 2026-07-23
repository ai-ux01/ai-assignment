/**
 * Global Error Handling Middleware
 * Express middleware for handling all errors in the application
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorHandler } from '../utils/errorHandler';

/**
 * Extend Express Request to include requestId
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Global error handling middleware
 * Must be registered after all routes in Express app
 *
 * @param error - Error thrown or passed to next()
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Get or generate request ID for tracing
  const requestId = req.requestId || 'unknown';

  // Log error details for troubleshooting
  const logEntry = ErrorHandler.formatErrorForLogging(error, requestId);

  // Log based on error type
  if (ErrorHandler.isOperationalError(error)) {
    // Expected errors (validation, not found, etc.) - log as info/warn
    console.warn('Operational error:', logEntry);
  } else {
    // Unexpected errors (bugs, system failures) - log as error
    console.error('System error:', logEntry);
  }

  // Map error to standardized response
  const errorResponse = ErrorHandler.mapErrorToResponse(error, requestId);

  // Determine HTTP status code
  const statusCode = ErrorHandler.getStatusCode(error);

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler middleware
 * Handles requests to undefined routes
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export function notFoundMiddleware(req: Request, res: Response): void {
  const requestId = req.requestId || 'unknown';

  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch promise rejections
 *
 * @param fn - Async route handler function
 * @returns Wrapped route handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
