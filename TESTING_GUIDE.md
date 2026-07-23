# Testing Guide - Support Ticket Management System

This guide provides comprehensive information about testing strategies, running tests, and writing new tests for the Support Ticket Management System.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [Property-Based Testing](#property-based-testing)
- [Integration Testing](#integration-testing)
- [Testing Patterns](#testing-patterns)
- [Troubleshooting](#troubleshooting)

## Testing Philosophy

Our testing strategy follows these principles:

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Fast Feedback**: Tests should run quickly to enable rapid development
3. **Comprehensive Coverage**: Aim for 90%+ coverage on critical paths
4. **Property-Based Testing**: Use generators to test universal properties
5. **Realistic Tests**: Integration tests use real database, not mocks

### Test Pyramid

```
        ┌──────────────┐
        │   E2E Tests  │  5% - Full system tests
        │  (Future)    │
        └──────────────┘
      ┌──────────────────┐
      │  Integration     │  25% - Component interactions
      │  Tests           │      Database, API endpoints
      └──────────────────┘
    ┌──────────────────────┐
    │  Unit Tests          │  70% - Individual functions
    │  Property Tests      │      Business logic, validation
    └──────────────────────┘
```

## Test Types

### 1. Unit Tests

Test individual functions and classes in isolation.

**Location**: `*.test.ts` files alongside source code

**Example**:
```typescript
// src/services/TicketService.test.ts
describe('TicketService', () => {
  describe('createTicket', () => {
    it('should set initial state to Open', async () => {
      const ticket = await service.createTicket({
        title: 'Test',
        description: 'Description',
        priority: 'High',
      });
      
      expect(ticket.state).toBe('Open');
      expect(ticket.assignee).toBeNull();
    });
  });
});
```

### 2. Property-Based Tests

Test universal properties that should hold for all inputs.

**Location**: `*.property.test.ts` files

**Example**:
```typescript
// src/repositories/TicketRepository.property.test.ts
import * as fc from 'fast-check';

describe('TicketRepository - Property Tests', () => {
  it('should preserve all data in create-read round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 200 }),
          description: fc.string({ minLength: 1, maxLength: 5000 }),
          priority: fc.constantFrom('Low', 'Medium', 'High', 'Critical'),
        }),
        async (data) => {
          const created = await repository.create(data);
          const retrieved = await repository.findById(created.id);
          
          expect(retrieved).toMatchObject(data);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 3. Integration Tests

Test interactions between components with real dependencies.

**Location**: `*.integration.test.ts` files

**Example**:
```typescript
// src/api/ticketRoutes.integration.test.ts
describe('POST /api/v1/tickets - Integration', () => {
  beforeEach(async () => {
    await pool.query('TRUNCATE tickets CASCADE');
  });

  it('should create ticket in database', async () => {
    const response = await request(app)
      .post('/api/v1/tickets')
      .send({
        title: 'Test ticket',
        description: 'Description',
        priority: 'High',
      })
      .expect(201);
    
    const result = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [response.body.id]
    );
    
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].state).toBe('Open');
  });
});
```

## Running Tests

### All Tests

Run the complete test suite:

```bash
npm test
```

### Watch Mode

Run tests continuously as you develop:

```bash
npm run test:watch
```

### Coverage Report

Generate test coverage report:

```bash
npm run test:coverage
```

Open `coverage/lcov-report/index.html` in a browser to view detailed coverage.

### Specific Test Files

Run tests for a specific file:

```bash
npm test -- TicketService.test.ts
```

Run tests matching a pattern:

```bash
npm test -- --testNamePattern="state transition"
```

### Integration Tests Only

Run only integration tests:

```bash
npm test -- --testPathPattern="integration"
```

### Property Tests Only

Run only property-based tests:

```bash
npm test -- --testPathPattern="property"
```

### Verbose Output

Get detailed test output:

```bash
npm test -- --verbose
```

## Writing Tests

### Unit Test Template

```typescript
import { TicketService } from './TicketService';
import { TicketRepository } from '@repositories/TicketRepository';
import { NotFoundError, ValidationError } from '@models/errors';

describe('TicketService', () => {
  let service: TicketService;
  let mockRepository: jest.Mocked<TicketRepository>;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
    } as any;
    
    // Inject mock into service
    service = new TicketService(mockRepository);
  });

  describe('getTicket', () => {
    it('should return ticket when found', async () => {
      const mockTicket = {
        id: '123',
        title: 'Test',
        state: 'Open',
      };
      
      mockRepository.findById.mockResolvedValue(mockTicket);
      
      const result = await service.getTicket('123');
      
      expect(result).toEqual(mockTicket);
      expect(mockRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw NotFoundError when ticket does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);
      
      await expect(service.getTicket('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createTicket', () => {
    it('should throw ValidationError for empty title', async () => {
      const invalidData = {
        title: '',
        description: 'Test',
        priority: 'High' as const,
      };
      
      await expect(service.createTicket(invalidData)).rejects.toThrow(
        ValidationError
      );
    });
  });
});
```

### Property-Based Test Template

```typescript
import * as fc from 'fast-check';
import { TicketRepository } from './TicketRepository';

describe('TicketRepository - Property Tests', () => {
  let repository: TicketRepository;

  beforeEach(() => {
    repository = new TicketRepository(pool);
  });

  afterEach(async () => {
    await pool.query('TRUNCATE tickets CASCADE');
  });

  describe('Ticket creation', () => {
    it('should generate unique IDs for concurrent creations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate array of valid ticket data
          fc.array(
            fc.record({
              title: fc.string({ minLength: 1, maxLength: 200 }),
              description: fc.string({ minLength: 1, maxLength: 5000 }),
              priority: fc.constantFrom('Low', 'Medium', 'High', 'Critical'),
            }),
            { minLength: 5, maxLength: 10 }
          ),
          async (ticketsData) => {
            // Create all tickets concurrently
            const tickets = await Promise.all(
              ticketsData.map(data => repository.create(data))
            );
            
            // Extract IDs
            const ids = tickets.map(t => t.id);
            
            // Verify all IDs are unique
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
          }
        ),
        { numRuns: 50 } // Run 50 times with different inputs
      );
    });
  });

  describe('Ticket updates', () => {
    it('should preserve unmodified fields in partial updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate original ticket data
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 200 }),
            description: fc.string({ minLength: 1, maxLength: 5000 }),
            priority: fc.constantFrom('Low', 'Medium', 'High', 'Critical'),
          }),
          // Generate partial update
          fc.oneof(
            fc.record({ title: fc.string({ minLength: 1, maxLength: 200 }) }),
            fc.record({ description: fc.string({ minLength: 1, maxLength: 5000 }) }),
            fc.record({ priority: fc.constantFrom('Low', 'Medium', 'High', 'Critical') })
          ),
          async (originalData, updates) => {
            // Create ticket
            const created = await repository.create(originalData);
            
            // Apply partial update
            const updated = await repository.update(created.id, updates);
            
            // Verify update applied
            Object.keys(updates).forEach(key => {
              expect(updated[key]).toBe(updates[key]);
            });
            
            // Verify other fields preserved
            const unchangedFields = Object.keys(originalData).filter(
              key => !(key in updates)
            );
            unchangedFields.forEach(key => {
              expect(updated[key]).toBe(originalData[key]);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
```

### Integration Test Template

```typescript
import request from 'supertest';
import { app } from '../index';
import { pool } from '@repositories/database';

describe('Ticket API - Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database is connected
    await pool.query('SELECT NOW()');
  });

  beforeEach(async () => {
    // Clean database before each test
    await pool.query('TRUNCATE tickets, comments, audit_log CASCADE');
  });

  afterAll(async () => {
    // Close database connection
    await pool.end();
  });

  describe('POST /api/v1/tickets', () => {
    it('should create ticket and persist to database', async () => {
      const ticketData = {
        title: 'Integration test ticket',
        description: 'This is a test',
        priority: 'High',
      };
      
      // Make API request
      const response = await request(app)
        .post('/api/v1/tickets')
        .send(ticketData)
        .expect(201);
      
      // Verify response
      expect(response.body).toMatchObject({
        id: expect.any(String),
        title: ticketData.title,
        state: 'Open',
      });
      
      // Verify database persistence
      const dbResult = await pool.query(
        'SELECT * FROM tickets WHERE id = $1',
        [response.body.id]
      );
      
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].title).toBe(ticketData.title);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        title: '', // Empty title
        description: 'Test',
        priority: 'High',
      };
      
      const response = await request(app)
        .post('/api/v1/tickets')
        .send(invalidData)
        .expect(400);
      
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('State Transition Flow', () => {
    it('should transition through complete ticket lifecycle', async () => {
      // 1. Create ticket
      const createResponse = await request(app)
        .post('/api/v1/tickets')
        .send({
          title: 'Test ticket',
          description: 'Test',
          priority: 'High',
        })
        .expect(201);
      
      const ticketId = createResponse.body.id;
      expect(createResponse.body.state).toBe('Open');
      
      // 2. Transition to In_Progress
      const progressResponse = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/state`)
        .send({ state: 'In_Progress' })
        .expect(200);
      
      expect(progressResponse.body.state).toBe('In_Progress');
      
      // 3. Transition to Resolved
      const resolvedResponse = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/state`)
        .send({ state: 'Resolved' })
        .expect(200);
      
      expect(resolvedResponse.body.state).toBe('Resolved');
      
      // 4. Transition to Closed
      const closedResponse = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/state`)
        .send({ state: 'Closed' })
        .expect(200);
      
      expect(closedResponse.body.state).toBe('Closed');
      
      // 5. Verify no further transitions allowed
      await request(app)
        .patch(`/api/v1/tickets/${ticketId}/state`)
        .send({ state: 'Open' })
        .expect(422);
    });
  });
});
```

## Test Coverage

### Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Services | 95% |
| Repositories | 90% |
| API Routes | 85% |
| Middleware | 90% |
| Utils | 90% |
| **Overall** | **90%** |

### Viewing Coverage

After running tests with coverage:

```bash
npm run test:coverage
```

Coverage reports are generated in multiple formats:

1. **Terminal**: Summary displayed in console
2. **HTML**: Open `coverage/lcov-report/index.html`
3. **LCOV**: `coverage/lcov.info` (for CI tools)

### Coverage Metrics

- **Line Coverage**: Percentage of code lines executed
- **Branch Coverage**: Percentage of decision branches taken
- **Function Coverage**: Percentage of functions called
- **Statement Coverage**: Percentage of statements executed

### Improving Coverage

If coverage is below target:

1. **Identify gaps**: Check HTML report for uncovered lines (red)
2. **Add missing tests**: Focus on untested branches
3. **Test edge cases**: Error handling, boundary conditions
4. **Test error paths**: Ensure error scenarios are covered

## Property-Based Testing

### When to Use

Use property-based tests for:

- **Data invariants**: Properties that should always hold
- **Round-trip operations**: Create → Read should match
- **Idempotence**: Multiple calls produce same result
- **Validation logic**: Ensure all invalid inputs rejected
- **State transitions**: Valid transitions succeed, invalid fail

### Custom Generators

Create reusable generators for domain types:

```typescript
// test/generators.ts
import * as fc from 'fast-check';

export const ticketGenerator = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.string({ minLength: 1, maxLength: 5000 }),
  priority: fc.constantFrom('Low', 'Medium', 'High', 'Critical'),
});

export const ticketWithStateGenerator = fc.record({
  ...ticketGenerator.value,
  state: fc.constantFrom('Open', 'In_Progress', 'Resolved', 'Closed', 'Cancelled'),
});

export const commentGenerator = fc.record({
  text: fc.string({ minLength: 1, maxLength: 2000 }),
  author: fc.emailAddress(),
});

// Usage in tests
describe('Property Tests', () => {
  it('should test with generated tickets', async () => {
    await fc.assert(
      fc.asyncProperty(
        ticketGenerator,
        async (ticket) => {
          // Test logic
        }
      )
    );
  });
});
```

### Shrinking

fast-check automatically shrinks failing cases to minimal examples:

```typescript
// If this test fails with a long string, fast-check will
// automatically find the shortest failing string
it('should handle titles correctly', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 200 }),
      async (title) => {
        const ticket = await service.createTicket({
          title,
          description: 'Test',
          priority: 'High',
        });
        
        expect(ticket.title).toBe(title);
      }
    )
  );
});

// If it fails, output might be:
// Property failed after 15 runs
// Counterexample: "a" (shrunk from original input)
```

## Integration Testing

### Database Setup

Integration tests use a test database:

```typescript
// test/setup.ts
import { Pool } from 'pg';

export function createTestPool(): Pool {
  return new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'test_tickets',
    user: process.env.TEST_DB_USER || 'testuser',
    password: process.env.TEST_DB_PASSWORD || 'testpass',
  });
}

// In test files
describe('Integration Tests', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createTestPool();
  });

  beforeEach(async () => {
    // Clean database
    await pool.query('TRUNCATE tickets, comments, audit_log CASCADE');
  });

  afterAll(async () => {
    await pool.end();
  });
});
```

### Test Database

Create a separate test database:

```bash
# Create test database
createdb test_tickets

# Run migrations
psql -d test_tickets -f database/schema-or-migrations/01_init_schema.sql
```

Or use Docker:

```bash
docker run -d \
  --name test-postgres \
  -e POSTGRES_DB=test_tickets \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpass \
  -p 5433:5432 \
  postgres:15
```

## Testing Patterns

### Arrange-Act-Assert

Structure tests clearly:

```typescript
it('should update ticket title', async () => {
  // Arrange - Set up test data
  const ticket = await repository.create({
    title: 'Original',
    description: 'Test',
    priority: 'High',
  });
  
  // Act - Perform the action
  const updated = await repository.update(ticket.id, {
    title: 'Updated',
  });
  
  // Assert - Verify the result
  expect(updated.title).toBe('Updated');
  expect(updated.description).toBe('Test'); // Unchanged
});
```

### Test Doubles

Use appropriate test doubles:

```typescript
// Mock - Full replacement with fake implementation
const mockRepository = {
  findById: jest.fn().mockResolvedValue({ id: '123', title: 'Test' }),
};

// Spy - Real object with tracking
const repository = new TicketRepository(pool);
const spy = jest.spyOn(repository, 'findById');

// Stub - Partial replacement
const stub = jest.fn().mockResolvedValue(null);
```

### Async Testing

Always use async/await:

```typescript
// ✅ Good
it('should create ticket', async () => {
  const ticket = await service.createTicket(data);
  expect(ticket.id).toBeDefined();
});

// ❌ Avoid - Missing await
it('should create ticket', async () => {
  const ticket = service.createTicket(data); // Missing await
  expect(ticket.id).toBeDefined(); // Test passes incorrectly
});
```

### Error Testing

Test error scenarios:

```typescript
it('should throw NotFoundError for invalid ID', async () => {
  await expect(
    service.getTicket('nonexistent')
  ).rejects.toThrow(NotFoundError);
});

// Or with try-catch
it('should throw NotFoundError for invalid ID', async () => {
  try {
    await service.getTicket('nonexistent');
    fail('Expected error to be thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toContain('not found');
  }
});
```

## Troubleshooting

### Tests Timing Out

**Problem**: Tests exceed timeout limit

**Solutions**:
1. Increase timeout in jest.config.js:
   ```javascript
   testTimeout: 20000, // 20 seconds
   ```

2. Or for specific tests:
   ```typescript
   it('slow test', async () => {
     // test logic
   }, 30000); // 30 second timeout
   ```

3. Ensure database connections are properly closed

### Database Connection Issues

**Problem**: Tests fail with connection errors

**Solutions**:
1. Verify test database is running
2. Check environment variables
3. Ensure connections are cleaned up:
   ```typescript
   afterAll(async () => {
     await pool.end();
   });
   ```

### Flaky Tests

**Problem**: Tests pass/fail inconsistently

**Solutions**:
1. Ensure database is cleaned between tests
2. Avoid testing timing-dependent behavior
3. Use proper async/await
4. Check for shared state between tests

### Coverage Not Updating

**Problem**: Coverage report shows old data

**Solutions**:
1. Delete coverage directory:
   ```bash
   rm -rf coverage/
   npm run test:coverage
   ```

2. Clear Jest cache:
   ```bash
   jest --clearCache
   ```

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [fast-check Documentation](https://fast-check.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Property-Based Testing Guide](https://fsharpforfunandprofit.com/pbt/)

For questions about testing, refer to:
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Architecture details
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
