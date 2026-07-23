/**
 * Unit tests for TicketStateMachine
 * Tests all state transition validation logic
 */

import { TicketStateMachine } from './TicketStateMachine';
import { TicketState, ErrorCode } from '../models';

describe('TicketStateMachine', () => {
  let stateMachine: TicketStateMachine;

  beforeEach(() => {
    stateMachine = new TicketStateMachine();
  });

  describe('validateTransition', () => {
    describe('valid transitions', () => {
      it('should allow transition from Open to In_Progress', () => {
        const result = stateMachine.validateTransition(
          TicketState.Open,
          TicketState.InProgress
        );
        expect(result.valid).toBe(true);
      });

      it('should allow transition from Open to Cancelled', () => {
        const result = stateMachine.validateTransition(
          TicketState.Open,
          TicketState.Cancelled
        );
        expect(result.valid).toBe(true);
      });

      it('should allow transition from In_Progress to Resolved', () => {
        const result = stateMachine.validateTransition(
          TicketState.InProgress,
          TicketState.Resolved
        );
        expect(result.valid).toBe(true);
      });

      it('should allow transition from In_Progress to Cancelled', () => {
        const result = stateMachine.validateTransition(
          TicketState.InProgress,
          TicketState.Cancelled
        );
        expect(result.valid).toBe(true);
      });

      it('should allow transition from Resolved to Closed', () => {
        const result = stateMachine.validateTransition(
          TicketState.Resolved,
          TicketState.Closed
        );
        expect(result.valid).toBe(true);
      });
    });

    describe('invalid transitions', () => {
      it('should reject transition from Open to Resolved (skipping In_Progress)', () => {
        const result = stateMachine.validateTransition(
          TicketState.Open,
          TicketState.Resolved
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0]!.field).toBe('state');
          expect(result.errors[0]!.code).toBe(ErrorCode.INVALID_TRANSITION);
          expect(result.errors[0]!.message).toContain('Invalid state transition');
          expect(result.errors[0]!.message).toContain('Open');
          expect(result.errors[0]!.message).toContain('Resolved');
          expect(result.errors[0]!.message).toContain('In_Progress, Cancelled');
        }
      });

      it('should reject transition from Open to Closed', () => {
        const result = stateMachine.validateTransition(
          TicketState.Open,
          TicketState.Closed
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.code).toBe(ErrorCode.INVALID_TRANSITION);
          expect(result.errors[0]!.message).toContain('Invalid state transition');
        }
      });

      it('should reject transition from In_Progress to Open (backwards)', () => {
        const result = stateMachine.validateTransition(
          TicketState.InProgress,
          TicketState.Open
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.code).toBe(ErrorCode.INVALID_TRANSITION);
        }
      });

      it('should reject transition from In_Progress to Closed (skipping Resolved)', () => {
        const result = stateMachine.validateTransition(
          TicketState.InProgress,
          TicketState.Closed
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.code).toBe(ErrorCode.INVALID_TRANSITION);
          expect(result.errors[0]!.message).toContain('Resolved, Cancelled');
        }
      });

      it('should reject transition from Resolved to Open', () => {
        const result = stateMachine.validateTransition(
          TicketState.Resolved,
          TicketState.Open
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.code).toBe(ErrorCode.INVALID_TRANSITION);
        }
      });

      it('should reject transition from Resolved to In_Progress', () => {
        const result = stateMachine.validateTransition(
          TicketState.Resolved,
          TicketState.InProgress
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.code).toBe(ErrorCode.INVALID_TRANSITION);
        }
      });

      it('should reject transition from Resolved to Cancelled', () => {
        const result = stateMachine.validateTransition(
          TicketState.Resolved,
          TicketState.Cancelled
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.code).toBe(ErrorCode.INVALID_TRANSITION);
        }
      });
    });

    describe('self-transitions', () => {
      it('should reject transition from Open to Open', () => {
        const result = stateMachine.validateTransition(
          TicketState.Open,
          TicketState.Open
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.field).toBe('state');
          expect(result.errors[0]!.code).toBe(ErrorCode.INVALID_TRANSITION);
          expect(result.errors[0]!.message).toContain('already in Open state');
        }
      });

      it('should reject transition from In_Progress to In_Progress', () => {
        const result = stateMachine.validateTransition(
          TicketState.InProgress,
          TicketState.InProgress
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.code).toBe(ErrorCode.INVALID_TRANSITION);
          expect(result.errors[0]!.message).toContain('already in In_Progress state');
        }
      });

      it('should reject transition from Resolved to Resolved', () => {
        const result = stateMachine.validateTransition(
          TicketState.Resolved,
          TicketState.Resolved
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.code).toBe(ErrorCode.INVALID_TRANSITION);
        }
      });
    });

    describe('terminal state transitions', () => {
      it('should reject any transition from Closed state', () => {
        const result = stateMachine.validateTransition(
          TicketState.Closed,
          TicketState.Open
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.field).toBe('state');
          expect(result.errors[0]!.code).toBe(ErrorCode.TERMINAL_STATE);
          expect(result.errors[0]!.message).toContain('terminal state');
          expect(result.errors[0]!.message).toContain('Closed');
          expect(result.errors[0]!.message).toContain('No further transitions allowed');
        }
      });

      it('should reject transition from Closed to In_Progress', () => {
        const result = stateMachine.validateTransition(
          TicketState.Closed,
          TicketState.InProgress
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.code).toBe(ErrorCode.TERMINAL_STATE);
        }
      });

      it('should reject transition from Closed to Resolved', () => {
        const result = stateMachine.validateTransition(
          TicketState.Closed,
          TicketState.Resolved
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.code).toBe(ErrorCode.TERMINAL_STATE);
        }
      });

      it('should reject any transition from Cancelled state', () => {
        const result = stateMachine.validateTransition(
          TicketState.Cancelled,
          TicketState.Open
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.field).toBe('state');
          expect(result.errors[0]!.code).toBe(ErrorCode.TERMINAL_STATE);
          expect(result.errors[0]!.message).toContain('terminal state');
          expect(result.errors[0]!.message).toContain('Cancelled');
          expect(result.errors[0]!.message).toContain('No further transitions allowed');
        }
      });

      it('should reject transition from Cancelled to In_Progress', () => {
        const result = stateMachine.validateTransition(
          TicketState.Cancelled,
          TicketState.InProgress
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.code).toBe(ErrorCode.TERMINAL_STATE);
        }
      });

      it('should reject transition from Cancelled to Resolved', () => {
        const result = stateMachine.validateTransition(
          TicketState.Cancelled,
          TicketState.Resolved
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.code).toBe(ErrorCode.TERMINAL_STATE);
        }
      });

      it('should reject transition from Cancelled to Closed', () => {
        const result = stateMachine.validateTransition(
          TicketState.Cancelled,
          TicketState.Closed
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors[0]!.code).toBe(ErrorCode.TERMINAL_STATE);
        }
      });
    });
  });

  describe('getValidNextStates', () => {
    it('should return [In_Progress, Cancelled] for Open state', () => {
      const nextStates = stateMachine.getValidNextStates(TicketState.Open);
      expect(nextStates).toHaveLength(2);
      expect(nextStates).toContain(TicketState.InProgress);
      expect(nextStates).toContain(TicketState.Cancelled);
    });

    it('should return [Resolved, Cancelled] for In_Progress state', () => {
      const nextStates = stateMachine.getValidNextStates(TicketState.InProgress);
      expect(nextStates).toHaveLength(2);
      expect(nextStates).toContain(TicketState.Resolved);
      expect(nextStates).toContain(TicketState.Cancelled);
    });

    it('should return [Closed] for Resolved state', () => {
      const nextStates = stateMachine.getValidNextStates(TicketState.Resolved);
      expect(nextStates).toHaveLength(1);
      expect(nextStates).toContain(TicketState.Closed);
    });

    it('should return empty array for Closed state (terminal)', () => {
      const nextStates = stateMachine.getValidNextStates(TicketState.Closed);
      expect(nextStates).toHaveLength(0);
      expect(nextStates).toEqual([]);
    });

    it('should return empty array for Cancelled state (terminal)', () => {
      const nextStates = stateMachine.getValidNextStates(TicketState.Cancelled);
      expect(nextStates).toHaveLength(0);
      expect(nextStates).toEqual([]);
    });
  });

  describe('isTerminalState', () => {
    it('should return false for Open state', () => {
      expect(stateMachine.isTerminalState(TicketState.Open)).toBe(false);
    });

    it('should return false for In_Progress state', () => {
      expect(stateMachine.isTerminalState(TicketState.InProgress)).toBe(false);
    });

    it('should return false for Resolved state', () => {
      expect(stateMachine.isTerminalState(TicketState.Resolved)).toBe(false);
    });

    it('should return true for Closed state', () => {
      expect(stateMachine.isTerminalState(TicketState.Closed)).toBe(true);
    });

    it('should return true for Cancelled state', () => {
      expect(stateMachine.isTerminalState(TicketState.Cancelled)).toBe(true);
    });
  });

  describe('error message descriptiveness', () => {
    it('should provide specific error message for invalid transition with allowed transitions listed', () => {
      const result = stateMachine.validateTransition(
        TicketState.Open,
        TicketState.Resolved
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        const errorMessage = result.errors[0]!.message;
        expect(errorMessage).toContain('Invalid state transition');
        expect(errorMessage).toContain('from Open to Resolved');
        expect(errorMessage).toContain('Allowed transitions:');
        expect(errorMessage).toContain('In_Progress');
        expect(errorMessage).toContain('Cancelled');
      }
    });

    it('should provide specific error message for terminal state', () => {
      const result = stateMachine.validateTransition(
        TicketState.Closed,
        TicketState.Open
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        const errorMessage = result.errors[0]!.message;
        expect(errorMessage).toContain('terminal state Closed');
        expect(errorMessage).toContain('No further transitions allowed');
      }
    });

    it('should provide specific error message for self-transition', () => {
      const result = stateMachine.validateTransition(
        TicketState.Open,
        TicketState.Open
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        const errorMessage = result.errors[0]!.message;
        expect(errorMessage).toContain('already in Open state');
      }
    });
  });

  describe('all state transition combinations', () => {
    const allStates = [
      TicketState.Open,
      TicketState.InProgress,
      TicketState.Resolved,
      TicketState.Closed,
      TicketState.Cancelled,
    ];

    const validTransitions = [
      [TicketState.Open, TicketState.InProgress],
      [TicketState.Open, TicketState.Cancelled],
      [TicketState.InProgress, TicketState.Resolved],
      [TicketState.InProgress, TicketState.Cancelled],
      [TicketState.Resolved, TicketState.Closed],
    ];

    it('should correctly validate all possible state combinations', () => {
      for (const fromState of allStates) {
        for (const toState of allStates) {
          const result = stateMachine.validateTransition(fromState, toState);
          const isValidTransition = validTransitions.some(
            ([from, to]) => from === fromState && to === toState
          );

          if (isValidTransition) {
            expect(result.valid).toBe(true);
          } else {
            expect(result.valid).toBe(false);
            if (!result.valid) {
              expect(result.errors).toHaveLength(1);
              expect(result.errors[0]!.field).toBe('state');
              expect(['INVALID_TRANSITION', 'INVALID_STATE', 'TERMINAL_STATE']).toContain(
                result.errors[0]!.code
              );
            }
          }
        }
      }
    });
  });
});
