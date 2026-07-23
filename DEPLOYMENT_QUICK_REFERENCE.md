# Deployment Quick Reference Card

## Support Ticket Management System - Task 11.5

**For**: Operations Team, DevOps Engineers, SREs  
**Purpose**: Quick command reference for production deployment and verification

---

## 🚀 One-Command Deployment

```bash
# Deploy and verify everything
./scripts/deploy-and-verify.sh
```

**This script does everything**:
- ✅ Pre-deployment checks
- ✅ Database backup
- ✅ Build production image
- ✅ Deploy services
- ✅ Run all verifications
- ✅ Generate report

---

## ⚡ Quick Smoke Test

```bash
# Run quick health check (10 tests, ~30 seconds)
./scripts/smoke-test.sh
```

---

## 📋 Manual Verification Commands

### 1. Health Check

```bash
# Basic health
curl http://localhost:3000/health

# Expected: {"status":"ok","timestamp":"...","uptime":...}
```

### 2. Test All Endpoints

```bash
# List tickets
curl http://localhost:3000/api/v1/tickets

# Search
curl http://localhost:3000/api/v1/tickets/search?q=test

# Filter
curl http://localhost:3000/api/v1/tickets/filter?state=Open
```

### 3. Check Backups

```bash
# View recent backups
ls -lht data/backups/ | head -5

# Create manual backup
./scripts/backup-database.sh

# Check cron jobs
crontab -l | grep backup
```

### 4. Check Audit Logs

```bash
# Count audit entries
docker compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT COUNT(*) FROM audit_log;"

# View recent entries
docker compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT operation, user_id, created_at FROM audit_log ORDER BY created_at DESC LIMIT 5;"
```

### 5. Monitor System Health

```bash
# Container status
docker compose -f docker-compose.production.yml ps

# Resource usage
docker stats --no-stream

# View logs
docker compose -f docker-compose.production.yml logs --tail=50 api

# Check database connections
docker compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';"
```

---

## 🔧 Common Operations

### Deploy New Version

```bash
# Full deployment
./scripts/deploy-and-verify.sh

# Or manual
docker build -f Dockerfile.production -t support-ticket-api:1.0.1 .
docker compose -f docker-compose.production.yml up -d
```

### Restart Services

```bash
# Restart all
docker compose -f docker-compose.production.yml restart

# Restart API only
docker compose -f docker-compose.production.yml restart api

# Restart database only
docker compose -f docker-compose.production.yml restart postgres
```

### View Logs

```bash
# Follow live logs
docker compose -f docker-compose.production.yml logs -f

# API logs only
docker compose -f docker-compose.production.yml logs -f api

# Last 100 lines
docker compose -f docker-compose.production.yml logs --tail=100 api

# Logs since 1 hour ago
docker compose -f docker-compose.production.yml logs --since 1h api
```

### Database Operations

```bash
# Connect to database
docker compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod

# Backup database
./scripts/backup-database.sh

# Restore database
./scripts/restore-database.sh data/backups/backup_YYYYMMDD.sql.gz

# Check database size
docker compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT pg_size_pretty(pg_database_size('support_tickets_prod'));"
```

---

## 🚨 Emergency Procedures

### System Down

```bash
# 1. Check container status
docker compose -f docker-compose.production.yml ps

# 2. Check logs for errors
docker compose -f docker-compose.production.yml logs --tail=100 api

# 3. Restart if needed
docker compose -f docker-compose.production.yml restart

# 4. Verify health
curl http://localhost:3000/health
```

### Rollback Deployment

```bash
# 1. Stop current services
docker compose -f docker-compose.production.yml down

# 2. Restore database backup
./scripts/restore-database.sh data/backups/backup_YYYYMMDD.sql.gz

# 3. Deploy previous version
docker compose -f docker-compose.production.yml up -d

# 4. Verify health
./scripts/smoke-test.sh
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean old Docker resources
docker system prune -a --volumes

# Clean old logs
find data/logs -name "*.log.*" -mtime +30 -delete

# Clean old backups
find data/backups -name "backup_*.sql*" -mtime +30 -delete
```

### High CPU/Memory Usage

```bash
# Check resource usage
docker stats

# Check database queries
docker compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT pid, query, state FROM pg_stat_activity WHERE state = 'active';"

# Restart services
docker compose -f docker-compose.production.yml restart
```

---

## 📊 Monitoring Commands

### Performance Check

```bash
# Response time test
time curl -s http://localhost:3000/health > /dev/null

# Load test (requires ab - Apache Bench)
ab -n 1000 -c 10 http://localhost:3000/health
```

### Database Health

```bash
# Active connections
docker compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Database vacuum
docker compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "VACUUM ANALYZE;"

# Check table sizes
docker compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## 🔐 Security Commands

### Check Secrets

```bash
# Verify environment (DO NOT expose in production)
# Only check if variables are SET, not their values
docker compose -f docker-compose.production.yml exec api sh -c "env | grep -E 'DB_|JWT_' | cut -d= -f1"
```

### Rotate Secrets

```bash
# 1. Generate new secrets
openssl rand -base64 32  # DB_PASSWORD
openssl rand -base64 64  # JWT_SECRET

# 2. Update .env.production

# 3. Restart services
docker compose -f docker-compose.production.yml restart
```

---

## 📈 Metrics & Reporting

### Generate Status Report

```bash
# Container status
echo "=== Container Status ==="
docker compose -f docker-compose.production.yml ps

# Resource usage
echo "=== Resource Usage ==="
docker stats --no-stream

# Ticket count
echo "=== Ticket Statistics ==="
docker compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT state, COUNT(*) FROM tickets GROUP BY state;"

# Recent backups
echo "=== Recent Backups ==="
ls -lht data/backups/ | head -5

# Audit log activity
echo "=== Audit Log Activity (last 24h) ==="
docker compose -f docker-compose.production.yml exec postgres \
  psql -U ticketuser_prod -d support_tickets_prod \
  -c "SELECT operation, COUNT(*) FROM audit_log WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY operation;"
```

---

## 📞 Support Contacts

| Issue | Contact | Response Time |
|-------|---------|---------------|
| **Critical (P0)** | [On-Call Engineer] | 15 min |
| **High (P1)** | [DevOps Team] | 1 hour |
| **Medium (P2)** | [Dev Team] | 4 hours |
| **Low (P3)** | [Email Support] | 1 day |

---

## 📚 Documentation Links

- **Full Deployment**: `DEPLOYMENT.md`
- **Production Guide**: `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Readiness Checklist**: `PRODUCTION_READINESS_CHECKLIST.md`
- **Task Guide**: `TASK_11.5_DEPLOYMENT_GUIDE.md`
- **Validation Summary**: `DEPLOYMENT_VALIDATION_SUMMARY.md`
- **API Docs**: `API_DOCUMENTATION.md`

---

## ✅ Daily Checklist

```bash
# Morning check
□ ./scripts/smoke-test.sh
□ docker compose -f docker-compose.production.yml ps
□ df -h  # Check disk space
□ ls -lht data/backups/ | head -1  # Verify backup

# Weekly check
□ Review error logs
□ Test backup restore
□ Check database size
□ Review audit logs

# Monthly check
□ Security updates
□ Performance review
□ Capacity planning
□ Documentation update
```

---

## 🎯 Success Indicators

**System is healthy when**:
- ✅ Health endpoint returns 200
- ✅ All smoke tests pass (10/10)
- ✅ Container status: Up
- ✅ CPU < 80%, Memory < 80%
- ✅ Database connections < max_connections
- ✅ Response time < 2s
- ✅ No errors in logs (last 1h)
- ✅ Recent backup exists (< 24h)

---

**Quick Reference Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Maintained By**: DevOps Team
