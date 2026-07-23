/**
 * Ticket Repository Implementation
 *
 * Provides ticket-specific CRUD operations with PostgreSQL full-text search,
 * state filtering, and transaction support.
 *
 * Requirements:
 * - 1.2: Generate unique Ticket_ID
 * - 1.4: Persist ticket to Data_Store
 * - 2.1: Retrieve all tickets from Data_Store
 * - 3.1: Retrieve complete ticket record
 * - 4.1: Update specified fields in Data_Store
 * - 7.1: Search ticket title and description fields
 * - 8.1: Return tickets matching specified state
 */

import { database, Transaction } from './database';
import {
  Ticket,
  Priority,
  TicketState,
  CreateTicketRequest,
  TicketUpdates,
} from '../models/ticket';
import logger from '../utils/logger';
import { DatabaseError, NotFoundError } from '../utils/customErrors';
import { ErrorCode } from '../models/errors';
import {
  PaginationOptions,
  PaginatedResponse,
  validatePaginationOptions,
  calculateLimitOffset,
  createPaginationMetadata,
  buildOrderByClause,
  TICKET_SORT_FIELDS,
} from '../utils/pagination';

/**
 * Ticket Repository class implementing ticket-specific CRUD operations
 *
 * Handles all database interactions for tickets including:
 * - Creation with UUID generation
 * - Retrieval by ID or list all
 * - Updates preserving unmodified fields
 * - Full-text search
 * - State-based filtering
 */
export class TicketRepository {
  /**
   * Insert a new ticket with automatic UUID generation
   *
   * Requirements: 1.2, 1.4
   *
   * @param ticket - Ticket data without ID (will be generated)
   * @param transaction - Optional transaction context
   * @returns Promise<Ticket> - Created ticket with generated ID
   */
  async insertTicket(
    ticket: CreateTicketRequest & { state: TicketState; assignee: string | null },
    transaction?: Transaction
  ): Promise<Ticket> {
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
        priority: row.priority as Priority,
        state: row.state as TicketState,
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
      throw new DatabaseError('Failed to create ticket', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * Find ticket by ID with proper error handling
   *
   * Requirements: 3.1
   *
   * @param id - Ticket UUID
   * @returns Promise<Ticket | null> - Ticket if found, null otherwise
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
        logger.debug('Ticket not found', { ticketId: id });
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority as Priority,
        state: row.state as TicketState,
        assignee: row.assignee,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      logger.error('Failed to find ticket by ID', {
        ticketId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to retrieve ticket', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * Find all tickets with consistent ordering (most recent first)
   *
   * Requirements: 2.1
   *
   * @returns Promise<Ticket[]> - All tickets ordered by creation date (descending)
   */
  async findAllTickets(): Promise<Ticket[]> {
    const query = `
      SELECT id, title, description, priority, state, assignee, created_at, updated_at
      FROM tickets
      ORDER BY created_at DESC
    `;

    try {
      const result = await database.query(query);

      const tickets = result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority as Priority,
        state: row.state as TicketState,
        assignee: row.assignee,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      logger.debug('Retrieved all tickets', { count: tickets.length });
      return tickets;
    } catch (error) {
      logger.error('Failed to find all tickets', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to retrieve tickets', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * Update ticket preserving unmodified fields
   *
   * Requirements: 4.1
   *
   * Only updates fields that are provided in the updates object.
   * All other fields remain unchanged.
   *
   * @param id - Ticket UUID
   * @param updates - Partial ticket updates (only changed fields)
   * @param transaction - Optional transaction context
   * @returns Promise<void>
   * @throws NotFoundError if ticket does not exist
   */
  async updateTicket(
    id: string,
    updates: Partial<TicketUpdates & { state?: TicketState; assignee?: string | null }>,
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

    // Always update the updated_at timestamp
    fields.push('updated_at = CURRENT_TIMESTAMP');

    // Add ticket ID to values
    values.push(id);

    const query = `
      UPDATE tickets
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
    `;

    try {
      const result = transaction
        ? await database.queryInTransaction(transaction, query, values)
        : await database.query(query, values);

      if (result.rowCount === 0) {
        logger.debug('Ticket not found for update', { ticketId: id });
        throw new NotFoundError(`Ticket with ID ${id} not found`, ErrorCode.TICKET_NOT_FOUND);
      }

      logger.debug('Ticket updated', { ticketId: id, fields: Object.keys(updates) });
    } catch (error) {
      // Re-throw NotFoundError as-is
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Failed to update ticket', {
        ticketId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to update ticket', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * Search tickets using PostgreSQL full-text search
   *
   * Requirements: 7.1
   *
   * Searches across title and description fields using PostgreSQL's
   * full-text search capabilities with case-insensitive matching.
   *
   * @param query - Search keyword
   * @returns Promise<Ticket[]> - Tickets matching the search query
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

      const tickets = result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority as Priority,
        state: row.state as TicketState,
        assignee: row.assignee,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      logger.debug('Search tickets completed', { query, count: tickets.length });
      return tickets;
    } catch (error) {
      logger.error('Failed to search tickets', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to search tickets', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * Filter tickets by state with state validation
   *
   * Requirements: 8.1
   *
   * Returns all tickets matching the specified state.
   * State validation should be performed by the caller.
   *
   * @param state - Ticket state to filter by
   * @returns Promise<Ticket[]> - Tickets in the specified state
   */
  async filterTicketsByState(state: TicketState): Promise<Ticket[]> {
    const query = `
      SELECT id, title, description, priority, state, assignee, created_at, updated_at
      FROM tickets
      WHERE state = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await database.query(query, [state]);

      const tickets = result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority as Priority,
        state: row.state as TicketState,
        assignee: row.assignee,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      logger.debug('Filter tickets by state completed', { state, count: tickets.length });
      return tickets;
    } catch (error) {
      logger.error('Failed to filter tickets by state', {
        state,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to filter tickets', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * Find all tickets with pagination support
   *
   * Requirements: 10.6 - Implement performance optimizations with pagination
   *
   * @param options - Pagination options (page, pageSize, sortBy, sortOrder)
   * @returns Promise<PaginatedResponse<Ticket>> - Paginated tickets with metadata
   */
  async findAllTicketsPaginated(options: PaginationOptions = {}): Promise<PaginatedResponse<Ticket>> {
    // Validate and normalize pagination options
    const validated = validatePaginationOptions(options);
    const { limit, offset } = calculateLimitOffset(validated.page, validated.pageSize);

    // Build ORDER BY clause with allowed fields
    const orderByClause = buildOrderByClause(validated.sortBy, validated.sortOrder, TICKET_SORT_FIELDS);

    // Query for total count
    const countQuery = 'SELECT COUNT(*) as total FROM tickets';
    
    // Query for paginated results
    const dataQuery = `
      SELECT id, title, description, priority, state, assignee, created_at, updated_at
      FROM tickets
      ${orderByClause}
      LIMIT $1 OFFSET $2
    `;

    try {
      // Execute both queries
      const [countResult, dataResult] = await Promise.all([
        database.query(countQuery),
        database.query(dataQuery, [limit, offset])
      ]);

      const totalItems = parseInt(countResult.rows[0].total, 10);

      const tickets = dataResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority as Priority,
        state: row.state as TicketState,
        assignee: row.assignee,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const metadata = createPaginationMetadata(validated.page, validated.pageSize, totalItems);

      logger.debug('Retrieved paginated tickets', {
        page: validated.page,
        pageSize: validated.pageSize,
        totalItems,
        returnedItems: tickets.length,
      });

      return {
        data: tickets,
        pagination: metadata,
      };
    } catch (error) {
      logger.error('Failed to find paginated tickets', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to retrieve paginated tickets', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * Search tickets with pagination support
   *
   * Requirements: 10.6 - Implement performance optimizations with pagination
   *
   * @param query - Search keyword
   * @param options - Pagination options
   * @returns Promise<PaginatedResponse<Ticket>> - Paginated search results with metadata
   */
  async searchTicketsPaginated(
    query: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResponse<Ticket>> {
    // Validate and normalize pagination options
    const validated = validatePaginationOptions(options);
    const { limit, offset } = calculateLimitOffset(validated.page, validated.pageSize);

    // Build ORDER BY clause with allowed fields
    const orderByClause = buildOrderByClause(validated.sortBy, validated.sortOrder, TICKET_SORT_FIELDS);

    // Query for total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM tickets
      WHERE to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', $1)
    `;
    
    // Query for paginated results
    const dataQuery = `
      SELECT id, title, description, priority, state, assignee, created_at, updated_at
      FROM tickets
      WHERE to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', $1)
      ${orderByClause}
      LIMIT $2 OFFSET $3
    `;

    try {
      // Execute both queries
      const [countResult, dataResult] = await Promise.all([
        database.query(countQuery, [query]),
        database.query(dataQuery, [query, limit, offset])
      ]);

      const totalItems = parseInt(countResult.rows[0].total, 10);

      const tickets = dataResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority as Priority,
        state: row.state as TicketState,
        assignee: row.assignee,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const metadata = createPaginationMetadata(validated.page, validated.pageSize, totalItems);

      logger.debug('Search tickets with pagination completed', {
        query,
        page: validated.page,
        pageSize: validated.pageSize,
        totalItems,
        returnedItems: tickets.length,
      });

      return {
        data: tickets,
        pagination: metadata,
      };
    } catch (error) {
      logger.error('Failed to search paginated tickets', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to search paginated tickets', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * Filter tickets by state with pagination support
   *
   * Requirements: 10.6 - Implement performance optimizations with pagination
   *
   * @param state - Ticket state to filter by
   * @param options - Pagination options
   * @returns Promise<PaginatedResponse<Ticket>> - Paginated filtered results with metadata
   */
  async filterTicketsByStatePaginated(
    state: TicketState,
    options: PaginationOptions = {}
  ): Promise<PaginatedResponse<Ticket>> {
    // Validate and normalize pagination options
    const validated = validatePaginationOptions(options);
    const { limit, offset } = calculateLimitOffset(validated.page, validated.pageSize);

    // Build ORDER BY clause with allowed fields
    const orderByClause = buildOrderByClause(validated.sortBy, validated.sortOrder, TICKET_SORT_FIELDS);

    // Query for total count
    const countQuery = 'SELECT COUNT(*) as total FROM tickets WHERE state = $1';
    
    // Query for paginated results
    const dataQuery = `
      SELECT id, title, description, priority, state, assignee, created_at, updated_at
      FROM tickets
      WHERE state = $1
      ${orderByClause}
      LIMIT $2 OFFSET $3
    `;

    try {
      // Execute both queries
      const [countResult, dataResult] = await Promise.all([
        database.query(countQuery, [state]),
        database.query(dataQuery, [state, limit, offset])
      ]);

      const totalItems = parseInt(countResult.rows[0].total, 10);

      const tickets = dataResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority as Priority,
        state: row.state as TicketState,
        assignee: row.assignee,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const metadata = createPaginationMetadata(validated.page, validated.pageSize, totalItems);

      logger.debug('Filter tickets by state with pagination completed', {
        state,
        page: validated.page,
        pageSize: validated.pageSize,
        totalItems,
        returnedItems: tickets.length,
      });

      return {
        data: tickets,
        pagination: metadata,
      };
    } catch (error) {
      logger.error('Failed to filter paginated tickets by state', {
        state,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to filter paginated tickets', ErrorCode.DATABASE_ERROR);
    }
  }
}

// Export singleton instance
export const ticketRepository = new TicketRepository();
