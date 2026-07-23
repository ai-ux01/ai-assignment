# Support Ticket Management System - API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Error Handling](#error-handling)
5. [Error Codes](#error-codes)
6. [API Endpoints](#api-endpoints)
   - [Create Ticket](#1-create-ticket)
   - [List All Tickets](#2-list-all-tickets)
   - [Get Ticket Details](#3-get-ticket-details)
   - [Update Ticket](#4-update-ticket)
   - [Assign Ticket](#5-assign-ticket)
   - [Transition Ticket State](#6-transition-ticket-state)
   - [Add Comment](#7-add-comment)
   - [Search Tickets](#8-search-tickets)
   - [Filter Tickets by Status](#9-filter-tickets-by-status)
7. [Example Workflows](#example-workflows)

---

## Overview

The Support Ticket Management System API is a RESTful web service that enables support teams to create, track, manage, and resolve customer support requests. The API provides comprehensive ticket lifecycle management with state transitions, assignment capabilities, collaborative commenting, and search/filter functionality.

### Key Features

- **Ticket Lifecycle Management**: Create, read, update tickets with enforced state machine transitions
- **Assignment Management**: Assign tickets to team members with flexible reassignment
- **Collaborative Features**: Add timestamped comments for team communication
- **Search and Filter**: Keyword search and status-based filtering
- **Data Integrity**: Backend validation and ACID-compliant persistence
- **Audit Logging**: Comprehensive logging of all state-changing operations

### API Characteristics

- **Architecture**: RESTful API with JSON payloads
- **Authentication**: JWT-based authentication (Bearer token)
- **Content Type**: `application/json`
- **Protocol**: HTTPS (recommended for production)
- **Response Format**: JSON
- **Error Format**: Structured error responses with codes

---

## Base URL

### Development
```
http://localhost:3000/api/v1
```

### Production
```
https://your-domain.com/api/v1
```

All API endpoints are prefixed with `/api/v1`. For example, to create a ticket:
```
POST http://localhost:3000/api/v1/tickets
```

---

## Authentication

The API uses JWT (JSON Web Token) based authentication. Authentication is required for the following operations:

- Creating tickets
- Updating tickets
- Assigning tickets
- Transitioning ticket states
- Adding comments

### Authentication Header

Include the JWT token in the `Authorization` header using the Bearer scheme:

```http
Authorization: Bearer <your-jwt-token>
```

### Example Request with Authentication

```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Login page not loading",
    "description": "Users are unable to access the login page",
    "priority": "High"
  }'
```

### Unauthenticated Endpoints

The following operations do NOT require authentication:

- Listing all tickets (`GET /tickets`)
- Getting ticket details (`GET /tickets/:id`)
- Searching tickets (`GET /tickets/search`)
- Filtering tickets (`GET /tickets/filter`)

### Authentication Errors

When authentication fails, you'll receive a `401 Unauthorized` response:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authentication token",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## Error Handling

All error responses follow a consistent structure to make error handling predictable and straightforward.

### Error Response Format

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": [
      {
        "field": "string",
        "message": "string",
        "code": "string"
      }
    ],
    "timestamp": "ISO8601 timestamp",
    "requestId": "string"
  }
}
```

### Error Response Fields

- **code**: Machine-readable error code for programmatic handling
- **message**: Human-readable error message
- **details**: Optional array of field-specific validation errors
- **timestamp**: ISO8601 timestamp when the error occurred
- **requestId**: Unique request identifier for tracing and debugging

### HTTP Status Codes

| Status Code | Description | Usage |
|-------------|-------------|-------|
| `200 OK` | Success | Successful GET, PATCH requests |
| `201 Created` | Resource created | Successful POST requests |
| `400 Bad Request` | Invalid input | Missing required fields, invalid data format |
| `401 Unauthorized` | Authentication failed | Missing or invalid token |
| `403 Forbidden` | Operation not allowed | Business rule violation (e.g., modifying closed tickets) |
| `404 Not Found` | Resource not found | Ticket ID does not exist |
| `422 Unprocessable Entity` | Invalid state | Invalid state transition, invalid enum values |
| `500 Internal Server Error` | System error | Database errors, unexpected exceptions |
| `503 Service Unavailable` | Service down | Database temporarily unavailable |

### Example Error Responses

**Validation Error (400 Bad Request)**
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

**Resource Not Found (404 Not Found)**
```json
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Ticket with ID 'a1b2c3d4-5678-90ab-cdef-123456789abc' does not exist",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_xyz789"
  }
}
```

**Invalid State Transition (422 Unprocessable Entity)**
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

---

## Error Codes

Machine-readable error codes for programmatic error handling.

### Validation Errors (400 Bad Request)

| Error Code | Description | Example Scenario |
|------------|-------------|------------------|
| `INVALID_INPUT` | General validation failure | Multiple validation errors |
| `MISSING_REQUIRED_FIELD` | Required field not provided | Missing title in ticket creation |
| `FIELD_TOO_LONG` | Field exceeds maximum length | Title longer than 200 characters |
| `FIELD_TOO_SHORT` | Field below minimum length | Empty description |
| `WHITESPACE_ONLY` | Field contains only whitespace | Search query with only spaces |
| `INVALID_UUID_FORMAT` | Invalid UUID format | Malformed ticket ID |

### Resource Errors (404 Not Found)

| Error Code | Description | Example Scenario |
|------------|-------------|------------------|
| `TICKET_NOT_FOUND` | Ticket does not exist | Requesting non-existent ticket ID |

### Business Rule Violations (422 Unprocessable Entity)

| Error Code | Description | Example Scenario |
|------------|-------------|------------------|
| `INVALID_PRIORITY` | Invalid priority value | Priority not in enum |
| `INVALID_STATE` | Invalid state value | State not in enum |
| `INVALID_TRANSITION` | Invalid state transition | Trying to transition from Open to Closed |
| `TERMINAL_STATE` | Cannot modify terminal state | Trying to transition from Closed |
| `INVALID_ASSIGNEE` | Invalid assignee format | Malformed assignee identifier |
| `CANNOT_MODIFY_TERMINAL` | Cannot modify closed/cancelled ticket | Assigning a closed ticket |

### System Errors (500 Internal Server Error)

| Error Code | Description | Example Scenario |
|------------|-------------|------------------|
| `INTERNAL_ERROR` | Unexpected system error | Unhandled exception |
| `DATABASE_ERROR` | Database operation failed | Query execution failure |

### Service Errors (503 Service Unavailable)

| Error Code | Description | Example Scenario |
|------------|-------------|------------------|
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | System maintenance |
| `DATABASE_UNAVAILABLE` | Database temporarily unavailable | Connection pool exhausted |

---

## API Endpoints

### 1. Create Ticket

Create a new support ticket with initial state set to `Open`.

**Endpoint:** `POST /api/v1/tickets`

**Authentication:** Required

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
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Login page not loading",
  "description": "Users are unable to access the login page. Error 500 is displayed.",
  "priority": "High",
  "state": "Open",
  "assignee": null,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or missing required fields
- `401 Unauthorized` - Missing or invalid authentication token
- `500 Internal Server Error` - System error

**Example Request (cURL):**

```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Login page not loading",
    "description": "Users are unable to access the login page. Error 500 is displayed.",
    "priority": "High"
  }'
```

**Example Request (JavaScript/Fetch):**

```javascript
const response = await fetch('http://localhost:3000/api/v1/tickets', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Login page not loading',
    description: 'Users are unable to access the login page. Error 500 is displayed.',
    priority: 'High'
  })
});

const ticket = await response.json();
console.log('Created ticket:', ticket);
```

**Field Validations:**

- **title**: Required, 1-200 characters, cannot be empty or whitespace-only
- **description**: Required, 1-5000 characters, cannot be empty or whitespace-only
- **priority**: Required, must be one of: `Low`, `Medium`, `High`, `Critical`
- **state**: Automatically set to `Open` (not user-provided)
- **assignee**: Automatically set to `null` (not user-provided)

---

### 2. List All Tickets

Retrieve all tickets with their core fields in a consistent order.

**Endpoint:** `GET /api/v1/tickets`

**Authentication:** Not required

**Query Parameters:** None

**Success Response:** `200 OK`

```json
{
  "tickets": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Login page not loading",
      "description": "Users are unable to access the login page",
      "priority": "High",
      "state": "Open",
      "assignee": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440111",
      "title": "Password reset email not sending",
      "description": "Users report not receiving password reset emails",
      "priority": "Medium",
      "state": "In_Progress",
      "assignee": "sarah.jones@example.com",
      "createdAt": "2024-01-15T09:15:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "count": 2
}
```

**Error Responses:**
- `500 Internal Server Error` - Database unavailable

**Example Request (cURL):**

```bash
curl -X GET http://localhost:3000/api/v1/tickets \
  -H "Content-Type: application/json"
```

**Example Request (JavaScript/Fetch):**

```javascript
const response = await fetch('http://localhost:3000/api/v1/tickets');
const data = await response.json();

console.log(`Total tickets: ${data.count}`);
data.tickets.forEach(ticket => {
  console.log(`- ${ticket.title} (${ticket.state})`);
});
```

**Notes:**
- Returns an empty array if no tickets exist: `{"tickets": [], "count": 0}`
- Tickets are returned in consistent order (creation time descending)
- All core fields are included in the response

---

### 3. Get Ticket Details

Retrieve complete details of a specific ticket, including all associated comments.

**Endpoint:** `GET /api/v1/tickets/{id}`

**Authentication:** Not required

**Path Parameters:**
- `id` (string, required): Ticket UUID

**Success Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Login page not loading",
  "description": "Users are unable to access the login page. Error 500 is displayed.",
  "priority": "High",
  "state": "In_Progress",
  "assignee": "john.doe@example.com",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:00:00Z",
  "comments": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440222",
      "text": "Investigating the server logs to identify the root cause",
      "author": "john.doe@example.com",
      "createdAt": "2024-01-15T10:45:00Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440333",
      "text": "Found database connection timeout issue. Working on fix.",
      "author": "john.doe@example.com",
      "createdAt": "2024-01-15T11:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Invalid ticket ID format
- `404 Not Found` - Ticket ID does not exist
- `500 Internal Server Error` - System error

**Example Request (cURL):**

```bash
curl -X GET http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json"
```

**Example Request (JavaScript/Fetch):**

```javascript
const ticketId = '550e8400-e29b-41d4-a716-446655440000';
const response = await fetch(`http://localhost:3000/api/v1/tickets/${ticketId}`);
const ticket = await response.json();

console.log(`Ticket: ${ticket.title}`);
console.log(`Status: ${ticket.state}`);
console.log(`Comments: ${ticket.comments.length}`);
```

**Notes:**
- Comments are returned in chronological order (oldest first)
- If ticket has no comments, an empty array is returned
- All ticket fields and comment metadata are included

---

### 4. Update Ticket

Update ticket information (title, description, or priority). State and assignee cannot be updated through this endpoint.

**Endpoint:** `PATCH /api/v1/tickets/{id}`

**Authentication:** Required

**Path Parameters:**
- `id` (string, required): Ticket UUID

**Request Body (all fields optional):**

```json
{
  "title": "string (optional, 1-200 characters)",
  "description": "string (optional, 1-5000 characters)",
  "priority": "string (optional, enum: Low|Medium|High|Critical)"
}
```

**Success Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Login page returning 500 error",
  "description": "Users are unable to access the login page. Error 500 is displayed. Affects all users.",
  "priority": "Critical",
  "state": "Open",
  "assignee": null,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:15:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid field values or ticket ID format
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Ticket ID does not exist
- `500 Internal Server Error` - System error

**Example Request (cURL):**

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Login page returning 500 error",
    "priority": "Critical"
  }'
```

**Example Request (JavaScript/Fetch):**

```javascript
const ticketId = '550e8400-e29b-41d4-a716-446655440000';
const response = await fetch(`http://localhost:3000/api/v1/tickets/${ticketId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Login page returning 500 error',
    priority: 'Critical'
  })
});

const updatedTicket = await response.json();
console.log('Updated ticket:', updatedTicket);
```

**Field Validations:**

- **title**: Optional, 1-200 characters if provided, cannot be empty or whitespace-only
- **description**: Optional, 1-5000 characters if provided, cannot be empty or whitespace-only
- **priority**: Optional, must be valid Priority enum if provided
- Fields not included in the request are preserved
- System-controlled fields (id, state, assignee, createdAt) cannot be updated via this endpoint

---

### 5. Assign Ticket

Assign a ticket to a team member, reassign to a different team member, or unassign a ticket.

**Endpoint:** `PATCH /api/v1/tickets/{id}/assignee`

**Authentication:** Required

**Path Parameters:**
- `id` (string, required): Ticket UUID

**Request Body:**

```json
{
  "assignee": "string (user identifier) or null"
}
```

**Success Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Login page not loading",
  "description": "Users are unable to access the login page",
  "priority": "High",
  "state": "Open",
  "assignee": "john.doe@example.com",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:20:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid assignee identifier or ticket ID format
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Cannot assign closed/cancelled tickets
- `404 Not Found` - Ticket ID does not exist
- `500 Internal Server Error` - System error

**Example Request - Assign Ticket (cURL):**

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/assignee \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignee": "john.doe@example.com"
  }'
```

**Example Request - Unassign Ticket (cURL):**

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/assignee \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignee": null
  }'
```

**Example Request (JavaScript/Fetch):**

```javascript
// Assign ticket
const ticketId = '550e8400-e29b-41d4-a716-446655440000';
const response = await fetch(`http://localhost:3000/api/v1/tickets/${ticketId}/assignee`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    assignee: 'john.doe@example.com'
  })
});

const ticket = await response.json();
console.log(`Ticket assigned to: ${ticket.assignee}`);

// Unassign ticket
const unassignResponse = await fetch(`http://localhost:3000/api/v1/tickets/${ticketId}/assignee`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    assignee: null
  })
});
```

**Notes:**
- **Assignment**: Provide a valid user identifier (email, username, or UUID)
- **Reassignment**: Simply assign to a different user
- **Unassignment**: Set assignee to `null`
- Tickets in `Closed` or `Cancelled` states cannot be assigned or reassigned

---

### 6. Transition Ticket State

Change the ticket state following defined state transition rules. The system enforces a strict state machine.

**Endpoint:** `PATCH /api/v1/tickets/{id}/state`

**Authentication:** Required

**Path Parameters:**
- `id` (string, required): Ticket UUID

**Request Body:**

```json
{
  "state": "string (required, enum: Open|In_Progress|Resolved|Closed|Cancelled)"
}
```

**Success Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Login page not loading",
  "description": "Users are unable to access the login page",
  "priority": "High",
  "state": "In_Progress",
  "assignee": "john.doe@example.com",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:25:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid ticket ID format
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Ticket ID does not exist
- `422 Unprocessable Entity` - Invalid state transition or invalid state value
- `500 Internal Server Error` - System error

**Valid State Transitions:**

| From State | To State | Description |
|------------|----------|-------------|
| `Open` | `In_Progress` | Start working on ticket |
| `Open` | `Cancelled` | Cancel ticket without work |
| `In_Progress` | `Resolved` | Mark issue as resolved |
| `In_Progress` | `Cancelled` | Cancel active ticket |
| `Resolved` | `Closed` | Close resolved ticket |

**Terminal States:**
- `Closed` - No further transitions allowed
- `Cancelled` - No further transitions allowed

**Example Request (cURL):**

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/state \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "In_Progress"
  }'
```

**Example Request (JavaScript/Fetch):**

```javascript
const ticketId = '550e8400-e29b-41d4-a716-446655440000';
const response = await fetch(`http://localhost:3000/api/v1/tickets/${ticketId}/state`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    state: 'In_Progress'
  })
});

if (!response.ok) {
  const error = await response.json();
  console.error('State transition failed:', error.error.message);
} else {
  const ticket = await response.json();
  console.log(`Ticket state changed to: ${ticket.state}`);
}
```

**State Machine Diagram:**

```
[Create] --> Open
             │
             ├──> In_Progress --> Resolved --> Closed (terminal)
             │         │
             │         └──> Cancelled (terminal)
             │
             └──> Cancelled (terminal)
```

**Example Invalid Transitions:**
- `Open` → `Closed` (must go through In_Progress → Resolved first)
- `Open` → `Resolved` (must start In_Progress first)
- `Resolved` → `In_Progress` (cannot go backwards)
- `Closed` → any state (terminal state)
- `Cancelled` → any state (terminal state)

---

### 7. Add Comment

Add a comment to a ticket for team communication and documentation. Comments are immutable once created.

**Endpoint:** `POST /api/v1/tickets/{id}/comments`

**Authentication:** Required

**Path Parameters:**
- `id` (string, required): Ticket UUID

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
  "id": "770e8400-e29b-41d4-a716-446655440222",
  "ticketId": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Investigating the server logs to identify the root cause",
  "author": "john.doe@example.com",
  "createdAt": "2024-01-15T10:45:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid ticket ID format, empty/whitespace-only text, or missing fields
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Ticket ID does not exist
- `500 Internal Server Error` - System error

**Example Request (cURL):**

```bash
curl -X POST http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/comments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Investigating the server logs to identify the root cause",
    "author": "john.doe@example.com"
  }'
```

**Example Request (JavaScript/Fetch):**

```javascript
const ticketId = '550e8400-e29b-41d4-a716-446655440000';
const response = await fetch(`http://localhost:3000/api/v1/tickets/${ticketId}/comments`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Investigating the server logs to identify the root cause',
    author: 'john.doe@example.com'
  })
});

const comment = await response.json();
console.log('Comment added:', comment.id);
```

**Field Validations:**

- **text**: Required, 1-2000 characters, cannot be empty or whitespace-only
- **author**: Required, valid user identifier
- **ticketId**: Must reference an existing ticket

**Notes:**
- Comments are immutable - they cannot be edited or deleted once created
- Comments maintain an audit trail of all ticket-related discussions
- Use GET /api/v1/tickets/{id} to retrieve all comments for a ticket

---

### 8. Search Tickets

Search for tickets by keyword across title and description fields. Search is case-insensitive.

**Endpoint:** `GET /api/v1/tickets/search`

**Authentication:** Not required

**Query Parameters:**
- `q` (string, required): Search keyword (non-empty, non-whitespace)

**Success Response:** `200 OK`

```json
{
  "tickets": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Login page not loading",
      "description": "Users are unable to access the login page",
      "priority": "High",
      "state": "In_Progress",
      "assignee": "john.doe@example.com",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  ],
  "count": 1,
  "query": "login"
}
```

**Error Responses:**
- `400 Bad Request` - Empty or whitespace-only query
- `500 Internal Server Error` - System error

**Example Request (cURL):**

```bash
curl -X GET "http://localhost:3000/api/v1/tickets/search?q=login" \
  -H "Content-Type: application/json"
```

**Example Request (JavaScript/Fetch):**

```javascript
const searchQuery = 'login';
const response = await fetch(
  `http://localhost:3000/api/v1/tickets/search?q=${encodeURIComponent(searchQuery)}`
);
const data = await response.json();

console.log(`Found ${data.count} tickets matching "${data.query}"`);
data.tickets.forEach(ticket => {
  console.log(`- ${ticket.title}`);
});
```

**Search Behavior:**

- **Case-insensitive**: "Login" matches "login", "LOGIN", "LoGiN"
- **Partial matching**: "log" matches "login", "logout", "logging"
- **Fields searched**: Title and description
- **Special characters**: Treated as literal text (no regex injection)
- **Empty results**: Returns `{"tickets": [], "count": 0, "query": "..."}`

**Example Searches:**

| Query | Matches |
|-------|---------|
| `login` | "Login page not loading", "User login failed" |
| `email` | "Password reset email not sending" |
| `500` | "Login page returning 500 error" |
| `database` | "Database connection timeout" |

---

### 9. Filter Tickets by Status

Filter tickets by their current state. Only single-state filtering is supported.

**Endpoint:** `GET /api/v1/tickets/filter`

**Authentication:** Not required

**Query Parameters:**
- `state` (string, required): State value (enum: `Open|In_Progress|Resolved|Closed|Cancelled`)

**Success Response:** `200 OK`

```json
{
  "tickets": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Login page not loading",
      "description": "Users are unable to access the login page",
      "priority": "High",
      "state": "Open",
      "assignee": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440444",
      "title": "Profile page displaying outdated data",
      "description": "User profile information not refreshing properly",
      "priority": "Low",
      "state": "Open",
      "assignee": null,
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-01-15T09:00:00Z"
    }
  ],
  "count": 2,
  "filter": "Open"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid state value
- `500 Internal Server Error` - System error

**Example Request (cURL):**

```bash
curl -X GET "http://localhost:3000/api/v1/tickets/filter?state=Open" \
  -H "Content-Type: application/json"
```

**Example Request (JavaScript/Fetch):**

```javascript
const state = 'In_Progress';
const response = await fetch(
  `http://localhost:3000/api/v1/tickets/filter?state=${encodeURIComponent(state)}`
);
const data = await response.json();

console.log(`Found ${data.count} tickets in ${data.filter} state`);
data.tickets.forEach(ticket => {
  console.log(`- ${ticket.title} (assigned to: ${ticket.assignee || 'unassigned'})`);
});
```

**Valid State Values:**

- `Open` - Newly created tickets awaiting work
- `In_Progress` - Tickets actively being worked on
- `Resolved` - Tickets with issue fixed, pending closure
- `Closed` - Completed and closed tickets
- `Cancelled` - Tickets cancelled without resolution

**Use Cases:**

| State | Use Case |
|-------|----------|
| `Open` | View backlog of tickets needing assignment |
| `In_Progress` | Monitor active work being done |
| `Resolved` | Review tickets ready for closure |
| `Closed` | Audit completed work |
| `Cancelled` | Review cancelled requests |

**Notes:**
- Returns empty array if no tickets match the state
- Multi-state filtering is not supported (use multiple requests)
- State values are case-sensitive

---

## Example Workflows

### Workflow 1: Complete Ticket Lifecycle

This example demonstrates the complete lifecycle of a ticket from creation to closure.

```javascript
// Step 1: Create a new ticket
const createResponse = await fetch('http://localhost:3000/api/v1/tickets', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Database connection timeout',
    description: 'Application experiencing frequent database timeouts during peak hours',
    priority: 'Critical'
  })
});
const ticket = await createResponse.json();
console.log('Created ticket:', ticket.id);

// Step 2: Assign ticket to team member
const assignResponse = await fetch(`http://localhost:3000/api/v1/tickets/${ticket.id}/assignee`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    assignee: 'sarah.jones@example.com'
  })
});
console.log('Ticket assigned');

// Step 3: Start working on ticket
const startResponse = await fetch(`http://localhost:3000/api/v1/tickets/${ticket.id}/state`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    state: 'In_Progress'
  })
});
console.log('Work started');

// Step 4: Add investigation comment
const comment1 = await fetch(`http://localhost:3000/api/v1/tickets/${ticket.id}/comments`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Analyzing database logs. Found connection pool exhaustion.',
    author: 'sarah.jones@example.com'
  })
});
console.log('Comment added');

// Step 5: Add solution comment
const comment2 = await fetch(`http://localhost:3000/api/v1/tickets/${ticket.id}/comments`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Increased connection pool size from 10 to 50. Monitoring results.',
    author: 'sarah.jones@example.com'
  })
});

// Step 6: Mark as resolved
const resolveResponse = await fetch(`http://localhost:3000/api/v1/tickets/${ticket.id}/state`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    state: 'Resolved'
  })
});
console.log('Ticket resolved');

// Step 7: Close ticket after verification
const closeResponse = await fetch(`http://localhost:3000/api/v1/tickets/${ticket.id}/state`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    state: 'Closed'
  })
});
console.log('Ticket closed');
```

### Workflow 2: Finding and Updating Tickets

Search for related tickets and update priority based on findings.

```javascript
// Search for all login-related tickets
const searchResponse = await fetch(
  'http://localhost:3000/api/v1/tickets/search?q=login'
);
const searchData = await searchResponse.json();

console.log(`Found ${searchData.count} login-related tickets`);

// Find tickets in Open state
const filterResponse = await fetch(
  'http://localhost:3000/api/v1/tickets/filter?state=Open'
);
const filterData = await filterResponse.json();

console.log(`${filterData.count} open tickets needing attention`);

// Update priority of a specific ticket
const ticketToUpdate = filterData.tickets[0];
const updateResponse = await fetch(
  `http://localhost:3000/api/v1/tickets/${ticketToUpdate.id}`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      priority: 'Critical',
      description: ticketToUpdate.description + ' URGENT: Affecting multiple users.'
    })
  }
);

const updated = await updateResponse.json();
console.log(`Updated ticket ${updated.id} to Critical priority`);
```

### Workflow 3: Team Workload Management

Monitor team workload and distribute tickets.

```javascript
// Get all tickets
const allTicketsResponse = await fetch('http://localhost:3000/api/v1/tickets');
const allTickets = await allTicketsResponse.json();

// Analyze workload by assignee
const workload = {};
allTickets.tickets.forEach(ticket => {
  if (ticket.state !== 'Closed' && ticket.state !== 'Cancelled') {
    const assignee = ticket.assignee || 'unassigned';
    workload[assignee] = (workload[assignee] || 0) + 1;
  }
});

console.log('Current workload:', workload);

// Find unassigned high-priority tickets
const unassignedHighPriority = allTickets.tickets.filter(
  t => !t.assignee && (t.priority === 'High' || t.priority === 'Critical')
);

console.log(`${unassignedHighPriority.length} high-priority tickets need assignment`);

// Assign to team member with lightest load
const lightestLoad = Object.entries(workload)
  .filter(([name]) => name !== 'unassigned')
  .sort(([, a], [, b]) => a - b)[0];

for (const ticket of unassignedHighPriority.slice(0, 3)) {
  await fetch(`http://localhost:3000/api/v1/tickets/${ticket.id}/assignee`, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      assignee: lightestLoad[0]
    })
  });
  console.log(`Assigned ticket ${ticket.id} to ${lightestLoad[0]}`);
}
```

### Workflow 4: Ticket Collaboration

View ticket details and add collaborative comments.

```javascript
const ticketId = '550e8400-e29b-41d4-a716-446655440000';

// Get full ticket details with comments
const detailResponse = await fetch(
  `http://localhost:3000/api/v1/tickets/${ticketId}`
);
const ticketDetails = await detailResponse.json();

console.log(`Ticket: ${ticketDetails.title}`);
console.log(`Status: ${ticketDetails.state}`);
console.log(`Assigned to: ${ticketDetails.assignee || 'Unassigned'}`);
console.log(`\nComment history (${ticketDetails.comments.length} comments):`);

ticketDetails.comments.forEach(comment => {
  console.log(`[${comment.createdAt}] ${comment.author}:`);
  console.log(`  ${comment.text}\n`);
});

// Add new comment with update
const newComment = await fetch(
  `http://localhost:3000/api/v1/tickets/${ticketId}/comments`,
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: 'Deployed fix to production. Monitoring for 24 hours before closing.',
      author: 'mike.smith@example.com'
    })
  }
);

console.log('Added follow-up comment');
```

### Workflow 5: Error Handling

Properly handle API errors and edge cases.

```javascript
async function createTicketWithErrorHandling(ticketData) {
  try {
    const response = await fetch('http://localhost:3000/api/v1/tickets', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ticketData)
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle different error types
      switch (error.error.code) {
        case 'INVALID_INPUT':
          console.error('Validation failed:');
          error.error.details?.forEach(detail => {
            console.error(`- ${detail.field}: ${detail.message}`);
          });
          break;
          
        case 'MISSING_REQUIRED_FIELD':
          console.error('Missing required fields');
          break;
          
        case 'INVALID_PRIORITY':
          console.error('Invalid priority value. Use: Low, Medium, High, or Critical');
          break;
          
        default:
          console.error('Error:', error.error.message);
      }
      
      return null;
    }

    const ticket = await response.json();
    console.log('Ticket created successfully:', ticket.id);
    return ticket;
    
  } catch (err) {
    console.error('Network error:', err.message);
    return null;
  }
}

// Usage
const result = await createTicketWithErrorHandling({
  title: 'Test ticket',
  description: 'Testing error handling',
  priority: 'High'
});
```

---

**End of API Documentation**

For additional support or questions, please refer to the system requirements document or contact the development team.
