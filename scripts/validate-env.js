#!/usr/bin/env node

/**
 * Environment Configuration Validator
 * 
 * This script validates that all required environment variables are set
 * and checks for common configuration issues.
 * 
 * Usage:
 *   node scripts/validate-env.js
 */

require('dotenv').config();

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  error: (msg) => console.error(`${COLORS.red}✗${COLORS.reset} ${msg}`),
  success: (msg) => console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`),
  warning: (msg) => console.warn(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`),
  info: (msg) => console.log(`${COLORS.cyan}ℹ${COLORS.reset} ${msg}`),
  section: (msg) => console.log(`\n${COLORS.blue}${msg}${COLORS.reset}`),
};

// Required environment variables
const REQUIRED_VARS = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'LOG_LEVEL',
];

// Optional but recommended variables
const RECOMMENDED_VARS = [
  'JWT_SECRET',
  'CORS_ORIGIN',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
];

// Security-critical variables
const SECURITY_VARS = ['JWT_SECRET', 'DB_PASSWORD'];

let errorCount = 0;
let warningCount = 0;

/**
 * Check if a variable is set
 */
function checkVariable(varName, required = false) {
  const value = process.env[varName];
  
  if (!value) {
    if (required) {
      log.error(`${varName} is required but not set`);
      errorCount++;
      return false;
    } else {
      log.warning(`${varName} is not set (optional)`);
      warningCount++;
      return false;
    }
  }
  
  return true;
}

/**
 * Validate NODE_ENV value
 */
function validateNodeEnv() {
  log.section('Validating Application Configuration');
  
  const nodeEnv = process.env.NODE_ENV;
  const validEnvs = ['development', 'staging', 'production', 'test'];
  
  if (checkVariable('NODE_ENV', true)) {
    if (validEnvs.includes(nodeEnv)) {
      log.success(`NODE_ENV is set to '${nodeEnv}'`);
    } else {
      log.error(`NODE_ENV '${nodeEnv}' is not valid. Must be one of: ${validEnvs.join(', ')}`);
      errorCount++;
    }
  }
  
  if (checkVariable('PORT', true)) {
    const port = parseInt(process.env.PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      log.error(`PORT must be a valid port number (1-65535), got '${process.env.PORT}'`);
      errorCount++;
    } else {
      log.success(`PORT is set to ${port}`);
    }
  }
}

/**
 * Validate database configuration
 */
function validateDatabase() {
  log.section('Validating Database Configuration');
  
  const dbVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const allSet = dbVars.every(varName => checkVariable(varName, true));
  
  if (allSet) {
    log.success('All required database variables are set');
    
    // Check port is numeric
    const dbPort = parseInt(process.env.DB_PORT, 10);
    if (isNaN(dbPort)) {
      log.error(`DB_PORT must be a number, got '${process.env.DB_PORT}'`);
      errorCount++;
    }
    
    // Warn about default credentials in non-dev environments
    if (process.env.NODE_ENV !== 'development') {
      if (process.env.DB_PASSWORD === 'ticketpass') {
        log.warning('Using default database password in non-development environment');
        warningCount++;
      }
      if (process.env.DB_USER === 'ticketuser') {
        log.warning('Using default database username in non-development environment');
        warningCount++;
      }
    }
  }
  
  // Check connection pool settings
  const poolVars = ['DB_MAX_CONNECTIONS', 'DB_IDLE_TIMEOUT', 'DB_CONNECTION_TIMEOUT'];
  poolVars.forEach(varName => {
    if (process.env[varName]) {
      const value = parseInt(process.env[varName], 10);
      if (isNaN(value)) {
        log.error(`${varName} must be a number, got '${process.env[varName]}'`);
        errorCount++;
      }
    }
  });
}

/**
 * Validate logging configuration
 */
function validateLogging() {
  log.section('Validating Logging Configuration');
  
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  
  if (checkVariable('LOG_LEVEL', true)) {
    const logLevel = process.env.LOG_LEVEL;
    if (validLogLevels.includes(logLevel)) {
      log.success(`LOG_LEVEL is set to '${logLevel}'`);
      
      // Environment-specific recommendations
      if (process.env.NODE_ENV === 'production' && logLevel === 'debug') {
        log.warning('LOG_LEVEL is set to debug in production - this may impact performance');
        warningCount++;
      }
    } else {
      log.error(`LOG_LEVEL '${logLevel}' is not valid. Must be one of: ${validLogLevels.join(', ')}`);
      errorCount++;
    }
  }
}

/**
 * Validate security configuration
 */
function validateSecurity() {
  log.section('Validating Security Configuration');
  
  // JWT Secret
  if (checkVariable('JWT_SECRET', false)) {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (process.env.NODE_ENV === 'production') {
      if (jwtSecret.includes('REPLACE_WITH') || jwtSecret === 'your-secret-key-here' || jwtSecret === 'dev-secret-key') {
        log.error('JWT_SECRET contains placeholder value in production environment');
        errorCount++;
      } else if (jwtSecret.length < 32) {
        log.warning('JWT_SECRET is less than 32 characters - use a longer secret for better security');
        warningCount++;
      } else {
        log.success('JWT_SECRET is set and appears secure');
      }
    } else if (process.env.NODE_ENV === 'development') {
      log.success('JWT_SECRET is set');
    }
  }
  
  // CORS Origin
  if (checkVariable('CORS_ORIGIN', false)) {
    const corsOrigin = process.env.CORS_ORIGIN;
    
    if (process.env.NODE_ENV === 'production' && corsOrigin === '*') {
      log.error('CORS_ORIGIN is set to * in production - this is a security risk');
      errorCount++;
    } else {
      log.success(`CORS_ORIGIN is set to '${corsOrigin}'`);
    }
  }
  
  // Rate Limiting
  if (process.env.RATE_LIMIT_MAX_REQUESTS) {
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10);
    if (isNaN(maxRequests)) {
      log.error(`RATE_LIMIT_MAX_REQUESTS must be a number, got '${process.env.RATE_LIMIT_MAX_REQUESTS}'`);
      errorCount++;
    } else if (process.env.NODE_ENV === 'production' && maxRequests > 500) {
      log.warning(`RATE_LIMIT_MAX_REQUESTS is set to ${maxRequests} in production - consider stricter limits`);
      warningCount++;
    }
  }
  
  // Feature Flags
  if (process.env.NODE_ENV === 'production') {
    if (process.env.ENABLE_ERROR_STACK === 'true') {
      log.error('ENABLE_ERROR_STACK is enabled in production - this exposes internal details');
      errorCount++;
    } else {
      log.success('ENABLE_ERROR_STACK is disabled in production');
    }
  }
}

/**
 * Validate application limits
 */
function validateLimits() {
  log.section('Validating Application Limits');
  
  const limitVars = [
    'MAX_TITLE_LENGTH',
    'MAX_DESCRIPTION_LENGTH',
    'MAX_COMMENT_LENGTH',
    'MAX_SEARCH_QUERY_LENGTH',
  ];
  
  limitVars.forEach(varName => {
    if (process.env[varName]) {
      const value = parseInt(process.env[varName], 10);
      if (isNaN(value) || value <= 0) {
        log.error(`${varName} must be a positive number, got '${process.env[varName]}'`);
        errorCount++;
      } else {
        log.success(`${varName} is set to ${value}`);
      }
    }
  });
}

/**
 * Check for placeholder values
 */
function checkPlaceholders() {
  log.section('Checking for Placeholder Values');
  
  const allVars = Object.keys(process.env);
  const placeholders = allVars.filter(key => {
    const value = process.env[key];
    return value && (
      value.includes('REPLACE_WITH') ||
      value.includes('your-secret-key-here') ||
      value.includes('example.com')
    );
  });
  
  if (placeholders.length > 0 && process.env.NODE_ENV !== 'development') {
    placeholders.forEach(key => {
      log.error(`${key} contains placeholder value: '${process.env[key]}'`);
      errorCount++;
    });
  } else if (placeholders.length > 0) {
    log.warning('Some variables contain placeholder values (acceptable for development)');
    placeholders.forEach(key => log.info(`  ${key}`));
    warningCount++;
  } else {
    log.success('No placeholder values detected');
  }
}

/**
 * Display summary
 */
function displaySummary() {
  log.section('Validation Summary');
  
  console.log(`Environment: ${COLORS.cyan}${process.env.NODE_ENV || 'not set'}${COLORS.reset}`);
  console.log(`Errors: ${errorCount > 0 ? COLORS.red : COLORS.green}${errorCount}${COLORS.reset}`);
  console.log(`Warnings: ${warningCount > 0 ? COLORS.yellow : COLORS.green}${warningCount}${COLORS.reset}`);
  
  if (errorCount > 0) {
    console.log(`\n${COLORS.red}❌ Configuration validation failed${COLORS.reset}`);
    console.log('Please fix the errors above before starting the application.');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log(`\n${COLORS.yellow}⚠ Configuration validation passed with warnings${COLORS.reset}`);
    console.log('Review the warnings above and consider addressing them.');
    process.exit(0);
  } else {
    console.log(`\n${COLORS.green}✅ Configuration validation passed${COLORS.reset}`);
    console.log('All environment variables are properly configured.');
    process.exit(0);
  }
}

/**
 * Main validation
 */
function main() {
  console.log(`${COLORS.blue}═══════════════════════════════════════════════${COLORS.reset}`);
  console.log(`${COLORS.blue}  Environment Configuration Validator${COLORS.reset}`);
  console.log(`${COLORS.blue}═══════════════════════════════════════════════${COLORS.reset}`);
  
  validateNodeEnv();
  validateDatabase();
  validateLogging();
  validateSecurity();
  validateLimits();
  checkPlaceholders();
  displaySummary();
}

// Run validation
main();
