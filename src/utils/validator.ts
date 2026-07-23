/**
 * Backend Validator
 * Implements all validation logic using Zod schemas
 */

import { z } from 'zod';
import {
  Priority,
  TicketState,
  ValidationResult,
  ValidationError,
  ErrorCode,
} from '../models';

/**
 * Zod schema for Priority enum
 */
const prioritySchema = z.nativeEnum(Priority, {
  errorMap: () => ({
    message: `Priority must be one of: ${Object.values(Priority).join(', ')}`,
  }),
});

/**
 * Zod schema for TicketState enum
 */
const ticketStateSchema = z.nativeEnum(TicketState, {
  errorMap: () => ({
    message: `State must be one of: ${Object.values(TicketState).join(', ')}`,
  }),
});

/**
 * Zod schema for ticket title validation
 */
const titleSchema = z
  .string()
  .min(1, 'Title is required and cannot be empty')
  .max(200, 'Title cannot exceed 200 characters')
  .refine((val) => val.trim().length > 0, {
    message: 'Title cannot be only whitespace',
  });

/**
 * Zod schema for ticket description validation
 */
const descriptionSchema = z
  .string()
  .min(1, 'Description is required and cannot be empty')
  .max(5000, 'Description cannot exceed 5000 characters')
  .refine((val) => val.trim().length > 0, {
    message: 'Description cannot be only whitespace',
  });

/**
 * Zod schema for comment text validation
 */
const commentTextSchema = z
  .string()
  .min(1, 'Comment text is required and cannot be empty')
  .max(2000, 'Comment text cannot exceed 2000 characters')
  .refine((val) => val.trim().length > 0, {
    message: 'Comment text cannot be only whitespace',
  });

/**
 * Zod schema for user identifier validation
 */
const userIdentifierSchema = z
  .string()
  .min(1, 'User identifier is required')
  .max(100, 'User identifier cannot exceed 100 characters');

/**
 * Zod schema for UUID validation
 */
const uuidSchema = z
  .string()
  .uuid('Invalid UUID format')
  .min(1, 'ID is required');

/**
 * Zod schema for search query validation
 */
const searchQuerySchema = z
  .string()
  .min(1, 'Search query is required')
  .refine((val) => val.trim().length > 0, {
    message: 'Search query cannot be only whitespace',
  });

/**
 * Zod schema for assignee validation (can be string or null)
 * Supports email, username (alphanumeric with underscores/hyphens), or UUID format
 */
const assigneeSchema = z
  .union([
    z.string()
      .min(1, 'Assignee identifier cannot be empty')
      .max(100, 'Assignee identifier cannot exceed 100 characters')
      .refine(
        (val) => val.trim().length > 0,
        { message: 'Assignee identifier cannot be only whitespace' }
      )
      .refine(
        (val) => {
          // Email format: basic email validation (must have @ and . after @)
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          // UUID format: standard UUID format (check first to avoid confusion with usernames)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          // Username format: alphanumeric with underscores, hyphens, dots (3-100 chars, must not look like email or UUID)
          // A username should not contain @ symbol (that's for emails)
          const usernameRegex = /^[a-zA-Z0-9._-]{3,100}$/;
          
          // Check UUID first (most specific)
          if (uuidRegex.test(val)) {
            return true;
          }
          
          // Check email (must have @ symbol)
          if (emailRegex.test(val)) {
            return true;
          }
          
          // Check username (no @ symbol, alphanumeric with limited special chars)
          if (usernameRegex.test(val) && !val.includes('@')) {
            return true;
          }
          
          return false;
        },
        {
          message: 'Assignee identifier must be a valid email, username (alphanumeric with ._-), or UUID',
        }
      ),
    z.null(),
  ]);

/**
 * Zod schema for ticket creation request
 */
const createTicketSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  priority: prioritySchema,
});

/**
 * Zod schema for ticket update request
 */
const updateTicketSchema = z.object({
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  priority: prioritySchema.optional(),
});

/**
 * Zod schema for assignment request
 */
const assignTicketSchema = z.object({
  assignee: assigneeSchema,
});

/**
 * Zod schema for state transition request
 */
const stateTransitionSchema = z.object({
  state: ticketStateSchema,
});

/**
 * Zod schema for comment creation request
 */
const createCommentSchema = z.object({
  text: commentTextSchema,
  author: userIdentifierSchema,
});

/**
 * Backend Validator class implementing all validation methods
 */
export class Validator {
  /**
   * Validates a ticket creation request
   * @param payload - The ticket creation request payload
   * @returns ValidationResult indicating success or failure with errors
   */
  public validateTicketCreation(
    payload: unknown
  ): ValidationResult {
    return this.validate(createTicketSchema, payload);
  }

  /**
   * Validates a ticket update request
   * @param payload - The ticket update request payload
   * @returns ValidationResult indicating success or failure with errors
   */
  public validateTicketUpdate(
    payload: unknown
  ): ValidationResult {
    // First, validate using the schema
    const schemaValidation = this.validate(updateTicketSchema, payload);
    
    if (!schemaValidation.valid) {
      return schemaValidation;
    }

    // Then, check for immutable fields in the payload
    if (typeof payload === 'object' && payload !== null) {
      const immutableFields = ['id', 'createdAt', 'updatedAt', 'state', 'assignee'];
      const errors: ValidationError[] = [];
      
      for (const field of immutableFields) {
        if (field in payload) {
          errors.push({
            field,
            message: `Field '${field}' is immutable and cannot be updated`,
            code: ErrorCode.INVALID_INPUT,
          });
        }
      }
      
      if (errors.length > 0) {
        return {
          valid: false,
          errors,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validates a state transition request
   * Note: This only validates the request format. Business logic validation
   * (checking if transition is allowed) is handled by TicketStateMachine.
   * @param payload - The state transition request payload
   * @returns ValidationResult indicating success or failure with errors
   */
  public validateStateTransitionRequest(
    payload: unknown
  ): ValidationResult {
    return this.validate(stateTransitionSchema, payload);
  }

  /**
   * Validates a state transition from current state to new state
   * This is a placeholder for state machine validation logic
   * The actual state machine logic will be implemented in TicketStateMachine class
   * @param currentState - Current ticket state
   * @param newState - Requested new state
   * @returns ValidationResult indicating if transition is valid
   */
  public validateStateTransition(
    currentState: TicketState,
    newState: TicketState
  ): ValidationResult {
    // State machine validation logic will be implemented separately
    // This is just a structure placeholder
    if (currentState === newState) {
      return {
        valid: false,
        errors: [
          {
            field: 'state',
            message: `Ticket is already in ${currentState} state`,
            code: ErrorCode.INVALID_TRANSITION,
          },
        ],
      };
    }
    return { valid: true };
  }

  /**
   * Validates an assignment request
   * @param payload - The assignment request payload
   * @returns ValidationResult indicating success or failure with errors
   */
  public validateAssignment(payload: unknown): ValidationResult {
    return this.validate(assignTicketSchema, payload);
  }

  /**
   * Validates a comment creation request
   * @param payload - The comment creation request payload
   * @returns ValidationResult indicating success or failure with errors
   */
  public validateComment(payload: unknown): ValidationResult {
    return this.validate(createCommentSchema, payload);
  }

  /**
   * Validates a search query
   * @param query - The search query string
   * @returns ValidationResult indicating success or failure with errors
   */
  public validateSearchQuery(query: unknown): ValidationResult {
    if (typeof query !== 'string') {
      return {
        valid: false,
        errors: [
          {
            field: 'q',
            message: 'Search query must be a string',
            code: ErrorCode.INVALID_INPUT,
          },
        ],
      };
    }

    const result = searchQuerySchema.safeParse(query);
    if (!result.success) {
      return {
        valid: false,
        errors: this.formatZodErrors(result.error, 'q'),
      };
    }

    return { valid: true };
  }

  /**
   * Validates a state filter value
   * @param state - The state value to filter by
   * @returns ValidationResult indicating success or failure with errors
   */
  public validateStateFilter(state: unknown): ValidationResult {
    if (typeof state !== 'string') {
      return {
        valid: false,
        errors: [
          {
            field: 'state',
            message: 'State must be a string',
            code: ErrorCode.INVALID_INPUT,
          },
        ],
      };
    }

    const result = ticketStateSchema.safeParse(state);
    if (!result.success) {
      return {
        valid: false,
        errors: this.formatZodErrors(result.error, 'state'),
      };
    }

    return { valid: true };
  }

  /**
   * Validates a UUID format
   * @param id - The ID to validate
   * @returns ValidationResult indicating success or failure with errors
   */
  public validateUUID(id: unknown): ValidationResult {
    if (typeof id !== 'string') {
      return {
        valid: false,
        errors: [
          {
            field: 'id',
            message: 'ID must be a string',
            code: ErrorCode.INVALID_INPUT,
          },
        ],
      };
    }

    const result = uuidSchema.safeParse(id);
    if (!result.success) {
      return {
        valid: false,
        errors: this.formatZodErrors(result.error, 'id'),
      };
    }

    return { valid: true };
  }

  /**
   * Generic validation helper using Zod schema
   * @param schema - The Zod schema to validate against
   * @param data - The data to validate
   * @returns ValidationResult indicating success or failure with errors
   */
  private validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): ValidationResult {
    const result = schema.safeParse(data);

    if (!result.success) {
      return {
        valid: false,
        errors: this.formatZodErrors(result.error),
      };
    }

    return { valid: true };
  }

  /**
   * Formats Zod validation errors into our ValidationError format
   * @param error - The Zod error object
   * @param defaultField - Default field name if none provided in error
   * @returns Array of ValidationError objects
   */
  private formatZodErrors(
    error: z.ZodError,
    defaultField?: string
  ): ValidationError[] {
    return error.errors.map((err) => {
      const field = err.path.length > 0 ? err.path.join('.') : defaultField || 'unknown';
      const message = err.message;

      // Map Zod error codes to our ErrorCode enum
      let code = ErrorCode.INVALID_INPUT;
      if (message.includes('required') || message.includes('empty')) {
        code = ErrorCode.MISSING_REQUIRED_FIELD;
      } else if (message.includes('exceed') || message.includes('too long')) {
        code = ErrorCode.FIELD_TOO_LONG;
      } else if (message.includes('whitespace')) {
        code = ErrorCode.WHITESPACE_ONLY;
      } else if (message.includes('UUID')) {
        code = ErrorCode.INVALID_UUID_FORMAT;
      } else if (message.includes('Priority')) {
        code = ErrorCode.INVALID_PRIORITY;
      } else if (message.includes('State')) {
        code = ErrorCode.INVALID_STATE;
      } else if (message.includes('Assignee identifier must be')) {
        code = ErrorCode.INVALID_ASSIGNEE;
      }

      return {
        field,
        message,
        code,
      };
    });
  }
}

/**
 * Singleton validator instance for use across the application
 */
export const validator = new Validator();
