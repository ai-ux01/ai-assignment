# Production Quick Reference

Quick command reference for production operations.

---

## Deployment

```bash
# Full automated deployment
./scripts/deploy-production.sh

# Deploy specific version
./scripts/deploy-production.sh -v 1.0.1

# Deploy without migrations
./scripts/deploy-production.sh --skip-migrate

# Quick redeploy (skip build/tests)
./scripts/deploy-production.sh --skip-build --skip-tests
```

---

## Service Management

```bash
# Start services
docker-compose -f docker-compose.production.yml up -d

# Stop services
docker-compose -f docker-compose.production.yml down

# Restart services
docker-compose -f docker-compose.production.yml restart

# View status
docker-compose -f docker-compose.production.yml ps

# Scale API service
docker-compose -f docker-compose.production.yml up -d --scale api=3
```

---

## Health Checks

```bash
# Check API health
curl http://localhost:3000/health

# Check liveness
curl http://localhost:3000/health/live

# Check readiness
curl http://localhost:3000/health/ready

# Check database
docker-compose -f docker-compose.production.yml exec postgres \
  pg_isready -U ticketuser_prod
```

---

## Logs

```bash
# View API logs
docker-compose -f docker-compose.production.yml logs api

# View database logs
docker-compose -f docker-compose.production.yml logs postgres

# Follow logs (live)
docker-compose -f docker-compose.production.yml logs -f --tail=100 api

# View application logs
tail -f data/logs/production.log

# Search logs for errors
grep "ERROR" data/logs/production.log

# View logs from last hour
docker-compose -f docker-compose.production.yml logs --since 1h api
```

---

## Database Operations

```bash
# Connect to database
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod

# Run SQL command
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod -c "SELECT COUNT(*) FROM tickets;"

# Database size
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT pg_size_pretty(pg_database_size('support_tickets_prod'));"

# Table sizes
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname = 'public';"

# Vacuum database
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod -c "VACUUM ANALYZE;"
```

---

## Backups

```bash
# Create manual backup
./scripts/backup-database.sh

# Create compressed backup
./scripts/backup-database.sh -c

# With 7-day retention
./scripts/backup-database.sh -r 7

# List backups
ls -lh data/backups/

# Restore from backup
./scripts/restore-database.sh data/backups/backup_20240115_120000.sql.gz

# Force restore (no prompt)
./scripts/restore-database.sh data/backups/backup.sql.gz -f
```

---

## Monitoring

```bash
# Resource usage
docker stats

# Service health
docker-compose -f docker-compose.production.yml ps

# Container details
docker inspect support-ticket-api-prod

# Disk usage
df -h
du -sh data/

# Network connections
docker-compose -f docker-compose.production.yml exec api netstat -an

# Active database connections
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Troubleshooting

```bash
# Check API container logs
docker-compose -f docker-compose.production.yml logs api --tail=100

# Check container health
docker inspect --format='{{json .State.Health}}' support-ticket-api-prod | jq

# Restart unhealthy service
docker-compose -f docker-compose.production.yml restart api

# Access container shell
docker-compose -f docker-compose.production.yml exec api sh

# Check environment variables
docker-compose -f docker-compose.production.yml exec api env

# Test database connection from API
docker-compose -f docker-compose.production.yml exec api \
  node -e "const {Pool}=require('pg');const p=new Pool({host:'postgres',user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});p.query('SELECT 1').then(()=>console.log('OK')).catch(e=>console.error(e));"
```

---

## Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup (CAUTION!)
docker system prune -a --volumes

# Clean old logs (30+ days)
find data/logs -name "*.log.*" -mtime +30 -delete

# Clean old backups (30+ days)
find data/backups -name "backup_*.sql*" -mtime +30 -delete
```

---

## Security

```bash
# Scan image for vulnerabilities
docker scan support-ticket-api:latest

# Update base images
docker pull postgres:15-alpine
docker pull node:18-alpine

# Check for updates
docker-compose -f docker-compose.production.yml pull

# Rotate secrets (update .env.production then)
docker-compose -f docker-compose.production.yml up -d --force-recreate
```

---

## Rollback

```bash
# Stop services
docker-compose -f docker-compose.production.yml down

# Restore database backup
./scripts/restore-database.sh data/backups/backup_before_deploy.sql.gz

# Deploy previous version
export VERSION=1.0.0-previous
docker-compose -f docker-compose.production.yml up -d

# Verify
curl http://localhost:3000/health
```

---

## Performance

```bash
# Check slow queries
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check database locks
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Check cache hit ratio
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT sum(heap_blks_read) as heap_read, sum(heap_blks_hit) as heap_hit, sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio FROM pg_statio_user_tables;"
```

---

## Metrics

```bash
# Prometheus metrics (if enabled)
curl http://localhost:9090/metrics

# API metrics
curl http://localhost:3000/health | jq

# Database stats
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT * FROM pg_stat_database WHERE datname = 'support_tickets_prod';"
```

---

## Common Issues

### Issue: Container won't start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs api

# Check for port conflicts
sudo lsof -i :3000

# Check resource limits
docker stats
```

### Issue: Database connection failed
```bash
# Check database is running
docker-compose -f docker-compose.production.yml ps postgres

# Check database logs
docker-compose -f docker-compose.production.yml logs postgres

# Verify credentials
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod -c "SELECT 1;"
```

### Issue: Out of disk space
```bash
# Check disk usage
df -h
du -sh data/*

# Clean Docker resources
docker system prune -a

# Clean old backups
find data/backups -mtime +7 -delete

# Compress logs
gzip data/logs/*.log
```

### Issue: High memory usage
```bash
# Check memory usage
docker stats

# Restart services
docker-compose -f docker-compose.production.yml restart

# Adjust resource limits in docker-compose.production.yml
```

---

## Emergency Contacts

- **Production Support**: support-team@example.com
- **On-Call**: +1-555-0123
- **Status Page**: https://status.example.com

---

## Quick Links

- [Full Deployment Guide](PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Docker Configuration](DOCKER_PRODUCTION_README.md)
- [Application README](README.md)

---

**Keep this reference handy for production operations!**
