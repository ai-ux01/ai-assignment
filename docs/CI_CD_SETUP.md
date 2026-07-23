# CI/CD Pipeline Documentation

**Support Ticket Management System - Continuous Integration and Continuous Deployment**

This document describes the automated CI/CD pipeline setup for the Support Ticket Management System using GitHub Actions.

---

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [CI Pipeline](#ci-pipeline)
4. [CD Pipelines](#cd-pipelines)
5. [Setup Instructions](#setup-instructions)
6. [Secrets Configuration](#secrets-configuration)
7. [Deployment Workflows](#deployment-workflows)
8. [Monitoring and Alerts](#monitoring-and-alerts)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The CI/CD pipeline automates the following processes:

### Continuous Integration (CI)
- **Linting**: ESLint code quality checks
- **Type Checking**: TypeScript compilation validation
- **Testing**: Automated test suite with PostgreSQL database
- **Building**: TypeScript compilation to JavaScript
- **Docker Build**: Container image creation
- **Security Scanning**: Dependency vulnerability checks

### Continuous Deployment (CD)
- **Staging Deployment**: Automatic deployment to staging on `develop` branch
- **Production Deployment**: Manual/tagged deployment to production
- **Rollback**: Automated rollback on deployment failures

### Additional Automation
- **Dependency Updates**: Weekly automated dependency updates via Dependabot
- **Security Audits**: Daily security vulnerability checks
- **Docker Updates**: Weekly base image updates

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                        │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─── Push/PR to main/develop
             │    │
             │    ▼
             │    ┌──────────────────────────────────────────────┐
             │    │           CI Pipeline (ci.yml)               │
             │    │  • Lint & Format Check                       │
             │    │  • Type Checking                             │
             │    │  • Run Tests (with PostgreSQL)               │
             │    │  • Build Application                         │
             │    │  • Build Docker Image                        │
             │    │  • Security Scanning                         │
             │    └──────────────────────────────────────────────┘
             │
             ├─── Push to develop (after CI passes)
             │    │
             │    ▼
             │    ┌──────────────────────────────────────────────┐
             │    │     Staging Deployment (cd-staging.yml)      │
             │    │  • Build & Push Docker Image                 │
             │    │  • Deploy to Staging Server                  │
             │    │  • Run Smoke Tests                           │
             │    │  • Notify Team                               │
             │    │  • Rollback on Failure                       │
             │    └──────────────────────────────────────────────┘
             │
             ├─── Tag v*.*.* (after staging validation)
             │    │
             │    ▼
             │    ┌──────────────────────────────────────────────┐
             │    │   Production Deployment (cd-production.yml)   │
             │    │  • Build & Push Docker Image                 │
             │    │  • Pre-Deployment Checks                     │
             │    │  • Backup Database                           │
             │    │  • Rolling Deployment (Zero-Downtime)        │
             │    │  • Verification & Smoke Tests                │
             │    │  • Create GitHub Release                     │
             │    │  • Rollback on Failure                       │
             │    └──────────────────────────────────────────────┘
             │
             └─── Weekly Schedule
                  │
                  ▼
                  ┌──────────────────────────────────────────────┐
                  │   Dependency Updates (dependency-update.yml)  │
                  │  • Check Outdated Packages                   │
                  │  • Run Security Audit                        │
                  │  • Update Dependencies                       │
                  │  • Run Tests                                 │
                  │  • Create Pull Request                       │
                  └──────────────────────────────────────────────┘
```

---

## CI Pipeline

### Workflow File: `.github/workflows/ci.yml`

The CI pipeline runs on every push and pull request to `main` and `develop` branches.

### Jobs

#### 1. **Lint and Format Check**
```yaml
- Runs ESLint on TypeScript files
- Checks code formatting with Prettier
- Fails if linting errors or formatting issues found
```

**Command Equivalents:**
```bash
npm run lint
npm run format:check
```

#### 2. **Type Checking**
```yaml
- Runs TypeScript compiler in check mode
- Validates type correctness without emitting files
- Catches type errors before runtime
```

**Command Equivalent:**
```bash
npx tsc --noEmit
```

#### 3. **Run Tests**
```yaml
- Spins up PostgreSQL 15 service container
- Runs database migrations
- Executes full test suite
- Generates code coverage report
- Uploads coverage to Codecov
```

**Environment Setup:**
- PostgreSQL service running on `localhost:5432`
- Test database: `support_tickets_test`
- All environment variables configured for testing

**Command Equivalent:**
```bash
npm test
npm run test:coverage
```

#### 4. **Build Application**
```yaml
- Compiles TypeScript to JavaScript
- Verifies build artifacts are created
- Uploads build artifacts for later jobs
```

**Command Equivalent:**
```bash
npm run build
```

#### 5. **Docker Build**
```yaml
- Builds production Docker image
- Uses build cache for faster builds
- Tests image can run successfully
```

**Command Equivalent:**
```bash
docker build -f Dockerfile.production -t support-ticket-api:test .
```

#### 6. **Security Scan**
```yaml
- Runs npm audit for known vulnerabilities
- Runs Snyk security scanner (optional)
- Reports high-severity issues
```

**Command Equivalent:**
```bash
npm audit --audit-level=moderate
```

### CI Success Criteria

All jobs must pass for the CI pipeline to succeed:
- ✅ No linting errors
- ✅ No type errors
- ✅ All tests passing (603/627 target)
- ✅ Build successful
- ✅ Docker image builds
- ✅ No critical security vulnerabilities

---

## CD Pipelines

### Staging Deployment

**Workflow File:** `.github/workflows/cd-staging.yml`

**Trigger:** Automatic on push to `develop` branch (after CI passes)

**Process:**

1. **Build and Push Docker Image**
   - Tags: `staging-latest`, `staging-{sha}`
   - Pushes to GitHub Container Registry (ghcr.io)

2. **Deploy to Staging Server**
   - SSH to staging server
   - Pull latest Docker image
   - Stop old containers
   - Start new containers
   - Wait for health check

3. **Run Smoke Tests**
   - Test health endpoint
   - Test critical API endpoints
   - Verify basic functionality

4. **Notify Team**
   - Send Slack notification with deployment status

5. **Rollback on Failure** (if any step fails)
   - Restore previous version
   - Send alert notification

### Production Deployment

**Workflow File:** `.github/workflows/cd-production.yml`

**Triggers:**
- Git tag matching `v*.*.*` pattern (e.g., `v1.0.0`)
- Manual workflow dispatch with version input

**Process:**

1. **Build and Push Docker Image**
   - Tags: `{version}`, `{major}.{minor}`, `production-latest`
   - Pushes to GitHub Container Registry

2. **Pre-Deployment Checks**
   - Verify staging environment is healthy
   - Check for blocking issues
   - Validate production readiness

3. **Create Database Backup**
   - SSH to production server
   - Create timestamped database backup
   - Store in backup directory

4. **Rolling Deployment (Zero-Downtime)**
   - Pull new Docker image
   - Scale up to 2 API instances
   - Wait for health checks
   - Scale down old instance
   - Remove old containers

5. **Verify Deployment**
   - Health endpoint checks (5 retries)
   - API endpoint validation
   - Critical functionality tests

6. **Run Smoke Tests**
   - Create test ticket
   - Verify response structure
   - Validate core operations

7. **Post-Deployment**
   - Create GitHub release
   - Tag successful deployment
   - Send success notification

8. **Rollback on Failure** (manual approval)
   - Pull previous stable image
   - Restore containers
   - Database backup available for restoration
   - Send rollback notification

---

## Setup Instructions

### Prerequisites

1. **GitHub Repository**
   - Repository initialized with Git
   - Code pushed to GitHub

2. **GitHub Container Registry Access**
   - Personal Access Token (PAT) with `write:packages` scope
   - Or use `GITHUB_TOKEN` (automatic)

3. **Deployment Servers**
   - Staging server with SSH access
   - Production server with SSH access
   - Docker and Docker Compose installed
   - Project directory structure set up

### Step 1: Initialize Git Repository

```bash
# Initialize Git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit"

# Add remote repository
git remote add origin https://github.com/your-org/support-ticket.git

# Push to GitHub
git push -u origin main

# Create develop branch
git checkout -b develop
git push -u origin develop
```

### Step 2: Configure GitHub Secrets

Navigate to **GitHub Repository → Settings → Secrets and variables → Actions**

Add the following secrets:

#### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `STAGING_HOST` | Staging server hostname | `staging.example.com` |
| `STAGING_USER` | Staging server SSH username | `deploy` |
| `STAGING_SSH_KEY` | Staging server SSH private key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `STAGING_URL` | Staging API base URL | `https://staging-api.example.com` |
| `PRODUCTION_HOST` | Production server hostname | `production.example.com` |
| `PRODUCTION_USER` | Production server SSH username | `deploy` |
| `PRODUCTION_SSH_KEY` | Production server SSH private key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `PRODUCTION_URL` | Production API base URL | `https://api.example.com` |

#### Optional Secrets

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `SLACK_WEBHOOK` | Slack webhook URL for notifications | Slack notifications |
| `SNYK_TOKEN` | Snyk API token | Security scanning |
| `TEST_TOKEN` | JWT token for smoke tests | Production smoke tests |

### Step 3: Generate SSH Keys for Deployment

```bash
# Generate SSH key pair (do NOT set passphrase)
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ./deploy_key

# Copy public key to servers
ssh-copy-id -i deploy_key.pub deploy@staging.example.com
ssh-copy-id -i deploy_key.pub deploy@production.example.com

# Copy private key content to GitHub secret
cat deploy_key
# Copy the entire output (including BEGIN/END lines) to STAGING_SSH_KEY and PRODUCTION_SSH_KEY
```

### Step 4: Prepare Deployment Servers

**On both staging and production servers:**

```bash
# Create project directory
sudo mkdir -p /opt/support-ticket
sudo chown deploy:deploy /opt/support-ticket

# Clone repository
cd /opt/support-ticket
git clone https://github.com/your-org/support-ticket.git .

# Create required directories
mkdir -p data/postgres data/backups data/logs

# Copy environment file
cp .env.staging .env  # or .env.production

# Edit environment variables
vim .env

# Ensure Docker is installed
docker --version
docker-compose --version

# Test SSH access from GitHub Actions
# (will be automated by CI/CD)
```

### Step 5: Configure GitHub Environments

Navigate to **GitHub Repository → Settings → Environments**

#### Create Staging Environment
- Name: `staging`
- Protection rules: None (auto-deploy)
- Environment URL: `https://staging-api.example.com/health`

#### Create Production Environment
- Name: `production`
- Protection rules: 
  - ✅ Required reviewers (1-2 team members)
  - ✅ Wait timer: 5 minutes (optional)
- Environment URL: `https://api.example.com/health`

### Step 6: Test CI Pipeline

```bash
# Make a small change
echo "# CI/CD Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: trigger CI pipeline"
git push origin develop

# Check GitHub Actions tab
# Verify all CI jobs pass
```

### Step 7: Test Staging Deployment

```bash
# Push to develop branch
git push origin develop

# Check GitHub Actions tab
# Verify CD-Staging pipeline runs
# Check staging server for updated deployment
```

### Step 8: Test Production Deployment

```bash
# Create a version tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Check GitHub Actions tab
# Approve production deployment (if required reviewers configured)
# Verify production deployment completes
```

---

## Secrets Configuration

### Generating SSH Private Keys

```bash
# Generate RSA key (no passphrase for automation)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_actions_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@server.com

# Get private key for GitHub secret
cat ~/.ssh/github_actions_deploy

# Add entire content (including BEGIN/END lines) to GitHub secret
```

### Generating Slack Webhook URL

1. Go to https://api.slack.com/apps
2. Create new app or select existing
3. Enable "Incoming Webhooks"
4. Add new webhook to workspace
5. Select channel for notifications
6. Copy webhook URL to `SLACK_WEBHOOK` secret

### Generating Snyk Token

1. Sign up at https://snyk.io
2. Navigate to Account Settings
3. Generate API token
4. Copy token to `SNYK_TOKEN` secret

---

## Deployment Workflows

### Deploying to Staging

**Automatic deployment on every push to `develop`:**

```bash
# Make changes
git checkout develop
# ... make changes ...

# Commit and push
git add .
git commit -m "feat: new feature"
git push origin develop

# CI pipeline runs automatically
# If CI passes, staging deployment starts automatically
```

### Deploying to Production

**Option 1: Git Tag (Recommended)**

```bash
# Ensure develop is merged to main
git checkout main
git merge develop
git push origin main

# Create semantic version tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Production deployment starts automatically
# Requires approval if reviewers configured
```

**Option 2: Manual Workflow Dispatch**

1. Go to GitHub Actions tab
2. Select "CD - Deploy to Production" workflow
3. Click "Run workflow"
4. Enter version (e.g., `v1.0.0`)
5. Click "Run workflow" button
6. Approve deployment if required

### Rolling Back Deployments

#### Staging Rollback (Automatic)

If staging deployment fails, rollback happens automatically:
- Previous version restored
- Team notified via Slack

#### Production Rollback (Manual)

**Option 1: Deploy Previous Tag**

```bash
# Find previous working version
git tag

# Deploy previous version
git push origin v0.9.9

# Or manually trigger with previous version
```

**Option 2: Manual Server Rollback**

```bash
# SSH to production server
ssh deploy@production.example.com

# Go to project directory
cd /opt/support-ticket

# Pull previous stable image
docker pull ghcr.io/your-org/support-ticket-api:production-previous

# Restart with previous version
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d

# Verify rollback
curl http://localhost:3000/health
```

**Option 3: Restore Database Backup**

```bash
# SSH to production server
ssh deploy@production.example.com
cd /opt/support-ticket

# List available backups
ls -lht data/backups/

# Restore specific backup
./scripts/restore-database.sh data/backups/backup_YYYYMMDD_HHMMSS.sql.gz

# Verify restoration
docker-compose exec postgres psql -U ticketuser -d support_tickets_prod \
  -c "SELECT COUNT(*) FROM tickets;"
```

---

## Monitoring and Alerts

### GitHub Actions Monitoring

**View Workflow Runs:**
1. Go to repository on GitHub
2. Click "Actions" tab
3. View recent workflow runs
4. Click on specific run for details

**Email Notifications:**
- GitHub sends email on workflow failures
- Configure in GitHub Settings → Notifications

### Slack Notifications

The CD pipelines send Slack notifications for:
- ✅ Successful staging deployments
- ✅ Successful production deployments
- ❌ Failed deployments
- 🔄 Rollback executions

**Message Format:**
```
✅ Production Deployment Successful
Version: v1.0.0
Commit: abc123
Deployed by: username
```

### Deployment Logs

**View logs in GitHub Actions:**
- Click on workflow run
- Select job
- Expand step to view logs

**View logs on server:**
```bash
# SSH to server
ssh deploy@server.example.com

# View application logs
docker-compose logs -f api

# View deployment history
ls -lht /opt/support-ticket/data/logs/
```

### Health Monitoring

**Automated health checks in CD pipeline:**
- Health endpoint: `/health`
- Readiness endpoint: `/health/ready`
- Liveness endpoint: `/health/live`

**Manual health check:**
```bash
# Staging
curl https://staging-api.example.com/health

# Production
curl https://api.example.com/health
```

---

## Troubleshooting

### CI Pipeline Failures

#### Lint Failures

**Error:** `ESLint found errors`

**Solution:**
```bash
# Fix automatically
npm run lint:fix

# Check remaining issues
npm run lint
```

#### Type Check Failures

**Error:** `TypeScript compilation errors`

**Solution:**
```bash
# Check errors locally
npx tsc --noEmit

# Fix type errors in reported files
```

#### Test Failures

**Error:** `Tests failed`

**Solution:**
```bash
# Run tests locally
npm test

# Run specific test file
npm test -- path/to/test.ts

# Check test logs in GitHub Actions
```

#### Build Failures

**Error:** `Build failed`

**Solution:**
```bash
# Build locally
npm run build

# Check for syntax errors
npm run lint

# Verify all dependencies installed
npm ci
```

### CD Pipeline Failures

#### SSH Connection Failures

**Error:** `Permission denied (publickey)`

**Solutions:**
1. Verify SSH key is correct in GitHub secrets
2. Ensure public key is in server's `~/.ssh/authorized_keys`
3. Check SSH key permissions on server (`chmod 600`)
4. Test SSH connection manually

#### Docker Pull Failures

**Error:** `Error pulling image`

**Solutions:**
1. Verify image was built and pushed in previous step
2. Check GitHub Container Registry permissions
3. Verify server can access ghcr.io
4. Check Docker registry credentials

#### Health Check Failures

**Error:** `Health check failed after deployment`

**Solutions:**
```bash
# SSH to server
ssh deploy@server.example.com

# Check container logs
docker-compose logs api

# Check container status
docker-compose ps

# Verify database connection
docker-compose exec postgres pg_isready

# Test health endpoint locally
curl http://localhost:3000/health
```

#### Database Migration Failures

**Error:** `Migration failed`

**Solutions:**
```bash
# SSH to server
ssh deploy@server.example.com

# Check database status
docker-compose exec postgres psql -U ticketuser -d support_tickets -c "\dt"

# Run migrations manually
npm run migrate

# Check migration logs
```

### Rollback Issues

#### Automatic Rollback Fails

**Manual rollback procedure:**
```bash
# SSH to server
ssh deploy@server.example.com
cd /opt/support-ticket

# Stop current deployment
docker-compose down

# Pull previous working version
docker pull ghcr.io/your-org/support-ticket-api:v0.9.9

# Update docker-compose.yml to use previous version
sed -i 's/:v1.0.0/:v0.9.9/g' docker-compose.production.yml

# Start previous version
docker-compose up -d

# Verify rollback
curl http://localhost:3000/health
```

### Getting Help

**View detailed logs:**
- GitHub Actions: Click workflow run → View job logs
- Server logs: `docker-compose logs -f api`
- Database logs: `docker-compose logs -f postgres`

**Common commands:**
```bash
# Check all service status
docker-compose ps

# View recent logs
docker-compose logs --tail=100 api

# Restart services
docker-compose restart

# Full rebuild
docker-compose down
docker-compose up -d --build
```

---

## Best Practices

### Branching Strategy

```
main (production)
  └─ develop (staging)
      ├─ feature/new-feature
      ├─ bugfix/fix-issue
      └─ hotfix/critical-fix
```

**Workflow:**
1. Create feature branch from `develop`
2. Make changes and test locally
3. Create Pull Request to `develop`
4. CI runs on PR
5. Merge to `develop` after approval
6. Staging deployment happens automatically
7. Test on staging
8. Merge `develop` to `main`
9. Create version tag
10. Production deployment starts

### Version Tagging

Use semantic versioning: `vMAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

**Examples:**
- `v1.0.0` - Initial release
- `v1.1.0` - New feature added
- `v1.1.1` - Bug fix

### Deployment Timing

**Staging:**
- Deploy anytime during business hours
- Automatic on push to `develop`

**Production:**
- Deploy during low-traffic periods
- Recommended: Tuesday-Thursday, 2-4 PM
- Avoid: Fridays, weekends, holidays

### Pre-Deployment Checklist

- [ ] All tests passing in CI
- [ ] Deployed and tested on staging
- [ ] Database migrations reviewed
- [ ] Breaking changes documented
- [ ] Team notified of deployment
- [ ] Rollback plan prepared
- [ ] Monitoring enabled

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Deployment Guide](./DEPLOYMENT.md)
- [Docker Production README](./DOCKER_PRODUCTION_README.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
