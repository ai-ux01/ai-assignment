# ⚠️ DEVELOPMENT MODE - AUTHENTICATION DISABLED

## Current Status

**Authentication has been TEMPORARILY DISABLED for development testing.**

All protected endpoints (POST, PATCH) are now accessible without JWT tokens.

---

## What Was Changed

The following routes in `src/api/ticketRoutes.ts` have authentication middleware commented out:

1. **POST /api/v1/tickets** - Create ticket
2. **PATCH /api/v1/tickets/:id** - Update ticket
3. **PATCH /api/v1/tickets/:id/assignee** - Assign ticket
4. **PATCH /api/v1/tickets/:id/state** - Transition state
5. **POST /api/v1/tickets/:id/comments** - Add comment

---

## Testing Without Authentication

You can now make requests without the `Authorization` header:

```bash
# Create a ticket
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test ticket",
    "description": "This is a test ticket",
    "priority": "Medium"
  }'

# List all tickets
curl http://localhost:3000/api/v1/tickets

# Get ticket details
curl http://localhost:3000/api/v1/tickets/{ticket-id}

# Update ticket
curl -X PATCH http://localhost:3000/api/v1/tickets/{ticket-id} \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated title"
  }'

# Assign ticket
curl -X PATCH http://localhost:3000/api/v1/tickets/{ticket-id}/assignee \
  -H "Content-Type: application/json" \
  -d '{
    "assignee": "john@example.com"
  }'

# Transition state
curl -X PATCH http://localhost:3000/api/v1/tickets/{ticket-id}/state \
  -H "Content-Type: application/json" \
  -d '{
    "state": "In_Progress"
  }'

# Add comment
curl -X POST http://localhost:3000/api/v1/tickets/{ticket-id}/comments \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a comment",
    "author": "john@example.com"
  }'

# Search tickets
curl "http://localhost:3000/api/v1/tickets/search?q=test"

# Filter by status
curl "http://localhost:3000/api/v1/tickets/filter?state=Open"
```

---

## ⚠️ IMPORTANT: Re-enabling Authentication for Production

### Before deploying to production, you MUST:

1. **Uncomment the authentication middleware** in `src/api/ticketRoutes.ts`
2. **Search for comments containing "TEMPORARILY DISABLED FOR DEVELOPMENT"**
3. **Restore all 5 `authenticateRequest` middleware calls**
4. **Run tests to ensure authentication is working**

### Quick Re-enable Command

Search and replace in `src/api/ticketRoutes.ts`:

**Find:**
```
// authenticateRequest, // TEMPORARILY DISABLED FOR DEVELOPMENT - Re-enable for production!
```

**Replace with:**
```
authenticateRequest, // Authentication required
```

Also change fallback user IDs:

**Find:**
```
const userId = authenticatedReq.user?.id || 'dev-user'; // Fallback for development
const requestId = authenticatedReq.requestId || 'dev-request-' + Date.now();
```

**Replace with:**
```
const userId = authenticatedReq.user?.id || 'unknown';
const requestId = authenticatedReq.requestId;
```

---

## Why Authentication Is Important

JWT authentication provides:
- ✅ User identity tracking for audit logs
- ✅ Access control and authorization
- ✅ Security compliance
- ✅ Prevention of unauthorized modifications

**Never deploy to production without authentication enabled!**

---

## Audit Logging Impact

With authentication disabled:
- Audit logs will show `userId: 'dev-user'` instead of real user IDs
- Request IDs will be generated as `dev-request-{timestamp}`
- This is acceptable for development but NOT for production

---

## Next Steps

1. Test your API endpoints without authentication barriers
2. Verify all functionality works as expected
3. When ready for production, re-enable authentication
4. Test with valid JWT tokens before deploying

---

**Created:** $(date)  
**Purpose:** Development testing convenience  
**Security Level:** ⚠️ DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION
