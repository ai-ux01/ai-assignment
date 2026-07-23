/**
 * Unit tests for ErrorHandler class
 */

import { ErrorHandler } from './errorHandler';
import {
  ValidationError,
  NotFoundError,
  StateTransitionError,
  DatabaseError,
} from './customErrors';
import { ErrorCode } from '../models/errors';

describe('ErrorHandler', () => {
  describe('mapErrorToResponse', () => {
    it('should map ValidationError to error response', () => {
      const error = new ValidationError('Invalid input', [
        { field: 'title', message: 'Title is required', code: 'MISSING_REQUIRED_FIELD' },
      ]);

      const response = ErrorHandler.mapErrorToResponse(error, 'req-123');

      expect(response.error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(response.error.message).toBe('Invalid input');
      expect(response.error.requestId).toBe('req-123');
      expect(response.error.timestamp).toBeDefined();
      expect(response.error.details).toHaveLength(1);
      expect(response.error.details?.[0]?.field).toBe('title');
    });

    it('should map NotFoundError to error response', () => {
      const error = new NotFoundError('Ticket not found');

      const response = ErrorHandler.mapErrorToResponse(error, 'req-456');

      expect(response.error.code).toBe(ErrorCode.TICKET_NOT_FOUND);
      expect(response.error.message).toBe('Ticket not found');
      expect(response.error.requestId).toBe('req-456');
      expect(response.error.details).toBeUndefined();
    });

    it('should map StateTransitionError to error response', () => {
      const error = new StateTransitionError(
        'Invalid transition from Open to Closed',
        ErrorCode.INVALID_TRANSITION
      );

      const response = ErrorHandler.mapErrorToResponse(error);

      expect(response.error.code).toBe(ErrorCode.INVALID_TRANSITION);
      expect(response.error.message).toBe('Invalid transition from Open to Closed');
      expect(response.error.requestId).toBeDefined();
    });

    it('should map DatabaseError to error response', () => {
      const error = new DatabaseError('Connection failed', ErrorCode.DATABASE_UNAVAILABLE, 503);

      const response = ErrorHandler.mapErrorToResponse(error);

      expect(response.error.code).toBe(ErrorCode.DATABASE_UNAVAILABLE);
      expect(response.error.message).toBe('Connection failed');
    });

    it('should map unknown errors to generic internal error', () => {
      const error = new Error('Some random error');

      const response = ErrorHandler.mapErrorToResponse(error, 'req-789');

      expect(response.error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(response.error.message).toBe('An unexpected error occurred. Please try again later.');
      expect(response.error.requestId).toBe('req-789');
      expect(response.error.details).toBeUndefined();
    });

    it('should generate request ID if not provided', () => {
      const error = new ValidationError('Test');

      const response = ErrorHandler.mapErrorToResponse(error);

      expect(response.error.requestId).toBeDefined();
      expect(response.error.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should include ISO8601 timestamp', () => {
      const error = new ValidationError('Test');

      const response = ErrorHandler.mapErrorToResponse(error);

      expect(response.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('getStatusCode', () => {
    it('should return 400 for ValidationError', () => {
      const error = new ValidationError('Invalid');
      expect(ErrorHandler.getStatusCode(error)).toBe(400);
    });

    it('should return 404 for NotFoundError', () => {
      const error = new NotFoundError('Not found');
      expect(ErrorHandler.getStatusCode(error)).toBe(404);
    });

    it('should return 422 for StateTransitionError', () => {
      const error = new StateTransitionError('Invalid transition');
      expect(ErrorHandler.getStatusCode(error)).toBe(422);
    });

    it('should return 500 for DatabaseError by default', () => {
      const error = new DatabaseError('Connection failed');
      expect(ErrorHandler.getStatusCode(error)).toBe(500);
    });

    it('should return 503 for DatabaseError with unavailable status', () => {
      const error = new DatabaseError('Unavailable', ErrorCode.DATABASE_UNAVAILABLE, 503);
      expect(ErrorHandler.getStatusCode(error)).toBe(503);
    });

    it('should return 500 for unknown errors', () => {
      const error = new Error('Random error');
      expect(ErrorHandler.getStatusCode(error)).toBe(500);
    });
  });

  describe('isOperationalError', () => {
    it('should return true for ValidationError', () => {
      const error = new ValidationError('Invalid');
      expect(ErrorHandler.isOperationalError(error)).toBe(true);
    });

    it('should return true for NotFoundError', () => {
      const error = new NotFoundError('Not found');
      expect(ErrorHandler.isOperationalError(error)).toBe(true);
    });

    it('should return true for StateTransitionError', () => {
      const error = new StateTransitionError('Invalid');
      expect(ErrorHandler.isOperationalError(error)).toBe(true);
    });

    it('should return true for DatabaseError', () => {
      const error = new DatabaseError('Failed');
      expect(ErrorHandler.isOperationalError(error)).toBe(true);
    });

    it('should return false for unknown errors', () => {
      const error = new Error('Random error');
      expect(ErrorHandler.isOperationalError(error)).toBe(false);
    });
  });

  describe('formatErrorForLogging', () => {
    it('should format AppError with all details', () => {
      const error = new ValidationError('Invalid input', [
        { field: 'title', message: 'Required', code: 'MISSING_REQUIRED_FIELD' },
      ]);

      const formatted = ErrorHandler.formatErrorForLogging(error, 'req-123');

      expect(formatted.timestamp).toBeDefined();
      expect(formatted.requestId).toBe('req-123');
      expect(formatted.name).toBe('ValidationError');
      expect(formatted.message).toBe('Invalid input');
      expect(formatted.code).toBe(ErrorCode.INVALID_INPUT);
      expect(formatted.statusCode).toBe(400);
      expect(formatted.isOperational).toBe(true);
      expect(formatted.validationDetails).toHaveLength(1);
      expect(formatted.stack).toBeDefined();
    });

    it('should format unknown error with basic details', () => {
      const error = new Error('Random error');

      const formatted = ErrorHandler.formatErrorForLogging(error, 'req-456');

      expect(formatted.timestamp).toBeDefined();
      expect(formatted.requestId).toBe('req-456');
      expect(formatted.name).toBe('Error');
      expect(formatted.message).toBe('Random error');
      expect(formatted.stack).toBeDefined();
      expect(formatted.code).toBeUndefined();
      expect(formatted.statusCode).toBeUndefined();
    });

    it('should use "unknown" as requestId if not provided', () => {
      const error = new ValidationError('Test');

      const formatted = ErrorHandler.formatErrorForLogging(error);

      expect(formatted.requestId).toBe('unknown');
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should return original message for AppError', () => {
      const error = new ValidationError('Invalid input');
      expect(ErrorHandler.sanitizeErrorMessage(error)).toBe('Invalid input');
    });

    it('should return generic message for unknown errors', () => {
      const error = new Error('Sensitive internal error');
      expect(ErrorHandler.sanitizeErrorMessage(error)).toBe(
        'An unexpected error occurred. Please try again later.'
      );
    });
  });
});
