# API Documentation - Support Ticket Management System

This document provides comprehensive information about the REST API endpoints, including request/response formats, examples, and error handling.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Create Ticket](#create-ticket)
  - [List All Tickets](#list-all-tickets)
  - [Get Ticket Details](#get-ticket-details)
  - [Update Ticket](#update-ticket)
  - [Assign Ticket](#assign-ticket)
  - [Transition Ticket State](#transition-ticket-state)
  - [Add Comment](#add-comment)
  - [Search Tickets](#search-tickets)
  - [Filter Tickets by Status](#filter-tickets-by-status)
- [Examples](#examples)

## Overview

The Support Ticket Management System API is a RESTful API that provides endpoints for managing support tickets, comments, and ticket lifecycle.

**API Version**: v1  
**Content Type**: `application/json`  
**Character Encoding**: UTF-8

## Authentication

All API requests require authentication using JWT tokens.

### Request Header

Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Example

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     https://api.example.com/api/v1/tickets
```

## Base URL

```
http://localhost:3000/api/v1
```

For production:
```
https://api.example.com/api/v1
```

## Response Format

### Success Response

All successful responses include the requested data:

```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "title": "Cannot access dashboard",
  "description": "User reports 403 error when accessing dashboard",
  "priority": "High",
  "state": "Open",
  "assignee": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### List Response

List endpoints return an array with count:

```json
{
  "tickets": [
    {
      "id": "...",
      "title": "...",
      ...
    }
  ],
  "count": 42
}
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "fieldName",
        "message": "Field-specific error",
        "code": "FIELD_ERROR_CODE"
      }
    ],
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123xyz"
  }
}
```

### HTTP Status Codes

| Status Code | Meaning | When Used |
|------------|---------|-----------|
| 200 OK | Success | GET, PATCH requests succeeded |
| 201 Created | Resource created | POST requests succeeded |
| 400 Bad Request | Invalid input | Validation errors, malformed requests |
| 401 Unauthorized | Auth required | Missing or invalid JWT token |
| 404 Not Found | Resource not found | Ticket/comment doesn't exist |
| 422 Unprocessable Entity | Business rule violation | Invalid state transition |
| 500 Internal Server Error | Server error | Unexpected system errors |
| 503 Service Unavailable | Temporary issue | Database temporarily unavailable |

### Error Codes

| Error Code | HTTP Status | Description |
|-----------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `MISSING_REQUIRED_FIELD` | 400 | Required field not provided |
| `INVALID_UUID_FORMAT` | 400 | Invalid ticket/comment ID format |
| `TICKET_NOT_FOUND` | 404 | Ticket does not exist |
| `INVALID_STATE` | 422 | Invalid ticket state value |
| `INVALID_TRANSITION` | 422 | State transition not allowed |
| `TERMINAL_STATE` | 422 | Cannot modify terminal state ticket |
| `INTERNAL_ERROR` | 500 | Unexpected system error |
| `DATABASE_UNAVAILABLE` | 503 | Database connection failed |

## Rate Limiting

**Current Limits**: None (MVP version)

Future implementation will include:
- 100 requests per minute per user
- 1000 requests per hour per user
- Rate limit headers in responses

## Endpoints

### Create Ticket

Create a new support ticket.

**Endpoint**: `POST /api/v1/tickets`

**Request Body**:

```json
{
  "title": "Cannot access dashboard",
  "description": "User reports 403 error when accessing the main dashboard page",
  "priority": "High"
}
```

**Request Schema**:

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | Yes | 1-200 characters, non-empty |
| description | string | Yes | 1-5000 characters, non-empty |
| priority | string | Yes | One of: `Low`, `Medium`, `High`, `Critical` |

**Success Response**: `201 Created`

```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "title": "Cannot access dashboard",
  "description": "User reports 403 error when accessing the main dashboard page",
  "priority": "High",
  "state": "Open",
  "assignee": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses**:

```json
// 400 Bad Request - Missing required field
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "title",
        "message": "Title is required",
        "code": "MISSING_REQUIRED_FIELD"
      }
    ]
  }
}

// 400 Bad Request - Invalid priority
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid priority value",
    "details": [
      {
        "field": "priority",
        "message": "Priority must be one of: Low, Medium, High, Critical",
        "code": "INVALID_PRIORITY"
      }
    ]
  }
}
```

**cURL Example**:

```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Cannot access dashboard",
    "description": "User reports 403 error when accessing dashboard",
    "priority": "High"
  }'
```

---

### List All Tickets

Retrieve all tickets in the system.

**Endpoint**: `GET /api/v1/tickets`

**Query Parameters**: None

**Success Response**: `200 OK`

```json
{
  "tickets": [
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "title": "Cannot access dashboard",
      "description": "User reports 403 error",
      "priority": "High",
      "state": "Open",
      "assignee": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-2345-678901bcdefg",
      "title": "Slow page load times",
      "description": "Dashboard takes 10+ seconds to load",
      "priority": "Medium",
      "state": "In_Progress",
      "assignee": "user@example.com",
      "createdAt": "2024-01-14T09:15:00.000Z",
      "updatedAt": "2024-01-14T11:20:00.000Z"
    }
  ],
  "count": 2
}
```

**Empty Result**:

```json
{
  "tickets": [],
  "count": 0
}
```

**cURL Example**:

```bash
curl http://localhost:3000/api/v1/tickets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Get Ticket Details

Retrieve detailed information about a specific ticket, including comments.

**Endpoint**: `GET /api/v1/tickets/:id`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Ticket identifier |

**Success Response**: `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "title": "Cannot access dashboard",
  "description": "User reports 403 error when accessing dashboard",
  "priority": "High",
  "state": "In_Progress",
  "assignee": "engineer@example.com",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T14:20:00.000Z",
  "comments": [
    {
      "id": "c3d4e5f6-a7b8-9012-3456-789012cdefgh",
      "text": "Investigating the issue. Checking user permissions.",
      "author": "engineer@example.com",
      "createdAt": "2024-01-15T11:00:00.000Z"
    },
    {
      "id": "d4e5f6a7-b8c9-0123-4567-890123defghi",
      "text": "Found the issue. Incorrect role assigned to user.",
      "author": "engineer@example.com",
      "createdAt": "2024-01-15T14:20:00.000Z"
    }
  ]
}
```

**Error Responses**:

```json
// 404 Not Found
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Ticket with ID 'a1b2c3d4-e5f6-7890-1234-567890abcdef' not found"
  }
}

// 400 Bad Request - Invalid ID format
{
  "error": {
    "code": "INVALID_UUID_FORMAT",
    "message": "Invalid ticket ID format"
  }
}
```

**cURL Example**:

```bash
curl http://localhost:3000/api/v1/tickets/a1b2c3d4-e5f6-7890-1234-567890abcdef \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Update Ticket

Update ticket information (title, description, priority).

**Endpoint**: `PATCH /api/v1/tickets/:id`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Ticket identifier |

**Request Body** (all fields optional):

```json
{
  "title": "Updated ticket title",
  "description": "Updated description with more details",
  "priority": "Critical"
}
```

**Request Schema**:

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | No | 1-200 characters if provided |
| description | string | No | 1-5000 characters if provided |
| priority | string | No | One of: `Low`, `Medium`, `High`, `Critical` |

**Success Response**: `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "title": "Updated ticket title",
  "description": "Updated description with more details",
  "priority": "Critical",
  "state": "Open",
  "assignee": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T15:45:00.000Z"
}
```

**Notes**:
- Only provided fields are updated
- Unspecified fields remain unchanged
- `updatedAt` timestamp is automatically updated

**cURL Example**:

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/a1b2c3d4-e5f6-7890-1234-567890abcdef \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "priority": "Critical",
    "description": "Updated description"
  }'
```

---

### Assign Ticket

Assign a ticket to a team member.

**Endpoint**: `PATCH /api/v1/tickets/:id/assignee`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Ticket identifier |

**Request Body**:

```json
{
  "assignee": "engineer@example.com"
}
```

**Unassign Ticket**:

```json
{
  "assignee": null
}
```

**Success Response**: `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "title": "Cannot access dashboard",
  "description": "User reports 403 error",
  "priority": "High",
  "state": "Open",
  "assignee": "engineer@example.com",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T16:00:00.000Z"
}
```

**Error Responses**:

```json
// 403 Forbidden - Cannot assign terminal state ticket
{
  "error": {
    "code": "CANNOT_MODIFY_TERMINAL",
    "message": "Cannot assign tickets in Closed or Cancelled state"
  }
}

// 400 Bad Request - Invalid assignee
{
  "error": {
    "code": "INVALID_ASSIGNEE",
    "message": "Invalid assignee identifier format"
  }
}
```

**cURL Example**:

```bash
# Assign ticket
curl -X PATCH http://localhost:3000/api/v1/tickets/a1b2c3d4-e5f6-7890-1234-567890abcdef/assignee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"assignee": "engineer@example.com"}'

# Unassign ticket
curl -X PATCH http://localhost:3000/api/v1/tickets/a1b2c3d4-e5f6-7890-1234-567890abcdef/assignee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"assignee": null}'
```

---

### Transition Ticket State

Change the ticket state following the state machine rules.

**Endpoint**: `PATCH /api/v1/tickets/:id/state`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Ticket identifier |

**Request Body**:

```json
{
  "state": "In_Progress"
}
```

**Valid States**:
- `Open`
- `In_Progress`
- `Resolved`
- `Closed`
- `Cancelled`

**Valid State Transitions**:

```
Open → In_Progress
Open → Cancelled
In_Progress → Resolved
In_Progress → Cancelled
Resolved → Closed
```

**Success Response**: `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "title": "Cannot access dashboard",
  "description": "User reports 403 error",
  "priority": "High",
  "state": "In_Progress",
  "assignee": "engineer@example.com",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T16:15:00.000Z"
}
```

**Error Responses**:

```json
// 422 Unprocessable Entity - Invalid transition
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Invalid state transition from Open to Closed. Allowed transitions: In_Progress, Cancelled"
  }
}

// 422 Unprocessable Entity - Terminal state
{
  "error": {
    "code": "TERMINAL_STATE",
    "message": "Ticket is in terminal state Closed. No further transitions allowed."
  }
}

// 422 Unprocessable Entity - Invalid state
{
  "error": {
    "code": "INVALID_STATE",
    "message": "Invalid state value. Must be one of: Open, In_Progress, Resolved, Closed, Cancelled"
  }
}
```

**cURL Example**:

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/a1b2c3d4-e5f6-7890-1234-567890abcdef/state \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"state": "In_Progress"}'
```

---

### Add Comment

Add a comment to a ticket.

**Endpoint**: `POST /api/v1/tickets/:id/comments`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Ticket identifier |

**Request Body**:

```json
{
  "text": "Investigating the issue. Found incorrect user permissions.",
  "author": "engineer@example.com"
}
```

**Request Schema**:

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| text | string | Yes | 1-2000 characters, non-empty |
| author | string | Yes | Valid user identifier |

**Success Response**: `201 Created`

```json
{
  "id": "c3d4e5f6-a7b8-9012-3456-789012cdefgh",
  "ticketId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "text": "Investigating the issue. Found incorrect user permissions.",
  "author": "engineer@example.com",
  "createdAt": "2024-01-15T16:30:00.000Z"
}
```

**Error Responses**:

```json
// 404 Not Found
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Ticket with ID 'a1b2c3d4-e5f6-7890-1234-567890abcdef' not found"
  }
}

// 400 Bad Request - Empty comment
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Comment text cannot be empty or whitespace-only"
  }
}
```

**Notes**:
- Comments are immutable (cannot be edited or deleted)
- Comments are returned in chronological order when retrieving ticket details

**cURL Example**:

```bash
curl -X POST http://localhost:3000/api/v1/tickets/a1b2c3d4-e5f6-7890-1234-567890abcdef/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Investigating the issue. Found incorrect user permissions.",
    "author": "engineer@example.com"
  }'
```

---

### Search Tickets

Search tickets by keyword in title and description.

**Endpoint**: `GET /api/v1/tickets/search`

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search keyword (non-empty) |

**Success Response**: `200 OK`

```json
{
  "tickets": [
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "title": "Cannot access dashboard",
      "description": "User reports 403 error when accessing dashboard",
      "priority": "High",
      "state": "Open",
      "assignee": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1,
  "query": "dashboard"
}
```

**Empty Results**:

```json
{
  "tickets": [],
  "count": 0,
  "query": "nonexistent"
}
```

**Search Features**:
- Case-insensitive matching
- Searches both title and description fields
- Partial word matching supported
- Special characters are escaped

**Error Responses**:

```json
// 400 Bad Request - Empty query
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Search query cannot be empty or whitespace-only"
  }
}
```

**cURL Example**:

```bash
curl "http://localhost:3000/api/v1/tickets/search?q=dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Filter Tickets by Status

Filter tickets by their current state.

**Endpoint**: `GET /api/v1/tickets/filter`

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| state | string | Yes | One of: `Open`, `In_Progress`, `Resolved`, `Closed`, `Cancelled` |

**Success Response**: `200 OK`

```json
{
  "tickets": [
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "title": "Cannot access dashboard",
      "description": "User reports 403 error",
      "priority": "High",
      "state": "Open",
      "assignee": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "e5f6a7b8-c9d0-1234-5678-901234efghij",
      "title": "Login button not working",
      "description": "Button does not respond to clicks",
      "priority": "Critical",
      "state": "Open",
      "assignee": "engineer@example.com",
      "createdAt": "2024-01-15T09:00:00.000Z",
      "updatedAt": "2024-01-15T09:00:00.000Z"
    }
  ],
  "count": 2,
  "filter": "Open"
}
```

**Error Responses**:

```json
// 400 Bad Request - Invalid state
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid state value. Must be one of: Open, In_Progress, Resolved, Closed, Cancelled"
  }
}
```

**cURL Example**:

```bash
curl "http://localhost:3000/api/v1/tickets/filter?state=Open" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Examples

### Complete Ticket Lifecycle

This example demonstrates a complete ticket workflow:

#### 1. Create a ticket

```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Cannot login to system",
    "description": "User receives invalid credentials error",
    "priority": "High"
  }'
```

Response: Ticket created with `state: "Open"`

#### 2. Assign the ticket

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/TICKET_ID/assignee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"assignee": "engineer@example.com"}'
```

#### 3. Start working on it

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/TICKET_ID/state \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"state": "In_Progress"}'
```

#### 4. Add progress comment

```bash
curl -X POST http://localhost:3000/api/v1/tickets/TICKET_ID/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Found the issue. Password reset required.",
    "author": "engineer@example.com"
  }'
```

#### 5. Mark as resolved

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/TICKET_ID/state \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"state": "Resolved"}'
```

#### 6. Add resolution comment

```bash
curl -X POST http://localhost:3000/api/v1/tickets/TICKET_ID/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Password reset successful. User can now login.",
    "author": "engineer@example.com"
  }'
```

#### 7. Close the ticket

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/TICKET_ID/state \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"state": "Closed"}'
```

### Bulk Operations Example

Get all open tickets assigned to a specific user:

```bash
# 1. Get all open tickets
curl "http://localhost:3000/api/v1/tickets/filter?state=Open" \
  -H "Authorization: Bearer YOUR_TOKEN" > open_tickets.json

# 2. Filter by assignee (client-side or use jq)
cat open_tickets.json | jq '.tickets[] | select(.assignee == "engineer@example.com")'
```

### Error Handling Example

Handle errors gracefully in your client:

```javascript
async function createTicket(ticketData) {
  try {
    const response = await fetch('http://localhost:3000/api/v1/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(ticketData),
    });

    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 400) {
        console.error('Validation error:', error.error.details);
        // Show validation errors to user
      } else if (response.status === 401) {
        console.error('Authentication failed');
        // Redirect to login
      } else {
        console.error('Server error:', error.error.message);
        // Show generic error message
      }
      
      throw new Error(error.error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

---

## Postman Collection

A Postman collection with all endpoints and examples is available in the repository:

```
/examples/postman_collection.json
```

Import this collection into Postman to quickly test all API endpoints.

## OpenAPI Specification

An OpenAPI (Swagger) specification is available at:

```
/api/openapi.yaml
```

Use tools like Swagger UI to visualize and interact with the API.

---

For more information, see:
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Architecture and implementation details
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [README.md](./README.md) - Project overview
