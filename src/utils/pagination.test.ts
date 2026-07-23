/**
 * Pagination Utilities Tests
 *
 * Tests for pagination helper functions
 */

import {
  validatePaginationOptions,
  calculateLimitOffset,
  createPaginationMetadata,
  buildOrderByClause,
  TICKET_SORT_FIELDS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE,
} from './pagination';

describe('Pagination Utilities', () => {
  describe('validatePaginationOptions', () => {
    it('should return defaults when no options provided', () => {
      const result = validatePaginationOptions();

      expect(result.page).toBe(DEFAULT_PAGE);
      expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
      expect(result.sortOrder).toBe('DESC');
    });

    it('should accept valid page and pageSize', () => {
      const result = validatePaginationOptions({ page: 5, pageSize: 50 });

      expect(result.page).toBe(5);
      expect(result.pageSize).toBe(50);
    });

    it('should enforce minimum page number of 1', () => {
      const result = validatePaginationOptions({ page: 0 });
      expect(result.page).toBe(DEFAULT_PAGE);

      const result2 = validatePaginationOptions({ page: -5 });
      expect(result2.page).toBe(DEFAULT_PAGE);
    });

    it('should enforce maximum page size limit', () => {
      const result = validatePaginationOptions({ pageSize: 200 });
      expect(result.pageSize).toBe(MAX_PAGE_SIZE);
    });

    it('should enforce minimum page size limit', () => {
      const result = validatePaginationOptions({ pageSize: 0 });
      expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);

      const result2 = validatePaginationOptions({ pageSize: -10 });
      expect(result2.pageSize).toBe(DEFAULT_PAGE_SIZE);
    });

    it('should normalize string page numbers', () => {
      const result = validatePaginationOptions({ page: '3' as any });
      expect(result.page).toBe(3);
    });

    it('should normalize string page sizes', () => {
      const result = validatePaginationOptions({ pageSize: '25' as any });
      expect(result.pageSize).toBe(25);
    });

    it('should handle NaN values by using defaults', () => {
      const result = validatePaginationOptions({ page: 'abc' as any, pageSize: 'xyz' as any });
      expect(result.page).toBe(DEFAULT_PAGE);
      expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
    });

    it('should accept ASC sort order', () => {
      const result = validatePaginationOptions({ sortOrder: 'ASC' });
      expect(result.sortOrder).toBe('ASC');
    });

    it('should default to DESC for invalid sort order', () => {
      const result = validatePaginationOptions({ sortOrder: 'INVALID' as any });
      expect(result.sortOrder).toBe('DESC');
    });

    it('should preserve sortBy field', () => {
      const result = validatePaginationOptions({ sortBy: 'priority' });
      expect(result.sortBy).toBe('priority');
    });
  });

  describe('calculateLimitOffset', () => {
    it('should calculate correct offset for page 1', () => {
      const result = calculateLimitOffset(1, 20);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should calculate correct offset for page 2', () => {
      const result = calculateLimitOffset(2, 20);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(20);
    });

    it('should calculate correct offset for page 5', () => {
      const result = calculateLimitOffset(5, 50);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(200);
    });

    it('should handle page 1 with different page sizes', () => {
      const result1 = calculateLimitOffset(1, 10);
      expect(result1.offset).toBe(0);

      const result2 = calculateLimitOffset(1, 100);
      expect(result2.offset).toBe(0);
    });
  });

  describe('createPaginationMetadata', () => {
    it('should create correct metadata for first page', () => {
      const result = createPaginationMetadata(1, 20, 100);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalItems).toBe(100);
      expect(result.totalPages).toBe(5);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should create correct metadata for middle page', () => {
      const result = createPaginationMetadata(3, 20, 100);

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(5);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);
    });

    it('should create correct metadata for last page', () => {
      const result = createPaginationMetadata(5, 20, 100);

      expect(result.page).toBe(5);
      expect(result.totalPages).toBe(5);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });

    it('should handle partial last page', () => {
      const result = createPaginationMetadata(3, 20, 55);

      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(false);
    });

    it('should handle empty result set', () => {
      const result = createPaginationMetadata(1, 20, 0);

      expect(result.totalPages).toBe(0);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should handle single item', () => {
      const result = createPaginationMetadata(1, 20, 1);

      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should calculate total pages correctly with various sizes', () => {
      expect(createPaginationMetadata(1, 10, 100).totalPages).toBe(10);
      expect(createPaginationMetadata(1, 25, 100).totalPages).toBe(4);
      expect(createPaginationMetadata(1, 50, 100).totalPages).toBe(2);
      expect(createPaginationMetadata(1, 100, 100).totalPages).toBe(1);
    });
  });

  describe('buildOrderByClause', () => {
    it('should build ORDER BY clause with default field', () => {
      const result = buildOrderByClause(undefined, 'DESC', TICKET_SORT_FIELDS);
      expect(result).toBe('ORDER BY created_at DESC');
    });

    it('should build ORDER BY clause with valid sortBy field', () => {
      const result = buildOrderByClause('priority', 'ASC', TICKET_SORT_FIELDS);
      expect(result).toBe('ORDER BY priority ASC');
    });

    it('should use default field when sortBy is not in allowed list', () => {
      const result = buildOrderByClause('invalid_field', 'DESC', TICKET_SORT_FIELDS);
      expect(result).toBe('ORDER BY created_at DESC');
    });

    it('should handle DESC sort order', () => {
      const result = buildOrderByClause('updated_at', 'DESC', TICKET_SORT_FIELDS);
      expect(result).toBe('ORDER BY updated_at DESC');
    });

    it('should handle all allowed ticket sort fields', () => {
      TICKET_SORT_FIELDS.forEach((field) => {
        const result = buildOrderByClause(field, 'ASC', TICKET_SORT_FIELDS);
        expect(result).toBe(`ORDER BY ${field} ASC`);
      });
    });

    it('should prevent SQL injection in sort field', () => {
      const maliciousField = 'priority; DROP TABLE tickets; --';
      const result = buildOrderByClause(maliciousField, 'DESC', TICKET_SORT_FIELDS);
      // Should fall back to default since malicious field is not in allowed list
      expect(result).toBe('ORDER BY created_at DESC');
    });
  });

  describe('TICKET_SORT_FIELDS constant', () => {
    it('should contain expected sort fields', () => {
      expect(TICKET_SORT_FIELDS).toContain('created_at');
      expect(TICKET_SORT_FIELDS).toContain('updated_at');
      expect(TICKET_SORT_FIELDS).toContain('title');
      expect(TICKET_SORT_FIELDS).toContain('priority');
      expect(TICKET_SORT_FIELDS).toContain('state');
      expect(TICKET_SORT_FIELDS).toContain('assignee');
    });

    it('should have exactly 6 fields', () => {
      expect(TICKET_SORT_FIELDS).toHaveLength(6);
    });
  });

  describe('Edge cases', () => {
    it('should handle very large page numbers', () => {
      const result = calculateLimitOffset(1000000, 20);
      expect(result.offset).toBe(19999980);
    });

    it('should handle very large datasets in metadata', () => {
      const result = createPaginationMetadata(1, 20, 1000000);
      expect(result.totalPages).toBe(50000);
      expect(result.hasNextPage).toBe(true);
    });

    it('should handle page number beyond total pages', () => {
      const result = createPaginationMetadata(10, 20, 50);
      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(false);
    });
  });
});
