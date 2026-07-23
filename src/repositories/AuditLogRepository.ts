/**
 * Audit Log Repository
 *
 * Handles audit log operations for compliance and tracking.
 * Provides methods for inserting audit records and finding audit records by ticket ID.
 *
 * Requirements:
 * - Security 4: Log all state-changing operations for audit purposes
 * - Audit Trail: Maintain comprehensive audit history for compliance
 *
 * Task: 2.6 Implement Audit Log Repository
 */

import { database, Transaction } from './database';
import { AuditLogEntry } from './DataStore.interface';
import logger from '../utils/logger';
import { DatabaseError } from '../utils/customErrors';

/**
 * AuditLogRepository class for audit trail operations
 *
 * This repository provides methods to insert audit entries and retrieve
 * audit history for tickets. All audit operations are designed to be
 * non-blocking - failures should not prevent the main operation from succeeding.
 */
export class AuditLogRepository {
  /**
   * Insert an audit log entry
   *
   * Records an operation performed on a ticket for compliance and tracking.
   * This method is designed to be non-blocking - it logs errors but does not throw,
   * ensuring that audit log failures don't break the main operation.
   *
   * @param entry - Audit log entry to insert (without id and createdAt)
   * @param transaction - Optional transaction context
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await auditLogRepository.insertAuditEntry({
   *   ticketId: 'a1b2c3d4-...',
   *   operation: 'STATE_TRANSITION',
   *   userId: 'user@example.com',
   *   oldState: 'Open',
   *   newState: 'In_Progress'
   * });
   * ```
   */
  async insertAuditEntry(
    entry: Omit<AuditLogEntry, 'id' | 'createdAt'>,
    transaction?: Transaction
  ): Promise<void> {
    const query = `
      INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
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
      const result = transaction
        ? await database.queryInTransaction(transaction, query, values)
        : await database.query(query, values);

      logger.debug('Audit entry inserted', {
        auditId: result.rows[0].id,
        ticketId: entry.ticketId,
        operation: entry.operation,
        userId: entry.userId,
      });
    } catch (error) {
      // Log the error but don't throw - audit logging should not break operations
      logger.error('Failed to insert audit entry', {
        ticketId: entry.ticketId,
        operation: entry.operation,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      logger.warn('Continuing despite audit log failure - operation will proceed');
    }
  }

  /**
   * Get audit log entries for a ticket
   *
   * Retrieves the complete audit history for a ticket, ordered by timestamp (newest first).
   * This is useful for compliance reporting and tracking who made what changes when.
   *
   * @param ticketId - Ticket ID to get audit entries for
   * @returns Promise<AuditLogEntry[]> - Array of audit log entries
   *
   * @throws {DatabaseError} - If the database query fails
   *
   * @example
   * ```typescript
   * const auditHistory = await auditLogRepository.getAuditEntriesByTicketId('a1b2c3d4-...');
   * console.log(`Found ${auditHistory.length} audit entries`);
   * ```
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

      const auditEntries = result.rows.map((row) => ({
        id: row.id,
        ticketId: row.ticket_id,
        operation: row.operation,
        userId: row.user_id,
        oldState: row.old_state || undefined,
        newState: row.new_state || undefined,
        changes: row.changes || undefined,
        createdAt: row.created_at,
      }));

      logger.debug('Retrieved audit entries', {
        ticketId,
        count: auditEntries.length,
      });

      return auditEntries;
    } catch (error) {
      logger.error('Failed to get audit entries', {
        ticketId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError(`Failed to retrieve audit log for ticket ${ticketId}`);
    }
  }

  /**
   * Get audit log entries by user ID
   *
   * Retrieves all audit entries for a specific user, ordered by timestamp (newest first).
   * This is useful for tracking a user's activity across all tickets.
   *
   * @param userId - User ID to get audit entries for
   * @returns Promise<AuditLogEntry[]> - Array of audit log entries
   *
   * @throws {DatabaseError} - If the database query fails
   */
  async getAuditEntriesByUserId(userId: string): Promise<AuditLogEntry[]> {
    const query = `
      SELECT id, ticket_id, operation, user_id, old_state, new_state, changes, created_at
      FROM audit_log
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await database.query(query, [userId]);

      const auditEntries = result.rows.map((row) => ({
        id: row.id,
        ticketId: row.ticket_id,
        operation: row.operation,
        userId: row.user_id,
        oldState: row.old_state || undefined,
        newState: row.new_state || undefined,
        changes: row.changes || undefined,
        createdAt: row.created_at,
      }));

      logger.debug('Retrieved audit entries for user', {
        userId,
        count: auditEntries.length,
      });

      return auditEntries;
    } catch (error) {
      logger.error('Failed to get audit entries for user', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError(`Failed to retrieve audit log for user ${userId}`);
    }
  }

  /**
   * Get audit log entries by operation type
   *
   * Retrieves all audit entries for a specific operation type, ordered by timestamp (newest first).
   * This is useful for compliance reporting on specific types of operations.
   *
   * @param operation - Operation type to filter by (CREATE, UPDATE, STATE_TRANSITION, ASSIGN, COMMENT)
   * @returns Promise<AuditLogEntry[]> - Array of audit log entries
   *
   * @throws {DatabaseError} - If the database query fails
   */
  async getAuditEntriesByOperation(operation: string): Promise<AuditLogEntry[]> {
    const query = `
      SELECT id, ticket_id, operation, user_id, old_state, new_state, changes, created_at
      FROM audit_log
      WHERE operation = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await database.query(query, [operation]);

      const auditEntries = result.rows.map((row) => ({
        id: row.id,
        ticketId: row.ticket_id,
        operation: row.operation,
        userId: row.user_id,
        oldState: row.old_state || undefined,
        newState: row.new_state || undefined,
        changes: row.changes || undefined,
        createdAt: row.created_at,
      }));

      logger.debug('Retrieved audit entries by operation', {
        operation,
        count: auditEntries.length,
      });

      return auditEntries;
    } catch (error) {
      logger.error('Failed to get audit entries by operation', {
        operation,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError(`Failed to retrieve audit log for operation ${operation}`);
    }
  }
}

// Export singleton instance
export const auditLogRepository = new AuditLogRepository();
