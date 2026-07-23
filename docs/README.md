# API Documentation

Welcome to the Support Ticket Management System API documentation.

## Available Documentation

### 📖 [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
**Complete API documentation** with detailed information about:
- Authentication and authorization
- All 9 API endpoints with request/response examples
- Error handling and error codes
- Example workflows and use cases
- curl, JavaScript, and HTTP client examples

**Start here if you're:** Building an integration, learning the API, or need comprehensive reference material.

---

### ⚡ [API_QUICK_REFERENCE.md](./API_QUICK_REFERENCE.md)
**Quick reference guide** with:
- Ready-to-use curl commands for all endpoints
- HTTPie, JavaScript, and Python examples
- State transition reference
- Common error codes cheat sheet

**Start here if you're:** Looking for quick copy-paste examples or need a cheat sheet.

---

### 🔧 [openapi.yaml](./openapi.yaml)
**OpenAPI 3.0 specification** (Swagger) with:
- Machine-readable API specification
- All endpoints, schemas, and responses defined
- Can be imported into API tools like Postman, Insomnia, or Swagger UI
- Used for code generation and API testing

**Use this if you're:** 
- Using tools like Postman, Insomnia, or Swagger UI
- Generating client SDKs
- Need formal API specification for tooling

---

## Quick Start

### 1. View Documentation Locally

#### Using Swagger UI (Recommended)

```bash
# Install swagger-ui-express
npm install -g swagger-ui-watcher

# Serve the OpenAPI spec
swagger-ui-watcher ./docs/openapi.yaml
```

Then open http://localhost:8000 in your browser.

#### Using Redoc

```bash
npx @redocly/cli preview-docs docs/openapi.yaml
```

### 2. Import into Postman

1. Open Postman
2. Click "Import" button
3. Select `docs/openapi.yaml`
4. All endpoints will be imported as a collection

### 3. Import into Insomnia

1. Open Insomnia
2. Go to Application → Preferences → Data → Import Data
3. Select `docs/openapi.yaml`
4. Collection will be created with all endpoints

---

## Authentication Setup

Most endpoints require JWT authentication. To get started:

1. Obtain a JWT token from your authentication provider
2. Include it in the `Authorization` header:
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

See [API_DOCUMENTATION.md#authentication](./API_DOCUMENTATION.md#authentication) for details.

---

## Example: Complete Ticket Workflow

```bash
# 1. Create ticket
TICKET_ID=$(curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test ticket","priority":"High"}' \
  | jq -r '.id')

# 2. Assign ticket
curl -X PATCH http://localhost:3000/api/v1/tickets/$TICKET_ID/assignee \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assignee":"john.doe@example.com"}'

# 3. Start work
curl -X PATCH http://localhost:3000/api/v1/tickets/$TICKET_ID/state \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state":"In_Progress"}'

# 4. Add comment
curl -X POST http://localhost:3000/api/v1/tickets/$TICKET_ID/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Working on fix","author":"john.doe@example.com"}'

# 5. Resolve and close
curl -X PATCH http://localhost:3000/api/v1/tickets/$TICKET_ID/state \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state":"Resolved"}'

curl -X PATCH http://localhost:3000/api/v1/tickets/$TICKET_ID/state \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state":"Closed"}'
```

---

## API Endpoints Summary

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/tickets` | POST | ✅ Yes | Create new ticket |
| `/tickets` | GET | ❌ No | List all tickets |
| `/tickets/{id}` | GET | ❌ No | Get ticket details |
| `/tickets/{id}` | PATCH | ✅ Yes | Update ticket |
| `/tickets/{id}/assignee` | PATCH | ✅ Yes | Assign ticket |
| `/tickets/{id}/state` | PATCH | ✅ Yes | Change state |
| `/tickets/{id}/comments` | POST | ✅ Yes | Add comment |
| `/tickets/search` | GET | ❌ No | Search tickets |
| `/tickets/filter` | GET | ❌ No | Filter by status |

---

## Support

- **Requirements**: See `.kiro/specs/support-ticket-management-system/requirements.md`
- **Design**: See `.kiro/specs/support-ticket-management-system/design.md`
- **Issues**: Report bugs or request features through your project's issue tracker

---

## Version

API Version: 1.0.0

Last Updated: January 2024
