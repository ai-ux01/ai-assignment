/**
 * Request ID Middleware
 * Generates unique request IDs for tracking and tracing
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to generate and attach unique request ID to each request
 * The request ID is used for error tracking and audit logging
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check if request ID is provided in header (for distributed tracing)
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  // Attach request ID to request object
  req.requestId = requestId;

  // Also add to response headers for client tracing
  res.setHeader('X-Request-Id', requestId);

  next();
}
