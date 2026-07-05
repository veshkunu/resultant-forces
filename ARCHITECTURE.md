# ARCHITECTURE.md — Resultant of Forces

What the system is made of and how the pieces connect. Written from reading the live code
during the 2026-07-03 harmonisation, not from design intent — see `DECISIONS.md` for why the
choices below were made.

---

## 1. What this module is

A single-page Three.js simulation teaching the resultant of up to four concurrent coplanar
forces, one permanently assigned to each quadrant (ADR-006). The workspace is a pure, read-only
visualization — every input happens through the dashboard: the learner selects a Force A–D card
in the Geometry accordion section, which opens a floating edit panel (magnitude + a 0–90° local
angle, per-quadrant, plus an enable toggle on the card itself) targeting that one force. Opening
accordion cards reveals each stage of the analysis in turn: geometry, component resolution,
horizontal/vertical summation, resultant, quadrant-aware direction, and moment about a point.

## 1a. Interaction model (single sidebar-driven workflow)

There is exactly one way to change a force: select its card in the Geometry section → the
floating edit panel targets it → adjust magnitude/local angle there. The workspace canvas has no
pointer listeners of its own — no drag-to-adjust, no click-to-resolve. Component Resolution uses
the same force-card component (read-only, no toggle); selecting a card there highlights that
vector in the workspace and opens the Component Analysis popup directly. This collapsed three
previously-competing interaction methods (an always-visible slider panel, canvas dragging, and
canvas-click-to-resolve) into one, on the premise that a student should never have to guess which
input method is authoritative for a given change.

Both card grids arrange their four cards in a 2×2 layout matching their quadrant roles (B/A over
C/D) instead of a plain list — the card position itself is the quadrant cue, so no second
coordinate system is drawn in the dashboard. The floating edit panel anchors to the workspace's
bottom-right corner (fixed position regardless of which force is selected) rather than floating
near the selected vector, so it never competes for space with the dashboard or drifts around the
workspace. The accordion's `a-num`/`a-check` styling doubles as a progress stepper — current step
blue, a step the learner has already left green-checked, an unvisited step grey — while keeping
ADR-001's free-navigation behavior unchanged (any step can still be opened in any order).

## 2. Rendering approach

Three.js with an `OrthographicCamera` — the simulation is a 2D engineering drawing, not a 3D
scene (`src/scene.js`). There is one scene module, not an orchestrator + leaf-module split: all
drawing lives in `initScene()`'s closure, exposing `resize/draw/tick/worldToScreen/screenToWorld`.
`main.js` is the sole caller.

## 3. The state-change pipeline

`main.js` owns one plain `state` object: `{ vectors: [{id, enabled, magnitude, localAngleDeg} × 4],
momentArm }` (ADR-006). `localAngleDeg` is always 0–90° — the global `angleDeg` used for
rendering/math is derived on every `computeForces()` call via `quadrantAngle()`, never stored.
Every input (floating-edit-panel slider/number, card enable toggle, accordion open) funnels
through:

1. mutate `state`
2. `redraw(mode, extra)` → `computeForces(state)` (pure function, `src/forces.js`) → `draw(state, computed, mode, extra)` (`src/scene.js`)
3. `updateDashboard()` — pushes computed values into the accordion/live-strip DOM text
4. `updateLabels()` — repositions the HTML label overlay from `worldToScreen()`

`draw()` calls `clearDyn()` internally before rebuilding, disposing all per-frame geometry and
materials — the disposal contract for anything drawn dynamically. Static objects (`grid`, `axes`)
are built once and never disposed.

There is no separate "commit" step: mutating `state` and calling `redraw()` is the entire
pipeline, run synchronously on every interaction (not batched to rAF) plus once per rAF frame for
label repositioning and animation ticking (`tick()`).

## 4. Module boundaries

```
index.html  → DOM shell only, no logic
main.js     → state, event wiring, dashboard text, window.simAPI, GSAP timelines
  ├─ src/forces.js  → pure math (no DOM, no THREE) — computeForces(), computeMoment(), fmt(), quadrantAngle()
  └─ src/scene.js   → all THREE.js — cssVar(), initScene() → {resize, draw, tick, worldToScreen, screenToWorld}
style.css   → all tokens + component styling; scene.js reads its custom properties at runtime
```

`main.js` is the only file allowed to touch the DOM outside `#labels-layer` positioning (which it
also owns). `src/scene.js` never touches the DOM except `canvas.getBoundingClientRect()` for
coordinate transforms. `src/forces.js` has zero side effects — safe to unit-test in isolation
(see `VALIDATION.md`).

**Legacy, unwired subtree** (see `CLAUDE.md` "Legacy code", `DECISIONS.md` ADR-001):
`src/sceneSetup.js`, `src/intro/*`, `src/shared/*` implement a different, incomplete Guided
Stepper + tugboat-narrative architecture. Nothing imports them. They are not part of the live
module boundary above.

## 5. Domain-specific viewport encodings

On top of the platform's shared tokens (Quiet Chrome, Chrome-Only Blue, Two-Cue, Two-Weight,
Tabular, Flat-Ink, Border-Over-Shadow — all still binding):

| Encoding | Token | Meaning |
|---|---|---|
| Force A (Quadrant I) | `--color-force-a` (`#c0392b`) | solid red arrow |
| Force B (Quadrant II) | `--color-force-b` (`#b7791f`) | solid amber arrow |
| Force C (Quadrant III) | `--color-force-c` (`#9c3d63`) | solid wine arrow |
| Force D (Quadrant IV) | `--color-force-d` (`#7a6a1f`) | solid olive arrow |
| Resultant R + direction | `--color-force-resultant` (`#546e7a`) | thicker blue-grey arrow/arc |
| Moment Mo | `--color-force-moment` (`#7b1fa2`) | curved purple arc + arrow |
| Components (Fx/Fy per vector), quadrant guide, drop lines | `--color-construction` (`#938b7b`, == bench-grey) | dashed grey — construction/helper lines, distinguished from each other by arrow direction + label, not by color |

A disabled vector renders as a faint dashed "ghost" in its own `--color-force-*` token at reduced
opacity rather than disappearing — still identifiable, clearly inactive.

None of these repurpose `--color-accent` (the platform's chrome-only blue) — blue never appears
inside the viewport. Two-Cue is satisfied by pairing every force color with a label (A/B/C/D/R)
and, for components, arrow direction; each vector's fixed quadrant position is itself a strong
secondary cue independent of color.

## 6. Problem/validation logic

This module does not (yet) teach via a Problem Library or answer-validation flow — it is a
free-exploration analysis tool. `VALIDATION.md` defined the math acceptance criteria for the
original two-vector model (Parallelogram Law vs. component-method cross-check); ADR-007 dropped
that cross-check as inherently 2-vector-only and replaced it with quadrant-aware direction
resolution (reference angle → actual direction via the sign pattern of Rx/Ry) for the four-vector
model (ADR-006). `VALIDATION.md` is flagged stale pending a full rewrite of its test cases; there
is no student-facing "check my answer" feature to validate.

## 7. Known structural issues (honest, not polished)

* The UI is a free-navigation accordion, not the platform's gated Guided Stepper — see
  `DECISIONS.md` ADR-001. This is the single largest open architectural question for this module.
* `TESTING.md` and `IMPLEMENTATION_PLAN.md` describe the unbuilt Guided Stepper, not the shipped
  accordion dashboard — stale until ADR-001 is resolved one way or the other.
* The legacy subtree (§4) adds dead weight to the module folder; kept pending ADR-001, not
  deleted unilaterally during harmonisation.
