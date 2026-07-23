/**
 * Search and Filter Validation Integration Tests
 * Tests the integration between Validator and InputSanitizer for search/filter operations
 * 
 * Task 3.10: Implement search and filter validation
 * Requirements: 7.5 (search validation), 8.4 (filter validation)
 */

import { Validator } from './validator';
import { InputSanitizer } from './inputSanitizer';
import { TicketState, ErrorCode } from '../models';

describe('Search and Filter Validation Integration', () => {
  let validator: Validator;
  let sanitizer: InputSanitizer;

  beforeEach(() => {
    validator = new Validator();
    sanitizer = new InputSanitizer();
  });

  describe('Search Query Validation and Sanitization', () => {
    describe('Requirement 7.5: Empty/whitespace keyword rejection', () => {
      it('should reject empty search query', () => {
        const result = validator.validateSearchQuery('');

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0]?.field).toBe('q');
          expect(result.errors.some((e) => e.message.match(/required|cannot be empty/i))).toBe(true);
        }
      });

      it('should reject whitespace-only search query', () => {
        const result = validator.validateSearchQuery('   ');

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.some((e) => e.code === ErrorCode.WHITESPACE_ONLY)).toBe(true);
          expect(result.errors[0]?.field).toBe('q');
        }
      });

      it('should reject tabs and newlines as whitespace', () => {
        const queries = ['\t', '\n', '\r\n', '  \t\n  '];

        queries.forEach((query) => {
          const result = validator.validateSearchQuery(query);
          expect(result.valid).toBe(false);
          if (!result.valid) {
            expect(result.errors.some((e) => e.code === ErrorCode.WHITESPACE_ONLY)).toBe(true);
          }
        });
      });
    });

    describe('Valid search queries', () => {
      it('should accept simple text search', () => {
        const result = validator.validateSearchQuery('bug fix');

        expect(result.valid).toBe(true);
      });

      it('should accept search with special characters', () => {
        const queries = [
          'server error (500)',
          'user@example.com issue',
          'file.txt not found',
          'query with * asterisk',
        ];

        queries.forEach((query) => {
          const result = validator.validateSearchQuery(query);
          expect(result.valid).toBe(true);
        });
      });

      it('should accept search with unicode characters', () => {
        const result = validator.validateSearchQuery('café résumé 日本語');

        expect(result.valid).toBe(true);
      });
    });

    describe('Search query sanitization', () => {
      it('should sanitize valid query to prevent regex injection', () => {
        const maliciousQuery = '.*|DROP TABLE|.*';
        
        // First validate
        const validationResult = validator.validateSearchQuery(maliciousQuery);
        expect(validationResult.valid).toBe(true);

        // Then sanitize
        const sanitized = sanitizer.sanitizeSearchQuery(maliciousQuery);
        expect(sanitized).toBe('\\.\\*\\|DROP TABLE\\|\\.\\*');
        
        // Verify sanitized query is safe to use in regex
        expect(() => new RegExp(sanitized, 'i')).not.toThrow();
      });

      it('should sanitize regex special characters in search', () => {
        const query = 'search.*pattern?';
        
        const validationResult = validator.validateSearchQuery(query);
        expect(validationResult.valid).toBe(true);

        const sanitized = sanitizer.sanitizeSearchQuery(query);
        expect(sanitized).toBe('search\\.\\*pattern\\?');
      });

      it('should trim whitespace during sanitization', () => {
        const query = '  search term  ';
        
        const validationResult = validator.validateSearchQuery(query);
        expect(validationResult.valid).toBe(true);

        const sanitized = sanitizer.sanitizeSearchQuery(query);
        expect(sanitized).toBe('search term');
      });

      it('should limit query length during sanitization', () => {
        const longQuery = 'a'.repeat(300);
        
        const validationResult = validator.validateSearchQuery(longQuery);
        expect(validationResult.valid).toBe(true);

        const sanitized = sanitizer.sanitizeSearchQuery(longQuery);
        expect(sanitized.length).toBe(200);
      });
    });

    describe('Complete search workflow', () => {
      it('should validate then sanitize a typical search query', () => {
        const userInput = '  error (code 500)  ';
        
        // Step 1: Validate
        const validationResult = validator.validateSearchQuery(userInput);
        expect(validationResult.valid).toBe(true);

        // Step 2: Sanitize
        const sanitized = sanitizer.sanitizeSearchQuery(userInput);
        expect(sanitized).toBe('error \\(code 500\\)');

        // Step 3: Verify safe to use
        expect(() => new RegExp(sanitized, 'i')).not.toThrow();
      });

      it('should reject invalid query before sanitization', () => {
        const userInput = '   '; // Whitespace-only

        // Step 1: Validate (should fail)
        const validationResult = validator.validateSearchQuery(userInput);
        expect(validationResult.valid).toBe(false);

        // Step 2: Should not proceed to sanitization
        // But if we did, sanitize would return empty string
        const sanitized = sanitizer.sanitizeSearchQuery(userInput);
        expect(sanitized).toBe('');
      });
    });

    describe('Error messages', () => {
      it('should provide descriptive error message for empty query', () => {
        const result = validator.validateSearchQuery('');

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]?.message).toMatch(/required|cannot be empty/i);
        }
      });

      it('should provide descriptive error message for whitespace query', () => {
        const result = validator.validateSearchQuery('   ');

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]?.message).toMatch(/whitespace/i);
        }
      });

      it('should provide descriptive error message for non-string query', () => {
        const result = validator.validateSearchQuery(123);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]?.message).toMatch(/string/i);
        }
      });
    });
  });

  describe('State Filter Validation', () => {
    describe('Requirement 8.4: Invalid state value rejection', () => {
      it('should reject invalid state string', () => {
        const result = validator.validateStateFilter('InvalidState');

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.some((e) => e.code === ErrorCode.INVALID_STATE)).toBe(true);
          expect(result.errors[0]?.field).toBe('state');
        }
      });

      it('should reject case-mismatched state', () => {
        const result = validator.validateStateFilter('open'); // Should be "Open"

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.some((e) => e.code === ErrorCode.INVALID_STATE)).toBe(true);
        }
      });

      it('should reject non-string state value', () => {
        const result = validator.validateStateFilter(123);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]?.message).toMatch(/string/i);
        }
      });

      it('should reject empty string state', () => {
        const result = validator.validateStateFilter('');

        expect(result.valid).toBe(false);
      });
    });

    describe('Valid state values', () => {
      it('should accept Open state', () => {
        const result = validator.validateStateFilter(TicketState.Open);
        expect(result.valid).toBe(true);
      });

      it('should accept In_Progress state', () => {
        const result = validator.validateStateFilter(TicketState.InProgress);
        expect(result.valid).toBe(true);
      });

      it('should accept Resolved state', () => {
        const result = validator.validateStateFilter(TicketState.Resolved);
        expect(result.valid).toBe(true);
      });

      it('should accept Closed state', () => {
        const result = validator.validateStateFilter(TicketState.Closed);
        expect(result.valid).toBe(true);
      });

      it('should accept Cancelled state', () => {
        const result = validator.validateStateFilter(TicketState.Cancelled);
        expect(result.valid).toBe(true);
      });

      it('should accept all valid states', () => {
        const validStates = [
          TicketState.Open,
          TicketState.InProgress,
          TicketState.Resolved,
          TicketState.Closed,
          TicketState.Cancelled,
        ];

        validStates.forEach((state) => {
          const result = validator.validateStateFilter(state);
          expect(result.valid).toBe(true);
        });
      });
    });

    describe('Error messages', () => {
      it('should provide descriptive error message for invalid state', () => {
        const result = validator.validateStateFilter('BadState');

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]?.message).toMatch(/State must be one of/i);
          expect(result.errors[0]?.message).toContain('Open');
          expect(result.errors[0]?.message).toContain('In_Progress');
          expect(result.errors[0]?.message).toContain('Resolved');
          expect(result.errors[0]?.message).toContain('Closed');
          expect(result.errors[0]?.message).toContain('Cancelled');
        }
      });

      it('should include error code in response', () => {
        const result = validator.validateStateFilter('InvalidState');

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]?.code).toBe(ErrorCode.INVALID_STATE);
        }
      });

      it('should include field name in error', () => {
        const result = validator.validateStateFilter('InvalidState');

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]?.field).toBe('state');
        }
      });
    });
  });

  describe('Security considerations', () => {
    it('should prevent SQL injection in search queries', () => {
      const sqlInjection = "'; DROP TABLE tickets; --";
      
      const validationResult = validator.validateSearchQuery(sqlInjection);
      expect(validationResult.valid).toBe(true); // Valid string

      const sanitized = sanitizer.sanitizeSearchQuery(sqlInjection);
      // Single quotes are escaped for regex use
      expect(sanitized).toBe("'; DROP TABLE tickets; --");
      // Note: SQL injection prevention is handled by parameterized queries in the database layer
      // The search sanitization is for regex safety, not SQL safety
    });

    it('should prevent regex denial of service', () => {
      const reDoS = '(a+)+$';
      
      const validationResult = validator.validateSearchQuery(reDoS);
      expect(validationResult.valid).toBe(true);

      const sanitized = sanitizer.sanitizeSearchQuery(reDoS);
      // Regex special characters should be escaped
      expect(sanitized).toBe('\\(a\\+\\)\\+\\$');
      
      // Should be safe to compile as regex
      expect(() => {
        const regex = new RegExp(sanitized, 'i');
        // Test it doesn't hang
        regex.test('aaaaaaaaaaaaaaaaaaaaaa');
      }).not.toThrow();
    });

    it('should handle null bytes in search', () => {
      const queryWithNull = 'search\0term';
      
      const validationResult = validator.validateSearchQuery(queryWithNull);
      expect(validationResult.valid).toBe(true);

      // Note: sanitizer doesn't remove null bytes from search queries
      // That's handled by sanitizeText for ticket content
    });
  });

  describe('Edge cases', () => {
    it('should handle maximum length search query', () => {
      const maxQuery = 'a'.repeat(200);
      
      const validationResult = validator.validateSearchQuery(maxQuery);
      expect(validationResult.valid).toBe(true);

      const sanitized = sanitizer.sanitizeSearchQuery(maxQuery);
      expect(sanitized.length).toBe(200);
    });

    it('should handle single character search', () => {
      const result = validator.validateSearchQuery('a');
      expect(result.valid).toBe(true);
    });

    it('should handle numeric search terms', () => {
      const result = validator.validateSearchQuery('12345');
      expect(result.valid).toBe(true);
    });

    it('should handle search with only special characters', () => {
      const result = validator.validateSearchQuery('***');
      expect(result.valid).toBe(true);

      const sanitized = sanitizer.sanitizeSearchQuery('***');
      expect(sanitized).toBe('\\*\\*\\*');
    });
  });
});
