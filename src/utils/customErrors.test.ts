/**
 * Unit tests for custom error classes
 */

import {
  AppError,
  ValidationError,
  NotFoundError,
  StateTransitionError,
  DatabaseError,
  BusinessRuleError,
} from './customErrors';
import { ErrorCode } from '../models/errors';

describe('Custom Error Classes', () => {
  describe('ValidationError', () => {
    it('should create ValidationError with message', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
      expect(error.isOperational).toBe(true);
    });

    it('should create ValidationError with details', () => {
      const details = [
        { field: 'title', message: 'Title is required', code: 'MISSING_REQUIRED_FIELD' },
        { field: 'priority', message: 'Invalid priority', code: 'INVALID_PRIORITY' },
      ];
      const error = new ValidationError('Validation failed', details);

      expect(error.details).toEqual(details);
      expect(error.details).toHaveLength(2);
    });

    it('should work with instanceof checks', () => {
      const error = new ValidationError('Test');
      expect(error instanceof ValidationError).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError with default code', () => {
      const error = new NotFoundError('Ticket not found');

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Ticket not found');
      expect(error.code).toBe(ErrorCode.TICKET_NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
      expect(error.isOperational).toBe(true);
    });

    it('should create NotFoundError with custom code', () => {
      const error = new NotFoundError('Resource not found', ErrorCode.TICKET_NOT_FOUND);

      expect(error.code).toBe(ErrorCode.TICKET_NOT_FOUND);
    });
  });

  describe('StateTransitionError', () => {
    it('should create StateTransitionError with default code', () => {
      const error = new StateTransitionError('Invalid transition');

      expect(error).toBeInstanceOf(StateTransitionError);
      expect(error.message).toBe('Invalid transition');
      expect(error.code).toBe(ErrorCode.INVALID_TRANSITION);
      expect(error.statusCode).toBe(422);
      expect(error.name).toBe('StateTransitionError');
    });

    it('should create StateTransitionError with custom code', () => {
      const error = new StateTransitionError('Terminal state', ErrorCode.TERMINAL_STATE);

      expect(error.code).toBe(ErrorCode.TERMINAL_STATE);
      expect(error.statusCode).toBe(422);
    });
  });

  describe('DatabaseError', () => {
    it('should create DatabaseError with default code and status', () => {
      const error = new DatabaseError('Database connection failed');

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.message).toBe('Database connection failed');
      expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('DatabaseError');
    });

    it('should create DatabaseError with custom status code', () => {
      const error = new DatabaseError(
        'Database unavailable',
        ErrorCode.DATABASE_UNAVAILABLE,
        503
      );

      expect(error.code).toBe(ErrorCode.DATABASE_UNAVAILABLE);
      expect(error.statusCode).toBe(503);
    });
  });

  describe('BusinessRuleError', () => {
    it('should create BusinessRuleError', () => {
      const error = new BusinessRuleError('Invalid priority', ErrorCode.INVALID_PRIORITY);

      expect(error).toBeInstanceOf(BusinessRuleError);
      expect(error.message).toBe('Invalid priority');
      expect(error.code).toBe(ErrorCode.INVALID_PRIORITY);
      expect(error.statusCode).toBe(422);
      expect(error.name).toBe('BusinessRuleError');
    });
  });

  describe('Error stack traces', () => {
    it('should capture stack trace', () => {
      const error = new ValidationError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });
  });

  describe('Error inheritance', () => {
    it('should maintain prototype chain', () => {
      const validation = new ValidationError('Test');
      const notFound = new NotFoundError('Test');
      const stateTransition = new StateTransitionError('Test');
      const database = new DatabaseError('Test');
      const businessRule = new BusinessRuleError('Test', ErrorCode.INVALID_STATE);

      expect(validation instanceof AppError).toBe(true);
      expect(notFound instanceof AppError).toBe(true);
      expect(stateTransition instanceof AppError).toBe(true);
      expect(database instanceof AppError).toBe(true);
      expect(businessRule instanceof AppError).toBe(true);

      expect(validation instanceof Error).toBe(true);
      expect(notFound instanceof Error).toBe(true);
      expect(stateTransition instanceof Error).toBe(true);
      expect(database instanceof Error).toBe(true);
      expect(businessRule instanceof Error).toBe(true);
    });
  });
});
