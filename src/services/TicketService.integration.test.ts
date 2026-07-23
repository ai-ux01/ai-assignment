/**
 * TicketService Integration Tests
 *
 * Tests the full ticket creation and retrieval flow with actual database operations
 * These tests require a running PostgreSQL database
 */

import { TicketService } from './TicketService';
import { Priority, TicketState, CreateTicketRequest } from '../models/ticket';
import { CreateCommentRequest } from '../models/comment';
import { ticketRepository } from '../repositories/TicketRepository';
import { commentRepository } from '../repositories/CommentRepository';
import { database } from '../repositories/database';

describe('TicketService Integration Tests', () => {
  let ticketService: TicketService;
  const createdTicketIds: string[] = [];

  beforeAll(async () => {
    // Ensure database connection is ready
    await database.connect();
  });

  beforeEach(() => {
    ticketService = new TicketService();
  });

  afterEach(async () => {
    // Clean up created tickets
    for (const id of createdTicketIds) {
      try {
        await database.query('DELETE FROM tickets WHERE id = $1', [id]);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    createdTicketIds.length = 0;
  });

  afterAll(async () => {
    await database.disconnect();
  });

  describe('createTicket - Integration', () => {
    it('should create ticket and persist to database', async () => {
      // Arrange
      const request: CreateTicketRequest = {
        title: 'Integration Test Ticket',
        description: 'Testing ticket creation with real database',
        priority: Priority.High,
      };

      // Act
      const ticket = await ticketService.createTicket(request);
      createdTicketIds.push(ticket.id);

      // Assert
      expect(ticket).toBeDefined();
      expect(ticket.id).toBeDefined();
      expect(ticket.title).toBe(request.title);
      expect(ticket.description).toBe(request.description);
      expect(ticket.priority).toBe(request.priority);
      expect(ticket.state).toBe(TicketState.Open);
      expect(ticket.assignee).toBeNull();
      expect(ticket.createdAt).toBeInstanceOf(Date);
      expect(ticket.updatedAt).toBeInstanceOf(Date);

      // Verify ticket was persisted
      const retrieved = await ticketRepository.findTicketById(ticket.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(ticket.id);
    });

    it('should generate unique IDs for multiple tickets', async () => {
      // Arrange
      const request: CreateTicketRequest = {
        title: 'Unique ID Test',
        description: 'Testing UUID generation',
        priority: Priority.Low,
      };

      // Act
      const ticket1 = await ticketService.createTicket(request);
      const ticket2 = await ticketService.createTicket(request);
      createdTicketIds.push(ticket1.id, ticket2.id);

      // Assert
      expect(ticket1.id).not.toBe(ticket2.id);
      expect(ticket1.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(ticket2.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('getTicket - Integration', () => {
    it('should retrieve ticket with comments', async () => {
      // Arrange - Create a ticket
      const ticketRequest: CreateTicketRequest = {
        title: 'Ticket with Comments',
        description: 'Testing retrieval with comments',
        priority: Priority.Medium,
      };
      const ticket = await ticketService.createTicket(ticketRequest);
      createdTicketIds.push(ticket.id);

      // Add comments
      const comment1: CreateCommentRequest & { ticketId: string } = {
        ticketId: ticket.id,
        text: 'First comment',
        author: 'user1@example.com',
      };
      const comment2: CreateCommentRequest & { ticketId: string } = {
        ticketId: ticket.id,
        text: 'Second comment',
        author: 'user2@example.com',
      };
      await commentRepository.insertComment(comment1);
      await commentRepository.insertComment(comment2);

      // Act
      const result = await ticketService.getTicket(ticket.id);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(ticket.id);
      expect(result.comments).toHaveLength(2);
      expect(result.comments[0]?.text).toBe('First comment');
      expect(result.comments[1]?.text).toBe('Second comment');
    });

    it('should retrieve ticket without comments', async () => {
      // Arrange - Create a ticket
      const ticketRequest: CreateTicketRequest = {
        title: 'Ticket without Comments',
        description: 'Testing retrieval without comments',
        priority: Priority.Low,
      };
      const ticket = await ticketService.createTicket(ticketRequest);
      createdTicketIds.push(ticket.id);

      // Act
      const result = await ticketService.getTicket(ticket.id);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(ticket.id);
      expect(result.comments).toEqual([]);
    });

    it('should throw NotFoundError for non-existent ticket', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act & Assert
      await expect(ticketService.getTicket(nonExistentId)).rejects.toThrow(
        `Ticket with ID '${nonExistentId}' does not exist`
      );
    });
  });

  describe('listTickets - Integration', () => {
    it('should list all created tickets in order', async () => {
      // Arrange - Create multiple tickets
      const ticket1 = await ticketService.createTicket({
        title: 'First Ticket',
        description: 'Description 1',
        priority: Priority.Low,
      });
      createdTicketIds.push(ticket1.id);

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const ticket2 = await ticketService.createTicket({
        title: 'Second Ticket',
        description: 'Description 2',
        priority: Priority.High,
      });
      createdTicketIds.push(ticket2.id);

      // Act
      const tickets = await ticketService.listTickets();

      // Assert
      expect(tickets.length).toBeGreaterThanOrEqual(2);
      const createdTickets = tickets.filter((t) => createdTicketIds.includes(t.id));
      expect(createdTickets).toHaveLength(2);

      // Verify ordering (most recent first)
      const ticket1Index = tickets.findIndex((t) => t.id === ticket1.id);
      const ticket2Index = tickets.findIndex((t) => t.id === ticket2.id);
      expect(ticket2Index).toBeLessThan(ticket1Index);
    });

    it('should return empty array when no tickets exist', async () => {
      // Clean up all tickets first
      await database.query('DELETE FROM tickets');

      // Act
      const tickets = await ticketService.listTickets();

      // Assert
      expect(tickets).toEqual([]);
    });
  });
});
