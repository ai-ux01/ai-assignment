/**
 * Unit tests for error middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  errorMiddleware,
  notFoundMiddleware,
  asyncHandler,
} from './errorMiddleware';
import {
  ValidationError,
  NotFoundError,
  StateTransitionError,
} from '../utils/customErrors';
import { ErrorCode } from '../models/errors';

// Mock console methods
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      requestId: 'test-req-123',
      method: 'GET',
      path: '/api/v1/tickets',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('errorMiddleware', () => {
    it('should handle ValidationError and return 400', () => {
      const error = new ValidationError('Invalid input', [
        { field: 'title', message: 'Title is required', code: 'MISSING_REQUIRED_FIELD' },
      ]);

      errorMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCode.INVALID_INPUT,
          message: 'Invalid input',
          details: [
            { field: 'title', message: 'Title is required', code: 'MISSING_REQUIRED_FIELD' },
          ],
          timestamp: expect.any(String),
          requestId: 'test-req-123',
        },
      });
      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('should handle NotFoundError and return 404', () => {
      const error = new NotFoundError('Ticket not found');

      errorMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCode.TICKET_NOT_FOUND,
          message: 'Ticket not found',
          timestamp: expect.any(String),
          requestId: 'test-req-123',
        },
      });
      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('should handle StateTransitionError and return 422', () => {
      const error = new StateTransitionError('Invalid transition');

      errorMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCode.INVALID_TRANSITION,
          message: 'Invalid transition',
          timestamp: expect.any(String),
          requestId: 'test-req-123',
        },
      });
      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('should handle unknown errors and return 500', () => {
      const error = new Error('Unexpected error');

      errorMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'An unexpected error occurred. Please try again later.',
          timestamp: expect.any(String),
          requestId: 'test-req-123',
        },
      });
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should use "unknown" requestId if not set on request', () => {
      const error = new ValidationError('Test');
      mockRequest.requestId = undefined;

      errorMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0]?.[0];
      expect(jsonCall.error.requestId).toBe('unknown');
    });

    it('should log operational errors with console.warn', () => {
      const error = new NotFoundError('Test');

      errorMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockConsoleWarn).toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should log programming errors with console.error', () => {
      const error = new Error('Programming bug');

      errorMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });
  });

  describe('notFoundMiddleware', () => {
    it('should return 404 for undefined routes', () => {
      mockRequest = {
        ...mockRequest,
        method: 'POST',
        path: '/api/v1/nonexistent',
      };

      notFoundMiddleware(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: 'Route POST /api/v1/nonexistent not found',
          timestamp: expect.any(String),
          requestId: 'test-req-123',
        },
      });
    });

    it('should use "unknown" requestId if not set', () => {
      mockRequest.requestId = undefined;

      notFoundMiddleware(mockRequest as Request, mockResponse as Response);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0]?.[0];
      expect(jsonCall.error.requestId).toBe('unknown');
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const asyncFn = jest.fn().mockResolvedValue(undefined);
      const wrapped = asyncHandler(asyncFn);

      await wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch rejected promises and call next with error', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(asyncFn);

      await wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should catch thrown errors in async functions', async () => {
      const error = new ValidationError('Validation failed');
      const asyncFn = jest.fn().mockImplementation(async () => {
        throw error;
      });
      const wrapped = asyncHandler(asyncFn);

      await wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle async functions that return Response', async () => {
      const asyncFn = jest.fn().mockResolvedValue(mockResponse);
      const wrapped = asyncHandler(asyncFn);

      await wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
