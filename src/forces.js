// Mathematical engine — Resultant of N Concurrent Coplanar Forces (four fixed-quadrant vectors)
// Component method (ΣFx, ΣFy) + quadrant-aware direction resolution (ADR-006/ADR-007)

export const FORCE_SCALE = 0.013; // scene units per Newton

// Every vector is edited as a LOCAL angle, 0-90°, measured off whichever axis is nearer its own
// quadrant — the same convention engineering mechanics teaches, and the same convention the
// resultant's own direction is read back in (see quadrantAngle() below, shared by both).
export const VECTOR_QUADRANT = { A: 1, B: 2, C: 3, D: 4 };
export const LOCAL_ANGLE_RANGE = [0, 90];

// Maps a 0-90° local/reference angle to its true 0-360° global direction for a given quadrant
// (1=QI, 2=QII, 3=QIII, 4=QIV). One function, two callers: computeForces() turns each vector's
// stored localAngleDeg into the angleDeg used for cos/sin, and resolveDirection() turns the
// resultant's own reference angle into its actualDirectionDeg — same mapping either way.
export function quadrantAngle(quadrant, localDeg) {
  if (quadrant === 1) return localDeg;
  if (quadrant === 2) return 180 - localDeg;
  if (quadrant === 3) return 180 + localDeg;
  return 360 - localDeg; // quadrant 4
}

const EPS = 1e-9;

export function computeForces(state) {
  const vectors = state.vectors.map(v => {
    const angleDeg = quadrantAngle(VECTOR_QUADRANT[v.id], v.localAngleDeg);
    const angleRad = angleDeg * Math.PI / 180;
    const Fx = v.enabled ? v.magnitude * Math.cos(angleRad) : 0;
    const Fy = v.enabled ? v.magnitude * Math.sin(angleRad) : 0;
    return { id: v.id, enabled: v.enabled, magnitude: v.magnitude, localAngleDeg: v.localAngleDeg, angleDeg, angleRad, Fx, Fy };
  });

  const Rx = vectors.reduce((s, v) => s + v.Fx, 0);
  const Ry = vectors.reduce((s, v) => s + v.Fy, 0);
  const R  = Math.sqrt(Rx * Rx + Ry * Ry);

  const { referenceAngleDeg, actualDirectionDeg, resultantQuadrant } = resolveDirection(Rx, Ry);

  return { vectors, Rx, Ry, R, referenceAngleDeg, actualDirectionDeg, resultantQuadrant };
}

// Quadrant-aware direction resolution — replaces the old 2-vector-only Parallelogram Law
// cross-check (ADR-007). First finds the reference angle (0-90°) off the nearer axis, then
// maps it to the true 0-360° direction via quadrantAngle() from the sign pattern of (Rx, Ry).
function resolveDirection(Rx, Ry) {
  if (Math.abs(Rx) < EPS && Math.abs(Ry) < EPS) {
    return { referenceAngleDeg: null, actualDirectionDeg: null, resultantQuadrant: null }; // R ≈ 0
  }
  if (Math.abs(Rx) < EPS) { // on the Y-axis
    return { referenceAngleDeg: 90, actualDirectionDeg: Ry > 0 ? 90 : 270, resultantQuadrant: null };
  }
  if (Math.abs(Ry) < EPS) { // on the X-axis
    return { referenceAngleDeg: 0, actualDirectionDeg: Rx > 0 ? 0 : 180, resultantQuadrant: null };
  }
  const theta = Math.atan(Math.abs(Ry) / Math.abs(Rx)) * 180 / Math.PI;
  let quadrant;
  if (Rx > 0 && Ry > 0) quadrant = 1;
  else if (Rx < 0 && Ry > 0) quadrant = 2;
  else if (Rx < 0 && Ry < 0) quadrant = 3;
  else quadrant = 4;
  return { referenceAngleDeg: theta, actualDirectionDeg: quadrantAngle(quadrant, theta), resultantQuadrant: quadrant };
}

export function computeMoment(R, arm) { return R * arm; }

export function fmt(v, d = 1) { return v == null ? '—' : Number(v).toFixed(d); }
