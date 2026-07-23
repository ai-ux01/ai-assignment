# Support Ticket Management System

A comprehensive internal application for support teams to create, track, manage, and resolve customer support requests. Built as part of an AI-assisted engineering capability assessment.

## Project Overview

The Support Ticket Management System is a RESTful web application that provides ticket lifecycle management with state transitions, assignment capabilities, collaborative commenting, and search/filter functionality. The system emphasizes data integrity through backend validation, maintains clear separation of concerns, and ensures comprehensive testing through property-based testing.

## Key Features

- **Ticket Lifecycle Management**: Create, read, update tickets with enforced state machine transitions
- **Assignment Management**: Assign tickets to team members with flexible reassignment
- **Collaborative Features**: Add timestamped comments for team communication  
- **Search and Filter**: Keyword search and status-based filtering
- **Data Integrity**: Backend validation and ACID-compliant persistence
- **Error Handling**: Comprehensive validation with descriptive error responses
- **Audit Trail**: Complete audit logging for compliance and troubleshooting

## Technology Stack

- **Backend**: Node.js 18+, TypeScript, Express
- **Database**: PostgreSQL 14+ with ACID compliance
- **Testing**: Jest, fast-check (property-based testing), Supertest
- **Deployment**: Docker, Docker Compose
- **Authentication**: JWT token validation (external provider)

## State Machine

The system enforces strict state transitions:

```
Open → In_Progress → Resolved → Closed
  ↓                      ↓
Cancelled          Cancelled
```

Terminal states (Closed, Cancelled) prevent further transitions.

## Documentation

### For Developers

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Complete guide for contributing to the project
  - Getting started, project architecture, development workflow
  - Coding standards, testing guidelines, commit conventions
  - How to add new features and submit pull requests

- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Deep dive into architecture and implementation
  - System architecture and data flow
  - Layer-by-layer implementation guide
  - State machine, security, performance optimization
  - Common patterns and troubleshooting

- **[API Documentation](./docs/)** - Complete API reference
  - [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) - Full API documentation with examples
  - [API_QUICK_REFERENCE.md](./docs/API_QUICK_REFERENCE.md) - Quick reference with curl commands
  - [openapi.yaml](./docs/openapi.yaml) - OpenAPI/Swagger specification
  - All 9 endpoints documented with request/response examples
  - Authentication, error handling, error codes, and status codes
  - curl, JavaScript, Python, and HTTPie examples

- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Comprehensive testing documentation
  - Testing philosophy and strategies
  - How to run and write tests
  - Property-based testing with fast-check
  - Integration testing and coverage

- **[SETUP.md](./SETUP.md)** - Initial project setup and configuration

### Project Documentation

- `database/README.md` - Database setup and schema documentation
- `.kiro/specs/support-ticket-management-system/` - Kiro AI specifications
  - `requirements.md` - Detailed requirements document
  - `design.md` - Technical design document
  - `tasks.md` - Implementation task list

### Additional Documentation

- `ENVIRONMENT_CONFIG.md` - Environment variable configuration
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Production deployment instructions
- `PERFORMANCE_OPTIMIZATIONS.md` - Performance tuning guide

## Quick Start

For a detailed step-by-step setup guide, see **[QUICK_START.md](./QUICK_START.md)**.

```bash
# Clone and install
git clone <repository-url>
cd support-ticket
npm install

# Set up environment
cp .env.example .env

# Start database
docker-compose up -d postgres

# Run the application
npm run dev

# API available at http://localhost:3000
```

Run tests:
```bash
npm test
npm run test:coverage
```

## API Endpoints

- `POST /api/v1/tickets` - Create ticket
- `GET /api/v1/tickets` - List all tickets
- `GET /api/v1/tickets/:id` - Get ticket details
- `PATCH /api/v1/tickets/:id` - Update ticket
- `PATCH /api/v1/tickets/:id/assignee` - Assign ticket
- `PATCH /api/v1/tickets/:id/state` - Transition state
- `POST /api/v1/tickets/:id/comments` - Add comment
- `GET /api/v1/tickets/search?q=keyword` - Search tickets
- `GET /api/v1/tickets/filter?state=Open` - Filter by status

## Testing

The project uses a comprehensive testing strategy:

- **Property-Based Testing**: 38 properties tested with fast-check (100+ iterations each)
- **Unit Tests**: Specific scenarios and edge cases
- **Integration Tests**: Database interactions, transactions, concurrency
- **API Tests**: End-to-end HTTP request/response validation

```bash
# Run all tests
npm test

# Run property-based tests only
npm run test:property

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

## Development Phases

1. **Phase 1**: Infrastructure setup (Weeks 1-2)
2. **Phase 2**: Ticket operations (Weeks 3-4)
3. **Phase 3**: State management (Week 5)
4. **Phase 4**: Assignment and comments (Week 6)
5. **Phase 5**: Search and filter (Week 7)
6. **Phase 6**: Integration and hardening (Week 8)

## Project Status

✅ Requirements specification complete  
✅ Technical design complete  
✅ Implementation tasks defined  
🚧 Implementation in progress

See `tasks.md` in `.kiro/specs/support-ticket-management-system/` for detailed task list.

## License

This is a demonstration project for engineering capability assessment.
