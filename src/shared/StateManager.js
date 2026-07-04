// App phase state machine.
// The simulation always moves through exactly three phases in order:
//   INTRO → TRANSITION → SIMULATION
// Moving backward is not supported; the phases form a one-way pipeline.

export const AppPhase = Object.freeze({
  INTRO:      'intro',
  TRANSITION: 'transition',
  SIMULATION: 'simulation',
});

export class StateManager {
  constructor(initial = AppPhase.INTRO) {
    this._phase     = initial;
    this._listeners = [];
  }

  get phase() { return this._phase; }

  // Advance to a new phase. Notifies all subscribers with (newPhase, prevPhase).
  set(newPhase) {
    if (newPhase === this._phase) return;
    const prev  = this._phase;
    this._phase = newPhase;
    this._listeners.forEach(fn => fn(newPhase, prev));
  }

  // Subscribe to phase changes. Returns an unsubscribe function.
  on(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(f => f !== fn); };
  }
}
