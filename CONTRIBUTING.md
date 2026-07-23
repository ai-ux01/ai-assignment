# Contributing to Support Ticket Management System

Welcome to the Support Ticket Management System! This guide will help you understand how to contribute to the project effectively.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Adding New Features](#adding-new-features)
- [Submitting Changes](#submitting-changes)
- [Code Review Process](#code-review-process)

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Docker**: For running PostgreSQL locally
- **Git**: For version control

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd support-ticket
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Start the database**:
   ```bash
   docker-compose up -d postgres
   ```

5. **Verify setup**:
   ```bash
   npm run build
   npm test
   npm run dev
   ```

## Project Architecture

### Directory Structure

```
src/
├── api/              # REST API routes and controllers
│   └── ticketRoutes.ts        # Ticket-related endpoints
├── services/         # Business logic layer
│   ├── TicketService.ts       # Core ticket operations
│   ├── TicketStateMachine.ts  # State transition logic
│   └── SearchService.ts       # Search and filter operations
├── repositories/     # Data access layer
│   ├── TicketRepository.ts    # Ticket database operations
│   ├── CommentRepository.ts   # Comment database operations
│   ├── AuditLogRepository.ts  # Audit trail operations
│   └── database.ts            # Database connection pool
├── models/           # TypeScript types and interfaces
│   ├── ticket.ts              # Ticket entity types
│   ├── comment.ts             # Comment entity types
│   ├── validation.ts          # Validation result types
│   └── errors.ts              # Custom error types
├── middleware/       # Express middleware
│   ├── auth.middleware.ts     # Authentication
│   ├── errorMiddleware.ts     # Error handling
│   ├── requestIdMiddleware.ts # Request tracking
│   └── requestLogger.ts       # Request logging
├── utils/            # Shared utilities
│   ├── validator.ts           # Input validation
│   ├── inputSanitizer.ts      # Security sanitization
│   ├── errorHandler.ts        # Error mapping
│   ├── auditLogger.ts         # Audit logging
│   └── logger.ts              # Structured logging
└── index.ts          # Application entry point
```

### Architectural Layers

The application follows a clean layered architecture:

1. **API Layer** (`src/api/`): Handles HTTP requests/responses
   - Route definition and request validation
   - Calls service layer for business logic
   - Returns formatted responses with proper status codes

2. **Service Layer** (`src/services/`): Implements business logic
   - Coordinates between multiple repositories
   - Enforces business rules (e.g., state transitions)
   - Handles transaction management

3. **Repository Layer** (`src/repositories/`): Manages data persistence
   - Direct database interactions
   - Query construction and execution
   - Data transformation between database and domain models

4. **Middleware Layer** (`src/middleware/`): Cross-cutting concerns
   - Authentication and authorization
   - Request logging and tracking
   - Error handling and formatting

5. **Utils Layer** (`src/utils/`): Shared functionality
   - Input validation and sanitization
   - Logging infrastructure
   - Helper functions

### Key Design Principles

- **Separation of Concerns**: Each layer has a single, well-defined responsibility
- **Backend Validation First**: All validation happens on the backend
- **Immutability**: Comments and ticket IDs cannot be modified
- **State Machine Enforcement**: Strict validation of state transitions
- **ACID Compliance**: Database operations use transactions

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Individual feature development
- `bugfix/*`: Bug fixes
- `hotfix/*`: Urgent production fixes

### Development Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Write tests** for new functionality

4. **Run tests locally**:
   ```bash
   npm test
   npm run lint
   npm run format:check
   ```

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add user authentication"
   ```

6. **Push and create a pull request**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(api): add ticket assignment endpoint
fix(validation): correct email validation regex
docs(readme): update installation instructions
test(service): add property tests for state machine
```

## Coding Standards

### TypeScript Guidelines

#### Type Safety

- **Always use strict mode**: The project has `strict: true` in tsconfig.json
- **Avoid `any`**: Use proper types or `unknown` if type is truly unknown
- **Use explicit return types** for public functions:
  ```typescript
  // Good
  public async createTicket(data: CreateTicketRequest): Promise<Ticket> {
    // implementation
  }

  // Avoid
  public async createTicket(data: CreateTicketRequest) {
    // implementation
  }
  ```

#### Naming Conventions

- **Classes**: PascalCase (`TicketService`, `ValidationError`)
- **Interfaces**: PascalCase with descriptive names (`Ticket`, `ValidationResult`)
- **Functions/Methods**: camelCase (`createTicket`, `validateInput`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_TITLE_LENGTH`, `DEFAULT_PAGE_SIZE`)
- **Private members**: prefix with `_` (`_connection`, `_validateState`)

#### Code Organization

- **One class per file** (with same name as file)
- **Group related functions** in utility files
- **Export from index.ts** in each directory for cleaner imports:
  ```typescript
  // In src/services/index.ts
  export { TicketService } from './TicketService';
  export { SearchService } from './SearchService';
  ```

### Code Style

The project uses ESLint and Prettier for consistent code formatting:

- **Indentation**: 2 spaces
- **Line length**: 100 characters maximum
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Trailing commas**: Yes (ES5 style)

Run formatters before committing:
```bash
npm run format
npm run lint:fix
```

### Error Handling

#### Custom Error Classes

Use custom error classes from `src/models/errors.ts`:

```typescript
import { ValidationError, NotFoundError, StateTransitionError } from '@models/errors';

// Validation error
if (!title) {
  throw new ValidationError('Title is required', 'title');
}

// Not found error
if (!ticket) {
  throw new NotFoundError(`Ticket with ID ${id} not found`);
}

// State transition error
if (!isValidTransition(current, next)) {
  throw new StateTransitionError(
    `Invalid transition from ${current} to ${next}`,
    current,
    next
  );
}
```

#### Error Handling in Routes

Let the error middleware handle errors:

```typescript
// Good
router.post('/tickets', async (req, res, next) => {
  try {
    const ticket = await ticketService.createTicket(req.body);
    res.status(201).json(ticket);
  } catch (error) {
    next(error); // Pass to error middleware
  }
});

// Avoid manual error handling
router.post('/tickets', async (req, res) => {
  try {
    const ticket = await ticketService.createTicket(req.body);
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});
```

### Database Operations

#### Use Transactions for Multi-Step Operations

```typescript
async function updateTicketWithComment(
  ticketId: string,
  updates: TicketUpdates,
  comment: string
): Promise<Ticket> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update ticket
    await client.query(
      'UPDATE tickets SET title = $1, updated_at = NOW() WHERE id = $2',
      [updates.title, ticketId]
    );
    
    // Add comment
    await client.query(
      'INSERT INTO comments (ticket_id, text, author) VALUES ($1, $2, $3)',
      [ticketId, comment, updates.author]
    );
    
    await client.query('COMMIT');
    return await this.findById(ticketId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

#### Use Parameterized Queries

```typescript
// Good - Prevents SQL injection
const result = await pool.query(
  'SELECT * FROM tickets WHERE id = $1',
  [ticketId]
);

// Never do this - SQL injection vulnerability
const result = await pool.query(
  `SELECT * FROM tickets WHERE id = '${ticketId}'`
);
```

### Logging

Use the structured logger from `src/utils/logger.ts`:

```typescript
import { logger } from '@utils/logger';

// Info level
logger.info('Ticket created', { ticketId, userId });

// Error level with error object
logger.error('Failed to create ticket', { error, userId });

// Debug level (only in development)
logger.debug('Processing request', { requestId, body });

// Warn level
logger.warn('High memory usage detected', { usage: process.memoryUsage() });
```

## Testing Guidelines

### Testing Strategy

The project uses a comprehensive testing approach:

1. **Property-Based Tests**: Universal correctness properties using fast-check
2. **Unit Tests**: Specific scenarios and edge cases
3. **Integration Tests**: Database interactions and API endpoints

### Test File Naming

- Unit tests: `*.test.ts`
- Property-based tests: `*.property.test.ts`
- Integration tests: `*.integration.test.ts`

### Writing Unit Tests

```typescript
import { TicketService } from './TicketService';
import { TicketRepository } from '@repositories/TicketRepository';

describe('TicketService', () => {
  let service: TicketService;
  let mockRepository: jest.Mocked<TicketRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    } as any;
    
    service = new TicketService(mockRepository);
  });

  describe('createTicket', () => {
    it('should create ticket with Open state', async () => {
      const input = {
        title: 'Test ticket',
        description: 'Description',
        priority: 'High' as const,
      };
      
      mockRepository.create.mockResolvedValue({
        id: '123',
        ...input,
        state: 'Open',
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      const ticket = await service.createTicket(input);
      
      expect(ticket.state).toBe('Open');
      expect(ticket.assignee).toBeNull();
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'Open' })
      );
    });

    it('should throw ValidationError for empty title', async () => {
      const input = {
        title: '',
        description: 'Description',
        priority: 'High' as const,
      };
      
      await expect(service.createTicket(input)).rejects.toThrow(ValidationError);
    });
  });
});
```

### Writing Property-Based Tests

Use fast-check for property-based testing:

```typescript
import * as fc from 'fast-check';
import { TicketService } from './TicketService';

describe('TicketService - Property Tests', () => {
  describe('Ticket creation round-trip', () => {
    it('should preserve all input data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 200 }),
            description: fc.string({ minLength: 1, maxLength: 5000 }),
            priority: fc.constantFrom('Low', 'Medium', 'High', 'Critical'),
          }),
          async (input) => {
            const ticket = await service.createTicket(input);
            
            expect(ticket.title).toBe(input.title);
            expect(ticket.description).toBe(input.description);
            expect(ticket.priority).toBe(input.priority);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
```

### Writing Integration Tests

```typescript
import request from 'supertest';
import { app } from '../index';
import { pool } from '@repositories/database';

describe('POST /api/v1/tickets', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('should create ticket and return 201', async () => {
    const response = await request(app)
      .post('/api/v1/tickets')
      .send({
        title: 'Integration test ticket',
        description: 'Test description',
        priority: 'High',
      })
      .expect(201);
    
    expect(response.body).toMatchObject({
      id: expect.any(String),
      title: 'Integration test ticket',
      state: 'Open',
      assignee: null,
    });
  });
});
```

### Test Coverage Requirements

- **Overall coverage**: Minimum 90%
- **Core services**: 95%+ coverage
- **Repositories**: 90%+ coverage
- **API routes**: 85%+ coverage
- **Utilities**: 90%+ coverage

Run coverage reports:
```bash
npm run test:coverage
```

## Adding New Features

### Adding a New API Endpoint

1. **Define the route** in `src/api/ticketRoutes.ts` (or create a new route file):
   ```typescript
   router.get('/tickets/:id/history', async (req, res, next) => {
     try {
       const history = await ticketService.getTicketHistory(req.params.id);
       res.json(history);
     } catch (error) {
       next(error);
     }
   });
   ```

2. **Implement service method** in `src/services/TicketService.ts`:
   ```typescript
   public async getTicketHistory(ticketId: string): Promise<HistoryEntry[]> {
     this.validator.validateUUID(ticketId);
     return await this.auditLogRepository.getEntriesByTicketId(ticketId);
   }
   ```

3. **Add repository method** if needed in `src/repositories/AuditLogRepository.ts`:
   ```typescript
   public async getEntriesByTicketId(ticketId: string): Promise<AuditLogEntry[]> {
     const result = await this.pool.query(
       'SELECT * FROM audit_log WHERE ticket_id = $1 ORDER BY created_at DESC',
       [ticketId]
     );
     return result.rows;
   }
   ```

4. **Write tests** for all layers:
   - Unit test for service logic
   - Integration test for database operations
   - API test for HTTP endpoint

5. **Update documentation**:
   - Add endpoint to API documentation
   - Update OpenAPI/Swagger spec if used

### Adding a New Service

1. **Create service class** in `src/services/`:
   ```typescript
   export class NotificationService {
     constructor(
       private readonly ticketRepository: TicketRepository,
       private readonly emailProvider: EmailProvider
     ) {}

     public async notifyAssignee(ticketId: string): Promise<void> {
       const ticket = await this.ticketRepository.findById(ticketId);
       if (!ticket?.assignee) return;
       
       await this.emailProvider.send({
         to: ticket.assignee,
         subject: `Ticket ${ticketId} assigned to you`,
         body: this.formatEmailBody(ticket),
       });
     }

     private formatEmailBody(ticket: Ticket): string {
       // Implementation
     }
   }
   ```

2. **Add dependency injection** in `src/index.ts`:
   ```typescript
   const notificationService = new NotificationService(
     ticketRepository,
     emailProvider
   );
   ```

3. **Write comprehensive tests**:
   - Mock external dependencies
   - Test success and error scenarios
   - Add integration tests if applicable

### Adding Database Migrations

1. **Create migration file** in `database/schema-or-migrations/`:
   ```sql
   -- 04_add_notifications_table.sql
   CREATE TABLE notifications (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
     recipient VARCHAR(100) NOT NULL,
     message TEXT NOT NULL,
     sent_at TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
   );

   CREATE INDEX idx_notifications_ticket_id ON notifications(ticket_id);
   CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
   ```

2. **Test migration**:
   - Apply migration to test database
   - Verify schema changes
   - Test rollback if applicable

3. **Update data models** in `src/models/` to reflect schema changes

## Submitting Changes

### Pull Request Checklist

Before submitting a pull request, ensure:

- [ ] Code follows project style guidelines
- [ ] All tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Formatting is correct: `npm run format:check`
- [ ] Test coverage is maintained or improved
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventional commits format
- [ ] No console.log or debugging code left in
- [ ] Environment variables are documented in .env.example

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] No breaking changes (or documented)

## Related Issues
Fixes #(issue number)
```

## Code Review Process

### For Authors

- Keep pull requests focused and reasonably sized
- Respond to feedback promptly
- Be open to suggestions and learning
- Update tests based on feedback

### For Reviewers

Focus on:

1. **Correctness**: Does the code work as intended?
2. **Design**: Is it maintainable and well-structured?
3. **Testing**: Are there adequate tests?
4. **Security**: Are there any vulnerabilities?
5. **Performance**: Are there obvious performance issues?
6. **Documentation**: Is the code well-documented?

### Review Guidelines

- Be respectful and constructive
- Focus on the code, not the person
- Suggest alternatives rather than just criticizing
- Approve when satisfied, request changes when needed
- Use "nit:" prefix for minor/optional suggestions

## Questions or Issues?

- Check existing documentation in the project
- Review the design document: `.kiro/specs/support-ticket-management-system/design.md`
- Check the requirements: `.kiro/specs/support-ticket-management-system/requirements.md`
- Ask questions in pull request comments
- Reach out to the team for guidance

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [fast-check Documentation](https://fast-check.dev/)

Thank you for contributing to the Support Ticket Management System!
