/**
 * Ticket Creation Validation Demo
 * Demonstrates the ticket creation validation functionality
 */

import { validator } from '../src/utils/validator';
import { Priority } from '../src/models';

console.log('='.repeat(80));
console.log('TICKET CREATION VALIDATION DEMO');
console.log('='.repeat(80));
console.log();

// Example 1: Valid ticket creation
console.log('Example 1: Valid Ticket Creation');
console.log('-'.repeat(80));
const validTicket = {
  title: 'User Login Issue - Password Reset Not Working',
  description:
    'Users are reporting that after requesting a password reset, they do not receive the email. ' +
    'This issue started after the deployment on 2024-01-15. ' +
    'Steps to reproduce: 1. Go to login page 2. Click "Forgot Password" 3. Enter email address 4. Click submit. ' +
    'Expected: Password reset email should arrive within 5 minutes. ' +
    'Actual: No email is received.',
  priority: Priority.High,
};
console.log('Payload:', JSON.stringify(validTicket, null, 2));
const result1 = validator.validateTicketCreation(validTicket);
console.log('Validation Result:', JSON.stringify(result1, null, 2));
console.log();

// Example 2: Missing required fields
console.log('Example 2: Missing Required Fields');
console.log('-'.repeat(80));
const missingFields = {
  title: 'Bug Report',
  // Missing description and priority
};
console.log('Payload:', JSON.stringify(missingFields, null, 2));
const result2 = validator.validateTicketCreation(missingFields);
console.log('Validation Result:', JSON.stringify(result2, null, 2));
console.log();

// Example 3: Title too long
console.log('Example 3: Title Too Long (>200 characters)');
console.log('-'.repeat(80));
const longTitle = {
  title: 'a'.repeat(201),
  description: 'This is a valid description',
  priority: Priority.Medium,
};
console.log('Payload title length:', longTitle.title.length);
console.log('Payload:', { ...longTitle, title: longTitle.title.substring(0, 50) + '...' });
const result3 = validator.validateTicketCreation(longTitle);
console.log('Validation Result:', JSON.stringify(result3, null, 2));
console.log();

// Example 4: Whitespace-only description
console.log('Example 4: Whitespace-Only Description');
console.log('-'.repeat(80));
const whitespaceDesc = {
  title: 'Valid Title',
  description: '   \t\n   ',
  priority: Priority.Low,
};
console.log('Payload:', JSON.stringify(whitespaceDesc, null, 2));
const result4 = validator.validateTicketCreation(whitespaceDesc);
console.log('Validation Result:', JSON.stringify(result4, null, 2));
console.log();

// Example 5: Invalid priority value
console.log('Example 5: Invalid Priority Value');
console.log('-'.repeat(80));
const invalidPriority = {
  title: 'Bug Report',
  description: 'Application crashes on startup',
  priority: 'Urgent', // Invalid - not a valid Priority enum value
};
console.log('Payload:', JSON.stringify(invalidPriority, null, 2));
const result5 = validator.validateTicketCreation(invalidPriority);
console.log('Validation Result:', JSON.stringify(result5, null, 2));
console.log();

// Example 6: Multiple validation errors
console.log('Example 6: Multiple Validation Errors');
console.log('-'.repeat(80));
const multipleErrors = {
  title: '',
  description: '  ',
  priority: 'InvalidPriority',
};
console.log('Payload:', JSON.stringify(multipleErrors, null, 2));
const result6 = validator.validateTicketCreation(multipleErrors);
console.log('Validation Result:', JSON.stringify(result6, null, 2));
console.log();

// Example 7: Edge case - Exactly 200 character title
console.log('Example 7: Boundary Test - Title Exactly 200 Characters');
console.log('-'.repeat(80));
const boundary200 = {
  title: 'a'.repeat(200),
  description: 'This ticket has a title that is exactly 200 characters long',
  priority: Priority.Critical,
};
console.log('Payload title length:', boundary200.title.length);
console.log(
  'Payload:',
  JSON.stringify({ ...boundary200, title: boundary200.title.substring(0, 50) + '...' }, null, 2)
);
const result7 = validator.validateTicketCreation(boundary200);
console.log('Validation Result:', JSON.stringify(result7, null, 2));
console.log();

// Example 8: Edge case - Exactly 5000 character description
console.log('Example 8: Boundary Test - Description Exactly 5000 Characters');
console.log('-'.repeat(80));
const boundary5000 = {
  title: 'Performance Issue',
  description: 'a'.repeat(5000),
  priority: Priority.High,
};
console.log('Payload description length:', boundary5000.description.length);
console.log(
  'Payload:',
  JSON.stringify(
    { ...boundary5000, description: boundary5000.description.substring(0, 50) + '...' },
    null,
    2
  )
);
const result8 = validator.validateTicketCreation(boundary5000);
console.log('Validation Result:', JSON.stringify(result8, null, 2));
console.log();

// Example 9: All valid priority values
console.log('Example 9: All Valid Priority Values');
console.log('-'.repeat(80));
const priorities = [Priority.Low, Priority.Medium, Priority.High, Priority.Critical];
priorities.forEach((priority) => {
  const ticket = {
    title: `Ticket with ${priority} priority`,
    description: `This ticket demonstrates the ${priority} priority level`,
    priority: priority,
  };
  const result = validator.validateTicketCreation(ticket);
  console.log(`Priority ${priority}: ${result.valid ? '✅ Valid' : '❌ Invalid'}`);
});
console.log();

console.log('='.repeat(80));
console.log('DEMO COMPLETE');
console.log('='.repeat(80));
