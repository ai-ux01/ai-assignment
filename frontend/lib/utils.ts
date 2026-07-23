import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TicketStatus, TicketPriority } from '@/types/ticket';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeDate(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function getStatusColor(status: TicketStatus): string {
  const colors = {
    Open: 'bg-blue-100 text-blue-800 border-blue-200',
    InProgress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Resolved: 'bg-green-100 text-green-800 border-green-200',
    Closed: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return colors[status] || colors.Open;
}

export function getPriorityColor(priority: TicketPriority): string {
  const colors = {
    Low: 'bg-sky-100 text-sky-800 border-sky-200',
    Medium: 'bg-amber-100 text-amber-800 border-amber-200',
    High: 'bg-orange-100 text-orange-800 border-orange-200',
    Critical: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[priority] || colors.Medium;
}

export function formatStatus(status: TicketStatus): string {
  // Convert InProgress to "In Progress"
  if (status === 'InProgress') return 'In Progress';
  return status;
}
