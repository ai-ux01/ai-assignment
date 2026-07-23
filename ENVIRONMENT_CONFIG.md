# Environment Configuration Guide

This document provides detailed information about environment configuration for the Support Ticket Management System.

## Table of Contents

1. [Overview](#overview)
2. [Environment Files](#environment-files)
3. [Configuration Settings](#configuration-settings)
4. [Security Best Practices](#security-best-practices)
5. [Environment-Specific Settings](#environment-specific-settings)
6. [Deployment Instructions](#deployment-instructions)

## Overview

The Support Ticket Management System uses environment variables for configuration to maintain separation between code and configuration, enabling easy deployment across different environments without code changes.

### Configuration Priority

The application loads environment variables in the following order (later sources override earlier ones):

1. System environment variables
2. `.env` file (if present)
3. Environment-specific files (`.env.development`, `.env.staging`, `.env.production`)

## Environment Files

### Available Environment Files

| File | Purpose | Version Control |
|------|---------|-----------------|
| `.env.example` | Template with all available settings and documentation | ✅ Committed |
| `.env.development` | Local development settings | ❌ Not committed |
| `.env.staging` | Staging environment settings | ❌ Not committed |
| `.env.production` | Production environment settings | ❌ Not committed |
| `.env` | Your local override file | ❌ Not committed |

### Setup Instructions

1. **For Development:**
   ```bash
   cp .env.example .env
   # or use the development-specific file
   cp .env.development .env
   ```

2. **For Staging:**
   ```bash
   cp .env.staging .env
   # Edit .env and replace all REPLACE_WITH_* placeholders
   ```

3. **For Production:**
   ```bash
   cp .env.production .env
   # Edit .env and replace all REPLACE_WITH_* placeholders
   # Use strong, randomly-generated secrets
   ```

## Configuration Settings

### Application Configuration

#### `NODE_ENV`
- **Type:** String
- **Valid values:** `development`, `staging`, `production`
- **Default:** `development`
- **Description:** Determines the environment mode. Affects logging verbosity, error message detail, and feature flags.

**Environment-specific values:**
- **Development:** `development` - Enables debug logging and detailed error messages
- **Staging:** `staging` - Balances logging detail with performance
- **Production:** `production` - Minimal logging, no error stack traces

#### `PORT`
- **Type:** Number
- **Default:** `3000`
- **Description:** The port number on which the server listens for HTTP requests.

### Database Configuration

#### Database Connection

| Variable | Type | Description | Development | Staging | Production |
|----------|------|-------------|-------------|---------|------------|
| `DB_HOST` | String | Database server hostname | `localhost` | Staging DB host | Production DB host |
| `DB_PORT` | Number | PostgreSQL port | `5432` | `5432` | `5432` |
| `DB_USER` | String | Database username | `ticketuser` | Secure username | Secure username |
| `DB_PASSWORD` | String | Database password | `ticketpass` | Strong password | Strong password |
| `DB_NAME` | String | Database name | `support_tickets_dev` | `support_tickets_staging` | `support_tickets_prod` |

#### Connection Pool Settings

| Variable | Type | Description | Development | Staging | Production |
|----------|------|-------------|-------------|---------|------------|
| `DB_MAX_CONNECTIONS` | Number | Maximum pool connections | `10` | `20` | `50` |
| `DB_IDLE_TIMEOUT` | Number | Idle timeout (ms) | `30000` | `30000` | `30000` |
| `DB_CONNECTION_TIMEOUT` | Number | Connection timeout (ms) | `10000` | `10000` | `10000` |

**Recommendations:**
- **Development:** Lower connection pool (10) to reduce resource usage on local machines
- **Staging:** Moderate pool (20) to simulate production load
- **Production:** Higher pool (50) to handle concurrent users

### Logging Configuration

#### Log Levels

| Level | Development | Staging | Production | Use Case |
|-------|-------------|---------|------------|----------|
| `debug` | ✅ Recommended | ❌ Not recommended | ❌ Never | Detailed debugging information |
| `info` | ✅ Acceptable | ✅ Recommended | ✅ Recommended | General informational messages |
| `warn` | ❌ Too restrictive | ✅ Acceptable | ✅ Acceptable | Warning messages only |
| `error` | ❌ Too restrictive | ❌ Too restrictive | ❌ Too restrictive | Errors only |

#### Log File Settings

| Variable | Type | Description | Development | Production |
|----------|------|-------------|-------------|------------|
| `LOG_LEVEL` | String | Minimum log level | `debug` | `info` |
| `LOG_FILE_PATH` | String | Log file location | `./logs/dev.log` | `./logs/production.log` |
| `LOG_MAX_FILE_SIZE` | String | Max file size before rotation | `10m` | `100m` |
| `LOG_MAX_FILES` | Number | Number of rotated files to keep | `3` | `30` |

**File Size Format:** Use suffixes `k` (kilobytes), `m` (megabytes), or `g` (gigabytes)
- Examples: `10m`, `500k`, `1g`

### Security Configuration

#### JWT Authentication

| Variable | Type | Description | Security Level |
|----------|------|-------------|----------------|
| `JWT_SECRET` | String | Secret key for signing JWTs | 🔴 **CRITICAL** |
| `JWT_EXPIRATION` | String | Token expiration time | Medium |

**JWT Secret Requirements:**
- **Development:** Any string (e.g., `dev-secret-key`)
- **Staging:** Strong, randomly-generated (min 32 characters)
- **Production:** Strong, randomly-generated (min 64 characters)

**Generate secure secrets:**
```bash
# Using OpenSSL (recommended)
openssl rand -base64 64

# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Expiration Format:** Examples: `24h`, `8h`, `1d`, `30m`

**Recommendations:**
- **Development:** `24h` - Convenient for local testing
- **Staging:** `12h` - Balance between security and usability
- **Production:** `8h` - Shorter duration for enhanced security

#### Authentication Token Validation

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `AUTH_TOKEN_ISSUER` | String | Expected token issuer (auth provider) | Yes (staging/prod) |
| `AUTH_TOKEN_AUDIENCE` | String | Expected token audience | Yes (staging/prod) |
| `AUTH_TOKEN_VALIDATION_ENABLED` | Boolean | Enable token validation | Yes (staging/prod) |

**Configuration by Environment:**
- **Development:** Optional, can be disabled for local testing
- **Staging:** Required, configure with staging auth provider
- **Production:** Required, configure with production auth provider

#### CORS Configuration

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `CORS_ORIGIN` | String | Allowed origin(s) | `http://localhost:3001` |

**Configuration by Environment:**
- **Development:** `http://localhost:3001` (local frontend)
- **Staging:** `https://staging.support-ticket.example.com`
- **Production:** `https://support-ticket.example.com`

**Multiple Origins:** Comma-separated list
```
CORS_ORIGIN=https://app1.example.com,https://app2.example.com
```

### Rate Limiting

| Variable | Type | Description | Development | Production |
|----------|------|-------------|-------------|------------|
| `RATE_LIMIT_WINDOW_MS` | Number | Time window (ms) | `900000` (15 min) | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Number | Max requests per window | `1000` | `100` |

**Recommendations:**
- **Development:** `1000` requests - Relaxed for testing
- **Staging:** `500` requests - Moderate limits
- **Production:** `100` requests - Strict protection against abuse

### Application Limits

These values enforce business rules and prevent abuse:

| Variable | Type | Description | Value |
|----------|------|-------------|-------|
| `MAX_TITLE_LENGTH` | Number | Maximum ticket title length | `200` |
| `MAX_DESCRIPTION_LENGTH` | Number | Maximum ticket description length | `5000` |
| `MAX_COMMENT_LENGTH` | Number | Maximum comment text length | `2000` |
| `MAX_SEARCH_QUERY_LENGTH` | Number | Maximum search query length | `200` |

**Note:** These should be consistent across all environments to maintain data compatibility.

### Feature Flags

| Variable | Type | Description | Development | Production |
|----------|------|-------------|-------------|------------|
| `ENABLE_ERROR_STACK` | Boolean | Show error stack traces | `true` | `false` |
| `ENABLE_REQUEST_LOGGING` | Boolean | Log HTTP requests/responses | `true` | `false` |

**Security Warning:** Never enable `ENABLE_ERROR_STACK` in production, as it exposes internal implementation details.

### Monitoring Configuration (Production)

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `ENABLE_METRICS` | Boolean | Enable Prometheus metrics | `false` |
| `METRICS_PORT` | Number | Metrics endpoint port | `9090` |
| `HEALTH_CHECK_ENABLED` | Boolean | Enable health check endpoint | `true` |
| `HEALTH_CHECK_PATH` | String | Health check URL path | `/health` |

**Production Recommendation:** Enable metrics and health checks for monitoring and alerting.

### Frontend Configuration

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | String | Backend API URL for frontend | `http://localhost:3000/api/v1` |

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser in Next.js applications.

## Security Best Practices

### 🔴 Critical Security Rules

1. **Never commit secrets to version control**
   - All `.env.*` files (except `.env.example`) are in `.gitignore`
   - Double-check before committing any file

2. **Use strong, unique secrets for each environment**
   - Development: Can use simple secrets
   - Staging/Production: Must use randomly-generated secrets (min 32 characters)

3. **Rotate secrets regularly**
   - Production: Every 90 days
   - After any suspected compromise: Immediately

4. **Restrict access to environment files**
   ```bash
   chmod 600 .env
   ```

5. **Use environment-specific databases**
   - Never point staging/development to production database
   - Use separate credentials for each environment

### Secret Management

#### For Cloud Deployments

Instead of `.env` files, use secret management services:

- **AWS:** AWS Secrets Manager or Systems Manager Parameter Store
- **Azure:** Azure Key Vault
- **GCP:** Google Secret Manager
- **Kubernetes:** Kubernetes Secrets

#### Example: AWS Secrets Manager

```bash
# Store secret
aws secretsmanager create-secret \
  --name support-ticket/production/jwt-secret \
  --secret-string "your-secure-secret"

# Retrieve in application
const secret = await secretsManager.getSecretValue({
  SecretId: 'support-ticket/production/jwt-secret'
}).promise();
```

### Database Security

1. **Use SSL/TLS for database connections** (configure in `DB_SSL` if supported)
2. **Use strong passwords** (min 16 characters, mixed case, numbers, symbols)
3. **Principle of least privilege** - Grant only necessary permissions
4. **Separate read/write credentials** if possible

## Environment-Specific Settings

### Development Environment

**Purpose:** Local development and testing

**Key Characteristics:**
- ✅ Debug logging enabled
- ✅ Detailed error messages
- ✅ Relaxed rate limits
- ✅ Local database
- ✅ Permissive CORS
- ✅ Hot reloading support

**Setup:**
```bash
cp .env.development .env
npm run dev
```

### Staging Environment

**Purpose:** Pre-production testing and QA

**Key Characteristics:**
- ⚠️ Production-like configuration
- ⚠️ Separate database from production
- ⚠️ Moderate logging
- ⚠️ Authentication enabled
- ⚠️ Similar rate limits to production

**Setup:**
```bash
cp .env.staging .env
# Replace all REPLACE_WITH_* values
npm run build
npm start
```

### Production Environment

**Purpose:** Live production system

**Key Characteristics:**
- 🔴 Minimal logging (info level only)
- 🔴 No error stack traces
- 🔴 Strict rate limits
- 🔴 Strong authentication
- 🔴 Monitoring enabled
- 🔴 CORS restricted to specific domains

**Setup:**
```bash
cp .env.production .env
# Replace all REPLACE_WITH_* values with secure secrets
npm run build
npm start
```

## Deployment Instructions

### Docker Deployment

When deploying with Docker, pass environment variables:

```bash
# Development
docker run -p 3000:3000 --env-file .env.development support-ticket-app

# Production
docker run -p 3000:3000 --env-file .env.production support-ticket-app
```

**Docker Compose:**

```yaml
version: '3.8'
services:
  app:
    image: support-ticket-app
    env_file:
      - .env.production
    ports:
      - "3000:3000"
```

### Kubernetes Deployment

Create Kubernetes secrets:

```bash
kubectl create secret generic support-ticket-secrets \
  --from-literal=DB_PASSWORD=your-secure-password \
  --from-literal=JWT_SECRET=your-jwt-secret
```

Reference in deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: support-ticket-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: support-ticket-app:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: support-ticket-secrets
              key: DB_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: support-ticket-secrets
              key: JWT_SECRET
```

### CI/CD Pipeline

**Example GitHub Actions workflow:**

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up environment
        run: |
          echo "NODE_ENV=production" >> .env
          echo "DB_HOST=${{ secrets.PROD_DB_HOST }}" >> .env
          echo "DB_PASSWORD=${{ secrets.PROD_DB_PASSWORD }}" >> .env
          echo "JWT_SECRET=${{ secrets.PROD_JWT_SECRET }}" >> .env
      
      - name: Build and deploy
        run: |
          npm ci
          npm run build
          # Deploy commands...
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failures

**Symptom:** `DATABASE_UNAVAILABLE` errors

**Solutions:**
- Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` are correct
- Check database server is running: `pg_isready -h DB_HOST -p DB_PORT`
- Verify network connectivity and firewall rules
- Check `DB_CONNECTION_TIMEOUT` is sufficient

#### 2. CORS Errors in Browser

**Symptom:** Browser blocks API requests with CORS error

**Solutions:**
- Verify `CORS_ORIGIN` matches your frontend URL exactly
- Include protocol (http/https) and port
- Check for trailing slashes
- For multiple origins, ensure comma-separated list

#### 3. JWT Authentication Failures

**Symptom:** `401 Unauthorized` errors

**Solutions:**
- Verify `JWT_SECRET` matches between environments
- Check `JWT_EXPIRATION` format is valid
- Verify `AUTH_TOKEN_ISSUER` and `AUTH_TOKEN_AUDIENCE` match your auth provider
- Ensure `AUTH_TOKEN_VALIDATION_ENABLED` is set correctly

#### 4. Log Files Not Created

**Symptom:** No log files in logs directory

**Solutions:**
- Verify `LOG_FILE_PATH` directory exists: `mkdir -p logs`
- Check write permissions: `chmod 755 logs`
- Verify `LOG_LEVEL` is set correctly

### Environment Variable Not Loading

**Check order:**
1. Is the variable in your `.env` file?
2. Is the `.env` file in the project root?
3. Are you using `dotenv` or similar to load the file?
4. Are there typos in the variable name?

**Debug command:**
```bash
node -e "require('dotenv').config(); console.log(process.env.YOUR_VARIABLE)"
```

## Additional Resources

- [PostgreSQL Connection Documentation](https://www.postgresql.org/docs/current/libpq-connect.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [12-Factor App Methodology](https://12factor.net/config)

## Support

For issues or questions about environment configuration:
1. Check this documentation
2. Review the `.env.example` file
3. Check application logs for specific error messages
4. Consult your system administrator for infrastructure-specific settings
