/**
 * Database Connection Tests
 * 
 * Tests database connection pooling, health checks, retry logic,
 * and transaction support.
 */

import { Database } from './database';
import { Pool } from 'pg';

// Mock pg module
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0,
  };

  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe('Database Connection', () => {
  let db: Database;
  let mockPool: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create new database instance
    db = new Database();

    // Get mock pool instance
    const PoolConstructor = Pool as jest.MockedClass<typeof Pool>;
    mockPool = new PoolConstructor();
  });

  afterEach(async () => {
    // Clean up connections
    try {
      await db.disconnect();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('connect', () => {
    it('should initialize connection pool successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ time: new Date(), version: 'PostgreSQL 14.0' }],
      });

      await db.connect();

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: expect.any(String),
          port: expect.any(Number),
          user: expect.any(String),
          password: expect.any(String),
          database: expect.any(String),
        })
      );

      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should throw error if connection fails', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(db.connect()).rejects.toThrow('Failed to connect to database');
    });

    it('should warn if already connected', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ time: new Date(), version: 'PostgreSQL 14.0' }],
      });

      await db.connect();
      
      // Clear mock to not count the health check from first connect
      jest.clearAllMocks();
      
      await db.connect(); // Second call should warn

      // Should not create a new pool
      expect(Pool).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should close connection pool successfully', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ time: new Date(), version: 'PostgreSQL 14.0' }],
      });
      mockPool.end.mockResolvedValue(undefined);

      await db.connect();
      await db.disconnect();

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle disconnect errors', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ time: new Date(), version: 'PostgreSQL 14.0' }],
      });
      mockPool.end.mockRejectedValue(new Error('Disconnect failed'));

      await db.connect();

      await expect(db.disconnect()).rejects.toThrow('Failed to close database connection');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when database is accessible', async () => {
      const mockTime = new Date();
      mockPool.query.mockResolvedValue({
        rows: [{ time: mockTime, version: 'PostgreSQL 14.0, compiled by xyz' }],
      });

      await db.connect();
      const health = await db.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.details).toHaveProperty('responseTime');
      expect(health.details).toHaveProperty('serverTime');
      expect(health.details).toHaveProperty('version');
      expect(health.details).toHaveProperty('pool');
    });

    it('should return unhealthy status when database is not accessible', async () => {
      // Set up pool first
      mockPool.query.mockResolvedValueOnce({
        rows: [{ time: new Date(), version: 'PostgreSQL 14.0' }],
      });
      await db.connect();
      
      // Now make the health check fail
      mockPool.query.mockRejectedValueOnce(new Error('Connection timeout'));

      const health = await db.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.details).toHaveProperty('error');
    });

    it('should return unhealthy if pool is not initialized', async () => {
      const health = await db.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.details).toEqual({ error: 'Database pool not initialized' });
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ time: new Date(), version: 'PostgreSQL 14.0' }],
      });
      await db.connect();
      // Clear mocks after connect to have clean counts
      jest.clearAllMocks();
    });

    it('should execute query successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: '123', title: 'Test' }],
        rowCount: 1,
      });

      const result = await db.query('SELECT * FROM tickets WHERE id = $1', ['123']);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual({ id: '123', title: 'Test' });
    });

    it('should throw error if pool is not initialized', async () => {
      // Don't connect, just try to query
      const uninitializedDb = new Database();

      await expect(uninitializedDb.query('SELECT 1')).rejects.toThrow(
        'Database pool not initialized'
      );
    });

    it('should retry on transient errors', async () => {
      const transientError = new Error('Connection reset');
      (transientError as any).code = 'ECONNRESET';

      mockPool.query
        .mockRejectedValueOnce(transientError)
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce({ rows: [{ result: 'success' }], rowCount: 1 });

      const result = await db.query('SELECT 1');

      expect(result.rows[0]).toEqual({ result: 'success' });
      // Should attempt 3 times (initial + 2 retries)
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-transient errors', async () => {
      const syntaxError = new Error('Syntax error');
      (syntaxError as any).code = '42601'; // PostgreSQL syntax error

      mockPool.query.mockRejectedValue(syntaxError);

      await expect(db.query('SELECT invalid')).rejects.toThrow(
        'Database operation failed after retries'
      );

      // Should only attempt once (no retries)
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exhausted', async () => {
      const transientError = new Error('Connection refused');
      (transientError as any).code = 'ECONNREFUSED';

      mockPool.query.mockRejectedValue(transientError);

      await expect(db.query('SELECT 1')).rejects.toThrow(
        'Database operation failed after retries'
      );

      // Should attempt 4 times (initial + 3 retries)
      expect(mockPool.query).toHaveBeenCalledTimes(4);
    });
  });

  describe('transactions', () => {
    let mockClient: any;

    beforeEach(async () => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.query.mockResolvedValue({
        rows: [{ time: new Date(), version: 'PostgreSQL 14.0' }],
      });
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await db.connect();
    });

    it('should begin transaction successfully', async () => {
      const tx = await db.beginTransaction();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(tx).toHaveProperty('client');
      expect(tx).toHaveProperty('id');
    });

    it('should commit transaction successfully', async () => {
      const tx = await db.beginTransaction();
      await db.commitTransaction(tx);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction successfully', async () => {
      const tx = await db.beginTransaction();
      await db.rollbackTransaction(tx);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even if commit fails', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('Commit failed'));

      const tx = await db.beginTransaction();

      await expect(db.commitTransaction(tx)).rejects.toThrow('Failed to commit transaction');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should execute query in transaction', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: '123' }],
        rowCount: 1,
      }); // Actual query

      const tx = await db.beginTransaction();
      const result = await db.queryInTransaction(tx, 'INSERT INTO tickets VALUES ($1)', [
        '123',
      ]);

      expect(result.rows[0]).toEqual({ id: '123' });
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO tickets VALUES ($1)',
        ['123']
      );
    });
  });

  describe('getPoolStats', () => {
    it('should return pool statistics', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ time: new Date(), version: 'PostgreSQL 14.0' }],
      });

      await db.connect();
      const stats = db.getPoolStats();

      expect(stats).toEqual({
        totalConnections: 10,
        idleConnections: 5,
        waitingRequests: 0,
      });
    });

    it('should return null if pool not initialized', () => {
      const stats = db.getPoolStats();
      expect(stats).toBeNull();
    });
  });

  describe('isHealthy', () => {
    it('should return true when connected', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ time: new Date(), version: 'PostgreSQL 14.0' }],
      });

      await db.connect();

      // Manually set connected flag
      const connectCall = mockPool.on.mock.calls.find((call: any) => call[0] === 'connect');
      if (connectCall && connectCall[1]) {
        connectCall[1]();
      }

      expect(db.isHealthy()).toBe(true);
    });

    it('should return false when not connected', () => {
      expect(db.isHealthy()).toBe(false);
    });
  });
});
