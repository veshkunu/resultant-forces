// IntroStepController: step machine for the introduction flow.
// Owns the current step index and emits step-change events.
// It is completely generic — the scene data array is owned by IntroManager.

export class IntroStepController {
  constructor(totalSteps) {
    this._step       = 0;
    this._total      = totalSteps;
    this._listeners  = [];
  }

  get current()     { return this._step; }
  get total()       { return this._total; }
  get isFirst()     { return this._step === 0; }
  get isLast()      { return this._step === this._total - 1; }

  next() {
    if (this._step >= this._total - 1) return false;
    this._step++;
    this._emit();
    return true;
  }

  back() {
    if (this._step <= 0) return false;
    this._step--;
    this._emit();
    return true;
  }

  jumpTo(index) {
    if (index < 0 || index >= this._total) return;
    this._step = index;
    this._emit();
  }

  // Subscribe to step changes: fn(stepIndex, prevIndex)
  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(f => f !== fn); };
  }

  _emit() {
    const step = this._step;
    this._listeners.forEach(fn => fn(step));
  }
}
