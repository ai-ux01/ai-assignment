-- Database Schema Verification Script
-- Run this after migrations to verify schema is correctly set up

\echo '========================================='
\echo 'Database Schema Verification'
\echo '========================================='
\echo ''

-- Check PostgreSQL version
\echo 'PostgreSQL Version:'
SELECT version();
\echo ''

-- List all tables
\echo '========================================='
\echo 'Tables in Database:'
\echo '========================================='
\dt
\echo ''

-- Describe tickets table
\echo '========================================='
\echo 'Tickets Table Structure:'
\echo '========================================='
\d tickets
\echo ''

-- Describe comments table
\echo '========================================='
\echo 'Comments Table Structure:'
\echo '========================================='
\d comments
\echo ''

-- Describe audit_log table
\echo '========================================='
\echo 'Audit Log Table Structure:'
\echo '========================================='
\d audit_log
\echo ''

-- List all indexes
\echo '========================================='
\echo 'All Indexes:'
\echo '========================================='
\di
\echo ''

-- Check foreign key constraints
\echo '========================================='
\echo 'Foreign Key Constraints:'
\echo '========================================='
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
\echo ''

-- Check CHECK constraints
\echo '========================================='
\echo 'CHECK Constraints:'
\echo '========================================='
SELECT
    tc.table_name,
    cc.check_clause
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;
\echo ''

-- Check table sizes
\echo '========================================='
\echo 'Table Sizes:'
\echo '========================================='
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
\echo ''

-- Check index usage statistics
\echo '========================================='
\echo 'Index Statistics:'
\echo '========================================='
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY schemaname, tablename, indexname;
\echo ''

-- Check row counts
\echo '========================================='
\echo 'Row Counts:'
\echo '========================================='
SELECT 'tickets' AS table_name, COUNT(*) AS row_count FROM tickets
UNION ALL
SELECT 'comments' AS table_name, COUNT(*) AS row_count FROM comments
UNION ALL
SELECT 'audit_log' AS table_name, COUNT(*) AS row_count FROM audit_log
UNION ALL
SELECT 'schema_migrations' AS table_name, COUNT(*) AS row_count FROM schema_migrations;
\echo ''

-- Check applied migrations
\echo '========================================='
\echo 'Applied Migrations:'
\echo '========================================='
SELECT version, description, applied_at
FROM schema_migrations
ORDER BY version;
\echo ''

-- Verify full-text search setup
\echo '========================================='
\echo 'Full-Text Search Configuration:'
\echo '========================================='
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname = 'idx_tickets_search';
\echo ''

-- Test queries
\echo '========================================='
\echo 'Test Queries:'
\echo '========================================='

\echo 'Tickets by State:'
SELECT state, COUNT(*) AS count
FROM tickets
GROUP BY state
ORDER BY state;
\echo ''

\echo 'Tickets by Priority:'
SELECT priority, COUNT(*) AS count
FROM tickets
GROUP BY priority
ORDER BY CASE priority
    WHEN 'Critical' THEN 1
    WHEN 'High' THEN 2
    WHEN 'Medium' THEN 3
    WHEN 'Low' THEN 4
END;
\echo ''

\echo 'Tickets with Comment Counts:'
SELECT
    t.id,
    t.title,
    t.state,
    COUNT(c.id) AS comment_count
FROM tickets t
LEFT JOIN comments c ON t.id = c.ticket_id
GROUP BY t.id, t.title, t.state
ORDER BY comment_count DESC
LIMIT 10;
\echo ''

\echo '========================================='
\echo 'Schema Verification Complete!'
\echo '========================================='
