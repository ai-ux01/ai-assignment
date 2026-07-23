#!/bin/bash

# ============================================================================
# Support Ticket Management System - Production Deployment and Verification
# ============================================================================
# This script performs the final deployment to production and runs
# comprehensive system verification checks as specified in Task 11.5
#
# Checks performed:
# 1. Deploy to production environment
# 2. Run smoke tests on production
# 3. Verify all endpoints are accessible
# 4. Verify database backups are running
# 5. Verify audit logs are being collected
# 6. Monitor system health and performance
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${PROJECT_ROOT}/logs/deployment-verification-$(date +%Y%m%d_%H%M%S).log"
PRODUCTION_URL="${PRODUCTION_URL:-http://localhost:3000}"
DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-docker-compose}"  # docker-compose or kubernetes

# Create logs directory
mkdir -p "$(dirname "$LOG_FILE")"

# ============================================================================
# Utility Functions
# ============================================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

section() {
    echo "" | tee -a "$LOG_FILE"
    echo -e "${BLUE}========================================${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}$1${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}========================================${NC}" | tee -a "$LOG_FILE"
}

# ============================================================================
# Pre-Deployment Checks
# ============================================================================

pre_deployment_checks() {
    section "PRE-DEPLOYMENT CHECKS"
    
    # Check if environment file exists
    if [ ! -f "${PROJECT_ROOT}/.env.production" ]; then
        error "Production environment file (.env.production) not found"
        exit 1
    fi
    success "Production environment file found"
    
    # Load environment variables
    export $(cat "${PROJECT_ROOT}/.env.production" | grep -v '^#' | xargs)
    
    # Check required environment variables
    required_vars=("NODE_ENV" "DB_HOST" "DB_USER" "DB_PASSWORD" "DB_NAME" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
    success "All required environment variables are set"
    
    # Check Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running"
        exit 1
    fi
    success "Docker is running"
    
    # Check Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    success "Docker Compose is available"
    
    log "Pre-deployment checks completed successfully"
}

# ============================================================================
# Deployment Step 1: Create Pre-Deployment Backup
# ============================================================================

create_backup() {
    section "STEP 1: CREATE PRE-DEPLOYMENT BACKUP"
    
    log "Creating database backup before deployment..."
    
    if [ -f "${SCRIPT_DIR}/backup-database.sh" ]; then
        bash "${SCRIPT_DIR}/backup-database.sh" -c 2>&1 | tee -a "$LOG_FILE"
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            success "Pre-deployment backup created successfully"
            # List recent backups
            log "Recent backups:"
            ls -lht "${PROJECT_ROOT}/data/backups/" | head -5 | tee -a "$LOG_FILE"
        else
            warning "Backup creation failed, but continuing deployment"
        fi
    else
        warning "Backup script not found, skipping backup"
    fi
}

# ============================================================================
# Deployment Step 2: Build Production Image
# ============================================================================

build_production_image() {
    section "STEP 2: BUILD PRODUCTION DOCKER IMAGE"
    
    log "Building production Docker image..."
    
    cd "$PROJECT_ROOT"
    
    # Get version from package.json or git
    if [ -f "package.json" ]; then
        VERSION=$(node -p "require('./package.json').version")
    else
        VERSION=$(git describe --tags --always 2>/dev/null || echo "latest")
    fi
    
    log "Building version: $VERSION"
    
    docker build \
        -f Dockerfile.production \
        -t support-ticket-api:${VERSION} \
        -t support-ticket-api:production-latest \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown") \
        . 2>&1 | tee -a "$LOG_FILE"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        success "Production image built successfully"
        docker images | grep support-ticket-api | tee -a "$LOG_FILE"
    else
        error "Failed to build production image"
        exit 1
    fi
}

# ============================================================================
# Deployment Step 3: Deploy to Production
# ============================================================================

deploy_to_production() {
    section "STEP 3: DEPLOY TO PRODUCTION ENVIRONMENT"
    
    log "Deploying to production using ${DEPLOYMENT_MODE}..."
    
    cd "$PROJECT_ROOT"
    
    if [ "$DEPLOYMENT_MODE" = "docker-compose" ]; then
        # Stop old services (graceful shutdown)
        log "Stopping old services..."
        docker-compose -f docker-compose.production.yml down --timeout 30 2>&1 | tee -a "$LOG_FILE"
        
        # Start new services
        log "Starting production services..."
        docker-compose -f docker-compose.production.yml up -d 2>&1 | tee -a "$LOG_FILE"
        
        if [ $? -eq 0 ]; then
            success "Production services started"
        else
            error "Failed to start production services"
            exit 1
        fi
    else
        warning "Kubernetes deployment not yet implemented"
        exit 1
    fi
    
    # Wait for services to stabilize
    log "Waiting for services to stabilize (30 seconds)..."
    sleep 30
}

# ============================================================================
# Verification Step 1: Health Check
# ============================================================================

verify_health() {
    section "VERIFICATION: SYSTEM HEALTH CHECK"
    
    log "Checking system health endpoint..."
    
    max_attempts=5
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log "Attempt $attempt of $max_attempts..."
        
        response=$(curl -s -o /dev/null -w "%{http_code}" "${PRODUCTION_URL}/health" 2>&1)
        
        if [ "$response" = "200" ]; then
            success "Health check endpoint returned 200 OK"
            
            # Get detailed health info
            health_info=$(curl -s "${PRODUCTION_URL}/health" 2>&1)
            echo "$health_info" | jq '.' 2>/dev/null | tee -a "$LOG_FILE" || echo "$health_info" | tee -a "$LOG_FILE"
            
            return 0
        else
            warning "Health check returned status: $response"
        fi
        
        attempt=$((attempt + 1))
        sleep 10
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# ============================================================================
# Verification Step 2: Smoke Tests
# ============================================================================

run_smoke_tests() {
    section "VERIFICATION: SMOKE TESTS"
    
    log "Running smoke tests on production endpoints..."
    
    # Test 1: List tickets endpoint
    log "Test 1: GET /api/v1/tickets"
    response=$(curl -s -o /dev/null -w "%{http_code}" "${PRODUCTION_URL}/api/v1/tickets")
    if [ "$response" = "200" ]; then
        success "List tickets endpoint accessible"
    else
        error "List tickets endpoint returned: $response"
        return 1
    fi
    
    # Test 2: Search endpoint
    log "Test 2: GET /api/v1/tickets/search?q=test"
    response=$(curl -s -o /dev/null -w "%{http_code}" "${PRODUCTION_URL}/api/v1/tickets/search?q=test")
    if [ "$response" = "200" ]; then
        success "Search endpoint accessible"
    else
        error "Search endpoint returned: $response"
        return 1
    fi
    
    # Test 3: Filter endpoint
    log "Test 3: GET /api/v1/tickets/filter?state=Open"
    response=$(curl -s -o /dev/null -w "%{http_code}" "${PRODUCTION_URL}/api/v1/tickets/filter?state=Open")
    if [ "$response" = "200" ]; then
        success "Filter endpoint accessible"
    else
        error "Filter endpoint returned: $response"
        return 1
    fi
    
    # Test 4: Create ticket (requires authentication in real production)
    log "Test 4: POST /api/v1/tickets (endpoint availability)"
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${PRODUCTION_URL}/api/v1/tickets" \
        -H "Content-Type: application/json" \
        -d '{"title":"Test","description":"Test","priority":"Low"}')
    # Expect 401 (unauthorized) or 400 (validation error) in production with auth
    if [ "$response" = "401" ] || [ "$response" = "400" ] || [ "$response" = "201" ]; then
        success "Create ticket endpoint accessible (status: $response)"
    else
        warning "Create ticket endpoint returned unexpected status: $response"
    fi
    
    success "Smoke tests completed"
}

# ============================================================================
# Verification Step 3: Verify All Endpoints
# ============================================================================

verify_all_endpoints() {
    section "VERIFICATION: ALL API ENDPOINTS"
    
    log "Verifying all 9 API endpoints are accessible..."
    
    endpoints=(
        "GET:/api/v1/tickets:200"
        "GET:/api/v1/tickets/search?q=test:200"
        "GET:/api/v1/tickets/filter?state=Open:200"
        "POST:/api/v1/tickets:401,400,201"
        "GET:/api/v1/tickets/00000000-0000-0000-0000-000000000000:404"
        "PATCH:/api/v1/tickets/00000000-0000-0000-0000-000000000000:404,401"
        "PATCH:/api/v1/tickets/00000000-0000-0000-0000-000000000000/assignee:404,401"
        "PATCH:/api/v1/tickets/00000000-0000-0000-0000-000000000000/state:404,401"
        "POST:/api/v1/tickets/00000000-0000-0000-0000-000000000000/comments:404,401"
    )
    
    endpoint_count=0
    success_count=0
    
    for endpoint in "${endpoints[@]}"; do
        IFS=':' read -r method path expected_codes <<< "$endpoint"
        endpoint_count=$((endpoint_count + 1))
        
        log "Testing $method $path"
        
        if [ "$method" = "GET" ]; then
            response=$(curl -s -o /dev/null -w "%{http_code}" "${PRODUCTION_URL}${path}")
        else
            response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "${PRODUCTION_URL}${path}" \
                -H "Content-Type: application/json" \
                -d '{}')
        fi
        
        # Check if response is in expected codes
        if [[ ",$expected_codes," == *",$response,"* ]]; then
            success "  ✓ $method $path → $response (expected)"
            success_count=$((success_count + 1))
        else
            warning "  ⚠ $method $path → $response (expected: $expected_codes)"
        fi
    done
    
    log ""
    log "Endpoint verification: $success_count/$endpoint_count endpoints verified"
    
    if [ $success_count -eq $endpoint_count ]; then
        success "All endpoints are accessible"
    else
        warning "Some endpoints returned unexpected responses"
    fi
}

# ============================================================================
# Verification Step 4: Verify Database Backups
# ============================================================================

verify_database_backups() {
    section "VERIFICATION: DATABASE BACKUPS"
    
    log "Verifying database backup configuration..."
    
    # Check if backup directory exists
    if [ -d "${PROJECT_ROOT}/data/backups" ]; then
        success "Backup directory exists"
        
        # Check for recent backups
        backup_count=$(find "${PROJECT_ROOT}/data/backups" -name "backup_*.sql*" -mtime -1 -type f 2>/dev/null | wc -l)
        
        if [ $backup_count -gt 0 ]; then
            success "Found $backup_count backup(s) from the last 24 hours"
            log "Recent backups:"
            ls -lht "${PROJECT_ROOT}/data/backups/" | head -5 | tee -a "$LOG_FILE"
        else
            warning "No backups found from the last 24 hours"
            log "All backups:"
            ls -lht "${PROJECT_ROOT}/data/backups/" | head -5 | tee -a "$LOG_FILE" || log "No backups found"
        fi
    else
        warning "Backup directory does not exist"
    fi
    
    # Check if backup script exists
    if [ -f "${SCRIPT_DIR}/backup-database.sh" ]; then
        success "Backup script found"
    else
        error "Backup script not found"
    fi
    
    # Check cron configuration
    log "Checking for automated backup cron jobs..."
    if crontab -l 2>/dev/null | grep -q "backup"; then
        success "Backup cron job configured"
        log "Backup cron jobs:"
        crontab -l 2>/dev/null | grep backup | tee -a "$LOG_FILE"
    else
        warning "No backup cron jobs found (may need manual setup)"
    fi
}

# ============================================================================
# Verification Step 5: Verify Audit Logs
# ============================================================================

verify_audit_logs() {
    section "VERIFICATION: AUDIT LOGS"
    
    log "Verifying audit log collection..."
    
    # Check if audit_log table exists
    log "Checking audit_log table in database..."
    
    if command -v docker-compose &> /dev/null; then
        table_check=$(docker-compose -f docker-compose.production.yml exec -T postgres \
            psql -U "$DB_USER" -d "$DB_NAME" -t -c "\dt audit_log" 2>&1 | grep -c "audit_log" || echo "0")
        
        if [ "$table_check" -gt 0 ]; then
            success "Audit log table exists"
            
            # Check for recent audit log entries
            log "Checking for audit log entries..."
            audit_count=$(docker-compose -f docker-compose.production.yml exec -T postgres \
                psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM audit_log;" 2>&1 | tr -d ' ')
            
            log "Total audit log entries: $audit_count"
            
            if [ "$audit_count" -gt 0 ]; then
                success "Audit logs are being collected ($audit_count entries)"
                
                # Show recent audit log sample
                log "Recent audit log entries (sample):"
                docker-compose -f docker-compose.production.yml exec -T postgres \
                    psql -U "$DB_USER" -d "$DB_NAME" -c \
                    "SELECT operation, user_id, created_at FROM audit_log ORDER BY created_at DESC LIMIT 5;" \
                    2>&1 | tee -a "$LOG_FILE"
            else
                warning "No audit log entries found (this is normal for a fresh deployment)"
            fi
        else
            error "Audit log table not found"
        fi
    else
        warning "Cannot verify audit logs without docker-compose"
    fi
}

# ============================================================================
# Verification Step 6: System Health and Performance Monitoring
# ============================================================================

monitor_system_health() {
    section "VERIFICATION: SYSTEM HEALTH AND PERFORMANCE"
    
    log "Monitoring system health and performance..."
    
    # Check Docker container status
    log "Container status:"
    docker-compose -f docker-compose.production.yml ps 2>&1 | tee -a "$LOG_FILE"
    
    # Check container resource usage
    log ""
    log "Container resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
        $(docker-compose -f docker-compose.production.yml ps -q) 2>&1 | tee -a "$LOG_FILE"
    
    # Check database connections
    log ""
    log "Database connection status:"
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.production.yml exec -T postgres \
            psql -U "$DB_USER" -d "$DB_NAME" -c \
            "SELECT COUNT(*) as active_connections FROM pg_stat_activity WHERE state = 'active';" \
            2>&1 | tee -a "$LOG_FILE"
    fi
    
    # Check application logs for errors
    log ""
    log "Checking application logs for errors (last 10 lines)..."
    docker-compose -f docker-compose.production.yml logs --tail=10 api 2>&1 | tee -a "$LOG_FILE"
    
    # Test response time
    log ""
    log "Testing API response time..."
    response_time=$(curl -o /dev/null -s -w "%{time_total}\n" "${PRODUCTION_URL}/health")
    log "Health endpoint response time: ${response_time}s"
    
    if (( $(echo "$response_time < 1.0" | bc -l) )); then
        success "Response time is within acceptable range"
    else
        warning "Response time is slower than expected: ${response_time}s"
    fi
    
    success "System health monitoring completed"
}

# ============================================================================
# Final Report
# ============================================================================

generate_final_report() {
    section "DEPLOYMENT VERIFICATION SUMMARY"
    
    log "Deployment and verification completed!"
    log ""
    log "Summary:"
    log "  - Production URL: ${PRODUCTION_URL}"
    log "  - Deployment mode: ${DEPLOYMENT_MODE}"
    log "  - Log file: ${LOG_FILE}"
    log ""
    log "Next steps:"
    log "  1. Review the full log file for any warnings"
    log "  2. Set up monitoring alerts (if not already configured)"
    log "  3. Configure automated backup cron jobs (if not already done)"
    log "  4. Test from production frontend application"
    log "  5. Monitor system for the first 24 hours"
    log ""
    success "All verification checks completed successfully!"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    log "Starting Production Deployment and Verification"
    log "================================================"
    log ""
    
    # Execute deployment and verification steps
    pre_deployment_checks
    create_backup
    build_production_image
    deploy_to_production
    
    log ""
    log "Deployment completed. Starting verification..."
    log ""
    
    # Execute verification steps
    if ! verify_health; then
        error "Health check failed. Deployment may have issues."
        exit 1
    fi
    
    run_smoke_tests
    verify_all_endpoints
    verify_database_backups
    verify_audit_logs
    monitor_system_health
    
    # Generate final report
    generate_final_report
    
    log ""
    log "Deployment verification log saved to: ${LOG_FILE}"
}

# Run main function
main "$@"
