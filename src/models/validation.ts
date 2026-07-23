/**
 * Validation Models
 * Defines validation result types and related interfaces
 */

import { ValidationError } from './errors';

/**
 * Result of a validation operation
 * Either successful (valid: true) or failed (valid: false with errors)
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: ValidationError[] };

/**
 * Search query validation parameters
 */
export interface SearchQuery {
  q: string;
}

/**
 * State filter validation parameters
 */
export interface StateFilterQuery {
  state: string;
}
