#!/bin/bash

# Database Migration Script
# Usage: ./migrate.sh [up|down|status]
# 
# Environment variables:
#   DB_HOST - Database host (default: localhost)
#   DB_PORT - Database port (default: 5432)
#   DB_NAME - Database name (required)
#   DB_USER - Database user (required)
#   DB_PASSWORD - Database password (required)

set -e

# Configuration
MIGRATIONS_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME}"
DB_USER="${DB_USER}"
DB_PASSWORD="${DB_PASSWORD}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check required environment variables
if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}Error: DB_NAME, DB_USER, and DB_PASSWORD environment variables are required${NC}"
    echo "Example: DB_NAME=ticketdb DB_USER=postgres DB_PASSWORD=secret ./migrate.sh up"
    exit 1
fi

# PostgreSQL connection string
PGPASSWORD="$DB_PASSWORD"
export PGPASSWORD
PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1"

# Function to execute SQL file
execute_sql_file() {
    local file=$1
    echo -e "${YELLOW}Executing: $(basename $file)${NC}"
    $PSQL_CMD -f "$file"
}

# Function to get applied migrations
get_applied_migrations() {
    $PSQL_CMD -t -c "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null || echo ""
}

# Function to apply migration
apply_migration() {
    local file=$1
    local version=$(basename "$file" | cut -d'_' -f1)
    local description=$(basename "$file" .sql | cut -d'_' -f2-)
    
    echo -e "${GREEN}Applying migration $version: $description${NC}"
    execute_sql_file "$file"
    
    # Record migration
    $PSQL_CMD -c "INSERT INTO schema_migrations (version, description) VALUES ('$version', '$description');"
    echo -e "${GREEN}✓ Migration $version applied successfully${NC}"
}

# Function to show migration status
show_status() {
    echo -e "${YELLOW}=== Migration Status ===${NC}"
    
    # Ensure migrations table exists
    $PSQL_CMD -c "CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64)
    );" > /dev/null
    
    # Get applied migrations
    local applied=$(get_applied_migrations | tr -d ' ')
    
    # List all migration files
    for file in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$file" ]; then
            local version=$(basename "$file" | cut -d'_' -f1)
            local description=$(basename "$file" .sql | cut -d'_' -f2-)
            
            if echo "$applied" | grep -q "^$version$"; then
                echo -e "${GREEN}✓${NC} $version - $description (applied)"
            else
                echo -e "${RED}✗${NC} $version - $description (pending)"
            fi
        fi
    done
}

# Function to run all pending migrations
migrate_up() {
    echo -e "${YELLOW}=== Running Database Migrations ===${NC}"
    
    # Ensure migrations table exists
    execute_sql_file "$MIGRATIONS_DIR/000_create_migrations_table.sql"
    
    # Get applied migrations
    local applied=$(get_applied_migrations | tr -d ' ')
    
    # Apply pending migrations
    local count=0
    for file in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$file" ]; then
            local version=$(basename "$file" | cut -d'_' -f1)
            
            # Skip migrations table itself and already applied migrations
            if [ "$version" = "000" ]; then
                continue
            fi
            
            if ! echo "$applied" | grep -q "^$version$"; then
                apply_migration "$file"
                count=$((count + 1))
            else
                echo -e "${YELLOW}Skipping migration $version (already applied)${NC}"
            fi
        fi
    done
    
    if [ $count -eq 0 ]; then
        echo -e "${GREEN}All migrations are up to date${NC}"
    else
        echo -e "${GREEN}Applied $count migration(s) successfully${NC}"
    fi
}

# Function to rollback last migration (simple version)
migrate_down() {
    echo -e "${RED}=== Rollback Migration ===${NC}"
    echo -e "${RED}Warning: This is a simple migration tool. Rollback is not implemented.${NC}"
    echo -e "${RED}For production use, consider using db-migrate, Flyway, or TypeORM migrations.${NC}"
    exit 1
}

# Main script
case "${1:-}" in
    up)
        migrate_up
        ;;
    down)
        migrate_down
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 [up|down|status]"
        echo ""
        echo "Commands:"
        echo "  up      - Apply all pending migrations"
        echo "  down    - Rollback last migration (not implemented)"
        echo "  status  - Show migration status"
        echo ""
        echo "Environment variables:"
        echo "  DB_HOST     - Database host (default: localhost)"
        echo "  DB_PORT     - Database port (default: 5432)"
        echo "  DB_NAME     - Database name (required)"
        echo "  DB_USER     - Database user (required)"
        echo "  DB_PASSWORD - Database password (required)"
        exit 1
        ;;
esac
