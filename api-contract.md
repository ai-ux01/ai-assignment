# API Contract Specification

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Common Response Fields

All responses include standard fields for consistency:

- **Success responses**: Include the requested resource(s) and relevant metadata
- **Error responses**: Follow a standard format (see Error Handling section)

## Endpoints

### 1. Create Ticket

**Endpoint:** `POST /api/v1/tickets`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "string (required, 1-200 characters)",
  "description": "string (required, 1-5000 characters)",
  "priority": "Low|Medium|High|Critical (required)"
}
```

**Success Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Login page not responding",
  "description": "Users are unable to access the login page. The page loads but the submit button does nothing when clicked.",
  "priority": "High",
  "state": "Open",
  "assignee": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing or invalid fields
- `401 Unauthorized` - Invalid or missing auth token
- `500 Internal Server Error` - System error

---

### 2. List All Tickets

**Endpoint:** `GET /api/v1/tickets`

**Request Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "tickets": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Login page not responding",
      "description": "Users are unable to access the login page...",
      "priority": "High",
      "state": "Open",
      "assignee": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "661f9511-f39c-52e5-b827-557766551111",
      "title": "Password reset email not received",
      "description": "Customer reports not receiving password reset email...",
      "priority": "Medium",
      "state": "In_Progress",
      "assignee": "user_123",
      "createdAt": "2024-01-14T14:20:00.000Z",
      "updatedAt": "2024-01-15T09:15:00.000Z"
    }
  ],
  "count": 2
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing auth token
- `500 Internal Server Error` - System error
- `503 Service Unavailable` - Database unavailable

---

### 3. Get Ticket Details

**Endpoint:** `GET /api/v1/tickets/{id}`

**Path Parameters:**
- `id` - Ticket UUID (required)

**Request Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Login page not responding",
  "description": "Users are unable to access the login page. The page loads but the submit button does nothing when clicked.",
  "priority": "High",
  "state": "In_Progress",
  "assignee": "user_456",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:45:00.000Z",
  "comments": [
    {
      "id": "772fa622-063d-63f6-c938-668877662222",
      "text": "I've started investigating the issue. Checking server logs now.",
      "author": "user_456",
      "createdAt": "2024-01-15T11:45:00.000Z"
    },
    {
      "id": "883gb733-174e-74g7-d049-779988773333",
      "text": "Found the issue. JavaScript bundle is failing to load due to CDN timeout.",
      "author": "user_456",
      "createdAt": "2024-01-15T12:15:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Invalid UUID format
- `401 Unauthorized` - Invalid or missing auth token
- `404 Not Found` - Ticket does not exist
- `500 Internal Server Error` - System error

---

### 4. Update Ticket

**Endpoint:** `PATCH /api/v1/tickets/{id}`

**Path Parameters:**
- `id` - Ticket UUID (required)

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body (all fields optional):**
```json
{
  "title": "Login page not responding (updated)",
  "description": "Users on Chrome browser unable to access login page...",
  "priority": "Critical"
}
```

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Login page not responding (updated)",
  "description": "Users on Chrome browser unable to access login page...",
  "priority": "Critical",
  "state": "Open",
  "assignee": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T12:30:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid field values or UUID format
- `401 Unauthorized` - Invalid or missing auth token
- `404 Not Found` - Ticket does not exist
- `500 Internal Server Error` - System error

---

### 5. Assign Ticket

**Endpoint:** `PATCH /api/v1/tickets/{id}/assignee`

**Path Parameters:**
- `id` - Ticket UUID (required)

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "assignee": "user_789"
}
```

**To unassign:**
```json
{
  "assignee": null
}
```

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Login page not responding",
  "description": "Users are unable to access the login page...",
  "priority": "High",
  "state": "Open",
  "assignee": "user_789",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T13:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid assignee identifier or UUID format
- `401 Unauthorized` - Invalid or missing auth token
- `403 Forbidden` - Cannot assign tickets in Closed or Cancelled states
- `404 Not Found` - Ticket does not exist
- `500 Internal Server Error` - System error

---

### 6. Transition Ticket State

**Endpoint:** `PATCH /api/v1/tickets/{id}/state`

**Path Parameters:**
- `id` - Ticket UUID (required)

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "state": "In_Progress"
}
```

**Valid States:**
- `Open`
- `In_Progress`
- `Resolved`
- `Closed`
- `Cancelled`

**Valid Transitions:**
- Open → In_Progress
- Open → Cancelled
- In_Progress → Resolved
- In_Progress → Cancelled
- Resolved → Closed

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Login page not responding",
  "description": "Users are unable to access the login page...",
  "priority": "High",
  "state": "In_Progress",
  "assignee": "user_789",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T13:15:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid UUID format
- `401 Unauthorized` - Invalid or missing auth token
- `404 Not Found` - Ticket does not exist
- `422 Unprocessable Entity` - Invalid state transition or state value
- `500 Internal Server Error` - System error

**Example Invalid Transition Error:**
```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Invalid state transition from Open to Closed. Allowed transitions: In_Progress, Cancelled",
    "timestamp": "2024-01-15T13:15:00.000Z",
    "requestId": "req_abc123"
  }
}
```

---

### 7. Add Comment

**Endpoint:** `POST /api/v1/tickets/{id}/comments`

**Path Parameters:**
- `id` - Ticket UUID (required)

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "text": "Fixed the issue by switching to a different CDN. Testing now.",
  "author": "user_456"
}
```

**Success Response (201 Created):**
```json
{
  "id": "994hc844-285f-85h8-e150-880099884444",
  "ticketId": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Fixed the issue by switching to a different CDN. Testing now.",
  "author": "user_456",
  "createdAt": "2024-01-15T13:30:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Empty/whitespace-only text, missing fields, or invalid UUID
- `401 Unauthorized` - Invalid or missing auth token
- `404 Not Found` - Ticket does not exist
- `500 Internal Server Error` - System error

---

### 8. Search Tickets

**Endpoint:** `GET /api/v1/tickets/search`

**Query Parameters:**
- `q` - Search keyword (required, non-empty)

**Request Headers:**
```
Authorization: Bearer <token>
```

**Example Request:**
```
GET /api/v1/tickets/search?q=login
```

**Success Response (200 OK):**
```json
{
  "tickets": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Login page not responding",
      "description": "Users are unable to access the login page...",
      "priority": "High",
      "state": "In_Progress",
      "assignee": "user_789",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T13:15:00.000Z"
    }
  ],
  "count": 1,
  "query": "login"
}
```

**Search Behavior:**
- Case-insensitive matching
- Searches both title and description fields
- Supports partial word matching
- Special characters treated as literals

**Error Responses:**
- `400 Bad Request` - Empty or whitespace-only query
- `401 Unauthorized` - Invalid or missing auth token
- `500 Internal Server Error` - System error

---

### 9. Filter Tickets by Status

**Endpoint:** `GET /api/v1/tickets/filter`

**Query Parameters:**
- `state` - State value (required, valid enum value)

**Request Headers:**
```
Authorization: Bearer <token>
```

**Example Request:**
```
GET /api/v1/tickets/filter?state=Open
```

**Success Response (200 OK):**
```json
{
  "tickets": [
    {
      "id": "aa5f9522-f40d-53f6-c949-669988774455",
      "title": "Email delivery delayed",
      "description": "Customers reporting delayed email notifications...",
      "priority": "Medium",
      "state": "Open",
      "assignee": null,
      "createdAt": "2024-01-15T14:00:00.000Z",
      "updatedAt": "2024-01-15T14:00:00.000Z"
    }
  ],
  "count": 1,
  "filter": "Open"
}
```

**Valid State Values:**
- `Open`
- `In_Progress`
- `Resolved`
- `Closed`
- `Cancelled`

**Error Responses:**
- `400 Bad Request` - Invalid state value
- `401 Unauthorized` - Invalid or missing auth token
- `500 Internal Server Error` - System error

---

## Error Response Format

All error responses follow a consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": [
      {
        "field": "fieldName",
        "message": "Field-specific error message",
        "code": "FIELD_ERROR_CODE"
      }
    ],
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_unique_id"
  }
}
```

### HTTP Status Codes

| Status Code | Usage |
|-------------|-------|
| 200 OK | Successful GET, PATCH operations |
| 201 Created | Successful POST operations |
| 400 Bad Request | Invalid input, validation failures |
| 401 Unauthorized | Missing or invalid authentication |
| 403 Forbidden | Operation not allowed (e.g., assign terminal ticket) |
| 404 Not Found | Resource does not exist |
| 422 Unprocessable Entity | Business rule violation (e.g., invalid state transition) |
| 500 Internal Server Error | System errors |
| 503 Service Unavailable | Temporary service degradation |

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | General validation failure |
| `MISSING_REQUIRED_FIELD` | Required field not provided |
| `FIELD_TOO_LONG` | Field exceeds maximum length |
| `WHITESPACE_ONLY` | Field contains only whitespace |
| `INVALID_UUID_FORMAT` | Malformed UUID |
| `TICKET_NOT_FOUND` | Ticket ID does not exist |
| `INVALID_PRIORITY` | Priority value not in enum |
| `INVALID_STATE` | State value not in enum |
| `INVALID_TRANSITION` | State transition not allowed |
| `TERMINAL_STATE` | Cannot transition from terminal state |
| `INVALID_ASSIGNEE` | Assignee identifier invalid |
| `DATABASE_ERROR` | Internal database error |
| `DATABASE_UNAVAILABLE` | Database temporarily unavailable |

## Rate Limiting

- **Rate**: 100 requests per minute per user
- **Response Header**: `X-RateLimit-Remaining`
- **Exceeded Response**: `429 Too Many Requests`

## Pagination (Future Enhancement)

Not implemented in v1. All list operations return complete results.

## Versioning

API version is included in the URL path (`/api/v1/`). Breaking changes will increment the major version number.
