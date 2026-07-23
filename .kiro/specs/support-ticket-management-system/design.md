# Technical Design Document

## Overview

The Support Ticket Management System is a RESTful web application that provides comprehensive ticket lifecycle management for internal support teams. The system enables ticket creation, assignment, state management, commenting, and search capabilities through a clean separation of concerns between frontend, backend business logic, and data persistence layers.

### Core Capabilities

- **Ticket Lifecycle Management**: Create, read, update tickets with enforced state machine transitions
- **Assignment Management**: Assign tickets to team members with flexible reassignment
- **Collaborative Features**: Add timestamped comments for team communication
- **Search and Filter**: Keyword search and status-based filtering
- **Data Integrity**: Backend validation and ACID-compliant persistence
- **Error Handling**: Comprehensive validation with descriptive error responses

### Key Design Principles

1. **Backend Validation First**: All data validation occurs on the backend regardless of client behavior
2. **Immutable Audit Trail**: Comments and ticket IDs are immutable once created
3. **State Machine Enforcement**: Strict validation of ticket state transitions
4. **RESTful API Design**: Clean, predictable API following REST conventions
5. **Database-Backed Persistence**: ACID-compliant relational database for data integrity

### Technology Context

- **API Architecture**: RESTful HTTP API with JSON payloads
- **Database**: Relational database (PostgreSQL recommended) for ACID compliance
- **Deployment**: Containerized using Docker for cloud deployment
- **Authentication**: External identity provider (out of scope for implementation)

## Architecture

### High-Level Architecture

```mermaid
graph TB
    Client[Web Browser/Client] -->|HTTP/JSON| API[REST API Layer]
    API --> Validator[Backend Validator]
    API --> Router[Request Router]
    
    Router --> TicketService[Ticket Service]
    Router --> CommentService[Comment Service]
    Router --> SearchService[Search Service]
    
    Validator -.validates.-> TicketService
    Validator -.validates.-> CommentService
    Validator -.validates.-> SearchService
    
    TicketService --> DataStore[Data Store Layer]
    CommentService --> DataStore
    SearchService --> DataStore
    
    DataStore --> DB[(PostgreSQL Database)]
    
    API --> ErrorHandler[Error Handler]
    ErrorHandler --> Logger[Audit Logger]
```

### Component Breakdown

**1. REST API Layer**
- Handles HTTP request/response lifecycle
- Routes requests to appropriate service
- Manages authentication token validation
- Coordinates error handling and response formatting

**2. Backend Validator**
- Validates all incoming request payloads
- Enforces business rules (state transitions, required fields)
- Validates data types, formats, and constraints
- Returns descriptive validation errors

**3. Ticket Service**
- Implements core ticket operations (CRUD)
- Enforces state machine transitions
- Manages ticket assignment logic
- Coordinates with data store for persistence

**4. Comment Service**
- Handles comment creation and retrieval
- Ensures comment immutability
- Maintains chronological ordering

**5. Search Service**
- Implements keyword search across title/description
- Provides status-based filtering
- Handles search query sanitization

**6. Data Store Layer**
- Abstracts database operations
- Implements repository pattern for tickets and comments
- Manages transactions and rollback logic
- Handles connection pooling and error recovery

**7. Error Handler**
- Catches and formats all system errors
- Maps internal errors to appropriate HTTP status codes
- Sanitizes error messages for client consumption
- Logs detailed error information

**8. Audit Logger**
- Records all state-changing operations
- Captures user identity, timestamp, and operation details
- Supports compliance and troubleshooting

### Data Flow Examples

**Create Ticket Flow:**
```
Client → API (POST /tickets) → Validator → Ticket Service → Data Store → Database
Database → Data Store → Ticket Service → API → Client (201 Created + ticket object)
```

**State Transition Flow:**
```
Client → API (PATCH /tickets/{id}/state) → Validator (check valid transition) 
→ Ticket Service (update state) → Data Store → Database
→ Audit Logger (log state change) → API → Client (200 OK + updated ticket)
```

**Search Flow:**
```
Client → API (GET /tickets?search=keyword) → Validator (sanitize keyword)
→ Search Service (query database) → Data Store → Database
→ Search Service → API → Client (200 OK + ticket list)
```

## Components and Interfaces

### REST API Endpoints

#### 1. Create Ticket

**Endpoint:** `POST /api/v1/tickets`

**Request Body:**
```json
{
  "title": "string (required, 1-200 characters)",
  "description": "string (required, 1-5000 characters)",
  "priority": "string (required, enum: Low|Medium|High|Critical)"
}
```

**Success Response:** `201 Created`
```json
{
  "id": "string (UUID)",
  "title": "string",
  "description": "string",
  "priority": "string",
  "state": "Open",
  "assignee": null,
  "createdAt": "ISO8601 timestamp",
  "updatedAt": "ISO8601 timestamp"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or missing required fields
- `500 Internal Server Error` - System error

#### 2. List All Tickets

**Endpoint:** `GET /api/v1/tickets`

**Query Parameters:** None (filtering handled by separate endpoints)

**Success Response:** `200 OK`
```json
{
  "tickets": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "priority": "string",
      "state": "string",
      "assignee": "string|null",
      "createdAt": "ISO8601 timestamp",
      "updatedAt": "ISO8601 timestamp"
    }
  ],
  "count": "integer"
}
```

**Error Responses:**
- `500 Internal Server Error` - Database unavailable

#### 3. Get Ticket Details

**Endpoint:** `GET /api/v1/tickets/{id}`

**Path Parameters:**
- `id` - Ticket UUID

**Success Response:** `200 OK`
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "priority": "string",
  "state": "string",
  "assignee": "string|null",
  "createdAt": "ISO8601 timestamp",
  "updatedAt": "ISO8601 timestamp",
  "comments": [
    {
      "id": "string",
      "text": "string",
      "author": "string",
      "createdAt": "ISO8601 timestamp"
    }
  ]
}
```

**Error Responses:**
- `404 Not Found` - Ticket ID does not exist
- `400 Bad Request` - Invalid ticket ID format

#### 4. Update Ticket

**Endpoint:** `PATCH /api/v1/tickets/{id}`

**Path Parameters:**
- `id` - Ticket UUID

**Request Body (all fields optional):**
```json
{
  "title": "string (1-200 characters)",
  "description": "string (1-5000 characters)",
  "priority": "string (enum: Low|Medium|High|Critical)"
}
```

**Success Response:** `200 OK`
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "priority": "string",
  "state": "string",
  "assignee": "string|null",
  "createdAt": "ISO8601 timestamp",
  "updatedAt": "ISO8601 timestamp"
}
```

**Error Responses:**
- `404 Not Found` - Ticket ID does not exist
- `400 Bad Request` - Invalid field values or ticket ID format

#### 5. Assign Ticket

**Endpoint:** `PATCH /api/v1/tickets/{id}/assignee`

**Path Parameters:**
- `id` - Ticket UUID

**Request Body:**
```json
{
  "assignee": "string (user identifier)|null"
}
```

**Success Response:** `200 OK`
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "priority": "string",
  "state": "string",
  "assignee": "string|null",
  "createdAt": "ISO8601 timestamp",
  "updatedAt": "ISO8601 timestamp"
}
```

**Error Responses:**
- `404 Not Found` - Ticket ID does not exist
- `400 Bad Request` - Invalid assignee identifier
- `403 Forbidden` - Cannot assign closed/cancelled tickets

#### 6. Transition Ticket State

**Endpoint:** `PATCH /api/v1/tickets/{id}/state`

**Path Parameters:**
- `id` - Ticket UUID

**Request Body:**
```json
{
  "state": "string (enum: Open|In_Progress|Resolved|Closed|Cancelled)"
}
```

**Success Response:** `200 OK`
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "priority": "string",
  "state": "string",
  "assignee": "string|null",
  "createdAt": "ISO8601 timestamp",
  "updatedAt": "ISO8601 timestamp"
}
```

**Error Responses:**
- `404 Not Found` - Ticket ID does not exist
- `400 Bad Request` - Invalid state transition (e.g., Open → Closed)
- `422 Unprocessable Entity` - Invalid state value

#### 7. Add Comment

**Endpoint:** `POST /api/v1/tickets/{id}/comments`

**Path Parameters:**
- `id` - Ticket UUID

**Request Body:**
```json
{
  "text": "string (required, 1-2000 characters)",
  "author": "string (required, user identifier)"
}
```

**Success Response:** `201 Created`
```json
{
  "id": "string (UUID)",
  "ticketId": "string",
  "text": "string",
  "author": "string",
  "createdAt": "ISO8601 timestamp"
}
```

**Error Responses:**
- `404 Not Found` - Ticket ID does not exist
- `400 Bad Request` - Empty/whitespace-only text or missing fields

#### 8. Search Tickets

**Endpoint:** `GET /api/v1/tickets/search`

**Query Parameters:**
- `q` - Search keyword (required, non-empty)

**Success Response:** `200 OK`
```json
{
  "tickets": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "priority": "string",
      "state": "string",
      "assignee": "string|null",
      "createdAt": "ISO8601 timestamp",
      "updatedAt": "ISO8601 timestamp"
    }
  ],
  "count": "integer",
  "query": "string"
}
```

**Error Responses:**
- `400 Bad Request` - Empty or whitespace-only query

#### 9. Filter Tickets by Status

**Endpoint:** `GET /api/v1/tickets/filter`

**Query Parameters:**
- `state` - State value (required, enum: Open|In_Progress|Resolved|Closed|Cancelled)

**Success Response:** `200 OK`
```json
{
  "tickets": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "priority": "string",
      "state": "string",
      "assignee": "string|null",
      "createdAt": "ISO8601 timestamp",
      "updatedAt": "ISO8601 timestamp"
    }
  ],
  "count": "integer",
  "filter": "string"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid state value

### Internal Component Interfaces

#### Backend Validator Interface

```typescript
interface Validator {
  validateTicketCreation(payload: CreateTicketRequest): ValidationResult
  validateTicketUpdate(payload: UpdateTicketRequest): ValidationResult
  validateStateTransition(currentState: State, newState: State): ValidationResult
  validateAssignment(assignee: string | null): ValidationResult
  validateComment(text: string): ValidationResult
  validateSearchQuery(query: string): ValidationResult
  validateStateFilter(state: string): ValidationResult
}

type ValidationResult = 
  | { valid: true }
  | { valid: false; errors: ValidationError[] }

interface ValidationError {
  field: string
  message: string
  code: string
}
```

#### Ticket Service Interface

```typescript
interface TicketService {
  createTicket(request: CreateTicketRequest): Promise<Ticket>
  getTicket(id: string): Promise<Ticket | null>
  listTickets(): Promise<Ticket[]>
  updateTicket(id: string, updates: Partial<TicketUpdates>): Promise<Ticket>
  transitionState(id: string, newState: State): Promise<Ticket>
  assignTicket(id: string, assignee: string | null): Promise<Ticket>
}
```

#### Comment Service Interface

```typescript
interface CommentService {
  addComment(ticketId: string, text: string, author: string): Promise<Comment>
  getComments(ticketId: string): Promise<Comment[]>
}
```

#### Search Service Interface

```typescript
interface SearchService {
  searchByKeyword(query: string): Promise<Ticket[]>
  filterByState(state: State): Promise<Ticket[]>
}
```

#### Data Store Interface

```typescript
interface DataStore {
  // Ticket operations
  insertTicket(ticket: Ticket): Promise<void>
  updateTicket(id: string, updates: Partial<Ticket>): Promise<void>
  findTicketById(id: string): Promise<Ticket | null>
  findAllTickets(): Promise<Ticket[]>
  searchTickets(query: string): Promise<Ticket[]>
  filterTicketsByState(state: State): Promise<Ticket[]>
  
  // Comment operations
  insertComment(comment: Comment): Promise<void>
  findCommentsByTicketId(ticketId: string): Promise<Comment[]>
  
  // Transaction support
  beginTransaction(): Promise<Transaction>
  commitTransaction(tx: Transaction): Promise<void>
  rollbackTransaction(tx: Transaction): Promise<void>
}
```

## Data Models

### Database Schema

#### Tickets Table

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  state VARCHAR(20) NOT NULL CHECK (state IN ('Open', 'In_Progress', 'Resolved', 'Closed', 'Cancelled')),
  assignee VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
  CONSTRAINT description_not_empty CHECK (LENGTH(TRIM(description)) > 0)
);

CREATE INDEX idx_tickets_state ON tickets(state);
CREATE INDEX idx_tickets_assignee ON tickets(assignee);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_search ON tickets USING GIN(to_tsvector('english', title || ' ' || description));
```

#### Comments Table

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  author VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT text_not_empty CHECK (LENGTH(TRIM(text)) > 0)
);

CREATE INDEX idx_comments_ticket_id ON comments(ticket_id);
CREATE INDEX idx_comments_created_at ON comments(ticket_id, created_at);
```

#### Audit Log Table

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  operation VARCHAR(50) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  old_state VARCHAR(20),
  new_state VARCHAR(20),
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_ticket_id ON audit_log(ticket_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

### Entity Relationships

```mermaid
erDiagram
    TICKETS ||--o{ COMMENTS : "has"
    TICKETS ||--o{ AUDIT_LOG : "tracks"
    
    TICKETS {
        uuid id PK
        varchar title
        text description
        varchar priority
        varchar state
        varchar assignee
        timestamp created_at
        timestamp updated_at
    }
    
    COMMENTS {
        uuid id PK
        uuid ticket_id FK
        text text
        varchar author
        timestamp created_at
    }
    
    AUDIT_LOG {
        uuid id PK
        uuid ticket_id FK
        varchar operation
        varchar user_id
        varchar old_state
        varchar new_state
        jsonb changes
        timestamp created_at
    }
```

### Domain Models

#### Ticket Entity

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

#### Comment Entity

```typescript
interface Comment {
  id: string                    // UUID
  ticketId: string             // UUID of parent ticket
  text: string                 // 1-2000 characters
  author: string               // User identifier
  createdAt: Date              // ISO8601 timestamp
}
```

#### Audit Log Entry

```typescript
interface AuditLogEntry {
  id: string                    // UUID
  ticketId: string             // UUID of affected ticket
  operation: string            // e.g., "CREATE", "UPDATE_STATE", "ASSIGN"
  userId: string               // User who performed operation
  oldState?: TicketState       // Previous state (for state transitions)
  newState?: TicketState       // New state (for state transitions)
  changes?: Record<string, any> // JSON object with field changes
  createdAt: Date              // ISO8601 timestamp
}
```

### Validation Rules

#### Ticket Creation Validation

- **title**: Required, 1-200 characters, non-empty after trimming
- **description**: Required, 1-5000 characters, non-empty after trimming
- **priority**: Required, must be one of: Low, Medium, High, Critical
- **state**: Automatically set to "Open" (not user-provided)
- **assignee**: Not allowed in creation request (must be null initially)

#### Ticket Update Validation

- **title**: Optional, 1-200 characters if provided, non-empty after trimming
- **description**: Optional, 1-5000 characters if provided, non-empty after trimming
- **priority**: Optional, must be valid Priority value if provided
- **state**: Cannot be updated via general update endpoint (use state transition endpoint)
- **assignee**: Cannot be updated via general update endpoint (use assignment endpoint)
- **id**: Immutable, cannot be changed
- **createdAt**: Immutable, cannot be changed

#### State Transition Validation

Valid transitions enforced by state machine:
- Open → In_Progress ✓
- Open → Cancelled ✓
- In_Progress → Resolved ✓
- In_Progress → Cancelled ✓
- Resolved → Closed ✓
- All other transitions → Invalid ✗

Terminal states (no outgoing transitions):
- Closed (final state)
- Cancelled (final state)

#### Assignment Validation

- **assignee**: Can be a valid user identifier string or null (for unassignment)
- Cannot assign tickets in Closed or Cancelled states
- User identifier must match expected format (e.g., email, username, or UUID)

#### Comment Validation

- **text**: Required, 1-2000 characters, non-empty after trimming
- **author**: Required, valid user identifier
- **ticketId**: Must reference an existing ticket
- Comments are immutable after creation (no updates or deletes)

#### Search Validation

- **query**: Required, non-empty, non-whitespace-only
- Special characters are treated as literal (no regex injection)
- Search is case-insensitive
- Searches both title and description fields

#### Filter Validation

- **state**: Required, must be a valid TicketState value
- Only single-state filtering supported (no multi-state queries)

## State Machine Implementation

### State Diagram

```mermaid
stateDiagram-v2
    [*] --> Open: Create Ticket
    
    Open --> In_Progress: Start Work
    Open --> Cancelled: Cancel
    
    In_Progress --> Resolved: Resolve Issue
    In_Progress --> Cancelled: Cancel
    
    Resolved --> Closed: Close Ticket
    
    Closed --> [*]
    Cancelled --> [*]
    
    note right of Closed
        Terminal State
        No further transitions
    end note
    
    note right of Cancelled
        Terminal State
        No further transitions
    end note
```

### State Transition Logic

```typescript
class TicketStateMachine {
  // Valid state transitions map
  private static readonly TRANSITIONS: Map<TicketState, TicketState[]> = new Map([
    [TicketState.Open, [TicketState.InProgress, TicketState.Cancelled]],
    [TicketState.InProgress, [TicketState.Resolved, TicketState.Cancelled]],
    [TicketState.Resolved, [TicketState.Closed]],
    [TicketState.Closed, []],
    [TicketState.Cancelled, []]
  ]);

  /**
   * Validates whether a state transition is allowed
   * @param currentState - Current ticket state
   * @param newState - Requested new state
   * @returns ValidationResult indicating if transition is valid
   */
  public validateTransition(
    currentState: TicketState, 
    newState: TicketState
  ): ValidationResult {
    const allowedTransitions = TicketStateMachine.TRANSITIONS.get(currentState);
    
    if (!allowedTransitions) {
      return {
        valid: false,
        errors: [{
          field: 'state',
          message: `Unknown current state: ${currentState}`,
          code: 'INVALID_STATE'
        }]
      };
    }
    
    if (allowedTransitions.length === 0) {
      return {
        valid: false,
        errors: [{
          field: 'state',
          message: `Ticket is in terminal state ${currentState}. No further transitions allowed.`,
          code: 'TERMINAL_STATE'
        }]
      };
    }
    
    if (!allowedTransitions.includes(newState)) {
      return {
        valid: false,
        errors: [{
          field: 'state',
          message: `Invalid state transition from ${currentState} to ${newState}. ` +
                   `Allowed transitions: ${allowedTransitions.join(', ')}`,
          code: 'INVALID_TRANSITION'
        }]
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Gets all valid next states for a given current state
   */
  public getValidNextStates(currentState: TicketState): TicketState[] {
    return TicketStateMachine.TRANSITIONS.get(currentState) || [];
  }
  
  /**
   * Checks if a state is terminal (no outgoing transitions)
   */
  public isTerminalState(state: TicketState): boolean {
    const transitions = TicketStateMachine.TRANSITIONS.get(state);
    return transitions !== undefined && transitions.length === 0;
  }
}
```

### State Transition Business Rules

**Rule 1: Terminal State Immutability**
- Once a ticket reaches Closed or Cancelled state, no further state transitions are permitted
- Attempts to transition from terminal states return error code `TERMINAL_STATE`

**Rule 2: Single-Step Transitions Only**
- State transitions must follow defined edges in the state diagram
- Multi-step jumps (e.g., Open → Resolved) are not allowed
- Ticket must progress through intermediate states (Open → In_Progress → Resolved)

**Rule 3: No Self-Transitions**
- Transitioning to the same state is not allowed (e.g., Open → Open)
- If ticket is already in target state, return validation error

**Rule 4: Assignment Independence**
- State transitions are independent of assignment status
- Tickets can transition states whether assigned or unassigned
- However, terminal states (Closed, Cancelled) cannot be assigned/reassigned

**Rule 5: Comment Preservation**
- State transitions do not affect associated comments
- All comments remain accessible regardless of ticket state

## Security Design

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthProvider
    participant Service
    
    Client->>API: Request + Auth Token
    API->>AuthProvider: Validate Token
    AuthProvider-->>API: User Identity
    API->>API: Extract User ID
    API->>Service: Process Request (with User Context)
    Service-->>API: Response
    API->>AuditLog: Log Operation
    API-->>Client: Response
```

### Authentication Requirements

1. **Token-Based Authentication**: All API requests must include a valid authentication token (JWT or opaque token)
2. **User Identity Extraction**: API layer extracts user identifier from validated token
3. **Request Context**: User identity is passed to all service layer operations for audit logging
4. **Token Validation**: Authentication is handled by external identity provider (out of implementation scope)

### Input Sanitization

**SQL Injection Prevention:**
- Use parameterized queries for all database operations
- Never concatenate user input directly into SQL strings
- Use ORM or query builder with proper escaping

**XSS Prevention:**
- Sanitize all text input before storage
- HTML-encode output when rendering in UI (frontend responsibility)
- Reject input containing malicious script patterns

**Path Traversal Prevention:**
- Validate ticket IDs against UUID format
- Reject IDs containing path traversal patterns (../, ..\, etc.)

**Command Injection Prevention:**
- Do not execute shell commands with user input
- Validate all input against expected formats

**Input Validation Rules:**
```typescript
class InputSanitizer {
  /**
   * Sanitizes text input by trimming and removing dangerous patterns
   */
  public sanitizeText(input: string): string {
    // Trim whitespace
    let sanitized = input.trim();
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Limit length
    sanitized = sanitized.substring(0, 5000);
    
    return sanitized;
  }
  
  /**
   * Validates UUID format
   */
  public isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
  
  /**
   * Sanitizes search query
   */
  public sanitizeSearchQuery(query: string): string {
    // Trim whitespace
    let sanitized = query.trim();
    
    // Escape special regex characters
    sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Limit length
    sanitized = sanitized.substring(0, 200);
    
    return sanitized;
  }
}
```

### Audit Logging

**Operations to Log:**
- Ticket creation (capture user, timestamp, ticket ID)
- Ticket updates (capture user, timestamp, changed fields)
- State transitions (capture user, old state, new state)
- Assignment operations (capture user, assignee change)
- Comment additions (capture user, ticket ID, comment ID)

**Audit Log Format:**
```typescript
interface AuditEntry {
  timestamp: Date
  userId: string
  operation: 'CREATE' | 'UPDATE' | 'STATE_TRANSITION' | 'ASSIGN' | 'COMMENT'
  ticketId: string
  details: Record<string, any>
}
```

**Retention Policy:**
- Audit logs retained for minimum 2 years per compliance requirements
- Logs stored in separate table with read-only access for support users
- Regular backup of audit logs to external storage

## Error Handling

### Error Response Format

All error responses follow a consistent JSON structure:

```typescript
interface ErrorResponse {
  error: {
    code: string              // Machine-readable error code
    message: string           // Human-readable error message
    details?: ValidationError[] // Optional validation details
    timestamp: string         // ISO8601 timestamp
    requestId: string         // Unique request identifier for tracing
  }
}
```

### HTTP Status Code Mapping

| Status Code | Usage | Examples |
|-------------|-------|----------|
| 400 Bad Request | Invalid input, validation failures | Missing required field, invalid state transition, empty search query |
| 404 Not Found | Resource does not exist | Ticket ID not found |
| 422 Unprocessable Entity | Invalid state value or business rule violation | Invalid priority value, transition from terminal state |
| 500 Internal Server Error | System errors | Database connection failure, unexpected exceptions |
| 503 Service Unavailable | Temporary service degradation | Database temporarily unavailable |

### Error Codes

```typescript
enum ErrorCode {
  // Validation errors (400)
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  FIELD_TOO_LONG = 'FIELD_TOO_LONG',
  FIELD_TOO_SHORT = 'FIELD_TOO_SHORT',
  WHITESPACE_ONLY = 'WHITESPACE_ONLY',
  INVALID_UUID_FORMAT = 'INVALID_UUID_FORMAT',
  
  // Resource errors (404)
  TICKET_NOT_FOUND = 'TICKET_NOT_FOUND',
  
  // Business rule violations (422)
  INVALID_PRIORITY = 'INVALID_PRIORITY',
  INVALID_STATE = 'INVALID_STATE',
  INVALID_TRANSITION = 'INVALID_TRANSITION',
  TERMINAL_STATE = 'TERMINAL_STATE',
  INVALID_ASSIGNEE = 'INVALID_ASSIGNEE',
  CANNOT_MODIFY_TERMINAL = 'CANNOT_MODIFY_TERMINAL',
  
  // System errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Service errors (503)
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_UNAVAILABLE = 'DATABASE_UNAVAILABLE'
}
```

### Error Response Examples

**Validation Error:**
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed for ticket creation request",
    "details": [
      {
        "field": "title",
        "message": "Title is required and cannot be empty",
        "code": "MISSING_REQUIRED_FIELD"
      },
      {
        "field": "priority",
        "message": "Priority must be one of: Low, Medium, High, Critical",
        "code": "INVALID_PRIORITY"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

**Resource Not Found:**
```json
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Ticket with ID 'a1b2c3d4-...' does not exist",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_xyz789"
  }
}
```

**Invalid State Transition:**
```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Invalid state transition from Open to Closed. Allowed transitions: In_Progress, Cancelled",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_def456"
  }
}
```

**Terminal State Modification:**
```json
{
  "error": {
    "code": "TERMINAL_STATE",
    "message": "Ticket is in terminal state Closed. No further transitions allowed.",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_ghi789"
  }
}
```

**Database Unavailable:**
```json
{
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "Database is temporarily unavailable. Please try again later.",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_jkl012"
  }
}
```

### Exception Handling Strategy

```typescript
class ErrorHandler {
  /**
   * Handles all exceptions and maps to appropriate HTTP responses
   */
  public handleError(error: Error, requestId: string): ErrorResponse {
    // Log full error details for troubleshooting
    this.logger.error('Request failed', {
      error: error.message,
      stack: error.stack,
      requestId
    });
    
    // Map to user-facing error response
    if (error instanceof ValidationError) {
      return this.createErrorResponse(
        400,
        ErrorCode.INVALID_INPUT,
        error.message,
        error.details,
        requestId
      );
    }
    
    if (error instanceof NotFoundError) {
      return this.createErrorResponse(
        404,
        ErrorCode.TICKET_NOT_FOUND,
        error.message,
        undefined,
        requestId
      );
    }
    
    if (error instanceof StateTransitionError) {
      return this.createErrorResponse(
        422,
        ErrorCode.INVALID_TRANSITION,
        error.message,
        undefined,
        requestId
      );
    }
    
    if (error instanceof DatabaseError) {
      // Don't expose internal database details
      return this.createErrorResponse(
        500,
        ErrorCode.DATABASE_ERROR,
        'An internal error occurred. Please try again later.',
        undefined,
        requestId
      );
    }
    
    // Default internal error response
    return this.createErrorResponse(
      500,
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred. Please contact support.',
      undefined,
      requestId
    );
  }
  
  /**
   * Creates standardized error response
   */
  private createErrorResponse(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details: ValidationError[] | undefined,
    requestId: string
  ): ErrorResponse {
    return {
      statusCode,
      body: {
        error: {
          code,
          message,
          details,
          timestamp: new Date().toISOString(),
          requestId
        }
      }
    };
  }
}
```

### Logging Strategy

**Log Levels:**
- **ERROR**: System errors, exceptions, database failures
- **WARN**: Validation failures, invalid state transitions, not found resources
- **INFO**: Successful operations, state transitions, audit events
- **DEBUG**: Detailed flow information, query execution (development only)

**Structured Logging Format:**
```typescript
interface LogEntry {
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
  timestamp: string
  requestId: string
  userId?: string
  operation: string
  message: string
  data?: Record<string, any>
  error?: {
    message: string
    stack?: string
  }
}
```

**Example Log Entries:**

```json
// Successful ticket creation
{
  "level": "INFO",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_abc123",
  "userId": "user_456",
  "operation": "CREATE_TICKET",
  "message": "Ticket created successfully",
  "data": {
    "ticketId": "a1b2c3d4-...",
    "priority": "High"
  }
}

// Invalid state transition
{
  "level": "WARN",
  "timestamp": "2024-01-15T10:31:00Z",
  "requestId": "req_def456",
  "userId": "user_789",
  "operation": "STATE_TRANSITION",
  "message": "Invalid state transition rejected",
  "data": {
    "ticketId": "a1b2c3d4-...",
    "currentState": "Open",
    "requestedState": "Closed"
  }
}

// Database error
{
  "level": "ERROR",
  "timestamp": "2024-01-15T10:32:00Z",
  "requestId": "req_ghi789",
  "userId": "user_012",
  "operation": "UPDATE_TICKET",
  "message": "Database operation failed",
  "error": {
    "message": "Connection timeout",
    "stack": "Error: Connection timeout\n  at Database.query..."
  }
}
```

**Log Retention:**
- Application logs: 30 days
- Audit logs: 2+ years (compliance requirement)
- Error logs: 90 days

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property Reflection:**

After analyzing all acceptance criteria, the following properties capture the core correctness requirements. Many specific requirements can be consolidated into general properties:

**Consolidated Properties:**
- Requirements 9.1-9.5 (specific valid transitions) → Single state machine property covering all valid transitions
- Requirements 10.1-10.5 (persistence operations) → Covered by round-trip properties for each operation type
- Requirement 11 (validation requirements) → Covered by validation properties in requirements 1, 4-9
- Multiple "return complete object" requirements (1.7, 4.6, 5.7, 6.6) → Single response completeness property per operation type

**Properties Testing Infrastructure (Integration):**
- Requirements 2.5, 10.6-10.8, 12.3, 12.5-12.6 test database behavior and should use integration tests, not PBT

**Unique Properties Identified:**
- Ticket creation validation and persistence
- Ticket update validation and field preservation
- State machine transition validation
- Assignment and reassignment
- Comment creation and ordering
- Search functionality (case-insensitivity, partial matching)
- Filter functionality
- Error handling and response format
- ID uniqueness and immutability

### Property 1: Ticket Creation Round-Trip

*For any* valid ticket creation request (with non-empty title, description, and valid priority), creating the ticket and then retrieving it by the returned ID SHALL return a ticket with equivalent data where the state is "Open", the title matches, the description matches, the priority matches, and an assignee is null.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.7, 10.1**

### Property 2: Ticket ID Uniqueness

*For any* sequence of ticket creation operations, all generated ticket IDs SHALL be unique (no duplicates).

**Validates: Requirements 1.2**

### Property 3: Invalid Ticket Creation Rejection

*For any* ticket creation request with missing required fields (title, description, or priority) OR invalid field values (empty strings after trimming, invalid priority value), the system SHALL reject the request with a descriptive error response.

**Validates: Requirements 1.5, 1.6**

### Property 4: Ticket List Completeness

*For any* set of N tickets created in the system, listing all tickets SHALL return exactly N tickets, each containing all required fields (id, title, description, priority, state, assignee, createdAt, updatedAt).

**Validates: Requirements 2.1, 2.2**

### Property 5: Ticket List Idempotence

*For any* database state, calling the list tickets operation multiple times SHALL return tickets in the same consistent order each time.

**Validates: Requirements 2.4**

### Property 6: Ticket Retrieval by ID

*For any* existing ticket ID, retrieving the ticket SHALL return the complete ticket data including all fields and associated comments in chronological order.

**Validates: Requirements 3.1, 3.4, 3.5**

### Property 7: Non-Existent Ticket Error Handling

*For any* ticket ID that does not exist in the system (but is a valid UUID format), attempts to retrieve, update, assign, or add comments SHALL return a "not found" error response.

**Validates: Requirements 3.3, 4.3, 5.3, 6.4**

### Property 8: Invalid ID Format Rejection

*For any* string that is not a valid UUID format, attempts to use it as a ticket ID SHALL return a validation error response.

**Validates: Requirements 3.2**

### Property 9: Ticket Update Round-Trip

*For any* existing ticket and valid update request (updating title, description, or priority), applying the update and then retrieving the ticket SHALL show the updated values for the specified fields.

**Validates: Requirements 4.1, 4.2, 10.2**

### Property 10: Invalid Ticket Update Rejection

*For any* ticket update request with invalid field values (empty strings after trimming, invalid priority value), the system SHALL reject the request with a descriptive error response.

**Validates: Requirements 4.4**

### Property 11: Partial Update Field Preservation

*For any* existing ticket and update request that specifies only a subset of updateable fields, applying the update SHALL modify only the specified fields while preserving all other field values unchanged.

**Validates: Requirements 4.5**

### Property 12: Update Response Completeness

*For any* successful ticket update operation, the response SHALL contain the complete updated ticket object with all fields.

**Validates: Requirements 4.6**

### Property 13: Immutable Field Protection

*For any* ticket update request that attempts to modify immutable fields (id, createdAt, state via update endpoint, assignee via update endpoint), those fields SHALL remain unchanged after the operation.

**Validates: Requirements 4.7**

### Property 14: Assignment Round-Trip

*For any* existing ticket and valid assignee identifier, assigning the ticket and then retrieving it SHALL show the assignee field set to the specified identifier.

**Validates: Requirements 5.1, 5.2, 10.5**

### Property 15: Invalid Assignment Rejection

*For any* assignment request with an invalid assignee identifier format, the system SHALL reject the request with a descriptive error response.

**Validates: Requirements 5.4**

### Property 16: Reassignment Support

*For any* ticket with an existing assignee, assigning a different valid assignee SHALL update the assignee field to the new value.

**Validates: Requirements 5.5**

### Property 17: Unassignment Support

*For any* ticket with an existing assignee, setting the assignee to null SHALL clear the assignee field (unassignment).

**Validates: Requirements 5.6**

### Property 18: Assignment Response Completeness

*For any* successful assignment operation, the response SHALL contain the complete updated ticket object with all fields.

**Validates: Requirements 5.7**

### Property 19: Comment Creation Round-Trip

*For any* existing ticket and valid comment (non-empty text, valid author), adding the comment and then retrieving the ticket SHALL show the comment in the comments list with matching text, author, and a timestamp.

**Validates: Requirements 6.1, 6.2, 6.3, 10.4**

### Property 20: Invalid Comment Rejection

*For any* comment submission with empty or whitespace-only text, the system SHALL reject the request with a descriptive error response.

**Validates: Requirements 6.5**

### Property 21: Comment Response Completeness

*For any* successful comment creation, the response SHALL contain the complete comment object including id, ticketId, text, author, and createdAt.

**Validates: Requirements 6.6**

### Property 22: Comment Chronological Ordering

*For any* ticket with multiple comments, retrieving the ticket SHALL return comments ordered chronologically by creation timestamp (oldest first).

**Validates: Requirements 6.7**

### Property 23: Search Result Correctness

*For any* search keyword, the returned tickets SHALL include all tickets where the keyword appears in the title or description, and SHALL exclude all tickets where the keyword does not appear in title or description.

**Validates: Requirements 7.1, 7.2**

### Property 24: Case-Insensitive Search

*For any* search keyword and variations of that keyword with different casing, the search SHALL return the same set of tickets.

**Validates: Requirements 7.3**

### Property 25: Partial Word Matching in Search

*For any* ticket with text content and any substring of that content, searching for the substring SHALL return the ticket in the results.

**Validates: Requirements 7.7**

### Property 26: Invalid Search Query Rejection

*For any* search query that is empty or consists only of whitespace, the system SHALL reject the request with a descriptive error response.

**Validates: Requirements 7.5**

### Property 27: Search Result Completeness

*For any* search operation that returns results, each returned ticket SHALL contain all required fields (id, title, description, priority, state, assignee, createdAt, updatedAt).

**Validates: Requirements 7.6**

### Property 28: Status Filter Correctness

*For any* valid ticket state, filtering by that state SHALL return all tickets in that state and SHALL exclude all tickets not in that state.

**Validates: Requirements 8.1, 8.2**

### Property 29: Invalid State Filter Rejection

*For any* state value that is not a valid ticket state (Open, In_Progress, Resolved, Closed, Cancelled), the system SHALL reject the filter request with a descriptive error response.

**Validates: Requirements 8.4**

### Property 30: Filter Result Completeness

*For any* filter operation that returns results, each returned ticket SHALL contain all required fields (id, title, description, priority, state, assignee, createdAt, updatedAt).

**Validates: Requirements 8.5**

### Property 31: Valid State Transitions

*For any* ticket and state transition request, if the transition is valid according to the state machine rules (Open→In_Progress, Open→Cancelled, In_Progress→Resolved, In_Progress→Cancelled, Resolved→Closed), the transition SHALL succeed and the ticket state SHALL be updated. If the transition is invalid, the system SHALL reject the request with a descriptive error describing the invalid transition.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**

### Property 32: State Transition Persistence

*For any* valid state transition, applying the transition and then retrieving the ticket SHALL show the ticket in the new state.

**Validates: Requirements 9.7, 10.3**

### Property 33: State Transition Response Completeness

*For any* successful state transition, the response SHALL contain the complete updated ticket object with all fields.

**Validates: Requirements 9.8**

### Property 34: Terminal State Immutability

*For any* ticket in a terminal state (Closed or Cancelled), any attempt to transition to a different state SHALL be rejected with an error indicating no further transitions are allowed.

**Validates: Requirements 9.6**

### Property 35: Validation Error Descriptiveness

*For any* validation failure (invalid input, missing required fields, invalid transitions, etc.), the error response SHALL contain a human-readable message describing the specific validation failure.

**Validates: Requirements 11.7, 12.1**

### Property 36: Malformed Request Rejection

*For any* request with malformed data structures (invalid JSON, wrong data types, etc.), the system SHALL reject the request with a descriptive error response.

**Validates: Requirements 11.8**

### Property 37: Resource Not Found Error Specificity

*For any* operation that fails because a resource (ticket) is not found, the error response SHALL specifically identify which resource was not found (including the ID).

**Validates: Requirements 12.2**

### Property 38: HTTP Status Code Correctness

*For any* operation result (success or failure), the HTTP status code SHALL match the result category: 2xx for success, 400 for validation errors, 404 for not found, 422 for business rule violations, 5xx for system errors.

**Validates: Requirements 12.4**

## Testing Strategy

### Overview

The testing strategy employs a comprehensive approach combining property-based testing for universal correctness properties, example-based unit tests for specific scenarios and edge cases, and integration tests for infrastructure concerns.

### Property-Based Testing

**Framework Selection:**
- **JavaScript/TypeScript**: fast-check
- **Python**: Hypothesis
- **Java**: jqwik
- **Go**: gopter

**Configuration:**
- **Minimum iterations per property**: 100 (to ensure comprehensive input coverage)
- **Test tagging**: Each property test must reference its design property
- **Tag format**: `Feature: support-ticket-management-system, Property {number}: {property description}`

**Generator Strategies:**

```typescript
// Example generators for fast-check (TypeScript)

const validPriority = fc.oneof(
  fc.constant('Low'),
  fc.constant('Medium'),
  fc.constant('High'),
  fc.constant('Critical')
);

const validState = fc.oneof(
  fc.constant('Open'),
  fc.constant('In_Progress'),
  fc.constant('Resolved'),
  fc.constant('Closed'),
  fc.constant('Cancelled')
);

const validTitle = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);

const validDescription = fc.string({ minLength: 1, maxLength: 5000 })
  .filter(s => s.trim().length > 0);

const validTicketCreate = fc.record({
  title: validTitle,
  description: validDescription,
  priority: validPriority
});

const invalidTicketCreate = fc.oneof(
  // Missing title
  fc.record({ description: validDescription, priority: validPriority }),
  // Missing description
  fc.record({ title: validTitle, priority: validPriority }),
  // Empty title
  fc.record({ title: fc.constant('   '), description: validDescription, priority: validPriority }),
  // Invalid priority
  fc.record({ title: validTitle, description: validDescription, priority: fc.constant('InvalidPriority') })
);

const validUUID = fc.uuid();

const invalidUUID = fc.string().filter(s => !isValidUUID(s));
```

**Property Test Examples:**

```typescript
// Property 1: Ticket Creation Round-Trip
test('Property 1: Ticket creation round-trip preserves data', async () => {
  await fc.assert(
    fc.asyncProperty(validTicketCreate, async (createRequest) => {
      // Feature: support-ticket-management-system, Property 1: Ticket creation round-trip
      
      const created = await ticketService.createTicket(createRequest);
      const retrieved = await ticketService.getTicket(created.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved.state).toBe('Open');
      expect(retrieved.title).toBe(createRequest.title);
      expect(retrieved.description).toBe(createRequest.description);
      expect(retrieved.priority).toBe(createRequest.priority);
      expect(retrieved.assignee).toBeNull();
    }),
    { numRuns: 100 }
  );
});

// Property 31: Valid State Transitions
test('Property 31: Valid state transitions succeed, invalid ones fail', async () => {
  const validTransitions = [
    ['Open', 'In_Progress'],
    ['Open', 'Cancelled'],
    ['In_Progress', 'Resolved'],
    ['In_Progress', 'Cancelled'],
    ['Resolved', 'Closed']
  ];
  
  const allStates = ['Open', 'In_Progress', 'Resolved', 'Closed', 'Cancelled'];
  const invalidTransitions = [];
  
  for (const from of allStates) {
    for (const to of allStates) {
      const isValid = validTransitions.some(([f, t]) => f === from && t === to);
      if (!isValid && from !== to) {
        invalidTransitions.push([from, to]);
      }
    }
  }
  
  await fc.assert(
    fc.asyncProperty(
      fc.oneof(
        fc.constantFrom(...validTransitions).map(([from, to]) => ({ from, to, shouldSucceed: true })),
        fc.constantFrom(...invalidTransitions).map(([from, to]) => ({ from, to, shouldSucceed: false }))
      ),
      async ({ from, to, shouldSucceed }) => {
        // Feature: support-ticket-management-system, Property 31: Valid state transitions
        
        const ticket = await createTicketInState(from);
        
        if (shouldSucceed) {
          const result = await ticketService.transitionState(ticket.id, to);
          expect(result.state).toBe(to);
        } else {
          await expect(ticketService.transitionState(ticket.id, to))
            .rejects.toThrow(/invalid transition/i);
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing

**Purpose:**
- Test specific examples demonstrating correct behavior
- Cover edge cases like empty lists, boundary conditions
- Test error message formatting and specific error scenarios
- Verify specific business rules with concrete examples

**Example Unit Tests:**

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
  
  test('Filter by state with no tickets in that state returns empty list', async () => {
    await ticketService.createTicket({
      title: 'Test ticket',
      description: 'Description',
      priority: 'Low'
    });
    // All tickets start in Open state
    
    const results = await searchService.filterByState('Closed');
    expect(results).toEqual([]);
  });
  
  test('Terminal state (Closed) prevents further transitions', async () => {
    const ticket = await createTicketInState('Closed');
    
    await expect(ticketService.transitionState(ticket.id, 'Open'))
      .rejects.toThrow(/terminal state/i);
  });
  
  test('Error response includes request ID for tracing', async () => {
    try {
      await ticketService.getTicket('invalid-uuid');
    } catch (error) {
      expect(error.response.error.requestId).toBeDefined();
      expect(typeof error.response.error.requestId).toBe('string');
    }
  });
  
  test('Validation error includes specific field details', async () => {
    try {
      await ticketService.createTicket({
        title: '   ', // whitespace only
        description: 'Valid description',
        priority: 'Low'
      });
    } catch (error) {
      expect(error.response.error.details).toBeDefined();
      const titleError = error.response.error.details.find(d => d.field === 'title');
      expect(titleError).toBeDefined();
      expect(titleError.message).toContain('empty');
    }
  });
});
```

### Integration Testing

**Purpose:**
- Test interactions with actual database
- Verify transaction rollback behavior
- Test concurrent operations
- Verify system behavior under infrastructure failures
- Test end-to-end API flows

**Integration Test Coverage:**

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
    
    // Simulate database failure during update
    await simulateDatabaseFailure();
    
    await expect(
      ticketService.updateTicket(ticket.id, { title: 'Updated' })
    ).rejects.toThrow();
    
    await restoreDatabase();
    
    // Verify ticket was not partially updated
    const retrieved = await ticketService.getTicket(ticket.id);
    expect(retrieved.title).toBe('Test'); // Original value preserved
  });
  
  test('Concurrent filter operations return correct results', async () => {
    // Create tickets in different states
    await createTicketInState('Open');
    await createTicketInState('In_Progress');
    await createTicketInState('Resolved');
    
    // Run concurrent filter operations
    const results = await Promise.all([
      searchService.filterByState('Open'),
      searchService.filterByState('In_Progress'),
      searchService.filterByState('Resolved')
    ]);
    
    expect(results[0].every(t => t.state === 'Open')).toBe(true);
    expect(results[1].every(t => t.state === 'In_Progress')).toBe(true);
    expect(results[2].every(t => t.state === 'Resolved')).toBe(true);
  });
  
  test('System maintains data integrity across restart', async () => {
    const ticket = await ticketService.createTicket({
      title: 'Test',
      description: 'Description',
      priority: 'High'
    });
    
    await restartSystem();
    
    const retrieved = await ticketService.getTicket(ticket.id);
    expect(retrieved).toBeDefined();
    expect(retrieved.title).toBe('Test');
  });
  
  test('Audit log captures state transition', async () => {
    const ticket = await createTicketInState('Open');
    await ticketService.transitionState(ticket.id, 'In_Progress');
    
    const auditEntries = await auditLog.getEntriesByTicketId(ticket.id);
    const transitionEntry = auditEntries.find(e => e.operation === 'STATE_TRANSITION');
    
    expect(transitionEntry).toBeDefined();
    expect(transitionEntry.oldState).toBe('Open');
    expect(transitionEntry.newState).toBe('In_Progress');
  });
});
```

### API End-to-End Testing

**Purpose:**
- Verify complete HTTP request/response flows
- Test authentication integration
- Verify error response formats match specification
- Test real API client usage patterns

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
  
  test('GET /api/v1/tickets/{id} with invalid ID returns 400', async () => {
    const response = await request(app)
      .get('/api/v1/tickets/not-a-uuid')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(400);
    
    expect(response.body.error.code).toBe('INVALID_UUID_FORMAT');
  });
  
  test('PATCH /api/v1/tickets/{id}/state with invalid transition returns 422', async () => {
    const ticket = await createTicket();
    
    const response = await request(app)
      .patch(`/api/v1/tickets/${ticket.id}/state`)
      .send({ state: 'Closed' }) // Invalid: Open -> Closed
      .set('Authorization', `Bearer ${testToken}`)
      .expect(422);
    
    expect(response.body.error.code).toBe('INVALID_TRANSITION');
    expect(response.body.error.message).toContain('Open');
    expect(response.body.error.message).toContain('Closed');
  });
  
  test('GET /api/v1/tickets/search with whitespace query returns 400', async () => {
    const response = await request(app)
      .get('/api/v1/tickets/search?q=   ')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(400);
    
    expect(response.body.error.code).toBe('WHITESPACE_ONLY');
  });
});
```

### Test Coverage Goals

| Component | Coverage Target | Focus |
|-----------|----------------|-------|
| Backend Validator | 100% | All validation rules and error paths |
| State Machine | 100% | All transitions (valid and invalid) |
| Ticket Service | 90%+ | Core operations and error handling |
| Comment Service | 90%+ | Creation and retrieval logic |
| Search Service | 85%+ | Search algorithms and filters |
| Data Store | 80%+ | CRUD operations (integration tests) |
| API Layer | 90%+ | All endpoints and error responses |

### Test Execution Strategy

**Development:**
- Run property-based tests on every commit (CI/CD)
- Run unit tests on every commit
- Run integration tests on PR creation
- Fast feedback loop (< 2 minutes for property + unit tests)

**Pre-Release:**
- Full test suite including integration tests
- Extended property test runs (1000+ iterations)
- Load testing for concurrent operations
- Database failure scenario testing

**Continuous:**
- Nightly full test suite execution
- Performance regression testing
- Security vulnerability scanning

## Implementation Notes

### Technology Stack Recommendations

**Backend Framework:**
- **Node.js/Express**: Recommended for rapid development, extensive ecosystem
- **Alternative**: Python/FastAPI for type safety and automatic API documentation

**Database:**
- **PostgreSQL**: Recommended for ACID compliance, JSON support, full-text search capabilities
- Connection pooling with pg-pool or similar
- Migration management with db-migrate or Flyway

**ORM/Query Builder:**
- **TypeORM** or **Prisma**: Type-safe database operations with migration support
- **Alternative**: Knex.js for more control over queries

**Validation:**
- **Joi** or **Zod**: Schema-based validation with descriptive error messages
- Integration with request middleware for automatic validation

**Testing:**
- **Property-Based Testing**: fast-check (JavaScript/TypeScript)
- **Unit/Integration**: Jest or Vitest
- **API Testing**: Supertest
- **Test Database**: Docker container with PostgreSQL for isolation

**Authentication:**
- **JWT validation**: jsonwebtoken or passport-jwt
- Integration with external identity provider (e.g., Auth0, Okta)

**Logging:**
- **Winston** or **Pino**: Structured logging with multiple transports
- Log aggregation to CloudWatch, Elasticsearch, or similar

**Containerization:**
- **Docker**: Multi-stage builds for production optimization
- **Docker Compose**: Development environment orchestration

### Development Phases

**Phase 1: Core Infrastructure (Week 1-2)**
- Database schema setup and migrations
- Basic API structure with routing
- Authentication middleware integration
- Error handling framework
- Logging infrastructure

**Phase 2: Ticket Operations (Week 3-4)**
- Ticket creation and validation
- Ticket retrieval (single and list)
- Ticket updates
- Property-based tests for ticket operations

**Phase 3: State Management (Week 5)**
- State machine implementation
- State transition validation
- State transition endpoints
- Property-based tests for state transitions

**Phase 4: Assignment and Comments (Week 6)**
- Assignment operations
- Comment creation and retrieval
- Property-based tests for assignments and comments

**Phase 5: Search and Filter (Week 7)**
- Keyword search implementation
- Full-text search indexing
- Status filtering
- Property-based tests for search/filter

**Phase 6: Integration and Hardening (Week 8)**
- Integration test suite
- End-to-end API tests
- Performance optimization
- Security audit
- Documentation completion

### Performance Optimization

**Database Indexing:**
- B-tree indexes on frequently filtered columns (state, assignee, created_at)
- GIN index for full-text search on title and description
- Consider partial indexes for frequently queried state combinations

**Query Optimization:**
- Use connection pooling (10-20 connections for small team)
- Prepare statements for frequently executed queries
- Implement pagination for list operations (100 items per page)
- Use SELECT only required columns, avoid SELECT *

**Caching Strategy:**
- Cache frequently accessed tickets in Redis (optional for v1)
- Cache search results with TTL (5 minutes)
- Invalidate cache on write operations
- Consider caching for read-heavy workloads only

**Response Time Targets:**
- Ticket creation: < 500ms (p95)
- Ticket retrieval: < 200ms (p95)
- List operations: < 1s for first page (p95)
- Search operations: < 2s (p95)
- State transitions: < 500ms (p95)

### Security Checklist

- [ ] All database queries use parameterized statements
- [ ] Input sanitization applied to all user input
- [ ] UUID validation before database lookups
- [ ] Authentication required on all endpoints
- [ ] Rate limiting on API endpoints (100 requests/minute per user)
- [ ] HTTPS enforced for all connections
- [ ] SQL injection prevention verified
- [ ] XSS prevention in error messages
- [ ] Audit logging for all state changes
- [ ] Secrets stored in environment variables, not code
- [ ] Database credentials rotated regularly
- [ ] Error messages sanitized (no internal details exposed)

### Monitoring and Observability

**Metrics to Track:**
- Request latency (p50, p95, p99)
- Request rate per endpoint
- Error rate by error code
- Database connection pool utilization
- Active ticket count by state
- State transition frequency
- Search query performance

**Alerts:**
- Error rate > 5% for 5 minutes
- p95 latency > 2 seconds for 5 minutes
- Database connection pool exhausted
- Disk space < 20%
- Failed authentication rate spike

**Health Checks:**
- `/health` endpoint: Basic service health
- `/health/db` endpoint: Database connectivity
- Kubernetes liveness and readiness probes

### Deployment Architecture

**Docker Container:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Environment Variables:**
```
DATABASE_URL=postgresql://user:pass@host:5432/tickets
JWT_SECRET=<secret>
JWT_ISSUER=<issuer>
LOG_LEVEL=info
PORT=3000
NODE_ENV=production
```

**Infrastructure Requirements:**
- **Compute**: 2 vCPU, 4GB RAM (small team)
- **Database**: PostgreSQL 14+, 20GB storage, automated backups
- **Load Balancer**: Application-level load balancing for multiple instances
- **Scaling**: Horizontal scaling for API layer, vertical scaling for database

### Future Enhancements

**Not in Initial Scope (consider for v2):**
- Email notifications for ticket updates
- File attachment support with S3 storage
- Advanced reporting and analytics dashboard
- Bulk operations (mass assign, mass state transition)
- Custom fields and ticket templates
- SLA tracking and escalation rules
- Ticket linking and relationships
- Mobile API optimizations
- GraphQL API alternative
- Real-time WebSocket updates
- Advanced search with Elasticsearch
- Multi-tenancy support

## Conclusion

This design provides a complete implementation blueprint for the Support Ticket Management System. The architecture emphasizes data integrity through backend validation, maintains clear separation of concerns, and ensures comprehensive testing through property-based testing complemented by unit and integration tests.

The state machine implementation provides strict control over ticket lifecycle, while the RESTful API design ensures predictable and intuitive client integration. The combination of PostgreSQL for ACID compliance and property-based testing for correctness validation creates a robust and reliable system.

Key design decisions prioritize:
1. **Correctness**: Backend validation and property-based testing ensure system reliability
2. **Maintainability**: Clear component boundaries and comprehensive error handling
3. **Security**: Input sanitization, authentication, and audit logging
4. **Performance**: Database indexing and query optimization for responsive operations
5. **Observability**: Structured logging and metrics for operational insights

The phased development approach allows for iterative delivery while maintaining quality through continuous testing and validation at each stage.
