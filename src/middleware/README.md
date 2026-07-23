# Authentication Middleware

## Overview

The authentication middleware validates JWT tokens and extracts user identity from authenticated requests. This middleware is designed to work with external identity providers (OAuth2, Auth0, Cognito, etc.) that issue JWT tokens.

## Features

- ✅ JWT token validation (structure, format, expiration)
- ✅ User identity extraction from token payload
- ✅ Request ID generation for audit logging
- ✅ Comprehensive error handling with descriptive messages
- ✅ Support for multiple JWT payload formats
- ✅ TypeScript type safety with `AuthenticatedRequest` interface

## Usage

### Basic Usage

Apply the middleware to protected routes:

```typescript
import express from 'express';
import { authenticateRequest, AuthenticatedRequest } from './middleware';

const app = express();

// Protected route - requires authentication
app.get('/api/v1/tickets', authenticateRequest, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  
  // Access authenticated user information
  console.log('User ID:', authReq.user?.id);
  console.log('Email:', authReq.user?.email);
  console.log('Request ID:', authReq.requestId);
  
  res.json({ message: 'Protected resource' });
});
```

### Protecting All Routes

Apply authentication globally to all API routes:

```typescript
import { authenticateRequest } from './middleware';

// Apply authentication to all /api routes
app.use('/api', authenticateRequest);

// All routes under /api are now protected
app.get('/api/v1/tickets', (req, res) => {
  // User is guaranteed to be authenticated
});
```

### Mixed Public and Protected Routes

Use `addRequestId` for public routes and `authenticateRequest` for protected routes:

```typescript
import { authenticateRequest, addRequestId } from './middleware';

// Public routes - no authentication required
app.get('/health', addRequestId, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  res.json({ 
    status: 'ok',
    requestId: authReq.requestId 
  });
});

// Protected routes - authentication required
app.use('/api/v1', authenticateRequest);
```

### Accessing User Context

The middleware adds user context to the request object:

```typescript
import { AuthenticatedRequest } from './middleware';

app.post('/api/v1/tickets', authenticateRequest, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  
  // Create ticket with authenticated user as author
  const ticket = {
    title: req.body.title,
    description: req.body.description,
    createdBy: authReq.user?.id, // User ID from JWT token
  };
  
  res.status(201).json(ticket);
});
```

### Using Request ID for Audit Logging

Every authenticated request gets a unique request ID for tracking:

```typescript
app.post('/api/v1/tickets/:id/state', authenticateRequest, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  
  // Log state transition for audit trail
  await auditLog.create({
    requestId: authReq.requestId,
    userId: authReq.user?.id,
    operation: 'STATE_TRANSITION',
    ticketId: req.params.id,
    newState: req.body.state,
    timestamp: new Date(),
  });
  
  res.json({ success: true });
});
```

## JWT Token Format

The middleware supports standard JWT tokens in the Authorization header:

```
Authorization: Bearer <token>
```

### Token Structure

A valid JWT has three parts separated by dots:

```
header.payload.signature
```

Example:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImV4cCI6MTcwMDAwMDAwMH0.signature
```

### Supported Payload Fields

The middleware extracts user identity from the following payload fields (in order of precedence):

1. **`sub`** - Subject (standard JWT claim)
2. **`userId`** - Custom user ID field
3. **`user_id`** - Snake case user ID field
4. **`id`** - Generic ID field

Additional fields:
- **`email`** - User email address
- **`username`** - Username
- **`preferred_username`** - Alternative username field (Keycloak, Auth0)
- **`exp`** - Token expiration timestamp (Unix timestamp)

### Example Token Payloads

**Minimal token:**
```json
{
  "sub": "user-123"
}
```

**Full token:**
```json
{
  "sub": "user-123",
  "email": "john.doe@example.com",
  "username": "johndoe",
  "exp": 1700000000
}
```

**Auth0 token:**
```json
{
  "sub": "auth0|507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "preferred_username": "johndoe",
  "exp": 1700000000
}
```

## Error Responses

The middleware returns structured error responses for authentication failures:

### Missing Token

**Status:** `401 Unauthorized`

```json
{
  "error": {
    "code": "MISSING_TOKEN",
    "message": "Missing authentication token. Please provide a valid Bearer token in the Authorization header.",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-abc123"
  }
}
```

### Invalid Token Format

**Status:** `401 Unauthorized`

```json
{
  "error": {
    "code": "INVALID_TOKEN_FORMAT",
    "message": "Invalid token format. Token must be a valid JWT with three parts.",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-xyz789"
  }
}
```

### Token Expired

**Status:** `401 Unauthorized`

```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Token has expired. Please obtain a new token.",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-def456"
  }
}
```

### Invalid Payload

**Status:** `401 Unauthorized`

```json
{
  "error": {
    "code": "INVALID_TOKEN_PAYLOAD",
    "message": "Token payload does not contain valid user identity information.",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-ghi789"
  }
}
```

## Testing

The middleware includes comprehensive unit tests covering:

- ✅ Valid token authentication (28 test cases)
- ✅ Missing token scenarios
- ✅ Invalid token format detection
- ✅ Token expiration validation
- ✅ Payload validation
- ✅ Edge cases (special characters, numeric IDs, etc.)

Run tests:

```bash
npm test -- auth.middleware.test.ts
```

## Security Considerations

### Current Implementation (MVP)

The current implementation performs **structure validation only**:
- ✅ Validates JWT format (3 parts)
- ✅ Validates base64url encoding
- ✅ Validates token expiration
- ✅ Extracts user identity
- ❌ **Does NOT verify token signature**

### Production Requirements

For production deployment, implement proper JWT signature verification:

```typescript
import jwt from 'jsonwebtoken';

function verifyToken(token: string): any {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token signature', 'INVALID_SIGNATURE');
    }
    throw error;
  }
}
```

### Recommended Libraries

- **[jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)** - Full JWT implementation with signature verification
- **[express-jwt](https://github.com/auth0/express-jwt)** - Express middleware for JWT validation
- **[passport-jwt](https://github.com/mikenicholson/passport-jwt)** - Passport strategy for JWT authentication

### Environment Configuration

Add to `.env`:

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ISSUER=your-issuer
JWT_AUDIENCE=your-audience
```

## TypeScript Types

### AuthenticatedRequest

Extended Express Request with user context:

```typescript
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
  requestId: string;
}
```

### AuthenticationError

Custom error class for authentication failures:

```typescript
class AuthenticationError extends Error {
  constructor(
    message: string,
    code: string = 'AUTHENTICATION_FAILED',
    statusCode: number = 401
  );
}
```

## Integration with Services

Pass user context to service layer for audit logging:

```typescript
import { AuthenticatedRequest } from './middleware';
import { ticketService } from './services';

app.post('/api/v1/tickets', authenticateRequest, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    const ticket = await ticketService.createTicket({
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      userId: authReq.user!.id, // User ID for audit logging
      requestId: authReq.requestId,
    });
    
    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
});
```

## Troubleshooting

### "Missing authentication token"

- Ensure the `Authorization` header is present
- Header must start with "Bearer " (case-sensitive)
- Token must not be empty

### "Invalid token format"

- JWT must have exactly 3 parts: `header.payload.signature`
- Each part must be non-empty
- Parts must be separated by dots (`.`)

### "Token has expired"

- Check token `exp` claim
- Ensure client system time is synchronized
- Tokens should be refreshed before expiration

### "Token payload does not contain valid user identity"

- Token must include at least one of: `sub`, `userId`, `user_id`, or `id`
- User identity field must not be empty or null

## Related Documentation

- [Requirements Document](../../.kiro/specs/support-ticket-management-system/requirements.md) - Security Requirements
- [Design Document](../../.kiro/specs/support-ticket-management-system/design.md) - Security Design
- [Error Handling](../models/errors.ts) - Error response formats
