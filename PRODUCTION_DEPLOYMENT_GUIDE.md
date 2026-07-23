# Production Deployment Guide

## Support Ticket Management System - Production Deployment

This guide provides comprehensive instructions for deploying the Support Ticket Management System to a production environment using Docker.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Configuration](#configuration)
4. [Deployment Steps](#deployment-steps)
5. [Database Management](#database-management)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Backup and Recovery](#backup-and-recovery)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ or equivalent)
- **Docker**: 20.10.0 or higher
- **Docker Compose**: 2.0.0 or higher
- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 20GB minimum for application and database

### Required Tools

```bash
# Verify Docker installation
docker --version

# Verify Docker Compose installation
docker-compose --version

# Verify system resources
free -h
df -h
```

### Network Requirements

- **Inbound Ports**:
  - 3000: API service (can be changed via configuration)
  - 5432: PostgreSQL (optional, for external access)
  - 9090: Metrics endpoint (optional, for monitoring)

- **Outbound Access**:
  - Docker Hub for pulling images
  - npm registry (during build)

---

## Pre-Deployment Checklist

Before deploying to production, ensure the following:

- [ ] All environment variables are configured in `.env.production`
- [ ] Strong passwords are set for database and JWT secrets
- [ ] CORS origins are configured for your production frontend
- [ ] SSL/TLS certificates are available (if using HTTPS)
- [ ] Backup strategy is planned and tested
- [ ] Monitoring and alerting are configured
- [ ] Deployment downtime window is scheduled (if applicable)
- [ ] Rollback plan is documented
- [ ] Database migrations are tested
- [ ] Health checks are configured and tested

---

## Configuration

### 1. Environment Configuration

Create production environment file:

```bash
# Copy example file
cp .env.example .env.production

# Edit with production values
vim .env.production
```

**Critical Variables to Configure**:

```bash
# Application
NODE_ENV=production
PORT=3000

# Database - MUST CHANGE PASSWORDS
DB_HOST=postgres
DB_PORT=5432
DB_USER=ticketuser_prod
DB_PASSWORD=<STRONG_RANDOM_PASSWORD>  # CHANGE THIS!
DB_NAME=support_tickets_prod
DB_MAX_CONNECTIONS=50

# Security - MUST CHANGE SECRETS
JWT_SECRET=<STRONG_RANDOM_SECRET>     # CHANGE THIS!
JWT_EXPIRATION=8h

# CORS - Configure for your domain
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs/production.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Generate Strong Secrets**:

```bash
# Generate random password (32 characters)
openssl rand -base64 32

# Generate JWT secret (64 characters)
openssl rand -base64 64
```

### 2. Docker Compose Configuration

The `docker-compose.production.yml` file is pre-configured for production. Review and adjust:

```yaml
# Key configurations to review:
# - Resource limits (CPU/Memory)
# - Volume paths for data persistence
# - Port mappings
# - Health check intervals
# - Logging settings
```

### 3. Database Configuration

Review `database/postgresql.conf` for performance tuning:

- Adjust `shared_buffers` based on available RAM (25% of total RAM)
- Adjust `effective_cache_size` (50-75% of total RAM)
- Configure `max_connections` based on expected load

---

## Deployment Steps

### Step 1: Prepare Environment

```bash
# Create data directories
mkdir -p data/postgres data/backups data/logs

# Set proper permissions
chmod 700 data/postgres
chmod 755 data/backups data/logs

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)
```

### Step 2: Build Production Image

```bash
# Build the production Docker image
docker build \
  -f Dockerfile.production \
  -t support-ticket-api:1.0.0 \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg VCS_REF=$(git rev-parse --short HEAD) \
  .

# Verify image
docker images | grep support-ticket-api
```

### Step 3: Deploy Services

```bash
# Start services in detached mode
docker-compose -f docker-compose.production.yml up -d

# Verify services are running
docker-compose -f docker-compose.production.yml ps

# Check service health
docker-compose -f docker-compose.production.yml exec api node -e "require('http').get('http://localhost:3000/health', (r) => {console.log('Status:', r.statusCode)})"
```

### Step 4: Verify Deployment

```bash
# Check API health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}

# Check database connectivity
docker-compose -f docker-compose.production.yml exec postgres psql -U ticketuser_prod -d support_tickets_prod -c "\dt"

# View logs
docker-compose -f docker-compose.production.yml logs -f api
```

### Step 5: Run Database Migrations

```bash
# Connect to API container
docker-compose -f docker-compose.production.yml exec api sh

# Inside container, run migrations
cd database/schema-or-migrations
./migrate.sh up

# Verify tables
psql -h postgres -U ticketuser_prod -d support_tickets_prod -c "\dt"

# Exit container
exit
```

### Step 6: Create Initial Admin User (if applicable)

```bash
# This step depends on your user management implementation
# Example: seed admin user if needed
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "INSERT INTO users (username, role) VALUES ('admin', 'admin');"
```

---

## Database Management

### Connection to Database

```bash
# Connect via docker-compose
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod

# Connect from host (if port is exposed)
psql -h localhost -p 5432 -U ticketuser_prod -d support_tickets_prod
```

### Database Maintenance

```bash
# Manual vacuum (cleanup)
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod -c "VACUUM ANALYZE;"

# Check database size
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT pg_size_pretty(pg_database_size('support_tickets_prod'));"

# Check table sizes
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## Monitoring and Maintenance

### Service Monitoring

```bash
# Check service status
docker-compose -f docker-compose.production.yml ps

# View resource usage
docker stats

# View logs
docker-compose -f docker-compose.production.yml logs -f --tail=100 api
docker-compose -f docker-compose.production.yml logs -f --tail=100 postgres
```

### Health Checks

```bash
# API health check
curl http://localhost:3000/health

# Database health check
docker-compose -f docker-compose.production.yml exec postgres pg_isready -U ticketuser_prod

# Check service restart count
docker inspect support-ticket-api-prod | grep RestartCount
```

### Performance Monitoring

```bash
# Monitor API performance
# Access metrics endpoint (if enabled)
curl http://localhost:9090/metrics

# Monitor database performance
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT * FROM pg_stat_activity;"

# Check slow queries (queries > 1 second)
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT query, calls, total_exec_time, mean_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
```

### Log Management

```bash
# View API logs
tail -f data/logs/production.log

# View database logs
docker-compose -f docker-compose.production.yml logs postgres

# Rotate logs manually
docker-compose -f docker-compose.production.yml exec api \
  sh -c "mv /app/logs/production.log /app/logs/production.log.$(date +%Y%m%d) && touch /app/logs/production.log"
```

---

## Backup and Recovery

### Automated Backups

**Setup Automated Daily Backups**:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/support-ticket/scripts/backup-cron.sh >> /path/to/support-ticket/logs/backup-cron.log 2>&1
```

### Manual Backup

```bash
# Create manual backup
./scripts/backup-database.sh

# Create compressed backup
./scripts/backup-database.sh -c

# With custom retention
./scripts/backup-database.sh -r 7
```

### Restore from Backup

```bash
# List available backups
ls -lh data/backups/

# Restore from backup (CAUTION: This will overwrite current database)
./scripts/restore-database.sh data/backups/backup_support_tickets_prod_20240115_120000.sql.gz

# Force restore without confirmation
./scripts/restore-database.sh data/backups/backup.sql.gz -f
```

### Backup Verification

```bash
# Test restore in separate database
export POSTGRES_DB=support_tickets_test
./scripts/restore-database.sh data/backups/latest_backup.sql.gz

# Verify data
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_test -c "SELECT COUNT(*) FROM tickets;"
```

### Backup Best Practices

1. **Retention Policy**: Keep at least 30 days of backups
2. **Off-site Storage**: Copy backups to remote storage (S3, etc.)
3. **Test Restores**: Regularly test backup restoration
4. **Monitor Backup Jobs**: Set up alerts for backup failures
5. **Document Procedures**: Keep recovery procedures up-to-date

```bash
# Example: Copy backup to S3
aws s3 cp data/backups/backup_*.sql.gz s3://your-backup-bucket/support-ticket/

# Example: Sync backups to remote server
rsync -avz data/backups/ backup-server:/backups/support-ticket/
```

---

## Security Considerations

### 1. Secrets Management

**Never commit secrets to version control**:

```bash
# Add to .gitignore
echo ".env.production" >> .gitignore
echo "data/" >> .gitignore
```

**Use secrets management tools in production**:

- Docker Secrets
- Kubernetes Secrets
- HashiCorp Vault
- AWS Secrets Manager

### 2. Network Security

```bash
# Use firewall to restrict access
sudo ufw allow 3000/tcp  # API
sudo ufw deny 5432/tcp   # Database (block external access)

# Configure HTTPS
# Use reverse proxy (nginx, traefik) with SSL certificates
```

### 3. Container Security

```bash
# Run as non-root user (already configured in Dockerfile)
# Scan images for vulnerabilities
docker scan support-ticket-api:1.0.0

# Keep images updated
docker pull postgres:15-alpine
docker pull node:18-alpine
```

### 4. Database Security

```bash
# Use strong passwords
# Limit database connections to application network
# Enable SSL for database connections (configure in postgresql.conf)
# Regular security updates
```

### 5. Application Security

- Enable rate limiting (configured in .env.production)
- Configure CORS properly
- Use JWT with short expiration times
- Enable security headers (Helmet.js is configured)
- Regular dependency updates

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.production.yml logs

# Check service status
docker-compose -f docker-compose.production.yml ps

# Inspect container
docker inspect support-ticket-api-prod

# Check resource usage
docker stats
```

### Database Connection Issues

```bash
# Check database is running
docker-compose -f docker-compose.production.yml ps postgres

# Check database logs
docker-compose -f docker-compose.production.yml logs postgres

# Test connection from API container
docker-compose -f docker-compose.production.yml exec api \
  sh -c "nc -zv postgres 5432"

# Verify credentials
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod -c "SELECT 1;"
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check database performance
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check slow queries
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Clean up old logs
find data/logs -name "*.log.*" -mtime +30 -delete

# Clean up old backups (older than 30 days)
find data/backups -name "backup_*.sql*" -mtime +30 -delete

# Clean up Docker resources
docker system prune -a --volumes
```

---

## Rollback Procedures

### Rollback to Previous Version

```bash
# Stop current services
docker-compose -f docker-compose.production.yml down

# Restore previous version
docker-compose -f docker-compose.production.yml up -d support-ticket-api:1.0.0-previous

# Verify
curl http://localhost:3000/health
```

### Rollback Database

```bash
# Stop API service
docker-compose -f docker-compose.production.yml stop api

# Restore from backup
./scripts/restore-database.sh data/backups/backup_before_migration.sql.gz

# Restart API service
docker-compose -f docker-compose.production.yml start api
```

### Emergency Shutdown

```bash
# Stop all services immediately
docker-compose -f docker-compose.production.yml down

# For graceful shutdown with 30 second timeout
docker-compose -f docker-compose.production.yml down -t 30
```

---

## Maintenance Windows

### Planned Downtime

```bash
# 1. Announce maintenance window to users
# 2. Create pre-maintenance backup
./scripts/backup-database.sh

# 3. Stop services gracefully
docker-compose -f docker-compose.production.yml down -t 30

# 4. Perform maintenance (updates, migrations, etc.)

# 5. Start services
docker-compose -f docker-compose.production.yml up -d

# 6. Verify services
curl http://localhost:3000/health

# 7. Monitor logs for errors
docker-compose -f docker-compose.production.yml logs -f
```

### Zero-Downtime Deployment (Blue-Green)

```bash
# 1. Deploy new version to secondary environment
# 2. Test new version
# 3. Switch traffic to new version
# 4. Monitor for issues
# 5. Keep old version running for quick rollback
```

---

## Additional Resources

- **Docker Documentation**: https://docs.docker.com/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices

---

## Support and Contact

For production support issues:

- Check logs first: `docker-compose logs`
- Review this guide
- Contact: support-ticket-team@example.com

---

**Last Updated**: 2024-01-15  
**Version**: 1.0.0
