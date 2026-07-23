/**
 * Pagination Utilities
 *
 * Provides pagination support for list operations to improve performance
 * with large result sets.
 *
 * Requirements:
 * - Non-Functional Performance: Support pagination for large result sets
 * - 10.6: Implement performance optimizations
 */

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
  page?: number;      // Page number (1-indexed), defaults to 1
  pageSize?: number;  // Number of items per page, defaults to 20
  sortBy?: string;    // Field to sort by, defaults to 'created_at'
  sortOrder?: 'ASC' | 'DESC';  // Sort direction, defaults to 'DESC'
}

/**
 * Pagination metadata included in responses
 */
export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

/**
 * Default pagination settings
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 1;
export const DEFAULT_PAGE = 1;

/**
 * Validates and normalizes pagination options
 *
 * @param options - Raw pagination options from request
 * @returns Validated and normalized pagination options
 */
export function validatePaginationOptions(options: PaginationOptions = {}): {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder: 'ASC' | 'DESC';
} {
  // Normalize page number
  let page = options.page !== undefined ? parseInt(String(options.page), 10) : DEFAULT_PAGE;
  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  // Normalize page size with limits
  let pageSize = options.pageSize !== undefined ? parseInt(String(options.pageSize), 10) : DEFAULT_PAGE_SIZE;
  if (isNaN(pageSize) || pageSize < MIN_PAGE_SIZE) {
    pageSize = DEFAULT_PAGE_SIZE;
  }
  if (pageSize > MAX_PAGE_SIZE) {
    pageSize = MAX_PAGE_SIZE;
  }

  // Normalize sort order
  const sortOrder = options.sortOrder === 'ASC' ? 'ASC' : 'DESC';

  return {
    page,
    pageSize,
    sortBy: options.sortBy,
    sortOrder,
  };
}

/**
 * Calculate SQL LIMIT and OFFSET from pagination options
 *
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Object with limit and offset values
 */
export function calculateLimitOffset(page: number, pageSize: number): { limit: number; offset: number } {
  const limit = pageSize;
  const offset = (page - 1) * pageSize;
  return { limit, offset };
}

/**
 * Create pagination metadata from query results
 *
 * @param page - Current page number
 * @param pageSize - Items per page
 * @param totalItems - Total number of items across all pages
 * @returns Pagination metadata object
 */
export function createPaginationMetadata(
  page: number,
  pageSize: number,
  totalItems: number
): PaginationMetadata {
  const totalPages = Math.ceil(totalItems / pageSize);
  
  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Build ORDER BY clause from pagination options
 *
 * @param sortBy - Field to sort by (validated against allowed fields)
 * @param sortOrder - Sort direction
 * @param allowedFields - Array of allowed sort fields
 * @returns SQL ORDER BY clause
 */
export function buildOrderByClause(
  sortBy: string | undefined,
  sortOrder: 'ASC' | 'DESC',
  allowedFields: string[]
): string {
  // Default to created_at if sortBy is not provided or not in allowed list
  const field = sortBy && allowedFields.includes(sortBy) ? sortBy : 'created_at';
  return `ORDER BY ${field} ${sortOrder}`;
}

/**
 * Allowed sort fields for tickets
 */
export const TICKET_SORT_FIELDS = [
  'created_at',
  'updated_at',
  'title',
  'priority',
  'state',
  'assignee'
];
