-- Migration: 002_create_comments_table
-- Description: Create comments table with foreign key relationships to tickets
-- Author: System
-- Date: 2024-01-15

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  
  -- Core Fields
  text TEXT NOT NULL,
  author VARCHAR(100) NOT NULL,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT text_not_empty CHECK (LENGTH(TRIM(text)) > 0),
  CONSTRAINT text_length CHECK (LENGTH(text) <= 2000)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(ticket_id, created_at);

-- Comments
COMMENT ON TABLE comments IS 'Collaborative comments associated with tickets';
COMMENT ON COLUMN comments.id IS 'Unique comment identifier (UUID), auto-generated';
COMMENT ON COLUMN comments.ticket_id IS 'Reference to parent ticket (cascade delete)';
COMMENT ON COLUMN comments.text IS 'Comment content (1-2000 characters, immutable)';
COMMENT ON COLUMN comments.author IS 'User ID of comment author';
COMMENT ON COLUMN comments.created_at IS 'Comment creation timestamp (immutable)';
