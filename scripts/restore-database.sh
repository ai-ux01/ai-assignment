#!/bin/bash
# ==============================================================================
# Database Restore Script for Support Ticket Management System
# ==============================================================================
# This script restores a PostgreSQL database from a backup file
# 
# Usage:
#   ./restore-database.sh <backup_file>
#
# Options:
#   -h, --help              Show this help message
#   -f, --force             Force restore without confirmation
#
# Environment Variables:
#   POSTGRES_USER           Database user (required)
#   POSTGRES_PASSWORD       Database password (required)
#   POSTGRES_DB             Database name (required)
#   PGHOST                  Database host (default: localhost)
# ==============================================================================

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================

BACKUP_FILE="${1:-}"
FORCE_RESTORE="${FORCE_RESTORE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==============================================================================
# Functions
# ==============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

show_help() {
    cat << EOF
Database Restore Script for Support Ticket Management System

Usage: $(basename "$0") <backup_file> [OPTIONS]

Options:
    -h, --help              Show this help message
    -f, --force             Force restore without confirmation

Environment Variables:
    POSTGRES_USER           Database user (required)
    POSTGRES_PASSWORD       Database password (required)
    POSTGRES_DB             Database name (required)
    PGHOST                  Database host (default: localhost)

Examples:
    # Restore from backup
    ./restore-database.sh /backups/backup_support_tickets_20240115_120000.sql

    # Restore compressed backup
    ./restore-database.sh /backups/backup_support_tickets_20240115_120000.sql.gz

    # Force restore without confirmation
    ./restore-database.sh /backups/backup.sql -f
EOF
}

validate_environment() {
    local missing_vars=()
    
    [[ -z "${POSTGRES_USER:-}" ]] && missing_vars+=("POSTGRES_USER")
    [[ -z "${POSTGRES_PASSWORD:-}" ]] && missing_vars+=("POSTGRES_PASSWORD")
    [[ -z "${POSTGRES_DB:-}" ]] && missing_vars+=("POSTGRES_DB")
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
}

validate_backup_file() {
    if [[ -z "${BACKUP_FILE}" ]]; then
        log_error "No backup file specified"
        show_help
        exit 1
    fi
    
    if [[ ! -f "${BACKUP_FILE}" ]]; then
        log_error "Backup file not found: ${BACKUP_FILE}"
        exit 1
    fi
    
    # Check if compressed
    if [[ "${BACKUP_FILE}" == *.gz ]]; then
        log_info "Detected compressed backup file"
        if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
            log_error "Backup file is corrupted"
            exit 1
        fi
    fi
    
    log_info "Backup file validated: ${BACKUP_FILE}"
}

confirm_restore() {
    if [[ "${FORCE_RESTORE}" == "true" ]]; then
        return 0
    fi
    
    log_warn "This will DROP and recreate the database: ${POSTGRES_DB}"
    log_warn "All existing data will be PERMANENTLY DELETED"
    
    read -rp "Are you sure you want to continue? (yes/no): " confirmation
    
    if [[ "${confirmation}" != "yes" ]]; then
        log_info "Restore cancelled by user"
        exit 0
    fi
}

restore_database() {
    log_info "Starting database restore..."
    log_info "Database: ${POSTGRES_DB}"
    log_info "Backup file: ${BACKUP_FILE}"
    
    # Export password for psql
    export PGPASSWORD="${POSTGRES_PASSWORD}"
    
    # Terminate existing connections
    log_info "Terminating existing database connections..."
    psql -h "${PGHOST:-localhost}" \
         -U "${POSTGRES_USER}" \
         -d postgres \
         -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
         2>/dev/null || true
    
    # Drop and recreate database
    log_info "Dropping database..."
    psql -h "${PGHOST:-localhost}" \
         -U "${POSTGRES_USER}" \
         -d postgres \
         -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
    
    log_info "Creating database..."
    psql -h "${PGHOST:-localhost}" \
         -U "${POSTGRES_USER}" \
         -d postgres \
         -c "CREATE DATABASE ${POSTGRES_DB} ENCODING 'UTF8';"
    
    # Restore from backup
    log_info "Restoring database from backup..."
    
    if [[ "${BACKUP_FILE}" == *.gz ]]; then
        # Restore compressed backup
        gunzip -c "${BACKUP_FILE}" | \
            psql -h "${PGHOST:-localhost}" \
                 -U "${POSTGRES_USER}" \
                 -d "${POSTGRES_DB}" \
                 --set ON_ERROR_STOP=on \
                 --quiet
    else
        # Restore uncompressed backup
        psql -h "${PGHOST:-localhost}" \
             -U "${POSTGRES_USER}" \
             -d "${POSTGRES_DB}" \
             --set ON_ERROR_STOP=on \
             --quiet \
             -f "${BACKUP_FILE}"
    fi
    
    log_info "Database restored successfully"
}

verify_restore() {
    log_info "Verifying restore..."
    
    export PGPASSWORD="${POSTGRES_PASSWORD}"
    
    # Check table count
    local table_count
    table_count=$(psql -h "${PGHOST:-localhost}" \
                       -U "${POSTGRES_USER}" \
                       -d "${POSTGRES_DB}" \
                       -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    
    log_info "Tables restored: ${table_count}"
    
    # Check ticket count
    local ticket_count
    ticket_count=$(psql -h "${PGHOST:-localhost}" \
                        -U "${POSTGRES_USER}" \
                        -d "${POSTGRES_DB}" \
                        -t -c "SELECT COUNT(*) FROM tickets;" 2>/dev/null | tr -d ' ' || echo "0")
    
    log_info "Tickets restored: ${ticket_count}"
    
    if [[ ${table_count} -eq 0 ]]; then
        log_error "No tables found after restore"
        return 1
    fi
    
    log_info "Restore verification passed"
    return 0
}

# ==============================================================================
# Parse Arguments
# ==============================================================================

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--force)
            FORCE_RESTORE="true"
            shift
            ;;
        *)
            if [[ -z "${BACKUP_FILE}" ]]; then
                BACKUP_FILE="$1"
                shift
            else
                log_error "Unknown option: $1"
                show_help
                exit 1
            fi
            ;;
    esac
done

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    log_info "=== Database Restore Started ==="
    log_info "Timestamp: $(date)"
    
    # Validate environment
    validate_environment
    
    # Validate backup file
    validate_backup_file
    
    # Confirm restore
    confirm_restore
    
    # Restore database
    if ! restore_database; then
        log_error "Restore process failed"
        exit 1
    fi
    
    # Verify restore
    if ! verify_restore; then
        log_error "Restore verification failed"
        exit 1
    fi
    
    log_info "=== Database Restore Completed ==="
}

# Run main function
main "$@"
