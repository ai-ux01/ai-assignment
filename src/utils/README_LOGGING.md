# Logging Infrastructure

## Overview

The logging infrastructure provides structured logging capabilities for the Support Ticket Management System. It uses Winston as the logging library and supports multiple log levels, transports, and structured logging formats.

## Components

### 1. Logger (`logger.ts`)

The main logger instance configured with Winston. Provides structured logging with the following features:

- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **Transports**:
  - Console (always enabled, human-readable in development, JSON in production)
  - File (enabled in production or when LOG_FILE_PATH is set)
    - Combined log file (all levels)
    - Error log file (errors only)
- **Structured Format**: All logs are JSON-formatted for easy parsing and analysis
- **Timestamps**: ISO 8601 format timestamps for all log entries

#### Usage

```typescript
import logger from './utils/logger';

// Basic logging
logger.info('User logged in');
logger.error('Database connection failed');
logger.warn('Deprecated API endpoint used');
logger.debug('Processing ticket data', { ticketId: '123' });

// Logging with metadata
logger.info('Ticket created', {
  requestId: 'req-abc-123',
  userId: 'user-456',
  ticketId: 'ticket-789',
  title: 'New support request'
});

// Logging errors with stack traces
try {
  // some operation
} catch (error) {
  logger.error('Operation failed', { error, context: 'additional info' });
}
```

### 2. Request ID Middleware (`middleware/requestId.ts`)

Generates unique request IDs for each incoming HTTP request. Request IDs are used for request tracing and correlation across logs.

**Features:**
- Generates UUID v4 for each request
- Reuses existing request ID from `X-Request-Id` header if provided
- Attaches request ID to Express request object
- Adds `X-Request-Id` header to response for client tracking

#### Usage

```typescript
import express from 'express';
import { requestIdMiddleware } from './middleware/requestId';

const app = express();

// Apply middleware early in the chain
app.use(requestIdMiddleware);

// Access request ID in route handlers
app.get('/api/tickets', (req, res) => {
  const requestId = req.requestId;
  logger.info('Fetching tickets', { requestId });
  // ... rest of handler
});
```

### 3. Request Logger Middleware (`middleware/requestLogger.ts`)

Logs all incoming HTTP requests and their responses with timing information.

**Features:**
- Logs incoming request details (method, URL, IP, user agent)
- Logs response completion with status code and duration
- Automatically selects log level based on response status:
  - `error` for 5xx status codes
  - `warn` for 4xx status codes
  - `info` for 2xx and 3xx status codes

#### Usage

```typescript
import express from 'express';
import { requestIdMiddleware, requestLoggerMiddleware } from './middleware';

const app = express();

// Apply after requestId middleware
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
```

**Example Log Output:**

```json
// Incoming request
{
  "timestamp": "2024-01-15 10:30:00",
  "level": "info",
  "message": "Incoming request",
  "requestId": "abc-123-def",
  "method": "POST",
  "url": "/api/v1/tickets",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}

// Request completion
{
  "timestamp": "2024-01-15 10:30:01",
  "level": "info",
  "message": "Request completed",
  "requestId": "abc-123-def",
  "method": "POST",
  "url": "/api/v1/tickets",
  "statusCode": 201,
  "duration": "145ms"
}
```

### 4. Audit Logger (`utils/auditLogger.ts`)

Specialized logger for tracking state-changing operations for compliance and troubleshooting.

**Audit Operations:**
- `CREATE_TICKET` - Ticket creation
- `UPDATE_TICKET` - Ticket field updates
- `STATE_TRANSITION` - Ticket state changes
- `ASSIGN_TICKET` - Ticket assignment/reassignment
- `ADD_COMMENT` - Comment additions

#### Usage

```typescript
import auditLogger, { AuditOperation } from './utils/auditLogger';

// Log ticket creation
auditLogger.logTicketCreation({
  operation: AuditOperation.CREATE_TICKET,
  userId: 'user-123',
  ticketId: 'ticket-456',
  requestId: req.requestId,
  details: { title: 'New ticket', priority: 'High' }
});

// Log state transition
auditLogger.logStateTransition({
  operation: AuditOperation.STATE_TRANSITION,
  userId: 'user-123',
  ticketId: 'ticket-456',
  requestId: req.requestId,
  details: {
    oldState: 'Open',
    newState: 'In_Progress'
  }
});

// Log ticket update
auditLogger.logTicketUpdate({
  operation: AuditOperation.UPDATE_TICKET,
  userId: 'user-123',
  ticketId: 'ticket-456',
  requestId: req.requestId,
  details: {
    changedFields: ['title', 'priority'],
    changes: {
      title: { old: 'Old Title', new: 'New Title' },
      priority: { old: 'Low', new: 'High' }
    }
  }
});

// Log assignment
auditLogger.logAssignment({
  operation: AuditOperation.ASSIGN_TICKET,
  userId: 'user-123',
  ticketId: 'ticket-456',
  requestId: req.requestId,
  details: {
    oldAssignee: null,
    newAssignee: 'assignee-789'
  }
});

// Log comment addition
auditLogger.logCommentAdded({
  operation: AuditOperation.ADD_COMMENT,
  userId: 'user-123',
  ticketId: 'ticket-456',
  requestId: req.requestId,
  details: { commentId: 'comment-999', text: 'Status update' }
});
```

## Configuration

Logging is configured via environment variables in `.env`:

```env
# Logging Configuration
LOG_LEVEL=info              # Log level: error, warn, info, debug
LOG_FILE_PATH=./logs/app.log  # Path to log file (optional)
LOG_MAX_FILE_SIZE=10m       # Max file size before rotation (10MB)
LOG_MAX_FILES=7             # Number of rotated files to keep
NODE_ENV=development        # Environment: development, production
```

### Log Levels

- **ERROR**: System errors, exceptions, critical failures
- **WARN**: Warning conditions, deprecated features, 4xx errors
- **INFO**: General information, request logs, state changes
- **DEBUG**: Detailed debugging information

### Environment-Specific Behavior

**Development:**
- Console output with colors and human-readable format
- Default log level: `info`
- No file logging by default

**Production:**
- Console output in JSON format
- File logging enabled automatically
- Separate error log file
- Log rotation configured
- Default log level: `info`

## Best Practices

### 1. Always Include Request ID

```typescript
logger.info('Processing request', { 
  requestId: req.requestId,
  // other metadata
});
```

### 2. Use Appropriate Log Levels

- **ERROR**: Exceptions, database errors, critical failures
- **WARN**: Validation failures, deprecated endpoints, recoverable errors
- **INFO**: Request/response logs, state changes, successful operations
- **DEBUG**: Detailed flow information, variable values

### 3. Include Contextual Information

```typescript
logger.info('Ticket created', {
  requestId: req.requestId,
  userId: req.userId,
  ticketId: ticket.id,
  priority: ticket.priority
});
```

### 4. Use Audit Logger for State Changes

Always use the audit logger for operations that modify data:

```typescript
// Good
auditLogger.logStateTransition({ ... });

// Bad - don't use regular logger for audit logs
logger.info('State transition', { ... });
```

### 5. Log Errors with Stack Traces

```typescript
try {
  await ticketService.createTicket(data);
} catch (error) {
  logger.error('Failed to create ticket', {
    requestId: req.requestId,
    error: error,  // Winston will extract stack trace
    data
  });
  throw error;
}
```

## Testing

All logging components have comprehensive unit tests:

- `logger.test.ts` - Logger instance and methods
- `requestId.test.ts` - Request ID generation and middleware
- `requestLogger.test.ts` - Request logging middleware
- `auditLogger.test.ts` - Audit logging methods

Run tests:

```bash
npm test -- --testPathPattern="logger|requestId|requestLogger|auditLogger"
```

## Integration Example

Full integration in Express application:

```typescript
import express from 'express';
import { requestIdMiddleware, requestLoggerMiddleware } from './middleware';
import logger from './utils/logger';
import auditLogger from './utils/auditLogger';

const app = express();

// Apply logging middleware
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// Route handlers
app.post('/api/v1/tickets', async (req, res) => {
  try {
    const ticket = await ticketService.create(req.body);
    
    // Log audit entry
    auditLogger.logTicketCreation({
      operation: AuditOperation.CREATE_TICKET,
      userId: req.userId,
      ticketId: ticket.id,
      requestId: req.requestId,
      details: { title: ticket.title, priority: ticket.priority }
    });
    
    res.status(201).json(ticket);
  } catch (error) {
    logger.error('Ticket creation failed', {
      requestId: req.requestId,
      userId: req.userId,
      error
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  logger.info('Server started', { port: 3000 });
});
```

## Log Aggregation and Monitoring

In production, logs can be aggregated and monitored using:

- **CloudWatch** (AWS)
- **Stackdriver** (GCP)
- **Azure Monitor** (Azure)
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Datadog**
- **Splunk**

All logs are in JSON format for easy parsing and querying.
