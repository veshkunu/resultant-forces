// Generic animation runner.
// Handles multiple concurrent animations; each has a duration, easing, and callbacks.
// Used by both the intro framework and the simulation animation phases.

export function easeOutCubic(t)    { return 1 - Math.pow(1 - t, 3); }
export function easeInOutCubic(t)  { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
export function easeLinear(t)      { return t; }

export class AnimationManager {
  constructor() {
    this._active = [];
  }

  // Start an animation.
  // opts.duration  — seconds
  // opts.ease      — easing function (default: easeOutCubic)
  // opts.onUpdate  — fn(t, elapsed) called every tick; t is 0→1 eased progress
  // opts.onComplete — fn() called once when animation finishes
  // Returns a cancel function.
  play({ duration, ease = easeOutCubic, onUpdate, onComplete }) {
    const entry = { duration, ease, onUpdate, onComplete, elapsed: 0, done: false };
    this._active.push(entry);
    return () => { entry.done = true; };
  }

  // Like play() but returns a Promise that resolves on completion.
  playAsync(opts) {
    return new Promise(resolve => {
      this.play({
        ...opts,
        onComplete: () => {
          if (opts.onComplete) opts.onComplete();
          resolve();
        },
      });
    });
  }

  // Advance all active animations by dt seconds. Call this once per rAF frame.
  tick(dt) {
    for (const entry of this._active) {
      if (entry.done) continue;
      entry.elapsed = Math.min(entry.elapsed + dt, entry.duration);
      const t = entry.ease(entry.elapsed / entry.duration);
      if (entry.onUpdate) entry.onUpdate(t, entry.elapsed);
      if (entry.elapsed >= entry.duration) {
        entry.done = true;
        if (entry.onComplete) entry.onComplete();
      }
    }
    this._active = this._active.filter(e => !e.done);
  }

  cancelAll() {
    this._active.forEach(e => { e.done = true; });
    this._active = [];
  }

  get running() { return this._active.length > 0; }
}
