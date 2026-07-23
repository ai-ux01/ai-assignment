/**
 * Ticket Routes Filter Integration Tests
 *
 * Tests for GET /api/v1/tickets/filter endpoint
 *
 * Requirements:
 * - 8.1: Filter returns all tickets matching specified state
 * - 8.2: Support filtering by all states (Open, In_Progress, Resolved, Closed, Cancelled)
 * - 8.3: Empty list when no tickets match
 * - 8.4: Invalid state value returns 400 Bad Request
 * - 8.5: Filtered tickets include all required fields
 * - 8.6: Support concurrent filter operations
 */

import request from 'supertest';
import express from 'express';
import { searchService } from '../services/SearchService';
import ticketRoutes from './ticketRoutes';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { requestIdMiddleware } from '../middleware/requestIdMiddleware';
import { Priority, TicketState } from '../models/ticket';
import { ValidationError } from '../utils/customErrors';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use(requestIdMiddleware);
app.use('/api/v1/tickets', ticketRoutes);
app.use(errorMiddleware);

// Mock the search service
jest.mock('../services/SearchService');
const mockedSearchService = searchService as jest.Mocked<typeof searchService>;

describe('GET /api/v1/tickets/filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 8.1: Filter returns all tickets matching specified state', () => {
    it('should return 200 OK with tickets matching the specified state', async () => {
      // Arrange
      const mockTickets = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Open ticket 1',
          description: 'Description 1',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174000',
          title: 'Open ticket 2',
          description: 'Description 2',
          priority: Priority.Medium,
          state: TicketState.Open,
          assignee: 'user@example.com',
          createdAt: new Date('2024-01-02T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        },
      ];

      mockedSearchService.filterByState.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=Open');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tickets');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('filter');
      expect(response.body.tickets).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(response.body.filter).toBe('Open');
      expect(mockedSearchService.filterByState).toHaveBeenCalledWith(TicketState.Open);
      expect(mockedSearchService.filterByState).toHaveBeenCalledTimes(1);
    });

    it('should return correct tickets for In_Progress state', async () => {
      // Arrange
      const mockTickets = [
        {
          id: '323e4567-e89b-12d3-a456-426614174000',
          title: 'In progress ticket',
          description: 'Working on it',
          priority: Priority.Critical,
          state: TicketState.InProgress,
          assignee: 'dev@example.com',
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-03T00:00:00Z'),
        },
      ];

      mockedSearchService.filterByState.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=In_Progress');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(1);
      expect(response.body.tickets[0].state).toBe('In_Progress');
      expect(response.body.filter).toBe('In_Progress');
      expect(mockedSearchService.filterByState).toHaveBeenCalledWith(TicketState.InProgress);
    });
  });

  describe('Requirement 8.2: Support filtering by all states', () => {
    it('should support filtering by Open state', async () => {
      // Arrange
      mockedSearchService.filterByState.mockResolvedValue([]);

      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=Open');

      // Assert
      expect(response.status).toBe(200);
      expect(mockedSearchService.filterByState).toHaveBeenCalledWith(TicketState.Open);
    });

    it('should support filtering by In_Progress state', async () => {
      // Arrange
      mockedSearchService.filterByState.mockResolvedValue([]);

      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=In_Progress');

      // Assert
      expect(response.status).toBe(200);
      expect(mockedSearchService.filterByState).toHaveBeenCalledWith(TicketState.InProgress);
    });

    it('should support filtering by Resolved state', async () => {
      // Arrange
      mockedSearchService.filterByState.mockResolvedValue([]);

      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=Resolved');

      // Assert
      expect(response.status).toBe(200);
      expect(mockedSearchService.filterByState).toHaveBeenCalledWith(TicketState.Resolved);
    });

    it('should support filtering by Closed state', async () => {
      // Arrange
      mockedSearchService.filterByState.mockResolvedValue([]);

      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=Closed');

      // Assert
      expect(response.status).toBe(200);
      expect(mockedSearchService.filterByState).toHaveBeenCalledWith(TicketState.Closed);
    });

    it('should support filtering by Cancelled state', async () => {
      // Arrange
      mockedSearchService.filterByState.mockResolvedValue([]);

      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=Cancelled');

      // Assert
      expect(response.status).toBe(200);
      expect(mockedSearchService.filterByState).toHaveBeenCalledWith(TicketState.Cancelled);
    });
  });

  describe('Requirement 8.3: Empty list when no tickets match', () => {
    it('should return empty list when no tickets match the filter', async () => {
      // Arrange
      mockedSearchService.filterByState.mockResolvedValue([]);

      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=Closed');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets).toEqual([]);
      expect(response.body.count).toBe(0);
      expect(response.body.filter).toBe('Closed');
    });

    it('should return empty list with proper structure', async () => {
      // Arrange
      mockedSearchService.filterByState.mockResolvedValue([]);

      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=Resolved');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tickets');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('filter');
      expect(Array.isArray(response.body.tickets)).toBe(true);
    });
  });

  describe('Requirement 8.4: Invalid state value returns 400 Bad Request', () => {
    it('should return 400 for invalid state value', async () => {
      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=InvalidState');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_STATE');
      expect(response.body.error.message).toContain('Invalid state value');
      expect(response.body.error.message).toContain('Open');
      expect(response.body.error.message).toContain('In_Progress');
      expect(response.body.error.message).toContain('Resolved');
      expect(response.body.error.message).toContain('Closed');
      expect(response.body.error.message).toContain('Cancelled');
      expect(mockedSearchService.filterByState).not.toHaveBeenCalled();
    });

    it('should return 400 when state parameter is missing', async () => {
      // Act
      const response = await request(app).get('/api/v1/tickets/filter');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('State query parameter is required');
      expect(mockedSearchService.filterByState).not.toHaveBeenCalled();
    });

    it('should return 400 for empty state parameter', async () => {
      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(mockedSearchService.filterByState).not.toHaveBeenCalled();
    });

    it('should include timestamp and requestId in error response', async () => {
      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=BadState');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.timestamp).toBeDefined();
      expect(response.body.error.requestId).toBeDefined();
    });
  });

  describe('Requirement 8.5: Filtered tickets include all required fields', () => {
    it('should return tickets with all required fields', async () => {
      // Arrange
      const mockTickets = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test ticket',
          description: 'Test description',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: 'user@example.com',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T01:00:00Z'),
        },
      ];

      mockedSearchService.filterByState.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=Open');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(1);
      
      const ticket = response.body.tickets[0];
      expect(ticket).toHaveProperty('id');
      expect(ticket).toHaveProperty('title');
      expect(ticket).toHaveProperty('description');
      expect(ticket).toHaveProperty('priority');
      expect(ticket).toHaveProperty('state');
      expect(ticket).toHaveProperty('assignee');
      expect(ticket).toHaveProperty('createdAt');
      expect(ticket).toHaveProperty('updatedAt');
      
      expect(typeof ticket.id).toBe('string');
      expect(typeof ticket.title).toBe('string');
      expect(typeof ticket.description).toBe('string');
      expect(typeof ticket.priority).toBe('string');
      expect(typeof ticket.state).toBe('string');
      expect(typeof ticket.createdAt).toBe('string');
      expect(typeof ticket.updatedAt).toBe('string');
    });

    it('should handle tickets with null assignee', async () => {
      // Arrange
      const mockTickets = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Unassigned ticket',
          description: 'Not assigned yet',
          priority: Priority.Low,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      mockedSearchService.filterByState.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=Open');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets[0].assignee).toBeNull();
    });
  });

  describe('Requirement 8.6: Support concurrent filter operations', () => {
    it('should handle concurrent filter requests', async () => {
      // Arrange
      const mockOpenTickets = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Open ticket',
          description: 'Description',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      const mockClosedTickets = [
        {
          id: '223e4567-e89b-12d3-a456-426614174000',
          title: 'Closed ticket',
          description: 'Description',
          priority: Priority.Low,
          state: TicketState.Closed,
          assignee: 'user@example.com',
          createdAt: new Date('2024-01-02T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        },
      ];

      mockedSearchService.filterByState.mockImplementation((state) => {
        if (state === TicketState.Open) {
          return Promise.resolve(mockOpenTickets);
        } else if (state === TicketState.Closed) {
          return Promise.resolve(mockClosedTickets);
        }
        return Promise.resolve([]);
      });

      // Act - Make concurrent requests
      const [response1, response2] = await Promise.all([
        request(app).get('/api/v1/tickets/filter?state=Open'),
        request(app).get('/api/v1/tickets/filter?state=Closed'),
      ]);

      // Assert
      expect(response1.status).toBe(200);
      expect(response1.body.tickets).toHaveLength(1);
      expect(response1.body.tickets[0].state).toBe('Open');
      
      expect(response2.status).toBe(200);
      expect(response2.body.tickets).toHaveLength(1);
      expect(response2.body.tickets[0].state).toBe('Closed');
      
      expect(mockedSearchService.filterByState).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should handle internal server errors gracefully', async () => {
      // Arrange
      mockedSearchService.filterByState.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=Open');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.timestamp).toBeDefined();
      expect(response.body.error.requestId).toBeDefined();
    });

    it('should handle validation errors from service', async () => {
      // Arrange
      mockedSearchService.filterByState.mockRejectedValue(
        new ValidationError('Invalid state filter', [
          {
            field: 'state',
            message: 'State must be a valid TicketState value',
            code: 'INVALID_STATE',
          },
        ])
      );

      // Act
      const response = await request(app).get('/api/v1/tickets/filter?state=Open');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });
  });
});
