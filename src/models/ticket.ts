/**
 * Ticket Domain Model
 * Defines the core ticket entity and related types
 */

/**
 * Priority levels for tickets
 */
export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

/**
 * Ticket lifecycle states
 */
export enum TicketState {
  Open = 'Open',
  InProgress = 'In_Progress',
  Resolved = 'Resolved',
  Closed = 'Closed',
  Cancelled = 'Cancelled',
}

/**
 * Core Ticket entity
 */
export interface Ticket {
  id: string; // UUID
  title: string; // 1-200 characters
  description: string; // 1-5000 characters
  priority: Priority;
  state: TicketState;
  assignee: string | null; // User identifier or null
  createdAt: Date; // ISO8601 timestamp
  updatedAt: Date; // ISO8601 timestamp
}

/**
 * Request payload for creating a new ticket
 */
export interface CreateTicketRequest {
  title: string;
  description: string;
  priority: Priority;
}

/**
 * Request payload for updating an existing ticket
 */
export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  priority?: Priority;
}

/**
 * Partial updates allowed for tickets (excludes immutable fields)
 */
export interface TicketUpdates {
  title?: string;
  description?: string;
  priority?: Priority;
}

/**
 * Request payload for assigning a ticket
 */
export interface AssignTicketRequest {
  assignee: string | null;
}

/**
 * Request payload for transitioning ticket state
 */
export interface StateTransitionRequest {
  state: TicketState;
}
