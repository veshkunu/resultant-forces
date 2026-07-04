# CLAUDE.md — Simatrix Engineering Mechanics · Resultant of Forces

Three.js simulation that teaches the **Resultant of Four Concurrent Coplanar Forces** (one fixed
per quadrant) via the component method (ΣFx, ΣFy) and quadrant-aware direction resolution, as an
interactive force-analysis dashboard.

> **Harmonised 2026-07-03; four-quadrant model added 2026-07-04.** This file was rewritten to
> describe the architecture that is actually shipped (see `ARCHITECTURE.md` and `DECISIONS.md`
> ADR-001). The simulation was originally specified as a 6-step Guided Stepper with a tugboat
> narrative and a parallelogram/triangle-law construction; that implementation was started
> (`src/sceneSetup.js`, `src/intro/*`, `src/shared/*`) but never wired up, and a different
> accordion-based dashboard shipped instead. Both are described here so a future contributor
> doesn't have to rediscover this by reading dead code — see "Legacy code" below. On 2026-07-04
> the original two-vector (P/Q/θ) model was replaced with four independent, fixed-quadrant
> vectors (A/B/C/D) and the Parallelogram Law cross-check was dropped in favor of quadrant-aware
> direction resolution — see `DECISIONS.md` ADR-006/ADR-007. Later that same day the interaction
> model was redesigned: the always-visible force-config panel, canvas dragging, and canvas-click
> Component Resolution were all replaced by one sidebar-driven workflow (select a Geometry force
> card → floating edit panel), and vector angles became local 0–90° inputs instead of global
> 0–360° ones — see `CHANGELOG.md`'s 2026-07-04 "Interaction redesign" entry.

---

# Simulation Identity

**Module:** Engineering Mechanics — Module 1
**Simulation number:** 2 of 6
**Topic:** Resultant of Concurrent Coplanar Forces
**Methods taught:** component resolution (ΣFx, ΣFy), resultant magnitude/direction, moment of a force

---

# UI Model

The simulation is a **free-navigation analysis dashboard**, not a gated Guided Stepper:

* the **workspace** (left ~75%) holds the 3D force diagram — a pure, read-only visualization with
  no pointer interaction of its own — plus two floating overlays that only ever appear one at a
  time: the **edit panel** (shown while a Geometry force card is selected) and the **component
  analysis popup** (shown while a Component Resolution force card is selected);
* the **dashboard** (right ~25%) holds a live-value strip and a 7-card accordion — Geometry,
  Component Resolution, Horizontal Summation, Vertical Summation, Net Resultant, Resultant
  Direction, System Moment — that the learner may open **in any order**, not a fixed 1→6 sequence.

This is a deliberate, documented deviation from the platform's shared Guided Stepper
interaction shape (`DESIGN.md` §6, `PRODUCT.md` Design Principle 2) — see `DECISIONS.md`
ADR-001 for why it was kept rather than rebuilt during harmonisation, and treat it as an open
question for a future session, not a settled architecture.

There is exactly one way to change a force: select its card in the Geometry section → the
floating edit panel targets it → adjust magnitude/local angle there (`RULES.md` §1.6). Everything
else (component breakdown, ΣFx/ΣFy, resultant, direction, moment arm) reveals when its accordion
card is opened, so progressive disclosure is partial, not the full step-gating the platform model
expects.

---

# Design System Rules

All visual styling follows `DESIGN.md` (platform-wide tokens) plus the Engineering Mechanics
appendix in `DESIGN.shared.md` (force/construction color encodings). Never hard-code:

* colors — read via `getComputedStyle` (`cssVar()` in `src/scene.js`) or `var(--color-*)` in CSS
* spacing, radii, typography — consume the tokens in `style.css` `:root`
* UI dimensions

---

# Scope Boundary

This simulation contains:

* `index.html` → UI shell (workspace, force-config panel, dashboard accordion, component popup, mobile notice)
* `main.js` → state, render loop, `window.simAPI`, Reset control, accordion/section logic, GSAP-driven reveals
* `style.css` → all styling; consumes tokens defined in its own `:root` (DESIGN.md-compliant)
* `src/forces.js` → `computeForces()` (component method + quadrant-aware direction resolution, ADR-007), `computeMoment()`, `QUADRANT_BANDS`, formatters
* `src/scene.js` → Three.js scene: grid, axes, per-vector arrows (+ disabled-vector ghosts), quadrant guide, resultant/moment arrows, angle arcs — reads all color from CSS custom properties via `cssVar()`
* `meta.json` → platform metadata (title, description, difficulty, tags)
* `assets/fonts/` → bundled Atkinson Hyperlegible + IBM Plex Mono woff2 (no CDN)
* `CLAUDE.md` → this file
* `ARCHITECTURE.md`, `DECISIONS.md`, `RULES.md`, `CHANGELOG.md` → this module's own documentation set
* `VALIDATION.md` → math test cases for the original two-vector model — **superseded**, flagged stale pending a rewrite for the four-vector model (see `DECISIONS.md` ADR-006/ADR-007)
* `TESTING.md`, `IMPLEMENTATION_PLAN.md` → describe the original, unbuilt Guided Stepper design; kept for historical reference, **not** current behavior (see `DECISIONS.md` ADR-001)

## Legacy code (not imported, not deleted)

`src/sceneSetup.js`, `src/intro/*` (IntroCamera, IntroDialogue, IntroHighlights, IntroManager,
IntroStepController, HarborScene), and `src/shared/*` (AnimationManager, StateManager) implement
the original tugboat-narrative Guided Stepper. **Nothing in `index.html` or `main.js` imports
them.** They are kept in place pending a decision on ADR-001, not deleted unilaterally. Do not
extend them without first resolving that decision — see `DECISIONS.md`.

---

# Project-wide documentation (read before cross-module tasks)

* `DESIGN.md` — color tokens, typography, component standards (platform-wide, identical across
  every Simatrix module by design — do not fork it locally)
* `PRODUCT.md` — persona, principles, accessibility commitments (§1–4, §7–9 are platform-wide and
  apply here; §5–6 describe Engineering Graphics Module 1/2 features and do **not** apply to this
  module — see `DECISIONS.md` ADR-002)
* `PLATFORM-RULES.md` — what every module must/must not do regardless of subject
* `DESIGN.shared.md` — Engineering Mechanics family design system, including this module's own
  force/construction color appendix

This module does not fork `DESIGN.md`/`PRODUCT.md` locally beyond what already exists at the
family level (`DESIGN.shared.md`). Its own architecture, decisions, and rules live in
`ARCHITECTURE.md`, `DECISIONS.md`, and `RULES.md` per `CLAUDE.module-template.md`.

---

# State Model

Four fixed-role, quadrant-clamped vectors (ADR-006) — A:QI, B:QII, C:QIII, D:QIV. Each vector's
angle is stored as a **local** 0–90° reference angle (what the floating edit panel edits), not a
global one — see `RULES.md` §1.4 and `src/forces.js#quadrantAngle`:

```js
{
  vectors: [
    { id: 'A', enabled: boolean, magnitude: number, localAngleDeg: number }, // 0-90, off +X axis
    { id: 'B', enabled: boolean, magnitude: number, localAngleDeg: number }, // 0-90, off -X axis
    { id: 'C', enabled: boolean, magnitude: number, localAngleDeg: number }, // 0-90, off -X axis
    { id: 'D', enabled: boolean, magnitude: number, localAngleDeg: number }, // 0-90, off +X axis
  ],
  momentArm: number, // perpendicular distance d for the Moment card, in metres
}
```

Derived (computed in `src/forces.js#computeForces`, never stored): per-vector `angleDeg` (global,
via `quadrantAngle`), `Fx, Fy`; `Rx, Ry,
R` (component sum, generalizes to however many vectors are enabled); `referenceAngleDeg` (0–90°,
off the nearer axis), `actualDirectionDeg` (0–360°), and `resultantQuadrant` (1–4, or `null` on an
axis / at the origin) — quadrant-aware direction resolution, ADR-007. The Parallelogram Law
cross-check (`R_para`/`alphaDeg`) that this state model previously required has been **removed**
(ADR-007) — it is algebraically valid for exactly two vectors and has no N-vector form.

---

# Platform Contract

* `window.simAPI = { pause(), resume(), reset() }` — the only reset path; the dashboard's Reset
  button routes through `simAPI.reset()` exclusively, guarded by a two-state confirm.
* `meta.json` ships all four required fields; `difficulty` is lowercase.
* Three.js and GSAP are both loaded as pinned-version ES modules via the import map — no UMD
  globals, no unpinned CDN.
* Fonts are bundled locally (`assets/fonts/*.woff2`) — no Google Fonts or other font CDN.
* `#mobile-notice` shows a dismissible "Best experienced on desktop." banner below 768px.
* All GSAP timelines are gated by a `REDUCED_MOTION` flag (`window.matchMedia('(prefers-reduced-motion: reduce)')`)
  read once at load in `main.js`; CSS transitions/animations collapse via the
  `@media (prefers-reduced-motion: reduce)` block in `style.css`.

---

# Session Digest Protocol

At the end of every session (or when asked), produce a digest in this format:

### SESSION DIGEST — [date] — [feature/task]
**What changed:** (3–5 bullets, concrete)
**Decisions made:** (with brief rationale)
**Patterns introduced:** (reusable code patterns or conventions)
**Open questions / next steps:**
**Files modified:** (list)

# Keeping your own documents current

After completing any task, check whether the work involved:
- A non-obvious decision between two real options → add an ADR to `DECISIONS.md`
- A reversed or superseded previous decision → update the relevant ADR status in `DECISIONS.md`
- A new rule that must be enforced going forward → add it to `RULES.md` citing its source ADR
- A structural change to the codebase → update `ARCHITECTURE.md`

Do not update these files for routine changes. Only update when the change has architectural or
decision-level significance. If a task surfaces something that should change for *every*
Simatrix module — a platform contract gap, a design-system correction — flag it rather than
editing `PLATFORM-RULES.md`/`DESIGN.md`/`PRODUCT.md` unilaterally.
