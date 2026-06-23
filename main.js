import { initScene, FORCE_SCALE } from './src/sceneSetup.js';

// ─── Dev mode ────────────────────────────────────────────────────────────────
// Set DEV_MODE = false before deployment.
// When true: shows the DEV validation panel and logs math crosschecks to console.
// Phase 5 fills the panel with live Component vs. Parallelogram comparison rows.
const DEV_MODE = true;

// ─── Simulation state ─────────────────────────────────────────────────────────
// The canonical state object. All derived values (Rx, Ry, R, alpha) are
// computed on-demand from this object — never stored here.
// Approved defaults: P=100 N, Q=100 N, θ=45°, P fixed along X-axis.
let state = {
  magnitudeP: 100,    // N — magnitude of force P
  magnitudeQ: 100,    // N — magnitude of force Q
  thetaDeg:    45,    // °  — angle between P and Q (0–180)
  pAngleDeg:    0,    // °  — absolute angle of P from X-axis (fixed at 0 for now)
  view: 'parallelogram',  // 'parallelogram' | 'triangle' (Phase 5/6)
};

// ─── Phase 1 development visSet ──────────────────────────────────────────────
// Shows grid and axes so Phase 1 can be visually verified.
// Phase 7 (Educational Stepper) replaces this with per-step visSet objects
// defined in src/steps.js. This constant is only used until then.
const DEV_VISSET = new Set(['grid', 'axes']);

// ─── Scene initialisation ─────────────────────────────────────────────────────
const canvas = document.getElementById('sim-canvas');

let sim;
try {
  sim = initScene(canvas);
} catch (err) {
  // WebGL unavailable or Three.js failed to load — show actionable error.
  const overlay = document.getElementById('empty-state');
  if (overlay) {
    overlay.removeAttribute('aria-hidden');
    overlay.setAttribute('role', 'alert');
    const p = overlay.querySelector('p');
    if (p) {
      p.textContent = 'WebGL could not start. Try Chrome or Firefox, or enable hardware acceleration in your browser settings.';
      p.className = 'empty-error';
    }
  }
  throw err;
}

const { scene, camera, renderer, resize, update: sceneUpdate, tick, worldToScreen, screenToWorld, setDragCallback } = sim;

// ─── DEV panel ───────────────────────────────────────────────────────────────
// Shown immediately if DEV_MODE is true.
// Content is injected by updateDevPanel() starting in Phase 5.
const devPanel = document.getElementById('dev-panel');
if (DEV_MODE && devPanel) {
  devPanel.style.display = '';
  devPanel.removeAttribute('aria-hidden');

  const closeBtn = document.getElementById('dev-panel-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      devPanel.style.display = 'none';
    });
  }
}

// updateDevPanel is a no-op placeholder until Phase 5 adds math.
// Phase 5 replaces this with a function that compares Component vs. Parallelogram R.
function updateDevPanel() {
  // Implemented in Phase 5.
}

// ─── Main update ─────────────────────────────────────────────────────────────
// Propagates the current state to the scene and (from Phase 7) to the UI layer.
// Called on every state change: slider drag, preset button, navigation.
function refresh(visSet) {
  sceneUpdate(state, visSet);
  // Phase 7 adds: ui.updateReadouts(state, result), ui.updateLabels(...)
  // Phase 5 adds: updateDevPanel(result)
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
// Render initial frame with grid and axes visible.
refresh(DEV_VISSET);

// Hide the loading overlay after the first successful render.
const emptyOverlay = document.getElementById('empty-state');
if (emptyOverlay) emptyOverlay.style.display = 'none';

// ─── Resize handling ──────────────────────────────────────────────────────────
// ResizeObserver on canvas.parentElement (viewport-wrap) fires whenever the
// CSS layout changes the container's size — more reliable than window.resize
// for flex/grid-driven layouts where the window size may not change but the
// canvas allocation does (e.g. step panel width change, font load reflow).
const ro = new ResizeObserver(() => {
  resize();
  // Phase 7 adds: ui.updateLabels(state, currentVisSet, worldToScreen)
  // for now just re-render with the dev visSet
  refresh(DEV_VISSET);
});
ro.observe(canvas.parentElement);

// ─── Render loop ─────────────────────────────────────────────────────────────
// tick() is called first each frame to advance any active animations.
// Phase 4 (parallelogram animation) and Phase 6 (triangle transition)
// extend tick() to update animation progress and call drawDyn() with the
// new progress values before the renderer draws the frame.
(function animate() {
  requestAnimationFrame(animate);
  tick();
  renderer.render(scene, camera);
}());
