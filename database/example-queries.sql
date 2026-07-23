-- Example SQL Queries for Support Ticket Management System
-- Demonstrates common database operations and patterns

-- ============================================
-- 1. TICKET CREATION
-- ============================================

-- Create a new ticket with default state (Open)
INSERT INTO tickets (title, description, priority, assignee)
VALUES (
    'API endpoint returning 500 errors',
    'The /api/v1/users endpoint is returning 500 Internal Server Error for all requests. Started happening after last deployment.',
    'Critical',
    NULL  -- Initially unassigned
)
RETURNING *;

-- Create a ticket assigned to a specific user
INSERT INTO tickets (title, description, priority, assignee)
VALUES (
    'Update user profile page layout',
    'Redesign user profile page to match new brand guidelines. Update colors, fonts, and spacing.',
    'Low',
    'alice@company.com'
)
RETURNING id, title, state, assignee;


-- ============================================
-- 2. RETRIEVING TICKETS
-- ============================================

-- Get all tickets
SELECT id, title, state, priority, assignee, created_at
FROM tickets
ORDER BY created_at DESC;

-- Get a specific ticket with all details
SELECT *
FROM tickets
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Get tickets by state
SELECT id, title, priority, assignee, created_at
FROM tickets
WHERE state = 'Open'
ORDER BY priority DESC, created_at ASC;

-- Get tickets assigned to a specific user
SELECT id, title, state, priority, created_at
FROM tickets
WHERE assignee = 'alice@company.com'
ORDER BY 
    CASE priority
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
    END,
    created_at ASC;

-- Get unassigned tickets
SELECT id, title, state, priority, created_at
FROM tickets
WHERE assignee IS NULL
ORDER BY priority DESC, created_at ASC;


-- ============================================
-- 3. UPDATING TICKETS
-- ============================================

-- Update ticket title and description
UPDATE tickets
SET 
    title = 'API /api/v1/users endpoint returning 500 errors',
    description = 'The /api/v1/users endpoint is returning 500 Internal Server Error for all requests. Started after deployment v2.3.1. Error logs show database connection timeout.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = '11111111-1111-1111-1111-111111111111'
RETURNING *;

-- Update ticket priority
UPDATE tickets
SET priority = 'High', updated_at = CURRENT_TIMESTAMP
WHERE id = '77777777-7777-7777-7777-777777777777'
RETURNING id, title, priority;

-- Assign ticket to a user
UPDATE tickets
SET assignee = 'bob@company.com', updated_at = CURRENT_TIMESTAMP
WHERE id = '11111111-1111-1111-1111-111111111111'
RETURNING id, title, assignee;

-- Unassign ticket
UPDATE tickets
SET assignee = NULL, updated_at = CURRENT_TIMESTAMP
WHERE id = '77777777-7777-7777-7777-777777777777'
RETURNING id, title, assignee;


-- ============================================
-- 4. STATE TRANSITIONS
-- ============================================

-- Transition from Open to In_Progress
UPDATE tickets
SET state = 'In_Progress', updated_at = CURRENT_TIMESTAMP
WHERE id = '11111111-1111-1111-1111-111111111111'
    AND state = 'Open'  -- Verify current state
RETURNING id, title, state;

-- Transition from In_Progress to Resolved
UPDATE tickets
SET state = 'Resolved', updated_at = CURRENT_TIMESTAMP
WHERE id = '22222222-2222-2222-2222-222222222222'
    AND state = 'In_Progress'
RETURNING id, title, state;

-- Transition from Resolved to Closed
UPDATE tickets
SET state = 'Closed', updated_at = CURRENT_TIMESTAMP
WHERE id = '33333333-3333-3333-3333-333333333333'
    AND state = 'Resolved'
RETURNING id, title, state;

-- Cancel a ticket (from Open or In_Progress)
UPDATE tickets
SET state = 'Cancelled', updated_at = CURRENT_TIMESTAMP
WHERE id = '77777777-7777-7777-7777-777777777777'
    AND state IN ('Open', 'In_Progress')
RETURNING id, title, state;


-- ============================================
-- 5. ADDING COMMENTS
-- ============================================

-- Add a comment to a ticket
INSERT INTO comments (ticket_id, text, author)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Investigated the issue. Found that database connection pool is exhausted. Increasing pool size from 10 to 20.',
    'bob@company.com'
)
RETURNING *;

-- Add multiple comments (batch insert)
INSERT INTO comments (ticket_id, text, author)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Pool size increased. Monitoring for 24 hours.', 'bob@company.com'),
    ('11111111-1111-1111-1111-111111111111', 'Issue resolved. No more 500 errors observed.', 'bob@company.com')
RETURNING id, ticket_id, text, author, created_at;


-- ============================================
-- 6. RETRIEVING COMMENTS
-- ============================================

-- Get all comments for a ticket (chronological order)
SELECT id, text, author, created_at
FROM comments
WHERE ticket_id = '22222222-2222-2222-2222-222222222222'
ORDER BY created_at ASC;

-- Get recent comments across all tickets
SELECT c.id, c.ticket_id, t.title AS ticket_title, c.text, c.author, c.created_at
FROM comments c
JOIN tickets t ON c.ticket_id = t.id
ORDER BY c.created_at DESC
LIMIT 10;

-- Get comment count per ticket
SELECT t.id, t.title, t.state, COUNT(c.id) AS comment_count
FROM tickets t
LEFT JOIN comments c ON t.id = c.ticket_id
GROUP BY t.id, t.title, t.state
ORDER BY comment_count DESC;


-- ============================================
-- 7. FULL-TEXT SEARCH
-- ============================================

-- Search for tickets containing specific keywords
SELECT id, title, state, priority,
       ts_rank(to_tsvector('english', title || ' ' || description), 
               to_tsquery('english', 'database')) AS rank
FROM tickets
WHERE to_tsvector('english', title || ' ' || description) @@ to_tsquery('english', 'database')
ORDER BY rank DESC, created_at DESC;

-- Search with multiple keywords (AND)
SELECT id, title, state, priority
FROM tickets
WHERE to_tsvector('english', title || ' ' || description) 
      @@ to_tsquery('english', 'database & connection')
ORDER BY created_at DESC;

-- Search with OR operator
SELECT id, title, state, priority
FROM tickets
WHERE to_tsvector('english', title || ' ' || description) 
      @@ to_tsquery('english', 'email | notification')
ORDER BY created_at DESC;

-- Case-insensitive partial text search (simpler but slower)
SELECT id, title, state, priority
FROM tickets
WHERE title ILIKE '%authentication%' OR description ILIKE '%authentication%'
ORDER BY created_at DESC;


-- ============================================
-- 8. FILTERING AND AGGREGATIONS
-- ============================================

-- Filter by multiple states
SELECT id, title, state, priority, assignee
FROM tickets
WHERE state IN ('Open', 'In_Progress')
ORDER BY 
    CASE priority
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
    END,
    created_at ASC;

-- Count tickets by state
SELECT state, COUNT(*) AS count
FROM tickets
GROUP BY state
ORDER BY count DESC;

-- Count tickets by priority
SELECT priority, COUNT(*) AS count
FROM tickets
GROUP BY priority
ORDER BY 
    CASE priority
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
    END;

-- Count tickets by assignee
SELECT 
    COALESCE(assignee, 'Unassigned') AS assignee,
    COUNT(*) AS ticket_count
FROM tickets
WHERE state NOT IN ('Closed', 'Cancelled')
GROUP BY assignee
ORDER BY ticket_count DESC;

-- Get workload distribution (open/in-progress tickets per assignee)
SELECT
    COALESCE(assignee, 'Unassigned') AS assignee,
    COUNT(*) AS active_tickets,
    SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) AS critical_count,
    SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) AS high_count,
    SUM(CASE WHEN priority = 'Medium' THEN 1 ELSE 0 END) AS medium_count,
    SUM(CASE WHEN priority = 'Low' THEN 1 ELSE 0 END) AS low_count
FROM tickets
WHERE state IN ('Open', 'In_Progress')
GROUP BY assignee
ORDER BY active_tickets DESC;


-- ============================================
-- 9. COMPLEX QUERIES WITH JOINS
-- ============================================

-- Get ticket with all comments
SELECT
    t.id AS ticket_id,
    t.title,
    t.description,
    t.state,
    t.priority,
    t.assignee,
    t.created_at AS ticket_created_at,
    c.id AS comment_id,
    c.text AS comment_text,
    c.author AS comment_author,
    c.created_at AS comment_created_at
FROM tickets t
LEFT JOIN comments c ON t.id = c.ticket_id
WHERE t.id = '22222222-2222-2222-2222-222222222222'
ORDER BY c.created_at ASC;

-- Get tickets with recent activity (comments in last 7 days)
SELECT DISTINCT
    t.id,
    t.title,
    t.state,
    t.priority,
    MAX(c.created_at) AS last_comment_at
FROM tickets t
JOIN comments c ON t.id = c.ticket_id
WHERE c.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY t.id, t.title, t.state, t.priority
ORDER BY last_comment_at DESC;

-- Get tickets with no comments
SELECT t.id, t.title, t.state, t.priority, t.created_at
FROM tickets t
LEFT JOIN comments c ON t.id = c.ticket_id
WHERE c.id IS NULL
ORDER BY t.created_at DESC;


-- ============================================
-- 10. AUDIT LOG QUERIES
-- ============================================

-- Record ticket creation in audit log
INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'CREATE',
    'admin@company.com',
    NULL,
    'Open',
    '{"title": "API endpoint returning 500 errors", "priority": "Critical"}'
);

-- Record state transition in audit log
INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'STATE_TRANSITION',
    'bob@company.com',
    'Open',
    'In_Progress'
);

-- Record assignment in audit log
INSERT INTO audit_log (ticket_id, operation, user_id, changes)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'ASSIGN',
    'manager@company.com',
    '{"assignee": "bob@company.com"}'
);

-- Get complete audit trail for a ticket
SELECT
    operation,
    user_id,
    old_state,
    new_state,
    changes,
    created_at
FROM audit_log
WHERE ticket_id = '22222222-2222-2222-2222-222222222222'
ORDER BY created_at ASC;

-- Get all state transitions for a ticket
SELECT
    old_state,
    new_state,
    user_id,
    created_at
FROM audit_log
WHERE ticket_id = '44444444-4444-4444-4444-444444444444'
    AND operation = 'STATE_TRANSITION'
ORDER BY created_at ASC;

-- Get recent activity by user
SELECT
    al.ticket_id,
    t.title AS ticket_title,
    al.operation,
    al.created_at
FROM audit_log al
JOIN tickets t ON al.ticket_id = t.id
WHERE al.user_id = 'alice@company.com'
ORDER BY al.created_at DESC
LIMIT 20;


-- ============================================
-- 11. REPORTING QUERIES
-- ============================================

-- Average resolution time (from creation to resolved state)
SELECT
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) AS avg_hours_to_resolve
FROM (
    SELECT
        t.id,
        t.created_at,
        al.created_at AS resolved_at
    FROM tickets t
    JOIN audit_log al ON t.id = al.ticket_id
    WHERE al.operation = 'STATE_TRANSITION'
        AND al.new_state = 'Resolved'
) AS resolution_times;

-- Tickets created per day (last 30 days)
SELECT
    DATE(created_at) AS date,
    COUNT(*) AS tickets_created
FROM tickets
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Tickets by state over time
SELECT
    state,
    COUNT(*) AS count
FROM tickets
GROUP BY state
ORDER BY
    CASE state
        WHEN 'Open' THEN 1
        WHEN 'In_Progress' THEN 2
        WHEN 'Resolved' THEN 3
        WHEN 'Closed' THEN 4
        WHEN 'Cancelled' THEN 5
    END;

-- Most active users (by comment count)
SELECT
    author,
    COUNT(*) AS comment_count
FROM comments
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY author
ORDER BY comment_count DESC
LIMIT 10;


-- ============================================
-- 12. MAINTENANCE QUERIES
-- ============================================

-- Find old closed tickets (older than 2 years)
SELECT id, title, state, created_at, updated_at
FROM tickets
WHERE state = 'Closed'
    AND updated_at < CURRENT_TIMESTAMP - INTERVAL '2 years'
ORDER BY updated_at ASC;

-- Vacuum and analyze tables for performance
VACUUM ANALYZE tickets;
VACUUM ANALYZE comments;
VACUUM ANALYZE audit_log;

-- Reindex all tables
REINDEX TABLE tickets;
REINDEX TABLE comments;
REINDEX TABLE audit_log;

-- Check for tickets with inconsistent state
-- (This query should return no results if data integrity is maintained)
SELECT id, title, state
FROM tickets
WHERE state NOT IN ('Open', 'In_Progress', 'Resolved', 'Closed', 'Cancelled');

-- Check for orphaned comments (should not happen due to foreign keys)
SELECT c.id, c.ticket_id, c.text
FROM comments c
LEFT JOIN tickets t ON c.ticket_id = t.id
WHERE t.id IS NULL;
