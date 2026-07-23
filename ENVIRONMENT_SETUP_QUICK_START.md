# Environment Setup Quick Start

Quick reference guide for setting up environment configuration.

## 🚀 Quick Setup

### Development Environment

```bash
# Copy the development template
cp .env.development .env

# Start the application
npm run dev
```

### Staging Environment

```bash
# Copy the staging template
cp .env.staging .env

# Update the following values in .env:
# - DB_PASSWORD (replace REPLACE_WITH_SECURE_STAGING_PASSWORD)
# - JWT_SECRET (replace REPLACE_WITH_SECURE_STAGING_JWT_SECRET)
# - CORS_ORIGIN (replace with your staging domain)
# - AUTH_TOKEN_ISSUER (configure for your auth provider)
# - Frontend URL in NEXT_PUBLIC_API_URL

# Build and start
npm run build
npm start
```

### Production Environment

```bash
# Copy the production template
cp .env.production .env

# Update the following CRITICAL values in .env:
# - DB_HOST, DB_PASSWORD, DB_USER (production database credentials)
# - JWT_SECRET (replace REPLACE_WITH_SECURE_PRODUCTION_JWT_SECRET)
# - CORS_ORIGIN (your production domain)
# - AUTH_TOKEN_ISSUER and AUTH_TOKEN_AUDIENCE (your auth provider)
# - Frontend URL in NEXT_PUBLIC_API_URL

# Build and start
npm run build
npm start
```

## 🔑 Generate Secure Secrets

### Using OpenSSL (Recommended)
```bash
openssl rand -base64 64
```

### Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

## 📋 Environment Checklist

### Development ✅
- [ ] Copy `.env.development` to `.env`
- [ ] Verify database is running locally
- [ ] Check port 3000 is available

### Staging ⚠️
- [ ] Copy `.env.staging` to `.env`
- [ ] Replace `REPLACE_WITH_SECURE_STAGING_PASSWORD` with strong password
- [ ] Replace `REPLACE_WITH_SECURE_STAGING_JWT_SECRET` with generated secret
- [ ] Update `CORS_ORIGIN` to staging domain
- [ ] Configure authentication settings
- [ ] Test database connection
- [ ] Verify logging works

### Production 🔴
- [ ] Copy `.env.production` to `.env`
- [ ] Replace ALL `REPLACE_WITH_*` placeholders
- [ ] Use strong, randomly-generated secrets (min 64 characters)
- [ ] Verify `NODE_ENV=production`
- [ ] Set `LOG_LEVEL=info` (not debug)
- [ ] Set `ENABLE_ERROR_STACK=false`
- [ ] Configure strict `CORS_ORIGIN`
- [ ] Enable monitoring (`ENABLE_METRICS=true`)
- [ ] Test database connection
- [ ] Test authentication
- [ ] Verify rate limiting is active

## ⚙️ Key Configuration Differences

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| `NODE_ENV` | `development` | `staging` | `production` |
| `LOG_LEVEL` | `debug` | `info` | `info` |
| `ENABLE_ERROR_STACK` | `true` | `false` | `false` |
| `DB_MAX_CONNECTIONS` | `10` | `20` | `50` |
| `RATE_LIMIT_MAX_REQUESTS` | `1000` | `500` | `100` |
| `JWT_EXPIRATION` | `24h` | `12h` | `8h` |

## 🔒 Security Reminders

1. **Never commit `.env` files to version control** (already in .gitignore)
2. **Use unique secrets for each environment**
3. **Rotate production secrets every 90 days**
4. **Restrict access to production environment files**
   ```bash
   chmod 600 .env
   ```
5. **Use secret management services in cloud deployments** (AWS Secrets Manager, Azure Key Vault, etc.)

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -h DB_HOST -U DB_USER -d DB_NAME

# Check if PostgreSQL is running
pg_isready -h localhost -p 5432
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Environment Variables Not Loading
```bash
# Verify .env file exists
ls -la .env

# Check environment variable loading
node -e "require('dotenv').config(); console.log(process.env.NODE_ENV)"
```

### CORS Errors
- Verify `CORS_ORIGIN` matches your frontend URL exactly
- Include protocol (http/https)
- Include port if not default (80/443)
- No trailing slashes

## 📚 Full Documentation

For comprehensive documentation, see [ENVIRONMENT_CONFIG.md](./ENVIRONMENT_CONFIG.md)

## 🆘 Getting Help

1. Check [ENVIRONMENT_CONFIG.md](./ENVIRONMENT_CONFIG.md) for detailed documentation
2. Review `.env.example` for all available settings
3. Check application logs in `./logs/` directory
4. Verify database connectivity
5. Consult system administrator for infrastructure-specific settings
