# Database Quick Start

Quick reference for database setup. See [setup-notes.md](./setup-notes.md) for complete documentation.

## Setup

### 1. Create Database
```bash
psql -U postgres -c "CREATE DATABASE ticketdb;"
```

### 2. Set Environment Variables
```bash
export DB_NAME=ticketdb
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_HOST=localhost
export DB_PORT=5432
```

### 3. Run Migrations
```bash
cd schema-or-migrations
./migrate.sh up
```

### 4. Load Seed Data (Optional)
```bash
cd ../seed-data
./seed.sh
```

## Verify

```bash
psql -U postgres -d ticketdb -c "\dt"
psql -U postgres -d ticketdb -c "SELECT COUNT(*) FROM tickets;"
```

## Files

- **schema-or-migrations/** - Database schema and migration scripts
  - `000_create_migrations_table.sql` - Migration tracking
  - `001_create_tickets_table.sql` - Tickets table
  - `002_create_comments_table.sql` - Comments table
  - `003_create_audit_log_table.sql` - Audit log table
  - `migrate.sh` - Migration runner

- **seed-data/** - Development test data
  - `seed.sql` - Sample tickets, comments, and audit logs
  - `seed.sh` - Seed data runner

- **setup-notes.md** - Complete documentation
- **README.md** - This file

## Schema Overview

### Tables
- `tickets` - Core ticket entity (8 columns, 4 indexes)
- `comments` - Ticket comments (5 columns, 2 indexes, FK to tickets)
- `audit_log` - Audit trail (8 columns, 4 indexes, FK to tickets)
- `schema_migrations` - Migration tracking (4 columns, 1 index)

### Key Features
- UUID primary keys for all entities
- Full-text search on tickets (GIN index)
- Auto-updating timestamps via triggers
- Cascade deletes for referential integrity
- State machine validation via CHECK constraints
- Comprehensive audit logging

## Commands

| Command | Description |
|---------|-------------|
| `./migrate.sh up` | Apply all pending migrations |
| `./migrate.sh status` | Check migration status |
| `./seed.sh` | Load development seed data |

## Requirements

- PostgreSQL 12 or higher
- psql command-line tool
- Bash shell

See [setup-notes.md](./setup-notes.md) for troubleshooting, production setup, and advanced topics.
