# Product

## Register

product

> Scope note. This document is the simulation-specific product brief for the **Resultant of Forces** simulation (Module 1, Simulation 2). It extends the platform-wide design language and educational direction established in the shared PRODUCT.md. Read this file alongside DESIGN.shared.md and DESIGN.md.

---

# Users

Primary persona: the struggling first-year B.Tech student who has just completed the Vector Resolution simulation and now needs to understand how two separate forces combine into a single equivalent force.

The student at this point:

* understands that a single force has magnitude and direction
* knows what Fx and Fy mean for one force
* has NOT yet seen two forces added together
* finds the word "resultant" abstract and possibly frightening
* cannot yet visualize why the angle between forces changes the resultant magnitude

The simulation must build on Vector Resolution intuition without requiring the student to remember its equations.

---

# Simulation Purpose

This simulation teaches:

* that two forces acting at a point can always be replaced by a single equivalent force
* how the parallelogram law constructs that equivalent force geometrically
* how the triangle law offers a second, equivalent geometric method
* why the angle between forces — not just their magnitudes — determines the resultant
* why two equal forces can produce very different resultants depending on their angle

The simulation must make the student feel that this is geometry they can see, not algebra they must memorise.

---

# Narrative Anchor

**Step 1 uses a tugboat scenario.**

Two tugboats pull a ship. Each tugboat applies a force. The ship moves in a direction that is not aligned with either tugboat.

This narrative must:

* appear before any mathematics
* use recognizable vocabulary (pull, direction, combined effect)
* create a genuine question in the student's mind: "where does the ship actually go?"
* be resolved visually — not explained — before the student sees any equation

The tugboat scene is the emotional hook. The rest of the simulation is the answer.

---

# Brand Personality

Three words:

* patient
* encouraging
* clear

The simulation behaves like:

* a calm tutor working through a textbook diagram
* not a game
* not a physics engine
* not a toy

---

# Educational Objectives

By the end of this simulation, the student must be able to:

1. State that a resultant force replaces two concurrent forces with a single equivalent force.
2. Construct the parallelogram of forces given P, Q, and the angle between them.
3. State the formula R = √(P² + Q² + 2PQ cos θ) and identify each term.
4. Construct the triangle law by placing Q tip-to-tail on P.
5. Confirm that parallelogram law and triangle law give the same result.
6. Predict qualitatively how R changes when θ increases from 0° to 180°.
7. Explain why two equal forces at 120° give a resultant equal to either force.

---

# Simulation Flow

## Step 1 — Real-World Narrative

**Title:** Two Forces, One Effect

Introduce the tugboat scenario. Two tugboats pull a ship from different directions. Both forces act on the same point. The ship responds to the combined effect — the resultant.

No equations. No sliders. One clear question: *What single force has the same effect as both tugboats together?*

Controls revealed: none (narrative only, with a Next button).

Scene: Tugboat illustration with two force arrows labeled P and Q.

---

## Step 2 — Two Force Vectors

**Title:** Two Concurrent Forces

Replace the tugboat with a clean force diagram. Show two force vectors P and Q acting at a common origin. The student can change the magnitude of P, the magnitude of Q, and the angle θ between them.

No resultant shown yet. The student must notice that there are two separate forces and ask themselves what their combined effect is.

Controls revealed: magnitude P, magnitude Q, angle θ (angle between P and Q).

Scene: Origin, P arrow (red), Q arrow (orange), angle arc between them, labels.

---

## Step 3 — Parallelogram Construction

**Title:** The Parallelogram Law

Animate the construction of the parallelogram. Draw ghost copies of P and Q from each other's tips. The four arrows form the parallelogram outline.

The student watches the construction happen — then sees the diagonal. That diagonal is the resultant.

Controls revealed: magnitude P, magnitude Q, angle θ. A toggle to show/hide construction lines.

Scene: P, Q, parallelogram ghost lines (dashed bench-grey), diagonal R emerging.

---

## Step 4 — Resultant Force

**Title:** The Resultant Force

Show the resultant R as a full arrow from the origin along the parallelogram diagonal. Display the equation R = √(P² + Q² + 2PQ cos θ) with live values. Show R magnitude and direction angle.

The student drags sliders and watches R update in real time. The connection between the equation and the geometry is explicit.

Controls revealed: magnitude P, magnitude Q, angle θ. Equations panel visible.

Scene: P (red), Q (orange-amber), R (blue-grey resultant), parallelogram ghost (dashed), all labels and values.

---

## Step 5 — Triangle Law

**Title:** The Triangle Law

Animate the transition: translate the Q vector so that its tail sits at the tip of P. The resultant R is now the closing vector from the tail of P to the tip of Q.

Show that R has the same magnitude and direction as the parallelogram diagonal. The student confirms that both methods give the same answer.

Toggle between parallelogram view and triangle view without changing the input values.

Controls revealed: magnitude P, magnitude Q, angle θ. View toggle (Parallelogram / Triangle). Equations panel visible.

Scene: Triangle arrangement (P → Q → R), or parallelogram — depending on the toggle.

---

## Step 6 — Explore and Compare

**Title:** Special Cases

Guide the student to explore specific angle values that reveal key insights. Preset buttons load each special case. The student can also drag freely.

Special cases:

* θ = 0°: forces aligned, R = P + Q (maximum resultant)
* θ = 90°: perpendicular forces, R = √(P² + Q²)
* θ = 120°, P = Q: resultant equals either force
* θ = 180°: forces oppose, R = |P − Q| (minimum resultant)

An insight callout updates automatically as the angle changes, describing the current case.

Controls revealed: magnitude P, magnitude Q, angle θ. Preset case buttons. Insight callout. Full equations.

---

# Design Principles

1. Design for weak students first.
2. Reveal one idea at a time.
3. Keep UI consistent with Vector Resolution.
4. Always show real values and units.
5. Use proper engineering vocabulary.
6. Make simulations accessible.
7. Keep the viewport as the main focus.
8. Narrative before equation — always.

---

# Interaction Philosophy

Students should:

* see the parallelogram construct itself step by step
* watch R update live as they drag sliders
* toggle between parallelogram and triangle views
* use preset buttons to explore special cases
* read the insight panel to build qualitative understanding

Every interaction must:

* immediately update the visualization
* immediately update the equations
* immediately update all numeric labels

---

# Accessibility

Every color-coded element must also include:

* a label (P, Q, R)
* a line style distinction (solid force vs dashed construction)
* thickness variation (R is thicker than P and Q)

All simulations must:

* support keyboard interaction
* support reduced motion (instant draw, no animation)
* maintain readable contrast on the paper background
* provide visible focus states on all interactive controls

---

# Emotional Goal

The learner should feel:

"The resultant is not some abstract formula — it is the diagonal I can see."

The simulation must reduce the fear of vector addition and turn it into a visible, repeatable geometric act.
