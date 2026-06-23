# IMPLEMENTATION PLAN — Resultant of Forces
**Simatrix Engineering Mechanics · Module 1 · Simulation 2**

> This plan is for review and approval before any code is written.
> Phases are listed in recommended build order, not by feature name.
> Each phase must pass its own testing strategy before the next phase begins.

---

## Build Order

```
Phase 1 → Phase 2 → Phase 5 → Phase 4 → Phase 6 → Phase 3 → Phase 7 → Phase 8 → Phase 9
Scene      Vectors   Resultant  Parallgm   Triangle   Tugboat    Stepper    Hooks     A11y
```

Phases 1 and 2 produce a working two-vector diagram. Phase 5 adds the resultant — this makes the simulation testable against VALIDATION.md before any narrative or educational flow is wired up. Phase 7 is last because it depends on everything below it being stable.

---

## Phase 1 — Scene Setup

### Files Required

| File | Status | Role |
|------|--------|------|
| `index.html` | New | Canvas element, label overlay container, step rail skeleton |
| `style.css` | New | CSS custom properties from DESIGN tokens, viewport layout, label positioning |
| `src/sceneSetup.js` | New | Three.js renderer, camera, resize, utility functions |
| `main.js` | New | rAF loop entry point |

### Components Required

- **Three.js WebGLRenderer** with `antialias: true` and `setPixelRatio(Math.min(devicePixelRatio, 2))`
- **OrthographicCamera** with dynamic frustum calculated from `VIEW_H = 4.5` and canvas aspect ratio
  - `VIEW_H` is larger than vector-resolution's `3.5` to accommodate the parallelogram construction which extends beyond the force vectors themselves
- **cssVar(name)** utility — reads CSS custom properties via `getComputedStyle(document.documentElement)` at runtime; never hard-codes hex values
- **REDUCED_MOTION flag** — read once at startup from `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- **FORCE_SCALE constant** — `0.015` scene units per Newton (100 N → 1.5 scene units). This is smaller than vector-resolution's `0.02` to keep the parallelogram construction within the viewport bounds at high magnitudes
- **resize()** — recalculates camera frustum and renderer size on `window.resize`
- **Background grid** — `LineSegments` with `--color-border` at 38% opacity
- **Axes** — two `ArrowHelper` instances (X and Y) with origin ring; color from `--color-ink-secondary`
- **clearDyn()** — disposes all dynamic geometry and materials, clears the `dynObjects` registry
- **tick()** — called every rAF frame; advances animation state and triggers a redraw
- **worldToScreen(wx, wy)** — projects scene coordinates to canvas pixel coordinates for HTML label positioning

### CSS Custom Properties to Define

All of the following must be declared on `:root` in `style.css`:

```
--color-paper, --color-panel, --color-ink, --color-ink-secondary
--color-accent, --color-accent-soft, --color-accent-strong
--color-border, --color-bench-grey, --color-track
--color-success, --color-success-soft
--color-force-p        (#c0392b — applied force red)
--color-force-q        (#bc5d1e — VP amber)
--color-force-resultant (#546e7a — blue-grey resultant)
--color-construction   (#938b7b — bench grey for ghost lines)
--radius-xs, --radius-sm, --radius-md
```

### Mathematical Logic Required

Camera frustum at resize:

```
aspect = canvas.clientWidth / canvas.clientHeight
camera.left   = -VIEW_H * aspect
camera.right  =  VIEW_H * aspect
camera.top    =  VIEW_H
camera.bottom = -VIEW_H
```

The maximum arrow length at `FORCE_SCALE = 0.015` and `P = 500 N` is `7.5` scene units. At `VIEW_H = 4.5`, this is taller than the viewport. The slider maximum should be set to `300 N` during Phase 2, or `VIEW_H` increased to `5.5`. This needs a decision before coding Phase 2.

> **Decision needed before Phase 2:** Set maximum force magnitude to 300 N (keeping VIEW_H = 4.5) or set VIEW_H = 5.5 (allowing up to 500 N). Recommended: 300 N max for clean viewport. VALIDATION.md uses max 500 N in one case (B8 = 300 N + 400 N). Suggest VIEW_H = 6.5 to be safe, or reduce FORCE_SCALE to 0.010.

### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Camera frustum too small for large forces + parallelogram | High | Finalize FORCE_SCALE and VIEW_H together before writing any arrow code |
| CSS variable missing at Three.js read time (returns empty string) | Medium | Add a console warning in cssVar() if the returned string is empty |
| `window.resize` not firing on canvas-only resize | Low | Use `ResizeObserver` on the canvas element rather than `window.resize` |
| devicePixelRatio > 2 on some displays causing performance drop | Low | Cap at 2 with `Math.min(devicePixelRatio, 2)` |

### Testing Strategy

- Open browser, confirm canvas renders warm off-white background (paper color)
- Confirm grid and X/Y axes are visible
- Resize the window — confirm camera adjusts and grid fills the new dimensions without stretching
- Open DevTools Console — zero errors
- Confirm `cssVar('--color-force-p')` returns `#c0392b` (or equivalent) in the console

---

## Phase 2 — Vector Rendering

### Files Required

| File | Status | Role |
|------|--------|------|
| `src/sceneSetup.js` | Extend | Add arrow builders, angle arc, drag handle, label positions |
| `src/vectorMath.js` | New | resolve() for individual vector components |
| `main.js` | Extend | State object, update loop wiring |

### Components Required

**makeThickArrow(dx, dy, length, colorHex)**
Mesh-based arrow (CylinderGeometry shaft + ConeGeometry head). Two size variants:

- **Force P and Q**: shaft radius `0.040`, head radius `0.115` (same as vector-resolution)
- **Force R** (used from Phase 5): shaft radius `0.060`, head radius `0.150`

The function signature takes a direction vector and length, not start/end points. Origin is always `(0, 0, 0)` for P and Q.

**makeAngleArc(pAngleDeg, thetaDeg, radius)**
Arc drawn from `pAngleDeg` to `pAngleDeg + thetaDeg`. This is different from vector-resolution where the arc always starts at 0°. Here it starts at P's absolute angle. Color: `--color-bench-grey` at 70% opacity. Suppressed when `thetaDeg < 1` or `thetaDeg > 179`.

**makeDragHandle(x, y, hovered)**
Circle ring at a vector tip, for mouse/touch dragging. Same implementation as vector-resolution.

**HTML Label Overlay System**
Labels are `<span>` elements with `position: absolute` inside a container that covers the canvas. The `updateLabels(state, visSet, worldToScreen)` function repositions them each frame.

Labels required for this phase: `label-p`, `label-q`, `label-theta`, `label-x`, `label-y`, `label-origin`.

**State Object (initial)**

```javascript
{
  magnitudeP: 100,    // N
  magnitudeQ: 100,    // N
  thetaDeg: 45,       // degrees between P and Q
  pAngleDeg: 0,       // P is fixed along positive X-axis
  view: 'parallelogram'
}
```

**Derived at render time (never stored in state):**

```javascript
const rad = θ * Math.PI / 180;
const pRad = pAngleDeg * Math.PI / 180;
const qRad = (pAngleDeg + thetaDeg) * Math.PI / 180;

const px = magnitudeP * Math.cos(pRad);
const py = magnitudeP * Math.sin(pRad);
const qx = magnitudeQ * Math.cos(qRad);
const qy = magnitudeQ * Math.sin(qRad);

// Scene positions
const spx = px * FORCE_SCALE;   // tip of P in scene units
const spy = py * FORCE_SCALE;
const sqx = qx * FORCE_SCALE;   // tip of Q in scene units
const sqy = qy * FORCE_SCALE;
```

### Mathematical Logic Required

`resolve(magnitude, angleDeg)` from vector-resolution is reused directly:

```javascript
export function resolve(magnitude, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { magnitude, angle: angleDeg, fx: magnitude * Math.cos(rad), fy: magnitude * Math.sin(rad) };
}
```

Called twice per frame: once for P (with `pAngleDeg`) and once for Q (with `pAngleDeg + thetaDeg`).

### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Angle arc starting from wrong reference (0° instead of pAngleDeg) | High | P is fixed at 0° in initial state so this won't manifest until pAngleDeg support is added — but the arc function must be written correctly from the start |
| Label for θ appearing at wrong position (at origin instead of arc midpoint) | Medium | θ label sits at angle `pAngleDeg + thetaDeg/2` at radius `0.75` scene units |
| P and Q arrows too short to read at minimum magnitudes | Low | Suppress arrowhead label when length < 0.1 scene units |
| Drag handle for arrowhead overlapping when P and Q point in similar directions | Medium | Only one arrow at a time has an active drag handle |

### Testing Strategy

- Confirm P arrow is red, Q arrow is amber, and they are visually distinct
- Drag each slider — confirm corresponding arrow updates in real time
- Confirm angle arc appears between P and Q (not between P and the X-axis when P is off-axis)
- Confirm `θ = {value}°` label is near the arc midpoint, not at the axis
- Confirm `P = {value} N` and `Q = {value} N` labels appear at respective arrow tips
- Test θ = 0°: arc disappears, no error
- Test θ = 180°: arc disappears, no error

---

## Phase 3 — Tugboat Scenario

### Files Required

| File | Status | Role |
|------|--------|------|
| `src/sceneSetup.js` | Extend | Tugboat draw mode: boat polygons, ship polygon, dashed direction line |
| `src/steps.js` | New (partial) | Step 1 definition and visSet |

### Components Required

**Tugboat Scene Objects** (drawn only when `visSet.has('tugboatScene')`)

- **Boat A silhouette**: flat polygon shape (6–8 vertices), positioned upper-left of scene center
- **Boat B silhouette**: same polygon shape, mirrored, positioned lower-left
- **Ship silhouette**: wider flat polygon, centered at origin
- **Force P arrow**: red thick arrow from ship center pointing toward Boat A
- **Force Q arrow**: amber thick arrow from ship center pointing toward Boat B
- **Dashed resultant suggestion**: a dashed line from the ship center in the R direction, bench-grey

All shapes use `MeshBasicMaterial` (no lighting). Boat fill: `--color-geometry-fill`. Boat outline: `--color-ink` (1px `LineLoop`). Ship fill: `--color-panel`. Ship outline: `--color-ink-secondary`.

No photographs, SVGs, or external assets. All geometry is constructed with Three.js primitives.

**Tugboat fixed positions** (not user-controllable):

```
Boat A: centered at (-3.0, 1.8) in scene units
Boat B: centered at (-2.5, -2.0) in scene units
Ship:   centered at (0, 0) — origin
P arrow direction: toward Boat A from origin
Q arrow direction: toward Boat B from origin
```

Narrative arrow magnitudes are fixed (e.g. P = 120 N, Q = 100 N) — sliders have no effect in Step 1.

### Mathematical Logic Required

Boat polygon vertices are defined in local object space and positioned with `group.position.set(x, y, 0)`.

Dashed direction suggestion line: Uses `LineDashedMaterial`. Direction is the average of P and Q directions (not the true resultant — the direction will look approximately correct without revealing the formula).

### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Tugboat shapes looking too abstract or unrecognizable | Medium | Use a boat profile with a clear flat bottom, angled bow, and small cabin block — minimum 6 vertices |
| Dashed direction line revealing the resultant angle too precisely (undermining the narrative tension) | Low | Set the dashed line direction to the visual midpoint of P and Q, not the mathematically correct R |
| Tugboat scene lingering when transitioning to Step 2 | Medium | clearDyn() called on every step change — visSet for Step 2 does not include 'tugboatScene' |

### Testing Strategy

- Navigate to Step 1 — confirm two boat shapes and one ship shape visible
- Confirm P arrow (red) points from ship toward Boat A
- Confirm Q arrow (amber) points from ship toward Boat B
- Confirm no slider, no equation, no formula appears anywhere
- Move to Step 2 — confirm tugboat scene completely disappears, replaced by clean force diagram
- Navigate back to Step 1 — confirm tugboat scene reappears

---

## Phase 4 — Parallelogram Construction

### Files Required

| File | Status | Role |
|------|--------|------|
| `src/sceneSetup.js` | Extend | Ghost line drawing, 3-phase animation state machine |
| `src/steps.js` | Extend | Step 3 visSet and animation trigger |

### Components Required

**makeDashedArrow(fromVec3, toVec3, colorHex)**
Dashed line segment with a small solid arrowhead at the destination. Reuses `makeComponentArrow` pattern from vector-resolution but renamed. Color: `--color-construction`. Opacity: `0.55`. Dash size `0.18`, gap size `0.09`.

**Parallelogram Animation State Machine**

Three-phase sequential animation (distinct from vector-resolution's two-phase component animation):

```
Phase A: 0 → 400ms    Ghost Q grows from tip of P
Phase B: 400 → 800ms  Ghost P grows from tip of Q
Phase C: 800 → 1300ms Diagonal R grows from origin
Total: 1300ms
```

State: `{ startTime, phase: 'A' | 'B' | 'C' | 'done' }` and a `diagProgress` float (0→1) for the diagonal.

Each phase uses `easeOutCubic(t)` for natural growth.

**Ghost Line Positions**

```
Ghost Q (from tip of P): origin=(spx, spy), destination=(spx + sqx, spy + sqy)
Ghost P (from tip of Q): origin=(sqx, sqy), destination=(spx + sqx, spy + sqy)
Diagonal: origin=(0, 0), destination=(spx + sqx, spy + sqy)
```

Note: the diagonal is the embryonic R — it is NOT labeled and NOT colored as R in Step 3. It uses `--color-bench-grey` or a slightly darker construction color. It becomes the full R arrow only in Step 4.

**Degenerate Cases (must suppress parallelogram)**

```
if (thetaDeg < 1 || thetaDeg > 179) → suppress ghost lines entirely
```

### Mathematical Logic Required

Ghost line endpoints depend on the state (magnitudeP, magnitudeQ, thetaDeg) and must update continuously when sliders change — even after the animation completes. After `phase === 'done'`, the ghost lines are redrawn at full progress on every frame.

Animation progress per phase:

```javascript
const elapsed = performance.now() - startTime;

// Phase A: grows ghost Q (0→400ms)
const tA = Math.min(1, elapsed / 400);
const progA = easeOutCubic(tA);

// Phase B: grows ghost P (400→800ms)  
const tB = Math.max(0, Math.min(1, (elapsed - 400) / 400));
const progB = easeOutCubic(tB);

// Phase C: grows diagonal (800→1300ms)
const tC = Math.max(0, Math.min(1, (elapsed - 800) / 500));
const progC = easeOutCubic(tC);
```

Ghost Q at progress `progA`:

```
from: (spx, spy)
to:   (spx + sqx * progA, spy + sqy * progA)
```

Ghost P at progress `progB`:

```
from: (sqx, sqy)
to:   (sqx + spx * progB, sqy + spy * progB)
```

Diagonal at progress `progC`:

```
from: (0, 0)
to:   ((spx + sqx) * progC, (spy + sqy) * progC)
```

### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Animation restarts every frame instead of playing once | High | Store animation start time in a module-level variable; only set it when entering Step 3 fresh, not on every drawDyn() call |
| Slider drag during animation causes ghost lines to glitch (animation progress conflicts with live position) | Medium | After animation reaches `done`, always redraw ghost lines at full progress using current state — no animation dependency |
| Diagonal in Step 3 being misread as the final Resultant R | Medium | Use construction color (bench-grey) for diagonal in Step 3, upgrade to full R color/thickness only in Step 4's visSet |
| Ghost lines appearing in Step 2 (before Step 3) | Low | visSet system prevents this — ghost lines only in steps 3, 4, 5 |

### Testing Strategy

- Navigate to Step 3 — watch animation play through 3 phases sequentially
- Confirm ghost lines are dashed, bench-grey, lower opacity than P and Q
- Drag θ slider after animation completes — confirm parallelogram reshapes live
- Enable `prefers-reduced-motion` — confirm parallelogram appears instantly
- Test θ = 0° — confirm no ghost lines drawn, no crash
- Test θ = 180° — confirm no ghost lines drawn, no crash
- Navigate back to Step 2 and forward to Step 3 again — confirm animation replays

---

## Phase 5 — Resultant Calculation

### Files Required

| File | Status | Role |
|------|--------|------|
| `src/vectorMath.js` | Extend | resultant() function |
| `src/sceneSetup.js` | Extend | R arrow drawing (thick, blue-grey), alpha label |
| `src/uiManager.js` | New (partial) | Equations panel builder and live updater |
| `src/steps.js` | Extend | Step 4 visSet |

### Components Required

**resultant(magnitudeP, magnitudeQ, thetaDeg, pAngleDeg)**

Returns a result object:

```javascript
{
  R,           // magnitude of resultant (N)
  alpha,       // angle of R measured from P (degrees)
  rAngle,      // absolute angle of R from X-axis (degrees) = pAngleDeg + alpha
  Rx, Ry,      // scene-ready X/Y components of R (in Newtons, scale separately)
  valid,       // boolean: false when R = 0 (P=Q=0 or P=Q at 180°)
}
```

**Equations Panel**

HTML element with `aria-live="polite"`. Shows:

```
P = {value} N
Q = {value} N
θ = {value}°

R = √(P² + Q² + 2PQ cos θ)
R = {value} N

α = arctan(Q sin θ / (P + Q cos θ))
α = {value.1}°
```

Values use IBM Plex Mono via `--typography-value`. The symbolic formula rows are static text; only the value rows update.

**R Arrow**

Drawn only when `result.valid === true` and `visSet.has('resultantR')`. Uses `makeThickArrow` with shaft radius `0.060` and head radius `0.150`. Color: `--color-force-resultant`.

**Labels added in this phase**: `label-r`, `label-alpha`.

### Mathematical Logic Required

**Core computation:**

```javascript
export function resultant(P, Q, thetaDeg, pAngleDeg = 0) {
  const theta = thetaDeg * Math.PI / 180;
  const pRad  = pAngleDeg * Math.PI / 180;
  const qRad  = pRad + theta;

  const Px = P * Math.cos(pRad);
  const Py = P * Math.sin(pRad);
  const Qx = Q * Math.cos(qRad);
  const Qy = Q * Math.sin(qRad);

  const Rx = Px + Qx;
  const Ry = Py + Qy;
  const R  = Math.sqrt(Rx * Rx + Ry * Ry);

  // alpha: angle of R measured from P direction (in degrees)
  // Using atan2 to handle all quadrants correctly
  const alphaDeg = Math.atan2(Q * Math.sin(theta), P + Q * Math.cos(theta)) * 180 / Math.PI;

  const rAngleDeg = Math.atan2(Ry, Rx) * 180 / Math.PI;

  return {
    R,
    alpha: alphaDeg,
    rAngle: rAngleDeg,
    Rx, Ry,
    valid: R > 0.01,  // suppress arrow when R is effectively zero
  };
}
```

**Critical note on atan2 vs arctan:**

The formula written in VALIDATION.md as `arctan(Q sin θ / (P + Q cos θ))` must be implemented as `Math.atan2(Q * sin(θ), P + Q * cos(θ))` — not `Math.atan(...)`. The `atan2` form handles the case where `P + Q cos θ = 0` (which occurs when P = Q and θ = 180°) without dividing by zero, and correctly determines the quadrant of α.

**Verification crosscheck (used in Phase 8 validation hooks):**

```
R_parallelogram = √(P² + Q² + 2PQ cos θ)
R_component     = √(Rx² + Ry²)
|R_parallelogram - R_component| must be < 0.01
```

Both formulas must agree. The implementation uses the component method (Rx = Px + Qx) as the single source of truth and derives R from it. The parallelogram formula is used only to verify in Phase 8.

### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Using Math.atan instead of Math.atan2 for alpha | High | Explicitly use Math.atan2(Q sin θ, P + Q cos θ) and document why |
| R arrow appearing in Step 3 (before it should) | Medium | visSet for Step 3 must NOT include 'resultantR' |
| R arrow thickness visually indistinguishable from P/Q | Medium | Test at multiple magnitudes; shaft 0.060 vs 0.040 is a 50% increase |
| alpha label showing NaN or undefined when R = 0 | High | Guard: when `result.valid === false`, hide the alpha label entirely |
| Equations panel appearing in Steps 1, 2, or 3 | Medium | visSet system; equations panel is HTML — controlled by step card build, not visSet |

### Testing Strategy

Run VALIDATION.md test cases manually in this order:

1. A5: P=100, Q=100, θ=90° → R should display 141 N
2. A6: P=100, Q=100, θ=120° → R should display 100 N exactly
3. A8: P=100, Q=100, θ=180° → R should display 0 N, no R arrow
4. B8: P=300, Q=400, θ=90° → R should display 500 N
5. D3: equal forces at 120° → R equals either force magnitude

Check that the equations panel updates within one frame of every slider movement (no lag visible between slider position and displayed value).

---

## Phase 6 — Triangle Law Transformation

### Files Required

| File | Status | Role |
|------|--------|------|
| `src/sceneSetup.js` | Extend | Triangle view drawing mode, Q translation animation |
| `src/uiManager.js` | Extend | Toggle control builder (Parallelogram / Triangle) |
| `src/steps.js` | Extend | Step 5 definition with toggle control |

### Components Required

**Triangle View Draw Mode**

When `state.view === 'triangle'`:

- P drawn from origin → `(spx, spy)` — unchanged
- Q drawn from `(spx, spy)` → `(spx + sqx, spy + sqy)` — translated to tip of P
- R drawn from origin → `(spx + sqx, spy + sqy)` — closing vector
- Parallelogram ghost lines: hidden
- Angle arc (θ): hidden
- θ label: replaced with a note label "Q placed tip-to-tail on P"

**Triangle Transition Animation**

Triggered when the toggle switches from `parallelogram` → `triangle`. Not re-triggered on subsequent slider changes.

```
Phase 1 (0→600ms): Q translates from (sqx, sqy) to (spx + sqx, spy + sqy)
                   using easeOutCubic interpolation
Phase 2 (600→1000ms): R closing vector grows from origin
```

The interpolated Q tail position during animation:

```javascript
const qTailX = sqx + (spx) * easedProgress;   // tail moves from (sqx, sqy) to (spx+sqx, spy+sqy)
const qTailY = sqy + (spy) * easedProgress;
const qTipX  = qTailX + sqx;
const qTipY  = qTailY + sqy;
```

Wait — this needs re-examination. Q's tail moves from origin to the tip of P. Q keeps its length and direction. So:

```
Q tail at t=0: (0, 0)  [origin]
Q tail at t=1: (spx, spy)  [tip of P]
Q tip  at t=0: (sqx, sqy)
Q tip  at t=1: (spx + sqx, spy + sqy)
```

Interpolated: `tail = lerp((0,0), (spx, spy), easedT)`. Q arrow is drawn from `tail` to `tail + (sqx, sqy)`.

Under `REDUCED_MOTION`: transition is instant — Q jumps to tip of P, R closes immediately.

**Toggle Control**

A two-option button group (not a checkbox, not a dropdown). Options: `Parallelogram` | `Triangle`. Ghost button style from DESIGN.shared.md. Clicking either option sets `state.view` and triggers the appropriate animation.

The toggle is a UI control, not a scene element. It appears in the step card controls area.

**State change on toggle:**

- `state.view` changes: `'parallelogram'` ↔ `'triangle'`
- `magnitudeP`, `magnitudeQ`, `thetaDeg` are NOT reset or changed

### Mathematical Logic Required

The R arrow in triangle view uses the same `(spx + sqx, spy + sqy)` endpoint as the parallelogram diagonal. It is geometrically identical. No new formula is needed.

The closing vector in triangle view is:

```
from: (0, 0)
to:   (spx + sqx, spy + sqy)
```

This is the same direction and magnitude as the parallelogram diagonal and the resultant R from Phase 5. The `resultant()` function output does not change between views.

### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Toggle resetting P, Q, θ values | High | Toggle must only change `state.view`, nothing else |
| Ghost triangle Q arrow persisting in parallelogram view | Medium | clearDyn() runs on every drawDyn() call — no persistent objects |
| Equations panel showing different R value between views | Low | Both views use the same `resultant()` output — values are identical |
| Toggle animation replaying when slider is dragged during triangle view | Medium | Animation state is separate from draw state; once transition is done, slider drag redraws triangle at full progress |
| Q arrow visually disappearing at the start of the translation animation | Low | Q tail starts at origin (0,0) and the Q arrow draws from tail → tip, which is already correct at t=0 |

### Testing Strategy

- Enter Step 5 in parallelogram view
- Note the displayed R value
- Click Triangle toggle — watch Q translate to tip of P
- Confirm R closing vector has same magnitude as the parallelogram diagonal (same displayed value)
- Drag the P slider while in triangle view — confirm the triangle updates correctly
- Click Parallelogram toggle — confirm scene returns to parallelogram layout
- Toggle 5 times rapidly — confirm no ghost elements, no duplicated arrows
- Enable `prefers-reduced-motion` — confirm toggle switches instantly with no animation

---

## Phase 7 — Educational Stepper

### Files Required

| File | Status | Role |
|------|--------|------|
| `src/steps.js` | Complete | All 6 step definitions: id, title, lead, hint, controls, scene visSet, equations flag, insight, conceptCheck |
| `src/uiManager.js` | Complete | UIManager class, buildRail(), buildStepCard(), _makeSlider(), equations panel, insight callout, preset buttons |
| `index.html` | Complete | Full HTML shell: step rail, step card, viewport, label overlay, navigation buttons |
| `main.js` | Complete | State management, step navigation, event wiring, rAF loop |

### Components Required

**STEPS array (6 entries)**

Each step defines:

```javascript
{
  id: number,           // 1–6
  title: string,        // step card title
  lead: string,         // one-sentence explanation
  hint: string | null,  // hint callout text
  guidance: string | null,
  controls: string[],   // ['magnitudeP', 'magnitudeQ', 'theta', 'viewToggle', 'presets']
  scene: Set,           // visSet — which scene objects to draw
  showEquations: boolean,
  whatYouSee: string | null,  // collapsible disclosure
  realWorld: string | null,   // collapsible disclosure
  conceptCheck: object | null,
  insight: boolean,     // Step 6 insight callout
  animateOnEnter: string | null,  // 'parallelogram' | 'triangle' | null
}
```

**Step ↔ visSet mapping:**

| Step | visSet contents |
|------|----------------|
| 1 | `tugboatScene` |
| 2 | `grid`, `axes`, `forceP`, `forceQ`, `angleArc`, `labelP`, `labelQ`, `labelTheta` |
| 3 | Step 2 + `parallelogram` |
| 4 | Step 3 + `resultantR`, `labelR`, `labelAlpha` |
| 5 | Step 4 (parallelogram or triangle view based on toggle) |
| 6 | Step 4 (same as Step 5, with insight callout in UI) |

**UIManager — new methods vs. reused:**

| Method | Status | Notes |
|--------|--------|-------|
| `buildRail(currentIndex)` | Reuse from VR | Change STEPS import to this simulation's steps |
| `buildStepCard(step, state)` | Reuse + extend | Add toggle control, preset buttons, insight callout |
| `_makeSlider(options)` | Reuse exactly | No changes needed |
| `updateReadouts(state)` | Extend | Add P, Q slider sync in addition to angle |
| `updateLabels(state, visSet, worldToScreen)` | Rewrite | New label IDs (label-p, label-q, label-r, label-theta, label-alpha) |
| `_makeEquations(state, result)` | Rewrite | New formula structure (resultant equations, not resolution equations) |
| `_updateEquations(state, result)` | Rewrite | Update R and α in addition to P, Q, θ |
| `_makeInsightCallout()` | New | Accent-soft callout, updates text dynamically |
| `_updateInsight(thetaDeg, magnitudeP, magnitudeQ)` | New | Maps angle ranges to insight strings from DESIGN.md |
| `_makePresetButtons()` | New | 4 ghost buttons: θ=0°, θ=90°, P=Q θ=120°, θ=180° |
| `_buildConceptCheck(check)` | Reuse exactly | If concept checks are added to any step |

**Step 6 Insight Callout Thresholds:**

```javascript
function getInsightText(thetaDeg, P, Q) {
  const t = thetaDeg;
  if (t < 1)                      return "Forces aligned — R is at its maximum: R = P + Q.";
  if (t < 55)                     return "Angle is small — the forces mostly reinforce each other. R is close to P + Q.";
  if (t >= 55 && t <= 65 && P === Q) return "At 60°, R = P√3 when P = Q. The resultant is √3 times either force.";
  if (t >= 55 && t <= 65)         return "At θ ≈ 60°, the forces combine to produce R = √(P² + Q² + PQ).";
  if (t >= 85 && t <= 95)         return "Perpendicular forces — R = √(P² + Q²). This is the Pythagorean theorem.";
  if (t >= 115 && t <= 125 && Math.abs(P - Q) < 5) return "Equal forces at 120° — R equals either force. A key textbook result.";
  if (t > 95 && t < 179)          return "Large angle — forces partially oppose each other. R is decreasing.";
  if (t >= 179)                   return "Forces directly opposed — R = |P − Q|. If P = Q, the resultant is zero.";
  return `At θ = ${Math.round(t)}°: observe how R changes as you move the slider.`;
}
```

**Main.js Structure:**

```
1. Import Three.js, sceneSetup, vectorMath, UIManager, STEPS
2. Initialize scene (Phase 1)
3. Initialize UI manager
4. Define initial state
5. Define update(state) — computes result, calls scene.update(), ui.updateReadouts(), ui.updateLabels()
6. Wire events: Next/Back buttons, slider callbacks, toggle callback, preset callbacks
7. Define goToStep(index) — builds step card, triggers animation if needed, calls update()
8. Start rAF loop: calls scene.tick() then renderer.render() each frame
9. goToStep(0) to initialize
```

### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Controls from a previous step remaining visible when navigating forward | High | Rebuild the entire controls area on every `buildStepCard()` call — never show/hide individual controls |
| Step 6 preset buttons not restoring the insight callout text after being clicked | Medium | Preset buttons fire a `state` change that triggers `update()` which triggers `_updateInsight()` |
| "Start Over" on Step 6 Next button not resetting state to defaults | Medium | In `goToStep(0)`, explicitly reset state to initial values before building Step 1 |
| Step rail aria-label not announcing step changes to screen readers | Medium | Wrap step counter in `aria-live="polite"` |
| Back button navigating to Step 0 (non-existent) | Low | Disable Back button on Step 1 — `btn.disabled = step.id === 1` |

### Testing Strategy

- Complete the full educational flow from Step 1 to Step 6 using only the Next button
- Verify each step shows only the controls listed in TESTING.md for that step
- Press Back from every step — confirm correct step is shown and values are preserved
- On Step 6, click each preset — confirm insight text matches DESIGN.md table
- Click "Start Over" — confirm return to Step 1 with default values
- Verify step rail shows correct state (completed/current/upcoming) at each step

---

## Phase 8 — Validation Hooks

### Files Required

| File | Status | Role |
|------|--------|------|
| `src/vectorMath.js` | Extend | `validate(state, result)` function — development only |

### Components Required

**validate(state, result)**

A development-mode function called once per `update()` cycle. It computes R independently using the parallelogram formula and compares to the component-method result stored in `result.R`.

```javascript
export function validate(P, Q, thetaDeg, componentR) {
  const theta = thetaDeg * Math.PI / 180;
  const parallelogramR = Math.sqrt(P * P + Q * Q + 2 * P * Q * Math.cos(theta));
  const deviation = Math.abs(parallelogramR - componentR);
  if (deviation > 0.01) {
    console.warn(`[VALIDATION] R mismatch: parallelogram=${parallelogramR.toFixed(3)}, component=${componentR.toFixed(3)}, deviation=${deviation.toFixed(4)}`);
  }
}
```

This function is guarded by a `DEV_MODE` flag (a `const` at the top of main.js, set to `true` during development). It is not removed for production but is made a no-op when `DEV_MODE = false`.

**VALIDATION.md Group C crosscheck:**

For the 4 Group C cases, the validate() call should produce no warnings. If it does, there is a bug in the resultant() implementation.

### Mathematical Logic Required

Parallelogram formula for crosscheck only:

```
R_parallelogram = √(P² + Q² + 2PQ cos θ)
```

This must agree with the component method `R_component = √(Rx² + Ry²)` to within 0.01 N for all inputs.

### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| validate() causing console noise in production | Low | Guard with `DEV_MODE` flag; set to false before deployment |
| Floating-point precision causing false positives (deviation of 0.000001) | Medium | Tolerance is 0.01 N — well above floating-point noise for the input ranges used |
| validate() being called every frame causing performance overhead | Low | validate() is O(1) with no DOM access; negligible cost |

### Testing Strategy

- With `DEV_MODE = true`, run all VALIDATION.md Group A cases manually
- Confirm zero console warnings for all cases
- Run D3 (equal forces at 120°) — confirm R displayed equals P exactly, no warning
- Run edge case E2 (θ = 0°) — confirm no console error
- Run edge case E3 (θ = 180°, P = Q) — confirm no console error, R shows 0

---

## Phase 9 — Accessibility Support

### Files Required

| File | Status | Role |
|------|--------|------|
| `index.html` | Extend | ARIA attributes, live regions, semantic structure |
| `src/uiManager.js` | Extend | Focus management, Shift+Arrow handling, aria-live updates |
| `style.css` | Extend | Focus ring CSS, reduced-motion media query, minimum touch targets |

### Components Required

**ARIA Live Regions**

- Step counter: `aria-live="polite"` announces "Step X of 6" on navigation
- Equations panel container: `aria-live="polite"` with `aria-label="Resultant equations, values update as you move the sliders"`
- Insight callout: `aria-live="polite"` so step 6 insight text is announced when it changes

**Slider ARIA**

Each slider requires:
- `aria-label="Magnitude P, in Newtons"` (or appropriate label)
- `aria-valuemin`, `aria-valuemax`, `aria-valuenow` updated on every value change

**Shift+Arrow Fine Steps on Sliders**

For the θ slider specifically, 0.5° fine steps are important (same as vector-resolution):

```javascript
slider.addEventListener('keydown', e => {
  if (!e.shiftKey) return;
  e.preventDefault();
  const delta = (e.key === 'ArrowRight' || e.key === 'ArrowUp') ? 0.5 : -0.5;
  const v = Math.min(max, Math.max(min, parseFloat(slider.value) + delta));
  slider.value = v;
  numInput.value = v.toFixed(1);
  onChange(v);
});
```

**Focus Ring CSS**

```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 26%, transparent);
}
```

Never use `outline: none` without this replacement.

**Reduced Motion**

```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

In JavaScript, `REDUCED_MOTION` flag (set in Phase 1) gates all `startAnimation()` calls:

```javascript
function startParallelogramAnimation() {
  if (REDUCED_MOTION) { animProgress = 1; return; }
  animState = { startTime: performance.now(), phase: 'A' };
}
```

**Color Independence (non-CSS)**

All scene objects that carry engineering meaning also have at least one non-color cue:

| Element | Non-color cue |
|---------|--------------|
| Force P (red) | Label "P", solid arrow |
| Force Q (amber) | Label "Q", solid arrow |
| Resultant R (blue-grey) | Label "R = {N} N", visibly thicker shaft and head |
| Construction ghost | Dashed line style |
| Completed step (green) | Check glyph SVG |

**Toggle Button ARIA**

The Parallelogram/Triangle toggle must use `aria-pressed` on the active button:

```html
<button aria-pressed="true">Parallelogram</button>
<button aria-pressed="false">Triangle</button>
```

On switch: update `aria-pressed` on both buttons.

### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `aria-live` on equations panel updating too frequently (every rAF frame) | High | Update DOM values only when they change by more than 1 N or 0.5°, not every frame |
| Focus jumping to wrong element after step navigation | Medium | After buildStepCard(), call `document.getElementById('step-title').focus()` or focus the first control |
| Toggle button not announcing `aria-pressed` change to screen reader | Medium | Update both buttons' `aria-pressed` attribute in the toggle handler |
| Reduced motion CSS rule not applying because animation is rAF-based (not CSS) | High | REDUCED_MOTION is read in JS and gates animation functions — CSS rule is a backup for any CSS transitions |

### Testing Strategy

- Complete full simulation keyboard-only (Tab, arrow keys, Enter/Space)
- With NVDA + Firefox: navigate through Steps 2–4, confirm slider values announced, equations panel announced on change
- Simulate deuteranopia using Chrome DevTools → Rendering → Emulate vision deficiency → Deuteranopia
  - Confirm P and Q arrows are still visually distinct via their labels and positions
- Enable `prefers-reduced-motion: reduce` in Windows Settings → Accessibility → Motion
  - Reload; confirm all steps function correctly with instant transitions
- Inspect each interactive element's focus ring in normal usage — confirm accent halo visible

---

## Implementation Dependency Graph

```
Phase 1 (Scene Setup)
    └─── Phase 2 (Vector Rendering)
              ├─── Phase 4 (Parallelogram Construction)
              │         └─── Phase 5 (Resultant)
              │                    └─── Phase 6 (Triangle Law)
              └─── Phase 3 (Tugboat Scene)

Phase 5 ──────────────┐
Phase 6 ──────────────┤
Phase 3 ──────────────┼─── Phase 7 (Educational Stepper)
Phase 4 ──────────────┘         └─── Phase 8 (Validation Hooks)
                                 └─── Phase 9 (Accessibility)
```

---

## Key Technical Decisions Required Before Coding

These decisions cannot be deferred to implementation:

### Decision 1 — FORCE_SCALE and Maximum Magnitude

VALIDATION.md case B8 uses P=300 N and Q=400 N. At `FORCE_SCALE = 0.015`, P=300 produces a 4.5 scene-unit arrow and Q=400 produces a 6.0 scene-unit arrow. The parallelogram diagonal would reach approximately 7.5 scene units diagonally.

At `VIEW_H = 4.5`, some configurations will clip. **Recommendation:** Set `FORCE_SCALE = 0.010` and `VIEW_H = 6.0`. This gives 100 N = 1.0 scene units, and 500 N = 5.0 scene units, which fits within the camera frustum comfortably.

### Decision 2 — Slider Ranges

| Slider | Recommended min | Recommended max | Step |
|--------|----------------|-----------------|------|
| Magnitude P | 0 N | 300 N | 1 N |
| Magnitude Q | 0 N | 300 N | 1 N |
| Angle θ | 0° | 180° | 1° |

VALIDATION.md Group D uses up to 400 N. If max is 300 N, case B8 (300 N + 400 N) cannot be reproduced exactly. If this matters, increase max to 400 N.

### Decision 3 — Default Initial State

Recommended defaults:

```javascript
magnitudeP: 100,
magnitudeQ: 100,
thetaDeg: 45,
pAngleDeg: 0,
view: 'parallelogram'
```

At these defaults, R ≈ 184 N and α ≈ 22.5°, which are clean visible values that demonstrate the concept immediately when the student reaches Step 4.

### Decision 4 — Diagonal Color in Step 3

Should the diagonal in Step 3 use construction color (bench-grey) or a preview of R (blue-grey)? **Recommendation:** Use bench-grey dashed for Step 3 (same as ghost lines) to avoid revealing R before Step 4. The diagonal becomes the full R arrow only when Step 4's visSet activates `resultantR`.

---

## File Summary

| File | Phase Created | Phase Extended |
|------|--------------|---------------|
| `index.html` | 1 | 7, 9 |
| `style.css` | 1 | 9 |
| `main.js` | 1 | 7 |
| `src/sceneSetup.js` | 1 | 2, 3, 4, 5, 6 |
| `src/vectorMath.js` | 2 | 5, 8 |
| `src/steps.js` | 3 (partial) | 4, 5, 6, 7 |
| `src/uiManager.js` | 5 (partial) | 6, 7, 9 |

---

*Awaiting approval before any code is written.*
