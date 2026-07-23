/**
 * Comment Domain Model
 * Defines the comment entity and related types
 */

/**
 * Comment entity associated with a ticket
 */
export interface Comment {
  id: string; // UUID
  ticketId: string; // UUID of parent ticket
  text: string; // 1-2000 characters
  author: string; // User identifier
  createdAt: Date; // ISO8601 timestamp
}

/**
 * Request payload for adding a comment
 */
export interface CreateCommentRequest {
  text: string;
  author: string;
}
