-- Migration: 003_create_audit_log_table
-- Description: Create audit_log table for compliance and tracking
-- Author: System
-- Date: 2024-01-15

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  
  -- Audit Fields
  operation VARCHAR(50) NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'STATE_TRANSITION', 'ASSIGN', 'COMMENT')),
  user_id VARCHAR(100) NOT NULL,
  old_state VARCHAR(20),
  new_state VARCHAR(20),
  changes JSONB,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_ticket_id ON audit_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON audit_log(operation);

-- Comments
COMMENT ON TABLE audit_log IS 'Audit trail of all state-changing operations for compliance';
COMMENT ON COLUMN audit_log.id IS 'Unique audit entry identifier (UUID)';
COMMENT ON COLUMN audit_log.ticket_id IS 'Reference to affected ticket (cascade delete)';
COMMENT ON COLUMN audit_log.operation IS 'Operation type: CREATE, UPDATE, STATE_TRANSITION, ASSIGN, or COMMENT';
COMMENT ON COLUMN audit_log.user_id IS 'User who performed the operation';
COMMENT ON COLUMN audit_log.old_state IS 'Previous state (for STATE_TRANSITION operations)';
COMMENT ON COLUMN audit_log.new_state IS 'New state (for STATE_TRANSITION operations)';
COMMENT ON COLUMN audit_log.changes IS 'JSON object with field changes (for UPDATE operations)';
COMMENT ON COLUMN audit_log.created_at IS 'Audit entry timestamp (immutable, append-only)';
