#!/bin/bash
# ==============================================================================
# Automated Database Backup Cron Job
# ==============================================================================
# This script is designed to be run as a cron job for automated backups
# 
# Setup Instructions:
# 1. Make this script executable: chmod +x backup-cron.sh
# 2. Add to crontab: crontab -e
# 3. Add line (daily backup at 2 AM):
#    0 2 * * * /path/to/backup-cron.sh >> /path/to/logs/backup-cron.log 2>&1
#
# Common Cron Schedules:
# - Daily at 2 AM:     0 2 * * *
# - Every 6 hours:     0 */6 * * *
# - Weekly (Sunday):   0 2 * * 0
# - Monthly (1st):     0 2 1 * *
# ==============================================================================

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-database.sh"

# Log file
LOG_FILE="${LOG_FILE:-${SCRIPT_DIR}/../logs/backup-cron.log}"
mkdir -p "$(dirname "${LOG_FILE}")"

# Load environment from .env.production
ENV_FILE="${SCRIPT_DIR}/../.env.production"
if [[ -f "${ENV_FILE}" ]]; then
    # shellcheck disable=SC1090
    source "${ENV_FILE}"
fi

# Backup configuration
export BACKUP_DIR="${BACKUP_DIR:-${SCRIPT_DIR}/../data/backups}"
export BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
export BACKUP_COMPRESS="true"

# Database configuration
export PGHOST="${DB_HOST:-localhost}"
export POSTGRES_USER="${DB_USER:-ticketuser_prod}"
export POSTGRES_PASSWORD="${DB_PASSWORD}"
export POSTGRES_DB="${DB_NAME:-support_tickets_prod}"

# Notification settings (optional)
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# ==============================================================================
# Functions
# ==============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

send_notification() {
    local status="$1"
    local message="$2"
    
    # Email notification
    if [[ -n "${NOTIFICATION_EMAIL}" ]] && command -v mail &> /dev/null; then
        echo "${message}" | mail -s "Database Backup ${status}" "${NOTIFICATION_EMAIL}"
    fi
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK}" ]] && command -v curl &> /dev/null; then
        local color
        if [[ "${status}" == "SUCCESS" ]]; then
            color="good"
        else
            color="danger"
        fi
        
        curl -X POST "${SLACK_WEBHOOK}" \
             -H 'Content-Type: application/json' \
             -d "{
                 \"attachments\": [{
                     \"color\": \"${color}\",
                     \"title\": \"Database Backup ${status}\",
                     \"text\": \"${message}\",
                     \"footer\": \"Support Ticket System\",
                     \"ts\": $(date +%s)
                 }]
             }" 2>/dev/null || true
    fi
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    log "=== Automated Backup Started ==="
    
    # Check if backup script exists
    if [[ ! -f "${BACKUP_SCRIPT}" ]]; then
        log "ERROR: Backup script not found: ${BACKUP_SCRIPT}"
        send_notification "FAILED" "Backup script not found: ${BACKUP_SCRIPT}"
        exit 1
    fi
    
    # Check if database credentials are set
    if [[ -z "${POSTGRES_PASSWORD}" ]]; then
        log "ERROR: Database password not set"
        send_notification "FAILED" "Database password not configured"
        exit 1
    fi
    
    # Run backup
    log "Running backup script..."
    
    if "${BACKUP_SCRIPT}" -c -r "${BACKUP_RETENTION_DAYS}"; then
        log "Backup completed successfully"
        
        # Get backup file info
        local latest_backup
        latest_backup=$(find "${BACKUP_DIR}" -name "backup_${POSTGRES_DB}_*.sql*" -type f -printf '%T+ %p\n' | sort -r | head -1 | cut -d' ' -f2)
        
        if [[ -n "${latest_backup}" ]]; then
            local backup_size
            backup_size=$(du -h "${latest_backup}" | cut -f1)
            log "Latest backup: $(basename "${latest_backup}") (${backup_size})"
            
            send_notification "SUCCESS" "Database backup completed successfully\nBackup: $(basename "${latest_backup}")\nSize: ${backup_size}"
        fi
        
        log "=== Automated Backup Completed ==="
        exit 0
    else
        log "ERROR: Backup failed"
        send_notification "FAILED" "Database backup failed. Check logs for details."
        log "=== Automated Backup Failed ==="
        exit 1
    fi
}

# Run main function
main "$@"
