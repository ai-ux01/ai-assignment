/**
 * Ticket API Routes
 *
 * Implements REST API endpoints for ticket operations
 *
 * Requirements:
 * - 1.1-1.7: POST /api/v1/tickets - Create ticket
 * - 2.1-2.5: GET /api/v1/tickets - List all tickets
 * - 3.1-3.5: GET /api/v1/tickets/:id - Get ticket details
 * - 9.1-9.8: PATCH /api/v1/tickets/:id/state - Transition ticket state
 */

import { Router, Request, Response } from 'express';
import { ticketService } from '../services/TicketService';
import { asyncHandler } from '../middleware/errorMiddleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
// import { authenticateRequest } from '../middleware/auth.middleware'; // TEMPORARILY DISABLED FOR DEVELOPMENT
import { CreateTicketRequest, TicketState, Priority } from '../models/ticket';
import { CreateCommentRequest } from '../models/comment';
import { commentRepository } from '../repositories/CommentRepository';
import { searchService } from '../services/SearchService';
import { validator } from '../utils/validator';
import { inputSanitizer } from '../utils/inputSanitizer';
import { ValidationError } from '../utils/customErrors';
import { auditLogger, AuditOperation } from '../utils/auditLogger';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/tickets
 * Create a new ticket
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 *
 * Request Body:
 * {
 *   "title": "string (required, 1-200 characters)",
 *   "description": "string (required, 1-5000 characters)",
 *   "priority": "string (required, enum: Low|Medium|High|Critical)"
 * }
 *
 * Success Response: 201 Created
 * {
 *   "id": "string (UUID)",
 *   "title": "string",
 *   "description": "string",
 *   "priority": "string",
 *   "state": "Open",
 *   "assignee": null,
 *   "createdAt": "ISO8601 timestamp",
 *   "updatedAt": "ISO8601 timestamp"
 * }
 *
 * Error Responses:
 * - 400 Bad Request - Invalid or missing required fields
 * - 401 Unauthorized - Missing or invalid authentication token
 * - 500 Internal Server Error - System error
 */
router.post(
  '/',
  // authenticateRequest, // TEMPORARILY DISABLED FOR DEVELOPMENT - Re-enable for production!
  asyncHandler(async (req: Request, res: Response) => {
    const authenticatedReq = req as AuthenticatedRequest;
    const userId = authenticatedReq.user?.id || 'dev-user'; // Fallback for development
    const requestId = authenticatedReq.requestId || 'dev-request-' + Date.now();

    logger.info('POST /api/v1/tickets request', {
      userId,
      requestId,
      title: req.body.title,
    });

    // Extract request body
    const createRequest: CreateTicketRequest = {
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
    };

    // Create ticket via service
    const ticket = await ticketService.createTicket(createRequest);

    // Log ticket creation to audit trail
    auditLogger.logTicketCreation({
      operation: AuditOperation.CREATE_TICKET,
      userId,
      ticketId: ticket.id,
      requestId,
      details: {
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        state: ticket.state,
      },
    });

    logger.info('Ticket created successfully', {
      ticketId: ticket.id,
      userId,
      requestId,
    });

    // Return 201 Created with ticket object
    res.status(201).json(ticket);
  })
);

/**
 * GET /api/v1/tickets
 * List all tickets
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 *
 * Returns all tickets with all core fields in consistent order.
 * Returns empty list if no tickets exist.
 *
 * Success Response: 200 OK
 * {
 *   "tickets": [
 *     {
 *       "id": "string",
 *       "title": "string",
 *       "description": "string",
 *       "priority": "string",
 *       "state": "string",
 *       "assignee": "string|null",
 *       "createdAt": "ISO8601 timestamp",
 *       "updatedAt": "ISO8601 timestamp"
 *     }
 *   ],
 *   "count": "integer"
 * }
 *
 * Error Responses:
 * - 500 Internal Server Error: Database unavailable
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    logger.debug('GET /api/v1/tickets request', {
      requestId: req.requestId,
    });

    // Call TicketService.listTickets to retrieve all tickets
    const tickets = await ticketService.listTickets();

    logger.info('Tickets listed successfully', {
      count: tickets.length,
      requestId: req.requestId,
    });

    // Return 200 OK with tickets array and count
    res.status(200).json({
      tickets,
      count: tickets.length,
    });
  })
);

/**
 * GET /api/v1/tickets/filter
 * Filter tickets by status
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 *
 * Query Parameters:
 * - state: State value (required, enum: Open|In_Progress|Resolved|Closed|Cancelled)
 *
 * Success Response: 200 OK
 * {
 *   "tickets": [
 *     {
 *       "id": "string",
 *       "title": "string",
 *       "description": "string",
 *       "priority": "string",
 *       "state": "string",
 *       "assignee": "string|null",
 *       "createdAt": "ISO8601 timestamp",
 *       "updatedAt": "ISO8601 timestamp"
 *     }
 *   ],
 *   "count": "integer",
 *   "filter": "string"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid state value
 * - 500 Internal Server Error: System error
 */
router.get(
  '/filter',
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = req.requestId || 'unknown';
    const { state } = req.query;

    logger.debug('GET /api/v1/tickets/filter request', {
      state,
      requestId,
    });

    // Validate state parameter is provided
    if (!state || typeof state !== 'string') {
      logger.warn('Missing or invalid state parameter', { state, requestId });
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'State query parameter is required and must be a string',
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // Validate state value is a valid TicketState enum value
    const validStates = Object.values(TicketState);
    if (!validStates.includes(state as TicketState)) {
      logger.warn('Invalid state value for filter', { state, requestId });
      res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: `Invalid state value. Must be one of: ${validStates.join(', ')}`,
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    // Call SearchService.filterByState
    const tickets = await searchService.filterByState(state as TicketState);

    logger.info('Tickets filtered by state successfully', {
      state,
      count: tickets.length,
      requestId,
    });

    // Return 200 OK with tickets array, count, and filter
    res.status(200).json({
      tickets,
      count: tickets.length,
      filter: state,
    });
  })
);

/**
 * GET /api/v1/tickets/search
 * Search tickets by keyword
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 *
 * Query Parameters:
 * - q: Search keyword (required, non-empty)
 *
 * Success Response: 200 OK
 * {
 *   "tickets": [
 *     {
 *       "id": "string",
 *       "title": "string",
 *       "description": "string",
 *       "priority": "string",
 *       "state": "string",
 *       "assignee": "string|null",
 *       "createdAt": "ISO8601 timestamp",
 *       "updatedAt": "ISO8601 timestamp"
 *     }
 *   ],
 *   "count": "integer",
 *   "query": "string"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Empty or whitespace-only query
 * - 500 Internal Server Error: System error
 */
router.get(
  '/search',
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = req.requestId;
    const query = req.query.q as string;

    logger.info('GET /api/v1/tickets/search request', {
      requestId,
      query,
    });

    // Validate search query parameter
    if (!query) {
      logger.warn('Missing search query parameter', { requestId });
      throw new ValidationError('Search query parameter "q" is required', [
        {
          field: 'q',
          message: 'Search query parameter "q" is required',
          code: 'MISSING_REQUIRED_FIELD',
        },
      ]);
    }

    // Search tickets via SearchService (which handles validation and sanitization)
    const tickets = await searchService.searchByKeyword(query);

    logger.info('Search completed successfully', {
      query,
      resultCount: tickets.length,
      requestId,
    });

    // Return 200 OK with tickets array, count, and query
    res.status(200).json({
      tickets,
      count: tickets.length,
      query,
    });
  })
);

/**
 * GET /api/v1/tickets/:id
 * Get ticket details with comments
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 *
 * Path Parameters:
 * - id: Ticket UUID
 *
 * Success Response: 200 OK
 * {
 *   "id": "string (UUID)",
 *   "title": "string",
 *   "description": "string",
 *   "priority": "string",
 *   "state": "string",
 *   "assignee": "string|null",
 *   "createdAt": "ISO8601 timestamp",
 *   "updatedAt": "ISO8601 timestamp",
 *   "comments": [
 *     {
 *       "id": "string",
 *       "text": "string",
 *       "author": "string",
 *       "createdAt": "ISO8601 timestamp"
 *     }
 *   ]
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid ticket ID format
 * - 404 Not Found: Ticket ID does not exist
 * - 500 Internal Server Error: System error
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    logger.debug('GET /api/v1/tickets/:id request', {
      ticketId: id,
      requestId: req.requestId,
    });

    // Retrieve ticket with comments
    // The service handles ID format validation and throws appropriate errors
    const ticket = await ticketService.getTicket(id as string);

    logger.info('Ticket details retrieved', {
      ticketId: id,
      commentCount: ticket.comments.length,
      requestId: req.requestId,
    });

    // Return 200 OK with ticket object including comments
    res.status(200).json(ticket);
  })
);

/**
 * PATCH /api/v1/tickets/:id
 * Update ticket information
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 *
 * Path Parameters:
 * - id: Ticket UUID
 *
 * Request Body (all fields optional):
 * {
 *   "title": "string (1-200 characters)",
 *   "description": "string (1-5000 characters)",
 *   "priority": "string (enum: Low|Medium|High|Critical)"
 * }
 *
 * Success Response: 200 OK
 * {
 *   "id": "string",
 *   "title": "string",
 *   "description": "string",
 *   "priority": "string",
 *   "state": "string",
 *   "assignee": "string|null",
 *   "createdAt": "ISO8601 timestamp",
 *   "updatedAt": "ISO8601 timestamp"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid field values or ticket ID format
 * - 401 Unauthorized: Missing or invalid authentication token
 * - 404 Not Found: Ticket ID does not exist
 * - 500 Internal Server Error: System error
 */
router.patch(
  '/:id',
  // authenticateRequest, // TEMPORARILY DISABLED FOR DEVELOPMENT - Re-enable for production!
  asyncHandler(async (req: Request, res: Response) => {
    const authenticatedReq = req as AuthenticatedRequest;
    const userId = authenticatedReq.user?.id || 'dev-user'; // Fallback for development
    const requestId = authenticatedReq.requestId || 'dev-request-' + Date.now();
    const { id } = req.params;

    // Ensure id is a string
    if (!id) {
      throw new Error('Ticket ID is required');
    }

    logger.info('PATCH /api/v1/tickets/:id request', {
      userId,
      requestId,
      ticketId: id,
    });

    // Validate the entire request body first (to check for immutable fields)
    const validationResult = validator.validateTicketUpdate(req.body);
    if (!validationResult.valid) {
      logger.warn('Invalid ticket update request', {
        ticketId: id,
        errors: validationResult.errors,
      });
      throw new ValidationError('Validation failed for ticket update request', validationResult.errors);
    }

    // Extract update request body and convert priority to enum if present
    const updates: Partial<{ title?: string; description?: string; priority?: Priority }> = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.priority !== undefined) updates.priority = req.body.priority as Priority;

    // Get old ticket values for audit logging
    const oldTicket = await ticketService.getTicket(id as string);
    
    // Update ticket via service (service will apply sanitization)
    const updatedTicket = await ticketService.updateTicket(id as string, updates);

    // Build audit log details
    const changedFields = Object.keys(updates);
    const changes: Record<string, { old: any; new: any }> = {};
    for (const field of changedFields) {
      const fieldKey = field as keyof typeof updates;
      changes[field] = {
        old: oldTicket[fieldKey],
        new: updates[fieldKey],
      };
    }

    // Log ticket update to audit trail
    auditLogger.logTicketUpdate({
      operation: AuditOperation.UPDATE_TICKET,
      userId,
      ticketId: id as string,
      requestId,
      details: {
        changedFields,
        changes,
      },
    });

    logger.info('Ticket updated successfully', {
      ticketId: id,
      userId,
      requestId,
      changedFields,
    });

    // Return 200 OK with updated ticket object
    res.status(200).json(updatedTicket);
  })
);

/**
 * PATCH /api/v1/tickets/:id/assignee
 * Assign ticket to a team member
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 *
 * Path Parameters:
 * - id: Ticket UUID
 *
 * Request Body:
 * {
 *   "assignee": "string (user identifier)|null"
 * }
 *
 * Success Response: 200 OK
 * {
 *   "id": "string",
 *   "title": "string",
 *   "description": "string",
 *   "priority": "string",
 *   "state": "string",
 *   "assignee": "string|null",
 *   "createdAt": "ISO8601 timestamp",
 *   "updatedAt": "ISO8601 timestamp"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid assignee identifier or ticket ID format
 * - 401 Unauthorized: Missing or invalid authentication token
 * - 403 Forbidden: Cannot assign closed/cancelled tickets
 * - 404 Not Found: Ticket ID does not exist
 * - 500 Internal Server Error: System error
 */
router.patch(
  '/:id/assignee',
  // authenticateRequest, // TEMPORARILY DISABLED FOR DEVELOPMENT - Re-enable for production!
  asyncHandler(async (req: Request, res: Response) => {
    const authenticatedReq = req as AuthenticatedRequest;
    const userId = authenticatedReq.user?.id || 'dev-user'; // Fallback for development
    const requestId = authenticatedReq.requestId || 'dev-request-' + Date.now();
    const { id } = req.params;

    logger.info('PATCH /api/v1/tickets/:id/assignee request', {
      userId,
      requestId,
      ticketId: id,
      assignee: req.body.assignee,
    });

    // Extract assignment request
    const assignmentRequest = {
      assignee: req.body.assignee,
    };

    // Store old assignee for audit log
    const ticketBeforeUpdate = await ticketService.getTicket(id as string);
    const oldAssignee = ticketBeforeUpdate.assignee;

    // Assign ticket via service
    const ticket = await ticketService.assignTicket(id as string, assignmentRequest);

    // Log assignment to audit trail
    auditLogger.logAssignment({
      operation: AuditOperation.ASSIGN_TICKET,
      userId,
      ticketId: ticket.id,
      requestId,
      details: {
        oldAssignee,
        newAssignee: ticket.assignee,
      },
    });

    logger.info('Ticket assigned successfully', {
      ticketId: ticket.id,
      oldAssignee,
      newAssignee: ticket.assignee,
      userId,
      requestId,
    });

    // Return 200 OK with updated ticket object
    res.status(200).json(ticket);
  })
);

/**
 * POST /api/v1/tickets/:id/comments
 * Add a comment to a ticket
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 *
 * Path Parameters:
 * - id: Ticket UUID
 *
 * Request Body:
 * {
 *   "text": "string (required, 1-2000 characters)",
 *   "author": "string (required, user identifier)"
 * }
 *
 * Success Response: 201 Created
 * {
 *   "id": "string (UUID)",
 *   "ticketId": "string",
 *   "text": "string",
 *   "author": "string",
 *   "createdAt": "ISO8601 timestamp"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid ticket ID format, empty/whitespace-only text, or missing fields
 * - 401 Unauthorized: Missing or invalid authentication token
 * - 404 Not Found: Ticket ID does not exist
 * - 500 Internal Server Error: System error
 */
router.post(
  '/:id/comments',
  // authenticateRequest, // TEMPORARILY DISABLED FOR DEVELOPMENT - Re-enable for production!
  asyncHandler(async (req: Request, res: Response) => {
    const authenticatedReq = req as AuthenticatedRequest;
    const userId = authenticatedReq.user?.id || 'dev-user'; // Fallback for development
    const requestId = authenticatedReq.requestId || 'dev-request-' + Date.now();
    const ticketId = req.params.id as string;

    logger.info('POST /api/v1/tickets/:id/comments request', {
      userId,
      requestId,
      ticketId,
    });

    // Validate ticket ID format
    const idValidationResult = validator.validateUUID(ticketId);
    if (!idValidationResult.valid) {
      logger.warn('Invalid ticket ID format for comment', {
        ticketId,
        errors: idValidationResult.errors,
      });
      throw new ValidationError('Invalid ticket ID format', idValidationResult.errors);
    }

    // Sanitize comment text before validation (handle undefined/null)
    const sanitizedCommentRequest: CreateCommentRequest = {
      text: req.body.text ? inputSanitizer.sanitizeText(req.body.text) : req.body.text,
      author: req.body.author,
    };

    // Extract and validate request body
    const validationResult = validator.validateComment(sanitizedCommentRequest);
    if (!validationResult.valid) {
      logger.warn('Comment validation failed', {
        errors: validationResult.errors,
        ticketId,
      });
      throw new ValidationError(
        'Validation failed for comment creation request',
        validationResult.errors
      );
    }

    // Verify ticket exists by attempting to retrieve it
    // This will throw NotFoundError if ticket doesn't exist
    await ticketService.getTicket(ticketId);

    // Create comment via repository
    // The repository will handle foreign key validation as well
    const comment = await commentRepository.insertComment({
      ticketId,
      text: sanitizedCommentRequest.text,
      author: sanitizedCommentRequest.author,
    });

    // Log comment addition to audit trail
    auditLogger.logCommentAdded({
      operation: AuditOperation.ADD_COMMENT,
      userId,
      ticketId,
      requestId,
      details: {
        commentId: comment.id,
        text: comment.text,
        author: comment.author,
      },
    });

    logger.info('Comment added successfully', {
      commentId: comment.id,
      ticketId,
      userId,
      requestId,
    });

    // Return 201 Created with comment object
    res.status(201).json(comment);
  })
);

/**
 * PATCH /api/v1/tickets/:id/state
 * Transition ticket state with state machine validation
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 *
 * Path Parameters:
 * - id: Ticket UUID
 *
 * Request Body:
 * {
 *   "state": "string (required, enum: Open|In_Progress|Resolved|Closed|Cancelled)"
 * }
 *
 * Success Response: 200 OK
 * {
 *   "id": "string (UUID)",
 *   "title": "string",
 *   "description": "string",
 *   "priority": "string",
 *   "state": "string",
 *   "assignee": "string|null",
 *   "createdAt": "ISO8601 timestamp",
 *   "updatedAt": "ISO8601 timestamp"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid ticket ID format
 * - 404 Not Found: Ticket ID does not exist
 * - 422 Unprocessable Entity: Invalid state transition or invalid state value
 * - 500 Internal Server Error: System error
 */
router.patch(
  '/:id/state',
  // authenticateRequest, // TEMPORARILY DISABLED FOR DEVELOPMENT - Re-enable for production!
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const authenticatedReq = req as AuthenticatedRequest;
    const userId = authenticatedReq.user?.id || 'dev-user'; // Fallback for development
    const requestId = authenticatedReq.requestId || 'dev-request-' + Date.now();

    logger.info('PATCH /api/v1/tickets/:id/state request', {
      ticketId: id,
      requestedState: req.body.state,
      userId,
      requestId,
    });

    // Ensure id is present
    if (!id) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Ticket ID is required',
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    }

    // Extract and validate state from request body
    const { state } = req.body;

    // Validate state value is provided and is a valid TicketState
    if (!state || typeof state !== 'string') {
      logger.warn('Missing or invalid state in request', { ticketId: id, state });
      return res.status(422).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'State is required and must be a string',
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    }

    // Check if state is a valid TicketState enum value
    const validStates = Object.values(TicketState);
    if (!validStates.includes(state as TicketState)) {
      logger.warn('Invalid state value', { ticketId: id, state });
      return res.status(422).json({
        error: {
          code: 'INVALID_STATE',
          message: `Invalid state value. Must be one of: ${validStates.join(', ')}`,
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    }

    // Get current ticket to capture old state for audit log
    const currentTicket = await ticketService.getTicket(id as string);
    const oldState = currentTicket.state;

    // Transition state via service
    const updatedTicket = await ticketService.transitionState(id as string, state as TicketState);

    // Log state transition to audit trail
    auditLogger.logStateTransition({
      operation: AuditOperation.STATE_TRANSITION,
      userId,
      ticketId: id as string,
      requestId,
      details: {
        oldState,
        newState: updatedTicket.state,
      },
    });

    logger.info('Ticket state transitioned successfully', {
      ticketId: id,
      oldState,
      newState: updatedTicket.state,
      userId,
      requestId,
    });

    // Return 200 OK with updated ticket object
    return res.status(200).json(updatedTicket);
  })
);

export default router;

