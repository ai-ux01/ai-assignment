/**
 * Search Service Implementation
 *
 * Implements keyword search and status filtering functionality for tickets.
 *
 * Requirements:
 * - 7.1-7.7: Search tickets by keyword
 * - 8.1-8.6: Filter tickets by status
 */

import { Ticket, TicketState } from '../models/ticket';
import { ticketRepository } from '../repositories/TicketRepository';
import { validator } from '../utils/validator';
import { inputSanitizer } from '../utils/inputSanitizer';
import { ValidationError } from '../utils/customErrors';
import logger from '../utils/logger';

/**
 * Search Service class implementing search and filter operations
 */
export class SearchService {
  constructor() {}

  /**
   * Search tickets by keyword across title and description fields
   *
   * Requirements: 7.1, 7.2, 7.3, 7.6, 7.7
   *
   * Performs case-insensitive search with partial word matching.
   * Searches both title and description fields.
   *
   * @param query - Search keyword (non-empty, non-whitespace)
   * @returns Promise<Ticket[]> - Tickets matching the search query
   * @throws ValidationError if query is empty or whitespace-only
   */
  async searchByKeyword(query: string): Promise<Ticket[]> {
    logger.debug('Searching tickets by keyword', { query });

    // Validate and sanitize search query
    const validationResult = validator.validateSearchQuery(query);
    if (!validationResult.valid) {
      logger.warn('Search query validation failed', { query, errors: validationResult.errors });
      throw new ValidationError(
        'Invalid search query',
        validationResult.errors
      );
    }

    // Sanitize the query
    const sanitizedQuery = inputSanitizer.sanitizeSearchQuery(query);

    // Perform search via repository
    const tickets = await ticketRepository.searchTickets(sanitizedQuery);

    logger.info('Search completed', { query, resultCount: tickets.length });

    return tickets;
  }

  /**
   * Filter tickets by state
   *
   * Requirements: 8.1, 8.2, 8.5
   *
   * Returns all tickets matching the specified state.
   *
   * @param state - Ticket state to filter by
   * @returns Promise<Ticket[]> - Tickets in the specified state
   * @throws ValidationError if state value is invalid
   */
  async filterByState(state: TicketState): Promise<Ticket[]> {
    logger.debug('Filtering tickets by state', { state });

    // Validate state parameter
    const validationResult = validator.validateStateFilter(state);
    if (!validationResult.valid) {
      logger.warn('State filter validation failed', { state, errors: validationResult.errors });
      throw new ValidationError(
        'Invalid state filter',
        validationResult.errors
      );
    }

    // Perform filter via repository
    const tickets = await ticketRepository.filterTicketsByState(state);

    logger.info('Filter by state completed', { state, resultCount: tickets.length });

    return tickets;
  }
}

// Export singleton instance
export const searchService = new SearchService();
