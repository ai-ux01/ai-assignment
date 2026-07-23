/**
 * ErrorHandler Class
 * Handles error mapping, logging, and response formatting
 */

import { ErrorResponse, ErrorCode, HttpStatusCode } from '../models/errors';
import { AppError, ValidationError } from './customErrors';
import { v4 as uuidv4 } from 'uuid';

/**
 * ErrorHandler class for centralized error processing
 */
export class ErrorHandler {
  /**
   * Maps an error to a standardized ErrorResponse
   * @param error - The error to map
   * @param requestId - Optional request ID for tracing
   * @returns ErrorResponse object
   */
  public static mapErrorToResponse(error: Error, requestId?: string): ErrorResponse {
    const reqId = requestId || uuidv4();
    const timestamp = new Date().toISOString();

    // Handle known application errors
    if (error instanceof AppError) {
      return this.mapAppError(error, reqId, timestamp);
    }

    // Handle unknown errors (fallback to internal server error)
    return this.mapUnknownError(error, reqId, timestamp);
  }

  /**
   * Maps AppError instances to ErrorResponse
   */
  private static mapAppError(error: AppError, requestId: string, timestamp: string): ErrorResponse {
    const response: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        timestamp,
        requestId,
      },
    };

    // Add validation details if available
    if (error instanceof ValidationError && error.details) {
      response.error.details = error.details;
    }

    return response;
  }

  /**
   * Maps unknown errors to a generic internal error response
   * Sanitizes error messages to prevent information leakage
   */
  private static mapUnknownError(
    _error: Error,
    requestId: string,
    timestamp: string
  ): ErrorResponse {
    return {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred. Please try again later.',
        timestamp,
        requestId,
      },
    };
  }

  /**
   * Determines the appropriate HTTP status code for an error
   * @param error - The error to evaluate
   * @returns HTTP status code
   */
  public static getStatusCode(error: Error): number {
    if (error instanceof AppError) {
      return error.statusCode;
    }

    // Default to 500 for unknown errors
    return HttpStatusCode.INTERNAL_SERVER_ERROR;
  }

  /**
   * Determines if an error is operational (expected) or programming error
   * @param error - The error to evaluate
   * @returns true if operational, false if programming error
   */
  public static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Formats error for logging (includes stack trace and full details)
   * @param error - The error to format
   * @param requestId - Optional request ID
   * @returns Formatted error object for logging
   */
  public static formatErrorForLogging(error: Error, requestId?: string): Record<string, unknown> {
    const logEntry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      requestId: requestId || 'unknown',
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    if (error instanceof AppError) {
      logEntry.code = error.code;
      logEntry.statusCode = error.statusCode;
      logEntry.isOperational = error.isOperational;

      if (error instanceof ValidationError && error.details) {
        logEntry.validationDetails = error.details;
      }
    }

    return logEntry;
  }

  /**
   * Sanitizes error messages to prevent sensitive information leakage
   * @param error - The error to sanitize
   * @returns Sanitized error message
   */
  public static sanitizeErrorMessage(error: Error): string {
    if (error instanceof AppError) {
      return error.message;
    }

    // For unknown errors, return generic message
    return 'An unexpected error occurred. Please try again later.';
  }
}
