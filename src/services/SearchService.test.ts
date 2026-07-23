/**
 * SearchService Unit Tests
 *
 * Tests for search and filter edge cases
 * 
 * Task 7.5: Write unit tests for SearchService edge cases:
 * - Search with no matches returns empty list
 * - Filter with no tickets in state returns empty list
 * - Search with special characters is escaped properly
 * - Empty database returns empty results
 */

import { SearchService } from './SearchService';
import { ticketRepository } from '../repositories/TicketRepository';
import { validator } from '../utils/validator';
import { inputSanitizer } from '../utils/inputSanitizer';
import { TicketState } from '../models/ticket';
import { ValidationError } from '../utils/customErrors';
import { ErrorCode } from '../models/errors';

// Mock dependencies
jest.mock('../repositories/TicketRepository');
jest.mock('../utils/validator');
jest.mock('../utils/inputSanitizer');
jest.mock('../utils/logger');

describe('SearchService - Edge Cases', () => {
  let searchService: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    searchService = new SearchService();
  });

  describe('searchByKeyword - Edge Cases', () => {
    describe('Search with no matches returns empty list', () => {
      it('should return empty array when no tickets match the search query', async () => {
        // Arrange
        const query = 'nonexistent-keyword';
        const sanitizedQuery = 'nonexistent-keyword';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(validator.validateSearchQuery).toHaveBeenCalledWith(query);
        expect(inputSanitizer.sanitizeSearchQuery).toHaveBeenCalledWith(query);
        expect(ticketRepository.searchTickets).toHaveBeenCalledWith(sanitizedQuery);
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should return empty array when searching for term not in any ticket', async () => {
        // Arrange
        const query = 'unicorn';
        const sanitizedQuery = 'unicorn';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(result).toEqual([]);
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return empty array for very specific search terms with no matches', async () => {
        // Arrange
        const query = 'xyz123abc456def789';
        const sanitizedQuery = 'xyz123abc456def789';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });
    });

    describe('Search with special characters is escaped properly', () => {
      it('should handle regex special characters in search query', async () => {
        // Arrange
        const query = '.*';
        const sanitizedQuery = '\\.\\*'; // Escaped version

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(inputSanitizer.sanitizeSearchQuery).toHaveBeenCalledWith(query);
        expect(ticketRepository.searchTickets).toHaveBeenCalledWith(sanitizedQuery);
        expect(result).toEqual([]);
      });

      it('should handle parentheses in search query', async () => {
        // Arrange
        const query = '(test)';
        const sanitizedQuery = '\\(test\\)';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(inputSanitizer.sanitizeSearchQuery).toHaveBeenCalledWith(query);
        expect(result).toEqual([]);
      });

      it('should handle square brackets in search query', async () => {
        // Arrange
        const query = '[abc]';
        const sanitizedQuery = '\\[abc\\]';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(inputSanitizer.sanitizeSearchQuery).toHaveBeenCalledWith(query);
        expect(ticketRepository.searchTickets).toHaveBeenCalledWith(sanitizedQuery);
        expect(result).toEqual([]);
      });

      it('should handle pipe character in search query', async () => {
        // Arrange
        const query = 'test|query';
        const sanitizedQuery = 'test\\|query';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(inputSanitizer.sanitizeSearchQuery).toHaveBeenCalledWith(query);
        expect(ticketRepository.searchTickets).toHaveBeenCalledWith(sanitizedQuery);
        expect(result).toEqual([]);
      });

      it('should handle backslash in search query', async () => {
        // Arrange
        const query = 'test\\escape';
        const sanitizedQuery = 'test\\\\escape';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(inputSanitizer.sanitizeSearchQuery).toHaveBeenCalledWith(query);
        expect(result).toEqual([]);
      });

      it('should handle dollar sign in search query', async () => {
        // Arrange
        const query = 'price$100';
        const sanitizedQuery = 'price\\$100';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(inputSanitizer.sanitizeSearchQuery).toHaveBeenCalledWith(query);
        expect(ticketRepository.searchTickets).toHaveBeenCalledWith(sanitizedQuery);
        expect(result).toEqual([]);
      });

      it('should handle caret character in search query', async () => {
        // Arrange
        const query = '^start';
        const sanitizedQuery = '\\^start';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(inputSanitizer.sanitizeSearchQuery).toHaveBeenCalledWith(query);
        expect(result).toEqual([]);
      });

      it('should handle plus sign in search query', async () => {
        // Arrange
        const query = 'C++ programming';
        const sanitizedQuery = 'C\\+\\+ programming';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(inputSanitizer.sanitizeSearchQuery).toHaveBeenCalledWith(query);
        expect(result).toEqual([]);
      });

      it('should handle question mark in search query', async () => {
        // Arrange
        const query = 'what?';
        const sanitizedQuery = 'what\\?';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(inputSanitizer.sanitizeSearchQuery).toHaveBeenCalledWith(query);
        expect(result).toEqual([]);
      });

      it('should handle curly braces in search query', async () => {
        // Arrange
        const query = '{test}';
        const sanitizedQuery = '\\{test\\}';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(inputSanitizer.sanitizeSearchQuery).toHaveBeenCalledWith(query);
        expect(result).toEqual([]);
      });

      it('should handle multiple special characters in search query', async () => {
        // Arrange
        const query = '.*+?^${}()|[]\\';
        const sanitizedQuery = '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(inputSanitizer.sanitizeSearchQuery).toHaveBeenCalledWith(query);
        expect(ticketRepository.searchTickets).toHaveBeenCalledWith(sanitizedQuery);
        expect(result).toEqual([]);
      });
    });

    describe('Empty database returns empty results', () => {
      it('should return empty array when database is empty', async () => {
        // Arrange
        const query = 'any-search-term';
        const sanitizedQuery = 'any-search-term';

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(sanitizedQuery);
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.searchByKeyword(query);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return empty array for multiple searches on empty database', async () => {
        // Arrange
        const queries = ['error', 'bug', 'issue', 'login'];
        
        (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
        (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

        // Act & Assert
        for (const query of queries) {
          (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(query);
          const result = await searchService.searchByKeyword(query);
          expect(result).toEqual([]);
          expect(result).toHaveLength(0);
        }
      });
    });

    describe('Validation error handling', () => {
      it('should throw ValidationError for empty search query', async () => {
        // Arrange
        const query = '';
        const validationErrors = [
          {
            field: 'query',
            message: 'Search query cannot be empty',
            code: ErrorCode.WHITESPACE_ONLY,
          },
        ];

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({
          valid: false,
          errors: validationErrors,
        });

        // Act & Assert
        await expect(searchService.searchByKeyword(query)).rejects.toThrow(ValidationError);
        expect(ticketRepository.searchTickets).not.toHaveBeenCalled();
      });

      it('should throw ValidationError for whitespace-only search query', async () => {
        // Arrange
        const query = '   ';
        const validationErrors = [
          {
            field: 'query',
            message: 'Search query cannot be empty or whitespace-only',
            code: ErrorCode.WHITESPACE_ONLY,
          },
        ];

        (validator.validateSearchQuery as jest.Mock).mockReturnValue({
          valid: false,
          errors: validationErrors,
        });

        // Act & Assert
        await expect(searchService.searchByKeyword(query)).rejects.toThrow(ValidationError);
        expect(ticketRepository.searchTickets).not.toHaveBeenCalled();
      });
    });
  });

  describe('filterByState - Edge Cases', () => {
    describe('Filter with no tickets in state returns empty list', () => {
      it('should return empty array when no tickets exist in Open state', async () => {
        // Arrange
        const state = TicketState.Open;

        (validator.validateStateFilter as jest.Mock).mockReturnValue({ valid: true });
        (ticketRepository.filterTicketsByState as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.filterByState(state);

        // Assert
        expect(validator.validateStateFilter).toHaveBeenCalledWith(state);
        expect(ticketRepository.filterTicketsByState).toHaveBeenCalledWith(state);
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should return empty array when no tickets exist in InProgress state', async () => {
        // Arrange
        const state = TicketState.InProgress;

        (validator.validateStateFilter as jest.Mock).mockReturnValue({ valid: true });
        (ticketRepository.filterTicketsByState as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.filterByState(state);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should return empty array when no tickets exist in Resolved state', async () => {
        // Arrange
        const state = TicketState.Resolved;

        (validator.validateStateFilter as jest.Mock).mockReturnValue({ valid: true });
        (ticketRepository.filterTicketsByState as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.filterByState(state);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should return empty array when no tickets exist in Closed state', async () => {
        // Arrange
        const state = TicketState.Closed;

        (validator.validateStateFilter as jest.Mock).mockReturnValue({ valid: true });
        (ticketRepository.filterTicketsByState as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.filterByState(state);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should return empty array when no tickets exist in Cancelled state', async () => {
        // Arrange
        const state = TicketState.Cancelled;

        (validator.validateStateFilter as jest.Mock).mockReturnValue({ valid: true });
        (ticketRepository.filterTicketsByState as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.filterByState(state);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should return empty array when filtering specific state with no matches', async () => {
        // Arrange - Even if other tickets exist, this state has none
        const state = TicketState.Cancelled;

        (validator.validateStateFilter as jest.Mock).mockReturnValue({ valid: true });
        (ticketRepository.filterTicketsByState as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.filterByState(state);

        // Assert
        expect(result).toEqual([]);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('Empty database returns empty results', () => {
      it('should return empty array when filtering on empty database', async () => {
        // Arrange
        const state = TicketState.Open;

        (validator.validateStateFilter as jest.Mock).mockReturnValue({ valid: true });
        (ticketRepository.filterTicketsByState as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await searchService.filterByState(state);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return empty array for all state filters on empty database', async () => {
        // Arrange
        const states = [
          TicketState.Open,
          TicketState.InProgress,
          TicketState.Resolved,
          TicketState.Closed,
          TicketState.Cancelled,
        ];

        (validator.validateStateFilter as jest.Mock).mockReturnValue({ valid: true });
        (ticketRepository.filterTicketsByState as jest.Mock).mockResolvedValue([]);

        // Act & Assert
        for (const state of states) {
          const result = await searchService.filterByState(state);
          expect(result).toEqual([]);
          expect(result).toHaveLength(0);
        }
      });
    });

    describe('Validation error handling', () => {
      it('should throw ValidationError for invalid state value', async () => {
        // Arrange
        const invalidState = 'InvalidState' as TicketState;
        const validationErrors = [
          {
            field: 'state',
            message: 'Invalid state value',
            code: ErrorCode.INVALID_STATE,
          },
        ];

        (validator.validateStateFilter as jest.Mock).mockReturnValue({
          valid: false,
          errors: validationErrors,
        });

        // Act & Assert
        await expect(searchService.filterByState(invalidState)).rejects.toThrow(ValidationError);
        expect(ticketRepository.filterTicketsByState).not.toHaveBeenCalled();
      });
    });
  });

  describe('Combined edge cases', () => {
    it('should consistently return empty arrays for both search and filter on empty database', async () => {
      // Arrange
      const searchQuery = 'test';
      const filterState = TicketState.Open;

      (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
      (validator.validateStateFilter as jest.Mock).mockReturnValue({ valid: true });
      (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(searchQuery);
      (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);
      (ticketRepository.filterTicketsByState as jest.Mock).mockResolvedValue([]);

      // Act
      const searchResult = await searchService.searchByKeyword(searchQuery);
      const filterResult = await searchService.filterByState(filterState);

      // Assert
      expect(searchResult).toEqual([]);
      expect(filterResult).toEqual([]);
      expect(searchResult).toHaveLength(0);
      expect(filterResult).toHaveLength(0);
    });

    it('should handle rapid sequential searches with no matches', async () => {
      // Arrange
      const queries = ['test1', 'test2', 'test3'];

      (validator.validateSearchQuery as jest.Mock).mockReturnValue({ valid: true });
      (ticketRepository.searchTickets as jest.Mock).mockResolvedValue([]);

      // Act & Assert
      for (const query of queries) {
        (inputSanitizer.sanitizeSearchQuery as jest.Mock).mockReturnValue(query);
        const result = await searchService.searchByKeyword(query);
        expect(result).toEqual([]);
      }
    });

    it('should handle rapid sequential filters with no matches', async () => {
      // Arrange
      const states = [TicketState.Open, TicketState.InProgress, TicketState.Resolved];

      (validator.validateStateFilter as jest.Mock).mockReturnValue({ valid: true });
      (ticketRepository.filterTicketsByState as jest.Mock).mockResolvedValue([]);

      // Act & Assert
      for (const state of states) {
        const result = await searchService.filterByState(state);
        expect(result).toEqual([]);
      }
    });
  });
});
