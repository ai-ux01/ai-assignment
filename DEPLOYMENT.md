# Deployment Documentation

**Support Ticket Management System - Comprehensive Deployment Guide**

This document provides complete deployment guidance for the Support Ticket Management System, covering environment setup, database migrations, configuration options, troubleshooting, and backup/recovery procedures.

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Database Migration Process](#database-migration-process)
4. [Configuration Options](#configuration-options)
5. [Deployment Methods](#deployment-methods)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Backup and Recovery Procedures](#backup-and-recovery-procedures)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Security Checklist](#security-checklist)
10. [Quick Reference](#quick-reference)

---

## Overview

### Architecture Overview

The Support Ticket Management System is a containerized Node.js application with the following components:

- **API Server**: Express-based REST API (Node.js 18+, TypeScript)
- **Database**: PostgreSQL 15+ with ACID compliance
- **Authentication**: JWT token validation (external provider)
- **Storage**: Persistent volumes for database and logs

### Deployment Options

| Environment | Purpose | Deployment Method | Recommended Resources |
|-------------|---------|-------------------|----------------------|
| **Development** | Local development | Docker Compose | 2 CPU, 4GB RAM |
| **Staging** | Pre-production testing | Docker Compose / Kubernetes | 2 CPU, 8GB RAM |
| **Production** | Live system | Docker Compose / Kubernetes | 4 CPU, 16GB RAM |

### Prerequisites

- Docker 20.10.0+ and Docker Compose 2.0.0+
- Linux/Unix environment (Ubuntu 20.04+, macOS, or WSL2)
- PostgreSQL client tools (optional, for database management)
- Git (for version control)
- Basic understanding of Docker and database concepts

### Related Documentation

- **[DOCKER_PRODUCTION_README.md](DOCKER_PRODUCTION_README.md)** - Docker-specific production configuration
- **[ENVIRONMENT_CONFIG.md](ENVIRONMENT_CONFIG.md)** - Detailed environment variable reference
- **[PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)** - Step-by-step production deployment

---

## Environment Setup

### Step 1: System Preparation

#### Install Docker and Docker Compose

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (logout/login required)
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker-compose --version
```

#### Install PostgreSQL Client Tools (Optional)

```bash
# Ubuntu/Debian
sudo apt install -y postgresql-client

# macOS (with Homebrew)
brew install postgresql

# Verify installation
psql --version
```

### Step 2: Clone and Prepare Repository

```bash
# Clone the repository
git clone <repository-url>
cd support-ticket

# Create required directories
mkdir -p data/postgres data/backups data/logs

# Set proper permissions
chmod 700 data/postgres
chmod 755 data/backups data/logs

# Verify directory structure
tree -L 2 data/
```

### Step 3: Environment Configuration

#### Development Environment

```bash
# Copy example environment file
cp .env.example .env

# Or use the development-specific file
cp .env.development .env

# Edit environment file
vim .env
```

**Key settings for development:**

```bash
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=ticketuser
DB_PASSWORD=ticketpass
DB_NAME=support_tickets_dev
LOG_LEVEL=debug
JWT_SECRET=dev-secret-key-change-in-production
CORS_ORIGIN=http://localhost:3001
```

#### Staging Environment

```bash
# Copy staging environment template
cp .env.staging .env

# Replace placeholders with actual values
sed -i 's/REPLACE_WITH_STAGING_DB_HOST/staging-db.example.com/g' .env
sed -i 's/REPLACE_WITH_SECURE_PASSWORD/your-secure-password/g' .env
sed -i 's/REPLACE_WITH_STRONG_JWT_SECRET/your-jwt-secret/g' .env

# Manually edit remaining values
vim .env
```

**Key settings for staging:**

```bash
NODE_ENV=staging
DB_HOST=staging-db.example.com
DB_PASSWORD=<strong-random-password>
DB_NAME=support_tickets_staging
LOG_LEVEL=info
JWT_SECRET=<strong-jwt-secret>
CORS_ORIGIN=https://staging.example.com
RATE_LIMIT_MAX_REQUESTS=500
```

#### Production Environment

```bash
# Copy production environment template
cp .env.production .env

# Generate secure secrets
echo "DB_PASSWORD=$(openssl rand -base64 32)" >> .env.temp
echo "JWT_SECRET=$(openssl rand -base64 64)" >> .env.temp

# Edit environment file with generated secrets
vim .env
```

**Key settings for production:**

```bash
NODE_ENV=production
DB_PASSWORD=<generated-strong-password>
DB_NAME=support_tickets_prod
LOG_LEVEL=info
JWT_SECRET=<generated-jwt-secret>
JWT_EXPIRATION=8h
CORS_ORIGIN=https://production.example.com
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_ERROR_STACK=false
ENABLE_REQUEST_LOGGING=false
```

### Step 4: Validate Configuration

```bash
# Validate environment file
npm run validate:env

# Expected output:
# ✓ All required environment variables are set
# ✓ Database connection validated
# ✓ JWT secret meets minimum length requirements
```

---

## Database Migration Process

### Understanding Migrations


Database migrations are versioned SQL scripts that manage schema changes. The system uses a migration-based approach to ensure database schema consistency across environments.

### Migration File Structure

```
database/
├── migrations/
│   ├── 001_create_tickets_table.sql
│   ├── 002_create_comments_table.sql
│   ├── 003_create_audit_log_table.sql
│   └── 004_add_indexes.sql
└── seeds/
    ├── dev-seed.sql
    └── test-seed.sql
```

### Step 1: Start Database

```bash
# Start PostgreSQL using Docker Compose
docker-compose up -d postgres

# Verify database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres
```

### Step 2: Run Migrations

#### Automated Migration

```bash
# Run all pending migrations
npm run migrate

# Or use Docker Compose
docker-compose exec api npm run migrate
```

#### Manual Migration


```bash
# Connect to database
docker-compose exec postgres psql -U ticketuser -d support_tickets_dev

# Run migration files in order
\i /database/migrations/001_create_tickets_table.sql
\i /database/migrations/002_create_comments_table.sql
\i /database/migrations/003_create_audit_log_table.sql
\i /database/migrations/004_add_indexes.sql

# Verify tables were created
\dt

# Expected output:
#  Schema |    Name    | Type  |   Owner    
# --------+------------+-------+------------
#  public | audit_log  | table | ticketuser
#  public | comments   | table | ticketuser
#  public | tickets    | table | ticketuser

# Exit psql
\q
```

### Step 3: Verify Migration

```bash
# Check table structure
docker-compose exec postgres psql -U ticketuser -d support_tickets_dev -c "\d tickets"

# Verify indexes
docker-compose exec postgres psql -U ticketuser -d support_tickets_dev -c "\di"

# Check row counts (should be 0 initially)
docker-compose exec postgres psql -U ticketuser -d support_tickets_dev -c "SELECT COUNT(*) FROM tickets;"
```

### Step 4: Seed Development Data (Optional)


```bash
# Load development seed data
docker-compose exec postgres psql -U ticketuser -d support_tickets_dev -f /database/seeds/dev-seed.sql

# Verify seed data
docker-compose exec postgres psql -U ticketuser -d support_tickets_dev -c "SELECT id, title, state FROM tickets LIMIT 5;"
```

### Migration Best Practices

1. **Always test migrations in development first**
2. **Create backup before running migrations in staging/production**
3. **Run migrations during maintenance windows**
4. **Have rollback scripts ready**
5. **Document schema changes**

### Rolling Back Migrations

```bash
# Manual rollback (drop tables in reverse order)
docker-compose exec postgres psql -U ticketuser -d support_tickets_dev << EOF
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
EOF

# Verify tables are dropped
docker-compose exec postgres psql -U ticketuser -d support_tickets_dev -c "\dt"
```

---

## Configuration Options

### Core Application Settings


#### NODE_ENV

**Purpose**: Determines application environment mode

**Values**: `development`, `staging`, `production`

**Effects**:
- **development**: Debug logging, detailed error messages, relaxed validation
- **staging**: Balanced logging, moderate validation
- **production**: Minimal logging, strict validation, no stack traces

**Example**:
```bash
NODE_ENV=production
```

#### PORT

**Purpose**: HTTP server listening port

**Default**: `3000`

**Range**: `1024-65535` (recommended: 3000-9000)

**Example**:
```bash
PORT=3000
```

### Database Configuration

#### Connection Settings

| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| `DB_HOST` | Database hostname | `localhost` | DB server IP/hostname |
| `DB_PORT` | PostgreSQL port | `5432` | `5432` |
| `DB_USER` | Database username | `ticketuser` | Secure username |
| `DB_PASSWORD` | Database password | Simple | Strong (32+ chars) |
| `DB_NAME` | Database name | `support_tickets_dev` | `support_tickets_prod` |

#### Connection Pool Settings


| Variable | Purpose | Development | Staging | Production |
|----------|---------|-------------|---------|------------|
| `DB_MAX_CONNECTIONS` | Max pool size | `10` | `20` | `50` |
| `DB_IDLE_TIMEOUT` | Idle timeout (ms) | `30000` | `30000` | `30000` |
| `DB_CONNECTION_TIMEOUT` | Connection timeout (ms) | `10000` | `10000` | `10000` |

**Tuning Guidelines**:
- Start with defaults
- Monitor connection usage with `pg_stat_activity`
- Increase `DB_MAX_CONNECTIONS` if seeing "too many connections" errors
- Decrease if memory usage is too high (each connection ~10MB)

**Example**:
```bash
DB_MAX_CONNECTIONS=50
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
```

### Security Configuration

#### JWT Settings

**JWT_SECRET**: Secret key for signing tokens

**Requirements**:
- Development: Any string (e.g., `dev-secret`)
- Production: Min 64 characters, randomly generated

**Generate secure secret**:
```bash
openssl rand -base64 64
```

**JWT_EXPIRATION**: Token expiration time

**Format**: `24h`, `8h`, `1d`, `30m`

**Recommendations**:
- Development: `24h` (convenient)
- Staging: `12h` (balanced)
- Production: `8h` (secure)

**Example**:
```bash
JWT_SECRET=<64-character-random-string>
JWT_EXPIRATION=8h
```

#### CORS Configuration

**CORS_ORIGIN**: Allowed frontend origin(s)

**Single origin**:
```bash
CORS_ORIGIN=https://app.example.com
```

**Multiple origins** (comma-separated):
```bash
CORS_ORIGIN=https://app1.example.com,https://app2.example.com
```

**Wildcard** (development only):
```bash
CORS_ORIGIN=*
```

⚠️ **Warning**: Never use wildcard (`*`) in production

### Logging Configuration

#### Log Levels

| Level | When to Use | Output Volume |
|-------|-------------|---------------|
| `debug` | Development, troubleshooting | Very high |
| `info` | Development, staging, production | Moderate |
| `warn` | Production (warnings only) | Low |
| `error` | Production (errors only) | Very low |

**Recommendation**: Use `info` for production


**Example**:
```bash
LOG_LEVEL=info
LOG_FILE_PATH=./logs/production.log
LOG_MAX_FILE_SIZE=100m
LOG_MAX_FILES=30
```

### Rate Limiting

**Purpose**: Protect against abuse and DoS attacks

| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| `RATE_LIMIT_WINDOW_MS` | Time window (ms) | `900000` (15 min) | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests/window | `1000` | `100` |

**Tuning**:
- Monitor rate limit hits in logs
- Increase for legitimate heavy users
- Decrease if under attack

**Example**:
```bash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Feature Flags

| Flag | Description | Development | Production |
|------|-------------|-------------|------------|
| `ENABLE_ERROR_STACK` | Show error stack traces | `true` | `false` |
| `ENABLE_REQUEST_LOGGING` | Log all HTTP requests | `true` | `false` |
| `ENABLE_METRICS` | Prometheus metrics | `false` | `true` |

⚠️ **Security Warning**: Never enable `ENABLE_ERROR_STACK` in production


**Example**:
```bash
ENABLE_ERROR_STACK=false
ENABLE_REQUEST_LOGGING=false
ENABLE_METRICS=true
METRICS_PORT=9090
```

---

## Deployment Methods

### Method 1: Docker Compose (Recommended)

#### Development Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Production Deployment

```bash
# Build production image
docker build -f Dockerfile.production -t support-ticket-api:1.0.0 .

# Start production services
docker-compose -f docker-compose.production.yml up -d

# Verify health
curl http://localhost:3000/health

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

#### Automated Production Deployment

```bash
# Use deployment script
./scripts/deploy-production.sh

# Script performs:
# 1. Pre-deployment backup
# 2. Build production image
# 3. Stop old services
# 4. Start new services
# 5. Verify health
# 6. Show logs
```

### Method 2: Standalone Docker


```bash
# Run PostgreSQL container
docker run -d \
  --name support-ticket-db \
  -e POSTGRES_USER=ticketuser \
  -e POSTGRES_PASSWORD=ticketpass \
  -e POSTGRES_DB=support_tickets \
  -v $(pwd)/data/postgres:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15-alpine

# Run API container
docker run -d \
  --name support-ticket-api \
  --link support-ticket-db:postgres \
  --env-file .env \
  -p 3000:3000 \
  -v $(pwd)/data/logs:/app/logs \
  support-ticket-api:1.0.0
```

### Method 3: Native Node.js

```bash
# Install dependencies
npm ci --production

# Build TypeScript
npm run build

# Run database migrations
npm run migrate

# Start application
npm start

# Or use PM2 for process management
pm2 start dist/index.js --name support-ticket-api
```

### Method 4: Kubernetes (Advanced)

**Create deployment manifest** (`k8s/deployment.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: support-ticket-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: support-ticket-api
  template:
    metadata:
      labels:
        app: support-ticket-api
    spec:
      containers:
      - name: api
        image: support-ticket-api:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: support-ticket-secrets
              key: db-password
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

**Deploy to Kubernetes**:

```bash
# Create secrets
kubectl create secret generic support-ticket-secrets \
  --from-literal=db-password=<your-password> \
  --from-literal=jwt-secret=<your-secret>

# Deploy application
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods
kubectl logs -f <pod-name>
```

---

## Troubleshooting Guide

### Common Issues


#### Issue 1: Database Connection Failed

**Symptoms**:
- Error: `DATABASE_UNAVAILABLE`
- API health check fails
- Logs show connection timeout

**Diagnosis**:

```bash
# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres | tail -50

# Test connection from API container
docker-compose exec api sh -c "nc -zv postgres 5432"

# Test connection with psql
docker-compose exec postgres psql -U ticketuser -d support_tickets -c "SELECT 1"
```

**Solutions**:

1. **Verify credentials**:
```bash
# Check .env file
cat .env | grep DB_

# Verify credentials match docker-compose.yml
```

2. **Check network connectivity**:
```bash
# Inspect network
docker network ls
docker network inspect support-ticket_default
```

3. **Increase connection timeout**:
```bash
# In .env file
DB_CONNECTION_TIMEOUT=20000
```

4. **Restart database**:
```bash
docker-compose restart postgres
```

#### Issue 2: Port Already in Use

**Symptoms**:
- Error: `Error: listen EADDRINUSE: address already in use :::3000`
- Docker Compose fails to start

**Diagnosis**:

```bash
# Find process using port 3000
sudo lsof -i :3000

# Or use netstat
sudo netstat -tulpn | grep 3000
```

**Solutions**:

1. **Kill existing process**:
```bash
# Get PID from lsof output
kill -9 <PID>
```

2. **Use different port**:
```bash
# Change in .env
PORT=3001

# Change in docker-compose.yml
ports:
  - "3001:3000"
```

3. **Stop existing containers**:
```bash
docker-compose down
docker ps -a | grep support-ticket
docker rm -f <container-id>
```

#### Issue 3: Migration Failures

**Symptoms**:
- Migrations fail to apply
- Tables not created
- Foreign key constraint errors

**Diagnosis**:

```bash
# Check if tables exist
docker-compose exec postgres psql -U ticketuser -d support_tickets -c "\dt"

# Check migration logs
npm run migrate 2>&1 | tee migration.log
```

**Solutions**:


1. **Reset database** (development only):
```bash
# Drop all tables
docker-compose exec postgres psql -U ticketuser -d support_tickets << EOF
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
EOF

# Re-run migrations
npm run migrate
```

2. **Check migration order**:
```bash
# Ensure migrations run in correct order
ls -la database/migrations/
```

3. **Manual migration**:
```bash
# Run migrations one by one
docker-compose exec postgres psql -U ticketuser -d support_tickets \
  -f /database/migrations/001_create_tickets_table.sql
```

#### Issue 4: High Memory Usage

**Symptoms**:
- Container OOM killed
- System becomes slow
- `docker stats` shows high memory

**Diagnosis**:

```bash
# Check container resource usage
docker stats

# Check database connection pool
docker-compose exec postgres psql -U ticketuser -d support_tickets \
  -c "SELECT COUNT(*) FROM pg_stat_activity;"
```

**Solutions**:

1. **Reduce connection pool**:
```bash
# In .env
DB_MAX_CONNECTIONS=20
```

2. **Increase container limits**:
```yaml
# In docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G
```

3. **Monitor and identify memory leaks**:
```bash
# Check Node.js heap usage
docker-compose exec api node -e "console.log(process.memoryUsage())"
```

#### Issue 5: CORS Errors

**Symptoms**:
- Browser blocks API requests
- Error: `Access to XMLHttpRequest blocked by CORS policy`

**Diagnosis**:

```bash
# Check CORS setting
cat .env | grep CORS_ORIGIN

# Test with curl (should include Access-Control-Allow-Origin header)
curl -i -H "Origin: https://your-frontend.com" http://localhost:3000/api/v1/tickets
```

**Solutions**:

1. **Update CORS origin**:
```bash
# In .env
CORS_ORIGIN=https://your-frontend.com
```

2. **Multiple origins**:
```bash
CORS_ORIGIN=https://app1.com,https://app2.com
```

3. **Wildcard for development**:
```bash
CORS_ORIGIN=*
```

⚠️ Never use wildcard in production

#### Issue 6: JWT Authentication Failures

**Symptoms**:
- Error: `401 Unauthorized`
- Token validation fails

**Diagnosis**:


```bash
# Check JWT settings
cat .env | grep JWT_

# Check token format
echo "YOUR_TOKEN" | base64 -d
```

**Solutions**:

1. **Verify JWT_SECRET matches**:
```bash
# Ensure JWT_SECRET is same across all services
```

2. **Check token expiration**:
```bash
# Increase expiration time
JWT_EXPIRATION=24h
```

3. **Verify token issuer/audience**:
```bash
AUTH_TOKEN_ISSUER=https://your-auth-provider.com
AUTH_TOKEN_AUDIENCE=support-ticket-app
```

### Debugging Tools

```bash
# View live logs
docker-compose logs -f --tail=100 api

# Enter container shell
docker-compose exec api sh

# Check environment variables inside container
docker-compose exec api env | sort

# Test API endpoints
curl -i http://localhost:3000/health
curl -i http://localhost:3000/api/v1/tickets

# Check database queries
docker-compose exec postgres psql -U ticketuser -d support_tickets \
  -c "SELECT query, calls FROM pg_stat_statements ORDER BY calls DESC LIMIT 10;"

# Monitor in real-time
watch -n 1 'docker-compose ps && docker stats --no-stream'
```

---

## Backup and Recovery Procedures


### Backup Strategy Overview

| Backup Type | Frequency | Retention | Purpose |
|-------------|-----------|-----------|---------|
| **Full Database** | Daily (2 AM) | 30 days | Complete restoration |
| **Incremental** | Every 6 hours | 7 days | Point-in-time recovery |
| **Pre-deployment** | Before each deploy | Until next deploy | Rollback safety |
| **Weekly Archive** | Sunday | 3 months | Long-term storage |

### Manual Backup

#### Full Database Backup

```bash
# Using provided script
./scripts/backup-database.sh

# With compression
./scripts/backup-database.sh -c

# With custom retention (7 days)
./scripts/backup-database.sh -r 7

# Direct pg_dump
docker-compose exec postgres pg_dump \
  -U ticketuser \
  -d support_tickets_prod \
  -F c \
  -f /backups/manual_backup_$(date +%Y%m%d_%H%M%S).dump
```

#### Specific Table Backup

```bash
# Backup tickets table only
docker-compose exec postgres pg_dump \
  -U ticketuser \
  -d support_tickets_prod \
  -t tickets \
  -F c \
  -f /backups/tickets_only_$(date +%Y%m%d).dump
```

### Automated Backups

#### Setup Cron Job

```bash
# Edit crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/support-ticket/scripts/backup-cron.sh >> /path/to/logs/backup.log 2>&1

# Every 6 hours
0 */6 * * * /path/to/support-ticket/scripts/backup-cron.sh >> /path/to/logs/backup.log 2>&1

# Weekly (Sunday at 2 AM)
0 2 * * 0 /path/to/support-ticket/scripts/backup-cron.sh >> /path/to/logs/backup.log 2>&1
```

#### Verify Cron Setup

```bash
# List cron jobs
crontab -l

# Check backup script is executable
ls -la scripts/backup-cron.sh
chmod +x scripts/backup-cron.sh

# Test backup script manually
./scripts/backup-cron.sh
```

### Backup Verification

```bash
# List backups
ls -lh data/backups/

# Check backup integrity
gunzip -t data/backups/backup_*.sql.gz

# Check backup size (should not be 0)
du -sh data/backups/backup_*.sql.gz

# Verify backup content (without restoring)
gunzip -c data/backups/backup_20240115.sql.gz | head -50
```

### Database Restoration

#### Full Database Restore

⚠️ **Warning**: This will overwrite the entire database

```bash
# Stop API service
docker-compose stop api

# List available backups
ls -lh data/backups/

# Restore using script
./scripts/restore-database.sh data/backups/backup_20240115_120000.sql.gz

# Or manual restore
gunzip -c data/backups/backup_20240115_120000.sql.gz | \
  docker-compose exec -T postgres psql -U ticketuser -d support_tickets_prod

# Verify restoration
docker-compose exec postgres psql -U ticketuser -d support_tickets_prod \
  -c "SELECT COUNT(*) FROM tickets;"

# Restart API service
docker-compose start api
```

#### Restore to Test Database

```bash
# Create test database
docker-compose exec postgres psql -U ticketuser -d postgres \
  -c "CREATE DATABASE support_tickets_test;"

# Restore backup to test database
gunzip -c data/backups/backup_20240115.sql.gz | \
  docker-compose exec -T postgres psql -U ticketuser -d support_tickets_test

# Verify test database
docker-compose exec postgres psql -U ticketuser -d support_tickets_test \
  -c "SELECT COUNT(*) FROM tickets;"

# Drop test database when done
docker-compose exec postgres psql -U ticketuser -d postgres \
  -c "DROP DATABASE support_tickets_test;"
```

### Disaster Recovery

#### Complete System Recovery


**Scenario**: Complete server failure, need to restore on new server

```bash
# 1. Install prerequisites
sudo apt install -y docker.io docker-compose postgresql-client

# 2. Clone repository
git clone <repository-url>
cd support-ticket

# 3. Copy backup files to new server
scp backup-server:/backups/latest.sql.gz data/backups/

# 4. Copy environment configuration
scp old-server:/path/to/.env.production .env

# 5. Start database only
docker-compose -f docker-compose.production.yml up -d postgres

# 6. Wait for database to be ready
sleep 10

# 7. Restore backup
./scripts/restore-database.sh data/backups/latest.sql.gz -f

# 8. Start all services
docker-compose -f docker-compose.production.yml up -d

# 9. Verify system
curl http://localhost:3000/health
docker-compose -f docker-compose.production.yml ps
```

### Off-site Backup

#### AWS S3

```bash
# Install AWS CLI
sudo apt install -y awscli

# Configure AWS credentials
aws configure

# Upload backup to S3
aws s3 cp data/backups/backup_20240115.sql.gz \
  s3://your-bucket/support-ticket-backups/

# Sync all backups
aws s3 sync data/backups/ s3://your-bucket/support-ticket-backups/

# Download from S3
aws s3 cp s3://your-bucket/support-ticket-backups/backup_20240115.sql.gz \
  data/backups/
```

#### Remote Server

```bash
# Setup SSH key authentication
ssh-keygen -t rsa -b 4096
ssh-copy-id backup-user@backup-server

# Copy backup to remote server
rsync -avz data/backups/ backup-user@backup-server:/backups/support-ticket/

# Automated sync (add to cron)
0 3 * * * rsync -avz /path/to/data/backups/ backup-user@backup-server:/backups/support-ticket/
```

### Backup Retention Policy

```bash
# Delete backups older than 30 days
find data/backups -name "backup_*.sql.gz" -mtime +30 -delete

# Keep only last 10 backups
ls -t data/backups/backup_*.sql.gz | tail -n +11 | xargs rm -f

# Archive monthly backups
mkdir -p data/archives/$(date +%Y%m)
mv data/backups/backup_$(date +%Y%m)01*.sql.gz data/archives/$(date +%Y%m)/
```

---

## Monitoring and Maintenance

### Health Monitoring

#### Health Check Endpoints

```bash
# Basic health check
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": {
    "healthy": true
  }
}

# Liveness probe (process running)
curl http://localhost:3000/health/live

# Readiness probe (ready for traffic)
curl http://localhost:3000/health/ready
```

#### Automated Health Monitoring

```bash
# Create monitoring script
cat > scripts/health-monitor.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost:3000/health"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

if ! curl -sf $HEALTH_URL > /dev/null; then
  echo "Health check failed at $(date)" | tee -a logs/health-monitor.log
  # Send alert to Slack
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"🚨 Support Ticket API health check failed!"}' \
    $SLACK_WEBHOOK
fi
EOF

chmod +x scripts/health-monitor.sh

# Add to cron (check every 5 minutes)
*/5 * * * * /path/to/scripts/health-monitor.sh
```

### Performance Monitoring

```bash
# Check resource usage
docker stats --no-stream

# Check API response time
time curl -s http://localhost:3000/api/v1/tickets > /dev/null

# Database performance
docker-compose exec postgres psql -U ticketuser -d support_tickets_prod << EOF
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
EOF

# Check active database connections
docker-compose exec postgres psql -U ticketuser -d support_tickets_prod \
  -c "SELECT COUNT(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"
```

### Log Monitoring

```bash
# Monitor API logs
tail -f data/logs/production.log

# Filter for errors
grep "ERROR" data/logs/production.log | tail -50

# Monitor database logs
docker-compose logs -f postgres | grep ERROR

# Count requests per hour
grep "Request completed" data/logs/production.log | \
  awk '{print $1" "$2}' | \
  cut -d: -f1 | \
  uniq -c
```

### Maintenance Tasks

#### Daily

```bash
# Check service status
docker-compose ps

# Review error logs
grep -i error data/logs/production.log | tail -20

# Check disk space
df -h

# Verify backup completed
ls -lht data/backups/ | head -5
```

#### Weekly


```bash
# Database vacuum and analyze
docker-compose exec postgres psql -U ticketuser -d support_tickets_prod \
  -c "VACUUM ANALYZE;"

# Check database size
docker-compose exec postgres psql -U ticketuser -d support_tickets_prod \
  -c "SELECT pg_size_pretty(pg_database_size('support_tickets_prod'));"

# Restart services (during maintenance window)
docker-compose restart

# Clean old logs (older than 30 days)
find data/logs -name "*.log.*" -mtime +30 -delete

# Test backup restoration (to test database)
./scripts/restore-database.sh data/backups/latest.sql.gz --test
```

#### Monthly

```bash
# Update Docker images
docker-compose pull
docker-compose up -d

# Review and rotate logs
logrotate /etc/logrotate.d/support-ticket

# Review security updates
docker scan support-ticket-api:latest

# Archive old backups
tar -czf backups-$(date +%Y%m).tar.gz data/backups/
mv backups-$(date +%Y%m).tar.gz data/archives/

# Update dependencies
npm audit
npm update
```

### Metrics Collection (Prometheus)

If `ENABLE_METRICS=true`:

```bash
# Access metrics endpoint
curl http://localhost:9090/metrics

# Key metrics to monitor:
# - http_requests_total
# - http_request_duration_seconds
# - database_query_duration_seconds
# - nodejs_heap_size_total_bytes
# - nodejs_heap_size_used_bytes
```

---

## Security Checklist

### Pre-Deployment Security Review

- [ ] Strong passwords set for all accounts (min 32 characters)
- [ ] JWT_SECRET is randomly generated (min 64 characters)
- [ ] CORS_ORIGIN restricted to specific domains (no wildcard)
- [ ] ENABLE_ERROR_STACK set to false in production
- [ ] Database credentials not in version control
- [ ] SSL/TLS certificates configured (if applicable)
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] Security headers enabled (Helmet.js)
- [ ] Container images scanned for vulnerabilities
- [ ] Backup encryption enabled (if storing sensitive data)
- [ ] Audit logging enabled
- [ ] Access logs reviewed regularly

### Security Hardening

#### 1. Container Security

```bash
# Scan Docker image for vulnerabilities
docker scan support-ticket-api:latest

# Run as non-root user (already configured in Dockerfile)
docker-compose exec api id
# Output should be: uid=1001(nodejs) gid=1001(nodejs)

# Keep images updated
docker-compose pull
docker-compose up -d
```

#### 2. Database Security

```bash
# Use strong passwords
openssl rand -base64 32

# Restrict database access (docker-compose.yml)
postgres:
  networks:
    - internal  # No external access

# Enable SSL for database connections
# Add to postgresql.conf:
# ssl = on
# ssl_cert_file = '/path/to/cert.pem'
# ssl_key_file = '/path/to/key.pem'
```

#### 3. Network Security

```bash
# Configure firewall (UFW example)
sudo ufw enable
sudo ufw allow 3000/tcp  # API
sudo ufw allow 22/tcp    # SSH
sudo ufw deny 5432/tcp   # Block external database access

# Use reverse proxy with SSL (nginx example)
# nginx.conf:
server {
    listen 443 ssl http2;
    server_name api.example.com;
    
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 4. Secrets Management

```bash
# Use Docker Secrets (Swarm mode)
echo "my-db-password" | docker secret create db_password -

# Reference in docker-compose.yml:
secrets:
  - db_password

# Or use environment-specific secret management:
# - AWS Secrets Manager
# - Azure Key Vault
# - HashiCorp Vault
```

#### 5. Regular Security Updates


```bash
# Update npm dependencies
npm audit
npm audit fix

# Update Docker base images
docker pull node:18-alpine
docker pull postgres:15-alpine

# Rebuild with updated base images
docker-compose build --no-cache
```

---

## Quick Reference

### Essential Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f api

# Check service status
docker-compose ps

# Restart service
docker-compose restart api

# Health check
curl http://localhost:3000/health

# Create backup
./scripts/backup-database.sh

# Restore backup
./scripts/restore-database.sh data/backups/backup.sql.gz

# Access database
docker-compose exec postgres psql -U ticketuser -d support_tickets

# View resource usage
docker stats

# Update services
docker-compose pull && docker-compose up -d
```

### Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Environment configuration |
| `docker-compose.yml` | Development Docker setup |
| `docker-compose.production.yml` | Production Docker setup |
| `Dockerfile.production` | Production image build |
| `database/migrations/*.sql` | Database schema migrations |
| `scripts/backup-database.sh` | Backup script |
| `scripts/restore-database.sh` | Restore script |
| `scripts/deploy-production.sh` | Deployment automation |

### Key Directories

| Directory | Contents |
|-----------|----------|
| `data/postgres/` | Database files (persistent) |
| `data/backups/` | Database backups |
| `data/logs/` | Application logs |
| `src/` | TypeScript source code |
| `dist/` | Compiled JavaScript |
| `database/` | Migrations and seeds |

### Environment Variables Reference

| Variable | Development | Production | Required |
|----------|-------------|------------|----------|
| `NODE_ENV` | `development` | `production` | ✅ |
| `PORT` | `3000` | `3000` | ✅ |
| `DB_HOST` | `localhost` | DB server | ✅ |
| `DB_PASSWORD` | Simple | Strong (32+ chars) | ✅ |
| `JWT_SECRET` | Simple | Strong (64+ chars) | ✅ |
| `CORS_ORIGIN` | `*` or localhost | Specific domain | ✅ |
| `LOG_LEVEL` | `debug` | `info` | ✅ |
| `ENABLE_ERROR_STACK` | `true` | `false` | ❌ |
| `RATE_LIMIT_MAX_REQUESTS` | `1000` | `100` | ❌ |

### Troubleshooting Quick Reference

| Issue | Command |
|-------|---------|
| Check logs | `docker-compose logs -f api` |
| Restart service | `docker-compose restart api` |
| Test database connection | `docker-compose exec postgres psql -U ticketuser -d support_tickets -c "SELECT 1"` |
| Check resource usage | `docker stats` |
| Find port conflicts | `sudo lsof -i :3000` |
| Reset database | `docker-compose down -v && docker-compose up -d` |
| View environment | `docker-compose exec api env` |

### Support Resources

- **Main Documentation**: [README.md](README.md)
- **Docker Configuration**: [DOCKER_PRODUCTION_README.md](DOCKER_PRODUCTION_README.md)
- **Environment Details**: [ENVIRONMENT_CONFIG.md](ENVIRONMENT_CONFIG.md)
- **Production Guide**: [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)
- **API Documentation**: API endpoints documented in design documents
- **GitHub Issues**: Report issues in repository

---

## Appendix

### A. Complete Deployment Checklist

**Pre-Deployment**:
- [ ] Review requirements and design documents
- [ ] Prepare environment configuration (.env file)
- [ ] Generate strong secrets and passwords
- [ ] Set up database server
- [ ] Configure firewall rules
- [ ] Set up SSL certificates (if applicable)
- [ ] Configure backup storage
- [ ] Set up monitoring and alerting
- [ ] Document deployment plan
- [ ] Schedule maintenance window (if needed)

**Deployment**:
- [ ] Create pre-deployment backup
- [ ] Clone repository
- [ ] Configure environment variables
- [ ] Build Docker images
- [ ] Start database service
- [ ] Run database migrations
- [ ] Verify database schema
- [ ] Start API service
- [ ] Verify health checks
- [ ] Test API endpoints
- [ ] Check logs for errors
- [ ] Verify backup system
- [ ] Configure automated backups (cron)
- [ ] Set up log rotation

**Post-Deployment**:
- [ ] Monitor system for 24 hours
- [ ] Review error logs
- [ ] Test backup/restore procedures
- [ ] Document any issues encountered
- [ ] Update runbook with lessons learned
- [ ] Notify stakeholders of successful deployment
- [ ] Archive deployment logs

### B. Environment Comparison Matrix

| Feature | Development | Staging | Production |
|---------|-------------|---------|------------|
| **Database** | Local Docker | Remote server | Remote server (HA) |
| **Log Level** | debug | info | info |
| **Error Stack** | Enabled | Disabled | Disabled |
| **Rate Limit** | 1000 req/15min | 500 req/15min | 100 req/15min |
| **JWT Expiration** | 24h | 12h | 8h |
| **CORS** | Wildcard | Specific domains | Specific domains |
| **SSL/TLS** | Optional | Required | Required |
| **Monitoring** | Optional | Recommended | Required |
| **Backups** | Optional | Daily | Daily + hourly |
| **Resources** | 2 CPU, 4GB RAM | 2 CPU, 8GB RAM | 4+ CPU, 16GB+ RAM |

### C. Maintenance Schedule Template

**Daily (Automated)**:
- 2:00 AM - Full database backup
- Every 6 hours - Incremental backup
- Every 5 minutes - Health check monitoring


**Weekly (Manual)**:
- Review error logs
- Database vacuum and analyze
- Check disk space
- Review performance metrics
- Clean old logs (>30 days)
- Test backup restoration

**Monthly (Manual)**:
- Security updates
- Dependency updates
- Docker image updates
- Review access logs
- Archive old backups
- Disaster recovery drill

**Quarterly**:
- Full security audit
- Performance review
- Capacity planning
- Documentation review
- Disaster recovery test

### D. Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `EADDRINUSE` | Port already in use | Kill process or change port |
| `ECONNREFUSED` | Cannot connect to database | Check DB is running, verify credentials |
| `ETIMEDOUT` | Connection timeout | Check network, increase timeout |
| `ENOENT` | File not found | Check file paths, verify mounts |
| `DATABASE_UNAVAILABLE` | Database connection failed | Verify DB credentials and network |
| `INVALID_INPUT` | Validation error | Check request format |
| `UNAUTHORIZED` | Authentication failed | Verify JWT token |

### E. Performance Tuning Guidelines

**Database**:
```sql
-- Adjust based on available RAM
shared_buffers = 256MB          -- 25% of RAM
effective_cache_size = 1GB       -- 50-75% of RAM
work_mem = 16MB                 -- RAM / max_connections / 4
maintenance_work_mem = 64MB
max_connections = 50
```

**Connection Pool**:
- Start with `DB_MAX_CONNECTIONS=50`
- Monitor with: `SELECT COUNT(*) FROM pg_stat_activity;`
- Adjust based on actual usage (typically 10-20 concurrent)

**Application**:
- Enable metrics: `ENABLE_METRICS=true`
- Monitor response times
- Add pagination for large result sets
- Implement caching for frequently accessed data

---

## Conclusion

This deployment documentation provides comprehensive guidance for deploying and maintaining the Support Ticket Management System. For additional details:

- **Docker-specific configuration**: See [DOCKER_PRODUCTION_README.md](DOCKER_PRODUCTION_README.md)
- **Environment variables**: See [ENVIRONMENT_CONFIG.md](ENVIRONMENT_CONFIG.md)
- **Production deployment**: See [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)

### Key Takeaways

1. **Always backup before major changes**
2. **Test in staging before production**
3. **Monitor continuously after deployment**
4. **Document all configuration changes**
5. **Keep security as top priority**
6. **Automate repetitive tasks**
7. **Have rollback procedures ready**
8. **Regular maintenance prevents issues**

### Getting Help

For support or questions:
1. Check this documentation
2. Review related documentation files
3. Check application logs
4. Consult the troubleshooting section
5. Contact the development team

---

**Document Version**: 1.0.0  
**Last Updated**: January 2024  
**Maintained By**: Support Ticket Development Team

