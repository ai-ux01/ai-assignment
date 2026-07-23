#!/bin/bash

# ============================================================================
# Support Ticket Management System - Smoke Tests
# ============================================================================
# Quick smoke tests to verify production system is operational
# Can be run manually or as part of monitoring/CI/CD
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
TEST_AUTH_TOKEN="${TEST_AUTH_TOKEN:-}"

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# ============================================================================
# Utility Functions
# ============================================================================

test_start() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Test $TOTAL_TESTS: $1 ... "
}

test_pass() {
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}PASS${NC}"
}

test_fail() {
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "${RED}FAIL${NC}"
    if [ -n "$1" ]; then
        echo "  Error: $1"
    fi
}

# ============================================================================
# Smoke Tests
# ============================================================================

echo "========================================"
echo "Running Smoke Tests"
echo "API URL: $API_URL"
echo "========================================"
echo ""

# Test 1: Health endpoint
test_start "Health endpoint returns 200"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$response" = "200" ]; then
    test_pass
else
    test_fail "Expected 200, got $response"
fi

# Test 2: Health endpoint returns valid JSON
test_start "Health endpoint returns valid JSON"
health_json=$(curl -s "$API_URL/health")
if echo "$health_json" | jq -e '.status' > /dev/null 2>&1; then
    test_pass
else
    test_fail "Invalid JSON response"
fi

# Test 3: List tickets endpoint
test_start "List tickets endpoint is accessible"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/tickets")
if [ "$response" = "200" ]; then
    test_pass
else
    test_fail "Expected 200, got $response"
fi

# Test 4: List tickets returns valid JSON
test_start "List tickets returns valid JSON"
tickets_json=$(curl -s "$API_URL/api/v1/tickets")
if echo "$tickets_json" | jq -e '.tickets' > /dev/null 2>&1; then
    test_pass
else
    test_fail "Invalid JSON response or missing 'tickets' field"
fi

# Test 5: Search endpoint
test_start "Search endpoint is accessible"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/tickets/search?q=test")
if [ "$response" = "200" ]; then
    test_pass
else
    test_fail "Expected 200, got $response"
fi

# Test 6: Filter endpoint
test_start "Filter endpoint is accessible"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/tickets/filter?state=Open")
if [ "$response" = "200" ]; then
    test_pass
else
    test_fail "Expected 200, got $response"
fi

# Test 7: Invalid search query returns 400
test_start "Invalid search query returns 400"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/tickets/search?q=")
if [ "$response" = "400" ]; then
    test_pass
else
    test_fail "Expected 400, got $response"
fi

# Test 8: Invalid filter state returns 400
test_start "Invalid filter state returns 400"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/tickets/filter?state=InvalidState")
if [ "$response" = "400" ]; then
    test_pass
else
    test_fail "Expected 400, got $response"
fi

# Test 9: Non-existent ticket returns 404
test_start "Non-existent ticket returns 404"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/tickets/00000000-0000-0000-0000-000000000000")
if [ "$response" = "404" ]; then
    test_pass
else
    test_fail "Expected 404, got $response"
fi

# Test 10: Response time check
test_start "Response time is acceptable (<2s)"
start_time=$(date +%s.%N)
curl -s "$API_URL/health" > /dev/null
end_time=$(date +%s.%N)
response_time=$(echo "$end_time - $start_time" | bc)
if (( $(echo "$response_time < 2.0" | bc -l) )); then
    test_pass
else
    test_fail "Response time: ${response_time}s (>2s)"
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "========================================"
echo "Smoke Test Summary"
echo "========================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All smoke tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
