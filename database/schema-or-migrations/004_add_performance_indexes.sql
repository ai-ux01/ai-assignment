-- Migration: 004_add_performance_indexes
-- Description: Add additional performance indexes for optimization
-- Author: System
-- Date: 2024-01-15

-- Add priority index for filtering/sorting by priority
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);

-- Add composite index for common query patterns (state + created_at)
-- This helps queries that filter by state and sort by created_at
CREATE INDEX IF NOT EXISTS idx_tickets_state_created_at ON tickets(state, created_at DESC);

-- Add composite index for assignee queries with created_at ordering
-- Useful for "my tickets" queries sorted by creation date
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_created_at ON tickets(assignee, created_at DESC) WHERE assignee IS NOT NULL;

-- Add index on updated_at for sorting by last modification
CREATE INDEX IF NOT EXISTS idx_tickets_updated_at ON tickets(updated_at DESC);

-- Comments
COMMENT ON INDEX idx_tickets_priority IS 'Index for filtering and sorting tickets by priority';
COMMENT ON INDEX idx_tickets_state_created_at IS 'Composite index for state filtering with creation date sorting';
COMMENT ON INDEX idx_tickets_assignee_created_at IS 'Composite index for assignee filtering with creation date sorting';
COMMENT ON INDEX idx_tickets_updated_at IS 'Index for sorting tickets by last update time';
