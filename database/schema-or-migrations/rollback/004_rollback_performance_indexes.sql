-- Rollback Migration: 004_rollback_performance_indexes
-- Description: Remove performance indexes added in migration 004
-- Author: System
-- Date: 2024-01-15

-- Drop performance indexes
DROP INDEX IF EXISTS idx_tickets_priority;
DROP INDEX IF EXISTS idx_tickets_state_created_at;
DROP INDEX IF EXISTS idx_tickets_assignee_created_at;
DROP INDEX IF EXISTS idx_tickets_updated_at;
