/**
 * Comment Repository Tests
 *
 * Unit tests for CommentRepository CRUD operations, foreign key validation,
 * and chronological ordering functionality.
 */

import { CommentRepository } from './CommentRepository';
import { database, Transaction } from './database';
import { DatabaseError } from '../utils/customErrors';
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

describe('CommentRepository', () => {
  let repository: CommentRepository;
  const mockDatabase = database as jest.Mocked<typeof database>;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new CommentRepository();
  });

  describe('insertComment', () => {
    it('should insert comment with UUID generation successfully', async () => {
      const mockComment = {
        ticketId: '123e4567-e89b-12d3-a456-426614174000',
        text: 'This is a test comment',
        author: 'user@example.com',
      };

      const mockResult = {
        rows: [
          {
            id: 'comment-123e4567-e89b-12d3-a456-426614174001',
            ticket_id: mockComment.ticketId,
            text: mockComment.text,
            author: mockComment.author,
            created_at: new Date('2024-01-15T10:00:00Z'),
          },
        ],
        rowCount: 1,
      };

      mockDatabase.query.mockResolvedValueOnce(mockResult as any);

      const result = await repository.insertComment(mockComment);

      expect(result).toEqual({
        id: 'comment-123e4567-e89b-12d3-a456-426614174001',
        ticketId: mockComment.ticketId,
        text: mockComment.text,
        author: mockComment.author,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO comments'),
        expect.arrayContaining([mockComment.ticketId, mockComment.text, mockComment.author])
      );
    });

    it('should insert comment within transaction context', async () => {
      const mockTransaction: Transaction = {
        client: {} as any,
        id: 'tx_123',
      };

      const mockComment = {
        ticketId: 'ticket-456',
        text: 'Transaction test comment',
        author: 'user@example.com',
      };

      const mockResult = {
        rows: [
          {
            id: 'comment-456',
            ticket_id: mockComment.ticketId,
            text: mockComment.text,
            author: mockComment.author,
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      };

      mockDatabase.queryInTransaction.mockResolvedValueOnce(mockResult as any);

      await repository.insertComment(mockComment, mockTransaction);

      expect(mockDatabase.queryInTransaction).toHaveBeenCalledWith(
        mockTransaction,
        expect.stringContaining('INSERT INTO comments'),
        expect.any(Array)
      );
      expect(mockDatabase.query).not.toHaveBeenCalled();
    });

    it('should throw DatabaseError when ticket does not exist (foreign key violation)', async () => {
      const mockComment = {
        ticketId: 'non-existent-ticket',
        text: 'Comment on non-existent ticket',
        author: 'user@example.com',
      };

      // Simulate foreign key violation error (PostgreSQL error code 23503)
      const foreignKeyError: any = new Error('Foreign key constraint violation');
      foreignKeyError.code = '23503';

      mockDatabase.query.mockRejectedValueOnce(foreignKeyError);

      try {
        await repository.insertComment(mockComment);
        fail('Should have thrown DatabaseError');
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        expect((error as DatabaseError).code).toBe(ErrorCode.TICKET_NOT_FOUND);
        expect((error as DatabaseError).message).toContain('non-existent-ticket');
      }
    });

    it('should throw DatabaseError with proper error code on generic insert failure', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Insert failed'));

      const mockComment = {
        ticketId: 'ticket-123',
        text: 'Test comment',
        author: 'user@example.com',
      };

      await expect(repository.insertComment(mockComment)).rejects.toThrow(DatabaseError);
      await expect(repository.insertComment(mockComment)).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.DATABASE_ERROR,
        })
      );
    });

    it('should handle long comment text (up to 2000 characters)', async () => {
      const longText = 'A'.repeat(2000);
      const mockComment = {
        ticketId: 'ticket-789',
        text: longText,
        author: 'user@example.com',
      };

      const mockResult = {
        rows: [
          {
            id: 'comment-789',
            ticket_id: mockComment.ticketId,
            text: mockComment.text,
            author: mockComment.author,
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      };

      mockDatabase.query.mockResolvedValueOnce(mockResult as any);

      const result = await repository.insertComment(mockComment);

      expect(result.text).toBe(longText);
      expect(result.text.length).toBe(2000);
    });

    it('should handle various author identifier formats', async () => {
      const authorFormats = [
        'user@example.com', // Email
        'john_doe', // Username
        '123e4567-e89b-12d3-a456-426614174000', // UUID
      ];

      for (const author of authorFormats) {
        const mockComment = {
          ticketId: 'ticket-123',
          text: 'Test comment',
          author: author,
        };

        const mockResult = {
          rows: [
            {
              id: 'comment-' + author,
              ticket_id: mockComment.ticketId,
              text: mockComment.text,
              author: author,
              created_at: new Date(),
            },
          ],
          rowCount: 1,
        };

        mockDatabase.query.mockResolvedValueOnce(mockResult as any);

        const result = await repository.insertComment(mockComment);
        expect(result.author).toBe(author);
      }
    });
  });

  describe('findCommentsByTicketId', () => {
    it('should return comments in chronological order (oldest first)', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          ticket_id: 'ticket-123',
          text: 'First comment',
          author: 'user1@example.com',
          created_at: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 'comment-2',
          ticket_id: 'ticket-123',
          text: 'Second comment',
          author: 'user2@example.com',
          created_at: new Date('2024-01-15T11:00:00Z'),
        },
        {
          id: 'comment-3',
          ticket_id: 'ticket-123',
          text: 'Third comment',
          author: 'user1@example.com',
          created_at: new Date('2024-01-15T12:00:00Z'),
        },
      ];

      mockDatabase.query.mockResolvedValueOnce({
        rows: mockComments,
        rowCount: 3,
      } as any);

      const result = await repository.findCommentsByTicketId('ticket-123');

      expect(result).toHaveLength(3);
      expect(result[0]?.id).toBe('comment-1');
      expect(result[1]?.id).toBe('comment-2');
      expect(result[2]?.id).toBe('comment-3');
      expect(result[0]?.text).toBe('First comment');
      expect(result[2]?.text).toBe('Third comment');
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at ASC'),
        ['ticket-123']
      );
    });

    it('should return empty array when no comments exist for ticket', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findCommentsByTicketId('ticket-no-comments');

      expect(result).toEqual([]);
    });

    it('should throw DatabaseError on query failure', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(repository.findCommentsByTicketId('ticket-123')).rejects.toThrow(
        DatabaseError
      );
      await expect(repository.findCommentsByTicketId('ticket-123')).rejects.toThrow(
        'Failed to retrieve comments'
      );
    });

    it('should correctly map all comment fields', async () => {
      const mockComment = {
        id: 'comment-abc',
        ticket_id: 'ticket-xyz',
        text: 'Detailed comment with information',
        author: 'detailed_user@example.com',
        created_at: new Date('2024-01-15T14:30:00Z'),
      };

      mockDatabase.query.mockResolvedValueOnce({
        rows: [mockComment],
        rowCount: 1,
      } as any);

      const result = await repository.findCommentsByTicketId('ticket-xyz');

      expect(result[0]).toEqual({
        id: 'comment-abc',
        ticketId: 'ticket-xyz',
        text: 'Detailed comment with information',
        author: 'detailed_user@example.com',
        createdAt: new Date('2024-01-15T14:30:00Z'),
      });
    });

    it('should handle multiple comments from same author', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          ticket_id: 'ticket-123',
          text: 'First comment from user',
          author: 'user@example.com',
          created_at: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 'comment-2',
          ticket_id: 'ticket-123',
          text: 'Follow-up comment from same user',
          author: 'user@example.com',
          created_at: new Date('2024-01-15T11:00:00Z'),
        },
      ];

      mockDatabase.query.mockResolvedValueOnce({
        rows: mockComments,
        rowCount: 2,
      } as any);

      const result = await repository.findCommentsByTicketId('ticket-123');

      expect(result).toHaveLength(2);
      expect(result[0]?.author).toBe('user@example.com');
      expect(result[1]?.author).toBe('user@example.com');
      expect(result[0]?.text).toBe('First comment from user');
      expect(result[1]?.text).toBe('Follow-up comment from same user');
    });

    it('should only return comments for specified ticket', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await repository.findCommentsByTicketId('specific-ticket');

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ticket_id = $1'),
        ['specific-ticket']
      );
    });
  });

  describe('findCommentById', () => {
    it('should return comment when found', async () => {
      const mockComment = {
        id: 'comment-123',
        ticket_id: 'ticket-456',
        text: 'Test comment',
        author: 'user@example.com',
        created_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockDatabase.query.mockResolvedValueOnce({
        rows: [mockComment],
        rowCount: 1,
      } as any);

      const result = await repository.findCommentById('comment-123');

      expect(result).toEqual({
        id: 'comment-123',
        ticketId: 'ticket-456',
        text: 'Test comment',
        author: 'user@example.com',
        createdAt: new Date('2024-01-15T10:00:00Z'),
      });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['comment-123']
      );
    });

    it('should return null when comment not found', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findCommentById('non-existent-comment');

      expect(result).toBeNull();
    });

    it('should throw DatabaseError on query failure', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.findCommentById('comment-123')).rejects.toThrow(DatabaseError);
      await expect(repository.findCommentById('comment-123')).rejects.toThrow(
        'Failed to retrieve comment'
      );
    });

    it('should correctly map all comment fields', async () => {
      const mockComment = {
        id: 'comment-xyz',
        ticket_id: 'ticket-abc',
        text: 'Detailed comment',
        author: 'author@example.com',
        created_at: new Date('2024-01-15T15:45:00Z'),
      };

      mockDatabase.query.mockResolvedValueOnce({
        rows: [mockComment],
        rowCount: 1,
      } as any);

      const result = await repository.findCommentById('comment-xyz');

      expect(result?.id).toBe('comment-xyz');
      expect(result?.ticketId).toBe('ticket-abc');
      expect(result?.text).toBe('Detailed comment');
      expect(result?.author).toBe('author@example.com');
      expect(result?.createdAt).toEqual(new Date('2024-01-15T15:45:00Z'));
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty comment text at database level', async () => {
      const mockComment = {
        ticketId: 'ticket-123',
        text: '', // Empty text - should be caught by database constraint
        author: 'user@example.com',
      };

      // Simulate constraint violation
      const constraintError: any = new Error('CHECK constraint violation');
      constraintError.code = '23514';

      mockDatabase.query.mockRejectedValueOnce(constraintError);

      await expect(repository.insertComment(mockComment)).rejects.toThrow(DatabaseError);
    });

    it('should handle whitespace-only comment text at database level', async () => {
      const mockComment = {
        ticketId: 'ticket-123',
        text: '   ', // Whitespace-only - should be caught by database constraint
        author: 'user@example.com',
      };

      // Simulate constraint violation
      const constraintError: any = new Error('CHECK constraint violation');
      constraintError.code = '23514';

      mockDatabase.query.mockRejectedValueOnce(constraintError);

      await expect(repository.insertComment(mockComment)).rejects.toThrow(DatabaseError);
    });

    it('should handle comment text exceeding 2000 characters at database level', async () => {
      const mockComment = {
        ticketId: 'ticket-123',
        text: 'A'.repeat(2001), // Exceeds 2000 character limit
        author: 'user@example.com',
      };

      // Simulate constraint violation
      const constraintError: any = new Error('CHECK constraint violation');
      constraintError.code = '23514';

      mockDatabase.query.mockRejectedValueOnce(constraintError);

      await expect(repository.insertComment(mockComment)).rejects.toThrow(DatabaseError);
    });

    it('should handle special characters in comment text', async () => {
      const specialText = "Comment with 'quotes', \"double quotes\", and special chars: @#$%^&*()";
      const mockComment = {
        ticketId: 'ticket-123',
        text: specialText,
        author: 'user@example.com',
      };

      const mockResult = {
        rows: [
          {
            id: 'comment-special',
            ticket_id: mockComment.ticketId,
            text: mockComment.text,
            author: mockComment.author,
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      };

      mockDatabase.query.mockResolvedValueOnce(mockResult as any);

      const result = await repository.insertComment(mockComment);

      expect(result.text).toBe(specialText);
    });

    it('should handle Unicode characters in comment text', async () => {
      const unicodeText = '这是一条评论 🎉 Это комментарий';
      const mockComment = {
        ticketId: 'ticket-123',
        text: unicodeText,
        author: 'user@example.com',
      };

      const mockResult = {
        rows: [
          {
            id: 'comment-unicode',
            ticket_id: mockComment.ticketId,
            text: mockComment.text,
            author: mockComment.author,
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      };

      mockDatabase.query.mockResolvedValueOnce(mockResult as any);

      const result = await repository.insertComment(mockComment);

      expect(result.text).toBe(unicodeText);
    });
  });
});
