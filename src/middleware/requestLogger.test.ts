import { Request, Response, NextFunction } from 'express';
import { requestLoggerMiddleware } from './requestLogger';
import logger from '../utils/logger';

// Mock the logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
}));

describe('RequestLogger Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let responseOnListeners: Map<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();
    responseOnListeners = new Map();

    mockRequest = {
      requestId: 'test-req-123',
      method: 'GET',
      url: '/api/v1/tickets',
      originalUrl: '/api/v1/tickets',
      headers: {
        'user-agent': 'jest-test',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      } as any,
    };

    // Mock ip separately to avoid readonly property issues
    Object.defineProperty(mockRequest, 'ip', {
      value: '127.0.0.1',
      writable: true,
      configurable: true,
    });

    mockResponse = {
      statusCode: 200,
      on: jest.fn((event: string, callback: Function) => {
        responseOnListeners.set(event, callback);
        return mockResponse as Response;
      }),
    } as Partial<Response>;

    nextFunction = jest.fn();
  });

  it('should log incoming request with details', () => {
    requestLoggerMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(logger.info).toHaveBeenCalledWith('Incoming request', {
      requestId: 'test-req-123',
      method: 'GET',
      url: '/api/v1/tickets',
      ip: '127.0.0.1',
      userAgent: 'jest-test',
    });
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should log request completion on finish event', () => {
    requestLoggerMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Simulate response finish
    const finishCallback = responseOnListeners.get('finish');
    expect(finishCallback).toBeDefined();

    if (finishCallback) {
      finishCallback();
    }

    expect(logger.log).toHaveBeenCalledWith(
      'info',
      'Request completed',
      expect.objectContaining({
        requestId: 'test-req-123',
        method: 'GET',
        url: '/api/v1/tickets',
        statusCode: 200,
      })
    );
  });

  it('should log as error for 5xx status codes', () => {
    mockResponse.statusCode = 500;

    requestLoggerMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    const finishCallback = responseOnListeners.get('finish');
    if (finishCallback) {
      finishCallback();
    }

    expect(logger.log).toHaveBeenCalledWith(
      'error',
      'Request completed',
      expect.objectContaining({
        statusCode: 500,
      })
    );
  });

  it('should log as warn for 4xx status codes', () => {
    mockResponse.statusCode = 404;

    requestLoggerMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    const finishCallback = responseOnListeners.get('finish');
    if (finishCallback) {
      finishCallback();
    }

    expect(logger.log).toHaveBeenCalledWith(
      'warn',
      'Request completed',
      expect.objectContaining({
        statusCode: 404,
      })
    );
  });

  it('should log as info for 2xx and 3xx status codes', () => {
    mockResponse.statusCode = 201;

    requestLoggerMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    const finishCallback = responseOnListeners.get('finish');
    if (finishCallback) {
      finishCallback();
    }

    expect(logger.log).toHaveBeenCalledWith(
      'info',
      'Request completed',
      expect.objectContaining({
        statusCode: 201,
      })
    );
  });

  it('should include duration in completion log', () => {
    requestLoggerMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    const finishCallback = responseOnListeners.get('finish');
    if (finishCallback) {
      finishCallback();
    }

    expect(logger.log).toHaveBeenCalledWith(
      'info',
      'Request completed',
      expect.objectContaining({
        duration: expect.stringMatching(/^\d+ms$/),
      })
    );
  });

  it('should use socket.remoteAddress when req.ip is not available', () => {
    // Create a new mock without ip property
    const reqWithoutIp: Partial<Request> = {
      requestId: 'test-req-123',
      method: 'GET',
      url: '/api/v1/tickets',
      originalUrl: '/api/v1/tickets',
      headers: {
        'user-agent': 'jest-test',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      } as any,
    };

    requestLoggerMiddleware(
      reqWithoutIp as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(logger.info).toHaveBeenCalledWith(
      'Incoming request',
      expect.objectContaining({
        ip: '127.0.0.1',
      })
    );
  });

  it('should fallback to req.url when originalUrl is not available', () => {
    mockRequest.originalUrl = undefined;

    requestLoggerMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(logger.info).toHaveBeenCalledWith(
      'Incoming request',
      expect.objectContaining({
        url: '/api/v1/tickets',
      })
    );
  });
});
