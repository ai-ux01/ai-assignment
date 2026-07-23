/**
 * Test suite for PATCH /api/v1/tickets/:id/state endpoint
 * Tests state transition functionality with state machine validation
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 */

import request from 'supertest';
import express from 'express';
import { ticketService } from '../services/TicketService';
import ticketRoutes from './ticketRoutes';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { requestIdMiddleware } from '../middleware/requestIdMiddleware';
import { authenticateRequest } from '../middleware/auth.middleware';
import { TicketState, Priority } from '../models/ticket';
import { NotFoundError, ValidationError, StateTransitionError } from '../utils/customErrors';
import { ErrorCode } from '../models/errors';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use(requestIdMiddleware);
app.use('/api/v1/tickets', ticketRoutes);
app.use(errorMiddleware);

// Mock the ticket service and authentication middleware
jest.mock('../services/TicketService');
jest.mock('../middleware/auth.middleware');

const mockedTicketService = ticketService as jest.Mocked<typeof ticketService>;
const mockedAuthMiddleware = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;

describe('PATCH /api/v1/tickets/:id/state - Transition Ticket State', () => {
  const testTicketId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTicket = {
    id: testTicketId,
    title: 'Test Ticket for State Transitions',
    description: 'This ticket is used to test state transitions',
    priority: Priority.Medium,
    state: TicketState.Open,
    assignee: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware to pass through
    mockedAuthMiddleware.mockImplementation((req, _res, next) => {
      (req as any).user = { id: 'test-user' };
      (req as any).requestId = 'test-request-id';
      next();
    });
  });

  describe('Valid state transitions', () => {
    test('should transition from Open to In_Progress (200 OK)', async () => {
      // Mock getTicket to return ticket in Open state
      mockedTicketService.getTicket.mockResolvedValue({
        ...mockTicket,
        comments: [],
      });

      // Mock transitionState to return updated ticket
      mockedTicketService.transitionState.mockResolvedValue({
        ...mockTicket,
        state: TicketState.InProgress,
        updatedAt: new Date('2024-01-15T10:05:00Z'),
      });

      const response = await request(app)
        .patch(`/api/v1/tickets/${testTicketId}/state`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          state: TicketState.InProgress,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testTicketId);
      expect(response.body).toHaveProperty('state', TicketState.InProgress);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('priority');
      expect(response.body).toHaveProperty('assignee');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Verify service method was called
      expect(mockedTicketService.transitionState).toHaveBeenCalledWith(
        testTicketId,
        TicketState.InProgress
      );
    });

    test('should transition from Open to Cancelled (200 OK)', async () => {
      mockedTicketService.getTicket.mockResolvedValue({
        ...mockTicket,
        comments: [],
      });

      mockedTicketService.transitionState.mockResolvedValue({
        ...mockTicket,
        state: TicketState.Cancelled,
      });

      const response = await request(app)
        .patch(`/api/v1/tickets/${testTicketId}/state`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          state: TicketState.Cancelled,
        });

      expect(response.status).toBe(200);
      expect(response.body.state).toBe(TicketState.Cancelled);
    });
  });

  describe('Invalid state transitions', () => {
    test('should reject transition from Open to Resolved (422 Unprocessable Entity)', async () => {
      mockedTicketService.getTicket.mockResolvedValue({
        ...mockTicket,
        comments: [],
      });

      mockedTicketService.transitionState.mockRejectedValue(
        new StateTransitionError(
          'Invalid state transition from Open to Resolved. Allowed transitions: In_Progress, Cancelled',
          ErrorCode.INVALID_TRANSITION
        )
      );

      const response = await request(app)
        .patch(`/api/v1/tickets/${testTicketId}/state`)
        .set('Authorization', 'Bearer valid-token')
        .send({ state: TicketState.Resolved });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('Invalid state transition');
    });

    test('should reject transition from terminal state (422 Unprocessable Entity)', async () => {
      mockedTicketService.getTicket.mockResolvedValue({
        ...mockTicket,
        state: TicketState.Closed,
        comments: [],
      });

      mockedTicketService.transitionState.mockRejectedValue(
        new StateTransitionError(
          'Ticket is in terminal state Closed. No further transitions allowed.',
          ErrorCode.TERMINAL_STATE
        )
      );

      const response = await request(app)
        .patch(`/api/v1/tickets/${testTicketId}/state`)
        .set('Authorization', 'Bearer valid-token')
        .send({ state: TicketState.Open });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toContain('terminal state');
    });
  });

  describe('Invalid state values', () => {
    test('should reject invalid state value (422 Unprocessable Entity)', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${testTicketId}/state`)
        .set('Authorization', 'Bearer valid-token')
        .send({ state: 'InvalidState' });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_STATE');
      expect(response.body.error.message).toContain('Invalid state value');
    });

    test('should reject missing state field (422 Unprocessable Entity)', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${testTicketId}/state`)
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(422);
      expect(response.body.error.message).toContain('State is required');
    });

    test('should reject non-string state value (422 Unprocessable Entity)', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${testTicketId}/state`)
        .set('Authorization', 'Bearer valid-token')
        .send({ state: 123 });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toContain('State is required and must be a string');
    });
  });

  describe('Non-existent tickets', () => {
    test('should return 404 for non-existent ticket ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      mockedTicketService.getTicket.mockRejectedValue(
        new NotFoundError(
          `Ticket with ID '${nonExistentId}' does not exist`,
          ErrorCode.TICKET_NOT_FOUND
        )
      );

      const response = await request(app)
        .patch(`/api/v1/tickets/${nonExistentId}/state`)
        .set('Authorization', 'Bearer valid-token')
        .send({ state: TicketState.InProgress });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
    });

    test('should return 400 for invalid UUID format', async () => {
      const invalidId = 'not-a-uuid';

      mockedTicketService.getTicket.mockRejectedValue(
        new ValidationError('Invalid ticket ID format', [
          {
            field: 'id',
            message: 'Invalid UUID format',
            code: ErrorCode.INVALID_UUID_FORMAT,
          },
        ])
      );

      const response = await request(app)
        .patch(`/api/v1/tickets/${invalidId}/state`)
        .set('Authorization', 'Bearer valid-token')
        .send({ state: TicketState.InProgress });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response completeness', () => {
    test('should return complete ticket object with all fields', async () => {
      mockedTicketService.getTicket.mockResolvedValue({
        ...mockTicket,
        comments: [],
      });

      mockedTicketService.transitionState.mockResolvedValue({
        ...mockTicket,
        state: TicketState.InProgress,
        updatedAt: new Date('2024-01-15T10:05:00Z'),
      });

      const response = await request(app)
        .patch(`/api/v1/tickets/${testTicketId}/state`)
        .set('Authorization', 'Bearer valid-token')
        .send({ state: TicketState.InProgress });

      expect(response.status).toBe(200);
      
      // Verify all required fields are present
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('priority');
      expect(response.body).toHaveProperty('state');
      expect(response.body).toHaveProperty('assignee');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Verify types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.title).toBe('string');
      expect(typeof response.body.description).toBe('string');
      expect(typeof response.body.priority).toBe('string');
      expect(typeof response.body.state).toBe('string');
    });
  });
});
