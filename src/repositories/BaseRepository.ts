/**
 * Base Repository Implementation
 *
 * Implements the DataStore interface with PostgreSQL-specific operations.
 * Provides transaction support, error handling, and query execution.
 *
 * Requirements:
 * - 10.1-10.5: Persist all operations
 * - 10.6: Rollback on failure
 * - 10.7: Maintain data integrity
 * - 10.8: Support concurrent operations
 */

import { database, Transaction } from './database';
import {
  DataStore,
  Ticket,
  Comment,
  AuditLogEntry,
  CreateTicketInput,
  UpdateTicketInput,
  CreateCommentInput,
} from './DataStore.interface';
import logger from '../utils/logger';
import { DatabaseError, NotFoundError } from '../utils/customErrors';

/**
 * Base Repository implementing DataStore interface
 *
 * Provides PostgreSQL implementation of all data persistence operations
 */
export class BaseRepository implements DataStore {
  // ============================================
  // Ticket Operations
  // ============================================

  /**
   * Insert a new ticket into the database
   */
  async insertTicket(ticket: CreateTicketInput, transaction?: Transaction): Promise<Ticket> {
    const query = `
      INSERT INTO tickets (title, description, priority, state, assignee)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, description, priority, state, assignee, created_at, updated_at
    `;

    const values = [
      ticket.title,
      ticket.description,
      ticket.priority,
      ticket.state,
      ticket.assignee,
    ];

    try {
      const result = transaction
        ? await database.queryInTransaction(transaction, query, values)
        : await database.query(query, values);

      const row = result.rows[0];
      const createdTicket: Ticket = {
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority,
        state: row.state,
        assignee: row.assignee,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      logger.debug('Ticket inserted', { ticketId: createdTicket.id });
      return createdTicket;
    } catch (error) {
      logger.error('Failed to insert ticket', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to create ticket');
    }
  }

  /**
   * Update an existing ticket
   */
  async updateTicket(
    id: string,
    updates: UpdateTicketInput,
    transaction?: Transaction
  ): Promise<void> {
    // Build dynamic update query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.priority !== undefined) {
      fields.push(`priority = $${paramIndex++}`);
      values.push(updates.priority);
    }
    if (updates.state !== undefined) {
      fields.push(`state = $${paramIndex++}`);
      values.push(updates.state);
    }
    if (updates.assignee !== undefined) {
      fields.push(`assignee = $${paramIndex++}`);
      values.push(updates.assignee);
    }

    // If no fields to update, return early
    if (fields.length === 0) {
      logger.warn('Update ticket called with no fields to update', { ticketId: id });
      return;
    }

    // Add ticket ID to values
    values.push(id);

    const query = `
      UPDATE tickets
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
    `;

    try {
      const result = transaction
        ? await database.queryInTransaction(transaction, query, values)
        : await database.query(query, values);

      if (result.rowCount === 0) {
        throw new NotFoundError(`Ticket with ID ${id} not found`);
      }

      logger.debug('Ticket updated', { ticketId: id, fields: Object.keys(updates) });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to update ticket', {
        ticketId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to update ticket');
    }
  }

  /**
   * Find ticket by ID
   */
  async findTicketById(id: string): Promise<Ticket | null> {
    const query = `
      SELECT id, title, description, priority, state, assignee, created_at, updated_at
      FROM tickets
      WHERE id = $1
    `;

    try {
      const result = await database.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority,
        state: row.state,
        assignee: row.assignee,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      logger.error('Failed to find ticket by ID', {
        ticketId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to retrieve ticket');
    }
  }

  /**
   * Find all tickets
   */
  async findAllTickets(): Promise<Ticket[]> {
    const query = `
      SELECT id, title, description, priority, state, assignee, created_at, updated_at
      FROM tickets
      ORDER BY created_at DESC
    `;

    try {
      const result = await database.query(query);

      return result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority,
        state: row.state,
        assignee: row.assignee,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      logger.error('Failed to find all tickets', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to retrieve tickets');
    }
  }

  /**
   * Search tickets by keyword
   */
  async searchTickets(query: string): Promise<Ticket[]> {
    const sql = `
      SELECT id, title, description, priority, state, assignee, created_at, updated_at
      FROM tickets
      WHERE to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', $1)
      ORDER BY created_at DESC
    `;

    try {
      const result = await database.query(sql, [query]);

      return result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority,
        state: row.state,
        assignee: row.assignee,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      logger.error('Failed to search tickets', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to search tickets');
    }
  }

  /**
   * Filter tickets by state
   */
  async filterTicketsByState(state: Ticket['state']): Promise<Ticket[]> {
    const query = `
      SELECT id, title, description, priority, state, assignee, created_at, updated_at
      FROM tickets
      WHERE state = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await database.query(query, [state]);

      return result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority,
        state: row.state,
        assignee: row.assignee,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      logger.error('Failed to filter tickets by state', {
        state,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to filter tickets');
    }
  }

  // ============================================
  // Comment Operations
  // ============================================

  /**
   * Insert a new comment
   */
  async insertComment(comment: CreateCommentInput, transaction?: Transaction): Promise<Comment> {
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
        ticketId: comment.ticketId,
      });
      return createdComment;
    } catch (error) {
      logger.error('Failed to insert comment', {
        ticketId: comment.ticketId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to create comment');
    }
  }

  /**
   * Find comments by ticket ID (chronological order)
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

      return result.rows.map((row) => ({
        id: row.id,
        ticketId: row.ticket_id,
        text: row.text,
        author: row.author,
        createdAt: row.created_at,
      }));
    } catch (error) {
      logger.error('Failed to find comments for ticket', {
        ticketId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to retrieve comments');
    }
  }

  // ============================================
  // Audit Log Operations
  // ============================================

  /**
   * Insert an audit log entry
   */
  async insertAuditEntry(
    entry: Omit<AuditLogEntry, 'id' | 'createdAt'>,
    transaction?: Transaction
  ): Promise<void> {
    const query = `
      INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const values = [
      entry.ticketId,
      entry.operation,
      entry.userId,
      entry.oldState || null,
      entry.newState || null,
      entry.changes ? JSON.stringify(entry.changes) : null,
    ];

    try {
      if (transaction) {
        await database.queryInTransaction(transaction, query, values);
      } else {
        await database.query(query, values);
      }

      logger.debug('Audit entry inserted', {
        ticketId: entry.ticketId,
        operation: entry.operation,
      });
    } catch (error) {
      logger.error('Failed to insert audit entry', {
        ticketId: entry.ticketId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - audit logging should not break operations
      logger.warn('Continuing despite audit log failure');
    }
  }

  /**
   * Get audit entries for a ticket
   */
  async getAuditEntriesByTicketId(ticketId: string): Promise<AuditLogEntry[]> {
    const query = `
      SELECT id, ticket_id, operation, user_id, old_state, new_state, changes, created_at
      FROM audit_log
      WHERE ticket_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await database.query(query, [ticketId]);

      return result.rows.map((row) => ({
        id: row.id,
        ticketId: row.ticket_id,
        operation: row.operation,
        userId: row.user_id,
        oldState: row.old_state,
        newState: row.new_state,
        changes: row.changes,
        createdAt: row.created_at,
      }));
    } catch (error) {
      logger.error('Failed to get audit entries', {
        ticketId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to retrieve audit log');
    }
  }

  // ============================================
  // Transaction Support
  // ============================================

  /**
   * Begin a database transaction
   */
  async beginTransaction(): Promise<Transaction> {
    return database.beginTransaction();
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(transaction: Transaction): Promise<void> {
    return database.commitTransaction(transaction);
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(transaction: Transaction): Promise<void> {
    return database.rollbackTransaction(transaction);
  }
}

// Export singleton instance
export const repository = new BaseRepository();
