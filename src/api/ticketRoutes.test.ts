/**
 * Ticket Routes Integration Tests
 *
 * Tests for GET /api/v1/tickets/:id endpoint
 *
 * Requirements:
 * - 3.1: Valid ticket ID retrieves complete ticket with comments
 * - 3.2: Invalid ticket ID format returns 400 Bad Request
 * - 3.3: Non-existent ticket ID returns 404 Not Found
 * - 3.4: Comments returned in chronological order
 * - 3.5: Comment metadata includes author and timestamp
 */

import request from 'supertest';
import express from 'express';
import { ticketService } from '../services/TicketService';
import ticketRoutes from './ticketRoutes';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { requestIdMiddleware } from '../middleware/requestIdMiddleware';
import { Priority, TicketState } from '../models/ticket';
import { NotFoundError, ValidationError } from '../utils/customErrors';
import { ErrorCode } from '../models/errors';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use(requestIdMiddleware);
app.use('/api/v1/tickets', ticketRoutes);
app.use(errorMiddleware);

// Mock the ticket service
jest.mock('../services/TicketService');
const mockedTicketService = ticketService as jest.Mocked<typeof ticketService>;

describe('GET /api/v1/tickets/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 3.1: Valid ticket ID retrieves complete ticket with comments', () => {
    it('should return 200 OK with complete ticket including comments', async () => {
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
        comments: [
          {
            id: '223e4567-e89b-12d3-a456-426614174000',
            ticketId: ticketId,
            text: 'First comment',
            author: 'user1@example.com',
            createdAt: new Date('2024-01-01T01:00:00Z'),
          },
          {
            id: '323e4567-e89b-12d3-a456-426614174000',
            ticketId: ticketId,
            text: 'Second comment',
            author: 'user2@example.com',
            createdAt: new Date('2024-01-01T02:00:00Z'),
          },
        ],
      };

      mockedTicketService.getTicket.mockResolvedValue(mockTicket);

      // Act
      const response = await request(app).get(`/api/v1/tickets/${ticketId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: ticketId,
        title: 'Test ticket',
        description: 'Test description',
        priority: 'High',
        state: 'Open',
        assignee: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        comments: [
          {
            id: '223e4567-e89b-12d3-a456-426614174000',
            ticketId: ticketId,
            text: 'First comment',
            author: 'user1@example.com',
            createdAt: '2024-01-01T01:00:00.000Z',
          },
          {
            id: '323e4567-e89b-12d3-a456-426614174000',
            ticketId: ticketId,
            text: 'Second comment',
            author: 'user2@example.com',
            createdAt: '2024-01-01T02:00:00.000Z',
          },
        ],
      });
      expect(mockedTicketService.getTicket).toHaveBeenCalledWith(ticketId);
      expect(mockedTicketService.getTicket).toHaveBeenCalledTimes(1);
    });

    it('should return ticket with empty comments array when no comments exist', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTicket = {
        id: ticketId,
        title: 'Test ticket',
        description: 'Test description',
        priority: Priority.Medium,
        state: TicketState.InProgress,
        assignee: 'user@example.com',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        comments: [],
      };

      mockedTicketService.getTicket.mockResolvedValue(mockTicket);

      // Act
      const response = await request(app).get(`/api/v1/tickets/${ticketId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.comments).toEqual([]);
    });
  });

  describe('Requirement 3.2 & 3.3: Invalid ticket ID format returns 400 Bad Request', () => {
    it('should return 400 for invalid UUID format', async () => {
      // Arrange
      const invalidId = 'invalid-uuid';
      mockedTicketService.getTicket.mockRejectedValue(
        new ValidationError('Invalid ticket ID format', [
          {
            field: 'id',
            message: 'Ticket ID must be a valid UUID',
            code: 'INVALID_UUID_FORMAT',
          },
        ])
      );

      // Act
      const response = await request(app).get(`/api/v1/tickets/${invalidId}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('Invalid ticket ID format');
      expect(mockedTicketService.getTicket).toHaveBeenCalledWith(invalidId);
    });

    it('should return 400 for malformed UUID', async () => {
      // Arrange
      const malformedId = '123-456-789';
      mockedTicketService.getTicket.mockRejectedValue(
        new ValidationError('Invalid ticket ID format', [
          {
            field: 'id',
            message: 'Ticket ID must be a valid UUID',
            code: 'INVALID_UUID_FORMAT',
          },
        ])
      );

      // Act
      const response = await request(app).get(`/api/v1/tickets/${malformedId}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('Requirement 3.3: Non-existent ticket ID returns 404 Not Found', () => {
    it('should return 404 when ticket does not exist', async () => {
      // Arrange
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';
      mockedTicketService.getTicket.mockRejectedValue(
        new NotFoundError(
          `Ticket with ID '${nonExistentId}' does not exist`,
          ErrorCode.TICKET_NOT_FOUND
        )
      );

      // Act
      const response = await request(app).get(`/api/v1/tickets/${nonExistentId}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
      expect(response.body.error.message).toContain(nonExistentId);
      expect(mockedTicketService.getTicket).toHaveBeenCalledWith(nonExistentId);
    });

    it('should include request ID in error response', async () => {
      // Arrange
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';
      mockedTicketService.getTicket.mockRejectedValue(
        new NotFoundError(
          `Ticket with ID '${nonExistentId}' does not exist`,
          ErrorCode.TICKET_NOT_FOUND
        )
      );

      // Act
      const response = await request(app).get(`/api/v1/tickets/${nonExistentId}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.requestId).toBeDefined();
      expect(response.body.error.timestamp).toBeDefined();
    });
  });

  describe('Requirement 3.4: Comments returned in chronological order', () => {
    it('should return comments in chronological order (oldest first)', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTicket = {
        id: ticketId,
        title: 'Test ticket',
        description: 'Test description',
        priority: Priority.Low,
        state: TicketState.Resolved,
        assignee: 'user@example.com',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        comments: [
          {
            id: '1',
            ticketId: ticketId,
            text: 'First comment',
            author: 'user1@example.com',
            createdAt: new Date('2024-01-01T01:00:00Z'),
          },
          {
            id: '2',
            ticketId: ticketId,
            text: 'Second comment',
            author: 'user2@example.com',
            createdAt: new Date('2024-01-01T02:00:00Z'),
          },
          {
            id: '3',
            ticketId: ticketId,
            text: 'Third comment',
            author: 'user3@example.com',
            createdAt: new Date('2024-01-01T03:00:00Z'),
          },
        ],
      };

      mockedTicketService.getTicket.mockResolvedValue(mockTicket);

      // Act
      const response = await request(app).get(`/api/v1/tickets/${ticketId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.comments).toHaveLength(3);
      
      // Verify chronological order
      const comments = response.body.comments;
      expect(new Date(comments[0].createdAt).getTime()).toBeLessThan(
        new Date(comments[1].createdAt).getTime()
      );
      expect(new Date(comments[1].createdAt).getTime()).toBeLessThan(
        new Date(comments[2].createdAt).getTime()
      );
    });
  });

  describe('Requirement 3.5: Comment metadata includes author and timestamp', () => {
    it('should include author and timestamp in each comment', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTicket = {
        id: ticketId,
        title: 'Test ticket',
        description: 'Test description',
        priority: Priority.Critical,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        comments: [
          {
            id: 'comment-1',
            ticketId: ticketId,
            text: 'Test comment',
            author: 'john.doe@example.com',
            createdAt: new Date('2024-01-01T10:30:00Z'),
          },
        ],
      };

      mockedTicketService.getTicket.mockResolvedValue(mockTicket);

      // Act
      const response = await request(app).get(`/api/v1/tickets/${ticketId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.comments).toHaveLength(1);
      
      const comment = response.body.comments[0];
      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('text');
      expect(comment).toHaveProperty('author');
      expect(comment).toHaveProperty('createdAt');
      
      expect(comment.author).toBe('john.doe@example.com');
      expect(comment.createdAt).toBe('2024-01-01T10:30:00.000Z');
    });

    it('should include all required fields for each comment', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTicket = {
        id: ticketId,
        title: 'Test ticket',
        description: 'Test description',
        priority: Priority.High,
        state: TicketState.InProgress,
        assignee: 'user@example.com',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        comments: [
          {
            id: 'c1',
            ticketId: ticketId,
            text: 'Comment one',
            author: 'alice@example.com',
            createdAt: new Date('2024-01-01T08:00:00Z'),
          },
          {
            id: 'c2',
            ticketId: ticketId,
            text: 'Comment two',
            author: 'bob@example.com',
            createdAt: new Date('2024-01-01T09:00:00Z'),
          },
        ],
      };

      mockedTicketService.getTicket.mockResolvedValue(mockTicket);

      // Act
      const response = await request(app).get(`/api/v1/tickets/${ticketId}`);

      // Assert
      expect(response.status).toBe(200);
      
      response.body.comments.forEach((comment: any) => {
        expect(comment).toHaveProperty('id');
        expect(comment).toHaveProperty('ticketId');
        expect(comment).toHaveProperty('text');
        expect(comment).toHaveProperty('author');
        expect(comment).toHaveProperty('createdAt');
        expect(typeof comment.id).toBe('string');
        expect(typeof comment.text).toBe('string');
        expect(typeof comment.author).toBe('string');
        expect(typeof comment.createdAt).toBe('string');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle internal server errors gracefully', async () => {
      // Arrange
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      mockedTicketService.getTicket.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app).get(`/api/v1/tickets/${ticketId}`);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.timestamp).toBeDefined();
      expect(response.body.error.requestId).toBeDefined();
    });
  });
});
