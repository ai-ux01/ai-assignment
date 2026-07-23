# Documentation Index

Complete guide to all documentation in the Support Ticket Management System.

## Getting Started

| Document | Purpose | Audience |
|----------|---------|----------|
| [QUICK_START.md](./QUICK_START.md) | Get running in 5 minutes | New developers |
| [README.md](./README.md) | Project overview and introduction | Everyone |
| [SETUP.md](./SETUP.md) | Detailed installation guide | New developers |

## Core Developer Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute code | Contributors |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Architecture deep dive | Developers |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Complete API reference | API users, developers |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Testing strategies and examples | Developers, QA |

## Deployment & Operations

| Document | Purpose | Audience |
|----------|---------|----------|
| [ENVIRONMENT_CONFIG.md](./ENVIRONMENT_CONFIG.md) | Environment variables | DevOps, developers |
| [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) | Deploy to production | DevOps |
| [PRODUCTION_QUICK_REFERENCE.md](./PRODUCTION_QUICK_REFERENCE.md) | Quick deployment commands | DevOps |
| [DOCKER_PRODUCTION_README.md](./DOCKER_PRODUCTION_README.md) | Docker configuration | DevOps |
| [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md) | Performance tuning | DevOps, developers |

## Database

| Document | Purpose | Audience |
|----------|---------|----------|
| [database/README.md](./database/README.md) | Database overview | Developers, DBAs |
| [database/schema-or-migrations/](./database/schema-or-migrations/) | Schema migrations | Developers, DBAs |
| [database/seed-data/](./database/seed-data/) | Test data | Developers |

## Specifications (Kiro AI)

| Document | Purpose | Audience |
|----------|---------|----------|
| [.kiro/specs/.../requirements.md](./.kiro/specs/support-ticket-management-system/requirements.md) | Detailed requirements | Developers, PM |
| [.kiro/specs/.../design.md](./.kiro/specs/support-ticket-management-system/design.md) | Technical design | Developers |
| [.kiro/specs/.../tasks.md](./.kiro/specs/support-ticket-management-system/tasks.md) | Implementation tasks | Developers |

## Component-Specific Documentation

### Middleware

| Document | Location | Purpose |
|----------|----------|---------|
| Middleware README | [src/middleware/README.md](./src/middleware/README.md) | Middleware overview |
| Error Handling Guide | [src/middleware/ERROR_HANDLING_GUIDE.md](./src/middleware/ERROR_HANDLING_GUIDE.md) | Error patterns |

### Utils

| Document | Location | Purpose |
|----------|----------|---------|
| Logging README | [src/utils/README_LOGGING.md](./src/utils/README_LOGGING.md) | Logging setup |
| Input Sanitizer | [src/utils/INPUT_SANITIZER_README.md](./src/utils/INPUT_SANITIZER_README.md) | Security sanitization |

### Repositories

| Document | Location | Purpose |
|----------|----------|---------|
| Audit Log Repository | [src/repositories/AUDIT_LOG_REPOSITORY_README.md](./src/repositories/AUDIT_LOG_REPOSITORY_README.md) | Audit logging |

## Documentation by Persona

### New Developer (First Day)

1. [QUICK_START.md](./QUICK_START.md) - Get running
2. [README.md](./README.md) - Understand the project
3. [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Learn architecture
4. [CONTRIBUTING.md](./CONTRIBUTING.md) - Start contributing

### API Consumer

1. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
2. [README.md](./README.md) - Project overview
3. [ENVIRONMENT_CONFIG.md](./ENVIRONMENT_CONFIG.md) - Configuration

### QA Engineer

1. [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Testing approach
2. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API endpoints
3. [.kiro/specs/.../requirements.md](./.kiro/specs/support-ticket-management-system/requirements.md) - Requirements

### DevOps Engineer

1. [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Deployment
2. [ENVIRONMENT_CONFIG.md](./ENVIRONMENT_CONFIG.md) - Configuration
3. [DOCKER_PRODUCTION_README.md](./DOCKER_PRODUCTION_README.md) - Docker setup
4. [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md) - Tuning

### Project Manager

1. [README.md](./README.md) - Project overview
2. [.kiro/specs/.../requirements.md](./.kiro/specs/support-ticket-management-system/requirements.md) - Requirements
3. [.kiro/specs/.../tasks.md](./.kiro/specs/support-ticket-management-system/tasks.md) - Task list

## Documentation by Topic

### Architecture

- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - System architecture
- [.kiro/specs/.../design.md](./.kiro/specs/support-ticket-management-system/design.md) - Technical design
- [database/README.md](./database/README.md) - Database design

### API

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Complete API reference
- [.kiro/specs/.../design.md](./.kiro/specs/support-ticket-management-system/design.md) - API contracts
- [src/api/](./src/api/) - Implementation

### Testing

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Testing strategies
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Testing patterns
- Test files: `**/*.test.ts`, `**/*.property.test.ts`, `**/*.integration.test.ts`

### Security

- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#security-considerations) - Security patterns
- [src/utils/INPUT_SANITIZER_README.md](./src/utils/INPUT_SANITIZER_README.md) - Input sanitization
- [src/middleware/auth.middleware.ts](./src/middleware/auth.middleware.ts) - Authentication

### State Machine

- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#state-machine-implementation) - Implementation
- [.kiro/specs/.../design.md](./.kiro/specs/support-ticket-management-system/design.md) - Design
- [src/services/TicketStateMachine.ts](./src/services/TicketStateMachine.ts) - Code

### Error Handling

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#error-handling) - Error responses
- [src/middleware/ERROR_HANDLING_GUIDE.md](./src/middleware/ERROR_HANDLING_GUIDE.md) - Patterns
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#error-handling-strategy) - Strategy

## Quick Reference Tables

### HTTP Endpoints

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#endpoints) for complete reference:

- `POST /api/v1/tickets` - Create ticket
- `GET /api/v1/tickets` - List tickets
- `GET /api/v1/tickets/:id` - Get ticket details
- `PATCH /api/v1/tickets/:id` - Update ticket
- `PATCH /api/v1/tickets/:id/assignee` - Assign ticket
- `PATCH /api/v1/tickets/:id/state` - Transition state
- `POST /api/v1/tickets/:id/comments` - Add comment
- `GET /api/v1/tickets/search` - Search tickets
- `GET /api/v1/tickets/filter` - Filter by status

### State Transitions

See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#state-machine-implementation) for details:

```
Open → In_Progress → Resolved → Closed
  ↓                      ↓
Cancelled          Cancelled
```

### NPM Scripts

See [CONTRIBUTING.md](./CONTRIBUTING.md#common-commands) for complete list:

```bash
npm run dev           # Development server
npm test              # Run tests
npm run build         # Build for production
npm run lint          # Check code style
npm run format        # Format code
```

## Contributing to Documentation

When adding new documentation:

1. **Add to this index** - Update relevant sections
2. **Link from README** - Add to main README if major
3. **Follow style** - Use markdown, clear headers, examples
4. **Keep current** - Update when code changes
5. **Review** - Have another developer review

### Documentation Standards

- **Use markdown** - `.md` extension
- **Clear structure** - Table of contents for long docs
- **Code examples** - Include working examples
- **Cross-references** - Link to related docs
- **Up-to-date** - Update with code changes

## Finding Documentation

### By File Name

```bash
# Search all documentation
find . -name "*.md" -type f

# Search for specific topic
grep -r "state machine" --include="*.md"
```

### By Content

```bash
# Find docs mentioning "authentication"
grep -r "authentication" --include="*.md"

# Find docs with code examples
grep -r "```typescript" --include="*.md"
```

### In Your Editor

Most editors support workspace search:
- VS Code: `Cmd/Ctrl + Shift + F`
- Search for keywords across all `.md` files

## Documentation Maintenance

| Task | Frequency | Owner |
|------|-----------|-------|
| Update API docs | Every API change | Backend developers |
| Update architecture docs | Major refactors | Tech lead |
| Review accuracy | Monthly | Team |
| Fix broken links | As discovered | Anyone |
| Add examples | As needed | Developers |

## Getting Help

If you can't find what you need:

1. **Check this index** - Comprehensive guide to all docs
2. **Search codebase** - Use grep or editor search
3. **Check specs** - `.kiro/specs/` for requirements
4. **Ask team** - Someone may know where to look
5. **Add it** - If it's missing, create it!

---

**Last Updated**: Task 11.3 - Developer Documentation  
**Maintained By**: Development Team  
**Questions**: See [CONTRIBUTING.md](./CONTRIBUTING.md)
