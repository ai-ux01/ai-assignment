# Support Ticket Management System - Setup Guide

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose (for database)
- PostgreSQL 15+ (if running locally without Docker)

## Project Structure

```
support-ticket/
├── src/
│   ├── api/              # REST API routes and controllers
│   ├── services/         # Business logic layer
│   ├── repositories/     # Data access layer
│   ├── models/           # Data models and TypeScript types
│   ├── middleware/       # Express middleware (auth, validation, error handling)
│   ├── utils/            # Helper functions and utilities
│   └── index.ts          # Application entry point
├── database/
│   ├── schema-or-migrations/  # Database schema and migration files
│   └── seed-data/             # Seed data for development
├── dist/                 # Compiled JavaScript output
├── coverage/             # Test coverage reports
└── logs/                 # Application logs
```

## Installation

### 1. Clone and Install Dependencies

```bash
# Install Node.js dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=ticketuser
DB_PASSWORD=ticketpass
DB_NAME=support_tickets

LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3001
```

### 3. Start PostgreSQL with Docker

```bash
# Start PostgreSQL container
docker-compose up postgres -d

# Verify database is running
docker-compose ps
```

### 4. Development

```bash
# Run in development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

## Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production build

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

## Docker Deployment

### Development with Docker

```bash
# Start all services (database + API)
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Build

```bash
# Build production image
docker build -t support-ticket-api:latest .

# Run production container
docker run -p 3000:3000 --env-file .env support-ticket-api:latest
```

## Database Setup

### Initialize Database Schema

Database schema files should be placed in `database/schema-or-migrations/`.

When using docker-compose, SQL files in this directory are automatically executed when the PostgreSQL container starts for the first time.

### Manual Database Setup

If running PostgreSQL locally without Docker:

```bash
# Create database
psql -U postgres -c "CREATE DATABASE support_tickets;"

# Create user
psql -U postgres -c "CREATE USER ticketuser WITH PASSWORD 'ticketpass';"

# Grant privileges
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE support_tickets TO ticketuser;"

# Run schema files
psql -U ticketuser -d support_tickets -f database/schema-or-migrations/01_init_schema.sql
```

## Health Check

Verify the application is running:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## API Documentation

API endpoints will be available at: `http://localhost:3000/api/v1`

Detailed API documentation will be provided in separate documentation.

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, change the PORT in `.env`:

```env
PORT=3001
```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify connection settings in `.env` match docker-compose.yml

### TypeScript Compilation Errors

```bash
# Clean build
rm -rf dist/
npm run build
```

## Code Quality Standards

This project enforces:
- **TypeScript strict mode** - Full type safety
- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting
- **Jest** - Testing framework

All code must pass linting and formatting checks before commit.

## Next Steps

1. Implement database schema in `database/schema-or-migrations/`
2. Define data models in `src/models/`
3. Implement repositories in `src/repositories/`
4. Implement business logic in `src/services/`
5. Create API routes in `src/api/`
6. Add middleware for validation and error handling
7. Write comprehensive tests

## Support

For issues or questions, please refer to the project documentation or contact the development team.
