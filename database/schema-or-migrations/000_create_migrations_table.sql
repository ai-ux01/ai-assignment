-- Migration: 000_create_migrations_table
-- Description: Create schema_migrations table to track applied migrations
-- Author: System
-- Date: 2024-01-15

-- Create schema_migrations table to track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64)
);

-- Create index for chronological ordering
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at);

-- Comments
COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations for version control';
COMMENT ON COLUMN schema_migrations.version IS 'Migration version identifier (e.g., 001, 002)';
COMMENT ON COLUMN schema_migrations.description IS 'Human-readable description of the migration';
COMMENT ON COLUMN schema_migrations.applied_at IS 'Timestamp when migration was applied';
COMMENT ON COLUMN schema_migrations.checksum IS 'SHA-256 checksum of migration file for integrity';
