/**
 * Unit tests for PATCH /api/v1/tickets/:id/assignee endpoint
 *
 * Tests Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import request from 'supertest';
import express from 'express';
import { ticketService } from '../services/TicketService';
import ticketRoutes from './ticketRoutes';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { requestIdMiddleware } from '../middleware/requestIdMiddleware';
import { authenticateRequest } from '../middleware/auth.middleware';
import { Priority, TicketState } from '../models/ticket';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/customErrors';
import { ErrorCode } from '../models/errors';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use(requestIdMiddleware);
app.use('/api/v1/tickets', ticketRoutes);
app.use(errorMiddleware);

// Mock the services
jest.mock('../services/TicketService');
jest.mock('../middleware/auth.middleware');

const mockedTicketService = ticketService as jest.Mocked<typeof ticketService>;
const mockedAuthMiddleware = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;

describe('PATCH /api/v1/tickets/:id/assignee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware to pass through
    mockedAuthMiddleware.mockImplementation((req, _res, next) => {
      (req as any).user = { id: 'test-user-123' };
      (req as any).requestId = 'test-request-123';
      next();
    });
  });

  describe('Requirement 5.1, 5.2, 5.7: Successfully assign ticket', () => {
    it('should return 200 OK and update assignee field', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTicketBefore = {
        id: ticketId,
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };
      const mockTicketAfter = {
        ...mockTicketBefore,
        assignee: 'john.doe@example.com',
      };

      mockedTicketService.getTicket.mockResolvedValueOnce(mockTicketBefore);
      mockedTicketService.assignTicket.mockResolvedValueOnce(mockTicketAfter);

      // Act
      const response = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .send({ assignee: 'john.doe@example.com' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: ticketId,
        title: 'Test Ticket',
        assignee: 'john.doe@example.com',
      });
      expect(mockedTicketService.assignTicket).toHaveBeenCalledWith(ticketId, {
        assignee: 'john.doe@example.com',
      });
    });
  });

  describe('Requirement 5.5: Support reassignment', () => {
    it('should allow changing assignee to a different user', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTicketBefore = {
        id: ticketId,
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.High,
        state: TicketState.InProgress,
        assignee: 'user1@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };
      const mockTicketAfter = {
        ...mockTicketBefore,
        assignee: 'user2@example.com',
      };

      mockedTicketService.getTicket.mockResolvedValueOnce(mockTicketBefore);
      mockedTicketService.assignTicket.mockResolvedValueOnce(mockTicketAfter);

      // Act
      const response = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .send({ assignee: 'user2@example.com' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('user2@example.com');
    });
  });

  describe('Requirement 5.6: Support unassignment', () => {
    it('should allow setting assignee to null', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTicketBefore = {
        id: ticketId,
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.Medium,
        state: TicketState.Open,
        assignee: 'user1@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };
      const mockTicketAfter = {
        ...mockTicketBefore,
        assignee: null,
      };

      mockedTicketService.getTicket.mockResolvedValueOnce(mockTicketBefore);
      mockedTicketService.assignTicket.mockResolvedValueOnce(mockTicketAfter);

      // Act
      const response = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .send({ assignee: null });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.assignee).toBeNull();
    });
  });

  describe('Requirement 5.3: Reject assignment for non-existent ticket', () => {
    it('should return 404 Not Found for non-existent ticket ID', async () => {
      // Arrange
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      mockedTicketService.getTicket.mockRejectedValueOnce(
        new NotFoundError(`Ticket with ID '${nonExistentId}' does not exist`, ErrorCode.TICKET_NOT_FOUND)
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/tickets/${nonExistentId}/assignee`)
        .send({ assignee: 'user@example.com' });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
    });

    it('should return 400 Bad Request for invalid ticket ID format', async () => {
      // Arrange - getTicket will be called first and will throw validation error for invalid UUID
      mockedTicketService.getTicket.mockRejectedValueOnce(
        new ValidationError('Invalid ticket ID format', [
          { field: 'id', message: 'Ticket ID must be a valid UUID', code: ErrorCode.INVALID_UUID_FORMAT },
        ])
      );

      // Act
      const response = await request(app)
        .patch('/api/v1/tickets/invalid-id/assignee')
        .send({ assignee: 'user@example.com' });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('Requirement 5.4: Reject invalid assignee identifier', () => {
    it('should return 400 Bad Request for invalid assignee format', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTicket = {
        id: ticketId,
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };

      mockedTicketService.getTicket.mockResolvedValueOnce(mockTicket);
      mockedTicketService.assignTicket.mockRejectedValueOnce(
        new ValidationError('Validation failed for assignment request', [
          {
            field: 'assignee',
            message: 'Assignee identifier must be a valid email, username (alphanumeric with ._-), or UUID',
            code: ErrorCode.INVALID_ASSIGNEE,
          },
        ])
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .send({ assignee: '!!!invalid!!!' });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('Business Rule BR-7: Cannot assign terminal state tickets', () => {
    it('should return 403 Forbidden for Closed ticket', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTicketClosed = {
        id: ticketId,
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.High,
        state: TicketState.Closed,
        assignee: 'user1@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };

      mockedTicketService.getTicket.mockResolvedValueOnce(mockTicketClosed);
      mockedTicketService.assignTicket.mockRejectedValueOnce(
        new ForbiddenError(
          `Cannot assign ticket in terminal state ${TicketState.Closed}`,
          ErrorCode.CANNOT_MODIFY_TERMINAL
        )
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .send({ assignee: 'user2@example.com' });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CANNOT_MODIFY_TERMINAL');
    });

    it('should return 403 Forbidden for Cancelled ticket', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTicketCancelled = {
        id: ticketId,
        title: 'Test Ticket',
        description: 'Test Description',
        priority: Priority.Low,
        state: TicketState.Cancelled,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };

      mockedTicketService.getTicket.mockResolvedValueOnce(mockTicketCancelled);
      mockedTicketService.assignTicket.mockRejectedValueOnce(
        new ForbiddenError(
          `Cannot assign ticket in terminal state ${TicketState.Cancelled}`,
          ErrorCode.CANNOT_MODIFY_TERMINAL
        )
      );

      // Act
      const response = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/assignee`)
        .send({ assignee: 'user@example.com' });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CANNOT_MODIFY_TERMINAL');
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      // Temporarily mock authentication to fail and not call next()
      mockedAuthMiddleware.mockImplementationOnce((_req, res, _next) => {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        // Don't call next() to stop the request chain
      });

      const response = await request(app)
        .patch('/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/assignee')
        .send({ assignee: 'user@example.com' });

      expect(response.status).toBe(401);
    });
  });
});
