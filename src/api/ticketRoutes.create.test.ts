/**
 * Integration tests for POST /api/v1/tickets endpoint
 * Tests ticket creation with authentication and validation
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import request from 'supertest';
import express, { Application } from 'express';
import ticketRoutes from './ticketRoutes';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { Priority, TicketState } from '../models/ticket';
import { ticketService } from '../services/TicketService';
import { ValidationError } from '../utils/customErrors';

// Mock the ticket service
jest.mock('../services/TicketService');

// Mock audit logger
jest.mock('../utils/auditLogger', () => ({
  auditLogger: {
    logTicketCreation: jest.fn(),
  },
  AuditOperation: {
    CREATE_TICKET: 'CREATE_TICKET',
  },
}));

// Mock JWT token for testing (base64 encoded with user info)
// Payload: {"sub":"test-user-123","email":"test@example.com","username":"testuser","exp":9999999999}
const mockJWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImV4cCI6OTk5OTk5OTk5OX0.dGVzdC1zaWduYXR1cmU';

describe('POST /api/v1/tickets', () => {
  let app: Application;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/v1/tickets', ticketRoutes);
    app.use(errorMiddleware);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Successful ticket creation', () => {
    it('should create a new ticket with valid request and return 201 Created', async () => {
      // Arrange
      const createRequest = {
        title: 'Test Ticket',
        description: 'This is a test ticket description',
        priority: Priority.High,
      };

      const mockCreatedTicket = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: createRequest.title,
        description: createRequest.description,
        priority: createRequest.priority,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
      };

      (ticketService.createTicket as jest.Mock).mockResolvedValue(mockCreatedTicket);

      // Act
      const response = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${mockJWT}`)
        .send(createRequest);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(createRequest.title);
      expect(response.body.description).toBe(createRequest.description);
      expect(response.body.priority).toBe(createRequest.priority);
      expect(response.body.state).toBe(TicketState.Open);
      expect(response.body.assignee).toBeNull();
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Verify service was called with correct data
      expect(ticketService.createTicket).toHaveBeenCalledWith(createRequest);
    });

    it('should create ticket with Low priority', async () => {
      // Arrange
      const createRequest = {
        title: 'Low Priority Ticket',
        description: 'This is a low priority ticket',
        priority: Priority.Low,
      };

      const mockCreatedTicket = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        ...createRequest,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ticketService.createTicket as jest.Mock).mockResolvedValue(mockCreatedTicket);

      // Act
      const response = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${mockJWT}`)
        .send(createRequest);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.priority).toBe(Priority.Low);
    });

    it('should create ticket with Critical priority', async () => {
      // Arrange
      const createRequest = {
        title: 'Critical Issue',
        description: 'System is down',
        priority: Priority.Critical,
      };

      const mockCreatedTicket = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        ...createRequest,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ticketService.createTicket as jest.Mock).mockResolvedValue(mockCreatedTicket);

      // Act
      const response = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${mockJWT}`)
        .send(createRequest);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.priority).toBe(Priority.Critical);
    });
  });

  describe('Authentication errors', () => {
    it('should return 401 for missing authentication token', async () => {
      // Arrange
      const createRequest = {
        title: 'Test Ticket',
        description: 'This is a test ticket description',
        priority: Priority.High,
      };

      // Act
      const response = await request(app)
        .post('/api/v1/tickets')
        // No Authorization header
        .send(createRequest);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('MISSING_TOKEN');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('requestId');

      // Service should not be called
      expect(ticketService.createTicket).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token format', async () => {
      // Arrange
      const createRequest = {
        title: 'Test Ticket',
        description: 'This is a test ticket description',
        priority: Priority.High,
      };

      // Act
      const response = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', 'Bearer invalid-token-format')
        .send(createRequest);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN_FORMAT');

      // Service should not be called
      expect(ticketService.createTicket).not.toHaveBeenCalled();
    });

    it('should return 401 for malformed Authorization header', async () => {
      // Arrange
      const createRequest = {
        title: 'Test Ticket',
        description: 'This is a test ticket description',
        priority: Priority.High,
      };

      // Act
      const response = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', 'InvalidFormat token123')
        .send(createRequest);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('Validation errors', () => {
    it('should return 400 for missing title', async () => {
      // Arrange
      const invalidRequest = {
        // Missing title
        description: 'This is a test ticket description',
        priority: Priority.Medium,
      };

      (ticketService.createTicket as jest.Mock).mockImplementation(() => {
        throw new ValidationError('Validation failed for ticket creation request', [
          {
            field: 'title',
            message: 'Title is required',
            code: 'MISSING_REQUIRED_FIELD',
          },
        ]);
      });

      // Act
      const response = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${mockJWT}`)
        .send(invalidRequest);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should return 400 for missing description', async () => {
      // Arrange
      const invalidRequest = {
        title: 'Test Ticket',
        // Missing description
        priority: Priority.High,
      };

      (ticketService.createTicket as jest.Mock).mockImplementation(() => {
        throw new ValidationError('Validation failed for ticket creation request', [
          {
            field: 'description',
            message: 'Description is required',
            code: 'MISSING_REQUIRED_FIELD',
          },
        ]);
      });

      // Act
      const response = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${mockJWT}`)
        .send(invalidRequest);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 for missing priority', async () => {
      // Arrange
      const invalidRequest = {
        title: 'Test Ticket',
        description: 'This is a test ticket description',
        // Missing priority
      };

      (ticketService.createTicket as jest.Mock).mockImplementation(() => {
        throw new ValidationError('Validation failed for ticket creation request', [
          {
            field: 'priority',
            message: 'Priority is required',
            code: 'MISSING_REQUIRED_FIELD',
          },
        ]);
      });

      // Act
      const response = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${mockJWT}`)
        .send(invalidRequest);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid priority value', async () => {
      // Arrange
      const invalidRequest = {
        title: 'Test Ticket',
        description: 'This is a test ticket description',
        priority: 'InvalidPriority',
      };

      (ticketService.createTicket as jest.Mock).mockImplementation(() => {
        throw new ValidationError('Validation failed for ticket creation request', [
          {
            field: 'priority',
            message: 'Priority must be one of: Low, Medium, High, Critical',
            code: 'INVALID_PRIORITY',
          },
        ]);
      });

      // Act
      const response = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${mockJWT}`)
        .send(invalidRequest);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code');
    });

    it('should return 400 for empty title', async () => {
      // Arrange
      const invalidRequest = {
        title: '',
        description: 'This is a test ticket description',
        priority: Priority.Medium,
      };

      (ticketService.createTicket as jest.Mock).mockImplementation(() => {
        throw new ValidationError('Validation failed for ticket creation request', [
          {
            field: 'title',
            message: 'Title cannot be empty',
            code: 'WHITESPACE_ONLY',
          },
        ]);
      });

      // Act
      const response = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${mockJWT}`)
        .send(invalidRequest);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 for whitespace-only title', async () => {
      // Arrange
      const invalidRequest = {
        title: '   ',
        description: 'This is a test ticket description',
        priority: Priority.Low,
      };

      (ticketService.createTicket as jest.Mock).mockImplementation(() => {
        throw new ValidationError('Validation failed for ticket creation request', [
          {
            field: 'title',
            message: 'Title cannot be whitespace only',
            code: 'WHITESPACE_ONLY',
          },
        ]);
      });

      // Act
      const response = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${mockJWT}`)
        .send(invalidRequest);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('Error handling', () => {
    it('should return 500 for database errors', async () => {
      // Arrange
      const createRequest = {
        title: 'Test Ticket',
        description: 'This is a test ticket description',
        priority: Priority.High,
      };

      (ticketService.createTicket as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      const response = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${mockJWT}`)
        .send(createRequest);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('requestId');
    });
  });
});
