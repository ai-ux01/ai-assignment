/**
 * Ticket Service Implementation
 *
 * Implements core ticket operations: creation, retrieval, updates, state transitions,
 * and assignment operations. Coordinates validation, persistence, and error handling.
 *
 * Requirements:
 * - 1.1-1.7: Ticket creation with validation
 * - 2.1-2.5: List all tickets
 * - 3.1-3.5: Retrieve ticket details with comments
 * - 4.1-4.7: Update ticket information
 * - 5.1-5.7: Assign tickets to team members
 * - 9.1-9.8: Manage state transitions
 */

import { Ticket, TicketState, CreateTicketRequest, AssignTicketRequest, Priority } from '../models/ticket';
import { Comment } from '../models/comment';
import { ticketRepository } from '../repositories/TicketRepository';
import { commentRepository } from '../repositories/CommentRepository';
import { validator } from '../utils/validator';
import { inputSanitizer } from '../utils/inputSanitizer';
import { NotFoundError, ValidationError, ForbiddenError, StateTransitionError } from '../utils/customErrors';
import { ErrorCode } from '../models/errors';
import { ticketStateMachine } from './TicketStateMachine';
import logger from '../utils/logger';

/**
 * Extended ticket type that includes associated comments
 */
export interface TicketWithComments extends Ticket {
  comments: Comment[];
}

/**
 * Ticket Service class implementing core ticket business logic
 */
export class TicketService {
  constructor() {}

  /**
   * Create a new ticket with validation and UUID generation
   *
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.7
   *
   * Sets initial state to "Open" and assignee to null.
   *
   * @param request - Ticket creation request containing title, description, priority
   * @returns Promise<Ticket> - Created ticket with generated ID
   * @throws ValidationError if request validation fails
   */
  async createTicket(request: CreateTicketRequest): Promise<Ticket> {
    logger.debug('Creating ticket', { title: request.title });

    // Sanitize text inputs before validation
    const sanitizedRequest: CreateTicketRequest = {
      title: inputSanitizer.sanitizeText(request.title),
      description: inputSanitizer.sanitizeText(request.description),
      priority: request.priority,
    };

    // Validate request
    const validationResult = validator.validateTicketCreation(sanitizedRequest);
    if (!validationResult.valid) {
      logger.warn('Ticket creation validation failed', { errors: validationResult.errors });
      throw new ValidationError(
        'Validation failed for ticket creation request',
        validationResult.errors
      );
    }

    // Create ticket with initial state and null assignee
    const ticketData = {
      ...sanitizedRequest,
      state: TicketState.Open,
      assignee: null,
    };

    const createdTicket = await ticketRepository.insertTicket(ticketData);

    logger.info('Ticket created successfully', {
      ticketId: createdTicket.id,
      title: createdTicket.title,
      priority: createdTicket.priority,
    });

    return createdTicket;
  }

  /**
   * Retrieve a ticket by ID with associated comments
   *
   * Requirements: 3.1, 3.4, 3.5
   *
   * Returns complete ticket record including all fields and comments
   * in chronological order.
   *
   * @param id - Ticket UUID
   * @returns Promise<TicketWithComments> - Ticket with associated comments
   * @throws ValidationError if ID format is invalid
   * @throws NotFoundError if ticket does not exist
   */
  async getTicket(id: string): Promise<TicketWithComments> {
    logger.debug('Retrieving ticket', { ticketId: id });

    // Validate UUID format using both validator and inputSanitizer
    if (!inputSanitizer.isValidUUID(id)) {
      logger.warn('Invalid ticket ID format', { ticketId: id });
      throw new ValidationError(
        'Invalid ticket ID format',
        [{
          field: 'id',
          message: 'ID must be a valid UUID',
          code: ErrorCode.INVALID_UUID_FORMAT,
        }]
      );
    }

    const validationResult = validator.validateUUID(id);
    if (!validationResult.valid) {
      logger.warn('Invalid ticket ID format', { ticketId: id, errors: validationResult.errors });
      throw new ValidationError(
        'Invalid ticket ID format',
        validationResult.errors
      );
    }

    // Retrieve ticket
    const ticket = await ticketRepository.findTicketById(id);
    if (!ticket) {
      logger.warn('Ticket not found', { ticketId: id });
      throw new NotFoundError(`Ticket with ID '${id}' does not exist`, ErrorCode.TICKET_NOT_FOUND);
    }

    // Retrieve associated comments
    const comments = await commentRepository.findCommentsByTicketId(id);

    logger.debug('Ticket retrieved successfully', {
      ticketId: id,
      commentCount: comments.length,
    });

    return {
      ...ticket,
      comments,
    };
  }

  /**
   * List all tickets with consistent ordering
   *
   * Requirements: 2.1, 2.2, 2.4
   *
   * Returns all tickets ordered by creation date (most recent first).
   *
   * @returns Promise<Ticket[]> - All tickets in consistent order
   */
  async listTickets(): Promise<Ticket[]> {
    logger.debug('Listing all tickets');

    const tickets = await ticketRepository.findAllTickets();

    logger.info('Tickets retrieved', { count: tickets.length });

    return tickets;
  }

  /**
   * Update ticket information with partial updates support
   *
   * Requirements: 4.1, 4.2, 4.5, 4.6, 4.7
   *
   * Supports updating title, description, and priority fields.
   * Preserves fields not included in the update request.
   * Prevents updates to immutable fields (id, createdAt, state, assignee).
   *
   * @param id - Ticket UUID
   * @param updates - Partial ticket updates
   * @returns Promise<Ticket> - Complete updated ticket object
   * @throws ValidationError if request validation fails or ID format is invalid
   * @throws NotFoundError if ticket does not exist
   */
  async updateTicket(id: string, updates: Partial<{ title: string; description: string; priority: Priority }>): Promise<Ticket> {
    logger.debug('Updating ticket', { ticketId: id, updates });

    // Validate UUID format using both validator and inputSanitizer
    if (!inputSanitizer.isValidUUID(id)) {
      logger.warn('Invalid ticket ID format for update', { ticketId: id });
      throw new ValidationError(
        'Invalid ticket ID format',
        [{
          field: 'id',
          message: 'ID must be a valid UUID',
          code: ErrorCode.INVALID_UUID_FORMAT,
        }]
      );
    }

    const idValidation = validator.validateUUID(id);
    if (!idValidation.valid) {
      logger.warn('Invalid ticket ID format for update', { ticketId: id, errors: idValidation.errors });
      throw new ValidationError('Invalid ticket ID format', idValidation.errors);
    }

    // Sanitize text inputs in updates
    const sanitizedUpdates: Partial<{ title: string; description: string; priority: Priority }> = { ...updates };
    if (updates.title !== undefined) {
      sanitizedUpdates.title = inputSanitizer.sanitizeText(updates.title);
    }
    if (updates.description !== undefined) {
      sanitizedUpdates.description = inputSanitizer.sanitizeText(updates.description);
    }

    // Validate update request
    const validationResult = validator.validateTicketUpdate(sanitizedUpdates);
    if (!validationResult.valid) {
      logger.warn('Ticket update validation failed', { ticketId: id, errors: validationResult.errors });
      throw new ValidationError('Validation failed for ticket update request', validationResult.errors);
    }

    // Check ticket exists
    const existingTicket = await ticketRepository.findTicketById(id);
    if (!existingTicket) {
      logger.warn('Ticket not found for update', { ticketId: id });
      throw new NotFoundError(`Ticket with ID '${id}' does not exist`, ErrorCode.TICKET_NOT_FOUND);
    }

    // Perform update
    await ticketRepository.updateTicket(id, sanitizedUpdates);

    // Retrieve updated ticket
    const updatedTicket = await ticketRepository.findTicketById(id);
    if (!updatedTicket) {
      logger.error('Failed to retrieve ticket after update', { ticketId: id });
      throw new NotFoundError(`Ticket with ID '${id}' does not exist`, ErrorCode.TICKET_NOT_FOUND);
    }

    logger.info('Ticket updated successfully', {
      ticketId: id,
      updatedFields: Object.keys(sanitizedUpdates),
    });

    return updatedTicket;
  }

  /**
   * Transition ticket state with state machine validation
   *
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
   *
   * Validates state transition using state machine rules.
   * Updates ticket state only if transition is valid.
   * Returns complete updated ticket object.
   *
   * @param id - Ticket UUID
   * @param newState - Requested new state
   * @returns Promise<Ticket> - Updated ticket with new state
   * @throws ValidationError if ID format is invalid or state transition is invalid
   * @throws NotFoundError if ticket does not exist
   */
  async transitionState(id: string, newState: TicketState): Promise<Ticket> {
    logger.debug('Transitioning ticket state', { ticketId: id, newState });

    // Validate UUID format using both validator and inputSanitizer
    if (!inputSanitizer.isValidUUID(id)) {
      logger.warn('Invalid ticket ID format for state transition', { ticketId: id });
      throw new ValidationError(
        'Invalid ticket ID format',
        [{
          field: 'id',
          message: 'ID must be a valid UUID',
          code: ErrorCode.INVALID_UUID_FORMAT,
        }]
      );
    }

    const idValidation = validator.validateUUID(id);
    if (!idValidation.valid) {
      logger.warn('Invalid ticket ID format for state transition', {
        ticketId: id,
        errors: idValidation.errors,
      });
      throw new ValidationError('Invalid ticket ID format', idValidation.errors);
    }

    // Retrieve current ticket
    const ticket = await ticketRepository.findTicketById(id);
    if (!ticket) {
      logger.warn('Ticket not found for state transition', { ticketId: id });
      throw new NotFoundError(`Ticket with ID '${id}' does not exist`, ErrorCode.TICKET_NOT_FOUND);
    }

    // Validate state transition using state machine
    const transitionValidation = ticketStateMachine.validateTransition(
      ticket.state,
      newState
    );

    if (!transitionValidation.valid) {
      logger.warn('Invalid state transition', {
        ticketId: id,
        currentState: ticket.state,
        requestedState: newState,
        errors: transitionValidation.errors,
      });
      
      // Throw StateTransitionError for 422 status code
      const errorMessage = transitionValidation.errors?.[0]?.message || 
        `Invalid state transition from ${ticket.state} to ${newState}`;
      const errorCode = (transitionValidation.errors?.[0]?.code as ErrorCode) || ErrorCode.INVALID_TRANSITION;
      
      throw new StateTransitionError(errorMessage, errorCode);
    }

    // Update ticket state
    await ticketRepository.updateTicket(id, { state: newState });

    // Retrieve updated ticket
    const updatedTicket = await ticketRepository.findTicketById(id);
    if (!updatedTicket) {
      // This should not happen but handle it defensively
      throw new NotFoundError(
        `Ticket with ID '${id}' not found after update`,
        ErrorCode.TICKET_NOT_FOUND
      );
    }

    logger.info('Ticket state transitioned successfully', {
      ticketId: id,
      oldState: ticket.state,
      newState: updatedTicket.state,
    });

    return updatedTicket;
  }

  /**
   * Assign a ticket to a team member
   *
   * Requirements: 5.1, 5.2, 5.5, 5.6, 5.7, Business Rule BR-7
   *
   * Supports assignment, reassignment, and unassignment (set to null).
   * Prevents assignment to tickets in terminal states (Closed, Cancelled).
   *
   * @param id - Ticket UUID
   * @param request - Assignment request containing assignee identifier or null
   * @returns Promise<Ticket> - Updated ticket with new assignee
   * @throws ValidationError if request validation fails or ID format is invalid
   * @throws NotFoundError if ticket does not exist
   * @throws ForbiddenError if ticket is in terminal state
   */
  async assignTicket(id: string, request: AssignTicketRequest): Promise<Ticket> {
    logger.debug('Assigning ticket', { ticketId: id, assignee: request.assignee });

    // Validate UUID format using both validator and inputSanitizer
    if (!inputSanitizer.isValidUUID(id)) {
      logger.warn('Invalid ticket ID format', { ticketId: id });
      throw new ValidationError(
        'Invalid ticket ID format',
        [{
          field: 'id',
          message: 'ID must be a valid UUID',
          code: ErrorCode.INVALID_UUID_FORMAT,
        }]
      );
    }

    const uuidValidation = validator.validateUUID(id);
    if (!uuidValidation.valid) {
      logger.warn('Invalid ticket ID format', { ticketId: id, errors: uuidValidation.errors });
      throw new ValidationError('Invalid ticket ID format', uuidValidation.errors);
    }

    // Validate assignment request
    const validationResult = validator.validateAssignment(request);
    if (!validationResult.valid) {
      logger.warn('Assignment validation failed', { ticketId: id, errors: validationResult.errors });
      throw new ValidationError(
        'Validation failed for assignment request',
        validationResult.errors
      );
    }

    // Retrieve current ticket to check state
    const currentTicket = await ticketRepository.findTicketById(id);
    if (!currentTicket) {
      logger.warn('Ticket not found for assignment', { ticketId: id });
      throw new NotFoundError(`Ticket with ID '${id}' does not exist`, ErrorCode.TICKET_NOT_FOUND);
    }

    // Check if ticket is in terminal state (Business Rule BR-7)
    if (ticketStateMachine.isTerminalState(currentTicket.state)) {
      logger.warn('Cannot assign ticket in terminal state', {
        ticketId: id,
        state: currentTicket.state,
      });
      throw new ForbiddenError(
        `Cannot assign ticket in terminal state ${currentTicket.state}`,
        ErrorCode.CANNOT_MODIFY_TERMINAL
      );
    }

    // Update assignee
    await ticketRepository.updateTicket(id, { assignee: request.assignee });

    // Retrieve and return updated ticket
    const updatedTicket = await ticketRepository.findTicketById(id);
    if (!updatedTicket) {
      // This should not happen, but handle it just in case
      throw new NotFoundError(`Ticket with ID '${id}' does not exist`, ErrorCode.TICKET_NOT_FOUND);
    }

    logger.info('Ticket assigned successfully', {
      ticketId: id,
      oldAssignee: currentTicket.assignee,
      newAssignee: updatedTicket.assignee,
    });

    return updatedTicket;
  }
}

// Export singleton instance
export const ticketService = new TicketService();
