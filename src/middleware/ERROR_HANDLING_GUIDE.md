# Error Handling Framework Guide

## Overview

The error handling framework provides a comprehensive, type-safe approach to managing errors in the Support Ticket Management System. It ensures consistent error responses, proper HTTP status code mapping, and detailed error logging for troubleshooting.

## Architecture

The framework consists of four main components:

1. **Error Models** (`src/models/errors.ts`) - Type definitions and error codes
2. **Custom Error Classes** (`src/utils/customErrors.ts`) - Specific error types
3. **ErrorHandler Class** (`src/utils/errorHandler.ts`) - Error processing logic
4. **Middleware** (`src/middleware/`) - Express middleware for error handling

## Components

### 1. Error Response Structure

All API errors follow a consistent JSON structure:

```typescript
{
  "error": {
    "code": "INVALID_INPUT",           // Machine-readable error code
    "message": "Validation failed",     // Human-readable message
    "details": [...],                   // Optional validation details
    "timestamp": "2024-01-15T10:30:00Z", // ISO8601 timestamp
    "requestId": "req_abc123"           // Request ID for tracing
  }
}
```

### 2. Error Codes

The framework defines error codes for different categories:

**Validation Errors (400)**
- `INVALID_INPUT` - Generic validation failure
- `MISSING_REQUIRED_FIELD` - Required field not provided
- `FIELD_TOO_LONG` - Field exceeds maximum length
- `FIELD_TOO_SHORT` - Field below minimum length
- `WHITESPACE_ONLY` - Field contains only whitespace
- `INVALID_UUID_FORMAT` - Malformed UUID

**Resource Errors (404)**
- `TICKET_NOT_FOUND` - Requested ticket does not exist

**Business Rule Violations (422)**
- `INVALID_PRIORITY` - Invalid priority value
- `INVALID_STATE` - Invalid state value
- `INVALID_TRANSITION` - Invalid state transition
- `TERMINAL_STATE` - Attempt to modify terminal state
- `INVALID_ASSIGNEE` - Invalid assignee identifier
- `CANNOT_MODIFY_TERMINAL` - Cannot modify closed/cancelled ticket

**System Errors (500)**
- `INTERNAL_ERROR` - Unexpected system error
- `DATABASE_ERROR` - Database operation failed

**Service Errors (503)**
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable
- `DATABASE_UNAVAILABLE` - Database temporarily unavailable

### 3. Custom Error Classes

The framework provides specific error classes for different scenarios:

#### ValidationError
```typescript
throw new ValidationError('Invalid input', [
  { field: 'title', message: 'Title is required', code: 'MISSING_REQUIRED_FIELD' }
]);
```

#### NotFoundError
```typescript
throw new NotFoundError(`Ticket with ID '${id}' does not exist`);
```

#### StateTransitionError
```typescript
throw new StateTransitionError(
  'Invalid transition from Open to Closed',
  ErrorCode.INVALID_TRANSITION
);
```

#### DatabaseError
```typescript
throw new DatabaseError(
  'Database connection failed',
  ErrorCode.DATABASE_UNAVAILABLE,
  503
);
```

#### BusinessRuleError
```typescript
throw new BusinessRuleError(
  'Invalid priority value',
  ErrorCode.INVALID_PRIORITY
);
```

## Usage

### In Route Handlers

Use the `asyncHandler` wrapper to automatically catch errors:

```typescript
import { asyncHandler } from '../middleware';
import { NotFoundError, ValidationError } from '../utils';

router.get('/tickets/:id', asyncHandler(async (req, res) => {
  const ticket = await ticketService.getTicket(req.params.id);
  
  if (!ticket) {
    throw new NotFoundError(`Ticket with ID '${req.params.id}' not found`);
  }
  
  res.json(ticket);
}));
```

### In Service Layer

Throw custom errors with descriptive messages:

```typescript
class TicketService {
  async createTicket(data: CreateTicketRequest): Promise<Ticket> {
    // Validation
    if (!data.title || data.title.trim() === '') {
      throw new ValidationError('Title is required', [
        { field: 'title', message: 'Title cannot be empty', code: 'MISSING_REQUIRED_FIELD' }
      ]);
    }
    
    // Business logic
    try {
      return await this.repository.insert(data);
    } catch (err) {
      throw new DatabaseError('Failed to create ticket', ErrorCode.DATABASE_ERROR);
    }
  }
}
```

### Setting Up Middleware

In your Express app:

```typescript
import express from 'express';
import { requestIdMiddleware, errorMiddleware, notFoundMiddleware } from './middleware';

const app = express();

// 1. Request ID middleware (first)
app.use(requestIdMiddleware);

// 2. Your routes
app.use('/api/v1', routes);

// 3. 404 handler (after all routes)
app.use(notFoundMiddleware);

// 4. Global error handler (last)
app.use(errorMiddleware);
```

## HTTP Status Code Mapping

| Error Type | Status Code | Description |
|------------|-------------|-------------|
| ValidationError | 400 | Invalid input or validation failure |
| NotFoundError | 404 | Resource not found |
| StateTransitionError | 422 | Invalid state transition |
| BusinessRuleError | 422 | Business rule violation |
| DatabaseError | 500/503 | Database error (configurable) |
| Unknown Error | 500 | Unexpected system error |

## Error Logging

The framework provides two levels of logging:

**Operational Errors** (logged as warnings)
- ValidationError
- NotFoundError
- StateTransitionError
- BusinessRuleError
- Expected DatabaseError

**Programming Errors** (logged as errors)
- Unknown/unexpected errors
- Unhandled exceptions

Log entries include:
- Request ID for tracing
- Error name and message
- Stack trace
- Error code and status code (for AppError)
- Validation details (for ValidationError)

## Best Practices

### 1. Use Specific Error Classes

```typescript
// Good
throw new NotFoundError(`Ticket ${id} not found`);

// Avoid
throw new Error('Not found');
```

### 2. Provide Detailed Validation Errors

```typescript
// Good
throw new ValidationError('Validation failed', [
  { field: 'title', message: 'Title is required', code: 'MISSING_REQUIRED_FIELD' },
  { field: 'priority', message: 'Priority must be Low, Medium, High, or Critical', code: 'INVALID_PRIORITY' }
]);

// Avoid
throw new ValidationError('Invalid input');
```

### 3. Include Context in Error Messages

```typescript
// Good
throw new StateTransitionError(
  `Invalid transition from ${currentState} to ${newState}. Allowed: ${validTransitions.join(', ')}`
);

// Avoid
throw new StateTransitionError('Invalid transition');
```

### 4. Use asyncHandler for Async Routes

```typescript
// Good
router.get('/tickets/:id', asyncHandler(async (req, res) => {
  // Your code
}));

// Avoid (no error handling)
router.get('/tickets/:id', async (req, res) => {
  // Your code
});
```

### 5. Sanitize Sensitive Information

```typescript
// Good
throw new DatabaseError('Database connection failed', ErrorCode.DATABASE_ERROR);

// Avoid (exposes internals)
throw new DatabaseError(`Connection failed: ${connectionString}`, ErrorCode.DATABASE_ERROR);
```

## Testing

The framework includes comprehensive unit tests. Run them with:

```bash
npm test -- --testPathPattern="customErrors|errorHandler|errorMiddleware|requestIdMiddleware"
```

## Examples

### Example 1: Validation Error with Multiple Fields

```typescript
const errors = [];
if (!title) errors.push({ field: 'title', message: 'Title is required', code: 'MISSING_REQUIRED_FIELD' });
if (!description) errors.push({ field: 'description', message: 'Description is required', code: 'MISSING_REQUIRED_FIELD' });
if (errors.length > 0) {
  throw new ValidationError('Validation failed for ticket creation', errors);
}
```

### Example 2: State Transition with Context

```typescript
const allowedTransitions = stateMachine.getValidNextStates(currentState);
if (!allowedTransitions.includes(newState)) {
  throw new StateTransitionError(
    `Invalid state transition from ${currentState} to ${newState}. ` +
    `Allowed transitions: ${allowedTransitions.join(', ')}`,
    ErrorCode.INVALID_TRANSITION
  );
}
```

### Example 3: Database Error with Retry Suggestion

```typescript
try {
  await database.connect();
} catch (err) {
  throw new DatabaseError(
    'Database is temporarily unavailable. Please try again later.',
    ErrorCode.DATABASE_UNAVAILABLE,
    503
  );
}
```

## Troubleshooting

### Request Tracing

Every error response includes a `requestId`. Use this to trace the error in logs:

```bash
# Search logs for specific request
grep "req_abc123" application.log
```

### Error Categories

- **400-level errors**: Client-side issues (validation, not found) - user can fix
- **500-level errors**: Server-side issues - require investigation

### Common Issues

1. **Error not caught**: Ensure route is wrapped with `asyncHandler`
2. **Missing requestId**: Check `requestIdMiddleware` is registered
3. **Generic error message**: Use specific error classes instead of Error
4. **Stack trace not logged**: Check error middleware is registered last

## Future Enhancements

Potential improvements for the error handling framework:

1. **Structured Logging**: Replace console with Winston/Pino
2. **Error Monitoring**: Integration with Sentry, Datadog, or similar
3. **Rate Limiting**: Add rate limit error codes
4. **i18n Support**: Multilingual error messages
5. **Error Analytics**: Track error patterns and frequencies
