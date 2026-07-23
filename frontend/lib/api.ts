import type {
  Ticket,
  CreateTicketInput,
  UpdateTicketInput,
  AssignTicketInput,
  TransitionStateInput,
  AddCommentInput,
  SearchParams,
} from '@/types/ticket';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || 'Request failed');
  }

  return response.json();
}

export const ticketApi = {
  // Get all tickets
  getAllTickets: async () => {
    const response = await fetchApi<{ tickets: Ticket[]; count: number }>('/tickets');
    return response.tickets;
  },

  // Get single ticket
  getTicket: (id: string) => fetchApi<Ticket>(`/tickets/${id}`),

  // Create ticket
  createTicket: (data: CreateTicketInput) =>
    fetchApi<Ticket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update ticket
  updateTicket: (id: string, data: UpdateTicketInput) =>
    fetchApi<Ticket>(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Assign ticket
  assignTicket: (id: string, data: AssignTicketInput) =>
    fetchApi<Ticket>(`/tickets/${id}/assignee`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Transition state
  transitionState: (id: string, data: TransitionStateInput) =>
    fetchApi<Ticket>(`/tickets/${id}/state`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Add comment
  addComment: (id: string, data: AddCommentInput) =>
    fetchApi<Ticket>(`/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Search tickets
  searchTickets: (params: SearchParams) => {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.append('q', params.query);
    if (params.status) queryParams.append('status', params.status);
    if (params.priority) queryParams.append('priority', params.priority);
    
    return fetchApi<Ticket[]>(`/tickets/search?${queryParams.toString()}`);
  },

  // Filter by status
  filterByStatus: (status: string) =>
    fetchApi<Ticket[]>(`/tickets/filter?status=${status}`),
};

export { ApiError };
