# TESTING.md — Resultant of Forces Simulation
**Simatrix Engineering Mechanics · Module 1 · Simulation 2**

> **Template note.** This document is written for the Resultant of Forces simulation. Sections marked `<!-- ADAPT -->` contain simulation-specific content that must be rewritten when using this as a template for another Simatrix simulation. All other sections describe platform-wide testing practices that apply to every simulation in the series.

---

# TESTING OVERVIEW

## Purpose of This Document

This document defines the full user-facing test plan for the Resultant of Forces simulation. It covers how the simulation is experienced, navigated, and interacted with — not whether its calculations produce correct numbers.

A tester using this document asks: **Does the simulation work correctly for a student?**

## Difference Between TESTING.md and VALIDATION.md

These two documents are complementary and must both pass before release. They test different things.

| Concern | Document |
|---------|----------|
| Is R = √(P² + Q² + 2PQ cos θ) computed correctly? | **VALIDATION.md** |
| Does the resultant arrow appear on screen? | **TESTING.md** |
| Does the triangle law give the same R as the parallelogram law? | **VALIDATION.md** |
| Does the triangle law toggle animate correctly? | **TESTING.md** |
| What happens when P = 0? | **VALIDATION.md** |
| What does the slider look like when dragged to its minimum? | **TESTING.md** |
| Is the equation panel numerically correct? | **VALIDATION.md** |
| Does the equation panel update without a page reload? | **TESTING.md** |

**Do not repeat mathematical expected-answer tables here.** If a test requires verifying a number, refer to VALIDATION.md for the expected value and test only the visual/interactive behavior in this document.

## Testing Philosophy

Simatrix simulations are teaching instruments. A bug that produces a wrong number is covered by VALIDATION.md. But a bug that confuses, frustrates, or misleads a first-year B.Tech student is equally serious — and only caught here.

The testing philosophy is:

1. **Test as the persona.** The user is a struggling student, not a developer. Test flows that a timid, click-cautious student would take, not just power-user paths.
2. **Test progressive disclosure.** Each step must reveal exactly the controls the current step needs — no more, no less.
3. **Test every live update.** Every interaction must update the scene, the labels, and the equations within one frame. There is no acceptable delay.
4. **Test the narrative.** Step 1 has no sliders. The story must land before any equation appears.
5. **Test the absence of things.** A missing label, a missing arrow, or a color that leaked into the wrong element is a test failure.

---

# ENVIRONMENT TESTING

> <!-- ADAPT: Update the deployment URL and localhost port for each simulation. -->

Run these checks once in each target environment before beginning any step-by-step testing.

## Browsers

Test in all three target browsers. Each must behave identically.

| Browser | Version Target | Platform |
|---------|---------------|----------|
| Chrome | Latest stable | Windows |
| Edge | Latest stable | Windows |
| Firefox | Latest stable | Windows |

## Environments

| Environment | URL | Notes |
|-------------|-----|-------|
| Local development | `http://localhost/engineering-mechanics/resultant-forces/` | XAMPP htdocs |
| GitHub Pages (if deployed) | Project GitHub Pages URL | Verify paths are relative |

## Environment Checks

For each browser × environment combination:

### Console Check

- [ ] Open DevTools → Console tab
- [ ] Hard-reload the page (`Ctrl + Shift + R`)
- [ ] Confirm zero errors in the console
- [ ] Confirm zero failed network requests in the Network tab
- [ ] Confirm Three.js loads from CDN without 404 or CORS error
- [ ] Confirm all local `.js` files (main.js, src/*.js) load without 404

### Layout Check

- [ ] The step rail is visible on the left
- [ ] The step card is visible on the right or below the viewport
- [ ] The canvas fills its container without overflow
- [ ] No UI element is clipped or hidden behind another
- [ ] The page background is warm off-white (`--color-paper`), not white or black
- [ ] Fonts load correctly — body text uses Atkinson Hyperlegible, numeric values use IBM Plex Mono

### Three.js Check

- [ ] The canvas renders immediately on load — no blank white canvas
- [ ] The background grid is visible
- [ ] The X and Y axes are visible with arrowheads

---

# STEP-BY-STEP EDUCATIONAL TESTING

> <!-- ADAPT: Replace the step count, step names, and per-step checks for each simulation. -->

The simulation has **6 steps**. Test each step in order. Do not skip steps.

For each step: navigate to it using the Next button, verify the listed items, then proceed.

---

## Step 1 — Tugboat Introduction

**Expected title:** "Two Forces, One Effect"

### Scene Verification

- [ ] Two tugboat silhouettes are visible in the viewport
- [ ] A ship silhouette is visible at or near the center of the scene
- [ ] Two force arrows are visible — one red (P), one amber-orange (Q)
- [ ] The arrows are labeled `P` and `Q`
- [ ] A dashed line suggests a combined movement direction
- [ ] No coordinate axes are shown (this is a narrative scene, not a force diagram)
- [ ] No grid is shown
- [ ] The boats and ship are geometric shapes — no photographs or raster images

### Narrative Verification

- [ ] The step card title reads correctly
- [ ] The lead text explains the tugboat scenario in plain language
- [ ] No equation, formula, or mathematical symbol appears anywhere on the card or in the scene
- [ ] The word "resultant" may appear but only in a plain-language sentence — never in a formula context

### Control Verification

- [ ] No sliders are visible
- [ ] No numeric inputs are visible
- [ ] No toggle controls are visible
- [ ] No preset buttons are visible
- [ ] The Back button is hidden (this is Step 1)
- [ ] The Next button is visible and labeled "Next →"

### Navigation

- [ ] Clicking Next advances to Step 2
- [ ] The step rail shows Step 1 as current (filled accent disc)
- [ ] Steps 2–6 show as upcoming (hollow discs)

---

## Step 2 — Two Force Vectors

**Expected title:** "Two Concurrent Forces"

### Scene Verification

- [ ] The tugboat scene is gone — the viewport shows a clean force diagram
- [ ] A background grid is visible
- [ ] The X and Y axes are visible
- [ ] The origin `O` is labeled
- [ ] Axis labels `X` and `Y` are visible at the axis ends
- [ ] A red arrow representing force P is drawn from the origin
- [ ] An amber-orange arrow representing force Q is drawn from the same origin
- [ ] An angle arc is drawn between P and Q
- [ ] The label `θ = {value}°` appears near the arc midpoint
- [ ] The label `P = {value} N` appears near the tip of P
- [ ] The label `Q = {value} N` appears near the tip of Q
- [ ] **No resultant R arrow is drawn** — this is correct for Step 2
- [ ] **No parallelogram ghost lines** are drawn
- [ ] P and Q are visually distinct in color — one is red, one is amber

### Control Verification

- [ ] Three sliders are visible: Magnitude P, Magnitude Q, and Angle θ
- [ ] Each slider has a paired numeric input showing the current value with its unit (N or °)
- [ ] Default values are reasonable (e.g. P = 100 N, Q = 100 N, θ = 45°)

### Slider Interaction — Magnitude P

- [ ] Dragging the P slider increases/decreases the length of the P arrow in real time
- [ ] The `P = {value} N` label updates on every frame during drag
- [ ] The numeric input for P updates on every frame during drag
- [ ] The Q arrow and angle arc are unaffected by changing P alone

### Slider Interaction — Magnitude Q

- [ ] Dragging the Q slider increases/decreases the length of the Q arrow in real time
- [ ] The `Q = {value} N` label updates on every frame during drag
- [ ] The numeric input for Q updates on every frame during drag
- [ ] The P arrow is unaffected by changing Q alone

### Slider Interaction — Angle θ

- [ ] Dragging the θ slider rotates Q relative to P in real time
- [ ] The angle arc between P and Q updates continuously during drag
- [ ] The `θ = {value}°` label updates during drag
- [ ] P does not rotate — only Q moves
- [ ] At θ = 0°: Q overlaps P (same direction). The arc disappears gracefully — no error
- [ ] At θ = 180°: Q points directly opposite to P. The arc disappears gracefully — no error

### Navigation

- [ ] Back returns to Step 1
- [ ] Next advances to Step 3
- [ ] Values entered in Step 2 are preserved when moving to Step 3

---

## Step 3 — Parallelogram Construction

**Expected title:** "The Parallelogram Law"

### Animation Verification (first entry to Step 3)

- [ ] On entering Step 3, a sequential animation plays:
  1. A dashed ghost copy of Q grows outward from the tip of P
  2. A dashed ghost copy of P grows outward from the tip of Q
  3. A diagonal arrow grows from the origin toward the opposite corner
- [ ] The animation takes approximately 1.3 seconds total (400 ms + 400 ms + 500 ms)
- [ ] The animation is not skippable by the user but does not block slider interaction

### Scene Verification (after animation completes)

- [ ] The original P arrow (red, solid) is visible from the origin
- [ ] The original Q arrow (amber, solid) is visible from the origin
- [ ] Two dashed ghost lines form the other two sides of the parallelogram
- [ ] Ghost lines are bench-grey and clearly dashed — not solid
- [ ] Ghost lines are visually subordinate (lower opacity) to P and Q
- [ ] The diagonal arrow is visible — this is the emerging resultant
- [ ] The diagonal arrow is NOT labeled R yet and does NOT show a value — that is Step 4
- [ ] The angle arc and θ label remain visible

### Reduced Motion Verification

- [ ] Enable `prefers-reduced-motion: reduce` in the OS accessibility settings
- [ ] Reload and navigate to Step 3
- [ ] The parallelogram and diagonal appear instantly — no animation
- [ ] All scene elements are in their final positions immediately

### Slider Interaction During Step 3

- [ ] Dragging the P slider updates the full parallelogram continuously — no flickering
- [ ] Dragging the Q slider updates the full parallelogram continuously — no flickering
- [ ] Dragging the θ slider reshapes the parallelogram continuously — no flickering
- [ ] At θ = 0° the parallelogram collapses to a line. Verify no crash and no visible error
- [ ] At θ = 180° the parallelogram collapses to a line. Verify no crash and no visible error

### Construction Lines Toggle (if present)

- [ ] A toggle to show/hide construction lines is visible in the controls area
- [ ] Hiding construction lines removes the dashed ghost sides from the scene
- [ ] The original P and Q arrows remain visible when construction is hidden
- [ ] Re-enabling the toggle restores the ghost lines immediately

### Navigation

- [ ] Values are preserved from Step 2
- [ ] Back returns to Step 2 without resetting P, Q, or θ

---

## Step 4 — Resultant Force

**Expected title:** "The Resultant Force"

### Scene Verification

- [ ] The resultant R arrow is now visible — it originates at the origin and points along the parallelogram diagonal
- [ ] R is visibly **thicker** than P and Q — not just a different color
- [ ] R is blue-grey (`--color-force-resultant`) — not red, not amber, not the accent blue
- [ ] The label `R = {value} N` appears near the tip of R
- [ ] The label `α = {value}°` appears near R showing the direction angle
- [ ] P, Q, ghost lines, R, and all labels are visible simultaneously with no overlap
- [ ] The angle arc and θ label remain visible

### Equations Panel Verification

- [ ] An equations panel is now visible in the UI
- [ ] The panel title reads `RESULTANT EQUATIONS` (or equivalent label-style heading)
- [ ] The panel shows the symbolic formula `R = √(P² + Q² + 2PQ cos θ)`
- [ ] The panel shows the computed value of R in Newtons
- [ ] The panel shows the symbolic formula `α = arctan(Q sin θ / (P + Q cos θ))`
- [ ] The panel shows the computed value of α in degrees (1 decimal place)
- [ ] The panel shows the current values of P, Q, and θ
- [ ] All values in the panel use IBM Plex Mono font (monospace, tabular figures)
- [ ] **The equations panel was NOT visible in Steps 1, 2, or 3** — confirm this is the first appearance

### Live Update Verification

- [ ] Drag the P slider: R arrow length changes, R label value changes, equation panel values change — all simultaneously
- [ ] Drag the Q slider: same behavior
- [ ] Drag the θ slider: R arrow rotates, R magnitude changes, equation panel updates — all simultaneously
- [ ] There is no visible lag between slider position and scene update

### R Thickness Confirmation

- [ ] Place P = 100 N, Q = 100 N, θ = 90°
- [ ] The R arrow shaft is clearly wider than the P and Q shafts
- [ ] The R arrowhead is clearly larger than the P and Q arrowheads

### Navigation

- [ ] Values are preserved from Step 3
- [ ] Back returns to Step 3 — the parallelogram animation does not replay

---

## Step 5 — Triangle Law

**Expected title:** "The Triangle Law"

### Toggle Verification

- [ ] A view toggle control is visible: two options labeled "Parallelogram" and "Triangle"
- [ ] On entry to Step 5, the toggle is set to "Parallelogram" by default
- [ ] The parallelogram view from Step 4 is shown initially

### Switching to Triangle View

- [ ] Click or keyboard-activate the "Triangle" option on the toggle
- [ ] An animation plays: Q translates from its origin position to the tip of P
- [ ] A closing vector R is drawn from the origin to the translated tip of Q
- [ ] Duration: approximately 600 ms for Q translation + 400 ms for R (1000 ms total)
- [ ] The parallelogram ghost lines disappear in triangle view
- [ ] The angle arc (θ) disappears in triangle view
- [ ] The arrangement reads as a closed triangle: P (from origin) → Q (from tip of P) → R (closing vector back to origin)

### Triangle View Scene Verification

- [ ] P is drawn from the origin — same direction as in parallelogram view
- [ ] Q is drawn from the tip of P — tip-to-tail arrangement
- [ ] R closes the triangle from origin to the tip of translated Q
- [ ] R magnitude label shows the same value as in parallelogram view
- [ ] α label shows the same value as in parallelogram view
- [ ] The resultant R has the same visual thickness and color as in Step 4

### Switching Back to Parallelogram View

- [ ] Click "Parallelogram" on the toggle
- [ ] The scene returns to the parallelogram layout
- [ ] Q returns to the origin
- [ ] The ghost construction lines reappear
- [ ] P, Q, θ, R values are unchanged

### Toggle Repeated Switching

- [ ] Switch between Parallelogram and Triangle at least 5 times in rapid succession
- [ ] No ghost elements remain on screen when they should be hidden
- [ ] No arrows are duplicated
- [ ] No console errors

### Slider Interaction in Triangle View

- [ ] While in Triangle view, drag the P slider
- [ ] The triangle updates: P length changes, Q repositions to P's new tip, R updates
- [ ] All labels update simultaneously
- [ ] The equations panel updates simultaneously

### Navigation

- [ ] Back returns to Step 4
- [ ] Forward from Step 5 advances to Step 6
- [ ] The toggle state is not preserved after navigating away and back (acceptable)

---

## Step 6 — Explore and Compare

**Expected title:** "Special Cases"

### Preset Buttons Verification

- [ ] Four preset buttons are visible:
  - `θ = 0°`
  - `θ = 90°`
  - `P = Q, θ = 120°`
  - `θ = 180°`
- [ ] Each button is at least 44px tall
- [ ] Clicking each button sets the corresponding values and updates the full scene

### Preset: θ = 0°

- [ ] θ slider jumps to 0
- [ ] Q overlaps P (collinear, same direction)
- [ ] No angle arc is drawn
- [ ] R equals P + Q (verify against VALIDATION.md case D5 or A1 for specific values)
- [ ] Insight callout reads: "Forces aligned — R is at its maximum: R = P + Q."

### Preset: θ = 90°

- [ ] θ slider jumps to 90
- [ ] P and Q are perpendicular
- [ ] Angle arc shows 90°
- [ ] Insight callout mentions the Pythagorean theorem

### Preset: P = Q, θ = 120°

- [ ] Both magnitude sliders jump to the same value (e.g. 100 N)
- [ ] θ slider jumps to 120
- [ ] R magnitude equals P = Q (verify against VALIDATION.md case A6)
- [ ] Insight callout reads the equal-forces-at-120° message

### Preset: θ = 180°

- [ ] θ slider jumps to 180
- [ ] Q points opposite to P
- [ ] No angle arc is drawn
- [ ] Parallelogram ghost collapses to a line — no crash
- [ ] R = |P − Q| (if P ≠ Q) or R = 0 (if P = Q)
- [ ] Insight callout reads: "Forces directly opposed — R = |P − Q|..."

### Free Exploration

- [ ] After using a preset, the student can freely drag any slider
- [ ] The preset button is no longer highlighted when sliders change
- [ ] The insight callout updates continuously as θ changes
- [ ] Insight text changes at the correct angle thresholds (0°, 60°, 90°, 120°, 180°)

### Insight Callout Transitions

Test that the insight text changes at each threshold:

| Action | Expected insight text begins with |
|--------|----------------------------------|
| θ → 0° | "Forces aligned —" |
| θ → 45° | "Angle is small —" |
| θ → 60° (P = Q) | "At 60°," |
| θ → 90° | "Perpendicular forces —" |
| θ → 120° (P = Q) | "Equal forces at 120° —" |
| θ → 135° | "Large angle —" |
| θ → 180° | "Forces directly opposed —" |

- [ ] Each threshold produces the correct insight text
- [ ] Insight text never appears blank or undefined

### Navigation

- [ ] The Next button on Step 6 is labeled "Start over"
- [ ] Clicking "Start over" returns to Step 1
- [ ] All values reset to defaults on restart

---

# CONTROL TESTING

## Sliders

> <!-- ADAPT: List the sliders specific to each simulation. For Resultant Forces: P, Q, θ. -->

All sliders: Magnitude P, Magnitude Q, Angle θ.

### Mouse / Touch Interaction

- [ ] Click and drag any slider thumb — the value updates continuously
- [ ] Release the slider — the value stays at the released position
- [ ] Click on the slider track (not the thumb) — the thumb jumps to the clicked position
- [ ] The scene, labels, and equations update on every pixel of movement

### Keyboard Navigation

- [ ] Tab to a slider — the thumb receives a visible focus ring (accent halo)
- [ ] Press Right Arrow — value increases by 1 step
- [ ] Press Left Arrow — value decreases by 1 step
- [ ] Press Up Arrow — value increases by 1 step
- [ ] Press Down Arrow — value decreases by 1 step
- [ ] Hold Shift + Right Arrow — value increases by 0.5 (fine adjustment step)
- [ ] Hold Shift + Left Arrow — value decreases by 0.5 (fine adjustment step)
- [ ] The scene updates on each key press — not only on key release

### Boundary Behavior

- [ ] Drag the P slider to its minimum (0 N) — the P arrow disappears or is invisible. No crash.
- [ ] Drag the P slider to its maximum (e.g. 500 N) — the P arrow extends to near the edge of the viewport. No clipping of the arrowhead beyond the canvas boundary.
- [ ] Drag the θ slider to 0° — angle arc disappears. No crash.
- [ ] Drag the θ slider to 180° — angle arc disappears. No crash. Parallelogram collapses gracefully.
- [ ] Drag the Q slider to 0 N with θ = 180° and P > 0 — R equals P. No crash.

---

## Numeric Inputs

Each slider has a paired numeric input field. Test each field independently.

### Manual Typing

- [ ] Click into the numeric input for P
- [ ] The current value is selected (ready to overtype)
- [ ] Type `150` and press Enter
- [ ] The P slider jumps to 150
- [ ] The P arrow updates immediately
- [ ] The equations panel updates immediately

### Tab Focus Select-All

- [ ] Tab into the numeric input for θ
- [ ] The current value is fully selected (no partial selection)
- [ ] Start typing immediately — the old value is replaced

### Copy and Paste

- [ ] Copy a value from an external source (e.g. `120`)
- [ ] Paste it into the θ numeric input
- [ ] Press Enter
- [ ] The θ slider updates to 120 and the scene redraws

### Invalid Input — Non-Numeric

- [ ] Type `abc` into the P numeric input
- [ ] Press Enter or Tab away
- [ ] The input reverts to the last valid value — no crash, no NaN display
- [ ] The scene is unaffected

### Invalid Input — Empty Field

- [ ] Clear the numeric input for Q (select all and delete)
- [ ] Tab away without typing a value
- [ ] The input reverts to the last valid value — no crash
- [ ] The scene is unaffected

### Out-of-Range Values

- [ ] Type `999` into the P input (above maximum)
- [ ] Press Enter
- [ ] The value is clamped to the slider maximum — not accepted as-is
- [ ] Type `-50` into the θ input (below minimum)
- [ ] Press Enter
- [ ] The value is clamped to 0 — not accepted as-is

### Decimal Entry

- [ ] Type `75.5` into the P input
- [ ] The slider moves to 75.5 (or the nearest step)
- [ ] The displayed value rounds correctly according to VALIDATION.md display precision rules

---

# ACCESSIBILITY TESTING

## Keyboard-Only Operation

Complete the entire simulation using only the keyboard. No mouse.

- [ ] Tab forward through all focusable elements in each step
- [ ] Shift+Tab backward works in all steps
- [ ] The Next and Back buttons are reachable by Tab
- [ ] All sliders are reachable by Tab and operable by arrow keys
- [ ] All numeric inputs are reachable by Tab and accept typed values
- [ ] The construction lines toggle (Step 3) is reachable and operable
- [ ] The parallelogram/triangle toggle (Step 5) is reachable and operable
- [ ] The preset buttons (Step 6) are reachable and activatable by Enter/Space
- [ ] The full simulation can be completed from Step 1 to Step 6 without touching the mouse

## Visible Focus States

- [ ] Every interactive element shows a visible focus ring when focused via keyboard
- [ ] Focus rings use the accent halo (`0 0 0 3px` accent at 26% opacity) — not the default browser outline
- [ ] Focus rings are never removed or hidden with `outline: none` without a replacement
- [ ] The step rail markers do not capture Tab focus (they are informational only)

## Screen Reader

Test with NVDA (Windows) + Firefox or Chrome.

- [ ] The page has a meaningful `<title>` element
- [ ] The step counter ("Step X of 6") is announced when it changes
- [ ] Slider labels are announced when the slider is focused ("Magnitude P slider")
- [ ] Slider values are announced as the slider moves
- [ ] The equations panel has `aria-live="polite"` — value changes are announced without interrupting
- [ ] The hint callout is readable by screen reader
- [ ] The step rail announces "Step X, completed" for completed steps and "Step X, current" for the active step
- [ ] The concept-check quick questions (if present) are fully operable by keyboard and announced correctly

## Color Independence

These tests verify that no engineering meaning is conveyed by color alone.

- [ ] **P vs Q distinction:** P (red) and Q (amber) are labeled. A student who cannot distinguish red from amber can still identify which force is P and which is Q by the letter label.
- [ ] **R vs P/Q:** R is labeled `R = {value} N` and is visibly thicker. A student who cannot see the blue-grey color can still identify R by its label and thickness.
- [ ] **Construction lines vs force arrows:** Construction lines are dashed. A student who cannot see the bench-grey color can still identify them as secondary (dashed vs solid).
- [ ] **Completed step vs current step:** The step rail uses a check mark glyph for completed steps and a number for current/upcoming. Color is not the only cue.
- [ ] **Active preset button:** A pressed preset button shows an accent-soft background AND a structural difference (label text, or border change) — not only a color change.

## Contrast

- [ ] P arrow (red `#c0392b`) against the paper background (`#faf8f3`): visually clear
- [ ] Q arrow (amber `#bc5d1e`) against the paper background: visually clear
- [ ] R arrow (blue-grey `#546e7a`) against the paper background: visually clear
- [ ] Construction ghost lines (bench-grey `#938b7b`) at 55% opacity: still distinguishable from the background — dashed pattern compensates for low contrast
- [ ] Equations panel text: ink (`#221f18`) on paper (`#faf8f3`) — confirm ratio ≥ 7:1

## Reduced Motion

- [ ] Enable `prefers-reduced-motion: reduce` in Windows → Accessibility → Motion settings
- [ ] Reload the simulation
- [ ] Navigate to Step 3: parallelogram appears instantly — no sequential animation
- [ ] Navigate to Step 5: triangle view appears instantly — Q does not animate across the screen
- [ ] All simulations functions normally — no broken layout caused by removed animations

---

# RESPONSIVE TESTING

Test the following viewport widths. Use Chrome DevTools device emulation or resize the browser window.

> <!-- ADAPT: Update minimum supported width if the simulation layout changes. -->

## Viewports

| Label | Width × Height | Priority |
|-------|---------------|----------|
| Full HD | 1920 × 1080 | Required |
| Standard laptop | 1366 × 768 | Required |
| Small laptop | 1280 × 720 | Required |
| Tablet landscape | 1024 × 768 | Required |
| Tablet portrait | 768 × 1024 | Required |
| Mobile (reference only) | 375 × 667 | Observe and note |

## Checks at Every Viewport

### Layout Integrity

- [ ] The step rail is fully visible — no markers are cut off
- [ ] The step card is fully visible — title, lead, hint, controls all readable
- [ ] The canvas viewport fills the remaining space without overflow
- [ ] No horizontal scrollbar appears at any required viewport width
- [ ] The equations panel is visible and not clipped when present (Steps 4–6)

### Canvas Usability

- [ ] At 1280 × 720: the canvas is large enough to read the force arrows and labels
- [ ] At 1024 × 768: the canvas is still usable — force arrows do not appear microscopic
- [ ] Labels (P, Q, R, θ, α) do not overlap the canvas border
- [ ] Labels do not overlap each other when P and Q have similar angles

### Control Usability

- [ ] Sliders are at least 44px tall at all tested viewports
- [ ] Slider thumbs are reachable without precision — no tiny hit targets
- [ ] Numeric inputs are legible at all viewports
- [ ] Preset buttons in Step 6 are legible and tappable at tablet width — row wraps if needed

### Step Rail at Narrow Widths

- [ ] At tablet portrait (768px): the step rail may collapse or the labels may shorten — verify it is still navigable
- [ ] At no width do step rail markers overlap each other

---

# PERFORMANCE TESTING

## Frame Rate During Interaction

- [ ] Open Chrome DevTools → Performance tab
- [ ] Begin recording
- [ ] Drag the θ slider rapidly back and forth for 5 seconds
- [ ] Stop recording
- [ ] Inspect the flame chart: frame time should remain below 16.7 ms (60 fps target)
- [ ] No individual frame should exceed 50 ms (20 fps floor) during slider drag

## Memory Stability

- [ ] Open Chrome DevTools → Memory tab
- [ ] Take a heap snapshot on Step 2
- [ ] Navigate to Step 3, Step 4, Step 5, Step 6, then back to Step 1
- [ ] Take a second heap snapshot
- [ ] Compare: heap size should not grow by more than ~5 MB across the full navigation cycle
- [ ] Verify that Three.js geometry and materials from previous steps are being disposed — look for absence of accumulated `BufferGeometry` and `MeshBasicMaterial` objects

## Parallelogram Animation Performance

- [ ] Navigate to Step 3 and watch the parallelogram construction animation
- [ ] The animation must play smoothly at 60 fps — no stuttering, no frame skips
- [ ] Repeat 5 times by navigating back and forward between Steps 2 and 3
- [ ] Each replay of the animation performs the same as the first

## CPU at Rest

- [ ] Leave the simulation open on Step 4 without touching any control
- [ ] Open Task Manager → check CPU usage
- [ ] CPU usage from the browser tab must be minimal (< 5%) when nothing is being interacted with
- [ ] The rAF loop must not cause sustained CPU load when nothing is animating

---

# ERROR HANDLING TESTING

## Invalid Numeric Input

- [ ] Type `NaN` into any numeric field → reverts to last valid value, no crash
- [ ] Type `Infinity` into any numeric field → clamped to maximum, no crash
- [ ] Type a very long string (e.g. `99999999999`) → clamped to slider maximum, no crash
- [ ] Type a negative number into P or Q field → clamped to 0, no crash

## Extreme Slider Values

- [ ] Set P = 500 N (or maximum), Q = 500 N, θ = 90°
  - [ ] The arrows are very long but do not extend off the canvas
  - [ ] The parallelogram construction fits within the viewport
  - [ ] The R label does not fall off the canvas edge
- [ ] Set P = 1 N, Q = 1 N, θ = 45°
  - [ ] Arrows are very short but still visible
  - [ ] Labels are still positioned near the tiny arrow tips — not overlapping the origin

## Degenerate Geometry Cases

- [ ] P = 0 N, Q = 100 N, θ = 45°
  - [ ] No P arrow is drawn (zero-length arrow suppressed)
  - [ ] R arrow equals Q exactly in length and direction
  - [ ] No crash, no NaN in the equations panel
- [ ] P = 100 N, Q = 0 N, θ = 45°
  - [ ] No Q arrow is drawn
  - [ ] R arrow equals P exactly
  - [ ] No crash
- [ ] P = 100 N, Q = 100 N, θ = 0°
  - [ ] Angle arc suppressed (θ < 1°)
  - [ ] Parallelogram ghost lines suppressed — no degenerate polygon drawn
  - [ ] R = 200 N displayed correctly
- [ ] P = 100 N, Q = 100 N, θ = 180°
  - [ ] Angle arc suppressed
  - [ ] Parallelogram ghost suppressed
  - [ ] R = 0 N — no R arrow drawn
  - [ ] R label shows `R = 0 N` or is hidden
  - [ ] No division-by-zero error in the console

## Three.js Initialization

- [ ] Navigate to Step 1 with JavaScript disabled in the browser
  - [ ] A graceful message appears (or the page loads normally but the canvas is blank)
  - [ ] No unhandled exception crashes the page
- [ ] Navigate to Step 1 with the CDN blocked (simulate by going offline after first load)
  - [ ] On first hard reload with CDN blocked: a meaningful error or fallback appears
  - [ ] On subsequent load after caching: the simulation loads from the browser cache

## Browser Tab Visibility

- [ ] Start on Step 4 with a slider being dragged
- [ ] Switch to a different browser tab for 30 seconds
- [ ] Switch back to the simulation tab
- [ ] The scene is in the correct state — the rAF loop resumed without doubling up or freezing
- [ ] No console errors from the tab-visibility event

---

# REGRESSION TESTING

Run this section after every pull request, refactor, or significant code change. It covers the most likely breakage points in the simulation.

> <!-- ADAPT: Update specific test values to match this simulation's key validation results from VALIDATION.md. -->

## After Changes to `src/vectorMath.js`

- [ ] Set P = 100 N, Q = 100 N, θ = 90° → confirm R ≈ 141 N (VALIDATION.md case A5)
- [ ] Set P = 100 N, Q = 100 N, θ = 120° → confirm R = 100 N exactly (VALIDATION.md case A6)
- [ ] Set P = 300 N, Q = 400 N, θ = 90° → confirm R = 500 N (VALIDATION.md case B8)
- [ ] Switch to Triangle view → confirm same R and α as parallelogram view for the same inputs

## After Changes to `src/sceneSetup.js`

- [ ] P arrow is red, Q arrow is amber — colors have not swapped
- [ ] R arrow is blue-grey and visually thicker than P and Q
- [ ] Construction ghost lines are dashed, not solid
- [ ] The parallelogram construction animation replays correctly when entering Step 3 fresh
- [ ] The triangle law animation plays correctly when toggling to Triangle view in Step 5
- [ ] At θ = 0° and θ = 180°: no angle arc, no parallelogram ghost, no crash

## After Changes to `src/steps.js`

- [ ] Step 1 shows no sliders and no equations
- [ ] Step 2 shows P, Q, θ sliders — no resultant R arrow
- [ ] Step 3 shows P, Q, θ sliders and the parallelogram construction
- [ ] Step 4 shows P, Q, θ sliders, R arrow, and the equations panel
- [ ] Step 5 shows the parallelogram/triangle toggle in addition to Step 4 controls
- [ ] Step 6 shows preset buttons and the insight callout
- [ ] The step rail correctly shows 6 markers labeled: Intro, Two Forces, Parallelogram, Resultant, Triangle Law, Explore

## After Changes to `src/uiManager.js`

- [ ] The equations panel values update live during slider drag (no stale values)
- [ ] IBM Plex Mono is applied to all numeric value spans in the equations panel
- [ ] The insight callout in Step 6 updates text correctly at each angle threshold
- [ ] Preset buttons in Step 6 set correct values on click
- [ ] The concept-check quick questions (if present) evaluate and display feedback correctly

## After Changes to `style.css`

- [ ] The page background is warm off-white (paper), not white or grey
- [ ] No blue color appears inside the canvas or on force arrows
- [ ] The step rail shows correct states: completed = green + check, current = blue, upcoming = hollow
- [ ] Sliders show the accent fill on the traveled portion of the track
- [ ] Numeric inputs use IBM Plex Mono
- [ ] Focus rings are visible on all interactive elements

## After Changes to `index.html`

- [ ] All required DOM element IDs are present (step-counter, step-title, step-lead, controls-area, equations-area, canvas element, label overlays)
- [ ] All label overlay elements are present: label-p, label-q, label-r, label-theta, label-alpha, label-x, label-y, label-origin
- [ ] The step rail container is present and the UIManager can populate it
- [ ] No console errors on fresh load

---

# RELEASE CHECKLIST

Complete this checklist in order before marking any build as ready for deployment.

## Phase 1 — Mathematical Validation (VALIDATION.md)

- [ ] All Group A test cases pass (equal forces, 8 cases)
- [ ] All Group B test cases pass (unequal forces, 8 cases)
- [ ] Group C: triangle law matches parallelogram law to ±0.01 N for all 4 cases
- [ ] Group D: all 6 textbook-style derivations produce expected answers
- [ ] All 7 edge cases (E1–E7) behave as specified — no crash, no NaN
- [ ] Display precision rules are met for all quantity types

## Phase 2 — Educational Flow (TESTING.md)

- [ ] Step 1 (Tugboat): narrative loads, no equations visible, scene renders
- [ ] Step 2 (Two Forces): sliders work, labels update live, no resultant visible
- [ ] Step 3 (Parallelogram): construction animation plays, dashed ghost lines correct
- [ ] Step 4 (Resultant): R arrow appears, R is thicker, equations panel appears
- [ ] Step 5 (Triangle Law): toggle works both ways, R is identical in both views
- [ ] Step 6 (Explore): all 4 presets work, insight callout updates at all thresholds
- [ ] Navigation: Back/Next work at every step, values preserved across steps

## Phase 3 — Control Testing

- [ ] All sliders operable by mouse drag
- [ ] All sliders operable by keyboard (Arrow keys, Shift+Arrow fine steps)
- [ ] All numeric inputs accept typed values, reject invalid input without crashing
- [ ] Boundary values (P=0, θ=0°, θ=180°) handled gracefully at every step

## Phase 4 — Accessibility

- [ ] Full simulation completable by keyboard alone
- [ ] All interactive elements have visible focus rings
- [ ] Screen reader test passed (NVDA + Firefox): slider values announced, equations announced via aria-live
- [ ] No engineering meaning conveyed by color alone (labels + line styles confirm each cue)
- [ ] Reduced motion: all animations disabled, simulation fully functional

## Phase 5 — Responsive

- [ ] Passes at 1920 × 1080
- [ ] Passes at 1366 × 768
- [ ] Passes at 1280 × 720
- [ ] Passes at 1024 × 768 (tablet landscape)
- [ ] Passes at 768 × 1024 (tablet portrait)
- [ ] No horizontal scroll at any required viewport

## Phase 6 — Performance

- [ ] Slider drag maintains 60 fps (≤ 16.7 ms per frame)
- [ ] No memory leak across full navigation cycle (Step 1 → Step 6 → Step 1)
- [ ] CPU at rest (no interaction): < 5% sustained usage
- [ ] Parallelogram animation smooth on first and repeated entry to Step 3

## Phase 7 — Error Handling

- [ ] P = 0 and Q = 0: no crash, no NaN
- [ ] θ = 0°: no angle arc, no degenerate parallelogram, R = P + Q
- [ ] P = Q, θ = 180°: R = 0, no R arrow, no crash
- [ ] All invalid numeric inputs revert gracefully

## Phase 8 — Regression

- [ ] Regression suite passed after last code change (see Regression Testing section above)
- [ ] No console errors on fresh load in any target browser
- [ ] All CSS variables resolve correctly — no fallback values visible

## Phase 9 — Deployment

- [ ] Deployed to target URL
- [ ] All assets load over HTTPS without mixed-content errors
- [ ] Three.js CDN loads correctly in the deployed environment
- [ ] All relative paths resolve correctly — no 404s in Network tab
- [ ] Console is clean in the deployed environment
- [ ] Full educational flow tested in the deployed environment (not just locally)

---

# SIGN-OFF TABLE

> Complete one row for each testing session. A release requires at least one sign-off with Status = PASS covering all Phase 1–9 items above.

| Date | Tester | Version / Commit | Environment | Phases Covered | Status | Notes |
|------|--------|-----------------|-------------|---------------|--------|-------|
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |

**Status values:** `PASS` · `FAIL` · `PARTIAL` · `IN PROGRESS`

**Phases Covered:** List phase numbers tested in this session (e.g. `1–3, 6`). A full-suite session writes `1–9`.

---

*This document is part of the Simatrix Engineering Mechanics · Module 1 test suite. Sections marked `<!-- ADAPT -->` must be updated when reusing this template for a different simulation. All platform-wide sections (Environment Testing, Control Testing, Accessibility, Performance, Error Handling) apply unchanged to every simulation in the series.*
