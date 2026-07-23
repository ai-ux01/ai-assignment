/**
 * Validator Integration Tests
 * Tests for the Backend Validator with more realistic scenarios
 */

import { Validator } from './validator';
import { Priority, ErrorCode } from '../models';

describe('Validator Integration Tests', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  describe('Ticket Creation Validation - Real-world Scenarios', () => {
    it('should validate a complete valid ticket with all edge cases', () => {
      const payload = {
        title: 'Customer Login Issue - Unable to access dashboard after password reset',
        description:
          'Customer reports that after resetting their password using the forgot password flow, ' +
          'they are unable to log in to the dashboard. The error message displayed is "Invalid credentials". ' +
          'Steps to reproduce: 1. Go to login page 2. Click forgot password 3. Enter email 4. Reset password ' +
          '5. Attempt to login with new password. Expected: User should be logged in. Actual: Error message shown.',
        priority: Priority.High,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(true);
    });

    it('should handle title with special characters correctly', () => {
      const payload = {
        title: 'API Error: 500 Internal Server Error on /api/v1/users endpoint',
        description: 'The API endpoint is returning 500 errors intermittently',
        priority: Priority.Critical,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(true);
    });

    it('should handle description with newlines and special formatting', () => {
      const payload = {
        title: 'Documentation Update Required',
        description: `Need to update the following sections:
        
1. Installation guide
2. Configuration options
3. API reference
4. Troubleshooting tips

Priority: High
Deadline: End of week`,
        priority: Priority.Medium,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(true);
    });

    it('should trim whitespace from title and still validate', () => {
      const payload = {
        title: '  Login Bug  ',
        description: 'User cannot login',
        priority: Priority.Low,
      };

      const result = validator.validateTicketCreation(payload);

      // The validator should accept this since after trim it's valid
      expect(result.valid).toBe(true);
    });

    it('should handle very long but valid title (exactly 200 chars)', () => {
      // Create a title that's exactly 200 characters
      const titleBase = 'This is a very long ticket title that describes a complex issue with multiple components ';
      const padding = 'x'.repeat(200 - titleBase.length);
      const title200 = titleBase + padding;

      const payload = {
        title: title200,
        description: 'Detailed description of the issue',
        priority: Priority.High,
      };

      expect(payload.title.length).toBe(200);
      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(true);
    });

    it('should handle very long but valid description (exactly 5000 chars)', () => {
      const description = 'a'.repeat(5000);
      const payload = {
        title: 'Test Ticket',
        description: description,
        priority: Priority.Low,
      };

      expect(payload.description.length).toBe(5000);
      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(true);
    });

    it('should reject when title exceeds limit by 1 character', () => {
      const payload = {
        title: 'a'.repeat(201),
        description: 'Valid description',
        priority: Priority.Medium,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'title')).toBe(true);
        expect(result.errors.some((e) => e.code === ErrorCode.FIELD_TOO_LONG)).toBe(true);
      }
    });

    it('should reject when description exceeds limit by 1 character', () => {
      const payload = {
        title: 'Test Ticket',
        description: 'a'.repeat(5001),
        priority: Priority.High,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'description')).toBe(true);
        expect(result.errors.some((e) => e.code === ErrorCode.FIELD_TOO_LONG)).toBe(true);
      }
    });

    it('should provide field-specific error messages for each invalid field', () => {
      const payload = {
        title: 'a'.repeat(201), // Too long
        description: '   ', // Whitespace only
        priority: 'Urgent', // Invalid enum value
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        // Should have 3 distinct errors
        expect(result.errors.length).toBe(3);

        // Check title error
        const titleError = result.errors.find((e) => e.field === 'title');
        expect(titleError).toBeDefined();
        expect(titleError?.code).toBe(ErrorCode.FIELD_TOO_LONG);
        expect(titleError?.message).toContain('200');

        // Check description error
        const descError = result.errors.find((e) => e.field === 'description');
        expect(descError).toBeDefined();
        expect(descError?.code).toBe(ErrorCode.WHITESPACE_ONLY);
        expect(descError?.message).toContain('whitespace');

        // Check priority error
        const priorityError = result.errors.find((e) => e.field === 'priority');
        expect(priorityError).toBeDefined();
        expect(priorityError?.code).toBe(ErrorCode.INVALID_PRIORITY);
        expect(priorityError?.message).toContain('Priority');
      }
    });

    it('should validate all Priority enum values', () => {
      const priorities = [
        Priority.Low,
        Priority.Medium,
        Priority.High,
        Priority.Critical,
      ];

      priorities.forEach((priority) => {
        const payload = {
          title: `Ticket with ${priority} priority`,
          description: `This ticket has ${priority} priority level`,
          priority: priority,
        };

        const result = validator.validateTicketCreation(payload);
        expect(result.valid).toBe(true);
      });
    });

    it('should handle Unicode characters in title and description', () => {
      const payload = {
        title: '用户登录问题 - User Login Issue 🔒',
        description: 'Description with emojis 🚀 and Unicode characters: café, naïve, 日本語',
        priority: Priority.Medium,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(true);
    });

    it('should reject null values for required fields', () => {
      const payload = {
        title: null,
        description: null,
        priority: null,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should reject undefined values for required fields', () => {
      const payload = {
        title: undefined,
        description: undefined,
        priority: undefined,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should handle mixed whitespace (tabs, spaces, newlines) in title', () => {
      const payload = {
        title: ' \t \n ',
        description: 'Valid description',
        priority: Priority.Low,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'title')).toBe(true);
        expect(
          result.errors.some(
            (e) => e.code === ErrorCode.WHITESPACE_ONLY || e.message.includes('whitespace')
          )
        ).toBe(true);
      }
    });

    it('should handle mixed whitespace in description', () => {
      const payload = {
        title: 'Valid Title',
        description: ' \t \n ',
        priority: Priority.Medium,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'description')).toBe(true);
        expect(
          result.errors.some(
            (e) => e.code === ErrorCode.WHITESPACE_ONLY || e.message.includes('whitespace')
          )
        ).toBe(true);
      }
    });

    it('should reject payload with extra unknown fields (should still validate required fields)', () => {
      const payload = {
        title: 'Valid Title',
        description: 'Valid description',
        priority: Priority.High,
        // These extra fields should be ignored by Zod schema
        extraField: 'should be ignored',
        anotherField: 123,
      };

      const result = validator.validateTicketCreation(payload);

      // Zod by default strips unknown fields, so this should still be valid
      expect(result.valid).toBe(true);
    });
  });

  describe('Assignment Validation - Real-world Scenarios', () => {
    it('should accept various valid email formats', () => {
      const validEmails = [
        'john.doe@example.com',
        'user+tag@company.co.uk',
        'admin@subdomain.example.org',
        'support@123.com',
        'test_user@example.com',
      ];

      validEmails.forEach((email) => {
        const payload = { assignee: email };
        const result = validator.validateAssignment(payload);
        expect(result.valid).toBe(true);
      });
    });

    it('should accept various valid username formats', () => {
      const validUsernames = [
        'john_doe',
        'user123',
        'admin.user',
        'test-user',
        'user_123',
        'abc',              // minimum length
        'a'.repeat(100),    // maximum length username
      ];

      validUsernames.forEach((username) => {
        const payload = { assignee: username };
        const result = validator.validateAssignment(payload);
        expect(result.valid).toBe(true);
      });
    });

    it('should accept various valid UUID formats', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '123e4567-e89b-12d3-a456-426614174000',
      ];

      validUuids.forEach((uuid) => {
        const payload = { assignee: uuid };
        const result = validator.validateAssignment(payload);
        expect(result.valid).toBe(true);
      });
    });

    it('should accept null for unassignment', () => {
      const payload = { assignee: null };
      const result = validator.validateAssignment(payload);
      expect(result.valid).toBe(true);
    });

    it('should reject malformed emails', () => {
      const malformedEmails = [
        '@example.com',           // missing local part
        'user@',                  // missing domain
        'user@domain',            // missing TLD
        'user @example.com',      // space in email
        'user@@example.com',      // double @
      ];

      malformedEmails.forEach((email) => {
        const payload = { assignee: email };
        const result = validator.validateAssignment(payload);
        expect(result.valid).toBe(false);
      });
    });

    it('should reject usernames with invalid characters', () => {
      const invalidUsernames = [
        'user name',          // space
        'user@name',          // @ symbol (would be email)
        'user#name',          // # symbol
        'user$name',          // $ symbol
        'user%name',          // % symbol
        'user&name',          // & symbol
      ];

      invalidUsernames.forEach((username) => {
        const payload = { assignee: username };
        const result = validator.validateAssignment(payload);
        expect(result.valid).toBe(false);
      });
    });

    it('should reject usernames that are too short', () => {
      const shortUsernames = ['a', 'ab'];

      shortUsernames.forEach((username) => {
        const payload = { assignee: username };
        const result = validator.validateAssignment(payload);
        expect(result.valid).toBe(false);
      });
    });

    it('should reject empty string assignee', () => {
      const payload = { assignee: '' };
      const result = validator.validateAssignment(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'assignee')).toBe(true);
      }
    });

    it('should reject whitespace-only assignee', () => {
      const whitespaceValues = ['   ', '\t', '\n', ' \t \n '];

      whitespaceValues.forEach((whitespace) => {
        const payload = { assignee: whitespace };
        const result = validator.validateAssignment(payload);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.some((e) => e.code === ErrorCode.WHITESPACE_ONLY)).toBe(true);
        }
      });
    });

    it('should reject assignee exceeding maximum length', () => {
      // Create an email that exceeds 100 characters
      const longAssignee = 'a'.repeat(91) + '@example.com'; // 103 chars
      const payload = { assignee: longAssignee };
      const result = validator.validateAssignment(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === ErrorCode.FIELD_TOO_LONG)).toBe(true);
      }
    });

    it('should provide descriptive error for invalid format', () => {
      const payload = { assignee: 'user@@@invalid' };
      const result = validator.validateAssignment(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0]?.message).toContain('email');
        expect(result.errors[0]?.message).toContain('username');
        expect(result.errors[0]?.message).toContain('UUID');
      }
    });

    it('should handle Unicode characters in usernames (if within allowed charset)', () => {
      // Unicode should be rejected as it's outside alphanumeric + ._-
      const payload = { assignee: 'user用户' };
      const result = validator.validateAssignment(payload);
      expect(result.valid).toBe(false);
    });

    it('should accept assignee at exactly 100 characters', () => {
      // Create a valid username at exactly 100 characters
      const assignee100 = 'a'.repeat(100);
      const payload = { assignee: assignee100 };
      const result = validator.validateAssignment(payload);
      expect(result.valid).toBe(true);
    });

    it('should distinguish between email and username based on @ presence', () => {
      // 'test.user' should be valid username
      const username = { assignee: 'test.user' };
      const resultUsername = validator.validateAssignment(username);
      expect(resultUsername.valid).toBe(true);

      // 'test.user@domain.com' should be valid email
      const email = { assignee: 'test.user@domain.com' };
      const resultEmail = validator.validateAssignment(email);
      expect(resultEmail.valid).toBe(true);
    });

    it('should accept hyphens in usernames', () => {
      const payload = { assignee: 'test-user-name' };
      const result = validator.validateAssignment(payload);
      expect(result.valid).toBe(true);
    });

    it('should accept dots in usernames', () => {
      const payload = { assignee: 'test.user.name' };
      const result = validator.validateAssignment(payload);
      expect(result.valid).toBe(true);
    });

    it('should accept underscores in usernames', () => {
      const payload = { assignee: 'test_user_name' };
      const result = validator.validateAssignment(payload);
      expect(result.valid).toBe(true);
    });
  });
});
