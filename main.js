import gsap from 'gsap';
import { initScene }                        from './src/scene.js';
import { computeForces, computeMoment, fmt, FORCE_SCALE, LOCAL_ANGLE_RANGE } from './src/forces.js';

// Read once at load; gates every GSAP timeline below (DESIGN.md §2.13).
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (REDUCED_MOTION) gsap.globalTimeline.timeScale(1000); // collapses motion to instant, keeps end state + onComplete callbacks

// ── State ──────────────────────────────────────────────────────────────────────
// Four fixed-role, quadrant-clamped vectors (ADR-006) — A:QI, B:QII, C:QIII, D:QIV. Angle is
// stored as a LOCAL 0-90° reference angle (see src/forces.js#quadrantAngle) — the only thing a
// student ever dials in; the global direction is always derived, never edited directly.
const DEFAULT_STATE = {
  vectors: [
    { id: 'A', enabled: true,  magnitude: 100, localAngleDeg: 30 },
    { id: 'B', enabled: true,  magnitude: 80,  localAngleDeg: 45 },
    { id: 'C', enabled: false, magnitude: 60,  localAngleDeg: 45 },
    { id: 'D', enabled: false, magnitude: 50,  localAngleDeg: 45 },
  ],
  momentArm: 2.0,
};
const state = { ...DEFAULT_STATE, vectors: DEFAULT_STATE.vectors.map(v => ({ ...v })) };

let activeSection = null;
let componentTarget = null; // 'A' | 'B' | 'C' | 'D' | null — selected Component Resolution card
let geoSelected = null;     // 'A' | 'B' | 'C' | 'D' | null — selected Geometry card / edit-panel target
let currentTimeline = null;
let popupVisible = false;
let simPaused = false;

const QUAD_NAME = { A: 'QI', B: 'QII', C: 'QIII', D: 'QIV' };

// ── Scene init ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById('sim-canvas');
const sim = initScene(canvas);
const { resize, draw, tick, worldToScreen, screenToWorld } = sim;

// ── Resize observer ────────────────────────────────────────────────────────────
const ro = new ResizeObserver(() => { resize(); redraw(); updateLabels(); });
ro.observe(canvas.parentElement);

// ── Input wiring ───────────────────────────────────────────────────────────────
// Generic single-field binder — only the System Moment card's arm slider uses this now that the
// four vectors are edited exclusively through the floating edit panel below.
function wireInput(sliderId, numId, key, isFloat) {
  const sl = document.getElementById(sliderId);
  const nu = document.getElementById(numId);
  function apply(raw) {
    const v = isFloat ? parseFloat(raw) : parseInt(raw, 10);
    if (isNaN(v)) return;
    state[key] = v;
    if (sl) sl.value = v;
    if (nu) nu.value = isFloat ? v.toFixed(1) : v;
    redraw();
    updateDashboard();
    updateLabels();
  }
  sl?.addEventListener('input', () => apply(sl.value));
  nu?.addEventListener('change', () => apply(nu.value));
}
wireInput('sl-arm', 'nu-arm', 'momentArm', true);

// ── Floating edit panel (Change 3) — one set of controls, retargeted per selected force ────────
function wireEditPanel() {
  const slMag = document.getElementById('sl-edit-mag');
  const nuMag = document.getElementById('nu-edit-mag');
  const slAng = document.getElementById('sl-edit-ang');
  const nuAng = document.getElementById('nu-edit-ang');

  function applyMag(raw) {
    if (!geoSelected) return;
    const v = clamp(parseInt(raw, 10) || 0, 20, 350);
    state.vectors.find(x => x.id === geoSelected).magnitude = v;
    syncInput('sl-edit-mag', 'nu-edit-mag', v, false);
    redraw(); updateDashboard(); updateLabels();
  }
  function applyAng(raw) {
    if (!geoSelected) return;
    const [lo, hi] = LOCAL_ANGLE_RANGE;
    const v = clamp(parseInt(raw, 10) || 0, lo, hi);
    state.vectors.find(x => x.id === geoSelected).localAngleDeg = v;
    syncInput('sl-edit-ang', 'nu-edit-ang', v, false);
    updateEditPanelAngles();
    redraw(); updateDashboard(); updateLabels();
  }
  slMag?.addEventListener('input', () => applyMag(slMag.value));
  nuMag?.addEventListener('change', () => applyMag(nuMag.value));
  slAng?.addEventListener('input', () => applyAng(slAng.value));
  nuAng?.addEventListener('change', () => applyAng(nuAng.value));

  document.getElementById('edit-close')?.addEventListener('click', () => {
    resetGeoSelection();
    redraw();
    updateLabels();
  });
}
wireEditPanel();

function populateEditPanel(id) {
  const c = computeForces(state);
  const v = c.vectors.find(x => x.id === id);
  setText('edit-title', `FORCE ${id}`);
  setText('edit-quad-badge', QUAD_NAME[id]);
  const dot = document.getElementById('edit-dot');
  if (dot) dot.className = `fc-dot fc-dot--${id.toLowerCase()}`;
  syncInput('sl-edit-mag', 'nu-edit-mag', v.magnitude, false);
  syncInput('sl-edit-ang', 'nu-edit-ang', v.localAngleDeg, false);
  updateEditPanelAngles();
}

function updateEditPanelAngles() {
  if (!geoSelected) return;
  const c = computeForces(state);
  const v = c.vectors.find(x => x.id === geoSelected);
  setText('edit-local-ang', `${fmt(v.localAngleDeg, 0)}°`);
  setText('edit-global-ang', `${fmt(v.angleDeg, 0)}°`);
}

function showEditPanel(id) {
  populateEditPanel(id);
  const panel = document.getElementById('force-edit-panel');
  if (panel) { panel.dataset.visible = ''; panel.setAttribute('aria-hidden', 'false'); }
}

function hideEditPanel() {
  const panel = document.getElementById('force-edit-panel');
  if (panel) { delete panel.dataset.visible; panel.setAttribute('aria-hidden', 'true'); }
}

// ── Dashboard accordion ────────────────────────────────────────────────────────
document.querySelectorAll('.a-card').forEach(card => {
  const btn = card.querySelector('.a-head');
  btn.addEventListener('click', () => {
    const sec = card.dataset.sec;
    if (activeSection === sec) {
      closeSection();
    } else {
      openSection(sec);
    }
  });
});

function resetGeoSelection() {
  geoSelected = null;
  hideEditPanel();
  document.querySelectorAll('.force-card[data-context="geometry"]').forEach(b => b.setAttribute('aria-pressed', 'false'));
}

function resetComponentSelection() {
  componentTarget = null;
  document.querySelectorAll('.force-card[data-context="components"]').forEach(b => b.setAttribute('aria-pressed', 'false'));
}

function openSection(sec) {
  // Close previous
  document.querySelectorAll('.a-card[data-open]').forEach(c => {
    delete c.dataset.open;
    c.querySelector('.a-head').setAttribute('aria-expanded', 'false');
  });

  activeSection = sec;
  const card = document.querySelector(`.a-card[data-sec="${sec}"]`);
  if (!card) return;
  card.dataset.open = '';
  card.querySelector('.a-head').setAttribute('aria-expanded', 'true');

  resetGeoSelection();
  resetComponentSelection();
  closePopup();

  if (sec === 'components') {
    redraw('components-select');
    updateHint('Select a force below to view its component breakdown');
  } else if (sec === 'horizontal') {
    redraw('horizontal');
    animateHorizontal();
    updateHint('Horizontal components of every active force are summed along X →');
  } else if (sec === 'vertical') {
    redraw('vertical');
    animateVertical();
    updateHint('Vertical components of every active force are summed along Y ↑');
  } else if (sec === 'resultant') {
    redraw('resultant');
    animateResultant();
    updateHint('Resultant R combines ΣFₓ and ΣFᵧ into one vector');
  } else if (sec === 'direction') {
    redraw('direction');
    animateDirection();
    updateHint('R’s direction is a reference angle mapped into the correct quadrant');
  } else if (sec === 'moment') {
    redraw('moment');
    animateMoment();
    updateHint('Moment Mₒ = R × perpendicular distance d');
  } else if (sec === 'geometry') {
    redraw('default');
    updateHint('Select a force below to inspect or adjust it');
  } else {
    redraw('default');
    updateHint('Select a force in the Geometry panel to begin →');
  }

  updateDashboard();
}

function closeSection() {
  document.querySelectorAll('.a-card[data-open]').forEach(c => {
    delete c.dataset.open;
    c.querySelector('.a-head').setAttribute('aria-expanded', 'false');
  });
  activeSection = null;
  resetGeoSelection();
  resetComponentSelection();
  closePopup();
  redraw('default');
  updateHint('Select a force in the Geometry panel to begin →');
}

// ── Force cards (Geometry + Component Resolution both use this one component, Changes 2/7) ─────
document.querySelectorAll('.force-card[data-context="geometry"]').forEach(btn => {
  const toggle = btn.querySelector('.fc-toggle');
  toggle?.addEventListener('click', e => e.stopPropagation()); // don't also (de)select the card
  toggle?.addEventListener('change', e => {
    const vec = state.vectors.find(x => x.id === btn.dataset.vec);
    vec.enabled = e.target.checked;
    redraw(); updateDashboard(); updateLabels();
  });

  function select() {
    const id = btn.dataset.vec;
    if (geoSelected === id) {
      resetGeoSelection();
    } else {
      resetGeoSelection();
      geoSelected = id;
      btn.setAttribute('aria-pressed', 'true');
      showEditPanel(id);
    }
    redraw();
    updateLabels();
  }
  btn.addEventListener('click', e => { if (!e.target.closest('.fc-toggle-wrap')) select(); });
  btn.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.fc-toggle-wrap')) { e.preventDefault(); select(); }
  });
});

document.querySelectorAll('.force-card[data-context="components"]').forEach(btn => {
  function select() {
    const id = btn.dataset.vec;
    const vec = state.vectors.find(x => x.id === id);
    if (!vec.enabled) return; // resolving a zero-contribution force isn't meaningful
    resetComponentSelection();
    componentTarget = id;
    btn.setAttribute('aria-pressed', 'true');
    openComponentPopup(id);
  }
  btn.addEventListener('click', select);
  btn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
  });
});

function fadeExcept(id) {
  const f = { A: 1, B: 1, C: 1, D: 1 };
  for (const k of Object.keys(f)) if (k !== id) f[k] = 0.25;
  return f;
}

// ── Redraw ─────────────────────────────────────────────────────────────────────
function redraw(mode, extra) {
  const computed = computeForces(state);
  const m = mode ?? deriveMode();
  const fade = extra?.fade ?? currentFade();
  const highlight = extra?.highlight ?? currentHighlight();
  draw(state, computed, m, { momentArm: state.momentArm, ...extra, fade, highlight });
  return computed;
}

function deriveMode() {
  if (!activeSection) return 'default';
  const map = {
    geometry: 'default',
    components: componentTarget ? `components-${componentTarget.toLowerCase()}` : 'components-select',
    horizontal: 'horizontal',
    vertical: 'vertical',
    resultant: 'resultant',
    direction: 'direction',
    moment: 'moment',
  };
  return map[activeSection] ?? 'default';
}

// Which single vector (if any) is under inspection right now — Geometry card or Component
// Resolution card, whichever section is open. Drives both the fade map and the glow/thicker
// stroke on the workspace vector (Change 9).
function currentHighlight() {
  if (activeSection === 'geometry' && geoSelected) return geoSelected;
  if (activeSection === 'components' && componentTarget) return componentTarget;
  return null;
}

function currentFade() {
  const h = currentHighlight();
  if (h) return fadeExcept(h);
  if (activeSection === 'resultant' || activeSection === 'direction' || activeSection === 'moment') {
    return { A: 0.25, B: 0.25, C: 0.25, D: 0.25 };
  }
  return undefined;
}

// ── Dashboard value updates ────────────────────────────────────────────────────
function updateDashboard() {
  const c = computeForces(state);

  // Live strip — one glanceable slot per vector
  for (const v of c.vectors) {
    setText(`live-${v.id}`, v.enabled ? `${v.magnitude} N` : 'OFF');
    document.getElementById(`live-item-${v.id}`)?.classList.toggle('live-item--off', !v.enabled);
  }

  // Geometry + Component Resolution cards share the same per-vector stat fields
  for (const v of c.vectors) {
    setText(`geo-${v.id}-mag`, `${v.magnitude} N`);
    setText(`geo-${v.id}-dir`, `${fmt(v.localAngleDeg, 0)}°`);
    document.querySelector(`.force-card[data-context="geometry"][data-vec="${v.id}"]`)?.classList.toggle('force-card--off', !v.enabled);

    setText(`comp-${v.id}-mag`, `${v.magnitude} N`);
    setText(`comp-${v.id}-dir`, `${fmt(v.localAngleDeg, 0)}°`);
    setText(`comp-${v.id}-state`, v.enabled ? 'ON' : 'OFF');
    document.querySelector(`.force-card[data-context="components"][data-vec="${v.id}"]`)?.classList.toggle('force-card--off', !v.enabled);
  }
  if (geoSelected) updateEditPanelAngles();

  // Horizontal / Vertical — N-term signed equations
  const enabled = c.vectors.filter(v => v.enabled);
  renderTermsRow('h-terms-formula', enabled.map(v => ({ id: v.id, val: v.Fx })), t => `F<sub>${t.id}x</sub>`);
  renderTermsRow('h-terms-values',  enabled.map(v => ({ id: v.id, val: v.Fx })), t => fmt(Math.abs(t.val)));
  setText('h-total', fmt(c.Rx));

  renderTermsRow('v-terms-formula', enabled.map(v => ({ id: v.id, val: v.Fy })), t => `F<sub>${t.id}y</sub>`);
  renderTermsRow('v-terms-values',  enabled.map(v => ({ id: v.id, val: v.Fy })), t => fmt(Math.abs(t.val)));
  setText('v-total', fmt(c.Ry));

  // Net Resultant
  setText('r-sub', `√(${fmt(c.Rx)}² + ${fmt(c.Ry)}²)`);
  setText('r-value', fmt(c.R));

  // Resultant Direction — quadrant-aware (ADR-007)
  setText('d-ref', fmt(c.referenceAngleDeg, 0));
  setText('d-actual', fmt(c.actualDirectionDeg, 0));
  setText('d-quadrant', c.resultantQuadrant == null
    ? (c.R < 1e-6 ? 'undefined (R = 0)' : 'on axis')
    : `Quadrant ${['I', 'II', 'III', 'IV'][c.resultantQuadrant - 1]}`);

  // Moment
  const Mo = computeMoment(c.R, state.momentArm);
  setText('m-sub', `${fmt(c.R)} × ${state.momentArm.toFixed(1)}`);
  setText('m-value', fmt(Mo));

  // Sub-row opacity (counters GSAP fade-from-0 start state so re-opening a card without
  // re-running the animation still shows values)
  setOpacity('r-sub-row', 1);
  setOpacity('m-sub-row', 1);
}

// Renders a variable-length signed term list (0–4 terms) sharing one row, e.g.
// "F_Ax − F_Bx + F_Cx". First term shows a leading minus only if negative; every
// subsequent term shows an explicit +/− operator. Each term is colored by its own vector.
function renderTermsRow(containerId, terms, content) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (terms.length === 0) { el.innerHTML = '<span class="eq-val">0</span>'; return; }
  el.innerHTML = terms.map((t, i) => {
    const neg = t.val < 0;
    const sign = i === 0
      ? (neg ? '<span class="eq-op">−</span>' : '')
      : `<span class="eq-op">${neg ? '−' : '+'}</span>`;
    return `${sign}<span class="eq-val" style="color:var(--color-force-${t.id.toLowerCase()})">${content(t)}</span>`;
  }).join('');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setOpacity(id, op) {
  const el = document.getElementById(id);
  if (el) el.style.opacity = op;
}

// ── Label positioning ─────────────────────────────────────────────────────────
function updateLabels() {
  const c = computeForces(state);
  const fade = currentFade() ?? {};

  placeLabel('lbl-origin', -0.18, -0.28, null);
  placeLabel('lbl-x', 5.8, 0, null);
  placeLabel('lbl-y', 0, 5.8, null);

  for (const v of c.vectors) {
    const lbl = document.getElementById(`lbl-vec-${v.id}`);
    if (!lbl) continue;
    if (!v.enabled) { lbl.style.display = 'none'; continue; }
    lbl.style.display = '';
    lbl.style.opacity = fade[v.id] ?? 1; // muted labels for non-highlighted vectors (Change 9)
    const tx = v.Fx * FORCE_SCALE, ty = v.Fy * FORCE_SCALE;
    const [ox, oy] = dirOffset(v.angleRad, 0.3);
    placeLabel(`lbl-vec-${v.id}`, tx + ox, ty + oy, `${v.id} = ${v.magnitude} N`);
  }

  // Faint static quadrant guide labels
  placeLabel('lbl-quad-1', 4, 4, 'I');
  placeLabel('lbl-quad-2', -4, 4, 'II');
  placeLabel('lbl-quad-3', -4, -4, 'III');
  placeLabel('lbl-quad-4', 4, -4, 'IV');

  // R label
  const rLbl = document.getElementById('lbl-r');
  if (rLbl) {
    if (activeSection === 'resultant' || activeSection === 'direction' || activeSection === 'moment') {
      rLbl.style.display = '';
      const rTx = c.Rx * FORCE_SCALE, rTy = c.Ry * FORCE_SCALE;
      const angRad = Math.atan2(c.Ry, c.Rx);
      const [ox, oy] = dirOffset(angRad, 0.35);
      placeLabel('lbl-r', rTx + ox, rTy + oy, `R = ${fmt(c.R)} N`);
    } else {
      rLbl.style.display = 'none';
    }
  }

  // Component labels
  const showComps = activeSection === 'components' && componentTarget;
  const vec = showComps ? c.vectors.find(v => v.id === componentTarget) : null;

  const pxLbl = document.getElementById('lbl-px');
  const pyLbl = document.getElementById('lbl-py');
  if (pxLbl) {
    pxLbl.style.display = showComps ? '' : 'none';
    if (showComps) placeLabel('lbl-px', vec.Fx * FORCE_SCALE / 2, -0.4, `${vec.id}x = ${fmt(vec.Fx)} N`);
  }
  if (pyLbl) {
    pyLbl.style.display = showComps ? '' : 'none';
    if (showComps) placeLabel('lbl-py', vec.Fx * FORCE_SCALE + 0.5, vec.Fy * FORCE_SCALE / 2, `${vec.id}y = ${fmt(vec.Fy)} N`);
  }
}

function dirOffset(angleRad, dist) {
  const perp = angleRad + Math.PI / 2;
  return [dist * Math.cos(perp), dist * Math.sin(perp)];
}

function placeLabel(id, wx, wy, text) {
  const el = document.getElementById(id);
  if (!el) return;
  const s = worldToScreen(wx, wy);
  el.style.left = s.x + 'px';
  el.style.top  = s.y + 'px';
  if (text !== null && text !== undefined) el.textContent = text;
}

function syncInput(slId, nuId, val, isFloat) {
  const sl = document.getElementById(slId);
  const nu = document.getElementById(nuId);
  if (sl) sl.value = val;
  if (nu) nu.value = isFloat ? val.toFixed(1) : val;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Component popup ────────────────────────────────────────────────────────────
// Opened only from a Component Resolution force-card click (Changes 6/7) — the workspace has no
// pointer interaction of its own anymore.
function openComponentPopup(target) {
  const c = computeForces(state);
  const vec = c.vectors.find(v => v.id === target);
  const F   = vec.magnitude;
  const Fx  = vec.Fx;
  const Fy  = vec.Fy;
  const ang = vec.angleDeg;

  const compCard = document.querySelector('.a-card[data-sec="components"]');

  redraw(`components-${target.toLowerCase()}`);
  updateLabels();

  const popup = document.getElementById('popup');
  popup.dataset.visible = '';
  popupVisible = true;

  setText('popup-title', `COMPONENT ANALYSIS — FORCE ${target}`);

  const tipWorldX = Fx * FORCE_SCALE;
  const tipWorldY = Fy * FORCE_SCALE;
  const rect = canvas.getBoundingClientRect();
  const tipS = worldToScreen(tipWorldX, tipWorldY);
  const screenX = rect.left + tipS.x;
  const screenY = rect.top  + tipS.y;

  let px = screenX + 24;
  let py = screenY - 80;
  const pw = 300, ph = 320;
  px = clamp(px, 10, window.innerWidth - pw - 10);
  py = clamp(py, 10, window.innerHeight - ph - 10);
  popup.style.left = px + 'px';
  popup.style.top  = py + 'px';
  popup.style.display = '';

  const angR = ang * Math.PI / 180;
  setText('px-sub-val',  `${F} × cos(${fmt(ang, 0)}°)`);
  setText('px-answer',   fmt(Fx));
  setText('py-sub-val',  `${F} × sin(${fmt(ang, 0)}°)`);
  setText('py-answer',   fmt(Fy));

  document.getElementById('px-lhs').innerHTML     = `${target}<sub>x</sub>`;
  document.getElementById('px-sub-lhs').innerHTML = `${target}<sub>x</sub>`;
  document.getElementById('px-res-lhs').innerHTML = `${target}<sub>x</sub>`;
  document.getElementById('py-lhs').innerHTML     = `${target}<sub>y</sub>`;
  document.getElementById('py-sub-lhs').innerHTML = `${target}<sub>y</sub>`;
  document.getElementById('py-res-lhs').innerHTML = `${target}<sub>y</sub>`;

  // SVG update
  const svgLen = 1.3;
  const svgAngle = -angR; // SVG Y-axis is flipped
  const tx = (svgLen * Math.cos(svgAngle)).toFixed(4);
  const ty = (svgLen * Math.sin(svgAngle)).toFixed(4);
  const txN = Number(tx), tyN = Number(ty);

  const svgF = document.getElementById('sv-force');
  svgF.setAttribute('x2', tx); svgF.setAttribute('y2', ty);
  ['a', 'b', 'c', 'd'].forEach(k => svgF.classList.toggle(`psvg-force--${k}`, target.toLowerCase() === k));

  const svgX = document.getElementById('sv-xcomp');
  svgX.setAttribute('x2', tx); svgX.setAttribute('y2', '0');
  svgX.setAttribute('x1', '0'); svgX.setAttribute('y1', '0');

  const svgY = document.getElementById('sv-ycomp');
  svgY.setAttribute('x1', tx); svgY.setAttribute('y1', '0');
  svgY.setAttribute('x2', tx); svgY.setAttribute('y2', ty);

  const svgDX = document.getElementById('sv-drop-x');
  svgDX.setAttribute('x1', tx); svgDX.setAttribute('y1', ty);
  svgDX.setAttribute('x2', tx); svgDX.setAttribute('y2', '0');

  const svgDY = document.getElementById('sv-drop-y');
  svgDY.setAttribute('x1', tx); svgDY.setAttribute('y1', ty);
  svgDY.setAttribute('x2', '0'); svgDY.setAttribute('y2', ty);

  // Geometry-first labels (Change 8, steps 3 & 5) — placed just clear of each leg, on the side
  // away from the triangle's interior so they never overlap the drawn lines.
  const fxLbl = document.getElementById('sv-fx-label');
  fxLbl.textContent = `${target}x`;
  fxLbl.setAttribute('x', (txN / 2).toFixed(3));
  fxLbl.setAttribute('y', (tyN >= 0 ? -0.16 : 0.24).toFixed(3));

  const fyLbl = document.getElementById('sv-fy-label');
  fyLbl.textContent = `${target}y`;
  fyLbl.setAttribute('x', (txN + (txN >= 0 ? 0.12 : -0.34)).toFixed(3));
  fyLbl.setAttribute('y', (tyN / 2).toFixed(3));

  // Angle arc (revealed later — step 6, "show triangle")
  const arcR = 0.45;
  const arcD = describeArc(0, 0, arcR, 0, -angR);
  document.getElementById('sv-arc').setAttribute('d', arcD);
  document.getElementById('sv-angle-lbl').setAttribute('x', (arcR * 0.75 * Math.cos(-angR / 2)).toFixed(3));
  document.getElementById('sv-angle-lbl').setAttribute('y', (arcR * 0.75 * Math.sin(-angR / 2) + 0.06).toFixed(3));

  // Reset all to opacity 0
  ['sv-force','sv-xcomp','sv-ycomp','sv-drop-x','sv-drop-y','sv-arc','sv-angle-lbl','sv-fx-label','sv-fy-label'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.opacity = '0'; gsap.killTweensOf(el); }
  });
  ['px-formula','px-sub','px-result','py-formula','py-sub','py-result'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.opacity = '0'; gsap.killTweensOf(el); }
  });

  // Animate sequence — geometry fully drawn before either equation appears (Change 8):
  // 1 vector highlight (already applied) → 2 draw Fx leg → 3 label Fx → 4 draw Fy leg →
  // 5 label Fy → 6 show triangle (angle arc) → 7 Fx = F cos θ → 8 Fy = F sin θ.
  const tl = gsap.timeline({ onComplete: () => {
    compCard?.setAttribute('data-done', '');
  }});
  tl.to('#sv-force',     { opacity: 1, duration: 0.4, ease: 'power2.out' })
    .to('#sv-xcomp',     { opacity: 1, duration: 0.45, ease: 'power2.out' }, '+=0.1')
    .to('#sv-fx-label',  { opacity: 1, duration: 0.25 }, '-=0.1')
    .to('#sv-ycomp',     { opacity: 1, duration: 0.45, ease: 'power2.out' }, '+=0.1')
    .to('#sv-drop-x',    { opacity: 0.5, duration: 0.25 }, '-=0.3')
    .to('#sv-fy-label',  { opacity: 1, duration: 0.25 }, '-=0.1')
    .to('#sv-arc',       { opacity: 0.8, duration: 0.3 }, '+=0.1')
    .to('#sv-angle-lbl', { opacity: 1, duration: 0.25 }, '-=0.1')
    .to('#px-formula',   { opacity: 1, duration: 0.3 }, '+=0.15')
    .to('#px-sub',       { opacity: 1, duration: 0.3 })
    .to('#px-result',    { opacity: 1, duration: 0.4, ease: 'power2.out' })
    .to('#py-formula',   { opacity: 1, duration: 0.3 }, '+=0.15')
    .to('#py-sub',       { opacity: 1, duration: 0.3 })
    .to('#py-result',    { opacity: 1, duration: 0.4, ease: 'power2.out' });

  currentTimeline = tl;
}

function closePopup() {
  const popup = document.getElementById('popup');
  delete popup.dataset.visible;
  popupVisible = false;
  if (currentTimeline) { currentTimeline.kill(); currentTimeline = null; }
}

document.getElementById('popup-close').addEventListener('click', () => {
  closePopup();
  if (activeSection === 'components') {
    resetComponentSelection();
    redraw('components-select');
    updateHint('Select a force below to view its component breakdown');
  }
});

// ── Section animations ─────────────────────────────────────────────────────────
function animateHorizontal() {
  killTimeline();
  const tl = gsap.timeline({ onComplete: () => {
    document.querySelector('.a-card[data-sec="horizontal"]')?.setAttribute('data-done', '');
  }});
  tl.fromTo('#h-terms-formula', { opacity: 0 }, { opacity: 1, duration: 0.35 })
    .fromTo('#h-terms-values',  { opacity: 0 }, { opacity: 1, duration: 0.35 }, '-=0.1')
    .fromTo('#h-total',         { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, '+=0.15');
  currentTimeline = tl;
}

function animateVertical() {
  killTimeline();
  const tl = gsap.timeline({ onComplete: () => {
    document.querySelector('.a-card[data-sec="vertical"]')?.setAttribute('data-done', '');
  }});
  tl.fromTo('#v-terms-formula', { opacity: 0 }, { opacity: 1, duration: 0.35 })
    .fromTo('#v-terms-values',  { opacity: 0 }, { opacity: 1, duration: 0.35 }, '-=0.1')
    .fromTo('#v-total',         { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, '+=0.15');
  currentTimeline = tl;
}

function animateResultant() {
  killTimeline();
  const tl = gsap.timeline({ onComplete: () => {
    document.querySelector('.a-card[data-sec="resultant"]')?.setAttribute('data-done', '');
  }});
  tl.fromTo('#r-sub-row', { opacity: 0 }, { opacity: 1, duration: 0.4 })
    .fromTo('#r-value',   { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power3.out' }, '+=0.2');
  currentTimeline = tl;
}

function animateDirection() {
  killTimeline();
  const tl = gsap.timeline({ onComplete: () => {
    document.querySelector('.a-card[data-sec="direction"]')?.setAttribute('data-done', '');
  }});
  tl.fromTo('#d-ref',      { opacity: 0 }, { opacity: 1, duration: 0.4 })
    .fromTo('#d-actual',   { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power3.out' }, '+=0.1')
    .fromTo('#d-quadrant', { opacity: 0 }, { opacity: 1, duration: 0.35 }, '-=0.1');
  currentTimeline = tl;
}

function animateMoment() {
  killTimeline();
  const tl = gsap.timeline({ onComplete: () => {
    document.querySelector('.a-card[data-sec="moment"]')?.setAttribute('data-done', '');
  }});
  tl.fromTo('#m-sub-row', { opacity: 0 }, { opacity: 1, duration: 0.4 })
    .fromTo('#m-value',   { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power3.out' }, '+=0.2');
  currentTimeline = tl;
}

function killTimeline() {
  if (currentTimeline) { currentTimeline.kill(); currentTimeline = null; }
}

// ── Hint text ─────────────────────────────────────────────────────────────────
function updateHint(text) {
  const el = document.getElementById('ws-hint');
  if (el) el.textContent = text;
}

// ── SVG arc helper ─────────────────────────────────────────────────────────────
function describeArc(cx, cy, r, startAngle, endAngle) {
  const s = { x: cx + r * Math.cos(startAngle), y: cy + r * Math.sin(startAngle) };
  const e = { x: cx + r * Math.cos(endAngle),   y: cy + r * Math.sin(endAngle) };
  const large = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  const sweep = endAngle > startAngle ? 1 : 0;
  return `M ${s.x.toFixed(4)} ${s.y.toFixed(4)} A ${r} ${r} 0 ${large} ${sweep} ${e.x.toFixed(4)} ${e.y.toFixed(4)}`;
}

// ── Platform contract: window.simAPI (pause/resume/reset — the only reset path) ─
function doReset() {
  state.vectors = DEFAULT_STATE.vectors.map(v => ({ ...v }));
  state.momentArm = DEFAULT_STATE.momentArm;

  for (const v of state.vectors) {
    const cb = document.querySelectorAll(`.force-card[data-vec="${v.id}"] .fc-toggle`);
    cb.forEach(el => { el.checked = v.enabled; });
  }
  syncInput('sl-arm', 'nu-arm', state.momentArm, true);

  resetGeoSelection();
  resetComponentSelection();
  closeSection();
  openSection('geometry');
}

window.simAPI = {
  pause()  { simPaused = true; },
  resume() { simPaused = false; },
  reset()  { doReset(); },
};

// ── Reset control (ghost button, two-state confirm — §2.19) ───────────────────
const btnReset     = document.getElementById('btn-reset');
const resetConfirm = document.getElementById('reset-confirm');
const rcYes        = document.getElementById('rc-yes');
const rcCancel     = document.getElementById('rc-cancel');

btnReset?.addEventListener('click', () => {
  resetConfirm.dataset.armed = '';
  btnReset.style.display = 'none';
});
rcCancel?.addEventListener('click', () => {
  delete resetConfirm.dataset.armed;
  btnReset.style.display = '';
});
rcYes?.addEventListener('click', () => {
  delete resetConfirm.dataset.armed;
  btnReset.style.display = '';
  window.simAPI.reset();
});

// ── Mobile notice (dismissible, platform contract §1.13) ───────────────────────
document.getElementById('mobile-notice-close')?.addEventListener('click', () => {
  document.getElementById('mobile-notice').dataset.dismissed = '';
});

// ── Render loop ───────────────────────────────────────────────────────────────
(function loop(ts) {
  requestAnimationFrame(loop);
  if (simPaused) return;
  tick();
  updateLabels();
}(0));

// ── Boot ──────────────────────────────────────────────────────────────────────
(function boot() {
  redraw('default');
  updateDashboard();
  updateLabels();

  // Open geometry card by default
  setTimeout(() => {
    openSection('geometry');
  }, 300);
}());
