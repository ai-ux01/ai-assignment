export type TicketStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Comment {
  id: string;
  ticket_id: string;
  text: string;
  author: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  state: TicketStatus; // Backend uses 'state' not 'status'
  priority: TicketPriority;
  category: string | null;
  reported_by?: string;
  reportedBy?: string; // Alternative field name
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  created_at?: string; // Alternative field name
  updated_at?: string; // Alternative field name
  resolvedAt?: string | null;
  resolved_at?: string | null;
  closedAt?: string | null;
  closed_at?: string | null;
  comments?: Comment[];
}

export interface CreateTicketInput {
  title: string;
  description: string;
  priority: TicketPriority;
  category?: string;
  reported_by: string;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  category?: string;
}

export interface AssignTicketInput {
  assignee: string;
}

export interface TransitionStateInput {
  status: TicketStatus;
}

export interface AddCommentInput {
  text: string;
  author: string;
}

export interface SearchParams {
  query?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
}
