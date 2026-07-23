# Test Strategy

## Overview

The Support Ticket Management System employs a comprehensive, multi-layered testing approach that prioritizes correctness through property-based testing while maintaining thorough coverage with unit and integration tests.

## Testing Philosophy

### Correctness First
- **Property-Based Testing (PBT)** validates universal properties across all valid inputs
- Focuses on "what should always be true" rather than specific examples
- Uses fast-check framework to generate thousands of test cases automatically

### Layered Approach
1. **Property-Based Tests** - Universal correctness properties
2. **Unit Tests** - Specific examples and edge cases
3. **Integration Tests** - Database interactions and system behavior
4. **API Tests** - End-to-end HTTP request/response validation

### Test-Driven Development
- Tests written alongside or before implementation
- Each acceptance criterion maps to at least one test
- All 38 correctness properties have corresponding property tests

---

## Property-Based Testing

### What is Property-Based Testing?

Property-based testing validates that certain properties (characteristics) hold true across a wide range of randomly generated inputs. Instead of testing specific examples, PBT generates hundreds of test cases automatically.

**Example:**
- Traditional: "Creating ticket with title='Test' returns ticket with title='Test'"
- Property-Based: "For ANY valid title, creating a ticket and retrieving it returns the same title"

### Framework: fast-check

```typescript
import fc from 'fast-check';

// Property test example
test('Property 1: Ticket creation round-trip preserves data', async () => {
  await fc.assert(
    fc.asyncProperty(validTicketCreate, async (createRequest) => {
      const created = await ticketService.createTicket(createRequest);
      const retrieved = await ticketService.getTicket(created.id);
      
      expect(retrieved.title).toBe(createRequest.title);
      expect(retrieved.state).toBe('Open');
      expect(retrieved.assignee).toBeNull();
    }),
    { numRuns: 100 }
  );
});
```

### Configuration

- **Minimum Iterations**: 100 per property (can increase to 1000 for critical paths)
- **Test Tagging**: Each property test tagged with feature name and property number
- **Tag Format**: `Feature: support-ticket-management-system, Property {N}: {description}`
- **Failure Reporting**: fast-check provides minimal failing case (shrinking)

### The 38 Correctness Properties

All properties are documented in `design-notes.md` under "Correctness Properties". Each property validates a specific aspect of system behavior across all valid inputs.

**Categories:**
1. **Ticket Operations** (Properties 1-13): Creation, retrieval, updates
2. **Assignment** (Properties 14-18): Assignment, reassignment, unassignment  
3. **Comments** (Properties 19-22): Creation, ordering
4. **Search & Filter** (Properties 23-30): Keyword search, status filtering
5. **State Machine** (Properties 31-34): Valid/invalid transitions, terminal states
6. **Error Handling** (Properties 35-38): Validation errors, error formats, HTTP status codes

### Property Test Organization

Properties are tested at different layers:

**Repository Layer** (Properties 1, 2, 9, 11, 19, 22)
- Ticket creation round-trip
- ID uniqueness
- Update round-trip
- Comment creation and ordering

**Service Layer** (Properties 4-6, 14-21, 23-30)
- Ticket operations completeness
- Assignment operations
- Search and filter correctness

**State Machine** (Properties 31-34)
- Valid/invalid transitions
- Terminal state immutability

**API Layer** (Properties 35-38)
- Error response format
- HTTP status code correctness

### Generator Strategies

```typescript
// Valid input generators
const validPriority = fc.oneof(
  fc.constant('Low'),
  fc.constant('Medium'),
  fc.constant('High'),
  fc.constant('Critical')
);

const validTitle = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);

const validTicketCreate = fc.record({
  title: validTitle,
  description: validDescription,
  priority: validPriority
});

// Invalid input generators
const invalidTicketCreate = fc.oneof(
  fc.record({ description: validDescription, priority: validPriority }), // missing title
  fc.record({ title: fc.constant('   '), description: validDescription, priority: validPriority }), // empty title
  fc.record({ title: validTitle, description: validDescription, priority: fc.constant('Invalid') }) // invalid priority
);
```

---

## Unit Testing

### Purpose
- Test specific examples that demonstrate correct behavior
- Cover edge cases not easily expressed as properties
- Validate error messages and specific error scenarios
- Test boundary conditions

### Examples

```typescript
describe('Ticket Service Unit Tests', () => {
  test('Empty database returns empty list', async () => {
    await clearDatabase();
    const tickets = await ticketService.listTickets();
    expect(tickets).toEqual([]);
  });
  
  test('Search with no matches returns empty list', async () => {
    await ticketService.createTicket({
      title: 'Test ticket',
      description: 'Description',
      priority: 'Low'
    });
    
    const results = await searchService.searchByKeyword('nonexistent');
    expect(results).toEqual([]);
  });
  
  test('Terminal state (Closed) prevents further transitions', async () => {
    const ticket = await createTicketInState('Closed');
    
    await expect(ticketService.transitionState(ticket.id, 'Open'))
      .rejects.toThrow(/terminal state/i);
  });
});
```

### Coverage Focus
- Empty states (empty lists, no matches)
- Boundary values (max length strings, min/max priorities)
- Terminal state behavior
- Error message content
- Specific business rules

---

## Integration Testing

### Purpose
- Test interactions with actual database
- Verify transaction rollback behavior
- Test concurrent operations
- Validate system behavior under failures
- Ensure data integrity across restarts

### Database Integration Tests

```typescript
describe('Ticket System Integration Tests', () => {
  test('Database unavailability returns 503 error', async () => {
    await stopDatabase();
    
    const response = await request(app)
      .get('/api/v1/tickets')
      .expect(503);
    
    expect(response.body.error.code).toBe('DATABASE_UNAVAILABLE');
    
    await startDatabase();
  });
  
  test('Failed persistence rolls back transaction', async () => {
    const ticket = await ticketService.createTicket({
      title: 'Test',
      description: 'Description',
      priority: 'Low'
    });
    
    await simulateDatabaseFailure();
    
    await expect(
      ticketService.updateTicket(ticket.id, { title: 'Updated' })
    ).rejects.toThrow();
    
    await restoreDatabase();
    
    const retrieved = await ticketService.getTicket(ticket.id);
    expect(retrieved.title).toBe('Test'); // Original value preserved
  });
});
```

### Concurrency Tests

```typescript
test('Concurrent ticket creation generates unique IDs', async () => {
  const createPromises = Array(10).fill(null).map(() => 
    ticketService.createTicket({
      title: 'Concurrent test',
      description: 'Testing concurrent creation',
      priority: 'Low'
    })
  );
  
  const tickets = await Promise.all(createPromises);
  const ids = tickets.map(t => t.id);
  const uniqueIds = new Set(ids);
  
  expect(uniqueIds.size).toBe(10); // All IDs unique
});
```

### Coverage Focus
- Database connection failures
- Transaction rollback scenarios
- Concurrent operations
- System restarts and data integrity
- Audit log creation
- Connection pool behavior

---

## API End-to-End Testing

### Purpose
- Verify complete HTTP request/response flows
- Test authentication integration
- Validate error response formats
- Test real API client usage patterns

### Framework: Supertest

```typescript
describe('Ticket API End-to-End Tests', () => {
  test('POST /api/v1/tickets creates ticket and returns 201', async () => {
    const response = await request(app)
      .post('/api/v1/tickets')
      .send({
        title: 'API Test Ticket',
        description: 'Testing API endpoint',
        priority: 'Medium'
      })
      .set('Authorization', `Bearer ${testToken}`)
      .expect(201);
    
    expect(response.body).toMatchObject({
      id: expect.any(String),
      title: 'API Test Ticket',
      state: 'Open',
      assignee: null
    });
  });
  
  test('PATCH /api/v1/tickets/:id/state with invalid transition returns 422', async () => {
    const ticket = await createTicket();
    
    const response = await request(app)
      .patch(`/api/v1/tickets/${ticket.id}/state`)
      .send({ state: 'Closed' }) // Invalid: Open -> Closed
      .set('Authorization', `Bearer ${testToken}`)
      .expect(422);
    
    expect(response.body.error.code).toBe('INVALID_TRANSITION');
  });
});
```

### Coverage Focus
- All 9 API endpoints
- Success responses (200, 201)
- Error responses (400, 404, 422, 500, 503)
- Request/response body formats
- HTTP status codes
- Authentication handling

---

## Test Coverage Goals

| Component | Target | Type | Focus |
|-----------|--------|------|-------|
| Backend Validator | 100% | Property + Unit | All validation rules and error paths |
| State Machine | 100% | Property + Unit | All valid/invalid transitions |
| Ticket Service | 90%+ | Property + Unit | Core operations and error handling |
| Comment Service | 90%+ | Property + Unit | Creation and retrieval logic |
| Search Service | 85%+ | Property + Unit | Search algorithms and filters |
| Data Store | 80%+ | Integration | CRUD operations with real database |
| API Layer | 90%+ | API Tests | All endpoints and error responses |

---

## Test Execution Strategy

### Development Phase

```bash
# Fast feedback loop (< 2 minutes)
npm test:fast
# Runs property tests (100 iterations) + unit tests
# Skips integration tests

# Full test suite (< 10 minutes)
npm test
# Runs all tests including integration
# Properties run with 100 iterations

# Coverage report
npm test:coverage
# Generates coverage report
# Fails if below thresholds
```

### Pre-Commit Hooks
- Run fast test suite
- Run linter (ESLint)
- Run type checker (TypeScript)
- Run formatter (Prettier)

### Continuous Integration

```yaml
# GitHub Actions / GitLab CI
on: [push, pull_request]

jobs:
  test:
    steps:
      - Run unit tests
      - Run property tests (100 iterations)
      - Run integration tests
      - Run API tests
      - Upload coverage report
      - Fail if coverage < 85%
```

### Pre-Release Testing

```bash
# Extended property tests (1000+ iterations)
npm test:property:extended

# Load testing
npm test:load

# Security scanning
npm audit
npm run security:scan

# E2E tests
npm test:e2e
```

---

## Test Data Management

### Test Database
- Use Docker container with PostgreSQL
- Fresh database for each test suite
- Seed data scripts for consistent state
- Isolated from development and production databases

### Test Data Generators
```typescript
// Reusable test data builders
const testTicket = (overrides = {}) => ({
  title: 'Test Ticket',
  description: 'This is a test ticket description',
  priority: 'Medium',
  ...overrides
});

const createTestTicket = async (overrides = {}) => {
  return ticketService.createTicket(testTicket(overrides));
};
```

### Cleanup
- Database cleared before each test suite
- Transactions rolled back in integration tests (optional)
- Test data isolated per test when needed

---

## Test Organization

### File Structure
```
src/tests/
├── unit/
│   ├── services/
│   │   ├── ticket.service.test.ts
│   │   ├── comment.service.test.ts
│   │   └── search.service.test.ts
│   ├── validators/
│   │   └── backend-validator.test.ts
│   └── state-machine/
│       └── ticket-state-machine.test.ts
├── property/
│   ├── ticket-operations.property.test.ts
│   ├── state-transitions.property.test.ts
│   ├── assignments.property.test.ts
│   ├── comments.property.test.ts
│   └── search-filter.property.test.ts
├── integration/
│   ├── database.integration.test.ts
│   ├── transactions.integration.test.ts
│   └── concurrency.integration.test.ts
├── api/
│   ├── ticket-endpoints.api.test.ts
│   ├── comment-endpoints.api.test.ts
│   └── search-endpoints.api.test.ts
└── helpers/
    ├── test-data.ts
    ├── database-helpers.ts
    └── api-helpers.ts
```

### Naming Conventions
- `*.test.ts` - Unit tests
- `*.property.test.ts` - Property-based tests
- `*.integration.test.ts` - Integration tests
- `*.api.test.ts` - API end-to-end tests

---

## Property Test Tagging

Each property test MUST include a tag comment:

```typescript
test('Property 1: Ticket creation round-trip', async () => {
  // Feature: support-ticket-management-system, Property 1: Ticket creation round-trip
  // Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.7, 10.1
  
  await fc.assert(/* ... */);
});
```

**Benefits:**
- Traceability from property → test → requirements
- Easy filtering of property tests
- Documentation in test code
- Coverage analysis by property

---

## Performance Testing

### Load Testing (Future)
- Simulate 50 concurrent users
- Measure response times (p50, p95, p99)
- Verify performance targets:
  - List tickets: < 2s
  - Create ticket: < 1s
  - Search: < 3s

### Stress Testing (Future)
- Test with 100,000 tickets (max volume)
- Verify database query performance
- Check connection pool behavior
- Monitor memory usage

---

## Security Testing

### Input Validation
- Test SQL injection attempts
- Test XSS payload injection
- Test path traversal attacks
- Verify input sanitization

### Authentication
- Test missing auth token (401)
- Test invalid auth token (401)
- Test expired token handling

### Authorization (Future)
- Test role-based access control
- Test resource ownership validation

---

## Test Reporting

### Coverage Reports
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage
- Minimum threshold: 85% overall

### Test Results
- Total tests run
- Pass/fail counts
- Execution time
- Flaky test detection
- Property shrinking results

### Continuous Monitoring
- Track test execution time trends
- Identify slow tests
- Monitor flaky test patterns
- Alert on coverage drops

---

## Debugging Failed Tests

### Property Test Failures
1. fast-check provides minimal failing case (shrinking)
2. Use `.only()` to run failing property in isolation
3. Add logging to see generated values
4. Increase `seed` to reproduce exact failure
5. Reduce `numRuns` to 1 with specific seed

### Integration Test Failures
1. Check database state
2. Review transaction logs
3. Verify test isolation
4. Check for race conditions
5. Review docker container logs

### Flaky Tests
1. Identify non-deterministic behavior
2. Check timing issues (add proper waits)
3. Verify test isolation (shared state?)
4. Review async/await usage
5. Add retry logic if appropriate

---

## Best Practices

### Do
✅ Test behavior, not implementation  
✅ Use property-based tests for universal properties  
✅ Keep tests fast (< 100ms per unit test)  
✅ Write descriptive test names  
✅ Use test data builders  
✅ Test happy path and error paths  
✅ Clean up test data  

### Don't
❌ Test private methods directly  
❌ Mock everything (prefer real dependencies when fast)  
❌ Write brittle tests (coupled to implementation)  
❌ Ignore flaky tests  
❌ Skip edge cases  
❌ Leave commented-out tests  

---

## Summary

**Total Tests Planned**: 66+ tasks include 25 property test tasks
- **38 Property-Based Tests**: Universal correctness properties
- **~50 Unit Tests**: Specific examples and edge cases
- **~20 Integration Tests**: Database and system behavior
- **~15 API Tests**: End-to-end HTTP validation

**Estimated Coverage**: 85-90% overall with 100% critical path coverage

**Testing Time Investment**:
- Property tests: ~2 minutes (100 iterations)
- Unit tests: ~1 minute
- Integration tests: ~3 minutes
- API tests: ~2 minutes
- **Total**: ~8 minutes for full suite

**Quality Assurance**: Every requirement has corresponding tests, every property is validated, every API endpoint is tested.
