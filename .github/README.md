# GitHub Workflows

This directory contains automated CI/CD workflows for the Support Ticket Management System.

## Workflows Overview

### 🔄 CI Pipeline (`ci.yml`)

**Triggers:** Push/PR to `main` or `develop` branches

Automated continuous integration pipeline that runs on every commit:

- **Lint and Format Check** - ESLint and Prettier validation
- **Type Checking** - TypeScript compilation check
- **Run Tests** - Full test suite with PostgreSQL service
- **Build Application** - TypeScript to JavaScript compilation
- **Build Docker Image** - Production container image build
- **Security Scan** - Dependency vulnerability checking

**Status Badge:**
```markdown
![CI Pipeline](https://github.com/your-org/support-ticket/workflows/CI%20Pipeline/badge.svg)
```

---

### 🚀 Staging Deployment (`cd-staging.yml`)

**Triggers:** Automatic on push to `develop` branch (after CI passes)

Automated deployment to staging environment:

1. **Build & Push** - Create and push Docker image to registry
2. **Deploy** - SSH to staging server and update deployment
3. **Smoke Tests** - Validate critical functionality
4. **Notify** - Send Slack notification
5. **Rollback** - Automatic rollback on failure

**Requirements:**
- GitHub Secrets: `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`, `STAGING_URL`
- Staging server with Docker/Docker Compose installed
- SSH access configured

---

### 🎯 Production Deployment (`cd-production.yml`)

**Triggers:** 
- Git tag matching `v*.*.*` (e.g., `v1.0.0`)
- Manual workflow dispatch

Production deployment with approval gates:

1. **Build & Push** - Create versioned Docker images
2. **Pre-Deployment Checks** - Validate staging health
3. **Database Backup** - Create pre-deployment backup
4. **Rolling Deployment** - Zero-downtime update
5. **Verification** - Health checks and smoke tests
6. **Create Release** - GitHub release with notes
7. **Rollback** - Manual rollback option on failure

**Requirements:**
- GitHub Secrets: `PRODUCTION_HOST`, `PRODUCTION_USER`, `PRODUCTION_SSH_KEY`, `PRODUCTION_URL`
- GitHub Environment: `production` with approval gate
- Production server configured

**Deploy to Production:**
```bash
# Create version tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Or manually trigger via GitHub UI
```

---

### 📦 Dependency Updates (`dependency-update.yml`)

**Triggers:** 
- Weekly schedule (Monday 9 AM UTC)
- Manual workflow dispatch

Automated dependency management:

- Check for outdated packages
- Run security audit
- Update patch and minor versions
- Run tests with updated dependencies
- Create Pull Request if tests pass

**Automatic PR Creation:**
- Branch: `automated-dependency-updates`
- Labels: `dependencies`
- Includes: Audit report and outdated packages list

---

## Dependabot Configuration (`dependabot.yml`)

Automated security and version updates:

- **npm packages** - Weekly updates (Monday)
- **Security patches** - Daily checks
- **Docker images** - Weekly base image updates
- **GitHub Actions** - Weekly action version updates

**Update Strategy:**
- Production deps: Minor and patch only
- Dev deps: Minor and patch only
- Major versions: Manual review required
- Security issues: Immediate PRs

---

## Required GitHub Secrets

### Staging Environment

| Secret | Description |
|--------|-------------|
| `STAGING_HOST` | Staging server hostname |
| `STAGING_USER` | SSH username for staging |
| `STAGING_SSH_KEY` | SSH private key for staging |
| `STAGING_URL` | Staging API URL (with https://) |

### Production Environment

| Secret | Description |
|--------|-------------|
| `PRODUCTION_HOST` | Production server hostname |
| `PRODUCTION_USER` | SSH username for production |
| `PRODUCTION_SSH_KEY` | SSH private key for production |
| `PRODUCTION_URL` | Production API URL (with https://) |

### Optional Secrets

| Secret | Description | Used By |
|--------|-------------|---------|
| `SLACK_WEBHOOK` | Slack webhook for notifications | CD pipelines |
| `SNYK_TOKEN` | Snyk API token | Security scanning |
| `TEST_TOKEN` | JWT for smoke tests | Production deployment |

---

## GitHub Environments

### Staging Environment
- **Name:** `staging`
- **URL:** https://staging-api.example.com/health
- **Protection:** None (auto-deploy)

### Production Environment
- **Name:** `production`
- **URL:** https://api.example.com/health
- **Protection:**
  - Required reviewers: 1-2 team members
  - Wait timer: 5 minutes (optional)
  - Deployment branches: `main` only

**Configure:** Settings → Environments → New environment

---

## Workflow Status

View workflow runs:
1. Navigate to repository on GitHub
2. Click **Actions** tab
3. Select workflow from sidebar
4. View recent runs and logs

---

## Local Development

Run CI checks locally before pushing:

```bash
# Lint check
npm run lint

# Format check
npm run format:check

# Type check
npx tsc --noEmit

# Run tests
npm test

# Build
npm run build

# All checks
npm run lint && npm run format:check && npx tsc --noEmit && npm test && npm run build
```

---

## Troubleshooting

### CI Pipeline Fails

**Lint errors:**
```bash
npm run lint:fix
```

**Type errors:**
```bash
npx tsc --noEmit
# Fix reported errors
```

**Test failures:**
```bash
npm test
# Fix failing tests
```

### Deployment Fails

**SSH connection issues:**
- Verify SSH key in GitHub secrets
- Check server SSH access
- Ensure public key in `~/.ssh/authorized_keys`

**Docker pull fails:**
- Check GITHUB_TOKEN permissions
- Verify image was pushed successfully
- Check server network access to ghcr.io

**Health check fails:**
- Check server logs: `docker-compose logs api`
- Verify database connection
- Check environment variables on server

---

## Best Practices

### Branch Strategy

```
main (production)
  └─ develop (staging)
      ├─ feature/new-feature
      ├─ bugfix/fix-issue
      └─ hotfix/critical-fix
```

### Commit Messages

Use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `chore:` Maintenance tasks
- `docs:` Documentation updates
- `test:` Test updates
- `ci:` CI/CD changes

### Deployment Schedule

- **Staging:** Anytime during business hours
- **Production:** Tuesday-Thursday, 2-4 PM
- **Avoid:** Fridays, weekends, holidays

### Pre-Deployment Checklist

- [ ] All CI checks passing
- [ ] Tested on staging
- [ ] Database migrations reviewed
- [ ] Team notified
- [ ] Rollback plan ready

---

## Documentation

- **[CI/CD Setup Guide](../docs/CI_CD_SETUP.md)** - Complete setup instructions
- **[Deployment Guide](../DEPLOYMENT.md)** - Server deployment guide
- **[Developer Guide](../DEVELOPER_GUIDE.md)** - Development workflow

---

**Last Updated:** 2024-01-15
