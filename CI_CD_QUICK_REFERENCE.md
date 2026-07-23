# CI/CD Quick Reference Guide

**Support Ticket Management System - CI/CD Cheat Sheet**

---

## 🚀 Quick Start

### Initial Setup (One-Time)

```bash
# 1. Initialize Git repository
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/support-ticket.git
git push -u origin main

# 2. Create develop branch
git checkout -b develop
git push -u origin develop

# 3. Generate SSH keys for deployment
ssh-keygen -t rsa -b 4096 -f ./deploy_key
# Copy deploy_key.pub to servers
# Copy deploy_key content to GitHub secrets
```

### Configure GitHub Secrets

**Settings → Secrets and variables → Actions → New repository secret**

**Required Secrets:**
- `STAGING_HOST` = staging.example.com
- `STAGING_USER` = deploy
- `STAGING_SSH_KEY` = (private key content)
- `STAGING_URL` = https://staging-api.example.com
- `PRODUCTION_HOST` = production.example.com
- `PRODUCTION_USER` = deploy
- `PRODUCTION_SSH_KEY` = (private key content)
- `PRODUCTION_URL` = https://api.example.com

**Optional:**
- `SLACK_WEBHOOK` = (Slack webhook URL)
- `SNYK_TOKEN` = (Snyk API token)
- `TEST_TOKEN` = (JWT for smoke tests)

---

## 📋 Daily Workflows

### Developing a New Feature

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/your-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push and create PR
git push origin feature/your-feature
# Create PR on GitHub: feature/your-feature → develop

# 4. CI runs automatically on PR
# - Lint, type check, tests, build

# 5. After PR approval, merge to develop
# - Staging deployment happens automatically
```

### Fixing a Bug

```bash
# 1. Create bugfix branch from develop
git checkout develop
git pull origin develop
git checkout -b bugfix/fix-issue

# 2. Fix bug and test locally
npm test
npm run lint
npm run build

# 3. Commit and push
git add .
git commit -m "fix: resolve issue with..."
git push origin bugfix/fix-issue

# 4. Create PR to develop and merge
# - CI and staging deployment run automatically
```

### Deploying to Production

```bash
# 1. Merge develop to main
git checkout main
git pull origin main
git merge develop
git push origin main

# 2. Create version tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 3. Production deployment starts automatically
# - Go to Actions tab on GitHub
# - Approve deployment (if required)
# - Monitor deployment progress
```

---

## 🔧 Common Commands

### Local Development

```bash
# Run all CI checks locally
npm run lint && \
npm run format:check && \
npx tsc --noEmit && \
npm test && \
npm run build

# Fix linting issues
npm run lint:fix

# Run tests with coverage
npm run test:coverage

# Start development server
npm run dev

# Build for production
npm run build
```

### Check CI/CD Status

```bash
# View recent workflow runs
# GitHub UI: Actions tab

# Check if CI is passing on branch
# Look for green checkmark on commits

# View workflow logs
# Click on workflow run → Select job → View logs
```

### Manual Deployments

**Deploy to Staging (Manual Trigger):**
1. Go to Actions tab
2. Select "CD - Deploy to Staging"
3. Click "Run workflow"
4. Select `develop` branch
5. Click "Run workflow" button

**Deploy to Production (Manual Trigger):**
1. Go to Actions tab
2. Select "CD - Deploy to Production"
3. Click "Run workflow"
4. Enter version (e.g., `v1.0.0`)
5. Click "Run workflow" button
6. Approve deployment when prompted

---

## 🔄 Rollback Procedures

### Rollback Staging

**Automatic:** If staging deployment fails, rollback happens automatically

**Manual:**
```bash
# SSH to staging server
ssh deploy@staging.example.com
cd /opt/support-ticket

# Restart with previous version
docker-compose down
docker-compose up -d
```

### Rollback Production

**Option 1: Deploy Previous Tag**
```bash
# Find previous working version
git tag

# Push previous tag to trigger deployment
git push origin v0.9.9
```

**Option 2: Manual Server Rollback**
```bash
# SSH to production server
ssh deploy@production.example.com
cd /opt/support-ticket

# Pull previous image
docker pull ghcr.io/your-org/support-ticket-api:production-previous

# Restart with previous version
docker-compose down
docker-compose up -d

# Verify
curl http://localhost:3000/health
```

**Option 3: Restore Database**
```bash
# SSH to production server
ssh deploy@production.example.com
cd /opt/support-ticket

# List backups
ls -lht data/backups/

# Restore specific backup
./scripts/restore-database.sh data/backups/backup_20240115.sql.gz
```

---

## 🐛 Troubleshooting

### CI Pipeline Fails

| Issue | Quick Fix |
|-------|-----------|
| Lint errors | `npm run lint:fix` |
| Type errors | `npx tsc --noEmit` and fix errors |
| Test failures | `npm test` and fix failing tests |
| Build errors | Check syntax, fix imports |

### Deployment Fails

| Issue | Quick Fix |
|-------|-----------|
| SSH connection | Verify SSH key in GitHub secrets |
| Docker pull | Check GITHUB_TOKEN permissions |
| Health check | Check logs: `docker-compose logs api` |
| Database error | Check migrations, verify DB connection |

### View Logs

**GitHub Actions:**
- Actions tab → Select workflow run → View job logs

**Server Logs:**
```bash
# SSH to server
ssh deploy@server.example.com

# View API logs
docker-compose logs -f api

# View database logs
docker-compose logs -f postgres

# View all logs
docker-compose logs -f
```

---

## 📊 Monitoring

### Health Checks

```bash
# Staging
curl https://staging-api.example.com/health

# Production
curl https://api.example.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": {
    "healthy": true
  }
}
```

### Check Deployment Status

```bash
# SSH to server
ssh deploy@server.example.com

# Check container status
docker-compose ps

# Check resource usage
docker stats --no-stream

# Check recent logs
docker-compose logs --tail=50 api
```

---

## 📅 Maintenance Schedule

### Daily
- Monitor CI pipeline failures
- Review failed deployments
- Check error logs

### Weekly
- Review dependency updates (Dependabot PRs)
- Check security audit results
- Review staging stability

### Monthly
- Update Docker base images
- Review and update dependencies
- Check disk space on servers
- Review backup retention

---

## 🔐 Security Checklist

### Before Production Deployment

- [ ] All tests passing in CI
- [ ] Security scan shows no critical issues
- [ ] Dependency audit clean
- [ ] Deployed and tested on staging
- [ ] Database migrations reviewed
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Backup created before deployment

---

## 📞 Emergency Contacts

### Critical Production Issue

1. **Immediate:** Rollback to previous version
2. **Check:** Server logs and health status
3. **Notify:** Team via Slack
4. **Document:** Issue and resolution steps

### Deployment Failed

1. **Check:** GitHub Actions logs for error details
2. **Verify:** Server accessibility and Docker status
3. **Rollback:** If production affected
4. **Fix:** Address root cause
5. **Redeploy:** After verification

---

## 📚 Documentation Links

- **[Full CI/CD Setup Guide](docs/CI_CD_SETUP.md)**
- **[Deployment Guide](DEPLOYMENT.md)**
- **[Developer Guide](DEVELOPER_GUIDE.md)**
- **[API Documentation](API_DOCUMENTATION.md)**
- **[GitHub Workflows README](.github/README.md)**

---

## 💡 Tips & Best Practices

### Git Workflow

- Always work on feature branches
- Keep commits small and focused
- Use conventional commit messages
- Pull latest before creating new branches
- Test locally before pushing

### Testing

- Run tests before committing: `npm test`
- Check coverage: `npm run test:coverage`
- Test on staging before production
- Include smoke tests in deployment

### Deployments

- Deploy staging anytime during business hours
- Deploy production: Tuesday-Thursday, 2-4 PM
- Avoid Friday deployments
- Always have rollback plan ready
- Monitor after deployment

### Code Quality

- Run `npm run lint:fix` before committing
- Keep code formatted: `npm run format`
- Fix TypeScript errors immediately
- Write tests for new features
- Keep test coverage high (>90%)

---

## 🎯 Common Scenarios

### Scenario 1: Hotfix to Production

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix

# 2. Fix issue and test
npm test
npm run build

# 3. Merge to main and develop
git checkout main
git merge hotfix/critical-fix
git push origin main

git checkout develop
git merge hotfix/critical-fix
git push origin develop

# 4. Tag for production deployment
git checkout main
git tag -a v1.0.1 -m "Hotfix: critical issue"
git push origin v1.0.1
```

### Scenario 2: Staging Deployment Failed

```bash
# 1. Check GitHub Actions logs
# 2. SSH to staging server
ssh deploy@staging.example.com

# 3. Check container status
docker-compose ps
docker-compose logs --tail=100 api

# 4. Fix issue and redeploy
git add .
git commit -m "fix: resolve staging issue"
git push origin develop
```

### Scenario 3: Production Rollback Needed

```bash
# 1. Identify last working version
git tag

# 2. Trigger deployment of previous version
git push origin v0.9.9

# 3. Or manual rollback
ssh deploy@production.example.com
cd /opt/support-ticket
docker-compose down
docker pull ghcr.io/your-org/support-ticket-api:v0.9.9
docker-compose up -d
```

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
