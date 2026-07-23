-- Rollback: 001_create_tickets_table
-- Description: Drop tickets table and associated objects
-- Author: System
-- Date: 2024-01-15

-- Drop trigger
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes (will be dropped automatically with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_tickets_search;
DROP INDEX IF EXISTS idx_tickets_created_at;
DROP INDEX IF EXISTS idx_tickets_assignee;
DROP INDEX IF EXISTS idx_tickets_state;

-- Drop table (CASCADE will drop foreign key constraints from other tables)
DROP TABLE IF EXISTS tickets CASCADE;
