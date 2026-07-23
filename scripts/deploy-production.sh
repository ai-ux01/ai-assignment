#!/bin/bash
# ==============================================================================
# Production Deployment Script
# ==============================================================================
# This script automates the deployment process for the Support Ticket System
# 
# Usage:
#   ./deploy-production.sh [OPTIONS]
#
# Options:
#   -h, --help              Show this help message
#   -b, --backup            Create backup before deployment
#   -m, --migrate           Run database migrations
#   -v, --version VERSION   Set image version (default: latest)
#   --skip-build            Skip building new image
#   --skip-tests            Skip pre-deployment tests
# ==============================================================================

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"

VERSION="${VERSION:-latest}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
ENV_FILE="${PROJECT_DIR}/.env.production"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "\n${BLUE}==>${NC} ${YELLOW}$1${NC}\n"
}

show_help() {
    cat << EOF
Production Deployment Script for Support Ticket Management System

Usage: $(basename "$0") [OPTIONS]

Options:
    -h, --help              Show this help message
    -b, --backup            Create backup before deployment
    -m, --migrate           Run database migrations
    -v, --version VERSION   Set image version (default: latest)
    --skip-build            Skip building new image
    --skip-tests            Skip pre-deployment tests

Environment Variables:
    VERSION                 Image version to deploy (default: latest)
    BACKUP_BEFORE_DEPLOY    Create backup before deploy (default: true)
    RUN_MIGRATIONS          Run migrations (default: true)

Examples:
    # Standard deployment
    ./deploy-production.sh

    # Deploy specific version
    ./deploy-production.sh -v 1.0.1

    # Deploy without migrations
    ./deploy-production.sh --skip-migrate

    # Quick deployment (skip build and tests)
    ./deploy-production.sh --skip-build --skip-tests
EOF
}

check_prerequisites() {
    log_step "Checking Prerequisites"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    log_info "Docker: $(docker --version)"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    log_info "Docker Compose: $(docker-compose --version)"
    
    # Check environment file
    if [[ ! -f "${ENV_FILE}" ]]; then
        log_error "Environment file not found: ${ENV_FILE}"
        exit 1
    fi
    log_info "Environment file: ${ENV_FILE}"
    
    # Load environment
    set -a
    # shellcheck disable=SC1090
    source "${ENV_FILE}"
    set +a
    
    # Check required variables
    local required_vars=("DB_PASSWORD" "JWT_SECRET")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
    
    log_info "All prerequisites met"
}

create_backup() {
    if [[ "${BACKUP_BEFORE_DEPLOY}" != "true" ]]; then
        log_info "Skipping backup (disabled)"
        return 0
    fi
    
    log_step "Creating Pre-Deployment Backup"
    
    if [[ -f "${SCRIPT_DIR}/backup-database.sh" ]]; then
        log_info "Running backup script..."
        "${SCRIPT_DIR}/backup-database.sh" -c || {
            log_error "Backup failed"
            return 1
        }
        log_info "Backup created successfully"
    else
        log_warn "Backup script not found, skipping backup"
    fi
}

build_image() {
    if [[ "${SKIP_BUILD}" == "true" ]]; then
        log_info "Skipping build (--skip-build flag)"
        return 0
    fi
    
    log_step "Building Production Image"
    
    cd "${PROJECT_DIR}"
    
    log_info "Building image: support-ticket-api:${VERSION}"
    
    docker build \
        -f Dockerfile.production \
        -t "support-ticket-api:${VERSION}" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
        . || {
        log_error "Build failed"
        return 1
    }
    
    # Tag as latest
    docker tag "support-ticket-api:${VERSION}" "support-ticket-api:latest"
    
    log_info "Image built successfully"
}

run_tests() {
    if [[ "${SKIP_TESTS}" == "true" ]]; then
        log_info "Skipping tests (--skip-tests flag)"
        return 0
    fi
    
    log_step "Running Pre-Deployment Tests"
    
    # Health check test
    log_info "Testing image health..."
    
    # Run container temporarily for testing
    local test_container="support-ticket-test-$$"
    
    docker run -d \
        --name "${test_container}" \
        -e NODE_ENV=production \
        -e DB_HOST=mockhost \
        -p 3001:3000 \
        "support-ticket-api:${VERSION}" || {
        log_error "Failed to start test container"
        return 1
    }
    
    # Wait for container to start
    sleep 5
    
    # Check if container is running
    if ! docker ps | grep -q "${test_container}"; then
        log_error "Test container failed to start"
        docker logs "${test_container}"
        docker rm -f "${test_container}" 2>/dev/null || true
        return 1
    fi
    
    # Cleanup
    docker rm -f "${test_container}"
    
    log_info "Tests passed"
}

deploy_services() {
    log_step "Deploying Services"
    
    cd "${PROJECT_DIR}"
    
    # Set version in environment
    export VERSION
    
    # Pull latest base images
    log_info "Pulling base images..."
    docker-compose -f docker-compose.production.yml pull postgres || true
    
    # Stop existing services
    log_info "Stopping existing services..."
    docker-compose -f docker-compose.production.yml down -t 30
    
    # Start services
    log_info "Starting services..."
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    local max_wait=60
    local waited=0
    
    while [[ $waited -lt $max_wait ]]; do
        if docker-compose -f docker-compose.production.yml ps | grep -q "healthy"; then
            log_info "Services are healthy"
            break
        fi
        
        sleep 2
        waited=$((waited + 2))
    done
    
    if [[ $waited -ge $max_wait ]]; then
        log_warn "Services did not become healthy within ${max_wait} seconds"
    fi
}

run_migrations() {
    if [[ "${RUN_MIGRATIONS}" != "true" ]]; then
        log_info "Skipping migrations (disabled)"
        return 0
    fi
    
    log_step "Running Database Migrations"
    
    cd "${PROJECT_DIR}"
    
    # Check if migration script exists
    if [[ ! -f "database/schema-or-migrations/migrate.sh" ]]; then
        log_warn "Migration script not found, skipping"
        return 0
    fi
    
    log_info "Running migrations..."
    
    docker-compose -f docker-compose.production.yml exec -T api \
        sh -c "cd /app/database/schema-or-migrations && ./migrate.sh up" || {
        log_error "Migrations failed"
        return 1
    }
    
    log_info "Migrations completed"
}

verify_deployment() {
    log_step "Verifying Deployment"
    
    cd "${PROJECT_DIR}"
    
    # Check service status
    log_info "Checking service status..."
    docker-compose -f docker-compose.production.yml ps
    
    # Check API health
    log_info "Checking API health..."
    local max_retries=10
    local retry=0
    
    while [[ $retry -lt $max_retries ]]; do
        if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
            log_info "API health check passed"
            break
        fi
        
        sleep 3
        retry=$((retry + 1))
    done
    
    if [[ $retry -ge $max_retries ]]; then
        log_error "API health check failed"
        log_error "Deployment verification failed"
        return 1
    fi
    
    # Check database connectivity
    log_info "Checking database connectivity..."
    docker-compose -f docker-compose.production.yml exec -T postgres \
        pg_isready -U "${DB_USER}" || {
        log_error "Database connectivity check failed"
        return 1
    }
    
    log_info "All verification checks passed"
}

cleanup() {
    log_step "Cleaning Up"
    
    # Remove dangling images
    log_info "Removing dangling images..."
    docker image prune -f
    
    log_info "Cleanup completed"
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
        -b|--backup)
            BACKUP_BEFORE_DEPLOY="true"
            shift
            ;;
        -m|--migrate)
            RUN_MIGRATIONS="true"
            shift
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD="true"
            shift
            ;;
        --skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        --skip-migrate)
            RUN_MIGRATIONS="false"
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
    log_info "=== Production Deployment Started ==="
    log_info "Version: ${VERSION}"
    log_info "Timestamp: $(date)"
    
    # Run deployment steps
    check_prerequisites || exit 1
    create_backup || exit 1
    build_image || exit 1
    run_tests || exit 1
    deploy_services || exit 1
    run_migrations || exit 1
    verify_deployment || exit 1
    cleanup || true
    
    log_info "=== Production Deployment Completed Successfully ==="
    log_info "Application is now running at: http://localhost:${PORT:-3000}"
    log_info "Health check: http://localhost:${PORT:-3000}/health"
    
    # Show running services
    docker-compose -f "${PROJECT_DIR}/docker-compose.production.yml" ps
}

# Run main function
main "$@"
