import Link from 'next/link';
import { Clock, User, AlertCircle } from 'lucide-react';
import type { Ticket } from '@/types/ticket';
import { formatRelativeDate, getStatusColor, getPriorityColor, formatStatus } from '@/lib/utils';

interface TicketCardProps {
  ticket: Ticket;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const reportedBy = ticket.reported_by || ticket.reportedBy || 'Unknown';
  const createdAt = ticket.created_at || ticket.createdAt;
  
  return (
    <Link href={`/tickets/${ticket.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all hover:border-purple-300 cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex-1 mr-4">
            {ticket.title}
          </h3>
          <div className="flex gap-2 flex-shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.state)}`}>
              {formatStatus(ticket.state)}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
              {ticket.priority.toUpperCase()}
            </span>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {ticket.description}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            <span className="font-mono text-xs">{ticket.id.substring(0, 8)}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>{reportedBy}</span>
          </div>
          {ticket.assignee && (
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>→ {ticket.assignee}</span>
            </div>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <Clock className="w-4 h-4" />
            <span>{formatRelativeDate(createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
