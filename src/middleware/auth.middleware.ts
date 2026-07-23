/**
 * Authentication Middleware
 * Validates JWT tokens and extracts user identity for audit logging
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorCode, HttpStatusCode } from '../models/errors';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extended Express Request interface to include user context
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
  requestId: string;
}

/**
 * Authentication error class for token validation failures
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string = 'AUTHENTICATION_FAILED',
    public statusCode: number = HttpStatusCode.UNAUTHORIZED
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
}

/**
 * Validate JWT token structure (basic validation)
 * In production, this would verify signature against JWT_SECRET
 * For now, we'll perform basic structure validation
 */
function validateJWTStructure(token: string): boolean {
  // JWT should have 3 parts separated by dots: header.payload.signature
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Decode JWT payload (without signature verification for MVP)
 * In production, use jsonwebtoken library for proper verification
 */
function decodeJWTPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode base64url payload
    const payload = parts[1];
    if (!payload) {
      return null;
    }

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

/**
 * Extract user identity from JWT payload
 */
function extractUserIdentity(
  payload: any
): { id: string; email?: string; username?: string } | null {
  // Support multiple JWT payload formats
  // Common fields: sub, userId, user_id, email, username

  const userId = payload.sub || payload.userId || payload.user_id || payload.id;

  if (!userId) {
    return null;
  }

  return {
    id: String(userId),
    email: payload.email,
    username: payload.username || payload.preferred_username,
  };
}

/**
 * Authentication Middleware
 *
 * Validates JWT tokens and adds user context to requests.
 * This middleware:
 * - Extracts Bearer token from Authorization header
 * - Validates token structure
 * - Decodes token payload to extract user identity
 * - Adds user context to request object for downstream handlers
 * - Adds unique request ID for audit logging
 *
 * @throws AuthenticationError if token is missing, invalid, or expired
 */
export function authenticateRequest(req: Request, res: Response, next: NextFunction): void {
  const authenticatedReq = req as AuthenticatedRequest;

  // Generate unique request ID for tracking and audit logging
  authenticatedReq.requestId = uuidv4();

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw new AuthenticationError(
        'Missing authentication token. Please provide a valid Bearer token in the Authorization header.',
        'MISSING_TOKEN'
      );
    }

    // Validate token structure
    if (!validateJWTStructure(token)) {
      throw new AuthenticationError(
        'Invalid token format. Token must be a valid JWT with three parts.',
        'INVALID_TOKEN_FORMAT'
      );
    }

    // Decode token payload
    const payload = decodeJWTPayload(token);
    if (!payload) {
      throw new AuthenticationError(
        'Failed to decode token payload. Token may be malformed.',
        'TOKEN_DECODE_FAILED'
      );
    }

    // Check token expiration
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new AuthenticationError(
          'Token has expired. Please obtain a new token.',
          'TOKEN_EXPIRED'
        );
      }
    }

    // Extract user identity from payload
    const userIdentity = extractUserIdentity(payload);
    if (!userIdentity) {
      throw new AuthenticationError(
        'Token payload does not contain valid user identity information.',
        'INVALID_TOKEN_PAYLOAD'
      );
    }

    // Add user context to request for downstream handlers
    authenticatedReq.user = userIdentity;

    // Continue to next middleware
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      // Return structured error response
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: authenticatedReq.requestId,
        },
      });
    } else {
      // Handle unexpected errors
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'An unexpected error occurred during authentication.',
          timestamp: new Date().toISOString(),
          requestId: authenticatedReq.requestId,
        },
      });
    }
  }
}

/**
 * Optional middleware - only adds request ID without enforcing authentication
 * Useful for public endpoints that don't require authentication
 */
export function addRequestId(req: Request, _res: Response, next: NextFunction): void {
  const authenticatedReq = req as AuthenticatedRequest;
  authenticatedReq.requestId = uuidv4();
  next();
}

/**
 * Generate a test JWT token for development/testing
 * WARNING: Only use for development/testing! Do not use in production!
 * 
 * @param userId - User ID to include in token
 * @param email - Optional email address
 * @returns Valid JWT token string for testing
 */
export function generateTestToken(userId: string, email?: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: userId,
    email: email || `${userId}@example.com`,
    exp: Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
    iat: Math.floor(Date.now() / 1000),
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'test-signature-do-not-use-in-production';

  return `${headerB64}.${payloadB64}.${signature}`;
}
