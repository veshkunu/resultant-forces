# CLAUDE.md — Simatrix Engineering Mechanics · Module 1 · Simulation 2

Three.js simulation that teaches the **Resultant of Forces** using the Parallelogram Law and Triangle Law, following the Simatrix Guided Stepper architecture.

---

# Simulation Identity

**Module:** Engineering Mechanics — Module 1
**Simulation number:** 2 of 6
**Topic:** Resultant of Concurrent Coplanar Forces
**Methods taught:** Parallelogram Law, Triangle Law

---

# UI Model

The simulation is a Guided Stepper.

The learner progresses through 6 steps.

Only the controls required for the current step are visible.

The UI follows:

* progressive disclosure
* low cognitive load
* intuition-first teaching
* narrative before equation

---

# Design System Rules

All visual styling follows DESIGN.shared.md.
Simulation-specific visual rules follow DESIGN.md.

Never hard-code:

* colors
* spacing
* typography
* UI dimensions

All colors must use CSS variables.

---

# Scope Boundary

This simulation contains:

* index.html → UI shell (step rail, step card, viewport, labels, equations)
* main.js → renderer loop, state management, step navigation, drag callback
* style.css → simulation CSS (consumes shared CSS variables)
* src/steps.js → 6-step guided learning sequence with all step content
* src/vectorMath.js → resultant force calculations (parallelogram law, triangle law)
* src/sceneSetup.js → Three.js scene: vectors, parallelogram, triangle, angle arc
* src/uiManager.js → UI builder: step card, sliders, equations panel, insight callout
* CLAUDE.md → this file
* DESIGN.md → simulation-specific design rules
* DESIGN.shared.md → platform-wide design tokens and rules
* PRODUCT.md → simulation product brief
* VALIDATION.md → mathematical test cases and acceptance criteria

---

# Architecture Rules

* No npm
* No webpack
* No build tools
* Use Three.js CDN ES modules only
* All imports must use .js extension
* All paths must be relative
* Mirror the file structure of the vector-resolution simulation

---

# Guided Stepper Flow

This simulation has 6 steps:

1. Real-World Narrative — tugboat scenario, no controls
2. Two Force Vectors — show P and Q at a common origin with angle θ
3. Parallelogram Construction — animate the ghost sides, reveal diagonal
4. Resultant Force — show R with live equation
5. Triangle Law — transition animation, toggle view
6. Explore and Compare — preset special cases, insight callout

Each step reveals only the required controls.

The step rail shows 6 markers.

---

# State Model

The simulation state is a plain object:

```
{
  magnitudeP: number,   // magnitude of force P in Newtons
  magnitudeQ: number,   // magnitude of force Q in Newtons
  thetaDeg:   number,   // angle between P and Q in degrees (0–180)
  pAngleDeg:  number,   // absolute angle of P from X-axis in degrees
  view:       string,   // 'parallelogram' | 'triangle'
}
```

Derived values (computed, never stored):

```
qAngleDeg  = pAngleDeg + thetaDeg
R          = √(P² + Q² + 2PQ cos θ)
alphaRad   = atan2(Q sin θ, P + Q cos θ)
rAngleDeg  = pAngleDeg + alpha (in degrees)
Rx         = R cos(rAngleDeg)
Ry         = R sin(rAngleDeg)
```

---

# Mathematical Rules

## Parallelogram Law

Given forces P and Q with angle θ between them:

```
R = √(P² + Q² + 2PQ cos θ)
```

Direction of R measured from P:

```
α = arctan(Q sin θ / (P + Q cos θ))
```

## Triangle Law

Place Q at the tip of P (tip-to-tail). R is the closing vector:

```
Rx = Px + Qx   (component form)
Ry = Py + Qy
R  = √(Rx² + Ry²)
```

Triangle law and parallelogram law must always give the same R magnitude and direction.

## Component form (for verification)

```
Px = P cos(pAngleDeg)
Py = P sin(pAngleDeg)
Qx = Q cos(qAngleDeg)
Qy = Q sin(qAngleDeg)
Rx = Px + Qx
Ry = Py + Qy
R  = √(Rx² + Ry²)
rAngle = atan2(Ry, Rx)
```

All displayed values must:

* update live on any slider or drag interaction
* show units (N for force, ° for angle)
* remain visible during interaction

---

# Scene Conventions

The 3D scene uses an orthographic camera (2D drawing):

* X-axis → horizontal direction
* Y-axis → vertical direction
* Z-axis → depth (camera looks down Z)

P is fixed along the positive X-axis by default (pAngleDeg = 0).

The angle θ control rotates Q relative to P (not relative to the X-axis).

Vectors are represented using:

* thick mesh arrows (shaft + cone) for P, Q, R
* dashed line arrows for parallelogram ghost sides
* angle arc between P and Q
* text labels at vector tips

---

# Color Conventions

All colors read from CSS variables — never hard-coded hex in JS or Three.js.

Defined in DESIGN.md (extends DESIGN.shared.md):

| Element | CSS variable | Character |
|---|---|---|
| Force P | `--color-force-p` | Solid red arrow |
| Force Q | `--color-force-q` | Solid amber-orange arrow |
| Resultant R | `--color-force-resultant` | Solid blue-grey, thicker |
| Parallelogram ghost | `--color-construction` | Dashed bench-grey |
| Angle arc | `--color-bench-grey` | Faint grey arc |

Blue accent (`--color-accent`) is reserved for UI controls only.
Blue must never appear inside the viewport as a force color.

---

# Scene Objects

The sceneSetup.js module must manage these named drawable objects:

| Key | Description |
|---|---|
| `grid` | Background grid |
| `axes` | X and Y axes with arrowheads |
| `forceP` | Thick arrow for force P |
| `forceQ` | Thick arrow for force Q |
| `angleArc` | Arc between P and Q directions |
| `parallelogram` | Four dashed ghost lines forming the parallelogram |
| `resultantR` | Thick arrow for resultant R (parallelogram diagonal) |
| `triangleQ` | Q arrow translated to tip of P (triangle law view) |
| `triangleR` | Closing arrow from origin to translated Q tip |
| `labelP` | HTML overlay label at tip of P |
| `labelQ` | HTML overlay label at tip of Q |
| `labelR` | HTML overlay label at tip of R |
| `labelTheta` | HTML overlay label for angle θ |
| `labelAlpha` | HTML overlay label for direction of R |

The visSet for each step controls which objects are drawn.

---

# Animation Rules

## Parallelogram construction animation (Step 3)

Animate in sequence:

1. Ghost copy of Q grows from tip of P (400 ms)
2. Ghost copy of P grows from tip of Q (400 ms)
3. Diagonal R grows from origin (500 ms)

Total: ~1300 ms. Collapsed to instant under `prefers-reduced-motion`.

## Triangle law transition animation (Step 5)

Animate Q translating from origin to tip of P (600 ms ease-out).

Then draw R as the closing vector (400 ms).

Collapsed to instant under `prefers-reduced-motion`.

## All animations must:

* teach the concept
* never feel decorative
* never block interaction (user can skip by interacting)

---

# Reuse from Vector Resolution

The following patterns from `vector-resolution/src/` are direct reuse targets:

* `sceneSetup.js` → cssVar(), FORCE_SCALE, initScene(), makeThickArrow(), makeComponentArrow(), makeAngleArc(), screenToWorld(), worldToScreen(), resize(), clearDyn(), tick() rAF pattern
* `uiManager.js` → UIManager class, buildRail(), buildStepCard(), _makeSlider(), concept-check builder, _makeEquations() structure
* `vectorMath.js` → resolve() function (for computing Px, Py, Qx, Qy components)
* `main.js` → rAF loop structure, step navigation (next/back), drag callback wiring

New code specific to this simulation:

* resultant() calculation in vectorMath.js
* parallelogram ghost construction in sceneSetup.js
* triangle law view mode in sceneSetup.js
* angle arc between P and Q (distinct from origin arc in Vector Resolution)
* preset-case buttons in uiManager.js
* insight callout for special angle cases

---

# Accessibility Rules

Color is never the only cue.

Every engineering meaning must also use:

* labels (P, Q, R, θ, α)
* dashed vs solid line style
* arrow direction
* line thickness (R is thicker)

Keyboard interaction is mandatory for all sliders and toggles.

All animations must respect `prefers-reduced-motion`.

---

# Common Simulation Goals

The learner should:

* understand that two forces combine into one resultant
* see the parallelogram construct and close into a diagonal
* see the triangle law as the same result from a different construction
* discover that angle controls the resultant more than magnitude alone
* solve textbook problems with confidence

The simulation is a teaching instrument, not a sandbox toy.
