'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Clock, Tag, MessageSquare } from 'lucide-react';
import { ticketApi } from '@/lib/api';
import type { Ticket } from '@/types/ticket';
import { formatDate, getStatusColor, getPriorityColor, formatStatus } from '@/lib/utils';

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params); // Unwrap the params Promise
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [assignee, setAssignee] = useState('');

  useEffect(() => {
    loadTicket();
  }, [id]);

  const loadTicket = async () => {
    try {
      const data = await ticketApi.getTicket(id);
      setTicket(data);
    } catch (error) {
      console.error('Failed to load ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !commentText || !commentAuthor) return;

    try {
      await ticketApi.addComment(ticket.id, { text: commentText, author: commentAuthor });
      setCommentText('');
      loadTicket();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleAssign = async () => {
    if (!ticket || !assignee) return;

    try {
      await ticketApi.assignTicket(ticket.id, { assignee });
      setAssignee('');
      loadTicket();
    } catch (error) {
      console.error('Failed to assign ticket:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;

    try {
      await ticketApi.transitionState(ticket.id, { status: newStatus as any });
      loadTicket();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Check console for details.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <p className="text-gray-500">Loading ticket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Ticket not found</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{ticket.title}</h1>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(ticket.state)}`}>
                  {formatStatus(ticket.state)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority.toUpperCase()}
                </span>
                {ticket.category && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
                    {ticket.category}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ticket Info Grid */}
          <div className="grid grid-cols-2 gap-6 mb-8 p-6 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ticket ID</p>
              <p className="font-mono text-sm">{ticket.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Reporter</p>
              <p className="font-medium">{ticket.reported_by || ticket.reportedBy || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Assignee</p>
              <p className="font-medium">{ticket.assignee || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Created</p>
              <p className="text-sm">{formatDate(ticket.created_at || ticket.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Updated</p>
              <p className="text-sm">{formatDate(ticket.updated_at || ticket.updatedAt)}</p>
            </div>
            {(ticket.resolved_at || ticket.resolvedAt) && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Resolved</p>
                <p className="text-sm">{formatDate(ticket.resolved_at || ticket.resolvedAt)}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Actions */}
          <div className="mb-8 space-y-4">
            <h2 className="text-xl font-semibold">Actions</h2>
            
            <div className="flex gap-4">
              <select
                onChange={(e) => handleStatusChange(e.target.value)}
                value={ticket.state}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="Open">Open</option>
                <option value="InProgress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Assign to..."
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleAssign}
                  disabled={!assignee}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comments ({ticket.comments?.length || 0})
          </h2>

          {ticket.comments && ticket.comments.length > 0 && (
            <div className="space-y-4 mb-6">
              {ticket.comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-purple-500">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-purple-700">{comment.author}</span>
                    <span className="text-sm text-gray-500">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                required
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
              <textarea
                required
                rows={4}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Add a comment..."
                maxLength={2000}
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800"
            >
              Add Comment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
