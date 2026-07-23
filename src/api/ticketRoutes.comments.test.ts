/**
 * Ticket Routes Comments Integration Tests
 *
 * Tests for POST /api/v1/tickets/:id/comments endpoint
 *
 * Requirements:
 * - 6.1: Create Comment record associated with specified Ticket_ID
 * - 6.2: Capture comment text, author identifier, and timestamp
 * - 6.3: Persist Comment to Data_Store
 * - 6.4: Reject comment submission for non-existent Ticket_ID
 * - 6.5: Reject comment with empty or whitespace-only text
 * - 6.6: Return complete Comment object when successfully added
 */

import request from 'supertest';
import express from 'express';
import { ticketService } from '../services/TicketService';
import { commentRepository } from '../repositories/CommentRepository';
import ticketRoutes from './ticketRoutes';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { requestIdMiddleware } from '../middleware/requestIdMiddleware';
import { authenticateRequest } from '../middleware/auth.middleware';
import { Priority, TicketState } from '../models/ticket';
import { NotFoundError } from '../utils/customErrors';
import { ErrorCode } from '../models/errors';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use(requestIdMiddleware);
app.use('/api/v1/tickets', ticketRoutes);
app.use(errorMiddleware);

// Mock the services
jest.mock('../services/TicketService');
jest.mock('../repositories/CommentRepository');
jest.mock('../middleware/auth.middleware');

const mockedTicketService = ticketService as jest.Mocked<typeof ticketService>;
const mockedCommentRepository = commentRepository as jest.Mocked<typeof commentRepository>;
const mockedAuthMiddleware = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;

describe('POST /api/v1/tickets/:id/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware to pass through
    mockedAuthMiddleware.mockImplementation((req, _res, next) => {
      (req as any).user = { id: 'test-user-123' };
      (req as any).requestId = 'test-request-123';
      next();
    });
  });

  describe('Requirement 6.1, 6.2, 6.3, 6.6: Successfully add comment to ticket', () => {
    it('should return 201 Created with complete comment object', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTicket = {
        id: ticketId,
        title: 'Test ticket',
        description: 'Test description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        comments: [],
      };

      const commentRequest = {
        text: 'This is a test comment',
        author: 'user1@example.com',
      };

      const mockComment = {
        id: '223e4567-e89b-12d3-a456-426614174000',
        ticketId: ticketId,
        text: commentRequest.text,
        author: commentRequest.author,
        createdAt: new Date('2024-01-01T01:00:00Z'),
      };

      mockedTicketService.getTicket.mockResolvedValue(mockTicket);
      mockedCommentRepository.insertComment.mockResolvedValue(mockComment);

      // Act
      const response = await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .send(commentRequest);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: mockComment.id,
        ticketId: ticketId,
        text: commentRequest.text,
        author: commentRequest.author,
        createdAt: mockComment.createdAt.toISOString(),
      });

      // Verify service was called to check ticket exists
      expect(mockedTicketService.getTicket).toHaveBeenCalledWith(ticketId);

      // Verify repository was called to insert comment
      expect(mockedCommentRepository.insertComment).toHaveBeenCalledWith({
        ticketId,
        text: commentRequest.text,
        author: commentRequest.author,
      });
    });

    it('should capture comment text, author, and timestamp', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTicket = {
        id: ticketId,
        title: 'Test ticket',
        description: 'Test description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        comments: [],
      };

      const commentRequest = {
        text: 'Another test comment',
        author: 'user2@example.com',
      };

      const mockComment = {
        id: '323e4567-e89b-12d3-a456-426614174000',
        ticketId: ticketId,
        text: commentRequest.text,
        author: commentRequest.author,
        createdAt: new Date('2024-01-02T10:30:00Z'),
      };

      mockedTicketService.getTicket.mockResolvedValue(mockTicket);
      mockedCommentRepository.insertComment.mockResolvedValue(mockComment);

      // Act
      const response = await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .send(commentRequest);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.text).toBe(commentRequest.text);
      expect(response.body.author).toBe(commentRequest.author);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.ticketId).toBe(ticketId);
    });
  });

  describe('Requirement 6.4: Reject comment for non-existent ticket', () => {
    it('should return 404 Not Found when ticket does not exist', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const commentRequest = {
        text: 'Comment for non-existent ticket',
        author: 'user1@example.com',
      };

      mockedTicketService.getTicket.mockRejectedValue(
        new NotFoundError(`Ticket with ID '${ticketId}' does not exist`, ErrorCode.TICKET_NOT_FOUND)
      );

      // Act
      const response = await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .send(commentRequest);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
      expect(response.body.error.message).toContain(`Ticket with ID '${ticketId}' does not exist`);

      // Verify comment was not inserted
      expect(mockedCommentRepository.insertComment).not.toHaveBeenCalled();
    });

    it('should return 400 Bad Request for invalid ticket ID format', async () => {
      // Arrange
      const invalidTicketId = 'not-a-uuid';
      const commentRequest = {
        text: 'Comment for invalid ticket ID',
        author: 'user1@example.com',
      };

      // Act
      const response = await request(app)
        .post(`/api/v1/tickets/${invalidTicketId}/comments`)
        .send(commentRequest);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Invalid ticket ID format');

      // Verify ticket service was not called
      expect(mockedTicketService.getTicket).not.toHaveBeenCalled();
      expect(mockedCommentRepository.insertComment).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 6.5: Reject comment with empty or whitespace-only text', () => {
    it('should return 400 Bad Request for empty text', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const commentRequest = {
        text: '',
        author: 'user1@example.com',
      };

      // Act
      const response = await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .send(commentRequest);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Validation failed');

      // Verify services were not called
      expect(mockedTicketService.getTicket).not.toHaveBeenCalled();
      expect(mockedCommentRepository.insertComment).not.toHaveBeenCalled();
    });

    it('should return 400 Bad Request for whitespace-only text', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const commentRequest = {
        text: '   \t\n   ',
        author: 'user1@example.com',
      };

      // Act
      const response = await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .send(commentRequest);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Validation failed');
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details.some((d: any) => d.message.includes('whitespace'))).toBe(true);

      // Verify services were not called
      expect(mockedTicketService.getTicket).not.toHaveBeenCalled();
      expect(mockedCommentRepository.insertComment).not.toHaveBeenCalled();
    });

    it('should return 400 Bad Request for missing text field', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const commentRequest = {
        author: 'user1@example.com',
        // text field missing
      };

      // Act
      const response = await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .send(commentRequest);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Validation failed');

      // Verify services were not called
      expect(mockedTicketService.getTicket).not.toHaveBeenCalled();
      expect(mockedCommentRepository.insertComment).not.toHaveBeenCalled();
    });

    it('should return 400 Bad Request for missing author field', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const commentRequest = {
        text: 'This is a comment',
        // author field missing
      };

      // Act
      const response = await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .send(commentRequest);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Validation failed');

      // Verify services were not called
      expect(mockedTicketService.getTicket).not.toHaveBeenCalled();
      expect(mockedCommentRepository.insertComment).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle comments at maximum length (2000 characters)', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const longText = 'a'.repeat(2000);
      const commentRequest = {
        text: longText,
        author: 'user1@example.com',
      };

      const mockTicket = {
        id: ticketId,
        title: 'Test ticket',
        description: 'Test description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        comments: [],
      };

      const mockComment = {
        id: '223e4567-e89b-12d3-a456-426614174000',
        ticketId: ticketId,
        text: longText,
        author: commentRequest.author,
        createdAt: new Date('2024-01-01T01:00:00Z'),
      };

      mockedTicketService.getTicket.mockResolvedValue(mockTicket);
      mockedCommentRepository.insertComment.mockResolvedValue(mockComment);

      // Act
      const response = await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .send(commentRequest);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.text).toBe(longText);
    });

    it('should reject comments exceeding maximum length (>2000 characters)', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const tooLongText = 'a'.repeat(2001);
      const commentRequest = {
        text: tooLongText,
        author: 'user1@example.com',
      };

      // Act
      const response = await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .send(commentRequest);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Validation failed');

      // Verify services were not called
      expect(mockedTicketService.getTicket).not.toHaveBeenCalled();
      expect(mockedCommentRepository.insertComment).not.toHaveBeenCalled();
    });

    it('should handle comments with special characters and Unicode', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const specialText = 'Comment with special chars: @#$%^&*() and Unicode: 你好 🎉';
      const commentRequest = {
        text: specialText,
        author: 'user1@example.com',
      };

      const mockTicket = {
        id: ticketId,
        title: 'Test ticket',
        description: 'Test description',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        comments: [],
      };

      const mockComment = {
        id: '223e4567-e89b-12d3-a456-426614174000',
        ticketId: ticketId,
        text: specialText,
        author: commentRequest.author,
        createdAt: new Date('2024-01-01T01:00:00Z'),
      };

      mockedTicketService.getTicket.mockResolvedValue(mockTicket);
      mockedCommentRepository.insertComment.mockResolvedValue(mockComment);

      // Act
      const response = await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .send(commentRequest);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.text).toBe(specialText);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      // Arrange - Mock authentication to fail and not call next()
      mockedAuthMiddleware.mockImplementationOnce((_req, res, _next) => {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        // Don't call next() to stop the request chain
      });

      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const commentRequest = {
        text: 'Comment without auth',
        author: 'user1@example.com',
      };

      // Act
      const response = await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .send(commentRequest);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });
});
