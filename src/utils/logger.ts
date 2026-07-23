import winston from 'winston';
import path from 'path';

/**
 * Log levels used in the application
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Structured log entry format
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Configure Winston logger with structured logging format
 */
const createLogger = () => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // Console format for development (human-readable)
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, requestId, userId, ...meta }) => {
      let log = `${timestamp} [${level}]: ${message}`;
      if (requestId) log += ` | requestId: ${requestId}`;
      if (userId) log += ` | userId: ${userId}`;
      if (Object.keys(meta).length > 0) {
        log += ` | ${JSON.stringify(meta)}`;
      }
      return log;
    })
  );

  // Create transports based on environment
  const transports: winston.transport[] = [];

  // Console transport (always enabled)
  transports.push(
    new winston.transports.Console({
      format: isProduction ? logFormat : consoleFormat,
      level: logLevel,
    })
  );

  // File transports for production or when LOG_FILE_PATH is set
  if (isProduction || process.env.LOG_FILE_PATH) {
    const logDir = process.env.LOG_FILE_PATH ? path.dirname(process.env.LOG_FILE_PATH) : './logs';
    const logFileName = process.env.LOG_FILE_PATH
      ? path.basename(process.env.LOG_FILE_PATH)
      : 'app.log';

    // Combined logs (all levels)
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, logFileName),
        format: logFormat,
        level: logLevel,
        maxsize: parseMaxFileSize(process.env.LOG_MAX_FILE_SIZE || '10m'),
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10),
      })
    );

    // Error logs (only errors)
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        format: logFormat,
        level: 'error',
        maxsize: parseMaxFileSize(process.env.LOG_MAX_FILE_SIZE || '10m'),
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10),
      })
    );
  }

  return winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports,
    exitOnError: false,
  });
};

/**
 * Parse max file size from string (e.g., "10m" -> 10485760)
 */
function parseMaxFileSize(size: string): number {
  const match = size.match(/^(\d+)([kmg])?$/i);
  if (!match || !match[1]) return 10 * 1024 * 1024; // Default 10MB

  const value = parseInt(match[1], 10);
  const unit = match[2]?.toLowerCase();

  switch (unit) {
    case 'k':
      return value * 1024;
    case 'm':
      return value * 1024 * 1024;
    case 'g':
      return value * 1024 * 1024 * 1024;
    default:
      return value;
  }
}

// Create singleton logger instance
const logger = createLogger();

export default logger;
