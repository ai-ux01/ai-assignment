/**
 * Integration tests for PATCH /api/v1/tickets/:id (Update Ticket)
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import request from 'supertest';
import express, { Express } from 'express';
import ticketRoutes from './ticketRoutes';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { database } from '../repositories/database';
import { Priority } from '../models/ticket';
import { generateTestToken } from '../middleware/auth.middleware';

describe('PATCH /api/v1/tickets/:id - Update Ticket', () => {
  let app: Express;
  let createdTicketId: string;
  const authToken = generateTestToken('test-user-123', 'test@example.com');

  beforeAll(async () => {
    // Initialize database connection
    await database.connect();

    // Set up Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/tickets', ticketRoutes);
    app.use(errorMiddleware); // Add error handling middleware

    // Clean up test data
    await database.query('DELETE FROM tickets WHERE title LIKE $1', ['Test Ticket%']);
  });

  beforeEach(async () => {
    // Create a test ticket for update tests
    const createResponse = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Ticket for Update',
        description: 'Original description',
        priority: Priority.Medium,
      });

    createdTicketId = createResponse.body.id;
  });

  afterEach(async () => {
    // Clean up test ticket
    if (createdTicketId) {
      await database.query('DELETE FROM tickets WHERE id = $1', [createdTicketId]);
    }
  });

  afterAll(async () => {
    await database.disconnect();
  });

  describe('Successful Updates', () => {
    it('should update ticket title and return 200 OK', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: createdTicketId,
        title: 'Updated Title',
        description: 'Original description', // Should be preserved
        priority: Priority.Medium, // Should be preserved
      });
    });

    it('should update ticket description and return 200 OK', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated description with more details',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: createdTicketId,
        title: 'Test Ticket for Update', // Should be preserved
        description: 'Updated description with more details',
        priority: Priority.Medium, // Should be preserved
      });
    });

    it('should update ticket priority and return 200 OK', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          priority: Priority.High,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: createdTicketId,
        title: 'Test Ticket for Update', // Should be preserved
        description: 'Original description', // Should be preserved
        priority: Priority.High,
      });
    });

    it('should update multiple fields at once', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Completely Updated Title',
          description: 'Completely updated description',
          priority: Priority.Critical,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: createdTicketId,
        title: 'Completely Updated Title',
        description: 'Completely updated description',
        priority: Priority.Critical,
      });
    });

    it('should preserve fields not included in update request', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Only Title Updated',
        });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Original description');
      expect(response.body.priority).toBe(Priority.Medium);
      expect(response.body.state).toBe('Open');
      expect(response.body.assignee).toBeNull();
    });

    it('should update updatedAt timestamp', async () => {
      // Get original ticket
      const originalResponse = await request(app)
        .get(`/api/v1/tickets/${createdTicketId}`)
        .send();

      const originalUpdatedAt = new Date(originalResponse.body.updatedAt);

      // Wait a moment to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update ticket
      const updateResponse = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated to check timestamp',
        });

      const newUpdatedAt = new Date(updateResponse.body.updatedAt);

      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should return complete ticket object after update', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('priority');
      expect(response.body).toHaveProperty('state');
      expect(response.body).toHaveProperty('assignee');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for empty title', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    it('should return 400 for whitespace-only title', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '   ',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for title exceeding 200 characters', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'a'.repeat(201),
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    it('should return 400 for description exceeding 5000 characters', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'a'.repeat(5001),
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    it('should return 400 for invalid priority value', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          priority: 'InvalidPriority',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PRIORITY');
    });

    it('should return 400 when trying to update immutable field "id"', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'some-new-id',
          title: 'Updated Title',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'id',
            message: expect.stringContaining('immutable'),
          }),
        ])
      );
    });

    it('should return 400 when trying to update immutable field "state"', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          state: 'Closed',
          title: 'Updated Title',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'state',
            message: expect.stringContaining('immutable'),
          }),
        ])
      );
    });

    it('should return 400 when trying to update immutable field "assignee"', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assignee: 'user@example.com',
          title: 'Updated Title',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'assignee',
            message: expect.stringContaining('immutable'),
          }),
        ])
      );
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 for non-existent ticket ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .patch(`/api/v1/tickets/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
    });

    it('should return 400 for invalid ticket ID format', async () => {
      const response = await request(app)
        .patch('/api/v1/tickets/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_UUID_FORMAT');
    });
  });

  describe('Authentication', () => {
    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(401);
    });
  });
});
