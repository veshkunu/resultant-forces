# CHANGELOG.md — Resultant of Forces

## 2026-07-05 — UI/UX refinement: quadrant-spatial cards, bottom-right editor, progress stepper

Pure UI/UX polish on top of the interaction redesign below — no math, GSAP timeline, or
architecture changes (`src/forces.js`/`src/scene.js` untouched).

- **Quadrant-spatial card layout**: the Geometry and Component Resolution force-card grids
  (`.force-card-grid`, shared by both sections) are now a 2×2 CSS grid — Force B/A on top,
  C/D on bottom — so a card's position mirrors its quadrant (QII/QI over QIII/QIV) without
  drawing a second coordinate system. `.force-card-body`'s three stats switched from a
  side-by-side row to stacked label↔value rows so they stay readable at the narrower per-card
  width. Selecting a card now also lifts slightly (`transform: translateY(-2px)`) in addition to
  its existing blue outline/tint — elevation via transform, not a box-shadow, keeping persistent
  chrome Flat-Ink/Border-Over-Shadow compliant (ADR-003).
- **Floating edit panel repositioned**: `#force-edit-panel` now anchors to the workspace's
  bottom-right corner (was left-center) and animates in with a fade + slide-up instead of a
  horizontal slide. Same single reusable instance as before, just relocated; still a child of
  `#workspace` so it can never cover the dashboard sidebar.
- **Progress-colored accordion stepper**: a step is marked "completed" (`data-done`, existing
  green-check styling) the moment the learner navigates away from it, not just when its GSAP
  reveal timeline finishes — this now also covers Geometry and Component Resolution, which
  previously never got a done state. A never-visited step is now visibly greyer than a completed
  one (new CSS rule on `.a-title`/`.a-num`). Opening a step scrolls it into view
  (`scrollIntoView`, respecting the existing `REDUCED_MOTION` flag). Reset clears all visited/done
  state. **Free navigation is unchanged** — any step can still be opened in any order; this is
  styling and bookkeeping only, not a locked Back/Next rebuild. No new ADR: ADR-001 stays
  "Active" as originally decided.

---

## 2026-07-04 — Interaction redesign: single sidebar-driven workflow, local-angle input

Collapsed three competing ways to change a force (an always-visible slider panel, dragging a
vector's tip in the workspace, and clicking a vector's shaft to open Component Resolution) into
one: select a force card → a floating edit panel opens → adjust it there. No math changed —
`computeForces`'s component-sum and quadrant-aware direction resolution (ADR-007) are untouched.

**Input model:**
- Each vector's angle is now edited as a **local** 0–90° reference angle (off whichever axis is
  nearer its quadrant), not a global 0–360° angle — matches how the topic is taught. Added
  `quadrantAngle(quadrant, localDeg)` to `src/forces.js`, shared by both `computeForces` (turns a
  vector's local angle into its global direction) and `resolveDirection` (turns the resultant's
  own reference angle into its actual direction) — one mapping, two callers. Replaced
  `QUADRANT_BANDS` with a single uniform `LOCAL_ANGLE_RANGE = [0, 90]`.

**Removed:**
- The always-visible left force-configuration panel.
- Dragging a vector's arrowhead in the workspace to change magnitude/angle.
- Clicking a vector's shaft in the workspace to open Component Resolution.
- The `#select-hint` overlay (nothing left in the canvas to click).

**Added:**
- A floating edit panel (`#force-edit-panel`), shown only while a Geometry force card is
  selected — one set of controls, retargeted per selection, sliding in from the left edge.
- Force cards: the Geometry section's card grid gained a per-card enable toggle; Component
  Resolution now uses the same card component (read-only) instead of a plain chip row — clicking
  a card highlights that vector and opens the Component Analysis popup directly.
- Visual highlighting (`src/scene.js#draw`'s new `highlight` param): the selected/highlighted
  vector gets a thicker stroke plus a soft glow halo (a second, larger, low-opacity `mkArrow`
  drawn underneath); every other vector dims to 25% opacity with muted labels.
- Two new labels in the Component Analysis popup SVG (`sv-fx-label`/`sv-fy-label`) and a
  re-sequenced reveal: both projection legs and the angle/triangle now fully animate in before
  either equation appears (previously the Y leg only appeared after the Fx equation had already
  been revealed).

**Docs:** No new ADR — a UI/interaction change with no math change and no reversal of a
documented decision. Updated `ARCHITECTURE.md` (new §1a interaction-model section, state shape
now `localAngleDeg`).

---

## 2026-07-04 — Four-quadrant vector model (Phase 1 of the four-quadrant feature pass)

Replaced the two-vector (P/Q/θ) model with four independent, fixed-quadrant vectors so the
simulation can demonstrate a resultant landing in any of the four quadrants, not just a narrow
band near the first. See `DECISIONS.md` ADR-006/ADR-007 for the reasoning.

**Math / data model:**
- `src/forces.js#computeForces` now takes `state.vectors` (Force A/B/C/D, one fixed per quadrant,
  each with independent `magnitude`/`angleDeg`/`enabled`) instead of `magnitudeP/Q/thetaDeg/
  pAngleDeg`; returns per-vector `Fx/Fy` plus the ΣFx/ΣFy-based `Rx/Ry/R`.
- Dropped the Parallelogram Law cross-check (`R_para`, law-of-cosines `alphaDeg`) — it has no
  valid N-vector form. Replaced with quadrant-aware direction resolution: a 0–90° reference angle
  mapped to a 0–360° actual direction and a detected quadrant (1–4, or `null` on an axis / R≈0).
- Added `QUADRANT_BANDS` — each vector's angle is hard-clamped to its own 90° band on every input
  path (slider, number field, drag), so a vector can never visually leave its assigned quadrant.

**Rendering (`src/scene.js`):**
- Replaced the two literal P/Q arrow draw calls with a loop over up to four vectors; a disabled
  vector renders as a faint dashed "ghost" instead of vanishing.
- Added a quadrant guide: a faint tinted wedge highlights whichever quadrant currently contains
  the resultant.
- Horizontal/Vertical summation modes now chain however many vectors are enabled (0–4) instead of
  exactly two. The direction-arc sweep uses the signed `atan2(Ry,Rx)` value (not the new 0–360°
  display value) so it still draws the short way round for every quadrant.

**UI (`index.html`/`main.js`/`style.css`):**
- Force-configuration panel: four vector blocks (magnitude slider, quadrant-clamped angle slider,
  enable toggle) replacing the old P/Q/θ triple.
- Geometry card redesigned into a selectable list of the four vectors (magnitude/direction/
  quadrant/on-off) with a read-only detail panel; selecting a row dims the other three vectors in
  the workspace.
- "Vector Angle" card renamed **Resultant Direction**, now showing Reference Angle, Actual
  Direction, and the detected Quadrant side by side. "Moment" card renamed **System Moment**
  (naming-only, matches the platform's eventual guided-stepper card list).
- Component Resolution's inline chip row and the live-value strip both generalized from
  P/Q-specific ids to per-vector A/B/C/D ids.
- Color tokens `--color-force-p`/`--color-force-q` renamed to `--color-force-a`/`--color-force-b`
  (same hex values); added `--color-force-c`/`--color-force-d`.

**Docs:** Added ADR-006 (four-vector model) and ADR-007 (dropped Parallelogram cross-check) to
`DECISIONS.md`; updated `ARCHITECTURE.md` (state shape, encodings table, §6), `RULES.md` (§1.1
color list, new §1.4/§1.5), and `CLAUDE.md` (UI Model, Scope Boundary, State Model). Flagged
`VALIDATION.md` as superseded — its test cases describe the old two-vector model and need a full
rewrite, out of scope for this pass.

**Deferred to later phases (not in this pass):** converting the accordion to a locked
step-by-step stepper (Change 3 — will need its own ADR superseding ADR-001), and richer animated
choreography for Component Resolution / Horizontal / Vertical / Net Resultant / System Moment
(Changes 4–7, 10).

---

## 2026-07-03 — Platform harmonisation (Phase 2)

Full compliance pass against `PLATFORM-RULES.md`/`DESIGN.md`, following the Phase 1 audit
(2026-07-03). Fixed in severity order: CRITICAL platform-contract violations, then IMPORTANT
design-rule drift, then documentation gaps. See `DECISIONS.md` for the ADRs behind the
non-obvious calls made along the way.

**CRITICAL fixes:**
- Added the full platform `--color-*` token set plus an Engineering Mechanics domain palette
  (`--color-force-p/q/resultant/moment`, `--color-construction`) to `style.css` `:root`; removed
  every `--ws-*`/`--dash-*`/`--c-*` ad hoc token.
- Replaced all hardcoded hex in `src/scene.js` (grid, axes, P/Q/R/component/moment colors,
  scene background) with `cssVar()` reads from those tokens; same for inline SVG hex in
  `index.html` (dash logo mark, component-analysis popup diagram).
- Implemented `window.simAPI = { pause, resume, reset }`; added a dashboard Reset control that is
  the only path to `simAPI.reset()`.
- Created `meta.json` (title matching `index.html`'s `<title>`, description, `difficulty:
  "beginner"` lowercase, tags).
- Downloaded and bundled Atkinson Hyperlegible (400/700) and IBM Plex Mono (400) as local
  `assets/fonts/*.woff2`, replacing the Google Fonts CDN `<link>` tags; replaced Inter entirely.
  Replaced the GSAP UMD `<script src=cdnjs>` tag with a pinned ES-module import
  (`gsap@3.12.5` via the import map).

**IMPORTANT fixes:**
- Reset control is guarded by a two-state confirm ("Reset everything? Yes/Cancel").
- Added a `prefers-reduced-motion: reduce` CSS block collapsing all transitions/animations to
  instant, and a `REDUCED_MOTION` flag in `main.js` that collapses every GSAP timeline via
  `gsap.globalTimeline.timeScale(1000)`.
- Added `transform: scale(0.97)` press states to every pressable control (accordion heads, popup
  close, Reset + confirm buttons), replacing the absence of any press language.
- Removed blue from the viewport entirely: Force P is now red, components/angle-arc share one
  neutral construction grey — blue (`--color-accent`) now appears only in chrome.
- Fixed sub-44px interactive targets (`popup-close`, slider hit row) to 44px.
- Removed decorative box-shadows from persistent chrome (force-config panel, live items,
  accordion); kept a shadow only on the genuinely transient popup and select-hint, per Flat-Ink /
  Border-Over-Shadow.
- Added a dismissible `#mobile-notice` ("Best experienced on desktop.") below 768px.

**Documentation:**
- Rewrote `CLAUDE.md` to describe the shipped accordion-dashboard architecture (not the unbuilt
  Guided Stepper it previously described), with an accurate Scope Boundary and an explicit note
  on the unwired legacy subtree.
- Added `ARCHITECTURE.md`, `DECISIONS.md` (5 ADRs), and this `RULES.md` (module-own, extending
  `PLATFORM-RULES.md`), per `CLAUDE.module-template.md`.
- Flagged, but did not silently rewrite: `PRODUCT.md` §5–6 (Engineering Graphics feature lists,
  not applicable here — ADR-002), `TESTING.md`/`IMPLEMENTATION_PLAN.md` (describe the unbuilt
  Guided Stepper — stale pending ADR-001), and the dead `src/sceneSetup.js`/`src/intro/*`/
  `src/shared/*` subtree (kept, not deleted, pending ADR-001).

**Open questions carried forward:** ADR-001 (rebuild as Guided Stepper vs. formally adopt the
accordion model) and ADR-002 (whether `PRODUCT.md`'s per-family feature lists should be
restructured platform-wide) both need a decision from the user in a future session.
