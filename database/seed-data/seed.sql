-- Seed Data for Development Environment
-- Description: Inserts sample tickets, comments, and audit logs for testing
-- Author: System
-- Date: 2024-01-15

-- Clear existing data (development only!)
TRUNCATE TABLE audit_log, comments, tickets CASCADE;

-- Reset sequence counters
-- (UUIDs don't need sequence reset, but good practice for other scenarios)

-- ==============================================
-- INSERT SAMPLE TICKETS
-- ==============================================

-- Ticket 1: Open ticket with high priority
INSERT INTO tickets (id, title, description, priority, state, assignee, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Database connection pool exhausted',
    'Production database connection pool is reaching 100% capacity during peak hours. This is causing timeout errors for end users. Need to investigate connection leaks and optimize pool configuration.',
    'Critical',
    'Open',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- Ticket 2: In Progress ticket
INSERT INTO tickets (id, title, description, priority, state, assignee, created_at, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'User authentication fails with LDAP',
    'Some users are unable to log in using their LDAP credentials. Error message shows "Authentication failed" with no additional details. Affects approximately 5% of users.',
    'High',
    'In_Progress',
    'alice@company.com',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Ticket 3: Resolved ticket
INSERT INTO tickets (id, title, description, priority, state, assignee, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Email notifications not sending',
    'Password reset emails are not being delivered to users. SMTP logs show connection timeouts to mail server. Need to verify firewall rules and mail server configuration.',
    'High',
    'Resolved',
    'bob@company.com',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- Ticket 4: Closed ticket
INSERT INTO tickets (id, title, description, priority, state, assignee, created_at, updated_at)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'Incorrect timezone display',
    'Ticket timestamps are displaying in UTC instead of user local timezone. Should respect browser timezone settings. Low impact but affects user experience.',
    'Low',
    'Closed',
    'alice@company.com',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    CURRENT_TIMESTAMP - INTERVAL '5 days'
);

-- Ticket 5: Cancelled ticket
INSERT INTO tickets (id, title, description, priority, state, assignee, created_at, updated_at)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    'Add export to Excel feature',
    'Request to add Excel export functionality for ticket reports. After discussion with stakeholders, this feature is deferred to Q2 roadmap.',
    'Medium',
    'Cancelled',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '18 days'
);

-- Ticket 6: Open medium priority
INSERT INTO tickets (id, title, description, priority, state, assignee, created_at, updated_at)
VALUES (
    '66666666-6666-6666-6666-666666666666',
    'Search results slow for large queries',
    'Full-text search is taking 5-10 seconds for queries returning more than 1000 results. Need to add pagination and optimize search indexes.',
    'Medium',
    'Open',
    'bob@company.com',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Ticket 7: Open low priority
INSERT INTO tickets (id, title, description, priority, state, assignee, created_at, updated_at)
VALUES (
    '77777777-7777-7777-7777-777777777777',
    'Update documentation for API v2',
    'API documentation needs to be updated to reflect new endpoints and deprecation notices. Internal stakeholders are requesting clearer examples.',
    'Low',
    'Open',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '3 hours',
    CURRENT_TIMESTAMP - INTERVAL '3 hours'
);

-- Ticket 8: In Progress with comments
INSERT INTO tickets (id, title, description, priority, state, assignee, created_at, updated_at)
VALUES (
    '88888888-8888-8888-8888-888888888888',
    'Memory leak in background job processor',
    'Background job processor memory usage increases continuously over 24 hours. Eventually causes OOM errors. Suspect issue with job cleanup logic.',
    'Critical',
    'In_Progress',
    'charlie@company.com',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    CURRENT_TIMESTAMP - INTERVAL '6 hours'
);

-- ==============================================
-- INSERT SAMPLE COMMENTS
-- ==============================================

-- Comments for Ticket 2 (In Progress)
INSERT INTO comments (id, ticket_id, text, author, created_at)
VALUES (
    'c0000001-0001-0001-0001-000000000001',
    '22222222-2222-2222-2222-222222222222',
    'Started investigating LDAP logs. Found intermittent connection timeouts to LDAP server.',
    'alice@company.com',
    CURRENT_TIMESTAMP - INTERVAL '4 days'
);

INSERT INTO comments (id, ticket_id, text, author, created_at)
VALUES (
    'c0000001-0001-0001-0001-000000000002',
    '22222222-2222-2222-2222-222222222222',
    'Network team confirmed no firewall changes. Issue appears to be LDAP server capacity. Contacted infrastructure team.',
    'alice@company.com',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

INSERT INTO comments (id, ticket_id, text, author, created_at)
VALUES (
    'c0000001-0001-0001-0001-000000000003',
    '22222222-2222-2222-2222-222222222222',
    'Infrastructure team is adding a second LDAP replica for load balancing. ETA tomorrow.',
    'bob@company.com',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- Comments for Ticket 3 (Resolved)
INSERT INTO comments (id, ticket_id, text, author, created_at)
VALUES (
    'c0000002-0002-0002-0002-000000000001',
    '33333333-3333-3333-3333-333333333333',
    'Verified mail server configuration. SMTP port 587 is blocked by firewall. Opening ticket with security team.',
    'bob@company.com',
    CURRENT_TIMESTAMP - INTERVAL '8 days'
);

INSERT INTO comments (id, ticket_id, text, author, created_at)
VALUES (
    'c0000002-0002-0002-0002-000000000002',
    '33333333-3333-3333-3333-333333333333',
    'Firewall rule updated. Mail is now flowing correctly. Tested with 20 password reset requests.',
    'bob@company.com',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- Comments for Ticket 8 (Memory leak investigation)
INSERT INTO comments (id, ticket_id, text, author, created_at)
VALUES (
    'c0000003-0003-0003-0003-000000000001',
    '88888888-8888-8888-8888-888888888888',
    'Profiled memory usage over 12 hours. Heap grows by approximately 50MB per hour. Suspect job results are not being garbage collected.',
    'charlie@company.com',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

INSERT INTO comments (id, ticket_id, text, author, created_at)
VALUES (
    'c0000003-0003-0003-0003-000000000002',
    '88888888-8888-8888-8888-888888888888',
    'Found the issue: completed jobs are stored in an in-memory cache that never expires. Adding cache eviction policy.',
    'charlie@company.com',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

INSERT INTO comments (id, ticket_id, text, author, created_at)
VALUES (
    'c0000003-0003-0003-0003-000000000003',
    '88888888-8888-8888-8888-888888888888',
    'Implemented LRU cache with 1000 entry limit and 1 hour TTL. Testing in staging environment.',
    'charlie@company.com',
    CURRENT_TIMESTAMP - INTERVAL '12 hours'
);

INSERT INTO comments (id, ticket_id, text, author, created_at)
VALUES (
    'c0000003-0003-0003-0003-000000000004',
    '88888888-8888-8888-8888-888888888888',
    'Memory usage is now stable in staging. Preparing for production deployment.',
    'charlie@company.com',
    CURRENT_TIMESTAMP - INTERVAL '6 hours'
);

-- ==============================================
-- INSERT SAMPLE AUDIT LOG ENTRIES
-- ==============================================

-- Audit logs for Ticket 1 (Open)
INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'CREATE',
    'admin@company.com',
    NULL,
    'Open',
    '{"title": "Database connection pool exhausted", "priority": "Critical"}',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- Audit logs for Ticket 2 (Open -> In_Progress)
INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes, created_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'CREATE',
    'bob@company.com',
    NULL,
    'Open',
    '{"title": "User authentication fails with LDAP", "priority": "High"}',
    CURRENT_TIMESTAMP - INTERVAL '5 days'
);

INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes, created_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'ASSIGN',
    'bob@company.com',
    NULL,
    NULL,
    '{"assignee": "alice@company.com"}',
    CURRENT_TIMESTAMP - INTERVAL '4 days'
);

INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes, created_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'STATE_TRANSITION',
    'alice@company.com',
    'Open',
    'In_Progress',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '4 days'
);

-- Audit logs for Ticket 3 (Open -> In_Progress -> Resolved)
INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes, created_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'CREATE',
    'alice@company.com',
    NULL,
    'Open',
    '{"title": "Email notifications not sending", "priority": "High"}',
    CURRENT_TIMESTAMP - INTERVAL '10 days'
);

INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes, created_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'ASSIGN',
    'alice@company.com',
    NULL,
    NULL,
    '{"assignee": "bob@company.com"}',
    CURRENT_TIMESTAMP - INTERVAL '9 days'
);

INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes, created_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'STATE_TRANSITION',
    'bob@company.com',
    'Open',
    'In_Progress',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '8 days'
);

INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes, created_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'STATE_TRANSITION',
    'bob@company.com',
    'In_Progress',
    'Resolved',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- Audit logs for Ticket 4 (Full lifecycle to Closed)
INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes, created_at)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'CREATE',
    'charlie@company.com',
    NULL,
    'Open',
    '{"title": "Incorrect timezone display", "priority": "Low"}',
    CURRENT_TIMESTAMP - INTERVAL '15 days'
);

INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes, created_at)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'ASSIGN',
    'manager@company.com',
    NULL,
    NULL,
    '{"assignee": "alice@company.com"}',
    CURRENT_TIMESTAMP - INTERVAL '14 days'
);

INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes, created_at)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'STATE_TRANSITION',
    'alice@company.com',
    'Open',
    'In_Progress',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '13 days'
);

INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes, created_at)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'STATE_TRANSITION',
    'alice@company.com',
    'In_Progress',
    'Resolved',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '7 days'
);

INSERT INTO audit_log (ticket_id, operation, user_id, old_state, new_state, changes, created_at)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'STATE_TRANSITION',
    'manager@company.com',
    'Resolved',
    'Closed',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '5 days'
);

-- Summary
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Seed data inserted successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tickets: % rows', (SELECT COUNT(*) FROM tickets);
    RAISE NOTICE 'Comments: % rows', (SELECT COUNT(*) FROM comments);
    RAISE NOTICE 'Audit Logs: % rows', (SELECT COUNT(*) FROM audit_log);
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Ticket State Distribution:';
    RAISE NOTICE '  Open: % tickets', (SELECT COUNT(*) FROM tickets WHERE state = 'Open');
    RAISE NOTICE '  In_Progress: % tickets', (SELECT COUNT(*) FROM tickets WHERE state = 'In_Progress');
    RAISE NOTICE '  Resolved: % tickets', (SELECT COUNT(*) FROM tickets WHERE state = 'Resolved');
    RAISE NOTICE '  Closed: % tickets', (SELECT COUNT(*) FROM tickets WHERE state = 'Closed');
    RAISE NOTICE '  Cancelled: % tickets', (SELECT COUNT(*) FROM tickets WHERE state = 'Cancelled');
    RAISE NOTICE '==============================================';
END $$;
