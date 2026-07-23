/**
 * Ticket State Machine
 * Implements state transition logic and validation for ticket lifecycle management
 *
 * Valid state transitions (Business Rule BR-1):
 * - Open → In_Progress
 * - Open → Cancelled
 * - In_Progress → Resolved
 * - In_Progress → Cancelled
 * - Resolved → Closed
 *
 * Terminal states (Business Rule BR-3):
 * - Closed (no further transitions)
 * - Cancelled (no further transitions)
 */

import { TicketState, ValidationResult, ErrorCode } from '../models';

/**
 * TicketStateMachine class handles all state transition validation logic
 */
export class TicketStateMachine {
  /**
   * Valid state transitions map
   * Maps each state to an array of allowed next states
   */
  private static readonly TRANSITIONS: Map<TicketState, TicketState[]> =
    new Map([
      [TicketState.Open, [TicketState.InProgress, TicketState.Cancelled]],
      [TicketState.InProgress, [TicketState.Resolved, TicketState.Cancelled]],
      [TicketState.Resolved, [TicketState.Closed]],
      [TicketState.Closed, []],
      [TicketState.Cancelled, []],
    ]);

  /**
   * Validates whether a state transition is allowed
   * @param currentState - Current ticket state
   * @param newState - Requested new state
   * @returns ValidationResult indicating if transition is valid
   */
  public validateTransition(
    currentState: TicketState,
    newState: TicketState
  ): ValidationResult {
    // Check if current state is valid
    const allowedTransitions = TicketStateMachine.TRANSITIONS.get(currentState);

    if (!allowedTransitions) {
      return {
        valid: false,
        errors: [
          {
            field: 'state',
            message: `Unknown current state: ${currentState}`,
            code: ErrorCode.INVALID_STATE,
          },
        ],
      };
    }

    // Check if trying to transition to the same state
    if (currentState === newState) {
      return {
        valid: false,
        errors: [
          {
            field: 'state',
            message: `Ticket is already in ${currentState} state`,
            code: ErrorCode.INVALID_TRANSITION,
          },
        ],
      };
    }

    // Check if current state is terminal (no outgoing transitions)
    if (allowedTransitions.length === 0) {
      return {
        valid: false,
        errors: [
          {
            field: 'state',
            message: `Ticket is in terminal state ${currentState}. No further transitions allowed.`,
            code: ErrorCode.TERMINAL_STATE,
          },
        ],
      };
    }

    // Check if the requested transition is allowed
    if (!allowedTransitions.includes(newState)) {
      return {
        valid: false,
        errors: [
          {
            field: 'state',
            message: `Invalid state transition from ${currentState} to ${newState}. Allowed transitions: ${allowedTransitions.join(', ')}`,
            code: ErrorCode.INVALID_TRANSITION,
          },
        ],
      };
    }

    return { valid: true };
  }

  /**
   * Gets all valid next states for a given current state
   * @param currentState - Current ticket state
   * @returns Array of allowed next states (empty array for terminal states)
   */
  public getValidNextStates(currentState: TicketState): TicketState[] {
    return TicketStateMachine.TRANSITIONS.get(currentState) || [];
  }

  /**
   * Checks if a state is terminal (no outgoing transitions)
   * @param state - Ticket state to check
   * @returns True if state is terminal (Closed or Cancelled), false otherwise
   */
  public isTerminalState(state: TicketState): boolean {
    const transitions = TicketStateMachine.TRANSITIONS.get(state);
    return transitions !== undefined && transitions.length === 0;
  }
}

/**
 * Singleton instance for use across the application
 */
export const ticketStateMachine = new TicketStateMachine();
