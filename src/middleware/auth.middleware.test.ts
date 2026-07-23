/**
 * Unit Tests for Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  authenticateRequest,
  addRequestId,
  AuthenticatedRequest,
  AuthenticationError,
} from './auth.middleware';
import { HttpStatusCode } from '../models/errors';

/**
 * Helper to create mock Express request, response, and next function
 */
function createMocks() {
  const req = {
    headers: {},
  } as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
}

/**
 * Helper to create a valid JWT token for testing
 * Format: header.payload.signature (base64url encoded)
 */
function createTestToken(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'test-signature';

  return `${headerB64}.${payloadB64}.${signature}`;
}

describe('Authentication Middleware', () => {
  describe('authenticateRequest', () => {
    describe('Success Cases', () => {
      it('should successfully authenticate with valid token containing sub field', () => {
        const { req, res, next } = createMocks();
        const payload = {
          sub: 'user-123',
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
        };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        authenticateRequest(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect((req as AuthenticatedRequest).user).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          username: undefined,
        });
        expect((req as AuthenticatedRequest).requestId).toBeDefined();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
      });

      it('should successfully authenticate with valid token containing userId field', () => {
        const { req, res, next } = createMocks();
        const payload = {
          userId: 'user-456',
          username: 'testuser',
        };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        authenticateRequest(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect((req as AuthenticatedRequest).user).toEqual({
          id: 'user-456',
          email: undefined,
          username: 'testuser',
        });
      });

      it('should successfully authenticate with valid token containing user_id field', () => {
        const { req, res, next } = createMocks();
        const payload = {
          user_id: 789,
          email: 'admin@example.com',
        };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        authenticateRequest(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect((req as AuthenticatedRequest).user).toEqual({
          id: '789',
          email: 'admin@example.com',
          username: undefined,
        });
      });

      it('should successfully authenticate token without expiration', () => {
        const { req, res, next } = createMocks();
        const payload = {
          sub: 'user-no-exp',
        };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        authenticateRequest(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect((req as AuthenticatedRequest).user).toBeDefined();
      });

      it('should add unique request ID to authenticated requests', () => {
        const { req, res, next } = createMocks();
        const payload = { sub: 'user-123' };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        authenticateRequest(req, res, next);

        expect((req as AuthenticatedRequest).requestId).toBeDefined();
        expect(typeof (req as AuthenticatedRequest).requestId).toBe('string');
        expect((req as AuthenticatedRequest).requestId.length).toBeGreaterThan(0);
      });
    });

    describe('Missing Token Cases', () => {
      it('should reject request with missing Authorization header', () => {
        const { req, res, next } = createMocks();
        // No authorization header

        authenticateRequest(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'MISSING_TOKEN',
              message: expect.stringContaining('Missing authentication token'),
              timestamp: expect.any(String),
              requestId: expect.any(String),
            }),
          })
        );
      });

      it('should reject request with empty Authorization header', () => {
        const { req, res, next } = createMocks();
        req.headers.authorization = '';

        authenticateRequest(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'MISSING_TOKEN',
            }),
          })
        );
      });
    });

    describe('Invalid Token Format Cases', () => {
      it('should reject token without Bearer prefix', () => {
        const { req, res, next } = createMocks();
        const payload = { sub: 'user-123' };
        const token = createTestToken(payload);
        req.headers.authorization = token; // Missing "Bearer "

        authenticateRequest(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'MISSING_TOKEN',
            }),
          })
        );
      });

      it('should reject token with incorrect prefix', () => {
        const { req, res, next } = createMocks();
        const payload = { sub: 'user-123' };
        const token = createTestToken(payload);
        req.headers.authorization = `Basic ${token}`;

        authenticateRequest(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
      });

      it('should reject malformed JWT with only 2 parts', () => {
        const { req, res, next } = createMocks();
        req.headers.authorization = 'Bearer header.payload';

        authenticateRequest(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'INVALID_TOKEN_FORMAT',
              message: expect.stringContaining('Invalid token format'),
            }),
          })
        );
      });

      it('should reject malformed JWT with only 1 part', () => {
        const { req, res, next } = createMocks();
        req.headers.authorization = 'Bearer singlepart';

        authenticateRequest(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'INVALID_TOKEN_FORMAT',
            }),
          })
        );
      });

      it('should reject JWT with empty parts', () => {
        const { req, res, next } = createMocks();
        req.headers.authorization = 'Bearer ..';

        authenticateRequest(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
      });

      it('should reject JWT with invalid base64 payload', () => {
        const { req, res, next } = createMocks();
        req.headers.authorization = 'Bearer header.!!!invalid-base64!!!.signature';

        authenticateRequest(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'TOKEN_DECODE_FAILED',
              message: expect.stringContaining('Failed to decode token payload'),
            }),
          })
        );
      });
    });

    describe('Token Expiration Cases', () => {
      it('should reject expired token', () => {
        const { req, res, next } = createMocks();
        const payload = {
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
        };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        authenticateRequest(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'TOKEN_EXPIRED',
              message: expect.stringContaining('Token has expired'),
            }),
          })
        );
      });

      it('should reject token expiring exactly now', () => {
        const { req, res, next } = createMocks();
        const payload = {
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) - 1, // expired 1 second ago
        };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        authenticateRequest(req, res, next);

        // Token expired should be rejected
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
      });

      it('should accept token expiring in the future', () => {
        const { req, res, next } = createMocks();
        const payload = {
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) + 60, // expires in 1 minute
        };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        authenticateRequest(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('Invalid Payload Cases', () => {
      it('should reject token with missing user identity', () => {
        const { req, res, next } = createMocks();
        const payload = {
          // No sub, userId, user_id, or id field
          email: 'test@example.com',
        };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        authenticateRequest(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'INVALID_TOKEN_PAYLOAD',
              message: expect.stringContaining('does not contain valid user identity'),
            }),
          })
        );
      });

      it('should reject token with empty user identity', () => {
        const { req, res, next } = createMocks();
        const payload = {
          sub: '',
        };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        authenticateRequest(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
      });

      it('should reject token with null user identity', () => {
        const { req, res, next } = createMocks();
        const payload = {
          sub: null,
        };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        authenticateRequest(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
      });
    });

    describe('Edge Cases', () => {
      it('should handle token with preferred_username field', () => {
        const { req, res, next } = createMocks();
        const payload = {
          sub: 'user-123',
          preferred_username: 'johndoe',
        };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        authenticateRequest(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect((req as AuthenticatedRequest).user?.username).toBe('johndoe');
      });

      it('should handle multiple spaces in Authorization header', () => {
        const { req, res, next } = createMocks();
        const payload = { sub: 'user-123' };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer  ${token}`; // Two spaces

        authenticateRequest(req, res, next);

        // Should fail due to split returning empty string
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
      });

      it('should handle case-sensitive Bearer prefix', () => {
        const { req, res, next } = createMocks();
        const payload = { sub: 'user-123' };
        const token = createTestToken(payload);
        req.headers.authorization = `bearer ${token}`; // lowercase

        authenticateRequest(req, res, next);

        // Should fail - Bearer must be capitalized
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
      });

      it('should convert numeric user IDs to strings', () => {
        const { req, res, next } = createMocks();
        const payload = {
          user_id: 12345, // numeric ID
        };
        const token = createTestToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        authenticateRequest(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect((req as AuthenticatedRequest).user?.id).toBe('12345');
        expect(typeof (req as AuthenticatedRequest).user?.id).toBe('string');
      });

      it('should generate unique request IDs for each request', () => {
        const payload = { sub: 'user-123' };
        const token = createTestToken(payload);

        const { req: req1, res: res1, next: next1 } = createMocks();
        req1.headers.authorization = `Bearer ${token}`;
        authenticateRequest(req1, res1, next1);

        const { req: req2, res: res2, next: next2 } = createMocks();
        req2.headers.authorization = `Bearer ${token}`;
        authenticateRequest(req2, res2, next2);

        expect((req1 as AuthenticatedRequest).requestId).toBeDefined();
        expect((req2 as AuthenticatedRequest).requestId).toBeDefined();
        expect((req1 as AuthenticatedRequest).requestId).not.toBe(
          (req2 as AuthenticatedRequest).requestId
        );
      });
    });
  });

  describe('addRequestId', () => {
    it('should add request ID to request without authentication', () => {
      const { req, res, next } = createMocks();

      addRequestId(req, res, next);

      expect((req as AuthenticatedRequest).requestId).toBeDefined();
      expect(typeof (req as AuthenticatedRequest).requestId).toBe('string');
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should generate unique request IDs', () => {
      const { req: req1, res: res1, next: next1 } = createMocks();
      addRequestId(req1, res1, next1);

      const { req: req2, res: res2, next: next2 } = createMocks();
      addRequestId(req2, res2, next2);

      expect((req1 as AuthenticatedRequest).requestId).not.toBe(
        (req2 as AuthenticatedRequest).requestId
      );
    });
  });

  describe('AuthenticationError', () => {
    it('should create error with default values', () => {
      const error = new AuthenticationError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('AUTHENTICATION_FAILED');
      expect(error.statusCode).toBe(HttpStatusCode.UNAUTHORIZED);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create error with custom code and status', () => {
      const error = new AuthenticationError('Custom error', 'CUSTOM_CODE', 403);

      expect(error.message).toBe('Custom error');
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.statusCode).toBe(403);
    });
  });
});
