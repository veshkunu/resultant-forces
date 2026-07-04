# RULES.md — Resultant of Forces (extends `PLATFORM-RULES.md`)

Subject-specific enforcement checklist for this module. `PLATFORM-RULES.md` is the foundation —
every rule there still applies; this file adds only what it doesn't cover. Same format: **✅ DO**
/ **❌ NEVER**, each citing its source ADR in `DECISIONS.md`.

---

## Section 1 — Viewport color encodings

> **§1.1 ✅ DO** use `--color-force-a` (red) for Force A (Quadrant I), `--color-force-b` (amber) for
> Force B (Quadrant II), `--color-force-c` (wine) for Force C (Quadrant III), `--color-force-d`
> (olive) for Force D (Quadrant IV), `--color-force-resultant` (blue-grey) for R and its direction,
> `--color-force-moment` (purple) for the moment arc/arrow, and `--color-construction` (dashed
> grey) for all component-breakdown arrows, drop lines, and the quadrant guide. *(ADR-003, ADR-006)*

> **§1.2 ❌ NEVER** use `--color-accent` or any blue hue for a force, component, or construction
> element inside the viewport — blue is chrome-only in this module, same as the platform rule.
> *(ADR-003, PLATFORM-RULES.md §2.5)*

> **§1.3 ✅ DO** distinguish same-colored sub-parts (e.g. a vector's Fx vs Fy breakdown) by arrow
> direction and label alone — do not invent a second hue per axis. *(ADR-003)*

> **§1.4 ✅ DO** keep each of Force A/B/C/D permanently confined to its own 90° quadrant band —
> every vector is edited as a local 0–90° angle (`quadrantAngle()`, `src/forces.js`), never a
> global 0–360° one, so it can never cross into a neighbouring quadrant. *(ADR-006)*

> **§1.5 ❌ NEVER** reintroduce the Parallelogram Law cross-check (`R_para`/law-of-cosines
> `alphaDeg`) in `src/forces.js` — it is algebraically valid for exactly two vectors and has no
> N-vector form. Use the component-sum path (`Rx = ΣFix`, `Ry = ΣFiy`) plus quadrant-aware
> direction resolution instead. *(ADR-007)*

> **§1.6 ❌ NEVER** add a second way to change a force's magnitude/angle (canvas dragging,
> click-to-edit, etc.) — the floating edit panel, reached only through a Geometry force-card
> selection, is the sole input path. The workspace canvas has no pointer listeners of its own.
> *(interaction redesign, 2026-07-04)*

---

## Section 2 — Third-party libraries

> **§2.1 ✅ DO** load GSAP as `import gsap from 'gsap'` via the import map, pinned to an exact
> version on jsDelivr. **❌ NEVER** reintroduce a `<script src=...>` UMD tag for GSAP or any other
> library. *(ADR-004, PLATFORM-RULES.md §1.2/§1.3)*

> **§2.2 ✅ DO** gate every GSAP timeline through the module-load-time `REDUCED_MOTION` check
> (`gsap.globalTimeline.timeScale(1000)` when reduced motion is requested) rather than adding
> per-timeline duration branches. *(ADR-004)*

---

## Section 3 — Platform contract specifics

> **§3.1 ✅ DO** route `pause()`/`resume()` through the rAF loop's `simPaused` flag only — do not
> also block pointer/slider input on pause unless a future requirement demands it. *(ADR-005)*

> **§3.2 ✅ DO** keep `window.simAPI.reset()` as the only path that mutates `state` back to
> `DEFAULT_STATE`; the dashboard Reset button must call `simAPI.reset()`, never duplicate its
> logic. *(PLATFORM-RULES.md §1.9)*

---

## Section 4 — Documentation

> **§4.1 ❌ NEVER** treat `PRODUCT.md` §5 ("Features — Module 1") or §6 ("Features — Module 2")
> as describing this module — they are Engineering Graphics feature audits carried over with the
> single shared copy. This module's own features are documented in `ARCHITECTURE.md`. *(ADR-002)*

> **§4.2 ✅ DO** keep `src/sceneSetup.js`, `src/intro/*`, and `src/shared/*` out of any new
> feature work until ADR-001 is resolved — they are unwired legacy code, not a base to build on.
> *(ADR-001)*

> **§4.3 ✅ DO** update `TESTING.md`/`IMPLEMENTATION_PLAN.md` (or explicitly retire them) the
> moment ADR-001 is resolved either direction — they currently describe the unbuilt Guided
> Stepper, not the shipped dashboard. *(ADR-001)*

---

## Section 5 — Anti-patterns (quick scan, this module only)

- ❌ Re-adding a blue force/component color inside the viewport. *(§1.2)*
- ❌ Letting a vector's angle escape its assigned quadrant band. *(§1.4)*
- ❌ Reintroducing the 2-vector-only Parallelogram Law cross-check. *(§1.5)*
- ❌ Adding a second input path (drag, canvas click) alongside the floating edit panel. *(§1.6)*
- ❌ Loading any library via a UMD `<script>` tag. *(§2.1)*
- ❌ Wiring a new Reset-like control that doesn't call `window.simAPI.reset()`. *(§3.2)*
- ❌ Building new features on top of `src/sceneSetup.js`/`src/intro/*`/`src/shared/*` before
  ADR-001 is resolved. *(§4.2)*

---

*Extends `PLATFORM-RULES.md`. Where the two ever disagree, that's drift to fix, not a real
conflict — `PLATFORM-RULES.md` wins on any platform-wide rule.*
