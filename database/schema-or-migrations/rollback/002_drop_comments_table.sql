-- Rollback: 002_create_comments_table
-- Description: Drop comments table and associated objects
-- Author: System
-- Date: 2024-01-15

-- Drop indexes
DROP INDEX IF EXISTS idx_comments_created_at;
DROP INDEX IF EXISTS idx_comments_ticket_id;

-- Drop table
DROP TABLE IF EXISTS comments CASCADE;
