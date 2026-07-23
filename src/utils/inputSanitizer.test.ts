/**
 * InputSanitizer Unit Tests
 * Tests for the InputSanitizer class
 */

import { InputSanitizer } from './inputSanitizer';

describe('InputSanitizer', () => {
  let sanitizer: InputSanitizer;

  beforeEach(() => {
    sanitizer = new InputSanitizer();
  });

  describe('sanitizeText', () => {
    it('should trim whitespace from text', () => {
      const input = '  Test text with spaces  ';
      const result = sanitizer.sanitizeText(input);

      expect(result).toBe('Test text with spaces');
    });

    it('should remove null bytes from text', () => {
      const input = 'Text with\0null\0bytes';
      const result = sanitizer.sanitizeText(input);

      expect(result).toBe('Text withnullbytes');
      expect(result).not.toContain('\0');
    });

    it('should limit text length to 5000 characters', () => {
      const input = 'a'.repeat(6000);
      const result = sanitizer.sanitizeText(input);

      expect(result.length).toBe(5000);
      expect(result).toBe('a'.repeat(5000));
    });

    it('should handle text shorter than limit', () => {
      const input = 'Short text';
      const result = sanitizer.sanitizeText(input);

      expect(result).toBe('Short text');
    });

    it('should handle empty string', () => {
      const input = '';
      const result = sanitizer.sanitizeText(input);

      expect(result).toBe('');
    });

    it('should handle whitespace-only string', () => {
      const input = '   ';
      const result = sanitizer.sanitizeText(input);

      expect(result).toBe('');
    });

    it('should handle text with special characters', () => {
      const input = 'Text with special chars: !@#$%^&*()';
      const result = sanitizer.sanitizeText(input);

      expect(result).toBe('Text with special chars: !@#$%^&*()');
    });

    it('should combine all sanitization steps', () => {
      const input = '  Text with\0null and extra chars  ' + 'x'.repeat(6000);
      const result = sanitizer.sanitizeText(input);

      expect(result).not.toContain('\0');
      expect(result.length).toBeLessThanOrEqual(5000);
      expect(result).not.toMatch(/^\s+/); // Should not start with whitespace
    });
  });

  describe('isValidUUID', () => {
    it('should accept valid UUID v4 format', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789',
        '12345678-1234-1234-1234-123456789012',
        'AAAABBBB-CCCC-DDDD-EEEE-FFFFFFFFFFFF',
      ];

      validUUIDs.forEach((uuid) => {
        expect(sanitizer.isValidUUID(uuid)).toBe(true);
      });
    });

    it('should accept valid UUID with lowercase letters', () => {
      const uuid = 'abcdef12-3456-7890-abcd-ef1234567890';
      expect(sanitizer.isValidUUID(uuid)).toBe(true);
    });

    it('should accept valid UUID with uppercase letters', () => {
      const uuid = 'ABCDEF12-3456-7890-ABCD-EF1234567890';
      expect(sanitizer.isValidUUID(uuid)).toBe(true);
    });

    it('should reject invalid UUID format - wrong length', () => {
      const invalidUUIDs = [
        '550e8400-e29b-41d4-a716', // Too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // Too long
        '550e8400e29b41d4a716446655440000', // Missing hyphens
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(sanitizer.isValidUUID(uuid)).toBe(false);
      });
    });

    it('should reject invalid UUID format - wrong structure', () => {
      const invalidUUIDs = [
        '550e8400-e29b-41d4-a716-44665544000', // Last segment too short
        '550e8400-e29b-41d4-a716-4466554400000', // Last segment too long
        'not-a-uuid-at-all-really-not-valid',
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(sanitizer.isValidUUID(uuid)).toBe(false);
      });
    });

    it('should reject UUID with invalid characters', () => {
      const invalidUUIDs = [
        '550e8400-e29b-41d4-a716-44665544000g', // 'g' is invalid hex
        '550e8400-e29b-41d4-a716-4466554!0000', // Special character
        '550e8400 e29b 41d4 a716 446655440000', // Spaces instead of hyphens
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(sanitizer.isValidUUID(uuid)).toBe(false);
      });
    });

    it('should reject empty string', () => {
      expect(sanitizer.isValidUUID('')).toBe(false);
    });

    it('should reject strings with correct length but wrong format', () => {
      expect(sanitizer.isValidUUID('12345678-1234-1234-1234-12345678901')).toBe(false); // Missing one char
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should trim whitespace from search query', () => {
      const query = '  search term  ';
      const result = sanitizer.sanitizeSearchQuery(query);

      expect(result).toBe('search term');
    });

    it('should escape special regex characters', () => {
      const specialChars = ['*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\', '.'];

      specialChars.forEach((char) => {
        const query = `search${char}term`;
        const result = sanitizer.sanitizeSearchQuery(query);

        expect(result).toBe(`search\\${char}term`);
        // Verify the escaped character won't be interpreted as regex
        expect(() => new RegExp(result)).not.toThrow();
      });
    });

    it('should escape multiple special characters in sequence', () => {
      const query = 'test.*+?^$';
      const result = sanitizer.sanitizeSearchQuery(query);

      expect(result).toBe('test\\.\\*\\+\\?\\^\\$');
    });

    it('should limit query length to 200 characters', () => {
      const query = 'a'.repeat(300);
      const result = sanitizer.sanitizeSearchQuery(query);

      expect(result.length).toBe(200);
      expect(result).toBe('a'.repeat(200));
    });

    it('should handle query shorter than limit', () => {
      const query = 'short query';
      const result = sanitizer.sanitizeSearchQuery(query);

      expect(result).toBe('short query');
    });

    it('should handle empty string', () => {
      const query = '';
      const result = sanitizer.sanitizeSearchQuery(query);

      expect(result).toBe('');
    });

    it('should handle whitespace-only query', () => {
      const query = '   ';
      const result = sanitizer.sanitizeSearchQuery(query);

      expect(result).toBe('');
    });

    it('should handle query with parentheses (common in searches)', () => {
      const query = 'error (code 500)';
      const result = sanitizer.sanitizeSearchQuery(query);

      expect(result).toBe('error \\(code 500\\)');
    });

    it('should handle query with brackets', () => {
      const query = 'item[0].value';
      const result = sanitizer.sanitizeSearchQuery(query);

      expect(result).toBe('item\\[0\\]\\.value');
    });

    it('should prevent regex injection attack', () => {
      const maliciousQuery = '.*|DROP TABLE tickets;|.*';
      const result = sanitizer.sanitizeSearchQuery(maliciousQuery);

      expect(result).toBe('\\.\\*\\|DROP TABLE tickets;\\|\\.\\*');
      // Verify the sanitized query is safe to use in regex
      expect(() => new RegExp(result)).not.toThrow();
    });

    it('should combine all sanitization steps', () => {
      const query = '  search.*(term)  ' + 'x'.repeat(300);
      const result = sanitizer.sanitizeSearchQuery(query);

      expect(result.length).toBeLessThanOrEqual(200);
      expect(result).toContain('\\.');
      expect(result).toContain('\\*');
      expect(result).toContain('\\(');
      expect(result).toContain('\\)');
      expect(result).not.toMatch(/^\s+/); // Should not start with whitespace
    });

    it('should not escape alphanumeric characters', () => {
      const query = 'abc123XYZ';
      const result = sanitizer.sanitizeSearchQuery(query);

      expect(result).toBe('abc123XYZ');
    });

    it('should not escape common punctuation that is not regex special', () => {
      const query = 'hello, world! test';
      const result = sanitizer.sanitizeSearchQuery(query);

      expect(result).toBe('hello, world! test');
    });

    it('should handle unicode characters properly', () => {
      const query = 'café résumé 日本語';
      const result = sanitizer.sanitizeSearchQuery(query);

      expect(result).toBe('café résumé 日本語');
    });
  });

  describe('Integration scenarios', () => {
    it('should safely sanitize user input for database search', () => {
      const userInput = '  .*admin.* OR 1=1  ';
      const sanitized = sanitizer.sanitizeSearchQuery(userInput);

      // Should escape regex special chars and trim
      expect(sanitized).toBe('\\.\\*admin\\.\\* OR 1=1');
      // Should be safe to use in a regex pattern
      expect(() => new RegExp(sanitized, 'i')).not.toThrow();
    });

    it('should sanitize text while preserving meaningful content', () => {
      const userText = '  Customer reported: Error (500) - Server\0unavailable  ';
      const sanitized = sanitizer.sanitizeText(userText);

      expect(sanitized).toBe('Customer reported: Error (500) - Serverunavailable');
      expect(sanitized).not.toContain('\0');
    });

    it('should validate UUID before using in database queries', () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000';
      const invalidId = '../../etc/passwd';

      expect(sanitizer.isValidUUID(validId)).toBe(true);
      expect(sanitizer.isValidUUID(invalidId)).toBe(false);
    });
  });
});
