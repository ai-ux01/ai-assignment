/**
 * Base Repository Tests
 * 
 * Tests DataStore implementation for ticket and comment operations
 */

import { BaseRepository } from './BaseRepository';
import { database, Transaction } from './database';
import { DatabaseError, NotFoundError } from '../utils/customErrors';

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

describe('BaseRepository', () => {
  let repository: BaseRepository;
  const mockDatabase = database as jest.Mocked<typeof database>;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new BaseRepository();
  });

  describe('insertTicket', () => {
    it('should insert ticket successfully', async () => {
      const mockTicket = {
        title: 'Test Ticket',
        description: 'Test Description',
        priority: 'High' as const,
        state: 'Open' as const,
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

    it('should insert ticket within transaction', async () => {
      const mockTransaction: Transaction = {
        client: {} as any,
        id: 'tx_123',
      };

      const mockTicket = {
        title: 'Test',
        description: 'Desc',
        priority: 'Low' as const,
        state: 'Open' as const,
        assignee: null,
      };

      mockDatabase.queryInTransaction.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            ...mockTicket,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      await repository.insertTicket(mockTicket, mockTransaction);

      expect(mockDatabase.queryInTransaction).toHaveBeenCalledWith(
        mockTransaction,
        expect.stringContaining('INSERT INTO tickets'),
        expect.any(Array)
      );
      expect(mockDatabase.query).not.toHaveBeenCalled();
    });

    it('should throw DatabaseError on insert failure', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Insert failed'));

      const mockTicket = {
        title: 'Test',
        description: 'Desc',
        priority: 'Low' as const,
        state: 'Open' as const,
        assignee: null,
      };

      await expect(repository.insertTicket(mockTicket)).rejects.toThrow(DatabaseError);
    });
  });

  describe('updateTicket', () => {
    it('should update ticket successfully', async () => {
      const updates = {
        title: 'Updated Title',
        priority: 'Critical' as const,
      };

      mockDatabase.query.mockResolvedValueOnce({
        rowCount: 1,
      } as any);

      await repository.updateTicket('123', updates);

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tickets'),
        expect.arrayContaining(['Updated Title', 'Critical', '123'])
      );
    });

    it('should throw NotFoundError if ticket does not exist', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rowCount: 0,
      } as any);

      await expect(repository.updateTicket('999', { title: 'New' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should handle empty update gracefully', async () => {
      await repository.updateTicket('123', {});

      expect(mockDatabase.query).not.toHaveBeenCalled();
    });

    it('should update with transaction', async () => {
      const mockTransaction: Transaction = {
        client: {} as any,
        id: 'tx_123',
      };

      mockDatabase.queryInTransaction.mockResolvedValueOnce({
        rowCount: 1,
      } as any);

      await repository.updateTicket('123', { state: 'In_Progress' }, mockTransaction);

      expect(mockDatabase.queryInTransaction).toHaveBeenCalled();
    });
  });

  describe('findTicketById', () => {
    it('should return ticket when found', async () => {
      const mockTicket = {
        id: '123',
        title: 'Test',
        description: 'Desc',
        priority: 'High',
        state: 'Open',
        assignee: null,
        created_at: new Date(),
        updated_at: new Date(),
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
    });

    it('should return null when ticket not found', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findTicketById('999');

      expect(result).toBeNull();
    });

    it('should throw DatabaseError on query failure', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Query failed'));

      await expect(repository.findTicketById('123')).rejects.toThrow(DatabaseError);
    });
  });

  describe('findAllTickets', () => {
    it('should return all tickets', async () => {
      const mockTickets = [
        {
          id: '1',
          title: 'Ticket 1',
          description: 'Desc 1',
          priority: 'High',
          state: 'Open',
          assignee: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          title: 'Ticket 2',
          description: 'Desc 2',
          priority: 'Low',
          state: 'Closed',
          assignee: 'user1',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDatabase.query.mockResolvedValueOnce({
        rows: mockTickets,
        rowCount: 2,
      } as any);

      const result = await repository.findAllTickets();

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('1');
      expect(result[1]?.id).toBe('2');
    });

    it('should return empty array when no tickets exist', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findAllTickets();

      expect(result).toEqual([]);
    });
  });

  describe('searchTickets', () => {
    it('should search tickets by keyword', async () => {
      const mockTickets = [
        {
          id: '1',
          title: 'Login Issue',
          description: 'Cannot login',
          priority: 'High',
          state: 'Open',
          assignee: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDatabase.query.mockResolvedValueOnce({
        rows: mockTickets,
        rowCount: 1,
      } as any);

      const result = await repository.searchTickets('login');

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Login Issue');
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
  });

  describe('filterTicketsByState', () => {
    it('should filter tickets by state', async () => {
      const mockTickets = [
        {
          id: '1',
          title: 'Open Ticket',
          description: 'Desc',
          priority: 'High',
          state: 'Open',
          assignee: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDatabase.query.mockResolvedValueOnce({
        rows: mockTickets,
        rowCount: 1,
      } as any);

      const result = await repository.filterTicketsByState('Open');

      expect(result).toHaveLength(1);
      expect(result[0]?.state).toBe('Open');
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE state = $1'),
        ['Open']
      );
    });
  });

  describe('insertComment', () => {
    it('should insert comment successfully', async () => {
      const mockComment = {
        ticketId: '123',
        text: 'Test comment',
        author: 'user1',
      };

      mockDatabase.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'comment-123',
            ticket_id: mockComment.ticketId,
            text: mockComment.text,
            author: mockComment.author,
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      const result = await repository.insertComment(mockComment);

      expect(result.ticketId).toBe('123');
      expect(result.text).toBe('Test comment');
      expect(result.author).toBe('user1');
    });

    it('should throw DatabaseError on insert failure', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Foreign key violation'));

      await expect(
        repository.insertComment({
          ticketId: '999',
          text: 'Comment',
          author: 'user1',
        })
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('findCommentsByTicketId', () => {
    it('should return comments in chronological order', async () => {
      const mockComments = [
        {
          id: '1',
          ticket_id: '123',
          text: 'First comment',
          author: 'user1',
          created_at: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: '2',
          ticket_id: '123',
          text: 'Second comment',
          author: 'user2',
          created_at: new Date('2024-01-15T11:00:00Z'),
        },
      ];

      mockDatabase.query.mockResolvedValueOnce({
        rows: mockComments,
        rowCount: 2,
      } as any);

      const result = await repository.findCommentsByTicketId('123');

      expect(result).toHaveLength(2);
      expect(result[0]?.text).toBe('First comment');
      expect(result[1]?.text).toBe('Second comment');
    });
  });

  describe('transaction operations', () => {
    it('should delegate to database for beginTransaction', async () => {
      const mockTransaction: Transaction = {
        client: {} as any,
        id: 'tx_123',
      };

      mockDatabase.beginTransaction.mockResolvedValueOnce(mockTransaction);

      const result = await repository.beginTransaction();

      expect(result).toEqual(mockTransaction);
      expect(mockDatabase.beginTransaction).toHaveBeenCalled();
    });

    it('should delegate to database for commitTransaction', async () => {
      const mockTransaction: Transaction = {
        client: {} as any,
        id: 'tx_123',
      };

      await repository.commitTransaction(mockTransaction);

      expect(mockDatabase.commitTransaction).toHaveBeenCalledWith(mockTransaction);
    });

    it('should delegate to database for rollbackTransaction', async () => {
      const mockTransaction: Transaction = {
        client: {} as any,
        id: 'tx_123',
      };

      await repository.rollbackTransaction(mockTransaction);

      expect(mockDatabase.rollbackTransaction).toHaveBeenCalledWith(mockTransaction);
    });
  });
});
