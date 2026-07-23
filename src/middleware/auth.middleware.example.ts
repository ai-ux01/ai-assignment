/**
 * Authentication Middleware - Integration Example
 *
 * This file demonstrates how to integrate the authentication middleware
 * with Express routes and use the authenticated user context.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { authenticateRequest, addRequestId, AuthenticatedRequest } from './auth.middleware';

const app: Application = express();

// Parse JSON request bodies
app.use(express.json());

// ============================================================================
// PUBLIC ROUTES - No authentication required
// ============================================================================

/**
 * Health check endpoint - public, no authentication
 * Uses addRequestId to generate request ID for logging
 */
app.get('/health', addRequestId, (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    requestId: authReq.requestId,
  });
});

/**
 * API documentation endpoint - public
 */
app.get('/api/docs', addRequestId, (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'Support Ticket Management API',
    version: '1.0.0',
    documentation: 'https://api.example.com/docs',
  });
});

// ============================================================================
// PROTECTED ROUTES - Authentication required
// ============================================================================

/**
 * Apply authentication middleware to all /api/v1 routes
 * All routes under this path will require valid JWT token
 */
app.use('/api/v1', authenticateRequest);

/**
 * Example: List all tickets (protected)
 * User context is available via req.user
 */
app.get('/api/v1/tickets', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  console.log('Authenticated user:', authReq.user?.id);
  console.log('Request ID:', authReq.requestId);

  // Fetch tickets (implementation would go here)
  const tickets = [
    {
      id: 'ticket-1',
      title: 'Example Ticket',
      state: 'Open',
      assignee: authReq.user?.id,
    },
  ];

  res.status(200).json({
    tickets,
    count: tickets.length,
  });
});

/**
 * Example: Create ticket (protected)
 * User ID is automatically captured from JWT token for audit logging
 */
app.post('/api/v1/tickets', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  // Create ticket with user context
  const ticket = {
    id: 'ticket-123',
    title: req.body.title,
    description: req.body.description,
    priority: req.body.priority,
    state: 'Open',
    assignee: null,
    createdBy: authReq.user?.id, // Captured from JWT
    createdAt: new Date().toISOString(),
  };

  // Log audit trail
  console.log('Audit:', {
    requestId: authReq.requestId,
    userId: authReq.user?.id,
    operation: 'CREATE_TICKET',
    ticketId: ticket.id,
    timestamp: new Date().toISOString(),
  });

  res.status(201).json(ticket);
});

/**
 * Example: Update ticket state (protected)
 * Demonstrates audit logging for state transitions
 */
app.patch('/api/v1/tickets/:id/state', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const ticketId = req.params.id;
  const newState = req.body.state;

  // Log state transition for audit
  console.log('State Transition:', {
    requestId: authReq.requestId,
    userId: authReq.user?.id,
    userEmail: authReq.user?.email,
    operation: 'STATE_TRANSITION',
    ticketId: ticketId,
    oldState: 'Open',
    newState: newState,
    timestamp: new Date().toISOString(),
  });

  res.status(200).json({
    id: ticketId,
    state: newState,
    updatedBy: authReq.user?.id,
    updatedAt: new Date().toISOString(),
  });
});

/**
 * Example: Assign ticket (protected)
 * Demonstrates capturing assignee and assigner for audit trail
 */
app.patch('/api/v1/tickets/:id/assignee', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const ticketId = req.params.id;
  const assignee = req.body.assignee;

  // Log assignment for audit
  console.log('Ticket Assignment:', {
    requestId: authReq.requestId,
    assignedBy: authReq.user?.id, // Who performed the assignment
    assignedTo: assignee, // Who is assigned
    ticketId: ticketId,
    operation: 'ASSIGN_TICKET',
    timestamp: new Date().toISOString(),
  });

  res.status(200).json({
    id: ticketId,
    assignee: assignee,
    assignedBy: authReq.user?.id,
  });
});

/**
 * Example: Add comment (protected)
 * Author is automatically set from authenticated user
 */
app.post('/api/v1/tickets/:id/comments', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const ticketId = req.params.id;

  const comment = {
    id: 'comment-123',
    ticketId: ticketId,
    text: req.body.text,
    author: authReq.user?.id, // Auto-set from JWT token
    authorEmail: authReq.user?.email,
    createdAt: new Date().toISOString(),
  };

  // Log comment creation
  console.log('Comment Added:', {
    requestId: authReq.requestId,
    userId: authReq.user?.id,
    operation: 'ADD_COMMENT',
    ticketId: ticketId,
    commentId: comment.id,
  });

  res.status(201).json(comment);
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Global error handler
 * Catches any errors not handled by middleware
 */
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;

  console.error('Error:', {
    requestId: authReq.requestId,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: authReq.requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================================================
// TESTING HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a test JWT token for development/testing
 * WARNING: Only use for development! Do not use in production!
 */
export function generateTestToken(userId: string, email?: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: userId,
    email: email || `${userId}@example.com`,
    exp: Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
    iat: Math.floor(Date.now() / 1000),
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'test-signature-do-not-use-in-production';

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Example usage of test token generator
 */
export function exampleRequests() {
  const token = generateTestToken('user-123', 'john.doe@example.com');

  console.log('Example authenticated request:');
  console.log('---');
  console.log('curl -X GET http://localhost:3000/api/v1/tickets \\');
  console.log(`  -H "Authorization: Bearer ${token}" \\`);
  console.log('  -H "Content-Type: application/json"');
  console.log('---');

  console.log('\nExample create ticket request:');
  console.log('---');
  console.log('curl -X POST http://localhost:3000/api/v1/tickets \\');
  console.log(`  -H "Authorization: Bearer ${token}" \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"title":"Test Ticket","description":"Test","priority":"High"}\'');
  console.log('---');
}

// Export the app for testing
export default app;
