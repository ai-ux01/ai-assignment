/**
 * Input Sanitizer Demo
 *
 * This example demonstrates how to use the InputSanitizer utility class
 * to prevent security vulnerabilities like SQL injection, XSS attacks,
 * and path traversal attacks.
 */

import { InputSanitizer } from '../src/utils/inputSanitizer';

// Create an instance of the sanitizer
const sanitizer = new InputSanitizer();

console.log('=== Input Sanitizer Demo ===\n');

// Example 1: Sanitizing text input
console.log('1. Text Sanitization:');
console.log('-------------------');

const userInput1 = '  Hello\0World with null bytes  ';
const sanitized1 = sanitizer.sanitizeText(userInput1);
console.log('Input:', JSON.stringify(userInput1));
console.log('Sanitized:', JSON.stringify(sanitized1));
console.log('Result: Trimmed whitespace and removed null bytes\n');

const userInput2 = 'a'.repeat(6000);
const sanitized2 = sanitizer.sanitizeText(userInput2);
console.log('Input: 6000 character string');
console.log('Sanitized length:', sanitized2.length);
console.log('Result: Limited to 5000 characters\n');

// Example 2: UUID Validation
console.log('2. UUID Validation:');
console.log('------------------');

const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const invalidUUID = '../../etc/passwd';
const malformedUUID = 'not-a-valid-uuid';

console.log('Valid UUID:', validUUID, '→', sanitizer.isValidUUID(validUUID));
console.log('Path traversal:', invalidUUID, '→', sanitizer.isValidUUID(invalidUUID));
console.log('Malformed UUID:', malformedUUID, '→', sanitizer.isValidUUID(malformedUUID));
console.log('Result: Only valid UUID format accepted\n');

// Example 3: Search Query Sanitization
console.log('3. Search Query Sanitization:');
console.log('-----------------------------');

const searchQuery1 = '  test.*query  ';
const sanitized3 = sanitizer.sanitizeSearchQuery(searchQuery1);
console.log('Input:', JSON.stringify(searchQuery1));
console.log('Sanitized:', JSON.stringify(sanitized3));
console.log('Result: Trimmed and escaped regex special characters\n');

const maliciousQuery = '.*|DROP TABLE tickets;|.*';
const sanitized4 = sanitizer.sanitizeSearchQuery(maliciousQuery);
console.log('Malicious input:', JSON.stringify(maliciousQuery));
console.log('Sanitized:', JSON.stringify(sanitized4));
console.log('Result: Regex injection prevented by escaping special characters\n');

// Example 4: Real-world usage scenario
console.log('4. Real-world Usage Scenario:');
console.log('----------------------------');

// Simulating user input from a ticket creation form
const ticketTitle = '  Customer Issue: Error (500)  ';
const ticketDescription = '  The server\0returned an error message\nwith multiple lines  ';
const ticketId = '550e8400-e29b-41d4-a716-446655440000';
const searchTerm = 'error.*500';

console.log('Processing ticket creation...');
const sanitizedTitle = sanitizer.sanitizeText(ticketTitle);
const sanitizedDescription = sanitizer.sanitizeText(ticketDescription);

console.log('Original title:', JSON.stringify(ticketTitle));
console.log('Sanitized title:', JSON.stringify(sanitizedTitle));
console.log('Original description:', JSON.stringify(ticketDescription));
console.log('Sanitized description:', JSON.stringify(sanitizedDescription));
console.log('');

console.log('Validating ticket ID...');
if (sanitizer.isValidUUID(ticketId)) {
  console.log('✓ Ticket ID is valid:', ticketId);
} else {
  console.log('✗ Ticket ID is invalid:', ticketId);
}
console.log('');

console.log('Processing search query...');
const sanitizedSearch = sanitizer.sanitizeSearchQuery(searchTerm);
console.log('Original search:', JSON.stringify(searchTerm));
console.log('Sanitized search:', JSON.stringify(sanitizedSearch));
console.log('Result: Safe to use in database queries\n');

console.log('=== Demo Complete ===');
console.log('\nKey Security Features:');
console.log('• Prevents null byte injection');
console.log('• Prevents path traversal attacks');
console.log('• Prevents regex injection in searches');
console.log('• Limits input length to prevent DoS');
console.log('• Validates UUID format strictly');
