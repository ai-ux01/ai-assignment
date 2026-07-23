/**
 * Unit tests for request ID middleware
 */

import { Request, Response, NextFunction } from 'express';
import { requestIdMiddleware } from './requestIdMiddleware';

describe('Request ID Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should generate a new request ID if not provided', () => {
    requestIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.requestId).toBeDefined();
    expect(mockRequest.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', mockRequest.requestId);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should use provided request ID from header', () => {
    const providedId = 'custom-req-id-123';
    mockRequest.headers = { 'x-request-id': providedId };

    requestIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.requestId).toBe(providedId);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', providedId);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should set response header with request ID', () => {
    requestIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
  });

  it('should call next middleware', () => {
    requestIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should generate unique IDs for different requests', () => {
    const request1: Partial<Request> = { headers: {} };
    const request2: Partial<Request> = { headers: {} };
    const response1: Partial<Response> = { setHeader: jest.fn() };
    const response2: Partial<Response> = { setHeader: jest.fn() };

    requestIdMiddleware(request1 as Request, response1 as Response, mockNext);
    requestIdMiddleware(request2 as Request, response2 as Response, mockNext);

    expect(request1.requestId).toBeDefined();
    expect(request2.requestId).toBeDefined();
    expect(request1.requestId).not.toBe(request2.requestId);
  });
});
