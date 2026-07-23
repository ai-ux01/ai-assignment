/**
 * DataStore Interface
 * 
 * Defines the contract for data persistence operations.
 * This interface abstracts database operations and can be implemented
 * by different repository classes for different entities.
 * 
 * Requirements:
 * - 10.1: Persist ticket creation operations
 * - 10.2: Persist ticket update operations
 * - 10.3: Persist state transition operations
 * - 10.4: Persist comment additions
 * - 10.5: Persist assignment operations
 * - 10.6: Rollback partial changes on failure
 * - 10.7: Maintain data integrity across restarts
 * - 10.8: Support concurrent operations
 */

import { Transaction } from './database';

/**
 * Ticket entity representing a support ticket
 */
export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  state: 'Open' | 'In_Progress' | 'Resolved' | 'Closed' | 'Cancelled';
  assignee: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Comment entity representing a ticket comment
 */
export interface Comment {
  id: string;
  ticketId: string;
  text: string;
  author: string;
  createdAt: Date;
}

/**
 * Audit log entry for tracking changes
 */
export interface AuditLogEntry {
  id: string;
  ticketId: string;
  operation: string;
  userId: string;
  oldState?: string;
  newState?: string;
  changes?: Record<string, any>;
  createdAt: Date;
}

/**
 * DataStore interface defining all data persistence operations
 * 
 * This interface must be implemented by repository classes
 * to provide CRUD operations with transaction support.
 */
export interface DataStore {
  // ============================================
  // Ticket Operations
  // ============================================

  /**
   * Insert a new ticket into the database
   * 
   * @param ticket - Ticket to insert (id should be generated)
   * @param transaction - Optional transaction context
   * @returns Promise<void>
   */
  insertTicket(ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>, transaction?: Transaction): Promise<Ticket>;

  /**
   * Update an existing ticket
   * 
   * @param id - Ticket ID
   * @param updates - Partial ticket updates
   * @param transaction - Optional transaction context
   * @returns Promise<void>
   */
  updateTicket(id: string, updates: Partial<Omit<Ticket, 'id' | 'createdAt'>>, transaction?: Transaction): Promise<void>;

  /**
   * Find ticket by ID
   * 
   * @param id - Ticket ID
   * @returns Promise<Ticket | null>
   */
  findTicketById(id: string): Promise<Ticket | null>;

  /**
   * Find all tickets
   * 
   * @returns Promise<Ticket[]>
   */
  findAllTickets(): Promise<Ticket[]>;

  /**
   * Search tickets by keyword (title and description)
   * 
   * @param query - Search keyword
   * @returns Promise<Ticket[]>
   */
  searchTickets(query: string): Promise<Ticket[]>;

  /**
   * Filter tickets by state
   * 
   * @param state - Ticket state to filter by
   * @returns Promise<Ticket[]>
   */
  filterTicketsByState(state: Ticket['state']): Promise<Ticket[]>;

  // ============================================
  // Comment Operations
  // ============================================

  /**
   * Insert a new comment
   * 
   * @param comment - Comment to insert (id should be generated)
   * @param transaction - Optional transaction context
   * @returns Promise<Comment>
   */
  insertComment(comment: Omit<Comment, 'id' | 'createdAt'>, transaction?: Transaction): Promise<Comment>;

  /**
   * Find all comments for a ticket (ordered chronologically)
   * 
   * @param ticketId - Ticket ID
   * @returns Promise<Comment[]>
   */
  findCommentsByTicketId(ticketId: string): Promise<Comment[]>;

  // ============================================
  // Audit Log Operations
  // ============================================

  /**
   * Insert an audit log entry
   * 
   * @param entry - Audit log entry to insert
   * @param transaction - Optional transaction context
   * @returns Promise<void>
   */
  insertAuditEntry(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>, transaction?: Transaction): Promise<void>;

  /**
   * Get audit log entries for a ticket
   * 
   * @param ticketId - Ticket ID
   * @returns Promise<AuditLogEntry[]>
   */
  getAuditEntriesByTicketId(ticketId: string): Promise<AuditLogEntry[]>;

  // ============================================
  // Transaction Support
  // ============================================

  /**
   * Begin a database transaction
   * 
   * @returns Promise<Transaction>
   */
  beginTransaction(): Promise<Transaction>;

  /**
   * Commit a transaction
   * 
   * @param transaction - Transaction to commit
   * @returns Promise<void>
   */
  commitTransaction(transaction: Transaction): Promise<void>;

  /**
   * Rollback a transaction
   * 
   * @param transaction - Transaction to rollback
   * @returns Promise<void>
   */
  rollbackTransaction(transaction: Transaction): Promise<void>;
}

/**
 * Helper type for ticket creation input
 */
export type CreateTicketInput = Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Helper type for ticket update input
 */
export type UpdateTicketInput = Partial<Omit<Ticket, 'id' | 'createdAt'>>;

/**
 * Helper type for comment creation input
 */
export type CreateCommentInput = Omit<Comment, 'id' | 'createdAt'>;
