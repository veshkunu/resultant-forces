import * as THREE from 'three';

// ─── Scene constants ─────────────────────────────────────────────────────────
//
// FORCE_SCALE: scene units per Newton.
// At 0.010, a 100 N force renders as a 1.0 scene-unit arrow.
// A 400 N force renders as a 4.0 scene-unit arrow — well within VIEW_H = 6.0.
// Smaller than vector-resolution's 0.020 because this simulation also draws
// a parallelogram, which extends beyond the force vectors themselves.
export const FORCE_SCALE = 0.010;

// VIEW_H: half the vertical extent of the orthographic camera frustum in
// scene units. Horizontal extent = VIEW_H × (canvas width / canvas height).
// At VIEW_H = 6.0 and a 16:9 screen, horizontal extent ≈ ±10.7 scene units,
// which comfortably fits both force vectors and the parallelogram construction
// at the maximum slider value of 400 N (4.0 scene units per arrow).
const VIEW_H = 6.0;

// Read once at module load; gates all animation functions in later phases.
// When true, all animated reveals collapse to instant draws.
export const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Utility: read a CSS custom property from :root at runtime ──────────────
// Three.js materials read color tokens through this function so they stay in
// sync with the design system. Never pass raw hex strings to Three.js directly.
export function cssVar(name) {
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!val && typeof console !== 'undefined') {
    console.warn(`[sceneSetup] CSS variable "${name}" is not defined on :root.`);
  }
  return val;
}

// ─── Easing ─────────────────────────────────────────────────────────────────
// Used by animation phases in Phase 4 (parallelogram) and Phase 6 (triangle).
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Scene initializer ───────────────────────────────────────────────────────
export function initScene(canvas) {

  // ── Renderer ─────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  // Cap pixel ratio at 2 to avoid performance issues on high-DPI displays.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // ── Scene ────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();

  // ── Camera ───────────────────────────────────────────────────────────────
  // Orthographic projection: the simulation is a 2D engineering drawing,
  // not a 3D scene. All geometry is placed at z = 0; camera looks down -Z.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.z = 10;

  // ── Resize ───────────────────────────────────────────────────────────────
  // Called by main.js via ResizeObserver on canvas.parentElement.
  // Updates renderer size and camera frustum to match the current CSS layout.
  // Setting the background color here ensures it tracks the CSS token if the
  // theme ever changes (currently the design system has no dark variant, but
  // the pattern is correct for the future).
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const aspect  = w / h;
    camera.left   = -VIEW_H * aspect;
    camera.right  =  VIEW_H * aspect;
    camera.top    =  VIEW_H;
    camera.bottom = -VIEW_H;
    camera.updateProjectionMatrix();
    scene.background = new THREE.Color(cssVar('--color-paper'));
  }
  resize();

  // ── Static geometry ──────────────────────────────────────────────────────
  // Grid and axes are created once and toggled via .visible.
  // They are never disposed — they stay in the scene for the lifetime of the
  // simulation and are simply hidden when a step's visSet excludes them.
  const staticGroups = {};

  function makeGrid() {
    // Grid lines span ±GRID_R to cover the full orthographic frustum even on
    // ultra-wide screens. At VIEW_H = 6.0 and aspect 2.4 (e.g. 2560×1080),
    // horizontal extent = ±14.4 scene units — so GRID_R = 16 is sufficient.
    const GRID_R = 16;
    const pts    = [];
    for (let i = -GRID_R; i <= GRID_R; i++) {
      pts.push(new THREE.Vector3(i, -GRID_R, 0), new THREE.Vector3(i,  GRID_R, 0));
      pts.push(new THREE.Vector3(-GRID_R, i, 0), new THREE.Vector3( GRID_R, i, 0));
    }
    return new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({
        color:       new THREE.Color(cssVar('--color-border')),
        transparent: true,
        opacity:     0.38,
      })
    );
  }

  function makeAxes() {
    const g   = new THREE.Group();
    const col = new THREE.Color(cssVar('--color-ink-secondary'));
    // Axis length: spans ±5.0 scene units from origin.
    // At VIEW_H = 6.0 and aspect ≥ 1.0, horizontal axes always stay inside
    // the camera frustum. The arrowhead sits at L = 10 from the negative end.
    const L    = 10;
    const hLen = 0.28;   // arrowhead cone height (scene units)
    const hWid = 0.14;   // arrowhead cone base radius (scene units)

    // X-axis arrow
    g.add(new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-L / 2, 0, 0),
      L, col, hLen, hWid
    ));

    // Y-axis arrow
    g.add(new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -L / 2, 0),
      L, col, hLen, hWid
    ));

    // Origin ring — a small circle at (0,0) marking the point of concurrency.
    // Sized at 0.08 scene units radius, which equals 8 N equivalent — barely
    // visible but clearly marks the origin without competing with force arrows.
    const N    = 24;
    const rPts = [];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      rPts.push(new THREE.Vector3(0.08 * Math.cos(a), 0.08 * Math.sin(a), 0));
    }
    g.add(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(rPts),
      new THREE.LineBasicMaterial({ color: col })
    ));

    return g;
  }

  staticGroups.grid = makeGrid();
  staticGroups.axes = makeAxes();
  scene.add(staticGroups.grid, staticGroups.axes);

  // ── Dynamic object registry ───────────────────────────────────────────────
  // All objects created per-frame by drawDyn() are tracked here.
  // clearDyn() disposes their GPU resources before rebuilding, preventing
  // memory leaks from accumulated BufferGeometry and Material objects.
  // This pattern is extended in Phase 2 with actual force arrow builders.
  let dynObjects = {};

  function clearDyn() {
    Object.values(dynObjects).forEach(obj => {
      if (!obj) return;
      scene.remove(obj);
      obj.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    dynObjects = {};
  }

  // ── Dynamic drawing ───────────────────────────────────────────────────────
  // Phase 1: drawDyn() establishes the pattern but draws nothing.
  // Phase 2 adds force arrows (forceP, forceQ, angleArc, labels).
  // Phase 3 adds the tugboat narrative scene.
  // Phase 4 adds parallelogram ghost lines and the emerging diagonal.
  // Phase 5 adds the resultant R arrow.
  // Phase 6 adds the triangle law transition.
  let _curState = null;
  let _curVis   = null;

  function drawDyn(state, visSet) {
    clearDyn();
    _curState = state;
    _curVis   = visSet;
    // Dynamic drawing is added in Phase 2 and beyond.
    // Each phase adds its own visSet keys and corresponding drawing blocks here.
  }

  // ── Update ────────────────────────────────────────────────────────────────
  // Called from main.js whenever state or step changes.
  // Controls static object visibility via the visSet, then triggers drawDyn.
  function update(state, visSet) {
    _curState = state;
    _curVis   = visSet;
    staticGroups.grid.visible = visSet.has('grid');
    staticGroups.axes.visible = visSet.has('axes');
    drawDyn(state, visSet);
  }

  // ── Animation tick ────────────────────────────────────────────────────────
  // Called every rAF frame from main.js before renderer.render().
  // Phase 4 extends this to advance the parallelogram construction animation.
  // Phase 6 extends this to advance the triangle law transition animation.
  function tick() {
    // Animation logic added in Phase 4 and Phase 6.
  }

  // ── Drag callback ─────────────────────────────────────────────────────────
  // Phase 2 wires this to the pointer-event drag handler on the canvas.
  // main.js registers a callback via setDragCallback() that updates state
  // and propagates changes to the UI layer.
  let _dragCb = null;
  function setDragCallback(fn) { _dragCb = fn; }

  // ── Coordinate transforms ─────────────────────────────────────────────────
  // worldToScreen: converts a Three.js world position (scene units) to CSS
  // pixel coordinates on the canvas element. Used each frame to position
  // the HTML label overlay elements (label-p, label-q, label-r, etc.).
  function worldToScreen(wx, wy) {
    const v    = new THREE.Vector3(wx, wy, 0).project(camera);
    const rect = canvas.getBoundingClientRect();
    return {
      x: (v.x + 1) / 2 * rect.width,
      y: (-v.y + 1) / 2 * rect.height,
    };
  }

  // screenToWorld: converts CSS pixel coordinates (from pointer events) to
  // Three.js world coordinates. Used in Phase 2 for arrowhead drag detection.
  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ndcX =  ((clientX - rect.left) / rect.width)  * 2 - 1;
    const ndcY = -(((clientY - rect.top)  / rect.height) * 2 - 1);
    const v    = new THREE.Vector3(ndcX, ndcY, 0).unproject(camera);
    return { x: v.x, y: v.y };
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    scene,
    camera,
    renderer,
    resize,
    update,
    tick,
    worldToScreen,
    screenToWorld,
    setDragCallback,
  };
}
