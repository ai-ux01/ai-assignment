/**
 * Error Handling Framework - Usage Examples
 *
 * This file demonstrates how to use the error handling framework
 * in various scenarios throughout the application.
 */

import { Request, Response } from 'express';
import { asyncHandler } from './errorMiddleware';
import {
  ValidationError,
  NotFoundError,
  StateTransitionError,
  DatabaseError,
  BusinessRuleError,
} from '../utils/customErrors';
import { ErrorCode } from '../models/errors';

/**
 * Example 1: Validation Error with Multiple Fields
 * Use when input validation fails for multiple fields
 */
export const exampleValidationError = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, priority } = req.body;
  const errors = [];

  // Validate required fields
  if (!title || title.trim() === '') {
    errors.push({
      field: 'title',
      message: 'Title is required and cannot be empty',
      code: 'MISSING_REQUIRED_FIELD',
    });
  }

  if (!description || description.trim() === '') {
    errors.push({
      field: 'description',
      message: 'Description is required and cannot be empty',
      code: 'MISSING_REQUIRED_FIELD',
    });
  }

  // Validate enum values
  const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
  if (!priority || !validPriorities.includes(priority)) {
    errors.push({
      field: 'priority',
      message: `Priority must be one of: ${validPriorities.join(', ')}`,
      code: 'INVALID_PRIORITY',
    });
  }

  // Throw validation error if any errors exist
  if (errors.length > 0) {
    throw new ValidationError('Validation failed for ticket creation request', errors);
  }

  // Continue with business logic
  res.status(201).json({ message: 'Ticket created' });
});

/**
 * Example 2: Not Found Error
 * Use when a requested resource does not exist
 */
export const exampleNotFoundError = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;

  // Simulate database lookup
  const ticket = null; // await ticketRepository.findById(id);

  if (!ticket) {
    throw new NotFoundError(`Ticket with ID '${id}' does not exist`, ErrorCode.TICKET_NOT_FOUND);
  }

  res.json(ticket);
});

/**
 * Example 3: State Transition Error
 * Use when attempting an invalid state transition
 */
export const exampleStateTransitionError = asyncHandler(async (req: Request, res: Response) => {
  const { state: newState } = req.body;

  // Simulate current state
  const currentState = 'Open';
  const validTransitions = ['In_Progress', 'Cancelled'];

  // Validate state transition
  if (!validTransitions.includes(newState)) {
    throw new StateTransitionError(
      `Invalid state transition from ${currentState} to ${newState}. ` +
        `Allowed transitions: ${validTransitions.join(', ')}`,
      ErrorCode.INVALID_TRANSITION
    );
  }

  res.json({ message: 'State updated' });
});

/**
 * Example 4: Terminal State Error
 * Use when attempting to modify a ticket in terminal state
 */
export const exampleTerminalStateError = asyncHandler(async (_req: Request, res: Response) => {
  // Simulate ticket state
  const ticketState = 'Closed';
  const terminalStates = ['Closed', 'Cancelled'];

  // Check if ticket is in terminal state
  if (terminalStates.includes(ticketState)) {
    throw new StateTransitionError(
      `Ticket is in terminal state ${ticketState}. No further transitions allowed.`,
      ErrorCode.TERMINAL_STATE
    );
  }

  res.json({ message: 'Ticket updated' });
});

/**
 * Example 5: Database Error - Connection Failure
 * Use when database is unavailable
 */
export const exampleDatabaseUnavailable = asyncHandler(async (_req: Request, _res: Response) => {
  try {
    // Simulate database connection failure
    throw new Error('Connection timeout');
  } catch (err) {
    throw new DatabaseError(
      'Database is temporarily unavailable. Please try again later.',
      ErrorCode.DATABASE_UNAVAILABLE,
      503
    );
  }
});

/**
 * Example 6: Database Error - Query Failure
 * Use when a database operation fails
 */
export const exampleDatabaseError = asyncHandler(async (_req: Request, _res: Response) => {
  try {
    // Simulate database query failure
    throw new Error('Query failed');
  } catch (err) {
    throw new DatabaseError(
      'Failed to retrieve tickets. Please try again.',
      ErrorCode.DATABASE_ERROR,
      500
    );
  }
});

/**
 * Example 7: Business Rule Error - Invalid Assignee
 * Use when a business rule is violated
 */
export const exampleBusinessRuleError = asyncHandler(async (req: Request, res: Response) => {
  const { assignee } = req.body;

  // Validate assignee format (example: must be valid email)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(assignee)) {
    throw new BusinessRuleError(
      'Assignee must be a valid email address',
      ErrorCode.INVALID_ASSIGNEE
    );
  }

  res.json({ message: 'Ticket assigned' });
});

/**
 * Example 8: Field Length Validation
 * Use when field length constraints are violated
 */
export const exampleFieldLengthError = asyncHandler(async (req: Request, res: Response) => {
  const { title, description } = req.body;
  const errors = [];

  // Validate field lengths
  if (title && title.length > 200) {
    errors.push({
      field: 'title',
      message: 'Title cannot exceed 200 characters',
      code: 'FIELD_TOO_LONG',
    });
  }

  if (description && description.length > 5000) {
    errors.push({
      field: 'description',
      message: 'Description cannot exceed 5000 characters',
      code: 'FIELD_TOO_LONG',
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Field length validation failed', errors);
  }

  res.json({ message: 'Validation passed' });
});

/**
 * Example 9: UUID Format Validation
 * Use when validating UUID format
 */
export const exampleUUIDValidation = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id || '';

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new ValidationError('Invalid ticket ID format', [
      {
        field: 'id',
        message: 'Ticket ID must be a valid UUID',
        code: 'INVALID_UUID_FORMAT',
      },
    ]);
  }

  res.json({ message: 'Valid UUID' });
});

/**
 * Example 10: Whitespace-Only Field
 * Use when checking for whitespace-only input
 */
export const exampleWhitespaceValidation = asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body;

  // Check for whitespace-only input
  if (!text || text.trim() === '') {
    throw new ValidationError('Comment text cannot be empty or whitespace-only', [
      {
        field: 'text',
        message: 'Comment text must contain non-whitespace characters',
        code: 'WHITESPACE_ONLY',
      },
    ]);
  }

  res.json({ message: 'Comment added' });
});

/**
 * Example 11: Combining Multiple Error Checks
 * Comprehensive validation example
 */
export const exampleComprehensiveValidation = asyncHandler(async (req: Request, res: Response) => {
  const { title, priority } = req.body;
  const errors = [];

  // Required field check
  if (!title) {
    errors.push({
      field: 'title',
      message: 'Title is required',
      code: 'MISSING_REQUIRED_FIELD',
    });
  } else {
    // Whitespace check
    if (title.trim() === '') {
      errors.push({
        field: 'title',
        message: 'Title cannot be whitespace-only',
        code: 'WHITESPACE_ONLY',
      });
    }
    // Length check
    else if (title.trim().length < 3) {
      errors.push({
        field: 'title',
        message: 'Title must be at least 3 characters',
        code: 'FIELD_TOO_SHORT',
      });
    } else if (title.length > 200) {
      errors.push({
        field: 'title',
        message: 'Title cannot exceed 200 characters',
        code: 'FIELD_TOO_LONG',
      });
    }
  }

  // Priority validation
  const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
  if (priority && !validPriorities.includes(priority)) {
    errors.push({
      field: 'priority',
      message: `Priority must be one of: ${validPriorities.join(', ')}`,
      code: 'INVALID_PRIORITY',
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Ticket validation failed', errors);
  }

  res.status(201).json({ message: 'Ticket created successfully' });
});
