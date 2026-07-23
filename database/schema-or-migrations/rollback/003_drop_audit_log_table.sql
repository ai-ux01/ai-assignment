-- Rollback: 003_create_audit_log_table
-- Description: Drop audit_log table and associated objects
-- Author: System
-- Date: 2024-01-15

-- Drop indexes
DROP INDEX IF EXISTS idx_audit_log_operation;
DROP INDEX IF EXISTS idx_audit_log_user_id;
DROP INDEX IF EXISTS idx_audit_log_created_at;
DROP INDEX IF EXISTS idx_audit_log_ticket_id;

-- Drop table
DROP TABLE IF EXISTS audit_log CASCADE;
