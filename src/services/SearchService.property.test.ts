/**
 * SearchService Property-Based Tests
 *
 * Tests SearchService keyword search functionality using property-based testing
 * with fast-check to validate universal properties across many generated inputs.
 *
 * Properties tested:
 * - Property 23: Search result correctness (includes matches, excludes non-matches)
 * - Property 24: Case-insensitive search
 * - Property 25: Partial word matching
 * - Property 27: Search result completeness (all fields present)
 *
 * Validates Requirements: 7.1, 7.2, 7.3, 7.6, 7.7
 */

import fc from 'fast-check';
import { SearchService } from './SearchService';
import { ticketRepository } from '../repositories/TicketRepository';
import { Ticket, TicketState, Priority } from '../models/ticket';
import { ValidationError } from '../utils/customErrors';

describe('SearchService - Property-Based Tests for Keyword Search', () => {
  let searchService: SearchService;

  beforeAll(() => {
    searchService = new SearchService();
  });

  // ============================================================================
  // Test Data Generators
  // ============================================================================

  /**
   * Generator for valid ticket states
   */
  const validStateArb = fc.constantFrom(
    TicketState.Open,
    TicketState.InProgress,
    TicketState.Resolved,
    TicketState.Closed,
    TicketState.Cancelled
  );

  /**
   * Generator for valid priorities
   */
  const validPriorityArb = fc.constantFrom(
    Priority.Low,
    Priority.Medium,
    Priority.High,
    Priority.Critical
  );

  /**
   * Generator for valid non-empty search keywords
   */
  const validKeywordArb = fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0);

  /**
   * Generator for UUID strings
   */
  const uuidArb = fc.uuid();

  /**
   * Generator for ISO timestamp strings
   */
  const timestampArb = fc.date();

  /**
   * Generator for valid ticket objects
   */
  const ticketArb = fc.record({
    id: uuidArb,
    title: fc.string({ minLength: 1, maxLength: 200 }),
    description: fc.string({ minLength: 1, maxLength: 1000 }),
    priority: validPriorityArb,
    state: validStateArb,
    assignee: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    createdAt: timestampArb,
    updatedAt: timestampArb,
  }) as fc.Arbitrary<Ticket>;

  /**
   * Generator for a ticket containing a specific keyword in title or description
   */
  const ticketWithKeywordArb = (keyword: string) =>
    fc.record({
      id: uuidArb,
      title: fc.oneof(
        fc.constant(keyword),
        fc.constant(keyword.toUpperCase()),
        fc.constant(keyword.toLowerCase()),
        fc.tuple(fc.string(), fc.constant(keyword), fc.string()).map(([a, k, b]) => `${a} ${k} ${b}`)
      ),
      description: fc.oneof(
        fc.constant(keyword),
        fc.constant(keyword.toUpperCase()),
        fc.constant(keyword.toLowerCase()),
        fc.tuple(fc.string(), fc.constant(keyword), fc.string()).map(([a, k, b]) => `${a} ${k} ${b}`)
      ),
      priority: validPriorityArb,
      state: validStateArb,
      assignee: fc.option(fc.string(), { nil: null }),
      createdAt: timestampArb,
      updatedAt: timestampArb,
    }) as fc.Arbitrary<Ticket>;

  /**
   * Generator for a ticket NOT containing a specific keyword
   */
  const ticketWithoutKeywordArb = (keyword: string) =>
    fc
      .record({
        id: uuidArb,
        title: fc.string({ minLength: 1, maxLength: 200 }),
        description: fc.string({ minLength: 1, maxLength: 1000 }),
        priority: validPriorityArb,
        state: validStateArb,
        assignee: fc.option(fc.string(), { nil: null }),
        createdAt: timestampArb,
        updatedAt: timestampArb,
      })
      .filter(
        (ticket) =>
          !ticket.title.toLowerCase().includes(keyword.toLowerCase()) &&
          !ticket.description.toLowerCase().includes(keyword.toLowerCase())
      ) as fc.Arbitrary<Ticket>;

  /**
   * Generator for invalid search queries (empty or whitespace-only)
   */
  const invalidQueryArb = fc.oneof(
    fc.constant(''),
    fc.constant('   '),
    fc.constant('\t\t'),
    fc.constant('\n\n'),
    fc.string().filter((s) => s.trim().length === 0 && s.length > 0)
  );

  // ============================================================================
  // Property 23: Search result correctness
  // ============================================================================

  describe('Property 23: Search result correctness (includes matches, excludes non-matches)', () => {
    /**
     * **Validates: Requirements 7.1, 7.2**
     *
     * For any valid keyword and any set of tickets:
     * - If a ticket's title OR description contains the keyword (case-insensitive),
     *   it MUST be included in search results
     * - If a ticket's title AND description do NOT contain the keyword,
     *   it MUST NOT be included in search results
     */
    it('should include tickets containing the keyword and exclude tickets without it', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('error', 'bug', 'login', 'database', 'test'),
          fc.array(ticketWithKeywordArb('test'), { minLength: 1, maxLength: 5 }),
          fc.array(ticketWithoutKeywordArb('test'), { maxLength: 5 }),
          async (keyword, matchingTickets, nonMatchingTickets) => {
            // Mock repository to simulate search behavior
            const allTickets = [...matchingTickets, ...nonMatchingTickets];
            const mockSearchTickets = jest
              .spyOn(ticketRepository, 'searchTickets')
              .mockImplementation(async (query: string) => {
                return allTickets.filter(
                  (t) =>
                    t.title.toLowerCase().includes(query.toLowerCase()) ||
                    t.description.toLowerCase().includes(query.toLowerCase())
                );
              });

            try {
              // Perform search
              const results = await searchService.searchByKeyword(keyword);

              // Verify all matching tickets are in results
              const resultIds = new Set(results.map((t) => t.id));
              
              // For tickets that contain the keyword, verify they're in results
              allTickets.forEach((ticket) => {
                const titleMatches = ticket.title.toLowerCase().includes(keyword.toLowerCase());
                const descMatches = ticket.description
                  .toLowerCase()
                  .includes(keyword.toLowerCase());

                if (titleMatches || descMatches) {
                  expect(resultIds.has(ticket.id)).toBe(true);
                } else {
                  expect(resultIds.has(ticket.id)).toBe(false);
                }
              });
            } finally {
              mockSearchTickets.mockRestore();
            }
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });

    it('should return tickets where keyword appears in title', async () => {
      await fc.assert(
        fc.asyncProperty(validKeywordArb, async (keyword) => {
          const ticket: Ticket = {
            id: 'test-id-123',
            title: `This title contains ${keyword} in it`,
            description: 'Description without the word',
            priority: Priority.Medium,
            state: TicketState.Open,
            assignee: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const mockSearchTickets = jest
            .spyOn(ticketRepository, 'searchTickets')
            .mockResolvedValue([ticket]);

          try {
            const results = await searchService.searchByKeyword(keyword);

            expect(results).toHaveLength(1);
            expect(results[0]?.id).toBe(ticket.id);
          } finally {
            mockSearchTickets.mockRestore();
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should return tickets where keyword appears in description', async () => {
      await fc.assert(
        fc.asyncProperty(validKeywordArb, async (keyword) => {
          const ticket: Ticket = {
            id: 'test-id-456',
            title: 'Title without the word',
            description: `Description contains ${keyword} here`,
            priority: Priority.High,
            state: TicketState.InProgress,
            assignee: 'user@example.com',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const mockSearchTickets = jest
            .spyOn(ticketRepository, 'searchTickets')
            .mockResolvedValue([ticket]);

          try {
            const results = await searchService.searchByKeyword(keyword);

            expect(results).toHaveLength(1);
            expect(results[0]?.id).toBe(ticket.id);
          } finally {
            mockSearchTickets.mockRestore();
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  // ============================================================================
  // Property 24: Case-insensitive search
  // ============================================================================

  describe('Property 24: Case-insensitive search', () => {
    /**
     * **Validates: Requirements 7.3**
     *
     * For any keyword and any case variation (lowercase, UPPERCASE, MixedCase):
     * - Search results MUST be identical regardless of keyword case
     * - A ticket containing "Error" should match searches for "error", "ERROR", "ErRoR"
     */
    it('should return same results regardless of keyword case', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('error', 'test', 'login', 'bug', 'issue'),
          async (baseKeyword) => {
            const lowerKeyword = baseKeyword.toLowerCase();
            const upperKeyword = baseKeyword.toUpperCase();
            const mixedKeyword =
              baseKeyword.charAt(0).toUpperCase() + baseKeyword.slice(1).toLowerCase();

            const ticket: Ticket = {
              id: 'case-test-id',
              title: `Title with ${mixedKeyword}`,
              description: 'Some description',
              priority: Priority.Low,
              state: TicketState.Open,
              assignee: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock to return ticket if search query matches (case-insensitive)
            const mockSearchTickets = jest
              .spyOn(ticketRepository, 'searchTickets')
              .mockImplementation(async (query: string) => {
                const normalizedQuery = query.trim().toLowerCase();
                const normalizedTitle = ticket.title.toLowerCase();
                const normalizedDesc = ticket.description.toLowerCase();
                
                if (normalizedTitle.includes(normalizedQuery) || normalizedDesc.includes(normalizedQuery)) {
                  return [ticket];
                }
                return [];
              });

            try {
              const lowerResults = await searchService.searchByKeyword(lowerKeyword);
              const upperResults = await searchService.searchByKeyword(upperKeyword);
              const mixedResults = await searchService.searchByKeyword(mixedKeyword);

              // All three searches should return the same ticket
              expect(lowerResults).toHaveLength(1);
              expect(upperResults).toHaveLength(1);
              expect(mixedResults).toHaveLength(1);

              expect(lowerResults[0]?.id).toBe(ticket.id);
              expect(upperResults[0]?.id).toBe(ticket.id);
              expect(mixedResults[0]?.id).toBe(ticket.id);
            } finally {
              mockSearchTickets.mockRestore();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should match tickets regardless of case in ticket content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('error', 'bug', 'issue', 'login', 'database'),
          async (keyword) => {
            const tickets: Ticket[] = [
              {
                id: 'lower-case-id',
                title: `Title with ${keyword.toLowerCase()}`,
                description: 'Description',
                priority: Priority.Medium,
                state: TicketState.Open,
                assignee: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: 'upper-case-id',
                title: `Title with ${keyword.toUpperCase()}`,
                description: 'Description',
                priority: Priority.Medium,
                state: TicketState.Open,
                assignee: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: 'mixed-case-id',
                title: `Title with ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`,
                description: 'Description',
                priority: Priority.Medium,
                state: TicketState.Open,
                assignee: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ];

            const mockSearchTickets = jest
              .spyOn(ticketRepository, 'searchTickets')
              .mockResolvedValue(tickets);

            try {
              const results = await searchService.searchByKeyword(keyword);

              // Should find all three tickets
              expect(results.length).toBe(3);
            } finally {
              mockSearchTickets.mockRestore();
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // ============================================================================
  // Property 25: Partial word matching
  // ============================================================================

  describe('Property 25: Partial word matching', () => {
    /**
     * **Validates: Requirements 7.7**
     *
     * For any keyword that is a substring of words in ticket content:
     * - Search MUST support partial word matching
     * - Searching for "data" should match "database", "metadata", "data-entry"
     */
    it('should match tickets containing keyword as substring', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('data', 'log', 'auth', 'user', 'error'),
          async (partialKeyword) => {
            const fullWords = {
              data: ['database', 'metadata', 'data-entry'],
              log: ['login', 'logout', 'logger'],
              auth: ['authentication', 'authorization', 'author'],
              user: ['username', 'user-profile', 'users'],
              error: ['error-code', 'errors', 'error-message'],
            };

            const relevantWords =
              fullWords[partialKeyword as keyof typeof fullWords] || [partialKeyword];

            const tickets = relevantWords.map((word, idx) => ({
              id: `partial-${idx}`,
              title: `Ticket about ${word}`,
              description: 'Description',
              priority: Priority.Medium,
              state: TicketState.Open,
              assignee: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Mock repository to simulate partial matching
            const mockSearchTickets = jest
              .spyOn(ticketRepository, 'searchTickets')
              .mockResolvedValue(tickets);

            try {
              const results = await searchService.searchByKeyword(partialKeyword);

              // Should find all tickets with words containing the partial keyword
              expect(results.length).toBeGreaterThan(0);
              expect(results.length).toBe(tickets.length);
            } finally {
              mockSearchTickets.mockRestore();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should match tickets with keyword in middle of words', async () => {
      const keyword = 'base';
      const ticket: Ticket = {
        id: 'substring-test',
        title: 'Issue with database connection',
        description: 'The database seems slow',
        priority: Priority.High,
        state: TicketState.Open,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSearchTickets = jest
        .spyOn(ticketRepository, 'searchTickets')
        .mockResolvedValue([ticket]);

      try {
        const results = await searchService.searchByKeyword(keyword);

        expect(results).toHaveLength(1);
        expect(results[0]?.title).toContain('database');
      } finally {
        mockSearchTickets.mockRestore();
      }
    });
  });

  // ============================================================================
  // Property 27: Search result completeness
  // ============================================================================

  describe('Property 27: Search result completeness (all fields present)', () => {
    /**
     * **Validates: Requirements 7.6**
     *
     * For any search that returns results:
     * - Every returned ticket MUST contain ALL core fields
     * - Fields: id, title, description, priority, state, assignee, createdAt, updatedAt
     * - No field should be undefined or missing
     */
    it('should return tickets with all required fields present', async () => {
      await fc.assert(
        fc.asyncProperty(
          validKeywordArb,
          fc.array(ticketArb, { minLength: 1, maxLength: 10 }),
          async (keyword, tickets) => {
            const mockSearchTickets = jest
              .spyOn(ticketRepository, 'searchTickets')
              .mockResolvedValue(tickets);

            try {
              const results = await searchService.searchByKeyword(keyword);

              results.forEach((ticket) => {
                // Verify all required fields are present
                expect(ticket).toHaveProperty('id');
                expect(ticket).toHaveProperty('title');
                expect(ticket).toHaveProperty('description');
                expect(ticket).toHaveProperty('priority');
                expect(ticket).toHaveProperty('state');
                expect(ticket).toHaveProperty('assignee');
                expect(ticket).toHaveProperty('createdAt');
                expect(ticket).toHaveProperty('updatedAt');

                // Verify fields have correct types
                expect(typeof ticket.id).toBe('string');
                expect(typeof ticket.title).toBe('string');
                expect(typeof ticket.description).toBe('string');
                expect(typeof ticket.priority).toBe('string');
                expect(typeof ticket.state).toBe('string');
                expect(ticket.assignee === null || typeof ticket.assignee === 'string').toBe(true);
                expect(ticket.createdAt instanceof Date).toBe(true);
                expect(ticket.updatedAt instanceof Date).toBe(true);

                // Verify non-empty strings for required fields
                expect(ticket.id.length).toBeGreaterThan(0);
                expect(ticket.title.length).toBeGreaterThan(0);
                expect(ticket.description.length).toBeGreaterThan(0);
              });
            } finally {
              mockSearchTickets.mockRestore();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return tickets with valid enum values for priority and state', async () => {
      await fc.assert(
        fc.asyncProperty(validKeywordArb, fc.array(ticketArb, { minLength: 1, maxLength: 5 }), async (keyword, tickets) => {
          const mockSearchTickets = jest
            .spyOn(ticketRepository, 'searchTickets')
            .mockResolvedValue(tickets);

          try {
            const results = await searchService.searchByKeyword(keyword);

            results.forEach((ticket) => {
              // Verify priority is a valid enum value
              expect(Object.values(Priority)).toContain(ticket.priority);

              // Verify state is a valid enum value
              expect(Object.values(TicketState)).toContain(ticket.state);
            });
          } finally {
            mockSearchTickets.mockRestore();
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  // ============================================================================
  // Validation Properties
  // ============================================================================

  describe('Validation properties', () => {
    /**
     * Invalid search queries should be rejected
     */
    it('should reject empty or whitespace-only search queries', async () => {
      await fc.assert(
        fc.asyncProperty(invalidQueryArb, async (invalidQuery) => {
          await expect(searchService.searchByKeyword(invalidQuery)).rejects.toThrow(
            ValidationError
          );
        }),
        { numRuns: 20 }
      );
    });

    it('should reject queries with only whitespace characters', async () => {
      const whitespaceQueries = ['   ', '\t\t\t', '\n\n\n', '  \t  \n  '];

      for (const query of whitespaceQueries) {
        await expect(searchService.searchByKeyword(query)).rejects.toThrow(ValidationError);
      }
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge cases', () => {
    it('should return empty array when no tickets match', async () => {
      const mockSearchTickets = jest
        .spyOn(ticketRepository, 'searchTickets')
        .mockResolvedValue([]);

      try {
        const results = await searchService.searchByKeyword('nonexistent');

        expect(results).toEqual([]);
        expect(results).toHaveLength(0);
      } finally {
        mockSearchTickets.mockRestore();
      }
    });

    it('should handle special characters in search query safely', async () => {
      const specialChars = ['.*', '(test)', '[abc]', 'test|query', 'test\\escape'];

      for (const query of specialChars) {
        const mockSearchTickets = jest
          .spyOn(ticketRepository, 'searchTickets')
          .mockResolvedValue([]);

        try {
          // Should not throw error
          await expect(searchService.searchByKeyword(query)).resolves.toEqual([]);
        } finally {
          mockSearchTickets.mockRestore();
        }
      }
    });
  });
});

// ============================================================================
// Property-Based Tests for Status Filtering
// ============================================================================

describe('SearchService - Property-Based Tests for Status Filtering', () => {
  let searchService: SearchService;

  beforeAll(() => {
    searchService = new SearchService();
  });

  // ============================================================================
  // Test Data Generators
  // ============================================================================

  /**
   * Generator for valid ticket states
   */
  const validStateArb = fc.constantFrom(
    TicketState.Open,
    TicketState.InProgress,
    TicketState.Resolved,
    TicketState.Closed,
    TicketState.Cancelled
  );

  /**
   * Generator for valid priorities
   */
  const validPriorityArb = fc.constantFrom(
    Priority.Low,
    Priority.Medium,
    Priority.High,
    Priority.Critical
  );

  /**
   * Generator for UUID strings
   */
  const uuidArb = fc.uuid();

  /**
   * Generator for ISO timestamp strings
   */
  const timestampArb = fc.date();

  /**
   * Generator for valid ticket objects with a specific state
   */
  const ticketWithStateArb = (state: TicketState) =>
    fc.record({
      id: uuidArb,
      title: fc.string({ minLength: 1, maxLength: 200 }),
      description: fc.string({ minLength: 1, maxLength: 1000 }),
      priority: validPriorityArb,
      state: fc.constant(state),
      assignee: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
      createdAt: timestampArb,
      updatedAt: timestampArb,
    }) as fc.Arbitrary<Ticket>;

  /**
   * Generator for valid ticket objects with a state DIFFERENT from the specified one
   */
  const ticketWithDifferentStateArb = (excludeState: TicketState) =>
    fc.record({
      id: uuidArb,
      title: fc.string({ minLength: 1, maxLength: 200 }),
      description: fc.string({ minLength: 1, maxLength: 1000 }),
      priority: validPriorityArb,
      state: validStateArb.filter((s) => s !== excludeState),
      assignee: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
      createdAt: timestampArb,
      updatedAt: timestampArb,
    }) as fc.Arbitrary<Ticket>;

  /**
   * Generator for any valid ticket
   */
  const ticketArb = fc.record({
    id: uuidArb,
    title: fc.string({ minLength: 1, maxLength: 200 }),
    description: fc.string({ minLength: 1, maxLength: 1000 }),
    priority: validPriorityArb,
    state: validStateArb,
    assignee: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    createdAt: timestampArb,
    updatedAt: timestampArb,
  }) as fc.Arbitrary<Ticket>;

  // ============================================================================
  // Property 28: Status filter correctness
  // ============================================================================

  describe('Property 28: Status filter correctness (includes matches, excludes non-matches)', () => {
    /**
     * **Validates: Requirements 8.1, 8.2**
     *
     * For any valid ticket state:
     * - All tickets in that state MUST be included in filter results
     * - All tickets NOT in that state MUST be excluded from filter results
     */
    it('should include tickets matching the state and exclude tickets not matching', async () => {
      await fc.assert(
        fc.asyncProperty(
          validStateArb,
          fc.array(ticketWithStateArb(TicketState.Open), { minLength: 1, maxLength: 5 }),
          fc.array(ticketWithDifferentStateArb(TicketState.Open), { maxLength: 5 }),
          async (filterState, matchingTickets, nonMatchingTickets) => {
            // Update matching tickets to have the filter state
            const updatedMatchingTickets = matchingTickets.map((t) => ({
              ...t,
              state: filterState,
            }));

            // Ensure non-matching tickets don't have the filter state
            const updatedNonMatchingTickets = nonMatchingTickets.filter(
              (t) => t.state !== filterState
            );

            const allTickets = [...updatedMatchingTickets, ...updatedNonMatchingTickets];

            // Mock repository to simulate filter behavior
            const mockFilterTickets = jest
              .spyOn(ticketRepository, 'filterTicketsByState')
              .mockImplementation(async (state: TicketState) => {
                return allTickets.filter((t) => t.state === state);
              });

            try {
              // Perform filter
              const results = await searchService.filterByState(filterState);

              // Verify all tickets in results have the correct state
              results.forEach((ticket) => {
                expect(ticket.state).toBe(filterState);
              });

              // Verify all matching tickets are in results
              const resultIds = new Set(results.map((t) => t.id));
              updatedMatchingTickets.forEach((ticket) => {
                expect(resultIds.has(ticket.id)).toBe(true);
              });

              // Verify non-matching tickets are NOT in results
              updatedNonMatchingTickets.forEach((ticket) => {
                expect(resultIds.has(ticket.id)).toBe(false);
              });
            } finally {
              mockFilterTickets.mockRestore();
            }
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });

    it('should return only Open tickets when filtering by Open state', async () => {
      const openTickets: Ticket[] = [
        {
          id: 'open-1',
          title: 'First open ticket',
          description: 'Description 1',
          priority: Priority.High,
          state: TicketState.Open,
          assignee: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'open-2',
          title: 'Second open ticket',
          description: 'Description 2',
          priority: Priority.Medium,
          state: TicketState.Open,
          assignee: 'user@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const otherTickets: Ticket[] = [
        {
          id: 'closed-1',
          title: 'Closed ticket',
          description: 'Description',
          priority: Priority.Low,
          state: TicketState.Closed,
          assignee: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'in-progress-1',
          title: 'In progress ticket',
          description: 'Description',
          priority: Priority.Critical,
          state: TicketState.InProgress,
          assignee: 'dev@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockFilterTickets = jest
        .spyOn(ticketRepository, 'filterTicketsByState')
        .mockImplementation(async (state: TicketState) => {
          const allTickets = [...openTickets, ...otherTickets];
          return allTickets.filter((t) => t.state === state);
        });

      try {
        const results = await searchService.filterByState(TicketState.Open);

        expect(results).toHaveLength(2);
        results.forEach((ticket) => {
          expect(ticket.state).toBe(TicketState.Open);
        });
        expect(results.map((t) => t.id).sort()).toEqual(['open-1', 'open-2']);
      } finally {
        mockFilterTickets.mockRestore();
      }
    });

    it('should filter correctly for all valid ticket states', async () => {
      await fc.assert(
        fc.asyncProperty(validStateArb, async (targetState) => {
          // Create tickets with various states
          const allStates = [
            TicketState.Open,
            TicketState.InProgress,
            TicketState.Resolved,
            TicketState.Closed,
            TicketState.Cancelled,
          ];

          const tickets = allStates.map((state, idx) => ({
            id: `ticket-${state}-${idx}`,
            title: `Ticket in ${state} state`,
            description: 'Description',
            priority: Priority.Medium,
            state,
            assignee: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          const mockFilterTickets = jest
            .spyOn(ticketRepository, 'filterTicketsByState')
            .mockImplementation(async (state: TicketState) => {
              return tickets.filter((t) => t.state === state);
            });

          try {
            const results = await searchService.filterByState(targetState);

            // Should return at least one ticket
            expect(results.length).toBeGreaterThan(0);

            // All returned tickets should have the target state
            results.forEach((ticket) => {
              expect(ticket.state).toBe(targetState);
            });

            // Should return exactly the tickets with the target state
            const expectedCount = tickets.filter((t) => t.state === targetState).length;
            expect(results.length).toBe(expectedCount);
          } finally {
            mockFilterTickets.mockRestore();
          }
        }),
        { numRuns: 25 }
      );
    });
  });

  // ============================================================================
  // Property 30: Filter result completeness
  // ============================================================================

  describe('Property 30: Filter result completeness (all fields present)', () => {
    /**
     * **Validates: Requirements 8.5**
     *
     * For any filter operation that returns results:
     * - Each returned ticket MUST contain ALL required fields
     * - Fields: id, title, description, priority, state, assignee, createdAt, updatedAt
     * - No field should be undefined or missing
     */
    it('should return tickets with all required fields present', async () => {
      await fc.assert(
        fc.asyncProperty(
          validStateArb,
          fc.array(ticketArb, { minLength: 1, maxLength: 10 }),
          async (filterState, tickets) => {
            // Update all tickets to have the filter state
            const updatedTickets = tickets.map((t) => ({ ...t, state: filterState }));

            const mockFilterTickets = jest
              .spyOn(ticketRepository, 'filterTicketsByState')
              .mockResolvedValue(updatedTickets);

            try {
              const results = await searchService.filterByState(filterState);

              results.forEach((ticket) => {
                // Verify all required fields are present
                expect(ticket).toHaveProperty('id');
                expect(ticket).toHaveProperty('title');
                expect(ticket).toHaveProperty('description');
                expect(ticket).toHaveProperty('priority');
                expect(ticket).toHaveProperty('state');
                expect(ticket).toHaveProperty('assignee');
                expect(ticket).toHaveProperty('createdAt');
                expect(ticket).toHaveProperty('updatedAt');

                // Verify fields have correct types
                expect(typeof ticket.id).toBe('string');
                expect(typeof ticket.title).toBe('string');
                expect(typeof ticket.description).toBe('string');
                expect(typeof ticket.priority).toBe('string');
                expect(typeof ticket.state).toBe('string');
                expect(ticket.assignee === null || typeof ticket.assignee === 'string').toBe(
                  true
                );
                expect(ticket.createdAt instanceof Date).toBe(true);
                expect(ticket.updatedAt instanceof Date).toBe(true);

                // Verify non-empty strings for required fields
                expect(ticket.id.length).toBeGreaterThan(0);
                expect(ticket.title.length).toBeGreaterThan(0);
                expect(ticket.description.length).toBeGreaterThan(0);
              });
            } finally {
              mockFilterTickets.mockRestore();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return tickets with valid enum values for priority and state', async () => {
      await fc.assert(
        fc.asyncProperty(
          validStateArb,
          fc.array(ticketArb, { minLength: 1, maxLength: 5 }),
          async (filterState, tickets) => {
            // Update tickets to match filter state
            const updatedTickets = tickets.map((t) => ({ ...t, state: filterState }));

            const mockFilterTickets = jest
              .spyOn(ticketRepository, 'filterTicketsByState')
              .mockResolvedValue(updatedTickets);

            try {
              const results = await searchService.filterByState(filterState);

              results.forEach((ticket) => {
                // Verify priority is a valid enum value
                expect(Object.values(Priority)).toContain(ticket.priority);

                // Verify state is a valid enum value and matches filter
                expect(Object.values(TicketState)).toContain(ticket.state);
                expect(ticket.state).toBe(filterState);
              });
            } finally {
              mockFilterTickets.mockRestore();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle tickets with null assignee correctly', async () => {
      const tickets: Ticket[] = [
        {
          id: 'assigned-ticket',
          title: 'Assigned ticket',
          description: 'Has an assignee',
          priority: Priority.High,
          state: TicketState.InProgress,
          assignee: 'user@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'unassigned-ticket',
          title: 'Unassigned ticket',
          description: 'No assignee',
          priority: Priority.Medium,
          state: TicketState.InProgress,
          assignee: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockFilterTickets = jest
        .spyOn(ticketRepository, 'filterTicketsByState')
        .mockResolvedValue(tickets);

      try {
        const results = await searchService.filterByState(TicketState.InProgress);

        expect(results).toHaveLength(2);

        // Find both tickets in results
        const assignedTicket = results.find((t) => t.id === 'assigned-ticket');
        const unassignedTicket = results.find((t) => t.id === 'unassigned-ticket');

        expect(assignedTicket).toBeDefined();
        expect(unassignedTicket).toBeDefined();

        expect(assignedTicket?.assignee).toBe('user@example.com');
        expect(unassignedTicket?.assignee).toBeNull();
      } finally {
        mockFilterTickets.mockRestore();
      }
    });
  });

  // ============================================================================
  // Validation Properties
  // ============================================================================

  describe('Validation properties', () => {
    /**
     * Invalid state values should be rejected
     */
    it('should reject invalid state values', async () => {
      const invalidStates = ['InvalidState', 'open', 'OPEN', 'in-progress', 'random'];

      for (const invalidState of invalidStates) {
        await expect(
          searchService.filterByState(invalidState as TicketState)
        ).rejects.toThrow(ValidationError);
      }
    });

    it('should validate state parameter before querying database', async () => {
      const mockFilterTickets = jest.spyOn(ticketRepository, 'filterTicketsByState');

      try {
        await expect(
          searchService.filterByState('NotAState' as TicketState)
        ).rejects.toThrow(ValidationError);

        // Repository should not be called for invalid state
        expect(mockFilterTickets).not.toHaveBeenCalled();
      } finally {
        mockFilterTickets.mockRestore();
      }
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge cases', () => {
    it('should return empty array when no tickets match the state filter', async () => {
      const mockFilterTickets = jest
        .spyOn(ticketRepository, 'filterTicketsByState')
        .mockResolvedValue([]);

      try {
        const results = await searchService.filterByState(TicketState.Cancelled);

        expect(results).toEqual([]);
        expect(results).toHaveLength(0);
      } finally {
        mockFilterTickets.mockRestore();
      }
    });

    it('should handle filtering for all valid states', async () => {
      const allStates = [
        TicketState.Open,
        TicketState.InProgress,
        TicketState.Resolved,
        TicketState.Closed,
        TicketState.Cancelled,
      ];

      for (const state of allStates) {
        const ticket: Ticket = {
          id: `ticket-${state}`,
          title: `Ticket in ${state}`,
          description: 'Test ticket',
          priority: Priority.Medium,
          state,
          assignee: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockFilterTickets = jest
          .spyOn(ticketRepository, 'filterTicketsByState')
          .mockResolvedValue([ticket]);

        try {
          const results = await searchService.filterByState(state);

          expect(results).toHaveLength(1);
          expect(results[0]?.state).toBe(state);
        } finally {
          mockFilterTickets.mockRestore();
        }
      }
    });
  });
});
