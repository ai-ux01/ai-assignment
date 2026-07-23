/**
 * Search Ticket Routes Tests
 *
 * Tests for GET /api/v1/tickets/search endpoint
 *
 * Requirements:
 * - 7.1: Search ticket title and description fields
 * - 7.2: Return all tickets containing the search keyword
 * - 7.3: Perform case-insensitive keyword matching
 * - 7.4: Return empty list when no tickets match
 * - 7.5: Reject empty or whitespace-only keyword
 * - 7.6: Return matching tickets with all core fields
 * - 7.7: Support partial word matching within ticket text
 */

import request from 'supertest';
import express from 'express';
import { searchService } from '../services/SearchService';
import ticketRoutes from './ticketRoutes';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { requestIdMiddleware } from '../middleware/requestIdMiddleware';
import { Priority, TicketState } from '../models/ticket';
import { ValidationError } from '../utils/customErrors';
import { ErrorCode } from '../models/errors';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use(requestIdMiddleware);
app.use('/api/v1/tickets', ticketRoutes);
app.use(errorMiddleware);

// Mock the search service
jest.mock('../services/SearchService');
const mockedSearchService = searchService as jest.Mocked<typeof searchService>;

describe('GET /api/v1/tickets/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 7.1 & 7.2: Search ticket title and description fields', () => {
    it('should return 200 OK with matching tickets from title', async () => {
      // Arrange
      const searchQuery = 'login';
      const mockTickets = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Login issue with SSO',
          description: 'Users cannot authenticate',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          title: 'Login timeout',
          description: 'Session expires too quickly',
          priority: Priority.Medium,
          state: TicketState.InProgress,
          assignee: 'user1@example.com',
          createdAt: new Date('2024-01-02T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        tickets: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Login issue with SSO',
            description: 'Users cannot authenticate',
            priority: 'High',
            state: 'Open',
            assignee: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: '223e4567-e89b-12d3-a456-426614174001',
            title: 'Login timeout',
            description: 'Session expires too quickly',
            priority: 'Medium',
            state: 'In_Progress',
            assignee: 'user1@example.com',
            createdAt: '2024-01-02T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
          },
        ],
        count: 2,
        query: searchQuery,
      });
      expect(mockedSearchService.searchByKeyword).toHaveBeenCalledWith(searchQuery);
      expect(mockedSearchService.searchByKeyword).toHaveBeenCalledTimes(1);
    });

    it('should return 200 OK with matching tickets from description', async () => {
      // Arrange
      const searchQuery = 'database';
      const mockTickets = [
        {
          id: '323e4567-e89b-12d3-a456-426614174002',
          title: 'Performance issue',
          description: 'Database queries are slow',
          priority: Priority.Critical,
          state: TicketState.Open,
          assignee: 'dba@example.com',
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-03T00:00:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(1);
      expect(response.body.tickets[0].description).toContain('Database');
      expect(response.body.count).toBe(1);
      expect(response.body.query).toBe(searchQuery);
    });
  });

  describe('Requirement 7.3: Perform case-insensitive keyword matching', () => {
    it('should find tickets regardless of query case', async () => {
      // Arrange
      const searchQuery = 'ERROR';
      const mockTickets = [
        {
          id: '423e4567-e89b-12d3-a456-426614174003',
          title: 'Error in payment processing',
          description: 'Users seeing error messages',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-04T00:00:00Z'),
          updatedAt: new Date('2024-01-04T00:00:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(1);
      expect(mockedSearchService.searchByKeyword).toHaveBeenCalledWith(searchQuery);
    });

    it('should find tickets with different case variations', async () => {
      // Arrange
      const searchQuery = 'BuG';
      const mockTickets = [
        {
          id: '523e4567-e89b-12d3-a456-426614174004',
          title: 'Bug in user interface',
          description: 'Button not working',
          priority: Priority.Low,
          state: TicketState.Resolved,
          assignee: 'dev@example.com',
          createdAt: new Date('2024-01-05T00:00:00Z'),
          updatedAt: new Date('2024-01-05T00:00:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(1);
    });
  });

  describe('Requirement 7.4: Return empty list when no tickets match', () => {
    it('should return 200 OK with empty tickets array when no matches found', async () => {
      // Arrange
      const searchQuery = 'nonexistent';
      mockedSearchService.searchByKeyword.mockResolvedValue([]);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        tickets: [],
        count: 0,
        query: searchQuery,
      });
      expect(mockedSearchService.searchByKeyword).toHaveBeenCalledWith(searchQuery);
    });

    it('should return empty array for search term with no results', async () => {
      // Arrange
      const searchQuery = 'xyz123nonexistent';
      mockedSearchService.searchByKeyword.mockResolvedValue([]);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets).toEqual([]);
      expect(response.body.count).toBe(0);
    });
  });

  describe('Requirement 7.5: Reject empty or whitespace-only keyword', () => {
    it('should return 400 Bad Request when query parameter is missing', async () => {
      // Act
      const response = await request(app).get('/api/v1/tickets/search');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(response.body.error.message).toContain('Search query parameter "q" is required');
    });

    it('should return 400 Bad Request for empty query string', async () => {
      // Arrange
      mockedSearchService.searchByKeyword.mockRejectedValue(
        new ValidationError('Invalid search query', [
          {
            field: 'query',
            message: 'Search query cannot be empty or whitespace-only',
            code: 'WHITESPACE_ONLY',
          },
        ])
      );

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: '' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe(ErrorCode.INVALID_INPUT);
    });

    it('should return 400 Bad Request for whitespace-only query', async () => {
      // Arrange
      const whitespaceQuery = '   ';
      mockedSearchService.searchByKeyword.mockRejectedValue(
        new ValidationError('Invalid search query', [
          {
            field: 'query',
            message: 'Search query cannot be empty or whitespace-only',
            code: 'WHITESPACE_ONLY',
          },
        ])
      );

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: whitespaceQuery });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe(ErrorCode.INVALID_INPUT);
    });

    it('should return 400 Bad Request for tabs-only query', async () => {
      // Arrange
      const tabsQuery = '\t\t\t';
      mockedSearchService.searchByKeyword.mockRejectedValue(
        new ValidationError('Invalid search query', [
          {
            field: 'query',
            message: 'Search query cannot be empty or whitespace-only',
            code: 'WHITESPACE_ONLY',
          },
        ])
      );

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: tabsQuery });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Requirement 7.6: Return matching tickets with all core fields', () => {
    it('should include all core fields in search results', async () => {
      // Arrange
      const searchQuery = 'test';
      const mockTickets = [
        {
          id: '623e4567-e89b-12d3-a456-426614174005',
          title: 'Test ticket',
          description: 'This is a test description',
          priority: Priority.Medium,
          state: TicketState.Open,
          assignee: 'tester@example.com',
          createdAt: new Date('2024-01-06T10:30:00Z'),
          updatedAt: new Date('2024-01-06T11:45:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets[0]).toHaveProperty('id');
      expect(response.body.tickets[0]).toHaveProperty('title');
      expect(response.body.tickets[0]).toHaveProperty('description');
      expect(response.body.tickets[0]).toHaveProperty('priority');
      expect(response.body.tickets[0]).toHaveProperty('state');
      expect(response.body.tickets[0]).toHaveProperty('assignee');
      expect(response.body.tickets[0]).toHaveProperty('createdAt');
      expect(response.body.tickets[0]).toHaveProperty('updatedAt');
    });

    it('should include null assignee when ticket is unassigned', async () => {
      // Arrange
      const searchQuery = 'unassigned';
      const mockTickets = [
        {
          id: '723e4567-e89b-12d3-a456-426614174006',
          title: 'Unassigned ticket',
          description: 'This ticket has no assignee',
          priority: Priority.Low,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-07T00:00:00Z'),
          updatedAt: new Date('2024-01-07T00:00:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets[0].assignee).toBeNull();
    });
  });

  describe('Requirement 7.7: Support partial word matching within ticket text', () => {
    it('should find tickets with partial word match in title', async () => {
      // Arrange
      const searchQuery = 'auth';
      const mockTickets = [
        {
          id: '823e4567-e89b-12d3-a456-426614174007',
          title: 'Authentication failure',
          description: 'Users cannot log in',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-08T00:00:00Z'),
          updatedAt: new Date('2024-01-08T00:00:00Z'),
        },
        {
          id: '923e4567-e89b-12d3-a456-426614174008',
          title: 'Authorization error',
          description: 'Permission denied',
          priority: Priority.Medium,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-09T00:00:00Z'),
          updatedAt: new Date('2024-01-09T00:00:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    it('should find tickets with partial word match in description', async () => {
      // Arrange
      const searchQuery = 'proc';
      const mockTickets = [
        {
          id: 'a23e4567-e89b-12d3-a456-426614174009',
          title: 'Payment issue',
          description: 'Processing takes too long',
          priority: Priority.Medium,
          state: TicketState.InProgress,
          assignee: 'dev@example.com',
          createdAt: new Date('2024-01-10T00:00:00Z'),
          updatedAt: new Date('2024-01-10T00:00:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(1);
    });
  });

  describe('Additional edge cases', () => {
    it('should handle special characters in search query', async () => {
      // Arrange
      const searchQuery = 'C++';
      const mockTickets = [
        {
          id: 'b23e4567-e89b-12d3-a456-426614174010',
          title: 'C++ compilation error',
          description: 'Build fails',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-11T00:00:00Z'),
          updatedAt: new Date('2024-01-11T00:00:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(1);
    });

    it('should handle numeric search queries', async () => {
      // Arrange
      const searchQuery = '500';
      const mockTickets = [
        {
          id: 'c23e4567-e89b-12d3-a456-426614174011',
          title: 'HTTP 500 error',
          description: 'Server returns 500 status',
          priority: Priority.Critical,
          state: TicketState.Open,
          assignee: 'ops@example.com',
          createdAt: new Date('2024-01-12T00:00:00Z'),
          updatedAt: new Date('2024-01-12T00:00:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(1);
    });

    it('should handle unicode characters in search query', async () => {
      // Arrange
      const searchQuery = 'café';
      const mockTickets = [
        {
          id: 'd23e4567-e89b-12d3-a456-426614174012',
          title: 'Menu issue at café',
          description: 'Items not displaying correctly',
          priority: Priority.Low,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-13T00:00:00Z'),
          updatedAt: new Date('2024-01-13T00:00:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(1);
    });

    it('should return multiple tickets sorted consistently', async () => {
      // Arrange
      const searchQuery = 'error';
      const mockTickets = [
        {
          id: 'e23e4567-e89b-12d3-a456-426614174013',
          title: 'Error 1',
          description: 'First error',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-14T00:00:00Z'),
          updatedAt: new Date('2024-01-14T00:00:00Z'),
        },
        {
          id: 'f23e4567-e89b-12d3-a456-426614174014',
          title: 'Error 2',
          description: 'Second error',
          priority: Priority.Medium,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-15T00:00:00Z'),
          updatedAt: new Date('2024-01-15T00:00:00Z'),
        },
        {
          id: 'g23e4567-e89b-12d3-a456-426614174015',
          title: 'Error 3',
          description: 'Third error',
          priority: Priority.Low,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-16T00:00:00Z'),
          updatedAt: new Date('2024-01-16T00:00:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(3);
      expect(response.body.count).toBe(3);
      expect(response.body.tickets[0].id).toBe('e23e4567-e89b-12d3-a456-426614174013');
      expect(response.body.tickets[1].id).toBe('f23e4567-e89b-12d3-a456-426614174014');
      expect(response.body.tickets[2].id).toBe('g23e4567-e89b-12d3-a456-426614174015');
    });
  });

  describe('Response format validation', () => {
    it('should return response with tickets, count, and query fields', async () => {
      // Arrange
      const searchQuery = 'format';
      const mockTickets = [
        {
          id: 'h23e4567-e89b-12d3-a456-426614174016',
          title: 'Format test',
          description: 'Testing response format',
          priority: Priority.Low,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-17T00:00:00Z'),
          updatedAt: new Date('2024-01-17T00:00:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tickets');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('query');
      expect(Array.isArray(response.body.tickets)).toBe(true);
      expect(typeof response.body.count).toBe('number');
      expect(typeof response.body.query).toBe('string');
      expect(response.body.query).toBe(searchQuery);
    });

    it('should ensure count matches tickets array length', async () => {
      // Arrange
      const searchQuery = 'consistency';
      const mockTickets = [
        {
          id: 'i23e4567-e89b-12d3-a456-426614174017',
          title: 'Ticket 1',
          description: 'Consistency test 1',
          priority: Priority.Medium,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-18T00:00:00Z'),
          updatedAt: new Date('2024-01-18T00:00:00Z'),
        },
        {
          id: 'j23e4567-e89b-12d3-a456-426614174018',
          title: 'Ticket 2',
          description: 'Consistency test 2',
          priority: Priority.Low,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-19T00:00:00Z'),
          updatedAt: new Date('2024-01-19T00:00:00Z'),
        },
      ];

      mockedSearchService.searchByKeyword.mockResolvedValue(mockTickets);

      // Act
      const response = await request(app).get('/api/v1/tickets/search').query({ q: searchQuery });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.count).toBe(response.body.tickets.length);
      expect(response.body.count).toBe(2);
    });
  });
});
