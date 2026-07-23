import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Middleware to log all incoming HTTP requests and responses
 * Captures request details and response time
 */
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  });

  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(logLevel, 'Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};
