# VALIDATION.md — Resultant of Forces

Mathematical test cases, edge cases, expected answers, and acceptance criteria for the Resultant Forces simulation.

All test cases must pass before the simulation is considered complete.

---

# Core Formula Under Test

## Parallelogram Law

```
R = √(P² + Q² + 2PQ cos θ)
```

Where:
- P = magnitude of force P (Newtons)
- Q = magnitude of force Q (Newtons)
- θ = angle between P and Q (degrees, converted to radians for calculation)
- R = magnitude of resultant force (Newtons)

## Direction of Resultant (measured from P)

```
α = arctan(Q sin θ / (P + Q cos θ))
```

## Component Verification (must match parallelogram result)

```
Px = P cos(pAngle)
Py = P sin(pAngle)
Qx = Q cos(pAngle + θ)
Qy = Q sin(pAngle + θ)
Rx = Px + Qx
Ry = Py + Qy
R  = √(Rx² + Ry²)           ← must equal parallelogram R
rAngle = atan2(Ry, Rx)       ← must equal pAngle + α
```

---

# Mathematical Test Cases

All expected values are rounded to 2 decimal places.

## Group A — Equal Forces (P = Q = 100 N)

| Case | P (N) | Q (N) | θ (°) | Expected R (N) | Expected α (°) |
|------|-------|-------|--------|----------------|----------------|
| A1   | 100   | 100   | 0      | 200.00         | 0.00           |
| A2   | 100   | 100   | 30     | 193.19         | 15.00          |
| A3   | 100   | 100   | 45     | 184.78         | 22.50          |
| A4   | 100   | 100   | 60     | 173.21         | 30.00          |
| A5   | 100   | 100   | 90     | 141.42         | 45.00          |
| A6   | 100   | 100   | 120    | 100.00         | 60.00          |
| A7   | 100   | 100   | 150    | 51.76          | 75.00          |
| A8   | 100   | 100   | 180    | 0.00           | undefined      |

**Insight from Group A:**

- At θ = 60°: R = 100√3 ≈ 173.21 N
- At θ = 90°: R = 100√2 ≈ 141.42 N
- At θ = 120°: R = P = Q = 100 N  ← key teaching moment
- At θ = 180°: R = 0 N  ← forces cancel completely

When P = Q, α = θ/2 always (resultant bisects the angle between P and Q).

---

## Group B — Unequal Forces

| Case | P (N) | Q (N) | θ (°) | Expected R (N) | Expected α (°) |
|------|-------|-------|--------|----------------|----------------|
| B1   | 150   | 100   | 0      | 250.00         | 0.00           |
| B2   | 150   | 100   | 90     | 180.28         | 33.69          |
| B3   | 150   | 100   | 60     | 217.95         | 23.41          |
| B4   | 150   | 100   | 120    | 132.29         | 40.89          |
| B5   | 150   | 100   | 180    | 50.00          | 180.00         |
| B6   | 200   | 50    | 90     | 206.16         | 14.04          |
| B7   | 200   | 50    | 60     | 231.76         | 10.89          |
| B8   | 300   | 400   | 90     | 500.00         | 53.13          |

**Verification notes:**

- B1: θ=0°, R = P + Q = 250 N. Always true when forces are collinear.
- B5: θ=180°, R = |P − Q| = 50 N. Always true for opposite forces.
- B8: Classic 3-4-5 Pythagorean triple scaled by 100. R = 500 N, α = arctan(400/300) = 53.13°.

---

## Group C — Triangle Law Equivalence

For each case below, the component-addition method must give the same R as the parallelogram formula.

| Case | P (N) | Q (N) | θ (°) | Parallelogram R (N) | Component R (N) | Match? |
|------|-------|-------|--------|---------------------|-----------------|--------|
| C1   | 100   | 100   | 60     | 173.21              | 173.21          | ✓      |
| C2   | 150   | 100   | 90     | 180.28              | 180.28          | ✓      |
| C3   | 200   | 150   | 45     | 322.54              | 322.54          | ✓      |
| C4   | 100   | 200   | 120    | 173.21              | 173.21          | ✓      |

Tolerance: results must match within ±0.01 N.

---

## Group D — Special Derivations (Textbook-Style)

These are the exact cases a student would encounter in B.Tech problem sets.

### D1 — 3-4-5 Triangle

P = 300 N along X-axis, Q = 400 N along Y-axis (θ = 90°)

Expected: R = 500 N at α = 53.13° from P

### D2 — Equal Forces at 60°

P = Q = F, θ = 60°

Expected: R = F√3

Derivation:
```
R = √(F² + F² + 2F² cos 60°)
  = √(2F² + 2F² × 0.5)
  = √(2F² + F²)
  = √(3F²)
  = F√3
```

### D3 — Equal Forces at 120°

P = Q = F, θ = 120°

Expected: R = F

Derivation:
```
R = √(F² + F² + 2F² cos 120°)
  = √(2F² + 2F² × (−0.5))
  = √(2F² − F²)
  = √(F²)
  = F
```

### D4 — Equal Forces at 90°

P = Q = F, θ = 90°

Expected: R = F√2, α = 45°

### D5 — Forces at 0° (same direction)

P = 80 N, Q = 60 N, θ = 0°

Expected: R = 140 N, α = 0°

### D6 — Forces at 180° (opposite direction)

P = 80 N, Q = 60 N, θ = 180°

Expected: R = 20 N, α = 0° (in the direction of P, the larger force)

---

# Edge Cases

## E1 — Zero Magnitude

| Condition | Expected Behavior |
|-----------|-------------------|
| P = 0, Q = 100 N, any θ | R = 100 N in direction of Q |
| Q = 0, P = 100 N, any θ | R = 100 N in direction of P |
| P = 0, Q = 0, any θ | R = 0, no resultant arrow drawn |

The simulation must not crash or divide by zero when P or Q is 0.

## E2 — θ = 0° (Collinear, Same Direction)

R = P + Q (maximum possible resultant for given P and Q).

The angle arc must collapse to zero — do not draw an arc for θ < 1°.

The parallelogram collapses to a single line. The construction must not attempt to draw a degenerate polygon.

## E3 — θ = 180° (Collinear, Opposite Direction)

R = |P − Q| (minimum possible resultant for given P and Q).

If P = Q exactly, R = 0. Do not draw R arrow. Do not attempt to draw a direction label.

The parallelogram collapses to a line. The construction must not crash.

## E4 — Very Small Angle (θ < 1°)

Do not draw the angle arc. Result is approximately R ≈ P + Q. No division-by-zero risk.

## E5 — θ Very Close to 180° (179°)

R is very small but not zero (unless P = Q exactly). Direction of R must still be computed and displayed correctly.

## E6 — P >> Q (Large Dominance)

Example: P = 500 N, Q = 10 N, θ = 90°

Expected: R ≈ 500.10 N, α ≈ 1.15° from P.

The resultant must stay visually close to P and not appear to swing dramatically toward Q.

## E7 — Q >> P

Example: P = 10 N, Q = 500 N, θ = 90°

Expected: R ≈ 500.10 N, α ≈ 88.85° from P.

The resultant must appear visually close to Q.

---

# Display Precision Rules

| Quantity | Display precision |
|----------|------------------|
| P magnitude | integer (N) |
| Q magnitude | integer (N) |
| R magnitude | integer (N) |
| Angle θ | integer (°) |
| Angle α | 1 decimal place (°) |
| Component Px, Py, Qx, Qy | integer (N) |
| Component Rx, Ry | integer (N) |

All live values must update within one animation frame of a slider change.

---

# Acceptance Criteria

## AC1 — Mathematical Correctness

- [ ] Parallelogram formula R = √(P² + Q² + 2PQ cos θ) is implemented correctly.
- [ ] Component method Rx = Px + Qx, Ry = Py + Qy is implemented correctly.
- [ ] Both methods produce R values that match to within ±0.01 N for all test cases in Groups A, B, C.
- [ ] Direction α = arctan(Q sin θ / (P + Q cos θ)) is implemented correctly.
- [ ] All Group D textbook cases produce expected answers.

## AC2 — Edge Case Safety

- [ ] P = 0 does not crash. R = Q in Q's direction.
- [ ] Q = 0 does not crash. R = P in P's direction.
- [ ] P = Q = 0 does not crash. No arrow is drawn.
- [ ] θ = 0° does not crash. No angle arc drawn.
- [ ] θ = 180° does not crash. Parallelogram construction is suppressed.
- [ ] P = Q with θ = 180° gives R = 0. No R arrow drawn.

## AC3 — Visual Correctness

- [ ] Parallelogram ghost lines are dashed, not solid.
- [ ] R arrow is visually thicker than P and Q.
- [ ] P, Q, R labels appear at vector tips, not overlapping the shaft.
- [ ] Angle arc appears between P and Q directions, not between P and X-axis.
- [ ] The angle label θ appears near the midpoint of the arc.
- [ ] R label shows magnitude in Newtons.
- [ ] Direction label α shows angle in degrees to 1 decimal place.

## AC4 — Triangle Law View

- [ ] Toggling to Triangle view translates Q to the tip of P.
- [ ] The closing vector R in triangle view has identical magnitude and direction to the parallelogram diagonal.
- [ ] Toggling back to Parallelogram view returns to the original layout.
- [ ] The toggle does not reset P, Q, or θ values.

## AC5 — Special Case Presets

- [ ] Preset θ = 0° sets θ to 0 and updates all visuals correctly.
- [ ] Preset θ = 90° sets θ to 90 and updates all visuals correctly.
- [ ] Preset P = Q, θ = 120° sets correct values and R = P = Q is displayed.
- [ ] Preset θ = 180° sets θ to 180 and handles the degenerate case safely.

## AC6 — Live Updates

- [ ] Every slider change updates the equation panel within one frame.
- [ ] Every slider change updates all scene arrows within one frame.
- [ ] Every slider change updates all HTML overlay labels within one frame.
- [ ] Dragging the arrowhead (if implemented) updates state identically to the slider.

## AC7 — Reduced Motion

- [ ] Under `prefers-reduced-motion: reduce`, all animations are instant.
- [ ] The simulation is fully functional with no animations — nothing breaks.

## AC8 — Accessibility

- [ ] All sliders are keyboard-operable (arrow keys, Shift+arrow for fine steps).
- [ ] The equations panel has `aria-live="polite"`.
- [ ] All interactive controls have visible focus rings.
- [ ] No engineering meaning is conveyed by color alone.

---

# Validation Procedure

Before marking any step complete, verify:

1. Open browser console — zero errors during normal use.
2. Run each Group A test case manually with sliders and confirm displayed R matches table.
3. Run D2 (equal forces at 60°) and confirm R = P × √3 ≈ 1.732 × P.
4. Run D3 (equal forces at 120°) and confirm R = P exactly.
5. Toggle triangle law — confirm same R and α as parallelogram view.
6. Set P = 0 — confirm no crash.
7. Set θ = 180°, P = Q — confirm R displays as 0.
8. Enable `prefers-reduced-motion` in OS and reload — confirm instant rendering.
