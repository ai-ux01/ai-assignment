-- Migration: 001_create_tickets_table
-- Description: Create tickets table with all fields, constraints, and indexes
-- Author: System
-- Date: 2024-01-15

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Fields
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  state VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (state IN ('Open', 'In_Progress', 'Resolved', 'Closed', 'Cancelled')),
  assignee VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
  CONSTRAINT description_not_empty CHECK (LENGTH(TRIM(description)) > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_state ON tickets(state);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee) WHERE assignee IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);

-- Create full-text search index for keyword search
-- This uses PostgreSQL's GIN index with tsvector for efficient text search
CREATE INDEX IF NOT EXISTS idx_tickets_search ON tickets USING GIN(to_tsvector('english', title || ' ' || description));

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE tickets IS 'Core ticket entity storing all ticket information and state';
COMMENT ON COLUMN tickets.id IS 'Unique ticket identifier (UUID), auto-generated';
COMMENT ON COLUMN tickets.title IS 'Short ticket title (1-200 characters)';
COMMENT ON COLUMN tickets.description IS 'Detailed ticket description (1-5000 characters)';
COMMENT ON COLUMN tickets.priority IS 'Ticket priority: Low, Medium, High, or Critical';
COMMENT ON COLUMN tickets.state IS 'Current lifecycle state: Open, In_Progress, Resolved, Closed, or Cancelled';
COMMENT ON COLUMN tickets.assignee IS 'User ID of assigned team member (nullable for unassigned)';
COMMENT ON COLUMN tickets.created_at IS 'Ticket creation timestamp (immutable)';
COMMENT ON COLUMN tickets.updated_at IS 'Last update timestamp (auto-updated)';
