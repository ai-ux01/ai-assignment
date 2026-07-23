# Docker Production Configuration

## Overview

This document describes the production Docker configuration for the Support Ticket Management System, including multi-stage builds, health checks, logging, and backup strategies.

---

## Table of Contents

1. [Files Overview](#files-overview)
2. [Production Dockerfile](#production-dockerfile)
3. [Docker Compose Configuration](#docker-compose-configuration)
4. [Health Checks](#health-checks)
5. [Logging Configuration](#logging-configuration)
6. [Backup Strategies](#backup-strategies)
7. [Resource Management](#resource-management)
8. [Quick Start](#quick-start)

---

## Files Overview

### Docker Configuration Files

| File | Purpose |
|------|---------|
| `Dockerfile.production` | Multi-stage production Dockerfile optimized for size and security |
| `docker-compose.production.yml` | Production Docker Compose configuration with health checks and monitoring |
| `.dockerignore` | Excludes unnecessary files from Docker build context |
| `database/postgresql.conf` | Production PostgreSQL performance tuning |

### Backup and Deployment Scripts

| Script | Purpose |
|--------|---------|
| `scripts/backup-database.sh` | Manual database backup with compression and retention |
| `scripts/restore-database.sh` | Database restore from backup files |
| `scripts/backup-cron.sh` | Automated cron job for scheduled backups |
| `scripts/deploy-production.sh` | Automated production deployment script |

### Documentation

| Document | Purpose |
|----------|---------|
| `PRODUCTION_DEPLOYMENT_GUIDE.md` | Comprehensive production deployment guide |
| `DOCKER_PRODUCTION_README.md` | This file - Docker configuration details |

---

## Production Dockerfile

### Multi-Stage Build

The production Dockerfile uses a 3-stage build process:

#### Stage 1: Dependencies
```dockerfile
FROM node:18-alpine AS dependencies
# Install all dependencies (dev + production)
```

**Purpose**: Isolate dependency installation for better caching

#### Stage 2: Builder
```dockerfile
FROM node:18-alpine AS builder
# Build TypeScript application
# Prune dev dependencies
```

**Purpose**: Compile TypeScript and create production dependencies

#### Stage 3: Production
```dockerfile
FROM node:18-alpine AS production
# Copy only production artifacts
# Run as non-root user
```

**Purpose**: Create minimal final image with only runtime requirements

### Key Features

1. **Minimal Image Size**
   - Uses Alpine Linux (small base image)
   - Multi-stage build eliminates build dependencies
   - Only production dependencies included

2. **Security**
   - Runs as non-root user (`nodejs:1001`)
   - Uses `dumb-init` for proper signal handling
   - No unnecessary packages installed

3. **Health Checks**
   - Built-in health check every 30 seconds
   - 5-second timeout
   - 10-second startup grace period

4. **Metadata**
   - Image labels for tracking
   - Build arguments for versioning

### Building the Production Image

```bash
# Standard build
docker build -f Dockerfile.production -t support-ticket-api:1.0.0 .

# With build metadata
docker build \
  -f Dockerfile.production \
  -t support-ticket-api:1.0.0 \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg VCS_REF=$(git rev-parse --short HEAD) \
  .
```

### Image Size Comparison

| Stage | Size | Purpose |
|-------|------|---------|
| dependencies | ~500MB | All dependencies |
| builder | ~600MB | Built application + dependencies |
| production | ~200MB | Runtime only |

---

## Docker Compose Configuration

### Services

#### 1. PostgreSQL Database

```yaml
postgres:
  image: postgres:15-alpine
  restart: always
  environment:
    POSTGRES_USER: ticketuser_prod
    POSTGRES_PASSWORD: <SECRET>
    POSTGRES_DB: support_tickets_prod
```

**Features**:
- Health checks every 10 seconds
- Persistent data volume
- Backup volume mounted
- Resource limits (2 CPU, 2GB RAM)
- Log rotation (100MB max, 10 files)

#### 2. API Service

```yaml
api:
  build:
    context: .
    dockerfile: Dockerfile.production
  restart: always
  depends_on:
    postgres:
      condition: service_healthy
```

**Features**:
- Depends on healthy database
- Health checks every 30 seconds
- Resource limits (1 CPU, 1GB RAM)
- Log rotation (50MB max, 10 files)
- Metrics endpoint exposed (port 9090)

#### 3. Database Backup (Optional)

```yaml
db-backup:
  image: postgres:15-alpine
  restart: "no"
```

**Features**:
- On-demand backup service
- Uses backup script
- Retention policy configurable

### Volumes

#### Persistent Data
```yaml
postgres_data_prod:
  driver: local
  driver_opts:
    type: none
    device: ${DATA_PATH:-./data/postgres}
    o: bind
```

#### Backups
```yaml
postgres_backups:
  driver: local
  driver_opts:
    device: ${BACKUP_PATH:-./data/backups}
```

#### Application Logs
```yaml
api_logs:
  driver: local
  driver_opts:
    device: ${LOG_PATH:-./data/logs}
```

### Networks

```yaml
support-ticket-network:
  driver: bridge
  ipam:
    config:
      - subnet: 172.28.0.0/16
```

**Features**:
- Isolated network for services
- Custom subnet for predictable IPs
- Internal DNS resolution

---

## Health Checks

### API Health Check

**Endpoint**: `GET /health`

**Response** (Healthy):
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": {
    "healthy": true,
    "pool": {
      "total": 50,
      "idle": 45,
      "waiting": 0
    }
  },
  "memory": {
    "used": 128,
    "total": 256,
    "unit": "MB"
  }
}
```

**Response** (Unhealthy):
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": "Database connection failed"
}
```

### Liveness Probe

**Endpoint**: `GET /health/live`

**Purpose**: Check if application process is running

### Readiness Probe

**Endpoint**: `GET /health/ready`

**Purpose**: Check if application is ready to accept traffic

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=10s \
            --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', ...)"
```

**Configuration**:
- **Interval**: Check every 30 seconds
- **Timeout**: 5 seconds for check to complete
- **Start Period**: 10 seconds grace period after container start
- **Retries**: 3 consecutive failures mark container unhealthy

### Monitoring Health

```bash
# Check health status
docker-compose -f docker-compose.production.yml ps

# View health check logs
docker inspect --format='{{json .State.Health}}' support-ticket-api-prod | jq

# Test health endpoint
curl http://localhost:3000/health | jq
```

---

## Logging Configuration

### Log Drivers

Both services use JSON file logging with rotation:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "50m"      # Maximum log file size
    max-file: "10"       # Keep 10 log files
    compress: "true"     # Compress rotated logs
```

### Log Locations

#### Docker Logs
```bash
# API logs
docker-compose -f docker-compose.production.yml logs api

# Database logs
docker-compose -f docker-compose.production.yml logs postgres

# Follow logs
docker-compose -f docker-compose.production.yml logs -f --tail=100 api
```

#### Application Logs
```
data/logs/production.log
```

### Log Levels

Production logging configuration (`.env.production`):

```bash
LOG_LEVEL=info              # info, warn, error (not debug in production)
LOG_FILE_PATH=/app/logs/production.log
LOG_MAX_FILE_SIZE=100m
LOG_MAX_FILES=30
```

### Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Request completed",
  "requestId": "req_abc123",
  "method": "GET",
  "path": "/api/v1/tickets",
  "statusCode": 200,
  "duration": 45
}
```

### Log Retention

| Log Type | Retention | Size Limit |
|----------|-----------|------------|
| Docker Container Logs | 10 files | 50MB per file |
| Application Logs | 30 files | 100MB per file |
| Database Logs | 10 files | 100MB per file |

### Log Management

```bash
# View recent logs
tail -f data/logs/production.log

# Search logs
grep "ERROR" data/logs/production.log

# Rotate logs manually
docker-compose -f docker-compose.production.yml restart api

# Clean old logs (older than 30 days)
find data/logs -name "*.log.*" -mtime +30 -delete
```

---

## Backup Strategies

### Automated Backups

#### Setup Cron Job

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/support-ticket/scripts/backup-cron.sh >> /path/to/logs/backup-cron.log 2>&1
```

#### Backup Schedule Options

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Daily at 2 AM | `0 2 * * *` | Standard daily backup |
| Every 6 hours | `0 */6 * * *` | High-frequency backup |
| Weekly (Sunday) | `0 2 * * 0` | Weekly backup |
| Monthly (1st) | `0 2 1 * *` | Monthly archive |

### Manual Backups

```bash
# Create backup
./scripts/backup-database.sh

# Create compressed backup
./scripts/backup-database.sh -c

# With custom retention (7 days)
./scripts/backup-database.sh -r 7
```

### Backup Features

1. **Timestamped Files**
   ```
   backup_support_tickets_prod_20240115_120000.sql.gz
   ```

2. **Compression**
   - Automatic gzip compression
   - Reduces storage by ~80%

3. **Retention Management**
   - Automatic cleanup of old backups
   - Configurable retention period (default: 30 days)

4. **Verification**
   - Integrity check after creation
   - Test compression validity

5. **Notifications**
   - Email alerts (optional)
   - Slack webhooks (optional)

### Backup Storage

#### Local Storage
```
data/backups/
├── backup_support_tickets_prod_20240115_120000.sql.gz
├── backup_support_tickets_prod_20240114_120000.sql.gz
└── backup_support_tickets_prod_20240113_120000.sql.gz
```

#### Off-site Backup

```bash
# Copy to S3
aws s3 sync data/backups/ s3://your-bucket/support-ticket-backups/

# Copy to remote server
rsync -avz data/backups/ backup-server:/backups/support-ticket/

# Archive to long-term storage
tar -czf backups-$(date +%Y%m).tar.gz data/backups/
```

### Restore Process

```bash
# List available backups
ls -lh data/backups/

# Restore from backup
./scripts/restore-database.sh data/backups/backup_20240115_120000.sql.gz

# Force restore (no confirmation)
./scripts/restore-database.sh data/backups/backup.sql.gz -f
```

### Backup Testing

**Test restoration regularly** (at least quarterly):

```bash
# 1. Create test database
export POSTGRES_DB=support_tickets_test

# 2. Restore to test database
./scripts/restore-database.sh data/backups/latest_backup.sql.gz

# 3. Verify data
docker-compose exec postgres psql -U ticketuser_prod -d support_tickets_test \
  -c "SELECT COUNT(*) FROM tickets;"

# 4. Drop test database
docker-compose exec postgres psql -U ticketuser_prod -d postgres \
  -c "DROP DATABASE support_tickets_test;"
```

---

## Resource Management

### Resource Limits

#### API Service
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'           # Maximum 1 CPU core
      memory: 1G            # Maximum 1GB RAM
    reservations:
      cpus: '0.5'           # Reserve 0.5 CPU core
      memory: 512M          # Reserve 512MB RAM
```

#### Database Service
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'           # Maximum 2 CPU cores
      memory: 2G            # Maximum 2GB RAM
    reservations:
      cpus: '1.0'           # Reserve 1 CPU core
      memory: 1G            # Reserve 1GB RAM
```

### Monitoring Resources

```bash
# View resource usage
docker stats

# View specific container
docker stats support-ticket-api-prod

# View all containers in compose
docker-compose -f docker-compose.production.yml top
```

### Scaling

#### Vertical Scaling

Adjust resource limits in `docker-compose.production.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'      # Increase from 1.0
      memory: 2G       # Increase from 1G
```

#### Horizontal Scaling

```bash
# Scale API service
docker-compose -f docker-compose.production.yml up -d --scale api=3

# Load balancer required for multiple API instances
```

---

## Quick Start

### 1. Configure Environment

```bash
# Copy and edit environment file
cp .env.example .env.production
vim .env.production

# Set required variables:
# - DB_PASSWORD (strong password)
# - JWT_SECRET (random secret)
# - CORS_ORIGIN (your domain)
```

### 2. Deploy

```bash
# Automated deployment
./scripts/deploy-production.sh

# Or manual steps
docker build -f Dockerfile.production -t support-ticket-api:latest .
docker-compose -f docker-compose.production.yml up -d
```

### 3. Verify

```bash
# Check services
docker-compose -f docker-compose.production.yml ps

# Check health
curl http://localhost:3000/health

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### 4. Setup Backups

```bash
# Test manual backup
./scripts/backup-database.sh

# Setup automated backups
crontab -e
# Add: 0 2 * * * /path/to/scripts/backup-cron.sh >> /path/to/logs/backup-cron.log 2>&1
```

---

## Best Practices

### Security

1. ✅ Use strong, random passwords and secrets
2. ✅ Run containers as non-root users
3. ✅ Keep base images updated
4. ✅ Scan images for vulnerabilities
5. ✅ Use secrets management in production
6. ✅ Enable SSL/TLS for external access

### Performance

1. ✅ Set appropriate resource limits
2. ✅ Configure database connection pooling
3. ✅ Enable query caching where appropriate
4. ✅ Monitor resource usage regularly
5. ✅ Tune PostgreSQL configuration for workload

### Reliability

1. ✅ Configure health checks properly
2. ✅ Set up automated backups
3. ✅ Test restore procedures regularly
4. ✅ Monitor logs for errors
5. ✅ Have rollback procedures documented
6. ✅ Set up alerting for critical issues

### Maintenance

1. ✅ Rotate logs regularly
2. ✅ Clean up old backups
3. ✅ Update Docker images periodically
4. ✅ Review and update configurations
5. ✅ Document all changes

---

## Troubleshooting

See [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md#troubleshooting) for comprehensive troubleshooting guide.

---

## Additional Resources

- **Docker Documentation**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **PostgreSQL Docker**: https://hub.docker.com/_/postgres
- **Node.js Docker**: https://hub.docker.com/_/node

---

**Last Updated**: 2024-01-15  
**Version**: 1.0.0
