import auditLogger, {
  AuditOperation,
  AuditLogEntry,
  StateTransitionAuditEntry,
  AssignmentAuditEntry,
  UpdateAuditEntry,
} from './auditLogger';
import logger from './logger';

// Mock the logger
jest.mock('./logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('AuditLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logTicketCreation', () => {
    it('should log ticket creation with all required fields', () => {
      const entry: AuditLogEntry = {
        operation: AuditOperation.CREATE_TICKET,
        userId: 'user-123',
        ticketId: 'ticket-456',
        requestId: 'req-789',
        details: { title: 'Test Ticket', priority: 'High' },
      };

      auditLogger.logTicketCreation(entry);

      expect(logger.info).toHaveBeenCalledWith(
        'Audit: Ticket created',
        expect.objectContaining({
          operation: AuditOperation.CREATE_TICKET,
          userId: 'user-123',
          ticketId: 'ticket-456',
          requestId: 'req-789',
          details: entry.details,
          timestamp: expect.any(String),
        })
      );
    });

    it('should use provided timestamp if available', () => {
      const timestamp = new Date('2024-01-15T10:00:00Z');
      const entry: AuditLogEntry = {
        operation: AuditOperation.CREATE_TICKET,
        userId: 'user-123',
        ticketId: 'ticket-456',
        timestamp,
      };

      auditLogger.logTicketCreation(entry);

      expect(logger.info).toHaveBeenCalledWith(
        'Audit: Ticket created',
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('logTicketUpdate', () => {
    it('should log ticket update with changed fields and changes', () => {
      const entry: UpdateAuditEntry = {
        operation: AuditOperation.UPDATE_TICKET,
        userId: 'user-123',
        ticketId: 'ticket-456',
        requestId: 'req-789',
        details: {
          changedFields: ['title', 'priority'],
          changes: {
            title: { old: 'Old Title', new: 'New Title' },
            priority: { old: 'Low', new: 'High' },
          },
        },
      };

      auditLogger.logTicketUpdate(entry);

      expect(logger.info).toHaveBeenCalledWith(
        'Audit: Ticket updated',
        expect.objectContaining({
          operation: AuditOperation.UPDATE_TICKET,
          userId: 'user-123',
          ticketId: 'ticket-456',
          requestId: 'req-789',
          changedFields: ['title', 'priority'],
          changes: entry.details.changes,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('logStateTransition', () => {
    it('should log state transition with old and new states', () => {
      const entry: StateTransitionAuditEntry = {
        operation: AuditOperation.STATE_TRANSITION,
        userId: 'user-123',
        ticketId: 'ticket-456',
        requestId: 'req-789',
        details: {
          oldState: 'Open',
          newState: 'In_Progress',
        },
      };

      auditLogger.logStateTransition(entry);

      expect(logger.info).toHaveBeenCalledWith(
        'Audit: Ticket state transition',
        expect.objectContaining({
          operation: AuditOperation.STATE_TRANSITION,
          userId: 'user-123',
          ticketId: 'ticket-456',
          requestId: 'req-789',
          oldState: 'Open',
          newState: 'In_Progress',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('logAssignment', () => {
    it('should log ticket assignment with old and new assignees', () => {
      const entry: AssignmentAuditEntry = {
        operation: AuditOperation.ASSIGN_TICKET,
        userId: 'user-123',
        ticketId: 'ticket-456',
        requestId: 'req-789',
        details: {
          oldAssignee: null,
          newAssignee: 'assignee-999',
        },
      };

      auditLogger.logAssignment(entry);

      expect(logger.info).toHaveBeenCalledWith(
        'Audit: Ticket assigned',
        expect.objectContaining({
          operation: AuditOperation.ASSIGN_TICKET,
          userId: 'user-123',
          ticketId: 'ticket-456',
          requestId: 'req-789',
          oldAssignee: null,
          newAssignee: 'assignee-999',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log ticket unassignment (new assignee is null)', () => {
      const entry: AssignmentAuditEntry = {
        operation: AuditOperation.ASSIGN_TICKET,
        userId: 'user-123',
        ticketId: 'ticket-456',
        requestId: 'req-789',
        details: {
          oldAssignee: 'assignee-999',
          newAssignee: null,
        },
      };

      auditLogger.logAssignment(entry);

      expect(logger.info).toHaveBeenCalledWith(
        'Audit: Ticket assigned',
        expect.objectContaining({
          oldAssignee: 'assignee-999',
          newAssignee: null,
        })
      );
    });
  });

  describe('logCommentAdded', () => {
    it('should log comment addition', () => {
      const entry: AuditLogEntry = {
        operation: AuditOperation.ADD_COMMENT,
        userId: 'user-123',
        ticketId: 'ticket-456',
        requestId: 'req-789',
        details: { commentId: 'comment-111', text: 'Test comment' },
      };

      auditLogger.logCommentAdded(entry);

      expect(logger.info).toHaveBeenCalledWith(
        'Audit: Comment added',
        expect.objectContaining({
          operation: AuditOperation.ADD_COMMENT,
          userId: 'user-123',
          ticketId: 'ticket-456',
          requestId: 'req-789',
          details: entry.details,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('log (generic)', () => {
    it('should log generic audit entry', () => {
      const entry: AuditLogEntry = {
        operation: AuditOperation.CREATE_TICKET,
        userId: 'user-123',
        ticketId: 'ticket-456',
        requestId: 'req-789',
        details: { custom: 'data' },
      };

      auditLogger.log(entry);

      expect(logger.info).toHaveBeenCalledWith(
        'Audit log entry',
        expect.objectContaining({
          operation: AuditOperation.CREATE_TICKET,
          userId: 'user-123',
          ticketId: 'ticket-456',
          requestId: 'req-789',
          details: { custom: 'data' },
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('AuditOperation enum', () => {
    it('should have all required operation types', () => {
      expect(AuditOperation.CREATE_TICKET).toBe('CREATE_TICKET');
      expect(AuditOperation.UPDATE_TICKET).toBe('UPDATE_TICKET');
      expect(AuditOperation.STATE_TRANSITION).toBe('STATE_TRANSITION');
      expect(AuditOperation.ASSIGN_TICKET).toBe('ASSIGN_TICKET');
      expect(AuditOperation.ADD_COMMENT).toBe('ADD_COMMENT');
    });
  });
});
