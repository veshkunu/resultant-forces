# DESIGN.md — Resultant of Forces Simulation

> **How to use this file.** This document is the **simulation-specific** design appendix for the Resultant Forces simulation. It adds domain encodings and viewport behavior that are specific to this simulation only.
>
> **This file does not replace DESIGN.shared.md.** All tokens (colors, typography, spacing, radii, components) remain authoritative in DESIGN.shared.md. This file only documents what is added on top of those shared rules.
>
> Where any rule in this file conflicts with DESIGN.shared.md, DESIGN.shared.md wins.

---

## 1. Force Color Encodings

These encodings extend the shared Mechanics Functional Colors from DESIGN.shared.md.

| Force | CSS Variable | Hex Value | Source |
|-------|-------------|-----------|--------|
| Force P (applied) | `--color-force-p` | `#c0392b` | DESIGN.shared.md Applied Force |
| Force Q (applied) | `--color-force-q` | `#bc5d1e` | DESIGN.shared.md VP Amber |
| Resultant R | `--color-force-resultant` | `#546e7a` | DESIGN.shared.md Resultant Force |
| Construction lines | `--color-construction` | `#938b7b` | DESIGN.shared.md Bench Grey |

**Rationale for P and Q distinction:**

P and Q are both applied forces but must be visually distinct at all times. P uses the standard Applied Force red. Q uses VP Amber, which is already defined in the shared design system and is color-blind-safe alongside red (amber and red are distinguishable even under deuteranopia through their warm-to-cool relationship on screen).

**The Chrome-Only Blue Rule from DESIGN.shared.md is strictly enforced:**

Blue (`--color-accent`) must never appear on any force arrow, parallelogram line, or construction element inside the viewport. Blue belongs only to UI chrome: the step rail, the Next button, slider fill, and focus rings.

---

## 2. Force Arrow Visual Rules

### Force P

- Style: solid thick mesh arrow (shaft + cone)
- Color: `--color-force-p`
- Shaft radius: `0.040` scene units
- Head radius: `0.115` scene units
- Label: `P` at tip, offset outward

### Force Q

- Style: solid thick mesh arrow (shaft + cone)
- Color: `--color-force-q`
- Shaft radius: `0.040` scene units
- Head radius: `0.115` scene units
- Label: `Q` at tip, offset outward

### Resultant R

- Style: solid thick mesh arrow, visually heavier than P and Q
- Color: `--color-force-resultant`
- Shaft radius: `0.060` scene units (1.5× P and Q)
- Head radius: `0.150` scene units (1.3× P and Q)
- Label: `R` at tip, offset outward
- Second cue beyond color: R is always visually thicker and its label always shows a numeric value (e.g. `R = 173 N`)

### Parallelogram Ghost Lines

- Style: dashed line arrow (dashed shaft + solid small arrowhead)
- Color: `--color-construction`
- Dash size: `0.18` scene units, gap size `0.09` scene units
- Opacity: `0.55` — clearly secondary, never competing with P, Q, R
- Not draggable. Never interactive.

### Angle Arc (θ between P and Q)

- Style: solid thin arc
- Color: `--color-bench-grey`
- Opacity: `0.70`
- Radius: `0.55` scene units
- Suppressed when θ < 1° or θ > 179°

---

## 3. Tugboat Scene (Step 1)

Step 1 shows the narrative illustration, not the force diagram.

The tugboat scene must:

- Show two simple boat silhouettes (flat 2D polygon shapes)
- Use `--color-geometry-fill` for boat fill, `--color-ink` for boat outline
- Show a ship silhouette at the center
- Show two force arrows: one labeled P in red, one labeled Q in amber
- Use exactly the same arrow style as the rest of the simulation (thick mesh arrows)
- Use a dashed line to suggest the combined direction of movement
- Not use any photograph, raster image, or external asset

The boats and ship are geometric approximations — not detailed illustrations.

### Tugboat Scene Color Rules

| Element | Color |
|---------|-------|
| Boat fill | `--color-geometry-fill` |
| Boat outline | `--color-ink` |
| Ship fill | `--color-panel` |
| Ship outline | `--color-ink-secondary` |
| Force P arrow | `--color-force-p` |
| Force Q arrow | `--color-force-q` |
| Direction suggestion dashes | `--color-bench-grey` |

---

## 4. Scene Layout

The viewport uses an orthographic camera (2D, no perspective distortion).

### Origin Position

The origin (where P and Q act) sits at the center of the viewport.

This allows the resultant R to point into any quadrant without clipping.

### Force Length Scaling

```
FORCE_SCALE = 0.015  // scene units per Newton
              (100 N → 1.5 scene units)
```

This is slightly smaller than vector-resolution (0.02) because two arrows plus the parallelogram construction need more viewport space.

### Viewport Grid

A light grid is shown in Steps 2–6 to help the student read direction angles.

Grid color: `--color-border` at 38% opacity (same as vector-resolution).

---

## 5. HTML Overlay Labels

Labels appear as absolutely-positioned HTML elements over the canvas, positioned using the worldToScreen() projection utility.

### Label Style

All scene labels follow the shared Geometry Label component from DESIGN.shared.md:
- Font: IBM Plex Mono (`--typography-value`)
- Background: `--color-paper` with slight opacity
- Text: `--color-ink`
- Padding: `2px 5px`
- Rounded: `--radius-xs`

### Label Content

| Label ID | Content | When shown |
|----------|---------|------------|
| `label-p` | `P = {N} N` | When P > 0 |
| `label-q` | `Q = {N} N` | When Q > 0 |
| `label-r` | `R = {N} N` | When R is visible |
| `label-theta` | `θ = {°}°` | When arc is visible |
| `label-alpha` | `α = {.1}°` | When R is visible (Step 4+) |
| `label-x` | `X` | Always (axes visible) |
| `label-y` | `Y` | Always (axes visible) |
| `label-origin` | `O` | Always (axes visible) |

### Label Offset Rules

- Force tip labels: offset outward from origin by `0.30` scene units along the force direction
- θ label: placed at the midpoint of the angle arc, at 1.05× arc radius
- α label: placed on the other side of R from θ label, same offset style

---

## 6. Equations Panel

The equations panel appears from Step 4 onward.

### Equations shown

```
P = {value} N
Q = {value} N
θ = {value}°

R = √(P² + Q² + 2PQ cos θ)
R = {value} N

α = arctan(Q sin θ / (P + Q cos θ))
α = {value}°
```

### Panel structure

- Title: `RESULTANT EQUATIONS` in Label typography (uppercase, 700, 0.75rem)
- Values: IBM Plex Mono, `tabular-nums`, right-aligned
- The formula row shows the symbolic formula above the computed value
- `aria-live="polite"` on the container so screen readers announce updates

---

## 7. Parallelogram Construction — Draw Order

The parallelogram construction in Step 3 must follow this specific draw order:

1. P arrow (already drawn from Step 2)
2. Q arrow (already drawn from Step 2)
3. Ghost Q from tip of P — animate growing outward
4. Ghost P from tip of Q — animate growing outward
5. Diagonal R — animate growing from origin

This order makes the logic of the construction visible. The ghost sides grow before the diagonal appears, reinforcing the procedure.

---

## 8. Triangle Law View

In the triangle law toggle state:

- P is drawn from the origin in its original direction
- Q is drawn from the tip of P (translated)
- R is drawn as the closing vector from origin to the translated tip of Q
- The parallelogram ghost lines are hidden
- The origin angle arc (θ between P and Q) is hidden
- The label θ is replaced by a note: "Q placed tip-to-tail on P"

The triangle arrangement must visually read as a closed path: P → Q → R (returning to origin).

---

## 9. Insight Callout (Step 6)

The insight callout follows the Hint Callout component from DESIGN.shared.md:
- Background: `--color-accent-soft`
- Text: `--color-ink`
- Rounded: `--radius-sm`
- Padding: `12px`

### Insight text by angle range

| θ range | Insight text |
|---------|-------------|
| θ = 0° | "Forces aligned — R is at its maximum: R = P + Q." |
| 0° < θ < 60° | "Angle is small — the forces mostly reinforce each other. R is close to P + Q." |
| θ = 60° | "At 60°, R = P√3 when P = Q. The resultant is √3 times either force." |
| θ = 90° | "Perpendicular forces — R = √(P² + Q²). This is the Pythagorean theorem." |
| θ = 120°, P = Q | "Equal forces at 120° — R equals either force. A key textbook result." |
| 90° < θ < 180° | "Large angle — forces partially oppose each other. R is decreasing." |
| θ = 180° | "Forces directly opposed — R = |P − Q|. If P = Q, the resultant is zero." |

---

## 10. Preset Case Buttons (Step 6)

Four ghost buttons in a row, labeled by the case they load:

- `θ = 0°`
- `θ = 90°`
- `P = Q, θ = 120°`
- `θ = 180°`

Style: ghost button (`--color-paper` fill, hairline border, `--color-ink-secondary` text, `--radius-sm`, 44px height).

When a preset is active, its button shows a filled accent-soft background as a second cue (not just the selection color).

---

## 11. Step Rail

The step rail shows 6 markers for this simulation (vector-resolution has 5).

Marker labels (short form for the rail):

1. Intro
2. Two Forces
3. Parallelogram
4. Resultant
5. Triangle Law
6. Explore

Same visual rules as DESIGN.shared.md Step Rail component.

---

## 12. Do's and Don'ts — Simulation Specific

### Do:
- **Do** keep P red and Q amber throughout all steps — never swap colors mid-simulation.
- **Do** animate the parallelogram construction sequentially (ghost sides before diagonal).
- **Do** keep the resultant R visually heavier (thicker) than P and Q at all times.
- **Do** hide the parallelogram ghost when toggled to triangle law view.
- **Do** keep the narrative tugboat step free of any equation or formula.
- **Do** use `prefers-reduced-motion` to skip all animations to instant.

### Don't:
- **Don't** use blue for any force arrow, construction line, or angle arc inside the viewport.
- **Don't** draw the angle arc when θ = 0° or θ = 180° — suppress it gracefully.
- **Don't** attempt to draw a parallelogram when θ = 0° or θ = 180° — collapse gracefully.
- **Don't** show the equations panel before Step 4.
- **Don't** show the resultant R before Step 4 (construction visible in Step 3, resultant in Step 4).
- **Don't** use P and Q in exactly the same color — the student must always distinguish them.
