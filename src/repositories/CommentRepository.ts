/**
 * Comment Repository Implementation
 *
 * Provides comment-specific CRUD operations with foreign key validation,
 * chronological ordering, and transaction support.
 *
 * Requirements:
 * - 6.1: Create Comment record associated with specified Ticket_ID
 * - 6.3: Persist Comment to Data_Store
 * - 6.7: Maintain chronological ordering of comments for each ticket
 */

import { database, Transaction } from './database';
import { Comment, CreateCommentRequest } from '../models/comment';
import logger from '../utils/logger';
import { DatabaseError } from '../utils/customErrors';
import { ErrorCode } from '../models/errors';

/**
 * Comment Repository class implementing comment-specific CRUD operations
 *
 * Handles all database interactions for comments including:
 * - Creation with UUID generation
 * - Retrieval by ticket ID with chronological ordering
 * - Foreign key validation (ticket existence)
 */
export class CommentRepository {
  /**
   * Insert a new comment with automatic UUID generation
   *
   * Requirements: 6.1, 6.3
   *
   * @param comment - Comment data without ID (will be generated)
   * @param transaction - Optional transaction context
   * @returns Promise<Comment> - Created comment with generated ID
   * @throws DatabaseError if ticket does not exist or insertion fails
   */
  async insertComment(
    comment: CreateCommentRequest & { ticketId: string },
    transaction?: Transaction
  ): Promise<Comment> {
    const query = `
      INSERT INTO comments (ticket_id, text, author)
      VALUES ($1, $2, $3)
      RETURNING id, ticket_id, text, author, created_at
    `;

    const values = [comment.ticketId, comment.text, comment.author];

    try {
      const result = transaction
        ? await database.queryInTransaction(transaction, query, values)
        : await database.query(query, values);

      const row = result.rows[0];
      const createdComment: Comment = {
        id: row.id,
        ticketId: row.ticket_id,
        text: row.text,
        author: row.author,
        createdAt: row.created_at,
      };

      logger.debug('Comment inserted', {
        commentId: createdComment.id,
        ticketId: createdComment.ticketId,
      });
      return createdComment;
    } catch (error) {
      // Check for foreign key violation (ticket doesn't exist)
      if (error instanceof Error && 'code' in error && error.code === '23503') {
        logger.warn('Comment insertion failed: ticket not found', {
          ticketId: comment.ticketId,
        });
        throw new DatabaseError(
          `Ticket with ID ${comment.ticketId} does not exist`,
          ErrorCode.TICKET_NOT_FOUND
        );
      }

      logger.error('Failed to insert comment', {
        ticketId: comment.ticketId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to create comment', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * Find all comments for a ticket in chronological order (oldest first)
   *
   * Requirements: 6.7
   *
   * Returns comments ordered by creation timestamp ascending (oldest first).
   * This maintains a chronological conversation history for the ticket.
   *
   * @param ticketId - Ticket UUID
   * @returns Promise<Comment[]> - Comments ordered chronologically (oldest first)
   */
  async findCommentsByTicketId(ticketId: string): Promise<Comment[]> {
    const query = `
      SELECT id, ticket_id, text, author, created_at
      FROM comments
      WHERE ticket_id = $1
      ORDER BY created_at ASC
    `;

    try {
      const result = await database.query(query, [ticketId]);

      const comments = result.rows.map((row) => ({
        id: row.id,
        ticketId: row.ticket_id,
        text: row.text,
        author: row.author,
        createdAt: row.created_at,
      }));

      logger.debug('Retrieved comments for ticket', {
        ticketId,
        count: comments.length,
      });
      return comments;
    } catch (error) {
      logger.error('Failed to find comments by ticket ID', {
        ticketId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to retrieve comments', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * Find a single comment by ID
   *
   * @param id - Comment UUID
   * @returns Promise<Comment | null> - Comment if found, null otherwise
   */
  async findCommentById(id: string): Promise<Comment | null> {
    const query = `
      SELECT id, ticket_id, text, author, created_at
      FROM comments
      WHERE id = $1
    `;

    try {
      const result = await database.query(query, [id]);

      if (result.rows.length === 0) {
        logger.debug('Comment not found', { commentId: id });
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        ticketId: row.ticket_id,
        text: row.text,
        author: row.author,
        createdAt: row.created_at,
      };
    } catch (error) {
      logger.error('Failed to find comment by ID', {
        commentId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to retrieve comment', ErrorCode.DATABASE_ERROR);
    }
  }
}

// Export singleton instance
export const commentRepository = new CommentRepository();
