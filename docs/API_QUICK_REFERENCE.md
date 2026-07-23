# API Quick Reference Guide

Quick reference for common API operations with curl examples.

## Base URL

```
Development: http://localhost:3000/api/v1
Production: https://your-domain.com/api/v1
```

## Authentication

Include JWT token in Authorization header for protected endpoints:

```bash
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Quick Examples

### 1. Create Ticket

```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Login page not loading",
    "description": "Users are unable to access the login page",
    "priority": "High"
  }'
```

### 2. List All Tickets

```bash
curl -X GET http://localhost:3000/api/v1/tickets
```

### 3. Get Ticket Details

```bash
curl -X GET http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000
```

### 4. Update Ticket

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "Critical",
    "description": "Updated description with more details"
  }'
```

### 5. Assign Ticket

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/assignee \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignee": "john.doe@example.com"
  }'
```

### 6. Unassign Ticket

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/assignee \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignee": null
  }'
```

### 7. Transition State to In Progress

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/state \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "In_Progress"
  }'
```

### 8. Mark as Resolved

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/state \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "Resolved"
  }'
```

### 9. Close Ticket

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/state \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "Closed"
  }'
```

### 10. Cancel Ticket

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/state \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "Cancelled"
  }'
```

### 11. Add Comment

```bash
curl -X POST http://localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/comments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Investigating the issue. Will update shortly.",
    "author": "john.doe@example.com"
  }'
```

### 12. Search Tickets

```bash
curl -X GET "http://localhost:3000/api/v1/tickets/search?q=login"
```

### 13. Filter by Open Status

```bash
curl -X GET "http://localhost:3000/api/v1/tickets/filter?state=Open"
```

### 14. Filter by In Progress Status

```bash
curl -X GET "http://localhost:3000/api/v1/tickets/filter?state=In_Progress"
```

---

## State Transition Reference

Valid transitions:

```
Open → In_Progress
Open → Cancelled
In_Progress → Resolved
In_Progress → Cancelled
Resolved → Closed
```

Terminal states (no further transitions):
- Closed
- Cancelled

---

## Priority Values

- `Low`
- `Medium`
- `High`
- `Critical`

---

## Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Validation failed |
| `MISSING_REQUIRED_FIELD` | Required field not provided |
| `TICKET_NOT_FOUND` | Ticket ID does not exist |
| `INVALID_TRANSITION` | Invalid state transition |
| `TERMINAL_STATE` | Cannot modify terminal state |
| `CANNOT_MODIFY_TERMINAL` | Cannot assign/modify closed ticket |
| `INVALID_UUID_FORMAT` | Invalid ticket ID format |

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Unprocessable Entity |
| 500 | Internal Server Error |

---

## HTTPie Examples

If you prefer HTTPie over curl:

### Create Ticket
```bash
http POST localhost:3000/api/v1/tickets \
  Authorization:"Bearer YOUR_JWT_TOKEN" \
  title="Login page not loading" \
  description="Users unable to access login" \
  priority="High"
```

### Assign Ticket
```bash
http PATCH localhost:3000/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/assignee \
  Authorization:"Bearer YOUR_JWT_TOKEN" \
  assignee="john.doe@example.com"
```

### Search
```bash
http GET localhost:3000/api/v1/tickets/search q==login
```

---

## JavaScript/Fetch Examples

### Create Ticket
```javascript
const response = await fetch('http://localhost:3000/api/v1/tickets', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Login page not loading',
    description: 'Users unable to access login',
    priority: 'High'
  })
});
const ticket = await response.json();
```

### Get All Tickets
```javascript
const response = await fetch('http://localhost:3000/api/v1/tickets');
const data = await response.json();
console.log(`${data.count} tickets found`);
```

### Search
```javascript
const query = 'login';
const response = await fetch(
  `http://localhost:3000/api/v1/tickets/search?q=${encodeURIComponent(query)}`
);
const results = await response.json();
```

---

## Python/Requests Examples

### Create Ticket
```python
import requests

response = requests.post(
    'http://localhost:3000/api/v1/tickets',
    headers={
        'Authorization': 'Bearer YOUR_JWT_TOKEN',
        'Content-Type': 'application/json'
    },
    json={
        'title': 'Login page not loading',
        'description': 'Users unable to access login',
        'priority': 'High'
    }
)
ticket = response.json()
```

### Search
```python
response = requests.get(
    'http://localhost:3000/api/v1/tickets/search',
    params={'q': 'login'}
)
results = response.json()
print(f"Found {results['count']} tickets")
```

---

For complete documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
