# Data Model Specification

## Overview

The Support Ticket Management System uses a relational database model with PostgreSQL to ensure ACID compliance and data integrity. The model consists of three main tables with proper foreign key relationships and indexes for performance.

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│    TICKETS      │──────<│    COMMENTS     │
│                 │  1:N  │                 │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ title           │       │ ticket_id (FK)  │
│ description     │       │ text            │
│ priority        │       │ author          │
│ state           │       │ created_at      │
│ assignee        │       └─────────────────┘
│ created_at      │
│ updated_at      │       ┌─────────────────┐
└─────────────────┘       │   AUDIT_LOG     │
         │                │                 │
         └───────────────<│                 │
                    1:N   ├─────────────────┤
                          │ id (PK)         │
                          │ ticket_id (FK)  │
                          │ operation       │
                          │ user_id         │
                          │ old_state       │
                          │ new_state       │
                          │ changes (JSONB) │
                          │ created_at      │
                          └─────────────────┘
```

## Database Schema

### Tickets Table

**Purpose:** Core ticket entity storing all ticket information and state.

```sql
CREATE TABLE tickets (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Fields
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  state VARCHAR(20) NOT NULL CHECK (state IN ('Open', 'In_Progress', 'Resolved', 'Closed', 'Cancelled')),
  assignee VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
  CONSTRAINT description_not_empty CHECK (LENGTH(TRIM(description)) > 0)
);

-- Indexes for Performance
CREATE INDEX idx_tickets_state ON tickets(state);
CREATE INDEX idx_tickets_assignee ON tickets(assignee);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_search ON tickets USING GIN(to_tsvector('english', title || ' ' || description));
```

**Field Descriptions:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL | Unique ticket identifier, auto-generated |
| title | VARCHAR(200) | NOT NULL, non-empty | Short ticket title |
| description | TEXT | NOT NULL, non-empty | Detailed ticket description |
| priority | VARCHAR(20) | NOT NULL, CHECK constraint | Low, Medium, High, or Critical |
| state | VARCHAR(20) | NOT NULL, CHECK constraint | Current lifecycle state |
| assignee | VARCHAR(100) | NULLABLE | User ID of assigned team member |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW | Ticket creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW | Last update timestamp |

**Business Rules:**
- Title must be 1-200 characters, non-empty after trimming
- Description must be 1-5000 characters, non-empty after trimming
- Priority must be one of: Low, Medium, High, Critical
- State must be one of: Open, In_Progress, Resolved, Closed, Cancelled
- Assignee is nullable (unassigned tickets)
- ID is immutable after creation
- created_at is immutable after creation

---

### Comments Table

**Purpose:** Stores collaborative comments associated with tickets.

```sql
CREATE TABLE comments (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  
  -- Core Fields
  text TEXT NOT NULL,
  author VARCHAR(100) NOT NULL,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT text_not_empty CHECK (LENGTH(TRIM(text)) > 0)
);

-- Indexes for Performance
CREATE INDEX idx_comments_ticket_id ON comments(ticket_id);
CREATE INDEX idx_comments_created_at ON comments(ticket_id, created_at);
```

**Field Descriptions:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL | Unique comment identifier |
| ticket_id | UUID | FOREIGN KEY, NOT NULL | Reference to parent ticket |
| text | TEXT | NOT NULL, non-empty | Comment content |
| author | VARCHAR(100) | NOT NULL | User ID of comment author |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW | Comment creation timestamp |

**Business Rules:**
- Text must be 1-2000 characters, non-empty after trimming
- Author must be valid user identifier
- Comments are immutable (no updates or deletes)
- Comments are cascade deleted when parent ticket is deleted
- Comments maintain chronological order by created_at

---

### Audit Log Table

**Purpose:** Maintains audit trail of all state-changing operations for compliance.

```sql
CREATE TABLE audit_log (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  
  -- Audit Fields
  operation VARCHAR(50) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  old_state VARCHAR(20),
  new_state VARCHAR(20),
  changes JSONB,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_audit_log_ticket_id ON audit_log(ticket_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

**Field Descriptions:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL | Unique audit entry identifier |
| ticket_id | UUID | FOREIGN KEY, NOT NULL | Reference to affected ticket |
| operation | VARCHAR(50) | NOT NULL | Operation type (CREATE, UPDATE, etc.) |
| user_id | VARCHAR(100) | NOT NULL | User who performed operation |
| old_state | VARCHAR(20) | NULLABLE | Previous state (for transitions) |
| new_state | VARCHAR(20) | NULLABLE | New state (for transitions) |
| changes | JSONB | NULLABLE | JSON object with field changes |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW | Audit entry timestamp |

**Operation Types:**
- `CREATE` - Ticket creation
- `UPDATE` - Field updates (title, description, priority)
- `STATE_TRANSITION` - State changes
- `ASSIGN` - Assignment/reassignment operations
- `COMMENT` - Comment additions

**Business Rules:**
- All state-changing operations must be logged
- Audit entries are immutable (append-only)
- Minimum 2-year retention required for compliance
- old_state and new_state populated for STATE_TRANSITION operations
- changes field contains JSON with modified fields for UPDATE operations

---

## Domain Models (TypeScript)

### Ticket Entity

```typescript
interface Ticket {
  id: string                    // UUID
  title: string                 // 1-200 characters
  description: string           // 1-5000 characters
  priority: Priority           // Enum: Low, Medium, High, Critical
  state: TicketState           // Enum: Open, In_Progress, Resolved, Closed, Cancelled
  assignee: string | null      // User identifier or null
  createdAt: Date              // ISO8601 timestamp
  updatedAt: Date              // ISO8601 timestamp
}

enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

enum TicketState {
  Open = 'Open',
  InProgress = 'In_Progress',
  Resolved = 'Resolved',
  Closed = 'Closed',
  Cancelled = 'Cancelled'
}
```

### Comment Entity

```typescript
interface Comment {
  id: string                    // UUID
  ticketId: string             // UUID of parent ticket
  text: string                 // 1-2000 characters
  author: string               // User identifier
  createdAt: Date              // ISO8601 timestamp
}
```

### Audit Log Entry

```typescript
interface AuditLogEntry {
  id: string                    // UUID
  ticketId: string             // UUID of affected ticket
  operation: AuditOperation    // Enum: CREATE, UPDATE, STATE_TRANSITION, ASSIGN, COMMENT
  userId: string               // User who performed operation
  oldState?: TicketState       // Previous state (for transitions)
  newState?: TicketState       // New state (for transitions)
  changes?: Record<string, any> // JSON object with field changes
  createdAt: Date              // ISO8601 timestamp
}

enum AuditOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  STATE_TRANSITION = 'STATE_TRANSITION',
  ASSIGN = 'ASSIGN',
  COMMENT = 'COMMENT'
}
```

---

## Relationships

### One-to-Many: Tickets → Comments
- One ticket can have zero or more comments
- Each comment belongs to exactly one ticket
- Comments are cascade deleted when ticket is deleted
- Foreign key: `comments.ticket_id → tickets.id`

### One-to-Many: Tickets → Audit Log
- One ticket can have many audit log entries
- Each audit entry is associated with one ticket
- Audit entries are cascade deleted when ticket is deleted (rare)
- Foreign key: `audit_log.ticket_id → tickets.id`

---

## Data Integrity Constraints

### Primary Keys
- All tables use UUID primary keys for global uniqueness
- UUIDs auto-generated using `gen_random_uuid()`
- Prevents sequential enumeration attacks

### Foreign Keys
- All foreign keys enforce referential integrity
- CASCADE DELETE ensures orphaned records are cleaned up
- Prevents dangling references

### Check Constraints
- Priority values limited to enum (Low, Medium, High, Critical)
- State values limited to enum (Open, In_Progress, Resolved, Closed, Cancelled)
- Text fields cannot be empty after trimming
- Validates data at database level (defense in depth)

### Indexes
- **B-tree indexes** on frequently filtered columns (state, assignee, created_at)
- **GIN index** for full-text search on title + description
- **Compound index** on (ticket_id, created_at) for comment retrieval
- Improves query performance for common operations

---

## State Management

### Valid State Transitions

```
Open ───────────────────────────> In_Progress ─────────> Resolved ───────> Closed
 │                                      │
 │                                      │
 └──────> Cancelled <───────────────────┘
```

**Transition Rules:**
- Open → In_Progress ✓
- Open → Cancelled ✓
- In_Progress → Resolved ✓
- In_Progress → Cancelled ✓
- Resolved → Closed ✓
- All other transitions → Invalid ✗

**Terminal States:**
- Closed (final state, no outgoing transitions)
- Cancelled (final state, no outgoing transitions)

---

## Performance Considerations

### Index Strategy
1. **State Index** - Fast filtering by ticket state
2. **Assignee Index** - Quick lookup of assigned tickets
3. **Created Date Index** - Efficient chronological ordering
4. **Full-Text Index** - Fast keyword search across title/description
5. **Comment Lookup Index** - Optimized comment retrieval per ticket

### Query Optimization
- Use prepared statements for repeated queries
- Limit result sets with pagination (future enhancement)
- Avoid N+1 queries when fetching tickets with comments
- Use connection pooling (10-20 connections recommended)

### Data Volume Estimates
- **Tickets**: ~100,000 tickets maximum (as per assumptions)
- **Comments**: ~5 comments per ticket average = 500,000 comments
- **Audit Log**: ~10 entries per ticket = 1,000,000 audit entries
- **Total Storage**: ~500MB-1GB estimated

---

## Migration Strategy

### Initial Setup
1. Create tables in order: tickets, comments, audit_log
2. Create indexes after initial data load
3. Verify constraints with sample data

### Version Control
- Use migration tool (db-migrate, Flyway, or TypeORM migrations)
- Each schema change gets a versioned migration file
- Migrations are idempotent (can be re-run safely)

### Rollback Plan
- Keep rollback migrations for each forward migration
- Test rollbacks in staging before production
- Maintain database backups before major migrations

---

## Data Validation

### Application Layer (Backend)
- Validate all input before database operations
- Enforce business rules (state transitions)
- Check field lengths and formats
- Sanitize input to prevent injection

### Database Layer
- CHECK constraints enforce enum values
- NOT NULL constraints prevent missing data
- Foreign key constraints ensure referential integrity
- Unique constraints prevent duplicates

**Defense in Depth:** Both layers validate to ensure data integrity even if one fails.

---

## Backup and Recovery

### Backup Strategy
- Daily full backups of database
- Continuous Write-Ahead Log (WAL) archiving
- Minimum 2-year retention for audit compliance
- Test restore procedures monthly

### Disaster Recovery
- Recovery Point Objective (RPO): 24 hours
- Recovery Time Objective (RTO): 4 hours
- Automated backup verification
- Cross-region backup replication (production)

---

## Summary

**Tables:** 3 (tickets, comments, audit_log)  
**Relationships:** 2 one-to-many relationships  
**Indexes:** 7 total (5 B-tree, 2 composite)  
**Constraints:** Foreign keys, check constraints, NOT NULL  
**Data Integrity:** ACID compliance via PostgreSQL  
**Performance:** Optimized for common query patterns  
**Audit Trail:** Complete audit logging for compliance
