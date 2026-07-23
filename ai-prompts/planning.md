# AI Prompts - Planning Phase

This file documents all AI prompts used during the planning and requirements phase.

## Prompt 1: Initial Requirements Request

**User:** I want to build a Support Ticket Management System as part of an AI-assisted engineering capability assessment. Act as a Senior Product Manager and Requirements Engineer. Do not generate code. First, help me create a complete Requirements Specification.

Business Context: A small internal application used by support teams to create, assign, track, update and close support tickets.

Project Scope: This project intentionally focuses on demonstrating engineering workflow rather than implementing every enterprise feature.

Mandatory Functional Requirements:
- Create Ticket
- List Tickets
- Ticket Details
- Update Ticket
- Assign Ticket
- Add Comments
- Search by keyword
- Filter by status
- Persist data
- Backend validation
- Proper error handling

Ticket State Machine:
- Open -> In Progress
- In Progress -> Resolved
- Resolved -> Closed
- Open -> Cancelled
- In Progress -> Cancelled
- Invalid transitions must be rejected by backend.

Generate:
1. Business Goals
2. Stakeholders
3. User Personas
4. Functional Requirements
5. Non Functional Requirements
6. Business Rules
7. Assumptions
8. Constraints
9. Risks
10. Edge Cases
11. Out of Scope

Write this as a production-quality requirements.md document suitable for Kiro.

**Kiro Response:** Understood. [Proceeded to ask workflow clarification questions]

## Prompt 2: Workflow Selection

**Kiro:** Based on your description, this sounds like a new feature. Is this a new feature or a bugfix?

**User:** Build a Feature

**Kiro:** What do you want to start with?
- Requirements (Begin by gathering and documenting requirements) [RECOMMENDED]
- Technical Design (Begin with the technical design, then derive requirements from that design)

**User:** Requirements

**Kiro Action:** Activated feature-requirements-first-workflow subagent and generated complete requirements document

## Outcome

Generated `.kiro/specs/support-ticket-management-system/requirements.md` with:
- 12 functional requirements
- 87 EARS-formatted acceptance criteria
- 3 user personas
- 5 business goals
- Complete glossary (14 terms)
- Assumptions, constraints, risks, edge cases
- Out of scope section

**Time:** ~15 minutes including review and one format correction
