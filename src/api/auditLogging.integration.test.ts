/**
 * Audit Logging Integration Tests
 *
 * Verifies that audit logging is properly integrated into all state-changing API operations
 *
 * Requirements:
 * - Security 4: Audit logging for all state-changing operations
 * - Task 10.2: Set up audit logging for all state-changing operations
 */

import request from 'supertest';
import express from 'express';
import ticketRoutes from './ticketRoutes';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { requestIdMiddleware } from '../middleware/requestIdMiddleware';
import { ticketRepository } from '../repositories/TicketRepository';
import { commentRepository } from '../repositories/CommentRepository';
import { auditLogger, AuditOperation } from '../utils/auditLogger';
import { TicketState, Priority } from '../models/ticket';

// Mock dependencies
jest.mock('../repositories/TicketRepository');
jest.mock('../repositories/CommentRepository');
jest.mock('../middleware/auth.middleware', () => ({
  authenticateRequest: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-123' };
    req.requestId = 'test-request-123';
    next();
  },
  AuthenticatedRequest: jest.fn(),
}));

// Spy on audit logger methods
const auditLoggerSpy = {
  logTicketCreation: jest.spyOn(auditLogger, 'logTicketCreation'),
  logTicketUpdate: jest.spyOn(auditLogger, 'logTicketUpdate'),
  logStateTransition: jest.spyOn(auditLogger, 'logStateTransition'),
  logAssignment: jest.spyOn(auditLogger, 'logAssignment'),
  logCommentAdded: jest.spyOn(auditLogger, 'logCommentAdded'),
};

// Setup Express app for testing
const app = express();
app.use(express.json());
app.use(requestIdMiddleware);
app.use('/api/v1/tickets', ticketRoutes);
app.use(errorMiddleware);

describe('Audit Logging Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Ticket Creation Audit Logging', () => {
    it('should log ticket creation with user, timestamp, ticket ID, and details', async () => {
      // Mock ticket creation
      const mockTicket = {
        id: 'ticket-123',
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ticketRepository.insertTicket as jest.Mock).mockResolvedValue(mockTicket);
      (ticketRepository.findTicketById as jest.Mock).mockResolvedValue(mockTicket);

      // Create ticket
      await request(app)
        .post('/api/v1/tickets')
        .send({
          title: 'Test Ticket',
          description: 'Test Description',
          priority: 'High',
        })
        .expect(201);

      // Verify audit log was called
      expect(auditLoggerSpy.logTicketCreation).toHaveBeenCalledTimes(1);
      expect(auditLoggerSpy.logTicketCreation).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: AuditOperation.CREATE_TICKET,
          userId: 'test-user-123',
          ticketId: 'ticket-123',
          requestId: 'test-request-123',
          details: expect.objectContaining({
            title: 'Test Ticket',
            description: 'Test Description',
            priority: Priority.High,
            state: TicketState.Open,
          }),
        })
      );
    });
  });

  describe('Ticket Update Audit Logging', () => {
    it('should log ticket updates with user, changed fields, and changes', async () => {
      const oldTicket = {
        id: 'ticket-123',
        title: 'Old Title',
        description: 'Old Description',
        priority: Priority.Low,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };

      const updatedTicket = {
        ...oldTicket,
        title: 'New Title',
        priority: Priority.High,
        updatedAt: new Date(),
      };

      (ticketRepository.findTicketById as jest.Mock).mockResolvedValueOnce(oldTicket);
      (ticketRepository.updateTicket as jest.Mock).mockResolvedValue(updatedTicket);
      (ticketRepository.findTicketById as jest.Mock).mockResolvedValueOnce({
        ...updatedTicket,
        comments: [],
      });
      (commentRepository.findCommentsByTicketId as jest.Mock).mockResolvedValue([]);

      // Update ticket
      await request(app)
        .patch('/api/v1/tickets/ticket-123')
        .send({
          title: 'New Title',
          priority: 'High',
        })
        .expect(200);

      // Verify audit log was called
      expect(auditLoggerSpy.logTicketUpdate).toHaveBeenCalledTimes(1);
      expect(auditLoggerSpy.logTicketUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: AuditOperation.UPDATE_TICKET,
          userId: 'test-user-123',
          ticketId: 'ticket-123',
          requestId: 'test-request-123',
          details: expect.objectContaining({
            changedFields: expect.arrayContaining(['title', 'priority']),
            changes: expect.objectContaining({
              title: { old: 'Old Title', new: 'New Title' },
              priority: { old: Priority.Low, new: Priority.High },
            }),
          }),
        })
      );
    });
  });

  describe('State Transition Audit Logging', () => {
    it('should log state transitions with user, old state, and new state', async () => {
      const currentTicket = {
        id: 'ticket-123',
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };

      const transitionedTicket = {
        ...currentTicket,
        state: TicketState.InProgress,
        updatedAt: new Date(),
      };

      (ticketRepository.findTicketById as jest.Mock)
        .mockResolvedValueOnce(currentTicket)
        .mockResolvedValueOnce({ ...currentTicket, state: TicketState.InProgress });
      (ticketRepository.updateTicket as jest.Mock).mockResolvedValue(transitionedTicket);
      (commentRepository.findCommentsByTicketId as jest.Mock).mockResolvedValue([]);

      // Transition state
      await request(app)
        .patch('/api/v1/tickets/ticket-123/state')
        .send({ state: 'In_Progress' })
        .expect(200);

      // Verify audit log was called
      expect(auditLoggerSpy.logStateTransition).toHaveBeenCalledTimes(1);
      expect(auditLoggerSpy.logStateTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: AuditOperation.STATE_TRANSITION,
          userId: 'test-user-123',
          ticketId: 'ticket-123',
          requestId: expect.any(String),
          details: expect.objectContaining({
            oldState: TicketState.Open,
            newState: TicketState.InProgress,
          }),
        })
      );
    });
  });

  describe('Assignment Audit Logging', () => {
    it('should log assignment operations with user, assignee changes', async () => {
      const ticketBeforeAssignment = {
        id: 'ticket-123',
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };

      const ticketAfterAssignment = {
        ...ticketBeforeAssignment,
        assignee: 'user-456',
        updatedAt: new Date(),
      };

      (ticketRepository.findTicketById as jest.Mock)
        .mockResolvedValueOnce(ticketBeforeAssignment)
        .mockResolvedValueOnce(ticketAfterAssignment);
      (ticketRepository.updateTicket as jest.Mock).mockResolvedValue(ticketAfterAssignment);
      (commentRepository.findCommentsByTicketId as jest.Mock).mockResolvedValue([]);

      // Assign ticket
      await request(app)
        .patch('/api/v1/tickets/ticket-123/assignee')
        .send({ assignee: 'user-456' })
        .expect(200);

      // Verify audit log was called
      expect(auditLoggerSpy.logAssignment).toHaveBeenCalledTimes(1);
      expect(auditLoggerSpy.logAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: AuditOperation.ASSIGN_TICKET,
          userId: 'test-user-123',
          ticketId: 'ticket-123',
          requestId: 'test-request-123',
          details: expect.objectContaining({
            oldAssignee: null,
            newAssignee: 'user-456',
          }),
        })
      );
    });

    it('should log reassignment operations', async () => {
      const ticketBeforeReassignment = {
        id: 'ticket-123',
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: 'user-456',
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };

      const ticketAfterReassignment = {
        ...ticketBeforeReassignment,
        assignee: 'user-789',
        updatedAt: new Date(),
      };

      (ticketRepository.findTicketById as jest.Mock)
        .mockResolvedValueOnce(ticketBeforeReassignment)
        .mockResolvedValueOnce(ticketAfterReassignment);
      (ticketRepository.updateTicket as jest.Mock).mockResolvedValue(ticketAfterReassignment);
      (commentRepository.findCommentsByTicketId as jest.Mock).mockResolvedValue([]);

      // Reassign ticket
      await request(app)
        .patch('/api/v1/tickets/ticket-123/assignee')
        .send({ assignee: 'user-789' })
        .expect(200);

      // Verify audit log was called
      expect(auditLoggerSpy.logAssignment).toHaveBeenCalledTimes(1);
      expect(auditLoggerSpy.logAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: AuditOperation.ASSIGN_TICKET,
          userId: 'test-user-123',
          ticketId: 'ticket-123',
          requestId: 'test-request-123',
          details: expect.objectContaining({
            oldAssignee: 'user-456',
            newAssignee: 'user-789',
          }),
        })
      );
    });

    it('should log unassignment operations', async () => {
      const ticketBeforeUnassignment = {
        id: 'ticket-123',
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: 'user-456',
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };

      const ticketAfterUnassignment = {
        ...ticketBeforeUnassignment,
        assignee: null,
        updatedAt: new Date(),
      };

      (ticketRepository.findTicketById as jest.Mock)
        .mockResolvedValueOnce(ticketBeforeUnassignment)
        .mockResolvedValueOnce(ticketAfterUnassignment);
      (ticketRepository.updateTicket as jest.Mock).mockResolvedValue(ticketAfterUnassignment);
      (commentRepository.findCommentsByTicketId as jest.Mock).mockResolvedValue([]);

      // Unassign ticket
      await request(app)
        .patch('/api/v1/tickets/ticket-123/assignee')
        .send({ assignee: null })
        .expect(200);

      // Verify audit log was called
      expect(auditLoggerSpy.logAssignment).toHaveBeenCalledTimes(1);
      expect(auditLoggerSpy.logAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: AuditOperation.ASSIGN_TICKET,
          userId: 'test-user-123',
          ticketId: 'ticket-123',
          requestId: 'test-request-123',
          details: expect.objectContaining({
            oldAssignee: 'user-456',
            newAssignee: null,
          }),
        })
      );
    });
  });

  describe('Comment Addition Audit Logging', () => {
    it('should log comment additions with user, ticket ID, comment ID', async () => {
      const mockTicket = {
        id: 'ticket-123',
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };

      const mockComment = {
        id: 'comment-456',
        ticketId: 'ticket-123',
        text: 'Test comment',
        author: 'test-user-123',
        createdAt: new Date(),
      };

      (ticketRepository.findTicketById as jest.Mock).mockResolvedValue(mockTicket);
      (commentRepository.insertComment as jest.Mock).mockResolvedValue(mockComment);

      // Add comment
      await request(app)
        .post('/api/v1/tickets/ticket-123/comments')
        .send({
          text: 'Test comment',
          author: 'test-user-123',
        })
        .expect(201);

      // Verify audit log was called
      expect(auditLoggerSpy.logCommentAdded).toHaveBeenCalledTimes(1);
      expect(auditLoggerSpy.logCommentAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: AuditOperation.ADD_COMMENT,
          userId: 'test-user-123',
          ticketId: 'ticket-123',
          requestId: 'test-request-123',
          details: expect.objectContaining({
            commentId: 'comment-456',
            text: 'Test comment',
            author: 'test-user-123',
          }),
        })
      );
    });
  });

  describe('Audit Log Entry Completeness', () => {
    it('should include all required audit fields for every operation', async () => {
      const mockTicket = {
        id: 'ticket-123',
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ticketRepository.insertTicket as jest.Mock).mockResolvedValue(mockTicket);
      (ticketRepository.findTicketById as jest.Mock).mockResolvedValue(mockTicket);

      // Create ticket
      await request(app)
        .post('/api/v1/tickets')
        .send({
          title: 'Test Ticket',
          description: 'Test Description',
          priority: 'High',
        })
        .expect(201);

      // Verify all required fields are present
      const auditCalls = auditLoggerSpy.logTicketCreation.mock.calls;
      expect(auditCalls.length).toBeGreaterThan(0);
      const auditCall = auditCalls[0]?.[0];
      
      expect(auditCall).toBeDefined();
      if (!auditCall) return; // Type guard for TypeScript
      
      // Required fields per task 10.2
      expect(auditCall).toHaveProperty('operation');
      expect(auditCall).toHaveProperty('userId');
      expect(auditCall).toHaveProperty('ticketId');
      expect(auditCall).toHaveProperty('requestId');
      expect(auditCall).toHaveProperty('details');

      // Verify userId is captured from authentication
      expect(auditCall.userId).toBe('test-user-123');
      
      // Verify requestId is captured from request middleware
      expect(auditCall.requestId).toBe('test-request-123');
      
      // Verify operation type is correct
      expect(auditCall.operation).toBe(AuditOperation.CREATE_TICKET);
    });
  });
});
