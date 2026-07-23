import logger from './logger';

/**
 * Audit operation types
 */
export enum AuditOperation {
  CREATE_TICKET = 'CREATE_TICKET',
  UPDATE_TICKET = 'UPDATE_TICKET',
  STATE_TRANSITION = 'STATE_TRANSITION',
  ASSIGN_TICKET = 'ASSIGN_TICKET',
  ADD_COMMENT = 'ADD_COMMENT',
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  operation: AuditOperation;
  userId: string;
  ticketId: string;
  requestId?: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

/**
 * State transition specific audit entry
 */
export interface StateTransitionAuditEntry extends AuditLogEntry {
  operation: AuditOperation.STATE_TRANSITION;
  details: {
    oldState: string;
    newState: string;
  };
}

/**
 * Assignment specific audit entry
 */
export interface AssignmentAuditEntry extends AuditLogEntry {
  operation: AuditOperation.ASSIGN_TICKET;
  details: {
    oldAssignee: string | null;
    newAssignee: string | null;
  };
}

/**
 * Update specific audit entry
 */
export interface UpdateAuditEntry extends AuditLogEntry {
  operation: AuditOperation.UPDATE_TICKET;
  details: {
    changedFields: string[];
    changes: Record<string, { old: any; new: any }>;
  };
}

/**
 * Audit Logger for tracking state-changing operations
 * Logs all operations that modify ticket data for compliance and troubleshooting
 */
class AuditLogger {
  /**
   * Log ticket creation
   */
  logTicketCreation(entry: AuditLogEntry): void {
    logger.info('Audit: Ticket created', {
      operation: AuditOperation.CREATE_TICKET,
      userId: entry.userId,
      ticketId: entry.ticketId,
      requestId: entry.requestId,
      details: entry.details,
      timestamp:
        entry.timestamp instanceof Date
          ? entry.timestamp.toISOString()
          : entry.timestamp || new Date().toISOString(),
    });
  }

  /**
   * Log ticket update
   */
  logTicketUpdate(entry: UpdateAuditEntry): void {
    logger.info('Audit: Ticket updated', {
      operation: AuditOperation.UPDATE_TICKET,
      userId: entry.userId,
      ticketId: entry.ticketId,
      requestId: entry.requestId,
      changedFields: entry.details.changedFields,
      changes: entry.details.changes,
      timestamp:
        entry.timestamp instanceof Date
          ? entry.timestamp.toISOString()
          : entry.timestamp || new Date().toISOString(),
    });
  }

  /**
   * Log state transition
   */
  logStateTransition(entry: StateTransitionAuditEntry): void {
    logger.info('Audit: Ticket state transition', {
      operation: AuditOperation.STATE_TRANSITION,
      userId: entry.userId,
      ticketId: entry.ticketId,
      requestId: entry.requestId,
      oldState: entry.details.oldState,
      newState: entry.details.newState,
      timestamp:
        entry.timestamp instanceof Date
          ? entry.timestamp.toISOString()
          : entry.timestamp || new Date().toISOString(),
    });
  }

  /**
   * Log ticket assignment
   */
  logAssignment(entry: AssignmentAuditEntry): void {
    logger.info('Audit: Ticket assigned', {
      operation: AuditOperation.ASSIGN_TICKET,
      userId: entry.userId,
      ticketId: entry.ticketId,
      requestId: entry.requestId,
      oldAssignee: entry.details.oldAssignee,
      newAssignee: entry.details.newAssignee,
      timestamp:
        entry.timestamp instanceof Date
          ? entry.timestamp.toISOString()
          : entry.timestamp || new Date().toISOString(),
    });
  }

  /**
   * Log comment addition
   */
  logCommentAdded(entry: AuditLogEntry): void {
    logger.info('Audit: Comment added', {
      operation: AuditOperation.ADD_COMMENT,
      userId: entry.userId,
      ticketId: entry.ticketId,
      requestId: entry.requestId,
      details: entry.details,
      timestamp:
        entry.timestamp instanceof Date
          ? entry.timestamp.toISOString()
          : entry.timestamp || new Date().toISOString(),
    });
  }

  /**
   * Generic audit log method
   */
  log(entry: AuditLogEntry): void {
    logger.info('Audit log entry', {
      operation: entry.operation,
      userId: entry.userId,
      ticketId: entry.ticketId,
      requestId: entry.requestId,
      details: entry.details,
      timestamp:
        entry.timestamp instanceof Date
          ? entry.timestamp.toISOString()
          : entry.timestamp || new Date().toISOString(),
    });
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
export default auditLogger;
