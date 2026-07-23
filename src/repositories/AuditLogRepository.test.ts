/**
 * Audit Log Repository Unit Tests
 *
 * Tests for the AuditLogRepository class.
 *
 * Task: 2.6 Implement Audit Log Repository
 */

import { AuditLogRepository } from './AuditLogRepository';
import { database } from './database';
import logger from '../utils/logger';
import { DatabaseError } from '../utils/customErrors';

// Mock dependencies
jest.mock('./database');
jest.mock('../utils/logger');

describe('AuditLogRepository', () => {
  let auditLogRepository: AuditLogRepository;

  beforeEach(() => {
    auditLogRepository = new AuditLogRepository();
    jest.clearAllMocks();
  });

  describe('insertAuditEntry', () => {
    it('should insert audit entry successfully without transaction', async () => {
      const mockResult = {
        rows: [{ id: 'audit-id-1', created_at: new Date() }],
        rowCount: 1,
      };

      (database.query as jest.Mock).mockResolvedValue(mockResult);

      const entry = {
        ticketId: 'ticket-123',
        operation: 'CREATE',
        userId: 'user@example.com',
      };

      await auditLogRepository.insertAuditEntry(entry);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_log'),
        [entry.ticketId, entry.operation, entry.userId, null, null, null]
      );

      expect(logger.debug).toHaveBeenCalledWith('Audit entry inserted', {
        auditId: 'audit-id-1',
        ticketId: entry.ticketId,
        operation: entry.operation,
        userId: entry.userId,
      });
    });

    it('should insert audit entry successfully with transaction', async () => {
      const mockResult = {
        rows: [{ id: 'audit-id-2', created_at: new Date() }],
        rowCount: 1,
      };

      const mockTransaction = { client: {} };
      (database.queryInTransaction as jest.Mock).mockResolvedValue(mockResult);

      const entry = {
        ticketId: 'ticket-456',
        operation: 'STATE_TRANSITION',
        userId: 'admin@example.com',
        oldState: 'Open',
        newState: 'In_Progress',
      };

      await auditLogRepository.insertAuditEntry(entry, mockTransaction as any);

      expect(database.queryInTransaction).toHaveBeenCalledWith(
        mockTransaction,
        expect.stringContaining('INSERT INTO audit_log'),
        [entry.ticketId, entry.operation, entry.userId, entry.oldState, entry.newState, null]
      );

      expect(logger.debug).toHaveBeenCalledWith('Audit entry inserted', {
        auditId: 'audit-id-2',
        ticketId: entry.ticketId,
        operation: entry.operation,
        userId: entry.userId,
      });
    });

    it('should insert audit entry with changes object', async () => {
      const mockResult = {
        rows: [{ id: 'audit-id-3', created_at: new Date() }],
        rowCount: 1,
      };

      (database.query as jest.Mock).mockResolvedValue(mockResult);

      const entry = {
        ticketId: 'ticket-789',
        operation: 'UPDATE',
        userId: 'user@example.com',
        changes: { title: 'New Title', priority: 'High' },
      };

      await auditLogRepository.insertAuditEntry(entry);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_log'),
        [
          entry.ticketId,
          entry.operation,
          entry.userId,
          null,
          null,
          JSON.stringify(entry.changes),
        ]
      );
    });

    it('should not throw error when insert fails (non-blocking)', async () => {
      (database.query as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const entry = {
        ticketId: 'ticket-999',
        operation: 'CREATE',
        userId: 'user@example.com',
      };

      // Should not throw
      await expect(auditLogRepository.insertAuditEntry(entry)).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith('Failed to insert audit entry', {
        ticketId: entry.ticketId,
        operation: entry.operation,
        error: 'Database connection failed',
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Continuing despite audit log failure - operation will proceed'
      );
    });
  });

  describe('getAuditEntriesByTicketId', () => {
    it('should retrieve audit entries for a ticket', async () => {
      const mockRows = [
        {
          id: 'audit-1',
          ticket_id: 'ticket-123',
          operation: 'CREATE',
          user_id: 'user1@example.com',
          old_state: null,
          new_state: null,
          changes: null,
          created_at: new Date('2024-01-01'),
        },
        {
          id: 'audit-2',
          ticket_id: 'ticket-123',
          operation: 'STATE_TRANSITION',
          user_id: 'user2@example.com',
          old_state: 'Open',
          new_state: 'In_Progress',
          changes: null,
          created_at: new Date('2024-01-02'),
        },
      ];

      (database.query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const result = await auditLogRepository.getAuditEntriesByTicketId('ticket-123');

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, ticket_id, operation'),
        ['ticket-123']
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'audit-1',
        ticketId: 'ticket-123',
        operation: 'CREATE',
        userId: 'user1@example.com',
        oldState: undefined,
        newState: undefined,
        changes: undefined,
        createdAt: mockRows[0]!.created_at,
      });

      expect(logger.debug).toHaveBeenCalledWith('Retrieved audit entries', {
        ticketId: 'ticket-123',
        count: 2,
      });
    });

    it('should return empty array when no audit entries exist', async () => {
      (database.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await auditLogRepository.getAuditEntriesByTicketId('ticket-404');

      expect(result).toEqual([]);
      expect(logger.debug).toHaveBeenCalledWith('Retrieved audit entries', {
        ticketId: 'ticket-404',
        count: 0,
      });
    });

    it('should handle audit entries with all fields populated', async () => {
      const mockRows = [
        {
          id: 'audit-complete',
          ticket_id: 'ticket-456',
          operation: 'UPDATE',
          user_id: 'admin@example.com',
          old_state: 'Open',
          new_state: 'In_Progress',
          changes: { title: 'Updated Title', priority: 'High' },
          created_at: new Date('2024-01-03'),
        },
      ];

      (database.query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const result = await auditLogRepository.getAuditEntriesByTicketId('ticket-456');

      expect(result[0]).toEqual({
        id: 'audit-complete',
        ticketId: 'ticket-456',
        operation: 'UPDATE',
        userId: 'admin@example.com',
        oldState: 'Open',
        newState: 'In_Progress',
        changes: { title: 'Updated Title', priority: 'High' },
        createdAt: mockRows[0]!.created_at,
      });
    });

    it('should throw DatabaseError when query fails', async () => {
      (database.query as jest.Mock).mockRejectedValue(new Error('Connection lost'));

      await expect(
        auditLogRepository.getAuditEntriesByTicketId('ticket-error')
      ).rejects.toThrow(DatabaseError);

      await expect(
        auditLogRepository.getAuditEntriesByTicketId('ticket-error')
      ).rejects.toThrow('Failed to retrieve audit log for ticket ticket-error');

      expect(logger.error).toHaveBeenCalledWith('Failed to get audit entries', {
        ticketId: 'ticket-error',
        error: 'Connection lost',
      });
    });
  });

  describe('getAuditEntriesByUserId', () => {
    it('should retrieve audit entries for a user', async () => {
      const mockRows = [
        {
          id: 'audit-1',
          ticket_id: 'ticket-123',
          operation: 'CREATE',
          user_id: 'user@example.com',
          old_state: null,
          new_state: null,
          changes: null,
          created_at: new Date('2024-01-01'),
        },
        {
          id: 'audit-2',
          ticket_id: 'ticket-456',
          operation: 'UPDATE',
          user_id: 'user@example.com',
          old_state: null,
          new_state: null,
          changes: { title: 'New Title' },
          created_at: new Date('2024-01-02'),
        },
      ];

      (database.query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const result = await auditLogRepository.getAuditEntriesByUserId('user@example.com');

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user@example.com']
      );

      expect(result).toHaveLength(2);
      expect(result[0]!.userId).toBe('user@example.com');
      expect(result[1]!.userId).toBe('user@example.com');

      expect(logger.debug).toHaveBeenCalledWith('Retrieved audit entries for user', {
        userId: 'user@example.com',
        count: 2,
      });
    });

    it('should throw DatabaseError when query fails', async () => {
      (database.query as jest.Mock).mockRejectedValue(new Error('Connection lost'));

      await expect(auditLogRepository.getAuditEntriesByUserId('user@example.com')).rejects.toThrow(
        DatabaseError
      );

      expect(logger.error).toHaveBeenCalledWith('Failed to get audit entries for user', {
        userId: 'user@example.com',
        error: 'Connection lost',
      });
    });
  });

  describe('getAuditEntriesByOperation', () => {
    it('should retrieve audit entries by operation type', async () => {
      const mockRows = [
        {
          id: 'audit-1',
          ticket_id: 'ticket-123',
          operation: 'STATE_TRANSITION',
          user_id: 'user1@example.com',
          old_state: 'Open',
          new_state: 'In_Progress',
          changes: null,
          created_at: new Date('2024-01-01'),
        },
        {
          id: 'audit-2',
          ticket_id: 'ticket-456',
          operation: 'STATE_TRANSITION',
          user_id: 'user2@example.com',
          old_state: 'In_Progress',
          new_state: 'Resolved',
          changes: null,
          created_at: new Date('2024-01-02'),
        },
      ];

      (database.query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const result = await auditLogRepository.getAuditEntriesByOperation('STATE_TRANSITION');

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE operation = $1'),
        ['STATE_TRANSITION']
      );

      expect(result).toHaveLength(2);
      expect(result[0]!.operation).toBe('STATE_TRANSITION');
      expect(result[1]!.operation).toBe('STATE_TRANSITION');

      expect(logger.debug).toHaveBeenCalledWith('Retrieved audit entries by operation', {
        operation: 'STATE_TRANSITION',
        count: 2,
      });
    });

    it('should throw DatabaseError when query fails', async () => {
      (database.query as jest.Mock).mockRejectedValue(new Error('Connection lost'));

      await expect(auditLogRepository.getAuditEntriesByOperation('CREATE')).rejects.toThrow(
        DatabaseError
      );

      expect(logger.error).toHaveBeenCalledWith('Failed to get audit entries by operation', {
        operation: 'CREATE',
        error: 'Connection lost',
      });
    });
  });
});
