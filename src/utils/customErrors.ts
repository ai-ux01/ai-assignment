/**
 * Custom Error Classes
 * Defines specific error types for different failure scenarios
 */

import { ErrorCode, ValidationError as ValidationErrorDetail } from '../models/errors';

/**
 * Base class for all application errors
 */
export abstract class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, code: ErrorCode, statusCode: number, isOperational = true) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * ValidationError - thrown when input validation fails
 * Maps to HTTP 400 Bad Request
 */
export class ValidationError extends AppError {
  public readonly details?: ValidationErrorDetail[];

  constructor(message: string, details?: ValidationErrorDetail[]) {
    super(message, ErrorCode.INVALID_INPUT, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * NotFoundError - thrown when a requested resource does not exist
 * Maps to HTTP 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.TICKET_NOT_FOUND) {
    super(message, code, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * StateTransitionError - thrown when an invalid state transition is attempted
 * Maps to HTTP 422 Unprocessable Entity
 */
export class StateTransitionError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.INVALID_TRANSITION) {
    super(message, code, 422);
    this.name = 'StateTransitionError';
  }
}

/**
 * DatabaseError - thrown when database operations fail
 * Maps to HTTP 500 Internal Server Error or 503 Service Unavailable
 */
export class DatabaseError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.DATABASE_ERROR, statusCode = 500) {
    super(message, code, statusCode);
    this.name = 'DatabaseError';
  }
}

/**
 * BusinessRuleError - thrown when business rules are violated
 * Maps to HTTP 422 Unprocessable Entity
 */
export class BusinessRuleError extends AppError {
  constructor(message: string, code: ErrorCode) {
    super(message, code, 422);
    this.name = 'BusinessRuleError';
  }
}

/**
 * ForbiddenError - thrown when an operation is not allowed
 * Maps to HTTP 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.CANNOT_MODIFY_TERMINAL) {
    super(message, code, 403);
    this.name = 'ForbiddenError';
  }
}
