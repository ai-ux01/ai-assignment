/**
 * TicketService Unit Tests
 *
 * Tests for ticket creation, retrieval, and listing functionality
 */

import { TicketService } from './TicketService';
import { ticketRepository } from '../repositories/TicketRepository';
import { commentRepository } from '../repositories/CommentRepository';
import { validator } from '../utils/validator';
import { Priority, TicketState, CreateTicketRequest } from '../models/ticket';
import { Comment } from '../models/comment';
import { NotFoundError, ValidationError } from '../utils/customErrors';
import { ErrorCode } from '../models/errors';

// Mock dependencies
jest.mock('../repositories/TicketRepository');
jest.mock('../repositories/CommentRepository');
jest.mock('../utils/validator');
jest.mock('../utils/logger');

describe('TicketService', () => {
  let ticketService: TicketService;

  beforeEach(() => {
    jest.clearAllMocks();
    ticketService = new TicketService();
  });

  describe('createTicket', () => {
    const validRequest: CreateTicketRequest = {
      title: 'Test Ticket',
      description: 'Test description',
      priority: Priority.Medium,
    };

    it('should create a ticket with valid input', async () => {
      // Arrange
      const mockTicket = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...validRequest,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (validator.validateTicketCreation as jest.Mock).mockReturnValue({ valid: true });
      (ticketRepository.insertTicket as jest.Mock).mockResolvedValue(mockTicket);

      // Act
      const result = await ticketService.createTicket(validRequest);

      // Assert
      expect(validator.validateTicketCreation).toHaveBeenCalledWith(validRequest);
      expect(ticketRepository.insertTicket).toHaveBeenCalledWith({
        ...validRequest,
        state: TicketState.Open,
        assignee: null,
      });
      expect(result).toEqual(mockTicket);
      expect(result.state).toBe(TicketState.Open);
      expect(result.assignee).toBeNull();
    });

    it('should throw ValidationError when validation fails', async () => {
      // Arrange
      const validationErrors = [
        {
          field: 'title',
          message: 'Title is required',
          code: ErrorCode.MISSING_REQUIRED_FIELD,
        },
      ];

      (validator.validateTicketCreation as jest.Mock).mockReturnValue({
        valid: false,
        errors: validationErrors,
      });

      // Act & Assert
      await expect(ticketService.createTicket(validRequest)).rejects.toThrow(ValidationError);
      expect(ticketRepository.insertTicket).not.toHaveBeenCalled();
    });

    it('should set initial state to Open', async () => {
      // Arrange
      const mockTicket = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...validRequest,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (validator.validateTicketCreation as jest.Mock).mockReturnValue({ valid: true });
      (ticketRepository.insertTicket as jest.Mock).mockResolvedValue(mockTicket);

      // Act
      const result = await ticketService.createTicket(validRequest);

      // Assert
      expect(ticketRepository.insertTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          state: TicketState.Open,
        })
      );
      expect(result.state).toBe(TicketState.Open);
    });

    it('should set initial assignee to null', async () => {
      // Arrange
      const mockTicket = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...validRequest,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (validator.validateTicketCreation as jest.Mock).mockReturnValue({ valid: true });
      (ticketRepository.insertTicket as jest.Mock).mockResolvedValue(mockTicket);

      // Act
      const result = await ticketService.createTicket(validRequest);

      // Assert
      expect(ticketRepository.insertTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee: null,
        })
      );
      expect(result.assignee).toBeNull();
    });

    it('should return complete ticket object with generated ID', async () => {
      // Arrange
      const mockTicket = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...validRequest,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (validator.validateTicketCreation as jest.Mock).mockReturnValue({ valid: true });
      (ticketRepository.insertTicket as jest.Mock).mockResolvedValue(mockTicket);

      // Act
      const result = await ticketService.createTicket(validRequest);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('assignee');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result.id).toBe(mockTicket.id);
    });
  });

  describe('getTicket', () => {
    const ticketId = '123e4567-e89b-12d3-a456-426614174000';
    const mockTicket = {
      id: ticketId,
      title: 'Test Ticket',
      description: 'Test description',
      priority: Priority.High,
      state: TicketState.Open,
      assignee: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should retrieve ticket with comments', async () => {
      // Arrange
      const mockComments: Comment[] = [
        {
          id: 'comment-1',
          ticketId: ticketId,
          text: 'First comment',
          author: 'user1',
          createdAt: new Date(),
        },
        {
          id: 'comment-2',
          ticketId: ticketId,
          text: 'Second comment',
          author: 'user2',
          createdAt: new Date(),
        },
      ];

      (validator.validateUUID as jest.Mock).mockReturnValue({ valid: true });
      (ticketRepository.findTicketById as jest.Mock).mockResolvedValue(mockTicket);
      (commentRepository.findCommentsByTicketId as jest.Mock).mockResolvedValue(mockComments);

      // Act
      const result = await ticketService.getTicket(ticketId);

      // Assert
      expect(validator.validateUUID).toHaveBeenCalledWith(ticketId);
      expect(ticketRepository.findTicketById).toHaveBeenCalledWith(ticketId);
      expect(commentRepository.findCommentsByTicketId).toHaveBeenCalledWith(ticketId);
      expect(result).toEqual({
        ...mockTicket,
        comments: mockComments,
      });
      expect(result.comments).toHaveLength(2);
    });

    it('should retrieve ticket with empty comments array when no comments exist', async () => {
      // Arrange
      (validator.validateUUID as jest.Mock).mockReturnValue({ valid: true });
      (ticketRepository.findTicketById as jest.Mock).mockResolvedValue(mockTicket);
      (commentRepository.findCommentsByTicketId as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await ticketService.getTicket(ticketId);

      // Assert
      expect(result.comments).toEqual([]);
      expect(result.comments).toHaveLength(0);
    });

    it('should throw ValidationError for invalid UUID format', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';
      const validationErrors = [
        {
          field: 'id',
          message: 'Invalid UUID format',
          code: ErrorCode.INVALID_UUID_FORMAT,
        },
      ];

      (validator.validateUUID as jest.Mock).mockReturnValue({
        valid: false,
        errors: validationErrors,
      });

      // Act & Assert
      await expect(ticketService.getTicket(invalidId)).rejects.toThrow(ValidationError);
      expect(ticketRepository.findTicketById).not.toHaveBeenCalled();
      expect(commentRepository.findCommentsByTicketId).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when ticket does not exist', async () => {
      // Arrange
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

      (validator.validateUUID as jest.Mock).mockReturnValue({ valid: true });
      (ticketRepository.findTicketById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(ticketService.getTicket(nonExistentId)).rejects.toThrow(NotFoundError);
      await expect(ticketService.getTicket(nonExistentId)).rejects.toThrow(
        `Ticket with ID '${nonExistentId}' does not exist`
      );
      expect(commentRepository.findCommentsByTicketId).not.toHaveBeenCalled();
    });

    it('should include all ticket fields in response', async () => {
      // Arrange
      (validator.validateUUID as jest.Mock).mockReturnValue({ valid: true });
      (ticketRepository.findTicketById as jest.Mock).mockResolvedValue(mockTicket);
      (commentRepository.findCommentsByTicketId as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await ticketService.getTicket(ticketId);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('assignee');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('comments');
    });
  });

  describe('listTickets', () => {
    it('should return all tickets', async () => {
      // Arrange
      const mockTickets = [
        {
          id: 'ticket-1',
          title: 'First Ticket',
          description: 'First description',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: 'user1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 'ticket-2',
          title: 'Second Ticket',
          description: 'Second description',
          priority: Priority.Medium,
          state: TicketState.InProgress,
          assignee: null,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      (ticketRepository.findAllTickets as jest.Mock).mockResolvedValue(mockTickets);

      // Act
      const result = await ticketService.listTickets();

      // Assert
      expect(ticketRepository.findAllTickets).toHaveBeenCalled();
      expect(result).toEqual(mockTickets);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no tickets exist', async () => {
      // Arrange
      (ticketRepository.findAllTickets as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await ticketService.listTickets();

      // Assert
      expect(ticketRepository.findAllTickets).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return tickets in consistent order', async () => {
      // Arrange
      const mockTickets = [
        {
          id: 'ticket-3',
          title: 'Newest Ticket',
          description: 'Newest',
          priority: Priority.Low,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-03'),
        },
        {
          id: 'ticket-2',
          title: 'Middle Ticket',
          description: 'Middle',
          priority: Priority.Medium,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: 'ticket-1',
          title: 'Oldest Ticket',
          description: 'Oldest',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      (ticketRepository.findAllTickets as jest.Mock).mockResolvedValue(mockTickets);

      // Act
      const result = await ticketService.listTickets();

      // Assert
      expect(result).toEqual(mockTickets);
      // Repository is responsible for ordering, service just returns what it gets
      expect(result[0]?.id).toBe('ticket-3'); // Most recent first
      expect(result[2]?.id).toBe('ticket-1'); // Oldest last
    });

    it('should include all required ticket fields', async () => {
      // Arrange
      const mockTickets = [
        {
          id: 'ticket-1',
          title: 'Test Ticket',
          description: 'Test description',
          priority: Priority.Critical,
          state: TicketState.Resolved,
          assignee: 'user@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (ticketRepository.findAllTickets as jest.Mock).mockResolvedValue(mockTickets);

      // Act
      const result = await ticketService.listTickets();

      // Assert
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('priority');
      expect(result[0]).toHaveProperty('state');
      expect(result[0]).toHaveProperty('assignee');
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).toHaveProperty('updatedAt');
    });
  });
});
