/**
 * Error Response Model
 * Defines the structure for all error responses returned by the API
 */

/**
 * Machine-readable error codes for different error categories
 */
export enum ErrorCode {
  // Validation errors (400)
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  FIELD_TOO_LONG = 'FIELD_TOO_LONG',
  FIELD_TOO_SHORT = 'FIELD_TOO_SHORT',
  WHITESPACE_ONLY = 'WHITESPACE_ONLY',
  INVALID_UUID_FORMAT = 'INVALID_UUID_FORMAT',

  // Resource errors (404)
  TICKET_NOT_FOUND = 'TICKET_NOT_FOUND',

  // Business rule violations (422)
  INVALID_PRIORITY = 'INVALID_PRIORITY',
  INVALID_STATE = 'INVALID_STATE',
  INVALID_TRANSITION = 'INVALID_TRANSITION',
  TERMINAL_STATE = 'TERMINAL_STATE',
  INVALID_ASSIGNEE = 'INVALID_ASSIGNEE',
  CANNOT_MODIFY_TERMINAL = 'CANNOT_MODIFY_TERMINAL',

  // System errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Service errors (503)
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_UNAVAILABLE = 'DATABASE_UNAVAILABLE',
}

/**
 * Validation error details for a specific field
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Standard error response structure for all API errors
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ValidationError[];
    timestamp: string;
    requestId: string;
  };
}

/**
 * HTTP status code mapping for error categories
 */
export enum HttpStatusCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}
