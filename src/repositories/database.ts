/**
 * Database Connection and Pool Management
 *
 * This module provides PostgreSQL connection pooling, transaction support,
 * and connection error handling with retry logic.
 *
 * Requirements:
 * - 10.6: Handle persistence failures with rollback
 * - 10.8: Support concurrent read and write operations
 * - Non-Functional Reliability 3: Recover gracefully from transient connection failures
 */

import { Pool, PoolClient, PoolConfig, QueryResult } from 'pg';
import logger from '../utils/logger';
import { DatabaseError } from '../utils/customErrors';
import { ErrorCode } from '../models/errors';

/**
 * Database configuration from environment variables
 */
interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

/**
 * Transaction interface for managing database transactions
 */
export interface Transaction {
  client: PoolClient;
  id: string;
}

/**
 * Retry configuration for connection failures
 */
interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Database Connection Pool Manager
 *
 * Provides connection pooling, health checks, and retry logic
 */
export class Database {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private retryConfig: RetryConfig;
  private isConnected = false;

  constructor() {
    // Load configuration from environment variables
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'ticketuser',
      password: process.env.DB_PASSWORD || 'ticketpass',
      database: process.env.DB_NAME || 'support_tickets',
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
    };

    // Retry configuration for transient failures
    this.retryConfig = {
      maxRetries: 3,
      retryDelayMs: 1000,
      backoffMultiplier: 2,
    };
  }

  /**
   * Initialize database connection pool
   *
   * Creates a connection pool with error handling and connection monitoring
   */
  public async connect(): Promise<void> {
    if (this.pool) {
      logger.warn('Database pool already initialized');
      return;
    }

    try {
      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        max: this.config.max,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis,
      };

      this.pool = new Pool(poolConfig);

      // Set up pool error handler for unexpected errors
      this.pool.on('error', (err) => {
        logger.error('Unexpected error on idle client', { error: err.message });
        this.isConnected = false;
      });

      // Set up pool connection event handler
      this.pool.on('connect', () => {
        this.isConnected = true;
      });

      // Test the connection
      const health = await this.healthCheck();
      if (!health.healthy) {
        this.pool = null;
        throw new Error('Database health check failed');
      }

      logger.info('Database connection pool initialized', {
        host: this.config.host,
        database: this.config.database,
        maxConnections: this.config.max,
      });
    } catch (error) {
      logger.error('Failed to initialize database pool', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to connect to database');
    }
  }

  /**
   * Close database connection pool
   *
   * Gracefully closes all connections in the pool
   */
  public async disconnect(): Promise<void> {
    if (!this.pool) {
      logger.warn('Database pool not initialized');
      return;
    }

    try {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database pool', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to close database connection');
    }
  }

  /**
   * Health check endpoint
   *
   * Verifies database connectivity and returns health status
   *
   * @returns Promise<{ healthy: boolean; details: object }>
   */
  public async healthCheck(): Promise<{ healthy: boolean; details: object }> {
    if (!this.pool) {
      return {
        healthy: false,
        details: { error: 'Database pool not initialized' },
      };
    }

    try {
      const start = Date.now();
      const result = await this.pool.query('SELECT NOW() as time, version() as version');
      const duration = Date.now() - start;

      const poolStats = {
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingRequests: this.pool.waitingCount,
      };

      logger.debug('Database health check passed', { duration, poolStats });

      return {
        healthy: true,
        details: {
          responseTime: `${duration}ms`,
          serverTime: result.rows[0].time,
          version: result.rows[0].version.split(',')[0], // Get just the PostgreSQL version
          pool: poolStats,
        },
      };
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Execute a query with automatic retry logic
   *
   * Retries transient connection failures with exponential backoff
   *
   * @param text - SQL query text
   * @param params - Query parameters
   * @returns Promise<QueryResult>
   */
  public async query(text: string, params?: any[]): Promise<QueryResult> {
    if (!this.pool) {
      throw new DatabaseError('Database pool not initialized');
    }

    let lastError: Error | null = null;
    let delay = this.retryConfig.retryDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.pool.query(text, params);

        // Log successful retry if this wasn't the first attempt
        if (attempt > 0) {
          logger.info('Query succeeded after retry', { attempt });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Check if error is transient (connection-related)
        const isTransient = this.isTransientError(lastError);

        logger.warn('Query failed', {
          attempt: attempt + 1,
          maxRetries: this.retryConfig.maxRetries + 1,
          isTransient,
          error: lastError.message,
        });

        // Don't retry if error is not transient
        if (!isTransient) {
          break;
        }

        // Don't retry if this was the last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Wait before retrying with exponential backoff
        await this.sleep(delay);
        delay *= this.retryConfig.backoffMultiplier;
      }
    }

    // All retries exhausted
    logger.error('Query failed after all retries', {
      error: lastError?.message,
      maxRetries: this.retryConfig.maxRetries,
    });

    throw new DatabaseError('Database operation failed after retries', ErrorCode.DATABASE_ERROR);
  }

  /**
   * Begin a database transaction
   *
   * Acquires a client from the pool and starts a transaction
   *
   * @returns Promise<Transaction>
   */
  public async beginTransaction(): Promise<Transaction> {
    if (!this.pool) {
      throw new DatabaseError('Database pool not initialized');
    }

    try {
      const client = await this.pool.connect();
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      await client.query('BEGIN');

      logger.debug('Transaction started', { transactionId });

      return {
        client,
        id: transactionId,
      };
    } catch (error) {
      logger.error('Failed to begin transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to begin transaction');
    }
  }

  /**
   * Commit a database transaction
   *
   * Commits the transaction and releases the client back to the pool
   *
   * @param transaction - Transaction to commit
   */
  public async commitTransaction(transaction: Transaction): Promise<void> {
    try {
      await transaction.client.query('COMMIT');
      logger.debug('Transaction committed', { transactionId: transaction.id });
    } catch (error) {
      logger.error('Failed to commit transaction', {
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to commit transaction');
    } finally {
      transaction.client.release();
    }
  }

  /**
   * Rollback a database transaction
   *
   * Rolls back the transaction and releases the client back to the pool
   *
   * @param transaction - Transaction to rollback
   */
  public async rollbackTransaction(transaction: Transaction): Promise<void> {
    try {
      await transaction.client.query('ROLLBACK');
      logger.debug('Transaction rolled back', { transactionId: transaction.id });
    } catch (error) {
      logger.error('Failed to rollback transaction', {
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw here - rollback failures are already in error state
    } finally {
      transaction.client.release();
    }
  }

  /**
   * Execute query within a transaction context
   *
   * @param transaction - Active transaction
   * @param text - SQL query text
   * @param params - Query parameters
   * @returns Promise<QueryResult>
   */
  public async queryInTransaction(
    transaction: Transaction,
    text: string,
    params?: any[]
  ): Promise<QueryResult> {
    try {
      return await transaction.client.query(text, params);
    } catch (error) {
      logger.error('Query failed in transaction', {
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Transaction query failed');
    }
  }

  /**
   * Get connection pool status
   *
   * @returns Pool statistics
   */
  public getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingRequests: this.pool.waitingCount,
    };
  }

  /**
   * Check if database is connected
   *
   * @returns boolean
   */
  public isHealthy(): boolean {
    return this.isConnected && this.pool !== null;
  }

  /**
   * Determine if an error is transient (temporary) or permanent
   *
   * @param error - Error to check
   * @returns boolean - true if error is transient
   */
  private isTransientError(error: Error): boolean {
    const transientErrorCodes = [
      'ECONNREFUSED', // Connection refused
      'ETIMEDOUT', // Connection timeout
      'ENOTFOUND', // DNS lookup failed
      'ECONNRESET', // Connection reset
      'EPIPE', // Broken pipe
      '57P03', // PostgreSQL: cannot connect now
      '53300', // PostgreSQL: too many connections
      '08006', // PostgreSQL: connection failure
      '08001', // PostgreSQL: unable to establish connection
      '08004', // PostgreSQL: connection rejected
    ];

    const errorCode = (error as any).code;
    return transientErrorCodes.includes(errorCode);
  }

  /**
   * Sleep utility for retry delays
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const database = new Database();
