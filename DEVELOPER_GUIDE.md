# Developer Guide - Support Ticket Management System

This guide provides comprehensive information about the project's architecture, design decisions, and implementation details for developers working on or extending the system.

## Table of Contents

- [System Architecture](#system-architecture)
- [Core Concepts](#core-concepts)
- [Layer-by-Layer Guide](#layer-by-layer-guide)
- [State Machine Implementation](#state-machine-implementation)
- [Testing Strategy](#testing-strategy)
- [Security Considerations](#security-considerations)
- [Performance Optimization](#performance-optimization)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## System Architecture

### High-Level Overview

The Support Ticket Management System follows a layered architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────┐
│          Client Applications                │
│     (Web Browser, Mobile App, etc.)        │
└─────────────────┬───────────────────────────┘
                  │ HTTP/JSON
                  ▼
┌─────────────────────────────────────────────┐
│           Express API Server                │
│  ┌─────────────────────────────────────┐  │
│  │     Middleware Layer                │  │
│  │  • Authentication                   │  │
│  │  • Request Logging                  │  │
│  │  • Error Handling                   │  │
│  └─────────────┬───────────────────────┘  │
│                ▼                            │
│  ┌─────────────────────────────────────┐  │
│  │      API Routes (Controllers)       │  │
│  │  • Request/Response Handling        │  │
│  │  • Input Validation                 │  │
│  └─────────────┬───────────────────────┘  │
└────────────────┼─────────────────────────┘
                 ▼
┌─────────────────────────────────────────────┐
│          Service Layer                      │
│  ┌─────────────────────────────────────┐  │
│  │   Business Logic Services           │  │
│  │  • TicketService                    │  │
│  │  • SearchService                    │  │
│  │  • TicketStateMachine               │  │
│  └─────────────┬───────────────────────┘  │
└────────────────┼─────────────────────────┘
                 ▼
┌─────────────────────────────────────────────┐
│       Repository Layer                      │
│  ┌─────────────────────────────────────┐  │
│  │   Data Access Objects               │  │
│  │  • TicketRepository                 │  │
│  │  • CommentRepository                │  │
│  │  • AuditLogRepository               │  │
│  └─────────────┬───────────────────────┘  │
└────────────────┼─────────────────────────┘
                 ▼
┌─────────────────────────────────────────────┐
│          PostgreSQL Database                │
│  • Tickets Table                            │
│  • Comments Table                           │
│  • Audit Log Table                          │
└─────────────────────────────────────────────┘
```

### Data Flow

**Create Ticket Flow**:
```
1. Client sends POST /api/v1/tickets with JSON body
2. Auth Middleware validates JWT token
3. Request Logger logs incoming request
4. Route handler extracts request data
5. Validator validates required fields and formats
6. TicketService.createTicket() called
7. TicketService generates UUID, sets initial state
8. TicketRepository.create() persists to database
9. AuditLogger records creation event
10. Response sent back to client with 201 status
```

**State Transition Flow**:
```
1. Client sends PATCH /api/v1/tickets/:id/state
2. Middleware processes request
3. Route handler validates ticket ID format
4. TicketService.transitionState() called
5. TicketStateMachine.validateTransition() checks validity
6. If valid: TicketRepository.update() persists change
7. If invalid: StateTransitionError thrown
8. AuditLogger records state change
9. Response sent with updated ticket or error
```

## Core Concepts

### 1. Ticket Lifecycle

Tickets follow a strict state machine:

```
       CREATE
         ↓
      [Open] ────────┐
         │           │
    Start Work    Cancel
         │           │
         ↓           ↓
   [In_Progress] [Cancelled]
         │           ↓
      Resolve     (Terminal)
         │
         ↓
    [Resolved]
         │
       Close
         │
         ↓
     [Closed]
         ↓
    (Terminal)
```

**Key Rules**:
- All tickets start in `Open` state
- Terminal states (`Closed`, `Cancelled`) cannot transition
- Transitions are one-way (no backwards movement)
- Each transition is validated and logged

### 2. Data Immutability

Certain data is immutable once created:

- **Ticket ID**: Generated once, never changed
- **Creation Timestamp**: Set on creation, never modified
- **Comments**: Cannot be edited or deleted after creation
- **Audit Log Entries**: Append-only, never modified

This ensures data integrity and maintains a complete audit trail.

### 3. Validation Layers

Validation occurs at multiple layers:

```
┌─────────────────────────────────────┐
│   1. Schema Validation (Zod)       │
│      • Type checking                │
│      • Required fields              │
└─────────────┬───────────────────────┘
              ▼
┌─────────────────────────────────────┐
│   2. Business Rule Validation       │
│      • State transitions            │
│      • Field constraints            │
└─────────────┬───────────────────────┘
              ▼
┌─────────────────────────────────────┐
│   3. Database Constraints           │
│      • Foreign keys                 │
│      • Check constraints            │
│      • Unique constraints           │
└─────────────────────────────────────┘
```

This layered approach catches errors early while maintaining data integrity.

### 4. Error Handling Strategy

The system uses a consistent error handling approach:

```typescript
// Custom error hierarchy
Error
  ↓
AppError (base custom error)
  ├── ValidationError (400)
  ├── NotFoundError (404)
  ├── StateTransitionError (422)
  └── DatabaseError (500)
```

All errors are:
- Caught by global error middleware
- Mapped to appropriate HTTP status codes
- Logged with context for debugging
- Returned with user-friendly messages

## Layer-by-Layer Guide

### API Layer (`src/api/`)

**Responsibilities**:
- Define HTTP routes and methods
- Parse request parameters and body
- Call service layer methods
- Format responses with correct status codes
- Delegate error handling to middleware

**Example Route Handler**:
```typescript
router.post('/tickets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract user from auth token (added by middleware)
    const userId = req.user?.id;
    
    // Parse and validate request body
    const createData = CreateTicketSchema.parse(req.body);
    
    // Call service layer
    const ticket = await ticketService.createTicket(createData);
    
    // Log to audit trail
    await auditLogger.logTicketCreation(ticket.id, userId);
    
    // Return success response
    res.status(201).json(ticket);
  } catch (error) {
    // Pass errors to error middleware
    next(error);
  }
});
```

**Best Practices**:
- Keep route handlers thin (business logic in services)
- Always use try-catch and pass errors to `next()`
- Validate input using Zod schemas
- Return appropriate HTTP status codes
- Use async/await for all asynchronous operations

### Service Layer (`src/services/`)

**Responsibilities**:
- Implement business logic
- Coordinate between multiple repositories
- Enforce business rules
- Manage transactions
- Transform data between layers

**Example Service Method**:
```typescript
export class TicketService {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly commentRepository: CommentRepository,
    private readonly validator: Validator,
    private readonly stateMachine: TicketStateMachine
  ) {}

  public async transitionState(
    ticketId: string,
    newState: TicketState
  ): Promise<Ticket> {
    // Validate input
    this.validator.validateUUID(ticketId);
    
    // Retrieve current ticket
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError(`Ticket ${ticketId} not found`);
    }
    
    // Validate state transition
    const validation = this.stateMachine.validateTransition(
      ticket.state,
      newState
    );
    
    if (!validation.valid) {
      throw new StateTransitionError(
        validation.errors[0].message,
        ticket.state,
        newState
      );
    }
    
    // Update state
    const updated = await this.ticketRepository.update(ticketId, {
      state: newState,
    });
    
    return updated;
  }
}
```

**Best Practices**:
- Validate all inputs
- Use dependency injection for testability
- Return domain models, not database rows
- Throw custom errors for business rule violations
- Keep methods focused on single responsibility

### Repository Layer (`src/repositories/`)

**Responsibilities**:
- Execute database queries
- Map between database rows and domain models
- Handle connection pooling
- Manage transactions
- Abstract SQL from business logic

**Example Repository Method**:
```typescript
export class TicketRepository {
  constructor(private readonly pool: Pool) {}

  public async findById(id: string): Promise<Ticket | null> {
    const result = await this.pool.query<TicketRow>(
      `SELECT 
        id, title, description, priority, state, assignee,
        created_at, updated_at
       FROM tickets 
       WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTicket(result.rows[0]);
  }

  public async update(
    id: string,
    updates: Partial<TicketUpdates>
  ): Promise<Ticket> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    // Build dynamic UPDATE query
    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    
    if (updates.state !== undefined) {
      fields.push(`state = $${paramIndex++}`);
      values.push(updates.state);
    }
    
    // Always update timestamp
    fields.push(`updated_at = NOW()`);
    
    // Add ID as final parameter
    values.push(id);
    
    const query = `
      UPDATE tickets 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await this.pool.query<TicketRow>(query, values);
    
    if (result.rows.length === 0) {
      throw new NotFoundError(`Ticket ${id} not found`);
    }
    
    return this.mapRowToTicket(result.rows[0]);
  }

  private mapRowToTicket(row: TicketRow): Ticket {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority as Priority,
      state: row.state as TicketState,
      assignee: row.assignee,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

**Best Practices**:
- Always use parameterized queries (prevent SQL injection)
- Map database rows to domain types
- Return null for not found (don't throw)
- Use connection pooling
- Handle database errors gracefully

### Middleware Layer (`src/middleware/`)

**Responsibilities**:
- Cross-cutting concerns
- Request preprocessing
- Response post-processing
- Error handling

**Key Middleware**:

1. **Authentication Middleware**:
   ```typescript
   export async function authenticateToken(
     req: Request,
     res: Response,
     next: NextFunction
   ): Promise<void> {
     const authHeader = req.headers['authorization'];
     const token = authHeader?.split(' ')[1]; // Bearer TOKEN
     
     if (!token) {
       return next(new UnauthorizedError('No token provided'));
     }
     
     try {
       const decoded = verifyToken(token);
       req.user = decoded; // Attach user to request
       next();
     } catch (error) {
       next(new UnauthorizedError('Invalid token'));
     }
   }
   ```

2. **Error Middleware**:
   ```typescript
   export function errorMiddleware(
     error: Error,
     req: Request,
     res: Response,
     next: NextFunction
   ): void {
     // Log error with context
     logger.error('Request error', {
       error: error.message,
       stack: error.stack,
       requestId: req.id,
       path: req.path,
     });
     
     // Map error to HTTP response
     if (error instanceof ValidationError) {
       res.status(400).json({
         error: {
           code: 'VALIDATION_ERROR',
           message: error.message,
           details: error.details,
         },
       });
     } else if (error instanceof NotFoundError) {
       res.status(404).json({
         error: {
           code: 'NOT_FOUND',
           message: error.message,
         },
       });
     } else {
       // Generic error response (don't leak internals)
       res.status(500).json({
         error: {
           code: 'INTERNAL_ERROR',
           message: 'An unexpected error occurred',
         },
       });
     }
   }
   ```

3. **Request Logger**:
   ```typescript
   export function requestLogger(
     req: Request,
     res: Response,
     next: NextFunction
   ): void {
     const start = Date.now();
     
     res.on('finish', () => {
       const duration = Date.now() - start;
       logger.info('Request completed', {
         method: req.method,
         path: req.path,
         status: res.statusCode,
         duration,
         requestId: req.id,
       });
     });
     
     next();
   }
   ```

## State Machine Implementation

### Design

The state machine is implemented as a separate, testable class:

```typescript
export class TicketStateMachine {
  // Define all valid transitions
  private static readonly TRANSITIONS: Record<TicketState, TicketState[]> = {
    Open: ['In_Progress', 'Cancelled'],
    In_Progress: ['Resolved', 'Cancelled'],
    Resolved: ['Closed'],
    Closed: [],
    Cancelled: [],
  };

  public validateTransition(
    currentState: TicketState,
    newState: TicketState
  ): ValidationResult {
    const allowedTransitions = TicketStateMachine.TRANSITIONS[currentState];
    
    // Check if current state exists
    if (!allowedTransitions) {
      return {
        valid: false,
        errors: [{
          field: 'state',
          message: `Unknown state: ${currentState}`,
          code: 'INVALID_STATE',
        }],
      };
    }
    
    // Check if terminal state
    if (allowedTransitions.length === 0) {
      return {
        valid: false,
        errors: [{
          field: 'state',
          message: `Ticket is in terminal state ${currentState}`,
          code: 'TERMINAL_STATE',
        }],
      };
    }
    
    // Check if transition is allowed
    if (!allowedTransitions.includes(newState)) {
      return {
        valid: false,
        errors: [{
          field: 'state',
          message: `Invalid transition from ${currentState} to ${newState}. ` +
                   `Allowed: ${allowedTransitions.join(', ')}`,
          code: 'INVALID_TRANSITION',
        }],
      };
    }
    
    return { valid: true };
  }

  public getValidNextStates(state: TicketState): TicketState[] {
    return TicketStateMachine.TRANSITIONS[state] || [];
  }

  public isTerminalState(state: TicketState): boolean {
    const transitions = TicketStateMachine.TRANSITIONS[state];
    return transitions !== undefined && transitions.length === 0;
  }
}
```

### Testing the State Machine

Property-based tests verify all state transitions:

```typescript
describe('TicketStateMachine - Property Tests', () => {
  const stateMachine = new TicketStateMachine();

  it('should allow all valid transitions', () => {
    const validTransitions = [
      ['Open', 'In_Progress'],
      ['Open', 'Cancelled'],
      ['In_Progress', 'Resolved'],
      ['In_Progress', 'Cancelled'],
      ['Resolved', 'Closed'],
    ] as const;

    validTransitions.forEach(([from, to]) => {
      const result = stateMachine.validateTransition(from, to);
      expect(result.valid).toBe(true);
    });
  });

  it('should reject all invalid transitions', () => {
    const invalidTransitions = [
      ['Open', 'Resolved'],
      ['Open', 'Closed'],
      ['In_Progress', 'Open'],
      ['Resolved', 'Open'],
      ['Closed', 'Open'],
      ['Cancelled', 'Open'],
    ] as const;

    invalidTransitions.forEach(([from, to]) => {
      const result = stateMachine.validateTransition(from, to);
      expect(result.valid).toBe(false);
    });
  });

  it('should reject transitions from terminal states', () => {
    const terminalStates = ['Closed', 'Cancelled'] as const;
    const allStates = ['Open', 'In_Progress', 'Resolved', 'Closed', 'Cancelled'] as const;

    terminalStates.forEach((terminalState) => {
      allStates.forEach((targetState) => {
        const result = stateMachine.validateTransition(terminalState, targetState);
        expect(result.valid).toBe(false);
        expect(result.errors?.[0].code).toBe('TERMINAL_STATE');
      });
    });
  });
});
```

## Testing Strategy

### Test Pyramid

```
        ┌──────────┐
        │    E2E   │  ← Few, high-level tests
        └──────────┘
      ┌──────────────┐
      │ Integration  │  ← Test component interactions
      └──────────────┘
    ┌──────────────────┐
    │  Unit + Property │  ← Most tests, fast and focused
    └──────────────────┘
```

### Property-Based Testing

Use fast-check to test universal properties:

```typescript
import * as fc from 'fast-check';

describe('Ticket Repository - Properties', () => {
  it('should preserve all data in create-read round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid ticket data
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 200 }),
          description: fc.string({ minLength: 1, maxLength: 5000 }),
          priority: fc.constantFrom('Low', 'Medium', 'High', 'Critical'),
        }),
        async (ticketData) => {
          // Create ticket
          const created = await repository.create({
            ...ticketData,
            state: 'Open',
            assignee: null,
          });
          
          // Read it back
          const retrieved = await repository.findById(created.id);
          
          // Verify all fields match
          expect(retrieved).toMatchObject({
            title: ticketData.title,
            description: ticketData.description,
            priority: ticketData.priority,
            state: 'Open',
            assignee: null,
          });
        }
      ),
      { numRuns: 100 } // Run 100 times with different inputs
    );
  });
});
```

### Integration Testing

Test database interactions with real database:

```typescript
describe('TicketRepository Integration Tests', () => {
  let repository: TicketRepository;
  let pool: Pool;

  beforeAll(async () => {
    // Connect to test database
    pool = new Pool({
      host: process.env.TEST_DB_HOST,
      database: process.env.TEST_DB_NAME,
      user: process.env.TEST_DB_USER,
      password: process.env.TEST_DB_PASSWORD,
    });
    repository = new TicketRepository(pool);
  });

  beforeEach(async () => {
    // Clean database before each test
    await pool.query('TRUNCATE tickets, comments, audit_log CASCADE');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should handle concurrent ticket creation', async () => {
    // Create 10 tickets concurrently
    const promises = Array.from({ length: 10 }, (_, i) =>
      repository.create({
        title: `Ticket ${i}`,
        description: 'Test',
        priority: 'Medium',
        state: 'Open',
        assignee: null,
      })
    );

    const tickets = await Promise.all(promises);
    
    // Verify all have unique IDs
    const ids = tickets.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);
    
    // Verify all were persisted
    const allTickets = await repository.findAll();
    expect(allTickets).toHaveLength(10);
  });
});
```

## Security Considerations

### 1. SQL Injection Prevention

**Always use parameterized queries**:

```typescript
// ✅ Safe - parameterized
const result = await pool.query(
  'SELECT * FROM tickets WHERE title LIKE $1',
  [`%${searchTerm}%`]
);

// ❌ Unsafe - string concatenation
const result = await pool.query(
  `SELECT * FROM tickets WHERE title LIKE '%${searchTerm}%'`
);
```

### 2. Input Sanitization

Sanitize all text inputs:

```typescript
export class InputSanitizer {
  public static sanitizeText(input: string): string {
    let sanitized = input.trim();
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
    
    return sanitized;
  }

  public static sanitizeSearchQuery(query: string): string {
    let sanitized = query.trim();
    
    // Escape special regex characters
    sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    return sanitized;
  }
}
```

### 3. Authentication

Validate JWT tokens on all protected routes:

```typescript
router.use(authenticateToken); // Apply to all routes below

router.post('/tickets', async (req, res, next) => {
  // req.user is now guaranteed to exist
  const userId = req.user.id;
  // ...
});
```

### 4. Error Message Security

Never leak internal details in error messages:

```typescript
// ✅ Good - safe error message
throw new NotFoundError('Ticket not found');

// ❌ Bad - leaks implementation details
throw new Error(`Database query failed: ${error.message}`);
```

## Performance Optimization

### 1. Database Indexing

Ensure proper indexes exist:

```sql
-- Index for state filtering
CREATE INDEX idx_tickets_state ON tickets(state);

-- Index for assignee lookups
CREATE INDEX idx_tickets_assignee ON tickets(assignee);

-- Index for sorting by creation date
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);

-- Full-text search index
CREATE INDEX idx_tickets_search ON tickets 
  USING GIN(to_tsvector('english', title || ' ' || description));
```

### 2. Connection Pooling

Use connection pooling for database access:

```typescript
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. Query Optimization

Fetch only needed data:

```typescript
// ✅ Good - fetch specific fields
SELECT id, title, state FROM tickets WHERE state = 'Open';

// ❌ Avoid - fetching unnecessary data
SELECT * FROM tickets WHERE state = 'Open';
```

### 4. Pagination

Implement pagination for large datasets:

```typescript
public async findAll(
  page: number = 1,
  pageSize: number = 50
): Promise<{ tickets: Ticket[]; total: number }> {
  const offset = (page - 1) * pageSize;
  
  const [dataResult, countResult] = await Promise.all([
    this.pool.query(
      'SELECT * FROM tickets ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [pageSize, offset]
    ),
    this.pool.query('SELECT COUNT(*) as total FROM tickets'),
  ]);
  
  return {
    tickets: dataResult.rows.map(this.mapRowToTicket),
    total: parseInt(countResult.rows[0].total, 10),
  };
}
```

## Common Patterns

### 1. Repository Pattern

All database access goes through repositories:

```typescript
// Service depends on repository interface, not implementation
class TicketService {
  constructor(private readonly repository: TicketRepository) {}
  
  async getTicket(id: string): Promise<Ticket> {
    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new NotFoundError(`Ticket ${id} not found`);
    }
    return ticket;
  }
}
```

### 2. Dependency Injection

Inject dependencies through constructors:

```typescript
// In src/index.ts
const pool = new Pool(/* config */);
const ticketRepository = new TicketRepository(pool);
const commentRepository = new CommentRepository(pool);
const stateMachine = new TicketStateMachine();

const ticketService = new TicketService(
  ticketRepository,
  commentRepository,
  stateMachine
);

// Routes use the injected service
app.use('/api/v1/tickets', createTicketRouter(ticketService));
```

### 3. Error Mapping

Map all errors in global middleware:

```typescript
function mapErrorToResponse(error: Error): ErrorResponse {
  if (error instanceof ValidationError) {
    return {
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details,
        },
      },
    };
  }
  
  if (error instanceof NotFoundError) {
    return {
      status: 404,
      body: {
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      },
    };
  }
  
  // Default to 500
  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
  };
}
```

## Troubleshooting

### Common Issues

**1. Database Connection Failures**

```
Error: connection to server at "localhost" (127.0.0.1), port 5432 failed
```

**Solution**:
- Verify PostgreSQL is running: `docker-compose ps`
- Check connection settings in `.env`
- Verify network connectivity

**2. Test Timeouts**

```
Jest test timeout exceeded
```

**Solution**:
- Increase timeout in jest.config.js: `testTimeout: 10000`
- Ensure test database is clean before tests
- Check for unclosed database connections

**3. Type Errors**

```
TS2322: Type 'string | undefined' is not assignable to type 'string'
```

**Solution**:
- Use TypeScript's non-null assertion or optional chaining
- Add proper type guards
- Check `tsconfig.json` strict mode settings

### Debugging Tips

1. **Enable Debug Logging**:
   ```typescript
   logger.level = 'debug';
   ```

2. **Log SQL Queries**:
   ```typescript
   pool.on('connect', () => {
     logger.debug('New database connection');
   });
   
   pool.on('error', (err) => {
     logger.error('Database error', { error: err });
   });
   ```

3. **Use Request IDs**:
   Every request has a unique ID for tracing:
   ```typescript
   logger.info('Processing request', { requestId: req.id });
   ```

### Performance Debugging

1. **Slow Queries**:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM tickets WHERE state = 'Open';
   ```

2. **Connection Pool Stats**:
   ```typescript
   logger.info('Pool stats', {
     total: pool.totalCount,
     idle: pool.idleCount,
     waiting: pool.waitingCount,
   });
   ```

---

For more information, refer to:
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [README.md](./README.md) - Project overview
- [API Documentation](./api-contract.md) - API specifications
- Design document: `.kiro/specs/support-ticket-management-system/design.md`
