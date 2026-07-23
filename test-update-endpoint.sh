#!/bin/bash

# Test script for PATCH /api/v1/tickets/:id endpoint
# This script assumes the server is running on http://localhost:3000

BASE_URL="http://localhost:3000/api/v1"
TOKEN="test-token-123"

echo "==================================="
echo "Testing PATCH /api/v1/tickets/:id"
echo "==================================="

# Step 1: Create a test ticket
echo ""
echo "1. Creating a test ticket..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/tickets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Ticket for Update",
    "description": "Original description",
    "priority": "Medium"
  }')

TICKET_ID=$(echo $CREATE_RESPONSE | jq -r '.id')
echo "Created ticket ID: $TICKET_ID"
echo "Original ticket:"
echo $CREATE_RESPONSE | jq '.'

# Step 2: Update ticket title only
echo ""
echo "2. Updating ticket title only..."
UPDATE_TITLE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title"
  }')

echo "Response after updating title:"
echo $UPDATE_TITLE_RESPONSE | jq '.'

# Step 3: Update ticket description only
echo ""
echo "3. Updating ticket description only..."
UPDATE_DESC_RESPONSE=$(curl -s -X PATCH "$BASE_URL/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description with more details"
  }')

echo "Response after updating description:"
echo $UPDATE_DESC_RESPONSE | jq '.'

# Step 4: Update ticket priority only
echo ""
echo "4. Updating ticket priority only..."
UPDATE_PRIORITY_RESPONSE=$(curl -s -X PATCH "$BASE_URL/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "Critical"
  }')

echo "Response after updating priority:"
echo $UPDATE_PRIORITY_RESPONSE | jq '.'

# Step 5: Update multiple fields at once
echo ""
echo "5. Updating multiple fields at once..."
UPDATE_MULTI_RESPONSE=$(curl -s -X PATCH "$BASE_URL/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Final Updated Title",
    "description": "Final updated description",
    "priority": "High"
  }')

echo "Response after updating multiple fields:"
echo $UPDATE_MULTI_RESPONSE | jq '.'

# Step 6: Test validation - empty title
echo ""
echo "6. Testing validation: empty title (should fail with 400)..."
VALIDATION_RESPONSE=$(curl -s -X PATCH "$BASE_URL/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": ""
  }')

echo "Response for empty title:"
echo $VALIDATION_RESPONSE | jq '.'

# Step 7: Test validation - invalid priority
echo ""
echo "7. Testing validation: invalid priority (should fail with 400)..."
INVALID_PRIORITY_RESPONSE=$(curl -s -X PATCH "$BASE_URL/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "InvalidPriority"
  }')

echo "Response for invalid priority:"
echo $INVALID_PRIORITY_RESPONSE | jq '.'

# Step 8: Test immutable field - state
echo ""
echo "8. Testing immutable field: state (should fail with 400)..."
IMMUTABLE_STATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "Closed",
    "title": "Trying to change state"
  }')

echo "Response when trying to update state:"
echo $IMMUTABLE_STATE_RESPONSE | jq '.'

# Step 9: Test non-existent ticket
echo ""
echo "9. Testing non-existent ticket ID (should fail with 404)..."
NOT_FOUND_RESPONSE=$(curl -s -X PATCH "$BASE_URL/tickets/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updating non-existent ticket"
  }')

echo "Response for non-existent ticket:"
echo $NOT_FOUND_RESPONSE | jq '.'

# Step 10: Test invalid ID format
echo ""
echo "10. Testing invalid ticket ID format (should fail with 400)..."
INVALID_ID_RESPONSE=$(curl -s -X PATCH "$BASE_URL/tickets/invalid-id" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updating with invalid ID"
  }')

echo "Response for invalid ID format:"
echo $INVALID_ID_RESPONSE | jq '.'

# Step 11: Test missing authentication
echo ""
echo "11. Testing missing authentication (should fail with 401)..."
NO_AUTH_RESPONSE=$(curl -s -X PATCH "$BASE_URL/tickets/$TICKET_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updating without auth"
  }')

echo "Response without authentication:"
echo $NO_AUTH_RESPONSE | jq '.'

# Cleanup: Delete the test ticket
echo ""
echo "12. Cleaning up test ticket..."
curl -s -X DELETE "$BASE_URL/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

echo ""
echo "==================================="
echo "Test completed!"
echo "==================================="
