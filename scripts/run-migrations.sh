#!/bin/bash

# Database Migration Script for CI/CD
# This script runs database migrations in the correct order

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Database Migration Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if required environment variables are set
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    echo -e "${RED}Error: Required environment variables not set${NC}"
    echo "Required: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
    exit 1
fi

echo -e "${YELLOW}Database Configuration:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: ${DB_PORT:-5432}"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Wait for database to be ready
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
MAX_TRIES=30
TRIES=0

while [ $TRIES -lt $MAX_TRIES ]; do
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d postgres -c '\q' 2>/dev/null; then
        echo -e "${GREEN}✓ Database is ready${NC}"
        break
    fi
    TRIES=$((TRIES + 1))
    echo "  Attempt $TRIES/$MAX_TRIES..."
    sleep 2
done

if [ $TRIES -eq $MAX_TRIES ]; then
    echo -e "${RED}✗ Database connection timeout${NC}"
    exit 1
fi

# Check if database exists, create if not
echo ""
echo -e "${YELLOW}Checking if database exists...${NC}"
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" != "1" ]; then
    echo -e "${YELLOW}Creating database: $DB_NAME${NC}"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${GREEN}✓ Database exists${NC}"
fi

# Run migrations
MIGRATION_DIR="database/migrations"

if [ ! -d "$MIGRATION_DIR" ]; then
    echo -e "${RED}Error: Migration directory not found: $MIGRATION_DIR${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Running database migrations...${NC}"
echo ""

# Find all migration files and sort them
MIGRATION_FILES=$(find $MIGRATION_DIR -name "*.sql" -type f | sort)

if [ -z "$MIGRATION_FILES" ]; then
    echo -e "${YELLOW}No migration files found${NC}"
    exit 0
fi

# Run each migration file
MIGRATION_COUNT=0
for MIGRATION_FILE in $MIGRATION_FILES; do
    MIGRATION_NAME=$(basename $MIGRATION_FILE)
    echo -e "${YELLOW}Running: $MIGRATION_NAME${NC}"
    
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE; then
        echo -e "${GREEN}✓ $MIGRATION_NAME completed${NC}"
        MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
    else
        echo -e "${RED}✗ $MIGRATION_NAME failed${NC}"
        exit 1
    fi
    echo ""
done

# Verify migrations
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Migration Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Migrations run: $MIGRATION_COUNT"
echo ""

# Show created tables
echo -e "${YELLOW}Database tables:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d $DB_NAME -c "\dt"
echo ""

# Show table counts
echo -e "${YELLOW}Row counts:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d $DB_NAME << EOF
SELECT 
    'tickets' as table_name, 
    COUNT(*) as row_count 
FROM tickets
UNION ALL
SELECT 
    'comments' as table_name, 
    COUNT(*) as row_count 
FROM comments
UNION ALL
SELECT 
    'audit_log' as table_name, 
    COUNT(*) as row_count 
FROM audit_log;
EOF

echo ""
echo -e "${GREEN}✓ All migrations completed successfully${NC}"
