'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import TicketCard from '@/components/TicketCard';
import CreateTicketDialog from '@/components/CreateTicketDialog';
import { ticketApi } from '@/lib/api';
import type { Ticket, TicketStatus, TicketPriority } from '@/types/ticket';

export default function HomePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await ticketApi.getAllTickets();
      // Ensure data is an array
      const ticketsArray = Array.isArray(data) ? data : [];
      setTickets(ticketsArray);
      setFilteredTickets(ticketsArray);
    } catch (error) {
      console.error('Failed to load tickets:', error);
      setTickets([]);
      setFilteredTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    let filtered = tickets;

    if (searchQuery) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((ticket) => ticket.state === statusFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter((ticket) => ticket.priority === priorityFilter);
    }

    setFilteredTickets(filtered);
  }, [searchQuery, statusFilter, priorityFilter, tickets]);

  const stats = {
    total: Array.isArray(tickets) ? tickets.length : 0,
    open: Array.isArray(tickets) ? tickets.filter((t) => t.state === 'Open').length : 0,
    in_progress: Array.isArray(tickets) ? tickets.filter((t) => t.state === 'InProgress').length : 0,
    resolved: Array.isArray(tickets) ? tickets.filter((t) => t.state === 'Resolved').length : 0,
    closed: Array.isArray(tickets) ? tickets.filter((t) => t.state === 'Closed').length : 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎫 Support Ticket Management
          </h1>
          <p className="text-gray-600">Track and manage support tickets efficiently</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <p className="text-gray-600 text-sm mb-1">Total Tickets</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 shadow-sm">
            <p className="text-blue-700 text-sm mb-1">Open</p>
            <p className="text-3xl font-bold text-blue-800">{stats.open}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6 shadow-sm">
            <p className="text-yellow-700 text-sm mb-1">In Progress</p>
            <p className="text-3xl font-bold text-yellow-800">{stats.in_progress}</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-6 shadow-sm">
            <p className="text-green-700 text-sm mb-1">Resolved</p>
            <p className="text-3xl font-bold text-green-800">{stats.resolved}</p>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 shadow-sm">
            <p className="text-gray-600 text-sm mb-1">Closed</p>
            <p className="text-3xl font-bold text-gray-700">{stats.closed}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="InProgress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | '')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 flex items-center gap-2 whitespace-nowrap shadow-sm"
            >
              <Plus className="w-5 h-5" />
              New Ticket
            </button>
          </div>
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No tickets found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>

      <CreateTicketDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadTickets}
      />
    </div>
  );
}
