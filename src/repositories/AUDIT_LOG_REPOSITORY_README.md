# Audit Log Repository

## Overview

The `AuditLogRepository` provides methods for inserting audit records and finding audit records by ticket ID. This repository is critical for compliance and tracking all state-changing operations in the support ticket management system.

## Features

- **Insert Audit Entries**: Record operations performed on tickets for compliance tracking
- **Retrieve Audit History**: Get complete audit trail for tickets, users, or operations
- **Non-Blocking**: Audit log failures do not prevent main operations from succeeding
- **Transaction Support**: Can operate within database transactions for consistency

## Requirements Satisfied

- **Security Requirement 4**: Log all state-changing operations for audit purposes
- **Audit Trail**: Maintain comprehensive audit history for compliance
- **Data Retention**: Support minimum 2-year retention policy per compliance requirements

## Usage Examples

### Insert Audit Entry

```typescript
import { auditLogRepository } from './repositories';

// Record a ticket creation
await auditLogRepository.insertAuditEntry({
  ticketId: 'a1b2c3d4-...',
  operation: 'CREATE',
  userId: 'user@example.com'
});

// Record a state transition
await auditLogRepository.insertAuditEntry({
  ticketId: 'a1b2c3d4-...',
  operation: 'STATE_TRANSITION',
  userId: 'user@example.com',
  oldState: 'Open',
  newState: 'In_Progress'
});

// Record an update with changes
await auditLogRepository.insertAuditEntry({
  ticketId: 'a1b2c3d4-...',
  operation: 'UPDATE',
  userId: 'admin@example.com',
  changes: {
    title: 'Updated Title',
    priority: 'High'
  }
});
```

### Retrieve Audit History

```typescript
// Get all audit entries for a ticket
const auditHistory = await auditLogRepository.getAuditEntriesByTicketId('a1b2c3d4-...');
console.log(`Found ${auditHistory.length} audit entries`);

// Get all audit entries for a user
const userActivity = await auditLogRepository.getAuditEntriesByUserId('user@example.com');
console.log(`User performed ${userActivity.length} operations`);

// Get all audit entries for a specific operation type
const stateChanges = await auditLogRepository.getAuditEntriesByOperation('STATE_TRANSITION');
console.log(`Found ${stateChanges.length} state transitions`);
```

### Use with Transactions

```typescript
import { database } from './repositories';

const transaction = await database.beginTransaction();
try {
  // Perform main operation
  await ticketRepository.updateTicket(ticketId, updates, transaction);
  
  // Log the operation (non-blocking)
  await auditLogRepository.insertAuditEntry({
    ticketId,
    operation: 'UPDATE',
    userId: 'user@example.com',
    changes: updates
  }, transaction);
  
  await database.commitTransaction(transaction);
} catch (error) {
  await database.rollbackTransaction(transaction);
  throw error;
}
```

## API Reference

### `insertAuditEntry(entry, transaction?)`

Inserts an audit log entry into the database.

**Parameters:**
- `entry`: Object containing:
  - `ticketId` (string): UUID of the affected ticket
  - `operation` (string): Operation type ('CREATE', 'UPDATE', 'STATE_TRANSITION', 'ASSIGN', 'COMMENT')
  - `userId` (string): User who performed the operation
  - `oldState?` (string): Previous state (for STATE_TRANSITION operations)
  - `newState?` (string): New state (for STATE_TRANSITION operations)
  - `changes?` (object): JSON object with field changes (for UPDATE operations)
- `transaction?`: Optional transaction context

**Returns:** `Promise<void>`

**Note:** This method is non-blocking. If the insert fails, it logs an error but does not throw, ensuring that audit log failures don't break the main operation.

### `getAuditEntriesByTicketId(ticketId)`

Retrieves all audit log entries for a specific ticket, ordered by timestamp (newest first).

**Parameters:**
- `ticketId` (string): UUID of the ticket

**Returns:** `Promise<AuditLogEntry[]>`

**Throws:** `DatabaseError` if the database query fails

### `getAuditEntriesByUserId(userId)`

Retrieves all audit log entries for a specific user, ordered by timestamp (newest first).

**Parameters:**
- `userId` (string): User identifier

**Returns:** `Promise<AuditLogEntry[]>`

**Throws:** `DatabaseError` if the database query fails

### `getAuditEntriesByOperation(operation)`

Retrieves all audit log entries for a specific operation type, ordered by timestamp (newest first).

**Parameters:**
- `operation` (string): Operation type to filter by

**Returns:** `Promise<AuditLogEntry[]>`

**Throws:** `DatabaseError` if the database query fails

## Data Model

### AuditLogEntry Interface

```typescript
interface AuditLogEntry {
  id: string;                    // UUID (auto-generated)
  ticketId: string;              // UUID of affected ticket
  operation: string;             // Operation type
  userId: string;                // User who performed operation
  oldState?: string;             // Previous state (optional)
  newState?: string;             // New state (optional)
  changes?: Record<string, any>; // Field changes (optional)
  createdAt: Date;               // Timestamp (auto-generated)
}
```

## Database Schema

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  operation VARCHAR(50) NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'STATE_TRANSITION', 'ASSIGN', 'COMMENT')),
  user_id VARCHAR(100) NOT NULL,
  old_state VARCHAR(20),
  new_state VARCHAR(20),
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_audit_log_ticket_id ON audit_log(ticket_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_operation ON audit_log(operation);
```

## Error Handling

- **Insert Operations**: Failures are logged but do not throw exceptions (non-blocking behavior)
- **Read Operations**: Throw `DatabaseError` if the database query fails
- **Foreign Key Violations**: Caught and logged, but do not prevent audit logging from proceeding

## Design Decisions

### Non-Blocking Insert

The `insertAuditEntry` method is designed to be non-blocking. If an audit log insertion fails, it logs the error but does not throw an exception. This ensures that:

1. Audit log failures don't break main operations
2. The system remains operational even if audit logging is temporarily unavailable
3. Errors are logged for investigation and resolution

### Ordering

All retrieval methods return audit entries ordered by timestamp descending (newest first), making it easy to see the most recent activity.

### Transaction Support

The repository supports optional transaction contexts, allowing audit log insertions to be part of atomic database operations when needed.

## Testing

The repository includes comprehensive unit tests covering:

- Successful audit entry insertion (with and without transactions)
- Audit entries with all field combinations
- Non-blocking behavior on insert failures
- Retrieval by ticket ID, user ID, and operation type
- Empty result handling
- Error cases and exception handling

Run tests with:
```bash
npm test -- AuditLogRepository.test.ts
```

## Related Files

- **Implementation**: `src/repositories/AuditLogRepository.ts`
- **Tests**: `src/repositories/AuditLogRepository.test.ts`
- **Interface**: `src/repositories/DataStore.interface.ts`
- **Migration**: `database/schema-or-migrations/003_create_audit_log_table.sql`

## Task Completion

This repository completes **Task 2.6: Implement Audit Log Repository** from the implementation plan.
