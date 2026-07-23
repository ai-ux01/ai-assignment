# Input Sanitizer Utility

## Overview

The `InputSanitizer` class provides essential security utilities for sanitizing and validating user input to prevent common security vulnerabilities including:

- **SQL Injection** - Parameterized queries combined with input validation
- **XSS (Cross-Site Scripting)** - Input sanitization and output encoding
- **Path Traversal** - UUID validation to prevent filesystem attacks
- **Regex Injection** - Escape special characters in search queries
- **DoS (Denial of Service)** - Length limits on input fields

## Installation

```typescript
import { InputSanitizer } from './utils/inputSanitizer';

// Create an instance
const sanitizer = new InputSanitizer();

// Or use the singleton instance
import { inputSanitizer } from './utils/inputSanitizer';
```

## API Reference

### `sanitizeText(input: string): string`

Sanitizes general text input by:
- Trimming leading and trailing whitespace
- Removing null bytes (`\0`) that can cause security issues
- Limiting length to 5000 characters to prevent DoS attacks

**Usage:**
```typescript
const userInput = '  Hello\0World  ';
const sanitized = sanitizer.sanitizeText(userInput);
// Result: "HelloWorld"
```

**Security Features:**
- Removes null byte injection attempts
- Prevents buffer overflow with length limits
- Normalizes whitespace for consistent processing

**When to Use:**
- Ticket titles and descriptions
- Comment text
- Any user-provided text content

---

### `isValidUUID(id: string): boolean`

Validates whether a string matches the UUID v4 format to prevent path traversal and injection attacks.

**UUID Format:**
```
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```
Where `x` is a hexadecimal digit (0-9, a-f, A-F)

**Usage:**
```typescript
const validId = '550e8400-e29b-41d4-a716-446655440000';
const isValid = sanitizer.isValidUUID(validId);
// Result: true

const pathTraversal = '../../etc/passwd';
const isValid2 = sanitizer.isValidUUID(pathTraversal);
// Result: false
```

**Security Features:**
- Strict format validation prevents path traversal
- Rejects malformed IDs that could exploit system vulnerabilities
- Case-insensitive matching for flexibility

**When to Use:**
- Validating ticket IDs before database queries
- Validating comment IDs
- Any user-provided ID parameter in API requests

---

### `sanitizeSearchQuery(query: string): string`

Sanitizes search queries by escaping special regex characters and limiting length.

**Special Characters Escaped:**
`. * + ? ^ $ { } ( ) | [ ] \`

**Usage:**
```typescript
const searchQuery = 'test.*query';
const sanitized = sanitizer.sanitizeSearchQuery(searchQuery);
// Result: "test\\.\\*query"

// Prevents regex injection
const malicious = '.*|DROP TABLE tickets;|.*';
const sanitized2 = sanitizer.sanitizeSearchQuery(malicious);
// Result: "\\.\\*\\|DROP TABLE tickets;\\|\\.\\*"
```

**Security Features:**
- Escapes regex metacharacters to prevent injection
- Limits query to 200 characters
- Trims whitespace for consistent processing

**When to Use:**
- Search queries against ticket titles/descriptions
- Any user-provided search or filter parameters
- Text-based filtering operations

## Usage Examples

### Example 1: Ticket Creation

```typescript
import { InputSanitizer } from './utils/inputSanitizer';

const sanitizer = new InputSanitizer();

// Sanitize user input before saving to database
const ticket = {
  title: sanitizer.sanitizeText(req.body.title),
  description: sanitizer.sanitizeText(req.body.description),
  priority: req.body.priority, // Validated separately
};

// Save to database with parameterized query
await ticketRepository.insertTicket(ticket);
```

### Example 2: Ticket Retrieval by ID

```typescript
import { InputSanitizer } from './utils/inputSanitizer';

const sanitizer = new InputSanitizer();

// Validate UUID before database query
const ticketId = req.params.id;

if (!sanitizer.isValidUUID(ticketId)) {
  throw new ValidationError('Invalid ticket ID format');
}

// Safe to query database
const ticket = await ticketRepository.findTicketById(ticketId);
```

### Example 3: Search Operation

```typescript
import { InputSanitizer } from './utils/inputSanitizer';

const sanitizer = new InputSanitizer();

// Sanitize search query before database operation
const searchQuery = req.query.q as string;

if (!searchQuery || searchQuery.trim() === '') {
  throw new ValidationError('Search query cannot be empty');
}

const sanitizedQuery = sanitizer.sanitizeSearchQuery(searchQuery);

// Use sanitized query in database search
const results = await ticketRepository.searchTickets(sanitizedQuery);
```

### Example 4: Comment Creation

```typescript
import { InputSanitizer } from './utils/inputSanitizer';

const sanitizer = new InputSanitizer();

// Validate ticket ID and sanitize comment text
const ticketId = req.params.id;
const commentText = req.body.text;

if (!sanitizer.isValidUUID(ticketId)) {
  throw new ValidationError('Invalid ticket ID format');
}

const comment = {
  ticketId,
  text: sanitizer.sanitizeText(commentText),
  author: req.user.id,
};

await commentRepository.insertComment(comment);
```

## Security Best Practices

### Defense in Depth

Input sanitization is **one layer** of a comprehensive security strategy:

1. **Input Sanitization** (this utility) - Clean and validate user input
2. **Parameterized Queries** - Use prepared statements for database operations
3. **Output Encoding** - HTML-encode data when rendering in UI (frontend)
4. **Access Control** - Authenticate and authorize all requests
5. **Audit Logging** - Log all state-changing operations

### When to Use Each Method

| Method | Use Case | Example |
|--------|----------|---------|
| `sanitizeText()` | Free-form text fields | Ticket titles, descriptions, comments |
| `isValidUUID()` | ID parameters in URLs/requests | Ticket IDs, comment IDs |
| `sanitizeSearchQuery()` | Search/filter operations | Keyword search, text filtering |

### Important Notes

1. **Always validate after sanitization**: Sanitization removes dangerous patterns, but validation ensures the input meets business rules (length, format, etc.)

2. **Use parameterized queries**: Even with sanitized input, always use parameterized queries or an ORM to prevent SQL injection

3. **Don't rely solely on client-side validation**: Client-side validation can be bypassed. Always validate and sanitize on the backend.

4. **Consider output encoding**: When displaying user content in HTML, use appropriate output encoding to prevent XSS attacks

5. **Log security events**: Log rejected inputs or suspicious patterns for security monitoring

## Testing

The InputSanitizer includes comprehensive unit tests covering:

- Text sanitization (whitespace, null bytes, length limits)
- UUID validation (valid formats, invalid formats, path traversal)
- Search query sanitization (regex escaping, length limits)
- Edge cases (empty strings, unicode, special characters)

Run tests with:
```bash
npm test -- inputSanitizer.test.ts
```

## Performance Considerations

All sanitization methods are designed for minimal performance impact:

- **O(n)** time complexity for text operations
- **O(1)** time complexity for UUID validation (regex match)
- In-place string operations where possible
- No external dependencies

## Related Documentation

- [Validator Utility](./validator.ts) - Business rule validation
- [Error Handler](./errorHandler.ts) - Error response formatting
- [Security Design](../../.kiro/specs/support-ticket-management-system/design.md#security-design) - Overall security architecture

## Change Log

### Version 1.0.0 (Initial Release)
- Implemented `sanitizeText()` method
- Implemented `isValidUUID()` method
- Implemented `sanitizeSearchQuery()` method
- Added comprehensive unit tests
- Created singleton instance for convenience
