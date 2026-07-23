# Database Setup Guide

## Overview

This directory contains the database schema, migration scripts, and seed data for the Support Ticket Management System. The system uses PostgreSQL as the relational database for ACID compliance and data integrity.

## Directory Structure

```
database/
├── schema-or-migrations/      # SQL migration files
│   ├── 000_create_migrations_table.sql
│   ├── 001_create_tickets_table.sql
│   ├── 002_create_comments_table.sql
│   ├── 003_create_audit_log_table.sql
│   └── migrate.sh             # Migration runner script
├── seed-data/                 # Development seed data
│   ├── seed.sql              # Sample data for testing
│   └── seed.sh               # Seed data runner script
└── setup-notes.md            # This file
```

## Prerequisites

### Required Software

1. **PostgreSQL 12 or higher**
   - Install via package manager or download from https://www.postgresql.org/download/
   - Verify installation: `psql --version`

2. **psql CLI Tool**
   - Included with PostgreSQL installation
   - Required for running migration and seed scripts

### Database Setup

1. **Create Database**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE ticketdb;
   
   # Create user (optional, if not using default postgres user)
   CREATE USER ticketapp WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE ticketdb TO ticketapp;
   
   # Exit psql
   \q
   ```

2. **Set Environment Variables**
   ```bash
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_NAME=ticketdb
   export DB_USER=postgres
   export DB_PASSWORD=your_password
   ```

   For convenience, add these to your `.env` file or shell profile.

## Running Migrations

### Quick Start

```bash
# Navigate to migrations directory
cd database/schema-or-migrations

# Run all migrations
DB_NAME=ticketdb DB_USER=postgres DB_PASSWORD=secret ./migrate.sh up

# Check migration status
DB_NAME=ticketdb DB_USER=postgres DB_PASSWORD=secret ./migrate.sh status
```

### Migration Commands

**Apply all pending migrations:**
```bash
./migrate.sh up
```

**Check migration status:**
```bash
./migrate.sh status
```

**View help:**
```bash
./migrate.sh
```

### Migration Order

Migrations are applied in numerical order:

1. `000_create_migrations_table.sql` - Creates migration tracking table
2. `001_create_tickets_table.sql` - Creates tickets table with indexes
3. `002_create_comments_table.sql` - Creates comments table with foreign keys
4. `003_create_audit_log_table.sql` - Creates audit log table

### Migration Details

#### 000: Migrations Table
- Creates `schema_migrations` table to track applied migrations
- Stores version, description, applied timestamp, and checksum

#### 001: Tickets Table
- Creates `tickets` table with all core fields
- Adds constraints for priority and state validation
- Creates indexes for:
  - State filtering (`idx_tickets_state`)
  - Assignee lookups (`idx_tickets_assignee`)
  - Chronological ordering (`idx_tickets_created_at`)
  - Full-text search (`idx_tickets_search` - GIN index)
- Adds trigger to auto-update `updated_at` timestamp

#### 002: Comments Table
- Creates `comments` table with foreign key to tickets
- Cascade delete: comments deleted when parent ticket is deleted
- Creates indexes for:
  - Ticket lookups (`idx_comments_ticket_id`)
  - Chronological ordering per ticket (`idx_comments_created_at`)

#### 003: Audit Log Table
- Creates `audit_log` table for compliance tracking
- Records all state-changing operations
- Creates indexes for:
  - Ticket audit trail (`idx_audit_log_ticket_id`)
  - Chronological audit queries (`idx_audit_log_created_at`)
  - User activity tracking (`idx_audit_log_user_id`)
  - Operation type filtering (`idx_audit_log_operation`)

## Database Schema

### Tables

#### tickets
- **Purpose:** Core ticket entity storing all ticket information and state
- **Primary Key:** `id` (UUID, auto-generated)
- **Key Fields:**
  - `title` (VARCHAR 200, NOT NULL) - Ticket title
  - `description` (TEXT, NOT NULL) - Detailed description
  - `priority` (VARCHAR 20, NOT NULL) - Low, Medium, High, Critical
  - `state` (VARCHAR 20, NOT NULL) - Open, In_Progress, Resolved, Closed, Cancelled
  - `assignee` (VARCHAR 100, NULLABLE) - Assigned user ID
  - `created_at` (TIMESTAMPTZ, NOT NULL) - Creation timestamp
  - `updated_at` (TIMESTAMPTZ, NOT NULL) - Last update timestamp (auto-updated)

#### comments
- **Purpose:** Collaborative comments associated with tickets
- **Primary Key:** `id` (UUID, auto-generated)
- **Foreign Key:** `ticket_id` → tickets(id) ON DELETE CASCADE
- **Key Fields:**
  - `text` (TEXT, NOT NULL) - Comment content (1-2000 chars)
  - `author` (VARCHAR 100, NOT NULL) - Comment author ID
  - `created_at` (TIMESTAMPTZ, NOT NULL) - Creation timestamp

#### audit_log
- **Purpose:** Audit trail for compliance and tracking
- **Primary Key:** `id` (UUID, auto-generated)
- **Foreign Key:** `ticket_id` → tickets(id) ON DELETE CASCADE
- **Key Fields:**
  - `operation` (VARCHAR 50, NOT NULL) - CREATE, UPDATE, STATE_TRANSITION, ASSIGN, COMMENT
  - `user_id` (VARCHAR 100, NOT NULL) - User who performed operation
  - `old_state` (VARCHAR 20, NULLABLE) - Previous state (for transitions)
  - `new_state` (VARCHAR 20, NULLABLE) - New state (for transitions)
  - `changes` (JSONB, NULLABLE) - JSON object with field changes
  - `created_at` (TIMESTAMPTZ, NOT NULL) - Audit entry timestamp

#### schema_migrations
- **Purpose:** Track applied database migrations
- **Primary Key:** `version` (VARCHAR 50)
- **Key Fields:**
  - `description` (TEXT, NOT NULL) - Migration description
  - `applied_at` (TIMESTAMPTZ, NOT NULL) - When migration was applied
  - `checksum` (VARCHAR 64, NULLABLE) - File checksum for integrity

### State Machine

Valid ticket state transitions:

```
Open ──────────> In_Progress ──────> Resolved ──────> Closed
 │                    │
 │                    │
 └──> Cancelled <─────┘
```

**Valid Transitions:**
- Open → In_Progress ✓
- Open → Cancelled ✓
- In_Progress → Resolved ✓
- In_Progress → Cancelled ✓
- Resolved → Closed ✓

**Terminal States:**
- Closed (no further transitions allowed)
- Cancelled (no further transitions allowed)

### Indexes

**Performance Indexes:**
1. `idx_tickets_state` - Fast filtering by state (B-tree)
2. `idx_tickets_assignee` - Quick assignee lookups (B-tree, partial index)
3. `idx_tickets_created_at` - Chronological ordering (B-tree DESC)
4. `idx_tickets_search` - Full-text search (GIN index on tsvector)
5. `idx_comments_ticket_id` - Comment lookups by ticket (B-tree)
6. `idx_comments_created_at` - Chronological comment ordering (B-tree composite)
7. `idx_audit_log_ticket_id` - Audit trail lookups (B-tree)
8. `idx_audit_log_created_at` - Audit chronological queries (B-tree DESC)
9. `idx_audit_log_user_id` - User activity tracking (B-tree)
10. `idx_audit_log_operation` - Operation type filtering (B-tree)

## Loading Seed Data

### Quick Start

```bash
# Navigate to seed data directory
cd database/seed-data

# Load seed data (WARNING: Deletes existing data!)
DB_NAME=ticketdb DB_USER=postgres DB_PASSWORD=secret ./seed.sh
```

### Seed Data Contents

The seed script creates:
- **8 sample tickets** covering all states (Open, In_Progress, Resolved, Closed, Cancelled)
- **10 sample comments** demonstrating collaboration and troubleshooting
- **15 audit log entries** showing ticket lifecycle progression

**Sample Tickets:**
1. Critical priority - Database connection pool issue (Open)
2. High priority - LDAP authentication failure (In_Progress, assigned to alice@company.com)
3. High priority - Email notifications not sending (Resolved, assigned to bob@company.com)
4. Low priority - Timezone display issue (Closed, complete lifecycle)
5. Medium priority - Excel export feature request (Cancelled)
6. Medium priority - Search performance (Open, assigned to bob@company.com)
7. Low priority - API documentation update (Open, unassigned)
8. Critical priority - Memory leak investigation (In_Progress with detailed comments)

### Manual Seed Data Loading

If you prefer to load seed data manually without the script:

```bash
psql -h localhost -p 5432 -U postgres -d ticketdb -f seed.sql
```

## Verification

### Verify Schema

```sql
-- List all tables
\dt

-- Describe tickets table
\d tickets

-- Describe comments table
\d comments

-- Describe audit_log table
\d audit_log

-- List all indexes
\di
```

### Verify Seed Data

```sql
-- Count tickets by state
SELECT state, COUNT(*) 
FROM tickets 
GROUP BY state 
ORDER BY state;

-- List tickets with comment counts
SELECT t.id, t.title, t.state, COUNT(c.id) as comment_count
FROM tickets t
LEFT JOIN comments c ON t.id = c.ticket_id
GROUP BY t.id, t.title, t.state
ORDER BY t.created_at DESC;

-- View audit trail for a ticket
SELECT operation, user_id, old_state, new_state, created_at
FROM audit_log
WHERE ticket_id = '22222222-2222-2222-2222-222222222222'
ORDER BY created_at;

-- Test full-text search
SELECT id, title, state, priority
FROM tickets
WHERE to_tsvector('english', title || ' ' || description) @@ to_tsquery('english', 'database');
```

## Migration Tool Alternatives

The provided `migrate.sh` script is a simple migration runner suitable for development and small deployments. For production environments, consider these alternatives:

### 1. db-migrate (Node.js)

**Installation:**
```bash
npm install -g db-migrate db-migrate-pg
```

**Setup:**
```json
// database.json
{
  "dev": {
    "driver": "pg",
    "host": "localhost",
    "database": "ticketdb",
    "user": "postgres",
    "password": "secret"
  }
}
```

**Usage:**
```bash
db-migrate up
db-migrate down
db-migrate create add_new_column
```

### 2. Flyway (Java)

**Installation:**
```bash
# Download from https://flywaydb.org/download/
# Or use Docker
docker pull flyway/flyway
```

**Usage:**
```bash
flyway -url=jdbc:postgresql://localhost:5432/ticketdb \
       -user=postgres \
       -password=secret \
       migrate
```

### 3. TypeORM Migrations (TypeScript/Node.js)

**Installation:**
```bash
npm install typeorm pg
```

**Configuration:**
```typescript
// ormconfig.json
{
  "type": "postgres",
  "host": "localhost",
  "port": 5432,
  "username": "postgres",
  "password": "secret",
  "database": "ticketdb",
  "synchronize": false,
  "logging": true,
  "entities": ["src/entity/**/*.ts"],
  "migrations": ["database/schema-or-migrations/**/*.ts"]
}
```

**Usage:**
```bash
typeorm migration:run
typeorm migration:revert
typeorm migration:create -n AddNewColumn
```

### 4. Liquibase (Java, cross-platform)

**Installation:**
```bash
# Download from https://www.liquibase.org/download
```

**Usage:**
```bash
liquibase --changeLogFile=changelog.xml update
liquibase --changeLogFile=changelog.xml rollback
```

## Backup and Recovery

### Create Backup

```bash
# Full database backup
pg_dump -h localhost -U postgres -d ticketdb -F c -f ticketdb_backup.dump

# SQL format backup
pg_dump -h localhost -U postgres -d ticketdb -f ticketdb_backup.sql

# Schema only
pg_dump -h localhost -U postgres -d ticketdb --schema-only -f schema_backup.sql

# Data only
pg_dump -h localhost -U postgres -d ticketdb --data-only -f data_backup.sql
```

### Restore Backup

```bash
# From custom format
pg_restore -h localhost -U postgres -d ticketdb ticketdb_backup.dump

# From SQL format
psql -h localhost -U postgres -d ticketdb -f ticketdb_backup.sql
```

### Automated Backups

Consider setting up automated backups using:
- **pg_basebackup** for continuous archiving
- **cron jobs** for scheduled backups
- **Cloud provider backups** (AWS RDS automated backups, Azure Database backups, etc.)

## Performance Optimization

### Connection Pooling

Use a connection pool in your application to manage database connections efficiently:

**Recommended Settings:**
- **Pool Size:** 10-20 connections for small teams
- **Max Connections:** Based on `max_connections` PostgreSQL setting
- **Idle Timeout:** 30 seconds
- **Connection Timeout:** 10 seconds

**Example (Node.js with pg):**
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ticketdb',
  user: 'postgres',
  password: 'secret',
  max: 20,                  // Max connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000
});
```

### Query Optimization

**Use prepared statements:**
```javascript
// Good: Parameterized query
pool.query('SELECT * FROM tickets WHERE state = $1', ['Open']);

// Bad: String concatenation (SQL injection risk)
pool.query(`SELECT * FROM tickets WHERE state = '${state}'`);
```

**Use indexes effectively:**
```sql
-- Index will be used
SELECT * FROM tickets WHERE state = 'Open';

-- Index will be used
SELECT * FROM tickets WHERE assignee = 'alice@company.com';

-- Full-text search uses GIN index
SELECT * FROM tickets 
WHERE to_tsvector('english', title || ' ' || description) @@ to_tsquery('english', 'database');
```

### Monitoring

**Check slow queries:**
```sql
-- Enable slow query logging in postgresql.conf
log_min_duration_statement = 1000  -- Log queries taking > 1 second
```

**Check index usage:**
```sql
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

**Check table statistics:**
```sql
SELECT schemaname, tablename, n_live_tup, n_dead_tup, last_vacuum, last_autovacuum
FROM pg_stat_user_tables;
```

## Troubleshooting

### Common Issues

**1. Connection Refused**
```
Error: connection refused
```
**Solution:** Verify PostgreSQL is running and accepting connections
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Start PostgreSQL (varies by OS)
# macOS with Homebrew:
brew services start postgresql

# Linux with systemd:
sudo systemctl start postgresql
```

**2. Authentication Failed**
```
Error: authentication failed for user
```
**Solution:** Check credentials and pg_hba.conf
```bash
# Edit pg_hba.conf to allow password authentication
# Location varies: /etc/postgresql/*/main/pg_hba.conf or /var/lib/pgsql/data/pg_hba.conf

# Add or modify line:
host    all             all             127.0.0.1/32            md5
```

**3. Database Does Not Exist**
```
Error: database "ticketdb" does not exist
```
**Solution:** Create the database first
```bash
psql -U postgres -c "CREATE DATABASE ticketdb;"
```

**4. Permission Denied**
```
Error: permission denied for table tickets
```
**Solution:** Grant permissions to user
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ticketapp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ticketapp;
```

**5. Migration Already Applied**
```
Warning: Migration 001 already applied
```
**Solution:** This is expected behavior. Use `./migrate.sh status` to check which migrations are applied.

## Security Considerations

### Production Settings

1. **Use Strong Passwords**
   - Minimum 16 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Rotate regularly

2. **Limit Network Access**
   - Configure pg_hba.conf to restrict connections
   - Use SSL/TLS for remote connections
   - Firewall rules to limit database port access

3. **Use Least Privilege**
   - Create separate users for application vs. admin
   - Grant only necessary permissions
   - Avoid using postgres superuser in application

4. **Enable SSL**
   ```sql
   -- Force SSL connections
   ALTER SYSTEM SET ssl = on;
   ALTER SYSTEM SET ssl_cert_file = '/path/to/server.crt';
   ALTER SYSTEM SET ssl_key_file = '/path/to/server.key';
   ```

5. **Audit Logging**
   ```sql
   -- Enable connection logging
   ALTER SYSTEM SET log_connections = on;
   ALTER SYSTEM SET log_disconnections = on;
   
   -- Log all DDL statements
   ALTER SYSTEM SET log_statement = 'ddl';
   ```

### Environment Variables

Never commit database credentials to version control. Use environment variables or secret management:

```bash
# .env file (add to .gitignore)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketdb
DB_USER=ticketapp
DB_PASSWORD=secure_password_here
```

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

## Support

For issues with database setup or migrations, consult:
1. Check PostgreSQL logs: `/var/log/postgresql/` or `pg_log/`
2. Review migration script output for error messages
3. Verify environment variables are set correctly
4. Check database connection settings in application configuration
