/**
 * Ticket Repository Tests
 *
 * Unit tests for TicketRepository CRUD operations, full-text search,
 * and state filtering functionality.
 */

import { TicketRepository } from './TicketRepository';
import { database, Transaction } from './database';
import { Priority, TicketState } from '../models/ticket';
import { DatabaseError, NotFoundError } from '../utils/customErrors';
import { ErrorCode } from '../models/errors';

// Mock database module
jest.mock('./database', () => ({
  database: {
    query: jest.fn(),
    queryInTransaction: jest.fn(),
    beginTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
  },
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('TicketRepository', () => {
  let repository: TicketRepository;
  const mockDatabase = database as jest.Mocked<typeof database>;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new TicketRepository();
  });

  describe('insertTicket', () => {
    it('should insert ticket with UUID generation successfully', async () => {
      const mockTicket = {
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
      };

      const mockResult = {
        rows: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: mockTicket.title,
            description: mockTicket.description,
            priority: mockTicket.priority,
            state: mockTicket.state,
            assignee: mockTicket.assignee,
            created_at: new Date('2024-01-15T10:00:00Z'),
            updated_at: new Date('2024-01-15T10:00:00Z'),
          },
        ],
        rowCount: 1,
      };

      mockDatabase.query.mockResolvedValueOnce(mockResult as any);

      const result = await repository.insertTicket(mockTicket);

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: mockTicket.title,
        description: mockTicket.description,
        priority: mockTicket.priority,
        state: mockTicket.state,
        assignee: mockTicket.assignee,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
      });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tickets'),
        expect.arrayContaining([
          mockTicket.title,
          mockTicket.description,
          mockTicket.priority,
          mockTicket.state,
          mockTicket.assignee,
        ])
      );
    });

    it('should insert ticket within transaction context', async () => {
      const mockTransaction: Transaction = {
        client: {} as any,
        id: 'tx_123',
      };

      const mockTicket = {
        title: 'Transaction Test',
        description: 'Testing transaction support',
        priority: Priority.Low,
        state: TicketState.Open,
        assignee: null,
      };

      const mockResult = {
        rows: [
          {
            id: '456',
            ...mockTicket,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      };

      mockDatabase.queryInTransaction.mockResolvedValueOnce(mockResult as any);

      await repository.insertTicket(mockTicket, mockTransaction);

      expect(mockDatabase.queryInTransaction).toHaveBeenCalledWith(
        mockTransaction,
        expect.stringContaining('INSERT INTO tickets'),
        expect.any(Array)
      );
      expect(mockDatabase.query).not.toHaveBeenCalled();
    });

    it('should throw DatabaseError with proper error code on insert failure', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Insert failed'));

      const mockTicket = {
        title: 'Test',
        description: 'Desc',
        priority: Priority.Low,
        state: TicketState.Open,
        assignee: null,
      };

      await expect(repository.insertTicket(mockTicket)).rejects.toThrow(DatabaseError);
      await expect(repository.insertTicket(mockTicket)).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.DATABASE_ERROR,
        })
      );
    });

    it('should handle ticket with assignee', async () => {
      const mockTicket = {
        title: 'Assigned Ticket',
        description: 'Already assigned',
        priority: Priority.Critical,
        state: TicketState.InProgress,
        assignee: 'user@example.com',
      };

      const mockResult = {
        rows: [
          {
            id: '789',
            ...mockTicket,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      };

      mockDatabase.query.mockResolvedValueOnce(mockResult as any);

      const result = await repository.insertTicket(mockTicket);

      expect(result.assignee).toBe('user@example.com');
    });
  });

  describe('findTicketById', () => {
    it('should return ticket when found with proper error handling', async () => {
      const mockTicket = {
        id: '123',
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockDatabase.query.mockResolvedValueOnce({
        rows: [mockTicket],
        rowCount: 1,
      } as any);

      const result = await repository.findTicketById('123');

      expect(result).toEqual({
        id: mockTicket.id,
        title: mockTicket.title,
        description: mockTicket.description,
        priority: mockTicket.priority,
        state: mockTicket.state,
        assignee: mockTicket.assignee,
        createdAt: mockTicket.created_at,
        updatedAt: mockTicket.updated_at,
      });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['123']
      );
    });

    it('should return null when ticket not found', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findTicketById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should throw DatabaseError on query failure', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(repository.findTicketById('123')).rejects.toThrow(DatabaseError);
      await expect(repository.findTicketById('123')).rejects.toThrow(
        'Failed to retrieve ticket'
      );
    });

    it('should handle various ticket states', async () => {
      const states: TicketState[] = [
        TicketState.Open,
        TicketState.InProgress,
        TicketState.Resolved,
        TicketState.Closed,
        TicketState.Cancelled,
      ];

      for (const state of states) {
        mockDatabase.query.mockResolvedValueOnce({
          rows: [
            {
              id: '123',
              title: 'Test',
              description: 'Desc',
              priority: Priority.Medium,
              state: state,
              assignee: null,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        } as any);

        const result = await repository.findTicketById('123');
        expect(result?.state).toBe(state);
      }
    });
  });

  describe('findAllTickets', () => {
    it('should return all tickets with consistent ordering (most recent first)', async () => {
      const mockTickets = [
        {
          id: '2',
          title: 'Newer Ticket',
          description: 'Created later',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: null,
          created_at: new Date('2024-01-15T12:00:00Z'),
          updated_at: new Date('2024-01-15T12:00:00Z'),
        },
        {
          id: '1',
          title: 'Older Ticket',
          description: 'Created earlier',
          priority: Priority.Low,
          state: TicketState.Closed,
          assignee: 'user1',
          created_at: new Date('2024-01-15T10:00:00Z'),
          updated_at: new Date('2024-01-15T10:00:00Z'),
        },
      ];

      mockDatabase.query.mockResolvedValueOnce({
        rows: mockTickets,
        rowCount: 2,
      } as any);

      const result = await repository.findAllTickets();

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('2'); // Most recent first
      expect(result[1]?.id).toBe('1');
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC')
      );
    });

    it('should return empty array when no tickets exist', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findAllTickets();

      expect(result).toEqual([]);
    });

    it('should throw DatabaseError on query failure', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(repository.findAllTickets()).rejects.toThrow(DatabaseError);
    });

    it('should return tickets with all priority levels', async () => {
      const mockTickets = [
        {
          id: '1',
          title: 'Critical Issue',
          description: 'Urgent',
          priority: Priority.Critical,
          state: TicketState.Open,
          assignee: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          title: 'High Priority',
          description: 'Important',
          priority: Priority.High,
          state: TicketState.InProgress,
          assignee: 'user1',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '3',
          title: 'Medium Priority',
          description: 'Normal',
          priority: Priority.Medium,
          state: TicketState.Resolved,
          assignee: 'user2',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '4',
          title: 'Low Priority',
          description: 'Can wait',
          priority: Priority.Low,
          state: TicketState.Closed,
          assignee: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDatabase.query.mockResolvedValueOnce({
        rows: mockTickets,
        rowCount: 4,
      } as any);

      const result = await repository.findAllTickets();

      expect(result).toHaveLength(4);
      expect(result.map((t) => t.priority)).toEqual([
        Priority.Critical,
        Priority.High,
        Priority.Medium,
        Priority.Low,
      ]);
    });
  });

  describe('updateTicket', () => {
    it('should update ticket preserving unmodified fields', async () => {
      const updates = {
        title: 'Updated Title',
        priority: Priority.Critical,
      };

      mockDatabase.query.mockResolvedValueOnce({
        rowCount: 1,
      } as any);

      await repository.updateTicket('123', updates);

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tickets'),
        expect.arrayContaining(['Updated Title', Priority.Critical, '123'])
      );
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
        expect.any(Array)
      );
    });

    it('should throw NotFoundError if ticket does not exist', async () => {
      mockDatabase.query.mockResolvedValue({
        rowCount: 0,
      } as any);

      await expect(repository.updateTicket('non-existent', { title: 'New' })).rejects.toThrow(
        NotFoundError
      );
      
      try {
        await repository.updateTicket('non-existent-2', { title: 'New' });
        fail('Should have thrown NotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).code).toBe(ErrorCode.TICKET_NOT_FOUND);
      }
    });

    it('should handle empty update gracefully', async () => {
      await repository.updateTicket('123', {});

      expect(mockDatabase.query).not.toHaveBeenCalled();
    });

    it('should update within transaction context', async () => {
      const mockTransaction: Transaction = {
        client: {} as any,
        id: 'tx_456',
      };

      mockDatabase.queryInTransaction.mockResolvedValueOnce({
        rowCount: 1,
      } as any);

      await repository.updateTicket(
        '123',
        { state: TicketState.InProgress },
        mockTransaction
      );

      expect(mockDatabase.queryInTransaction).toHaveBeenCalledWith(
        mockTransaction,
        expect.stringContaining('UPDATE tickets'),
        expect.any(Array)
      );
      expect(mockDatabase.query).not.toHaveBeenCalled();
    });

    it('should support updating all modifiable fields', async () => {
      const updates = {
        title: 'New Title',
        description: 'New Description',
        priority: Priority.High,
        state: TicketState.Resolved,
        assignee: 'newuser@example.com',
      };

      mockDatabase.query.mockResolvedValueOnce({
        rowCount: 1,
      } as any);

      await repository.updateTicket('123', updates);

      const callArgs = mockDatabase.query.mock.calls[0];
      expect(callArgs?.[0]).toContain('title = $1');
      expect(callArgs?.[0]).toContain('description = $2');
      expect(callArgs?.[0]).toContain('priority = $3');
      expect(callArgs?.[0]).toContain('state = $4');
      expect(callArgs?.[0]).toContain('assignee = $5');
    });

    it('should support unassigning ticket', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rowCount: 1,
      } as any);

      await repository.updateTicket('123', { assignee: null });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('assignee = $1'),
        expect.arrayContaining([null, '123'])
      );
    });

    it('should throw DatabaseError on update failure', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Constraint violation'));

      await expect(
        repository.updateTicket('123', { title: 'New Title' })
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('searchTickets', () => {
    it('should search tickets using PostgreSQL full-text search', async () => {
      const mockTickets = [
        {
          id: '1',
          title: 'Login Issue',
          description: 'Cannot login to the system',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          title: 'Password Reset',
          description: 'Need to reset login credentials',
          priority: Priority.Medium,
          state: TicketState.InProgress,
          assignee: 'support@example.com',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDatabase.query.mockResolvedValueOnce({
        rows: mockTickets,
        rowCount: 2,
      } as any);

      const result = await repository.searchTickets('login');

      expect(result).toHaveLength(2);
      expect(result[0]?.title).toBe('Login Issue');
      expect(result[1]?.title).toBe('Password Reset');
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('to_tsvector'),
        ['login']
      );
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('plainto_tsquery'),
        ['login']
      );
    });

    it('should return empty array when no matches found', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.searchTickets('nonexistent');

      expect(result).toEqual([]);
    });

    it('should search across both title and description fields', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await repository.searchTickets('keyword');

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining("title || ' ' || description"),
        ['keyword']
      );
    });

    it('should throw DatabaseError on search failure', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Full-text search error'));

      await expect(repository.searchTickets('test')).rejects.toThrow(DatabaseError);
      await expect(repository.searchTickets('test')).rejects.toThrow(
        'Failed to search tickets'
      );
    });

    it('should return results ordered by creation date', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await repository.searchTickets('test');

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });
  });

  describe('filterTicketsByState', () => {
    it('should filter tickets by state with state validation', async () => {
      const mockTickets = [
        {
          id: '1',
          title: 'Open Ticket 1',
          description: 'First open ticket',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          title: 'Open Ticket 2',
          description: 'Second open ticket',
          priority: Priority.Medium,
          state: TicketState.Open,
          assignee: 'user1',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDatabase.query.mockResolvedValueOnce({
        rows: mockTickets,
        rowCount: 2,
      } as any);

      const result = await repository.filterTicketsByState(TicketState.Open);

      expect(result).toHaveLength(2);
      expect(result[0]?.state).toBe(TicketState.Open);
      expect(result[1]?.state).toBe(TicketState.Open);
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE state = $1'),
        [TicketState.Open]
      );
    });

    it('should return empty array when no tickets match state', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.filterTicketsByState(TicketState.Cancelled);

      expect(result).toEqual([]);
    });

    it('should filter by all valid states', async () => {
      const states: TicketState[] = [
        TicketState.Open,
        TicketState.InProgress,
        TicketState.Resolved,
        TicketState.Closed,
        TicketState.Cancelled,
      ];

      for (const state of states) {
        mockDatabase.query.mockResolvedValueOnce({
          rows: [
            {
              id: '1',
              title: 'Test',
              description: 'Desc',
              priority: Priority.Low,
              state: state,
              assignee: null,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        } as any);

        const result = await repository.filterTicketsByState(state);
        expect(result[0]?.state).toBe(state);
      }
    });

    it('should throw DatabaseError on filter failure', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Query failed'));

      await expect(repository.filterTicketsByState(TicketState.Open)).rejects.toThrow(
        DatabaseError
      );
    });

    it('should return results ordered by creation date', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await repository.filterTicketsByState(TicketState.InProgress);

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });
  });
});
