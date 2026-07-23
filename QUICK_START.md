# Quick Start Guide

Get up and running with the Support Ticket Management System in minutes.

## Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

## 5-Minute Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd support-ticket

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# The defaults work for local development
# No changes needed unless you have port conflicts
```

### 3. Start Database

```bash
# Start PostgreSQL in Docker
docker-compose up -d postgres

# Verify it's running
docker-compose ps
```

### 4. Run the Application

```bash
# Development mode with hot reload
npm run dev
```

The API is now running at `http://localhost:3000`

### 5. Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

## Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## Your First API Call

Create a ticket:

```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My first ticket",
    "description": "Testing the API",
    "priority": "Medium"
  }'
```

## Next Steps

### Learn the Architecture

Read the [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) to understand:
- System architecture and layers
- Data flow and state machine
- Key design patterns

### Explore the API

Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for:
- All 9 API endpoints
- Request/response examples
- Error handling

### Contribute Code

Follow [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Coding standards
- Git workflow
- Pull request process

### Write Tests

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for:
- Testing strategies
- How to write tests
- Property-based testing

## Project Structure

```
src/
├── api/              # REST API routes
├── services/         # Business logic
├── repositories/     # Database access
├── models/           # TypeScript types
├── middleware/       # Express middleware
└── utils/            # Shared utilities
```

## Common Commands

```bash
# Development
npm run dev           # Start with hot reload
npm run build         # Compile TypeScript
npm start             # Run production build

# Code Quality
npm run lint          # Check code style
npm run lint:fix      # Fix style issues
npm run format        # Format with Prettier

# Testing
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report

# Database
docker-compose up -d postgres     # Start database
docker-compose logs postgres      # View logs
docker-compose down               # Stop all services
```

## Troubleshooting

### Port 3000 Already in Use

Change the port in `.env`:
```env
PORT=3001
```

### Database Connection Failed

Verify PostgreSQL is running:
```bash
docker-compose ps
docker-compose logs postgres
```

### Tests Failing

Clean the database:
```bash
docker-compose down -v
docker-compose up -d postgres
```

## Getting Help

- **Architecture questions**: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- **API usage**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Testing help**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Contributing**: [CONTRIBUTING.md](./CONTRIBUTING.md)

## Key Concepts

### State Machine

Tickets follow strict state transitions:
```
Open → In_Progress → Resolved → Closed
  ↓                      ↓
Cancelled          Cancelled
```

### Priority Levels

- `Critical` - System down, immediate attention
- `High` - Major feature broken
- `Medium` - Minor issue, workaround available
- `Low` - Nice to have, cosmetic issue

### API Pattern

All endpoints follow REST conventions:
- `POST` - Create resources (201 Created)
- `GET` - Read resources (200 OK)
- `PATCH` - Update resources (200 OK)
- Errors return appropriate status codes (400, 404, 422, 500)

### Authentication

Include JWT token in all requests:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/v1/tickets
```

---

**Ready to dive deeper?** Start with the [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)!
