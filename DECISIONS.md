# DECISIONS.md — Resultant of Forces

ADR log for this module's own architecture and harmonisation choices. Written 2026-07-03 during
the Phase 1 audit / Phase 2 harmonisation pass. Follows the format: Decision, Why, Alternatives
rejected, Consequences, Status.

---

## ADR-001 — Keep the shipped accordion dashboard; do not rebuild as a Guided Stepper (yet)

**Decision:** Harmonise the shipped "Force Analysis System" accordion dashboard
(`index.html`/`main.js`/`src/scene.js`/`src/forces.js`) to platform-token/contract compliance,
rather than discarding it in favor of finishing the originally-specified 6-step Guided Stepper
(`src/sceneSetup.js`, `src/intro/*`, `src/shared/*`).

**Why:** The Phase 2 harmonisation instructions were scoped to fixing compliance issues in the
existing implementation (tokens, `simAPI`, fonts, `meta.json`, motion, press states, viewport
color) — none of them asked for an architecture rebuild. The accordion dashboard is complete,
functional, and mathematically correct (`VALIDATION.md` passes); the Guided Stepper code is an
unfinished Phase-1 stub with no drawing logic implemented (`src/sceneSetup.js` `drawDyn()` is
empty). Rebuilding was out of scope for this pass and would have meant discarding working code on
an unstated assumption.

**Alternatives rejected:**
- *Finish the Guided Stepper, delete the dashboard.* Rejected: much larger scope than requested,
  and the Guided Stepper code has no drawing/interaction logic to harmonise yet — there was
  nothing to fix, only to build.
- *Delete the dead Guided Stepper code now.* Rejected: destructive, and the user has not yet
  confirmed which architecture should win (see Open Question below). Kept in place, clearly
  marked as unwired in `CLAUDE.md`/`ARCHITECTURE.md`.

**Consequences:** The module now deviates, on the record, from the platform's shared Guided
Stepper interaction shape (`DESIGN.md` §6 point 7, `PRODUCT.md` Design Principle 2 — "one idea
per step"). This is a genuine cross-module harmony gap, not an oversight — `RULES.md` records it
as a known, accepted deviation pending a future decision, rather than silently treating the
dashboard as if it were a compliant stepper.

**Status:** Active — but flagged as an **open question for the user**: rebuild as a Guided
Stepper in a future session, or formally adopt the accordion model for this module (and update
`TESTING.md`/`IMPLEMENTATION_PLAN.md` to match, or retire them)?

---

## ADR-002 — `PRODUCT.md` §5–6 (Engineering Graphics feature lists) do not apply to this module

**Decision:** Leave the local `PRODUCT.md` file byte-identical to the platform root copy (per
`DESIGN.md`/`PRODUCT.md`'s own "one canonical copy, never fork" rule), but treat §5 ("Features —
Module 1") and §6 ("Features — Module 2") as **not applicable** to this module — they describe
Engineering Graphics' orthographic-projection simulations (Compare View, cinematic fold, Lines
workbench, rotation hierarchy, etc.), none of which exist here or are relevant to Engineering
Mechanics.

**Why:** `PRODUCT.md` §1–4 and §7–9 (persona, anti-references, design principles, accessibility
commitments) are genuinely platform-wide and correctly apply. §5–6 are family-specific feature
audits that were carried over verbatim when the file was copied into this module's folder; they
are not "wrong" in the sense of being edited incorrectly, they simply describe a different
product family.

**Alternatives rejected:**
- *Rewrite `PRODUCT.md` locally with an Engineering-Mechanics §5.* Rejected for this pass: not in
  the Phase 2 instruction list, and editing a file whose whole premise is "one canonical copy,
  never fork" would itself be a rule violation unless done at the true shared root.
- *Delete `PRODUCT.md` from this module folder.* Rejected: `CLAUDE.md`'s pointer block still
  needs a `PRODUCT.md` to reference, and per `CLAUDE.module-template.md` this module doesn't own
  a separate copy — the file is inherited, not authored, by this module.

**Consequences:** Anyone reading `PRODUCT.md` §5–6 in this module folder must recognize it does
not describe Resultant of Forces — `CLAUDE.md`'s pointer block now says so explicitly to prevent
that confusion.

**Status:** Active — flagged as an open question for the user: should the platform's `PRODUCT.md`
template be restructured so family-specific feature lists live outside the single shared copy?
That would be a platform-wide change, not a local one — see `RULES.md` note.

---

## ADR-003 — Engineering Mechanics viewport palette: red/amber/blue-grey/purple/grey, never blue

**Decision:** Force P = red (`--color-force-p #c0392b`), Force Q = amber
(`--color-force-q #b7791f`), Resultant R + angle α = blue-grey (`--color-force-resultant
#546e7a`), Moment = purple (`--color-force-moment #7b1fa2`), and all component-breakdown/angle-arc
construction lines share one neutral grey (`--color-construction`, == `--color-bench-grey`,
dashed), distinguished from each other by arrow direction and label rather than by a second
color.

**Why:** The pre-harmonisation code used blue for both Force P and the X-component breakdown —
a direct violation of the Chrome-Only-Blue rule (`DESIGN.md` §2.3/§6), since the chrome accent is
also blue. `DESIGN.shared.md`'s Mechanics appendix already specified applied-force red,
resultant blue-grey, and moment purple; this ADR adopts those values for P/R/Moment. Q's amber
was kept close to its original hue (already non-blue, no rule violation) and Q didn't have a
color specified in the Mechanics encodings, but simply renamed and retoned from `#F59E0B` to
`#b7791f` to hit AA contrast on the paper background. Component breakdown (Px/Py/Qx/Qy) and the
θ angle arc were previously blue/green/grey; unifying them under `--color-construction` matches
the Mechanics rule "Construction/helper lines use dashed grey strokes" directly, and Two-Cue is
already satisfied by direction + label without needing a second hue per axis.

**Alternatives rejected:**
- *Give X and Y components their own distinct non-blue hues.* Rejected: would have invented two
  more undocumented tokens for a distinction the Two-Cue rule doesn't actually require, since
  direction + label already disambiguate Px from Py.
- *Keep Q's original `#F59E0B`.* Considered, but `#b7791f` was chosen instead for a small
  contrast improvement on the warm paper background; either value would have been rule-compliant.

**Consequences:** Blue (`--color-accent`) now appears only in chrome (current-step highlight,
focus rings, the logo mark) — never inside the viewport, satisfying the Chrome-Only-Blue rule.

**Status:** Active.

---

## ADR-004 — GSAP pinned as an ES module via import map, not a UMD `<script>` tag

**Decision:** Load GSAP 3.12.5 as `import gsap from 'gsap'` via the import map
(`https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js`), replacing the prior
`<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js">` UMD-global tag.

**Why:** `PLATFORM-RULES.md` §1.2/§1.3 require every third-party library to load as a
pinned-exact-version ES module through the import map, not a UMD global script tag — this
applies to whatever library a module depends on, not just Three.js.

**Alternatives rejected:**
- *Drop GSAP, reimplement reveals with the Web Animations API or a small rAF tween helper.*
  Rejected for this pass: GSAP is already deeply used for the multi-step popup and accordion
  reveal timelines; reimplementing that logic was out of scope for a compliance harmonisation and
  risked introducing new bugs. Worth reconsidering later for dependency-weight reasons, not a
  compliance reason (GSAP is now fully compliant as loaded).

**Consequences:** `main.js` now imports `gsap` as a module-scope binding instead of relying on a
window global; a `REDUCED_MOTION` flag set via `gsap.globalTimeline.timeScale(1000)` collapses
all timelines to effectively instant while still running `onComplete` callbacks and leaving state
correct, satisfying `prefers-reduced-motion` without rewriting every timeline call site.

**Status:** Active.

---

## ADR-005 — `window.simAPI.pause()`/`resume()` gate the render loop, not user input

**Decision:** `pause()`/`resume()` toggle a `simPaused` flag that the rAF loop checks before
calling `tick()`/`updateLabels()` each frame; pointer/slider event handlers are unaffected.

**Why:** The platform contract (`PLATFORM-RULES.md` §1.8) requires `pause()`/`resume()` to exist
but doesn't prescribe their exact semantics beyond "the host↔sim surface." Gating only the render
loop is the minimal, safe interpretation: a host embedding this sim (e.g., to pause it while a
modal opens elsewhere on the page) gets a real pause without this module inventing input-blocking
behavior nothing asked for.

**Alternatives rejected:**
- *Also block pointer/slider input while paused.* Rejected: adds complexity and a second state
  to keep in sync (drag-in-progress at the moment of pause) for a behavior the contract doesn't
  actually require.

**Consequences:** A host can freeze the render loop; state mutation and interaction remain live
if the user still has physical access to the sliders while paused (edge case, not expected in
normal host usage).

**Status:** Active.

---

## ADR-006 — Four fixed-quadrant vectors (A/B/C/D) replace free P/Q + shared θ

**Decision:** Replace the two-vector model (`magnitudeP`, `magnitudeQ`, `thetaDeg`, `pAngleDeg`)
with `state.vectors`, an array of exactly four fixed-role vectors — Force A permanently in
Quadrant I, B in QII, C in QIII, D in QIV. Each vector carries its own independent `magnitude`,
`angleDeg` (hard-clamped to its own 90° quadrant band, e.g. A: 1°–89°), and `enabled` flag. A
disabled vector still renders as a faint dashed "ghost" at its configured angle/magnitude rather
than disappearing.

**Why:** The two-vector model can only ever place the resultant in a narrow angular band and
never demonstrates that a resultant can land in any of the four quadrants — the stated goal of
this feature pass (see the "four-quadrant vector model" work item). Four independent,
quadrant-locked vectors are the minimal model that guarantees every quadrant is reachable while
keeping the UI bounded and predictable (a vector can never visually wander into another
quadrant's territory, so the Geometry panel and quadrant guide always agree with what's on
screen).

**Alternatives rejected:**
- *A fully free N-vector list (add/remove arbitrary vectors, any angle).* Rejected: adds
  meaningful UI complexity (dynamic list management, unbounded layout) not needed to demonstrate
  quadrant-aware summation; four fixed roles already exercise every quadrant and every
  sign-combination of ΣFx/ΣFy.
- *Four free vectors, unclamped, just seeded one per quadrant.* Rejected: a vector's quadrant
  label would drift as it's dragged, breaking the direct correspondence between "Force C" and
  "Quadrant III" that the Geometry panel and quadrant guide depend on.

**Consequences:** `src/forces.js#computeForces` now takes `state.vectors` and returns a
`vectors` array plus `Rx/Ry/R`; `src/scene.js#draw` iterates vectors instead of drawing two
literal arrows; the force-config panel, Geometry panel, and component-popup target type all
widen from `'P'|'Q'` to `'A'|'B'|'C'|'D'`. Color tokens `--color-force-p`/`--color-force-q` are
renamed to `--color-force-a`/`--color-force-b` (same hex values) and two new tokens
`--color-force-c`/`--color-force-d` are added — see `RULES.md` §1.1 for the updated encoding
table. `VALIDATION.md`'s existing P/Q/θ test cases are superseded and flagged stale pending a
full rewrite for the new model.

**Status:** Active.

---

## ADR-007 — Drop the Parallelogram Law cross-check; replace with quadrant-aware direction resolution

**Decision:** Remove `computeForces`'s Parallelogram Law cross-check (`R_para` via the law of
cosines, and the matching `alphaDeg` formula) entirely. The component-sum path (`Rx = ΣFix`, `Ry
= ΣFiy`, `R = √(Rx²+Ry²)`) becomes the sole resultant computation. In its place,
`computeForces` now returns `referenceAngleDeg` (0–90°, off the nearer axis), `actualDirectionDeg`
(0–360°, mapped from the reference angle by the sign pattern of Rx/Ry), and `resultantQuadrant`
(1–4, or `null` when the resultant sits on an axis or at the origin).

**This explicitly supersedes** the "component method + Parallelogram Law cross-check, both must
agree" invariant previously documented in `CLAUDE.md`'s State Model section, `ARCHITECTURE.md`
§6, and `VALIDATION.md` — per `PLATFORM-RULES.md` §4.4, this is recorded as a deliberate reversal,
not a silent one.

**Why:** The Parallelogram Law (`R = √(P²+Q²+2PQ cos θ)`) and its companion angle formula are
algebraically valid for exactly two vectors — there is no valid N-vector generalization of "the
angle θ between two forces" once there can be zero, one, three, or four active forces. Continuing
to require the cross-check would mean either silently ignoring vectors C and D whenever both A
and B are also enabled, or computing a mathematically meaningless number. The component-sum path
has no such limitation and already produces the exact same numbers for the two-vector case, so
nothing is lost for that scenario — the new quadrant-aware reference-angle/actual-direction split
is arguably richer pedagogy than the old single `alphaDeg` value, since it makes the "which
quadrant, and why" reasoning explicit instead of leaving it implicit in the sign of an atan2
result.

**Alternatives rejected:**
- *Keep the Parallelogram cross-check for A+B only, ignore C/D in that specific check.*
  Rejected: silently privileging two of the four vectors as "more real" than the others
  contradicts the whole point of the four-quadrant model, and would confuse a learner who enables
  C or D and sees a cross-check that doesn't account for them.
- *Replace it with a vector-polygon (tip-to-tail) construction as an N-vector-valid geometric
  cross-check.* Deferred, not rejected outright — a nice Phase 3 animation candidate (see the
  Net Resultant construction step) but not required for Phase 1's correctness goal.

**Consequences:** `src/forces.js` no longer exports `R_para`/`alphaDeg`; `src/scene.js`'s
direction-arc draw call now sweeps using the signed `atan2(Ry, Rx)` value recomputed locally
(short-arc-correct for all four quadrants), while the dashboard displays the new
`referenceAngleDeg`/`actualDirectionDeg`/`resultantQuadrant` fields. `VALIDATION.md` is flagged
stale pending a full rewrite of its test cases for the new model.

**Status:** Active.
