import * as THREE from 'three';
import { FORCE_SCALE } from './forces.js';

const VIEW_H = 5.5;
const QUAD_ANGLES = { 1: [0, Math.PI / 2], 2: [Math.PI / 2, Math.PI], 3: [Math.PI, 1.5 * Math.PI], 4: [1.5 * Math.PI, 2 * Math.PI] };

// Reads a color token from :root at runtime — never hard-code hex here (DESIGN.md §2.1/§2.2).
export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.z = 10;

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const a = w / h;
    camera.left = -VIEW_H * a; camera.right  =  VIEW_H * a;
    camera.top  =  VIEW_H;     camera.bottom = -VIEW_H;
    camera.updateProjectionMatrix();
    scene.background = new THREE.Color(cssVar('--color-paper'));
  }
  resize();

  // ── Static geometry ─────────────────────────────────────────────────────────
  function buildGrid() {
    const R = 20, pts = [];
    for (let i = -R; i <= R; i++) {
      pts.push(new THREE.Vector3(i, -R, 0), new THREE.Vector3(i, R, 0));
      pts.push(new THREE.Vector3(-R, i, 0), new THREE.Vector3(R, i, 0));
    }
    const g = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: new THREE.Color(cssVar('--color-border')), transparent: true, opacity: 0.55 })
    );
    return g;
  }

  function buildAxes() {
    const g = new THREE.Group();
    const col = new THREE.Color(cssVar('--color-ink-secondary'));
    const L = 14, hL = 0.26, hW = 0.12;
    g.add(new THREE.ArrowHelper(new THREE.Vector3(1,0,0), new THREE.Vector3(-L/2,0,0), L, col, hL, hW));
    g.add(new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(0,-L/2,0), L, col, hL, hW));
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.07, 20),
      new THREE.MeshBasicMaterial({ color: col })
    );
    g.add(dot);
    return g;
  }

  const grid = buildGrid();
  const axes = buildAxes();
  scene.add(grid, axes);

  // ── Dynamic objects ──────────────────────────────────────────────────────────
  let dynObjs = [];

  function clearDyn() {
    for (const obj of dynObjs) {
      scene.remove(obj);
      obj.traverse(c => {
        c.geometry?.dispose();
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material?.dispose();
      });
    }
    dynObjs = [];
  }

  function reg(obj) { if (obj) dynObjs.push(obj); return obj; }

  // ── Geometry builders ────────────────────────────────────────────────────────
  function mkArrow(fx, fy, tx, ty, hex, opts = {}) {
    const { sR = 0.045, hR = 0.11, hH = 0.26, op = 1 } = opts;
    const from = new THREE.Vector3(fx, fy, 0);
    const to   = new THREE.Vector3(tx, ty, 0);
    const dir  = new THREE.Vector3().subVectors(to, from);
    const len  = dir.length();
    if (len < 0.08) return null;
    dir.normalize();
    const shL = Math.max(0.01, len - hH);
    const col = new THREE.Color(hex);
    const mat = new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op });
    const g = new THREE.Group();

    const sGeo = new THREE.CylinderGeometry(sR, sR, shL, 10);
    const shaft = new THREE.Mesh(sGeo, mat);
    shaft.position.copy(from).addScaledVector(dir, shL / 2);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.add(shaft);

    const hGeo = new THREE.ConeGeometry(hR, hH, 10);
    const head = new THREE.Mesh(hGeo, new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op }));
    head.position.copy(to).addScaledVector(dir, -hH / 2);
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.add(head);

    scene.add(g);
    return g;
  }

  function mkLine(pts, hex, op = 1) {
    const verts = pts.map(([x, y]) => new THREE.Vector3(x, y, 0));
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(hex), transparent: op < 1, opacity: op });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(verts), mat);
    scene.add(line);
    return line;
  }

  function mkDash(pts, hex, op = 1, dS = 0.13, gS = 0.07) {
    const verts = pts.map(([x, y]) => new THREE.Vector3(x, y, 0));
    const mat = new THREE.LineDashedMaterial({ color: new THREE.Color(hex), dashSize: dS, gapSize: gS, transparent: op < 1, opacity: op });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(verts), mat);
    line.computeLineDistances();
    scene.add(line);
    return line;
  }

  function mkArc(cx, cy, r, a0, a1, hex, op = 1, segs = 48) {
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const a = a0 + (a1 - a0) * (i / segs);
      pts.push(new THREE.Vector3(cx + r * Math.cos(a), cy + r * Math.sin(a), 0));
    }
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(hex), transparent: op < 1, opacity: op });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
    scene.add(line);
    return line;
  }

  function mkQuadrantWedge(a0, a1, hex, op) {
    const geo = new THREE.CircleGeometry(20, 48, a0, a1 - a0);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: true, opacity: op, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = -0.01; // sit behind the grid/axes/vectors
    scene.add(mesh);
    return mesh;
  }

  function drawQuadrantGuide(resultantQuadrant) {
    if (!resultantQuadrant) return;
    const [a0, a1] = QUAD_ANGLES[resultantQuadrant];
    reg(mkQuadrantWedge(a0, a1, cssVar('--color-construction'), 0.06));
  }

  // ── Main draw ────────────────────────────────────────────────────────────────
  function draw(state, computed, mode = 'default', extra = {}) {
    clearDyn();
    const { vectors, Rx, Ry, R } = computed;

    const V_COL = {
      A: cssVar('--color-force-a'),
      B: cssVar('--color-force-b'),
      C: cssVar('--color-force-c'),
      D: cssVar('--color-force-d'),
    };
    const R_COL = cssVar('--color-force-resultant');
    const X_COL = cssVar('--color-construction');
    const Y_COL = cssVar('--color-construction');
    const C_COL = cssVar('--color-construction');
    const M_COL = cssVar('--color-force-moment');

    const rTx = Rx * FORCE_SCALE, rTy = Ry * FORCE_SCALE;
    const fade = extra.fade ?? {};
    const highlight = extra.highlight ?? null;

    drawQuadrantGuide(computed.resultantQuadrant);

    // Base forces — enabled vectors draw solid, disabled vectors draw a faint dashed "ghost"
    // (still exists, currently off) rather than vanishing entirely. The single highlighted
    // vector (Geometry/Component Resolution card selection) gets a thicker stroke plus a soft
    // low-opacity glow halo drawn underneath it — a second mkArrow call, no new render pipeline.
    const tips = {};
    for (const v of vectors) {
      const tx = v.magnitude * FORCE_SCALE * Math.cos(v.angleRad);
      const ty = v.magnitude * FORCE_SCALE * Math.sin(v.angleRad);
      tips[v.id] = { tx: v.enabled ? v.Fx * FORCE_SCALE : tx, ty: v.enabled ? v.Fy * FORCE_SCALE : ty };
      if (v.enabled) {
        const isHighlighted = v.id === highlight;
        if (isHighlighted) {
          reg(mkArrow(0, 0, tips[v.id].tx, tips[v.id].ty, V_COL[v.id], { op: 0.3, sR: 0.09, hR: 0.19, hH: 0.28 }));
          reg(mkArrow(0, 0, tips[v.id].tx, tips[v.id].ty, V_COL[v.id], { op: 1, sR: 0.062, hR: 0.15, hH: 0.34 }));
        } else {
          reg(mkArrow(0, 0, tips[v.id].tx, tips[v.id].ty, V_COL[v.id], { op: fade[v.id] ?? 1, sR: 0.05, hR: 0.12, hH: 0.28 }));
        }
      } else {
        reg(mkDash([[0, 0], [tx, ty]], V_COL[v.id], 0.28));
      }
    }

    // Component-resolution overlay for whichever vector is the current target
    const target = mode.startsWith('components-') ? mode.slice('components-'.length).toUpperCase() : null;
    if (target && tips[target]) {
      const { tx, ty } = tips[target];
      reg(mkArrow(0, 0, tx, 0, X_COL, { op: 0.9, sR: 0.03, hR: 0.08, hH: 0.20 }));
      reg(mkArrow(tx, 0, tx, ty, Y_COL, { op: 0.9, sR: 0.03, hR: 0.08, hH: 0.20 }));
      reg(mkDash([[tx, ty], [tx, 0]], C_COL, 0.4));
      reg(mkDash([[tx, ty], [0, ty]], C_COL, 0.4));
    }

    if (mode === 'horizontal') {
      let cursor = 0;
      for (const v of vectors.filter(v => v.enabled)) {
        const nx = cursor + v.Fx * FORCE_SCALE;
        reg(mkArrow(cursor, -0.35, nx, -0.35, V_COL[v.id], { sR: 0.03, hR: 0.08 }));
        cursor = nx;
      }
      reg(mkArrow(0, -0.7, rTx, -0.7, R_COL, { sR: 0.04, hR: 0.10 }));
      reg(mkDash([[cursor, -0.35], [cursor, -0.7]], C_COL, 0.4));
    }

    if (mode === 'vertical') {
      let cursor = 0;
      for (const v of vectors.filter(v => v.enabled)) {
        const ny = cursor + v.Fy * FORCE_SCALE;
        reg(mkArrow(-0.35, cursor, -0.35, ny, V_COL[v.id], { sR: 0.03, hR: 0.08 }));
        cursor = ny;
      }
      reg(mkArrow(-0.7, 0, -0.7, rTy, R_COL, { sR: 0.04, hR: 0.10 }));
      reg(mkDash([[-0.35, cursor], [-0.7, cursor]], C_COL, 0.4));
    }

    if (mode === 'resultant' || mode === 'direction' || mode === 'moment') {
      reg(mkArrow(0, 0, rTx, rTy, R_COL, { sR: 0.065, hR: 0.16, hH: 0.34 }));
    }

    if (mode === 'direction' && R > 1e-6) {
      // Signed atan2 sweep (range -180..180) always draws the *short* arc through the correct
      // side of the axis — do not feed the 0-360 actualDirectionDeg in here directly, or a
      // QIII/QIV resultant would sweep the long way round through QI/QII.
      const signedRad = Math.atan2(Ry, Rx);
      reg(mkArc(0, 0, 0.75, 0, signedRad, R_COL, 0.8));
    }

    if (mode === 'moment') {
      const arm = extra.momentArm ?? 2;
      const armS = arm * 0.4; // scale for display
      reg(mkLine([[0, 0], [armS, 0]], M_COL, 0.9));
      reg(mkArc(0, 0, armS, 0, -Math.PI * 0.7, M_COL, 0.75, 40));
      // Arrow at end of moment arc
      const endA = -Math.PI * 0.7;
      const ex = armS * Math.cos(endA), ey = armS * Math.sin(endA);
      reg(mkArrow(ex, ey, ex - 0.01, ey - 0.25, M_COL, { sR: 0.01, hR: 0.08, hH: 0.22 }));
    }
  }

  // ── Coordinate transforms ────────────────────────────────────────────────────
  function worldToScreen(wx, wy) {
    const v = new THREE.Vector3(wx, wy, 0).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: (v.x + 1) / 2 * r.width, y: (-v.y + 1) / 2 * r.height };
  }

  function screenToWorld(cx, cy) {
    const r = canvas.getBoundingClientRect();
    const nx =  ((cx - r.left) / r.width)  * 2 - 1;
    const ny = -(((cy - r.top)  / r.height) * 2 - 1);
    const v = new THREE.Vector3(nx, ny, 0).unproject(camera);
    return { x: v.x, y: v.y };
  }

  function tick() { renderer.render(scene, camera); }

  return { scene, camera, renderer, resize, draw, tick, worldToScreen, screenToWorld };
}
