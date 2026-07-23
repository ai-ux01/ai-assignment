/**
 * TicketStateMachine Demo
 * Demonstrates the state machine validation logic
 */

import { ticketStateMachine } from '../src/services/TicketStateMachine';
import { TicketState } from '../src/models';

console.log('=== Ticket State Machine Demo ===\n');

// Test valid transitions
console.log('Valid Transitions:');
console.log('------------------');

const validTransitions: [TicketState, TicketState][] = [
  [TicketState.Open, TicketState.InProgress],
  [TicketState.Open, TicketState.Cancelled],
  [TicketState.InProgress, TicketState.Resolved],
  [TicketState.InProgress, TicketState.Cancelled],
  [TicketState.Resolved, TicketState.Closed],
];

validTransitions.forEach(([from, to]) => {
  const result = ticketStateMachine.validateTransition(from, to);
  console.log(`✓ ${from} → ${to}: ${result.valid ? 'ALLOWED' : 'REJECTED'}`);
});

console.log('\nInvalid Transitions:');
console.log('--------------------');

const invalidTransitions: [TicketState, TicketState][] = [
  [TicketState.Open, TicketState.Resolved],
  [TicketState.Open, TicketState.Closed],
  [TicketState.InProgress, TicketState.Open],
  [TicketState.InProgress, TicketState.Closed],
  [TicketState.Resolved, TicketState.Open],
  [TicketState.Resolved, TicketState.InProgress],
  [TicketState.Resolved, TicketState.Cancelled],
];

invalidTransitions.forEach(([from, to]) => {
  const result = ticketStateMachine.validateTransition(from, to);
  if (!result.valid && result.errors) {
    console.log(`✗ ${from} → ${to}: ${result.errors[0]!.message}`);
  }
});

console.log('\nTerminal State Transitions:');
console.log('---------------------------');

const terminalTransitions: [TicketState, TicketState][] = [
  [TicketState.Closed, TicketState.Open],
  [TicketState.Closed, TicketState.InProgress],
  [TicketState.Cancelled, TicketState.Open],
  [TicketState.Cancelled, TicketState.InProgress],
];

terminalTransitions.forEach(([from, to]) => {
  const result = ticketStateMachine.validateTransition(from, to);
  if (!result.valid && result.errors) {
    console.log(`✗ ${from} → ${to}: ${result.errors[0]!.message}`);
  }
});

console.log('\nValid Next States:');
console.log('------------------');

const states = [
  TicketState.Open,
  TicketState.InProgress,
  TicketState.Resolved,
  TicketState.Closed,
  TicketState.Cancelled,
];

states.forEach((state) => {
  const nextStates = ticketStateMachine.getValidNextStates(state);
  const isTerminal = ticketStateMachine.isTerminalState(state);
  console.log(
    `${state}: [${nextStates.join(', ') || 'none'}]${isTerminal ? ' (terminal)' : ''}`
  );
});

console.log('\n=== Demo Complete ===');
