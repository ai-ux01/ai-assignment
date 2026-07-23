#!/bin/bash
# ==============================================================================
# Database Backup Script for Support Ticket Management System
# ==============================================================================
# This script creates timestamped PostgreSQL backups and manages retention
# 
# Usage:
#   ./backup-database.sh [OPTIONS]
#
# Options:
#   -h, --help              Show this help message
#   -r, --retention DAYS    Set retention period (default: 30 days)
#   -c, --compress          Compress backup with gzip
#
# Environment Variables:
#   POSTGRES_USER           Database user (required)
#   POSTGRES_PASSWORD       Database password (required)
#   POSTGRES_DB             Database name (required)
#   PGHOST                  Database host (default: localhost)
#   BACKUP_RETENTION_DAYS   Retention period in days (default: 30)
# ==============================================================================

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================

# Default values
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
COMPRESS="${BACKUP_COMPRESS:-true}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_${POSTGRES_DB}_${TIMESTAMP}.sql"

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
Database Backup Script for Support Ticket Management System

Usage: $(basename "$0") [OPTIONS]

Options:
    -h, --help              Show this help message
    -r, --retention DAYS    Set retention period (default: ${RETENTION_DAYS} days)
    -c, --compress          Compress backup with gzip

Environment Variables:
    POSTGRES_USER           Database user (required)
    POSTGRES_PASSWORD       Database password (required)
    POSTGRES_DB             Database name (required)
    PGHOST                  Database host (default: localhost)
    BACKUP_RETENTION_DAYS   Retention period in days (default: ${RETENTION_DAYS})

Examples:
    # Basic backup
    ./backup-database.sh

    # Backup with 7-day retention
    ./backup-database.sh -r 7

    # Backup with compression
    ./backup-database.sh -c
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

create_backup() {
    log_info "Starting backup of database: ${POSTGRES_DB}"
    log_info "Backup file: ${BACKUP_FILE}"
    
    # Create backup directory if it doesn't exist
    mkdir -p "${BACKUP_DIR}"
    
    # Export password for pg_dump
    export PGPASSWORD="${POSTGRES_PASSWORD}"
    
    # Create backup
    if pg_dump -h "${PGHOST:-localhost}" \
               -U "${POSTGRES_USER}" \
               -d "${POSTGRES_DB}" \
               --verbose \
               --format=plain \
               --no-owner \
               --no-acl \
               > "${BACKUP_DIR}/${BACKUP_FILE}"; then
        
        log_info "Database backup created successfully"
        
        # Compress if requested
        if [[ "${COMPRESS}" == "true" ]]; then
            log_info "Compressing backup..."
            gzip "${BACKUP_DIR}/${BACKUP_FILE}"
            BACKUP_FILE="${BACKUP_FILE}.gz"
            log_info "Backup compressed: ${BACKUP_FILE}"
        fi
        
        # Get backup size
        local backup_size
        backup_size=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
        log_info "Backup size: ${backup_size}"
        
        return 0
    else
        log_error "Database backup failed"
        return 1
    fi
}

cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days"
    
    local deleted_count=0
    
    # Find and delete old backups
    while IFS= read -r -d '' backup_file; do
        rm -f "${backup_file}"
        ((deleted_count++))
        log_info "Deleted old backup: $(basename "${backup_file}")"
    done < <(find "${BACKUP_DIR}" -name "backup_${POSTGRES_DB}_*.sql*" -type f -mtime "+${RETENTION_DAYS}" -print0)
    
    if [[ ${deleted_count} -eq 0 ]]; then
        log_info "No old backups to delete"
    else
        log_info "Deleted ${deleted_count} old backup(s)"
    fi
}

list_backups() {
    log_info "Available backups:"
    
    local backup_count=0
    
    while IFS= read -r backup_file; do
        local size
        local date
        size=$(du -h "${backup_file}" | cut -f1)
        date=$(stat -c %y "${backup_file}" 2>/dev/null || stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "${backup_file}" 2>/dev/null || echo "unknown")
        
        echo "  - $(basename "${backup_file}") [${size}] (${date})"
        ((backup_count++))
    done < <(find "${BACKUP_DIR}" -name "backup_${POSTGRES_DB}_*.sql*" -type f | sort -r)
    
    if [[ ${backup_count} -eq 0 ]]; then
        log_warn "No backups found"
    else
        log_info "Total backups: ${backup_count}"
    fi
}

verify_backup() {
    local backup_path="${BACKUP_DIR}/${BACKUP_FILE}"
    
    log_info "Verifying backup integrity..."
    
    # Check if file exists and is not empty
    if [[ ! -f "${backup_path}" ]]; then
        log_error "Backup file not found: ${backup_path}"
        return 1
    fi
    
    if [[ ! -s "${backup_path}" ]]; then
        log_error "Backup file is empty: ${backup_path}"
        return 1
    fi
    
    # If compressed, test gzip integrity
    if [[ "${backup_path}" == *.gz ]]; then
        if gzip -t "${backup_path}" 2>/dev/null; then
            log_info "Compressed backup integrity verified"
        else
            log_error "Compressed backup is corrupted"
            return 1
        fi
    fi
    
    log_info "Backup verification passed"
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
        -r|--retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        -c|--compress)
            COMPRESS="true"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    log_info "=== Database Backup Started ==="
    log_info "Timestamp: $(date)"
    log_info "Database: ${POSTGRES_DB}"
    log_info "Host: ${PGHOST:-localhost}"
    log_info "Retention: ${RETENTION_DAYS} days"
    
    # Validate environment
    validate_environment
    
    # Create backup
    if ! create_backup; then
        log_error "Backup process failed"
        exit 1
    fi
    
    # Verify backup
    if ! verify_backup; then
        log_error "Backup verification failed"
        exit 1
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # List all backups
    list_backups
    
    log_info "=== Database Backup Completed ==="
    log_info "Backup file: ${BACKUP_DIR}/${BACKUP_FILE}"
}

# Run main function
main "$@"
