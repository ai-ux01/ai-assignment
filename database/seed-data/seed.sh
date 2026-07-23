#!/bin/bash

# Database Seed Script
# Usage: ./seed.sh
# 
# Environment variables:
#   DB_HOST - Database host (default: localhost)
#   DB_PORT - Database port (default: 5432)
#   DB_NAME - Database name (required)
#   DB_USER - Database user (required)
#   DB_PASSWORD - Database password (required)

set -e

# Configuration
SEED_DIR="$(cd "$(dirname "$0")" && pwd)"
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
    echo "Example: DB_NAME=ticketdb DB_USER=postgres DB_PASSWORD=secret ./seed.sh"
    exit 1
fi

# PostgreSQL connection string
PGPASSWORD="$DB_PASSWORD"
export PGPASSWORD
PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1"

# Warning
echo -e "${YELLOW}=== Database Seed Script ===${NC}"
echo -e "${RED}WARNING: This will delete all existing data in the database!${NC}"
echo -e "${YELLOW}Target database: $DB_NAME@$DB_HOST:$DB_PORT${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Seed operation cancelled${NC}"
    exit 0
fi

# Execute seed script
echo -e "${GREEN}Executing seed data script...${NC}"
$PSQL_CMD -f "$SEED_DIR/seed.sql"

echo -e "${GREEN}✓ Seed data inserted successfully${NC}"
