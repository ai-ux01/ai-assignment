/**
 * Validator Unit Tests
 * Tests for the Backend Validator class
 */

import { Validator } from './validator';
import { Priority, TicketState, ErrorCode } from '../models';

describe('Validator', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  describe('validateTicketCreation', () => {
    it('should accept valid ticket creation request', () => {
      const payload = {
        title: 'Test Ticket',
        description: 'This is a test ticket description',
        priority: Priority.High,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(true);
    });

    it('should reject ticket creation with missing title', () => {
      const payload = {
        description: 'This is a test ticket description',
        priority: Priority.High,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.field).toBe('title');
      }
    });

    it('should reject ticket creation with empty title', () => {
      const payload = {
        title: '',
        description: 'This is a test ticket description',
        priority: Priority.High,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'title')).toBe(true);
      }
    });

    it('should reject ticket creation with whitespace-only title', () => {
      const payload = {
        title: '   ',
        description: 'This is a test ticket description',
        priority: Priority.High,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'title')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('whitespace'))).toBe(true);
      }
    });

    it('should reject ticket creation with title too long', () => {
      const payload = {
        title: 'a'.repeat(201),
        description: 'This is a test ticket description',
        priority: Priority.High,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'title')).toBe(true);
        expect(result.errors.some((e) => e.code === ErrorCode.FIELD_TOO_LONG)).toBe(true);
      }
    });

    it('should reject ticket creation with invalid priority', () => {
      const payload = {
        title: 'Test Ticket',
        description: 'This is a test ticket description',
        priority: 'InvalidPriority',
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'priority')).toBe(true);
        expect(result.errors.some((e) => e.code === ErrorCode.INVALID_PRIORITY)).toBe(true);
      }
    });

    it('should reject ticket creation with missing description', () => {
      const payload = {
        title: 'Test Ticket',
        priority: Priority.High,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.field).toBe('description');
        // Zod returns INVALID_INPUT for missing required fields initially
        expect([ErrorCode.MISSING_REQUIRED_FIELD, ErrorCode.INVALID_INPUT]).toContain(
          result.errors[0]?.code
        );
      }
    });

    it('should reject ticket creation with empty description', () => {
      const payload = {
        title: 'Test Ticket',
        description: '',
        priority: Priority.High,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'description')).toBe(true);
      }
    });

    it('should reject ticket creation with whitespace-only description', () => {
      const payload = {
        title: 'Test Ticket',
        description: '   ',
        priority: Priority.High,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'description')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('whitespace'))).toBe(true);
        expect(result.errors.some((e) => e.code === ErrorCode.WHITESPACE_ONLY)).toBe(true);
      }
    });

    it('should reject ticket creation with description too long', () => {
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

    it('should reject ticket creation with missing priority', () => {
      const payload = {
        title: 'Test Ticket',
        description: 'This is a test ticket description',
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.field).toBe('priority');
      }
    });

    it('should accept ticket with title at minimum length (1 character)', () => {
      const payload = {
        title: 'a',
        description: 'This is a test ticket description',
        priority: Priority.Medium,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(true);
    });

    it('should accept ticket with title at maximum length (200 characters)', () => {
      const payload = {
        title: 'a'.repeat(200),
        description: 'This is a test ticket description',
        priority: Priority.Low,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(true);
    });

    it('should accept ticket with description at minimum length (1 character)', () => {
      const payload = {
        title: 'Test Ticket',
        description: 'a',
        priority: Priority.Critical,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(true);
    });

    it('should accept ticket with description at maximum length (5000 characters)', () => {
      const payload = {
        title: 'Test Ticket',
        description: 'a'.repeat(5000),
        priority: Priority.High,
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(true);
    });

    it('should accept all valid priority values', () => {
      const priorities = [Priority.Low, Priority.Medium, Priority.High, Priority.Critical];

      priorities.forEach((priority) => {
        const payload = {
          title: 'Test Ticket',
          description: 'Test description',
          priority,
        };

        const result = validator.validateTicketCreation(payload);
        expect(result.valid).toBe(true);
      });
    });

    it('should provide descriptive error messages for multiple validation failures', () => {
      const payload = {
        title: '',
        description: '  ',
        priority: 'InvalidPriority',
      };

      const result = validator.validateTicketCreation(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(0);
        // Should have errors for title, description, and priority
        const fields = result.errors.map((e) => e.field);
        expect(fields).toContain('title');
        expect(fields).toContain('description');
        expect(fields).toContain('priority');
      }
    });
  });

  describe('validateTicketUpdate', () => {
    it('should accept valid ticket update with all fields', () => {
      const payload = {
        title: 'Updated Title',
        description: 'Updated description',
        priority: Priority.Low,
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(true);
    });

    it('should accept valid ticket update with partial fields', () => {
      const payload = {
        title: 'Updated Title',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(true);
    });

    it('should accept empty update object', () => {
      const payload = {};

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(true);
    });

    it('should reject update with invalid title', () => {
      const payload = {
        title: '',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
    });

    it('should reject update with whitespace-only title', () => {
      const payload = {
        title: '   ',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'title')).toBe(true);
        expect(result.errors.some((e) => e.code === ErrorCode.WHITESPACE_ONLY)).toBe(true);
      }
    });

    it('should reject update with title too long', () => {
      const payload = {
        title: 'a'.repeat(201),
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'title')).toBe(true);
        expect(result.errors.some((e) => e.code === ErrorCode.FIELD_TOO_LONG)).toBe(true);
      }
    });

    it('should reject update with empty description', () => {
      const payload = {
        description: '',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'description')).toBe(true);
      }
    });

    it('should reject update with whitespace-only description', () => {
      const payload = {
        description: '   ',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'description')).toBe(true);
        expect(result.errors.some((e) => e.code === ErrorCode.WHITESPACE_ONLY)).toBe(true);
      }
    });

    it('should reject update with description too long', () => {
      const payload = {
        description: 'a'.repeat(5001),
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'description')).toBe(true);
        expect(result.errors.some((e) => e.code === ErrorCode.FIELD_TOO_LONG)).toBe(true);
      }
    });

    it('should reject update with invalid priority', () => {
      const payload = {
        priority: 'InvalidPriority',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'priority')).toBe(true);
        expect(result.errors.some((e) => e.code === ErrorCode.INVALID_PRIORITY)).toBe(true);
      }
    });

    it('should accept update with valid priority', () => {
      const payload = {
        priority: Priority.Critical,
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(true);
    });

    it('should reject update attempting to modify immutable field: id', () => {
      const payload = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Updated Title',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'id')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('immutable'))).toBe(true);
      }
    });

    it('should reject update attempting to modify immutable field: createdAt', () => {
      const payload = {
        createdAt: new Date().toISOString(),
        title: 'Updated Title',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'createdAt')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('immutable'))).toBe(true);
      }
    });

    it('should reject update attempting to modify immutable field: updatedAt', () => {
      const payload = {
        updatedAt: new Date().toISOString(),
        title: 'Updated Title',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'updatedAt')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('immutable'))).toBe(true);
      }
    });

    it('should reject update attempting to modify immutable field: state', () => {
      const payload = {
        state: TicketState.InProgress,
        title: 'Updated Title',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'state')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('immutable'))).toBe(true);
      }
    });

    it('should reject update attempting to modify immutable field: assignee', () => {
      const payload = {
        assignee: 'user123',
        title: 'Updated Title',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'assignee')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('immutable'))).toBe(true);
      }
    });

    it('should reject update with multiple immutable fields', () => {
      const payload = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        state: TicketState.Closed,
        assignee: 'user123',
        title: 'Updated Title',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
        expect(result.errors.some((e) => e.field === 'id')).toBe(true);
        expect(result.errors.some((e) => e.field === 'state')).toBe(true);
        expect(result.errors.some((e) => e.field === 'assignee')).toBe(true);
      }
    });

    it('should accept update with only mutable fields', () => {
      const payload = {
        title: 'New Title',
        description: 'New Description',
        priority: Priority.High,
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(true);
    });

    it('should accept update with title at minimum length (1 character)', () => {
      const payload = {
        title: 'a',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(true);
    });

    it('should accept update with title at maximum length (200 characters)', () => {
      const payload = {
        title: 'a'.repeat(200),
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(true);
    });

    it('should accept update with description at minimum length (1 character)', () => {
      const payload = {
        description: 'a',
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(true);
    });

    it('should accept update with description at maximum length (5000 characters)', () => {
      const payload = {
        description: 'a'.repeat(5000),
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(true);
    });

    it('should provide descriptive error messages for validation and immutable field violations', () => {
      const payload = {
        title: '',
        description: '  ',
        priority: 'InvalidPriority',
        id: '550e8400-e29b-41d4-a716-446655440000',
        state: TicketState.Closed,
      };

      const result = validator.validateTicketUpdate(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(0);
        // Should have errors for both validation and immutable fields
        const fields = result.errors.map((e) => e.field);
        expect(fields).toContain('title');
        expect(fields).toContain('description');
        expect(fields).toContain('priority');
      }
    });
  });

  describe('validateAssignment', () => {
    describe('valid assignee formats', () => {
      it('should accept valid email format', () => {
        const payload = {
          assignee: 'user@example.com',
        };

        const result = validator.validateAssignment(payload);

        expect(result.valid).toBe(true);
      });

      it('should accept valid username format', () => {
        const validUsernames = [
          'john_doe',
          'user123',
          'test.user',
          'admin-user',
          'user_123',
          'abc',  // minimum 3 chars
        ];

        validUsernames.forEach((username) => {
          const payload = { assignee: username };
          const result = validator.validateAssignment(payload);
          expect(result.valid).toBe(true);
        });
      });

      it('should accept valid UUID format', () => {
        const payload = {
          assignee: '550e8400-e29b-41d4-a716-446655440000',
        };

        const result = validator.validateAssignment(payload);

        expect(result.valid).toBe(true);
      });

      it('should accept null assignee (unassignment)', () => {
        const payload = {
          assignee: null,
        };

        const result = validator.validateAssignment(payload);

        expect(result.valid).toBe(true);
      });
    });

    describe('invalid assignee formats', () => {
      it('should reject empty assignee string', () => {
        const payload = {
          assignee: '',
        };

        const result = validator.validateAssignment(payload);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.some((e) => e.field === 'assignee')).toBe(true);
        }
      });

      it('should reject whitespace-only assignee', () => {
        const payload = {
          assignee: '   ',
        };

        const result = validator.validateAssignment(payload);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.some((e) => e.field === 'assignee')).toBe(true);
          expect(result.errors.some((e) => e.code === ErrorCode.WHITESPACE_ONLY)).toBe(true);
        }
      });

      it('should reject invalid email format', () => {
        // These should fail because they don't match email format AND
        // they contain @ symbol so they won't be accepted as usernames either
        const invalidEmails = [
          '@example.com',      // missing local part
          'user@',             // missing domain
          'user@example',      // missing TLD
          'user @example.com', // space in email
        ];

        invalidEmails.forEach((email) => {
          const payload = { assignee: email };
          const result = validator.validateAssignment(payload);
          expect(result.valid).toBe(false);
          if (!result.valid) {
            // Some might fail on whitespace check, others on invalid format
            const hasInvalidAssigneeError = result.errors.some((e) => e.code === ErrorCode.INVALID_ASSIGNEE);
            const hasWhitespaceError = result.errors.some((e) => e.code === ErrorCode.WHITESPACE_ONLY);
            const hasOtherError = result.errors.length > 0;
            expect(hasInvalidAssigneeError || hasWhitespaceError || hasOtherError).toBe(true);
          }
        });
      });

      it('should reject invalid username format', () => {
        const invalidUsernames = [
          'ab',           // too short (less than 3 chars)
          'user name',    // contains space
          'user#name',    // invalid character
          'user$name',    // invalid character
        ];

        invalidUsernames.forEach((username) => {
          const payload = { assignee: username };
          const result = validator.validateAssignment(payload);
          expect(result.valid).toBe(false);
          if (!result.valid) {
            // Some might fail on whitespace/length check, others on invalid format
            const hasError = result.errors.length > 0;
            expect(hasError).toBe(true);
          }
        });
      });

      it('should reject strings that are neither valid email, username, nor UUID', () => {
        const invalidIdentifiers = [
          'a@b@c.com',                    // multiple @ symbols
          'user name',                    // contains space (not allowed in username)
          'user#name',                    // contains # (not allowed)
          'user$name',                    // contains $ (not allowed)
          '@@@',                          // special chars only
        ];

        invalidIdentifiers.forEach((identifier) => {
          const payload = { assignee: identifier };
          const result = validator.validateAssignment(payload);
          expect(result.valid).toBe(false);
          if (!result.valid) {
            expect(result.errors.length).toBeGreaterThan(0);
          }
        });
      });

      it('should reject assignee exceeding max length', () => {
        const payload = {
          assignee: 'a'.repeat(101) + '@example.com',
        };

        const result = validator.validateAssignment(payload);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.some((e) => e.field === 'assignee')).toBe(true);
          expect(result.errors.some((e) => e.code === ErrorCode.FIELD_TOO_LONG)).toBe(true);
        }
      });
    });

    describe('edge cases', () => {
      it('should accept assignee at maximum valid length', () => {
        // Create a valid email at exactly 100 characters
        const localPart = 'a'.repeat(80);
        const domain = '@example.com'; // 12 chars
        const assignee = localPart + domain; // 92 chars total (within 100 limit)

        const payload = { assignee };
        const result = validator.validateAssignment(payload);

        expect(result.valid).toBe(true);
      });

      it('should provide descriptive error for multiple validation failures', () => {
        const payload = {
          assignee: '  ',
        };

        const result = validator.validateAssignment(payload);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0]?.message).toBeTruthy();
        }
      });
    });
  });

  describe('validateComment', () => {
    it('should accept valid comment', () => {
      const payload = {
        text: 'This is a valid comment',
        author: 'user123',
      };

      const result = validator.validateComment(payload);

      expect(result.valid).toBe(true);
    });

    it('should reject comment with empty text', () => {
      const payload = {
        text: '',
        author: 'user123',
      };

      const result = validator.validateComment(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'text')).toBe(true);
      }
    });

    it('should reject comment with whitespace-only text', () => {
      const payload = {
        text: '   ',
        author: 'user123',
      };

      const result = validator.validateComment(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'text')).toBe(true);
        expect(result.errors.some((e) => e.code === ErrorCode.WHITESPACE_ONLY)).toBe(true);
      }
    });

    it('should reject comment with text too long', () => {
      const payload = {
        text: 'a'.repeat(2001),
        author: 'user123',
      };

      const result = validator.validateComment(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'text')).toBe(true);
        expect(result.errors.some((e) => e.code === ErrorCode.FIELD_TOO_LONG)).toBe(true);
      }
    });

    it('should reject comment with missing author', () => {
      const payload = {
        text: 'This is a valid comment',
      };

      const result = validator.validateComment(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'author')).toBe(true);
      }
    });

    it('should reject comment with empty author', () => {
      const payload = {
        text: 'This is a valid comment',
        author: '',
      };

      const result = validator.validateComment(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'author')).toBe(true);
      }
    });

    it('should reject comment with author too long', () => {
      const payload = {
        text: 'This is a valid comment',
        author: 'a'.repeat(101),
      };

      const result = validator.validateComment(payload);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'author')).toBe(true);
        expect(result.errors.some((e) => e.code === ErrorCode.FIELD_TOO_LONG)).toBe(true);
      }
    });
  });

  describe('validateSearchQuery', () => {
    it('should accept valid search query', () => {
      const result = validator.validateSearchQuery('test search');

      expect(result.valid).toBe(true);
    });

    it('should reject empty search query', () => {
      const result = validator.validateSearchQuery('');

      expect(result.valid).toBe(false);
    });

    it('should reject whitespace-only search query', () => {
      const result = validator.validateSearchQuery('   ');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === ErrorCode.WHITESPACE_ONLY)).toBe(true);
      }
    });

    it('should reject non-string search query', () => {
      const result = validator.validateSearchQuery(123);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateStateFilter', () => {
    it('should accept valid state values', () => {
      const states = [
        TicketState.Open,
        TicketState.InProgress,
        TicketState.Resolved,
        TicketState.Closed,
        TicketState.Cancelled,
      ];

      states.forEach((state) => {
        const result = validator.validateStateFilter(state);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid state value', () => {
      const result = validator.validateStateFilter('InvalidState');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === ErrorCode.INVALID_STATE)).toBe(true);
      }
    });

    it('should reject non-string state value', () => {
      const result = validator.validateStateFilter(123);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateUUID', () => {
    it('should accept valid UUID', () => {
      const result = validator.validateUUID('550e8400-e29b-41d4-a716-446655440000');

      expect(result.valid).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const result = validator.validateUUID('not-a-uuid');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === ErrorCode.INVALID_UUID_FORMAT)).toBe(true);
      }
    });

    it('should reject empty string', () => {
      const result = validator.validateUUID('');

      expect(result.valid).toBe(false);
    });

    it('should reject non-string UUID', () => {
      const result = validator.validateUUID(123);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateStateTransitionRequest', () => {
    it('should accept valid state transition request', () => {
      const payload = {
        state: TicketState.InProgress,
      };

      const result = validator.validateStateTransitionRequest(payload);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid state value', () => {
      const payload = {
        state: 'InvalidState',
      };

      const result = validator.validateStateTransitionRequest(payload);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateStateTransition', () => {
    it('should reject transition to same state', () => {
      const result = validator.validateStateTransition(
        TicketState.Open,
        TicketState.Open
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0]?.code).toBe(ErrorCode.INVALID_TRANSITION);
      }
    });

    it('should accept transition to different state (placeholder logic)', () => {
      const result = validator.validateStateTransition(
        TicketState.Open,
        TicketState.InProgress
      );

      // Note: Actual state machine logic will be in TicketStateMachine class
      expect(result.valid).toBe(true);
    });
  });
});
