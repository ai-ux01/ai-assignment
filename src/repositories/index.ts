/**
 * Repositories Module Exports
 * 
 * Central export point for all repository-related modules
 */

export { database, Database, Transaction } from './database';
export { repository, BaseRepository } from './BaseRepository';
export { ticketRepository, TicketRepository } from './TicketRepository';
export { commentRepository, CommentRepository } from './CommentRepository';
export { auditLogRepository, AuditLogRepository } from './AuditLogRepository';
export {
  DataStore,
  Ticket,
  Comment,
  AuditLogEntry,
  CreateTicketInput,
  UpdateTicketInput,
  CreateCommentInput,
} from './DataStore.interface';
