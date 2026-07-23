/**
 * TicketService Usage Examples
 *
 * This file demonstrates how to use the TicketService for:
 * - Creating tickets
 * - Retrieving tickets with comments
 * - Listing all tickets
 */

import { ticketService } from './TicketService';
import { Priority } from '../models/ticket';

/**
 * Example 1: Create a new ticket
 */
async function createTicketExample() {
  console.log('Example 1: Creating a ticket...\n');

  const request = {
    title: 'Login page not working',
    description: 'Users are unable to log in to the system. The page returns a 500 error.',
    priority: Priority.Critical,
  };

  try {
    const ticket = await ticketService.createTicket(request);
    console.log('✓ Ticket created successfully!');
    console.log(`  ID: ${ticket.id}`);
    console.log(`  Title: ${ticket.title}`);
    console.log(`  Priority: ${ticket.priority}`);
    console.log(`  State: ${ticket.state}`);
    console.log(`  Assignee: ${ticket.assignee || 'Unassigned'}`);
    console.log(`  Created: ${ticket.createdAt}\n`);
    return ticket.id;
  } catch (error) {
    console.error('✗ Failed to create ticket:', error);
    throw error;
  }
}

/**
 * Example 2: Retrieve a ticket with comments
 */
async function getTicketExample(ticketId: string) {
  console.log('Example 2: Retrieving ticket with comments...\n');

  try {
    const ticket = await ticketService.getTicket(ticketId);
    console.log('✓ Ticket retrieved successfully!');
    console.log(`  ID: ${ticket.id}`);
    console.log(`  Title: ${ticket.title}`);
    console.log(`  Description: ${ticket.description}`);
    console.log(`  Priority: ${ticket.priority}`);
    console.log(`  State: ${ticket.state}`);
    console.log(`  Comments: ${ticket.comments.length}`);

    if (ticket.comments.length > 0) {
      console.log('\n  Comment Details:');
      ticket.comments.forEach((comment, index) => {
        console.log(`    ${index + 1}. ${comment.author}: ${comment.text}`);
        console.log(`       Created: ${comment.createdAt}`);
      });
    }
    console.log();
  } catch (error) {
    console.error('✗ Failed to retrieve ticket:', error);
    throw error;
  }
}

/**
 * Example 3: List all tickets
 */
async function listTicketsExample() {
  console.log('Example 3: Listing all tickets...\n');

  try {
    const tickets = await ticketService.listTickets();
    console.log(`✓ Retrieved ${tickets.length} tickets\n`);

    if (tickets.length > 0) {
      console.log('  Recent tickets:');
      tickets.slice(0, 5).forEach((ticket, index) => {
        console.log(`  ${index + 1}. [${ticket.state}] ${ticket.title}`);
        console.log(`     Priority: ${ticket.priority} | Assignee: ${ticket.assignee || 'Unassigned'}`);
        console.log(`     Created: ${ticket.createdAt}`);
      });

      if (tickets.length > 5) {
        console.log(`  ... and ${tickets.length - 5} more tickets`);
      }
    } else {
      console.log('  No tickets found.');
    }
    console.log();
  } catch (error) {
    console.error('✗ Failed to list tickets:', error);
    throw error;
  }
}

/**
 * Example 4: Handle validation errors
 */
async function validationErrorExample() {
  console.log('Example 4: Handling validation errors...\n');

  const invalidRequest = {
    title: '', // Empty title - should fail validation
    description: 'This ticket has an empty title',
    priority: Priority.Low,
  };

  try {
    await ticketService.createTicket(invalidRequest);
    console.log('✗ Unexpected: ticket should not have been created\n');
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      console.log('✓ Validation error caught as expected!');
      console.log(`  Message: ${error.message}`);
      console.log();
    } else {
      console.error('✗ Unexpected error type:', error);
      throw error;
    }
  }
}

/**
 * Example 5: Handle not found errors
 */
async function notFoundErrorExample() {
  console.log('Example 5: Handling not found errors...\n');

  const nonExistentId = '00000000-0000-0000-0000-000000000000';

  try {
    await ticketService.getTicket(nonExistentId);
    console.log('✗ Unexpected: ticket should not have been found\n');
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundError') {
      console.log('✓ Not found error caught as expected!');
      console.log(`  Message: ${error.message}`);
      console.log();
    } else {
      console.error('✗ Unexpected error type:', error);
      throw error;
    }
  }
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log('='.repeat(60));
  console.log('TicketService Usage Examples');
  console.log('='.repeat(60));
  console.log();

  try {
    // Example 1: Create a ticket
    const ticketId = await createTicketExample();

    // Example 2: Retrieve the ticket
    await getTicketExample(ticketId);

    // Example 3: List all tickets
    await listTicketsExample();

    // Example 4: Validation error
    await validationErrorExample();

    // Example 5: Not found error
    await notFoundErrorExample();

    console.log('='.repeat(60));
    console.log('All examples completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Examples failed:', error);
    process.exit(1);
  }
}

// Export for use in other files
export {
  createTicketExample,
  getTicketExample,
  listTicketsExample,
  validationErrorExample,
  notFoundErrorExample,
  runExamples,
};

// Run examples if executed directly
if (require.main === module) {
  runExamples()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
