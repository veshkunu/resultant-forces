import * as THREE from 'three';
import { AnimationManager, easeOutCubic, easeInOutCubic } from '../../shared/AnimationManager.js';

// ─── Rest positions ────────────────────────────────────────────────────────────
const TUG_A_REST = new THREE.Vector3(-3.0, 0,  1.5);
const TUG_B_REST = new THREE.Vector3(-3.0, 0, -1.5);

// Demo pull target positions — used in automated step demonstrations.
// Chosen to produce a clearly visible ship response without leaving camera.
const TUG_A_DEMO = new THREE.Vector3(-5.1, 0,  2.5);
const TUG_B_DEMO = new THREE.Vector3(-5.1, 0, -2.5);

const BOW_OFFSET = 1.45;  // half hull length — bow at shipPos.x - BOW_OFFSET
const BOW_Y      = 0.3;   // rope attachment height

// ─── Geometry scale constants ──────────────────────────────────────────────────
const SHIP = {
  hullW: 2.9, hullH: 0.40, hullD: 0.93,
  superW: 0.87, superH: 0.52, superD: 0.70,
  towerW: 0.39, towerH: 0.32, towerD: 0.51,
  craneW: 0.055, craneH: 0.93,
};

const TUG = {
  hullW: 0.98, hullH: 0.30, hullD: 0.50,
  pilotW: 0.37, pilotH: 0.25, pilotD: 0.36,
};

// ─── Physics constants ─────────────────────────────────────────────────────────
// The ship is massive — forces build slowly, inertia is obvious.
const SHIP_MASS         = 5.5;          // virtual kg — governs acceleration
const SHIP_LIN_DAMPING  = 2.8;          // water drag (per-second decay exponent)
const SHIP_ANG_DAMPING  = 4.2;          // rotational drag
const SHIP_MOMENT       = 3.2;          // moment of inertia (rotational mass)
const ROPE_STIFFNESS    = 5.5;          // N per unit of tug displacement past slack
const ROPE_SLACK        = 0.07;         // deadzone — rope must stretch before pulling
const RETURN_SPRING     = 0.9;          // restoring spring to origin when unpulled
const RETURN_ANG_SPRING = 1.4;          // rotational restoring spring
const MAX_SHIP_SPEED    = 1.1;          // velocity cap (units/s)
const SHIP_POS_CLAMP    = 2.2;          // max linear displacement from origin
const SHIP_ROT_CLAMP    = Math.PI / 5;  // max rotation ≈ 36°

// ─── Bob constants ─────────────────────────────────────────────────────────────
const BOB_AMP_SHIP  = 0.013;  // ship vertical oscillation amplitude
const BOB_AMP_TUG   = 0.009;  // tug vertical oscillation amplitude
const BOB_FREQ_SHIP = 0.82;   // Hz
const BOB_FREQ_TUGA = 0.91;   // Hz (slightly different so tugs feel independent)
const BOB_FREQ_TUGB = 0.78;

// ─── Rope colour palette ───────────────────────────────────────────────────────
const ROPE_COL_SLACK = new THREE.Color(0xd4b483);   // natural hemp — slack
const ROPE_COL_TAUT  = new THREE.Color(0xfff0cc);   // warm cream — under tension
const ROPE_COL_DRAG  = new THREE.Color(0xffffff);   // bright — active drag glow

// ─── Scratch objects (avoid GC pressure) ──────────────────────────────────────
const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _q0 = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

// ─── HarborScene ───────────────────────────────────────────────────────────────
// Implements the generic IntroScene interface consumed by IntroManager.
// Physics model: force accumulation → velocity integration → damping → position.
// Designed to be reusable/extensible by future simulation phases.
export class HarborScene {

  // ── Physics state ─────────────────────────────────────────────────────────
  _shipPosX  = 0;   // world-space displacement from origin
  _shipPosZ  = 0;
  _shipRotY  = 0;   // Y rotation in radians
  _shipVelX  = 0;   // linear velocity
  _shipVelZ  = 0;
  _shipAngVel= 0;   // angular velocity around Y

  // Rope tension [0..1] — updated each physics tick for visual feedback
  _ropeTensionA = 0;
  _ropeTensionB = 0;

  // ── Demo flags ────────────────────────────────────────────────────────────
  // Set by _startTugADemo/_startTugBDemo — enables physics for non-interactive steps
  _demoTugA = false;
  _demoTugB = false;

  // ── Bob / float state ─────────────────────────────────────────────────────
  _bobT = 0;

  // ── Pulse / highlight state ───────────────────────────────────────────────
  _pulseEntries = [];
  _pulseT       = 0;
  _activeDragTug = null;

  // ── Drag state ────────────────────────────────────────────────────────────
  _currentDragMask = 0;
  _boundDown = null;
  _boundMove = null;
  _boundUp   = null;
  _canvas    = null;
  _camera    = null;

  // ── Transition timeout guard ──────────────────────────────────────────────
  _transitionTimeout = null;

  constructor() {
    this._scene   = null;
    this._objects = {};
    this._anim    = new AnimationManager();
    this._built   = false;
  }

  // ── Public: build ─────────────────────────────────────────────────────────
  build(threeScene) {
    if (this._built) return;
    this._built = true;
    this._scene = threeScene;

    this._setupLighting(threeScene);
    this._buildOcean(threeScene);
    this._buildDock(threeScene);
    this._buildShip(threeScene);
    this._buildTugs(threeScene);
    this._buildRopes(threeScene);

    threeScene.background = new THREE.Color(0x87bfd9);
  }

  // ── Public: onStep ────────────────────────────────────────────────────────
  onStep(stepIndex, reducedMotion = false) {
    // Cancel any running demo animations
    this._anim.cancelAll();

    // Reset physics velocity so the ship doesn't carry momentum into a new step.
    // Position is also snapped to origin so each step starts clean.
    this._shipPosX  = 0;  this._shipPosZ  = 0;  this._shipRotY  = 0;
    this._shipVelX  = 0;  this._shipVelZ  = 0;  this._shipAngVel = 0;
    this._ropeTensionA = 0;  this._ropeTensionB = 0;
    this._demoTugA  = false;  this._demoTugB = false;

    const o = this._objects;
    if (o.cargoShip) { o.cargoShip.position.set(0, 0, 0); o.cargoShip.rotation.set(0, 0, 0); }
    if (o.tugA) o.tugA.position.copy(TUG_A_REST);
    if (o.tugB) o.tugB.position.copy(TUG_B_REST);

    this._clearHighlights();

    switch (stepIndex) {
      case 1: // "A cargo ship needs assistance."
        this._pulseObject(o.cargoShip, 0xffd060);
        break;

      case 2: // "Tugboat A applies a pulling force." → Scene A: only tugA pulls
        this._pulseObject(o.tugA, 0xff8888);
        this._startTugDemo('A', reducedMotion);
        break;

      case 3: // "Tugboat B also applies a force." → Scene B: only tugB pulls
        this._pulseObject(o.tugB, 0xffa055);
        this._startTugDemo('B', reducedMotion);
        break;

      case 4: // "The ropes transmit the forces." — show both ropes taut
        this._pulseRope(o.ropeA, 0xffffff);
        this._pulseRope(o.ropeB, 0xffffff);
        break;

      default: break;
    }
  }

  // ── Public: enableInteraction ─────────────────────────────────────────────
  enableInteraction(canvas, camera, dragMask = 1) {
    this.disableInteraction();
    this._canvas          = canvas;
    this._camera          = camera;
    this._currentDragMask = dragMask;

    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const ndc       = new THREE.Vector2();
    const hit       = new THREE.Vector3();

    const draggable = [];
    if (dragMask & 1) draggable.push({ key: 'tugA', obj: this._objects.tugA });
    if (dragMask & 2) draggable.push({ key: 'tugB', obj: this._objects.tugB });

    let dragEntry = null;

    const toNDC = e => {
      const b = canvas.getBoundingClientRect();
      ndc.set(
        ((e.clientX - b.left) / b.width)  *  2 - 1,
        ((e.clientY - b.top)  / b.height) * -2 + 1,
      );
    };

    const onDown = e => {
      toNDC(e);
      raycaster.setFromCamera(ndc, camera);
      for (const entry of draggable) {
        if (!entry.obj) continue;
        const hits = [];
        raycaster.intersectObject(entry.obj, true, hits);
        if (hits.length > 0) {
          dragEntry = entry;
          canvas.setPointerCapture(e.pointerId);
          canvas.style.cursor = 'grabbing';
          this._activeDragTug = entry.key;
          this._clearHighlights();
          this._pulseObject(entry.obj, 0xffffff);
          break;
        }
      }
    };

    const onMove = e => {
      if (!dragEntry) {
        toNDC(e);
        raycaster.setFromCamera(ndc, camera);
        let over = false;
        for (const entry of draggable) {
          if (!entry.obj) continue;
          const hits = [];
          raycaster.intersectObject(entry.obj, true, hits);
          if (hits.length > 0) { over = true; break; }
        }
        canvas.style.cursor = over ? 'grab' : 'default';
        return;
      }
      toNDC(e);
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(dragPlane, hit)) {
        dragEntry.obj.position.x = hit.x;
        dragEntry.obj.position.z = hit.z;
      }
    };

    const onUp = () => {
      if (dragEntry) {
        canvas.style.cursor = 'grab';
        this._activeDragTug = null;
        this._clearHighlights();
        dragEntry = null;
      }
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup',   onUp);
    canvas.style.cursor = 'grab';

    this._boundDown = onDown;
    this._boundMove = onMove;
    this._boundUp   = onUp;
  }

  disableInteraction() {
    this._currentDragMask = 0;
    this._activeDragTug   = null;
    if (!this._canvas || !this._boundDown) return;
    this._canvas.removeEventListener('pointerdown', this._boundDown);
    this._canvas.removeEventListener('pointermove', this._boundMove);
    this._canvas.removeEventListener('pointerup',   this._boundUp);
    this._canvas.style.cursor = '';
    this._boundDown = this._boundMove = this._boundUp = null;
    this._canvas = null;
  }

  // ── Public: beginTransition ───────────────────────────────────────────────
  beginTransition(threeScene, onComplete, reducedMotion = false) {
    this.disableInteraction();
    this._clearHighlights();
    this._anim.cancelAll();
    if (this._transitionTimeout !== null) {
      clearTimeout(this._transitionTimeout);
      this._transitionTimeout = null;
    }

    if (reducedMotion) {
      this._hideAll(threeScene);
      if (onComplete) onComplete();
      return;
    }

    const colPBase = new THREE.Color(0xd4b483);
    const colP     = new THREE.Color(0xc0392b);
    const colQ     = new THREE.Color(0xbc5d1e);

    this._anim.play({
      duration: 0.5,
      ease: easeOutCubic,
      onUpdate: t => {
        this._objects.ropeA?.material?.color.lerpColors(colPBase, colP, t);
        this._objects.ropeB?.material?.color.lerpColors(colPBase, colQ, t);
      },
    });

    const toFade  = [this._objects.cargoShip, this._objects.tugA, this._objects.tugB, this._objects.dock];
    const skyStart  = new THREE.Color(0x87bfd9);
    const skyEnd    = new THREE.Color(0xfaf8f3);
    const oceanBase = new THREE.Color(0x2a6585);

    this._transitionTimeout = setTimeout(() => {
      this._transitionTimeout = null;
      this._anim.play({
        duration: 0.8,
        ease: easeInOutCubic,
        onUpdate: t => {
          for (const obj of toFade) this._setOpacity(obj, 1 - t);
          if (this._objects.ocean?.material) {
            this._objects.ocean.material.color.lerpColors(oceanBase, skyEnd, t);
            this._objects.ocean.material.opacity = 1 - t * 0.9;
          }
          threeScene.background = new THREE.Color().lerpColors(skyStart, skyEnd, t);
        },
        onComplete: () => {
          this._hideAll(threeScene);
          if (onComplete) onComplete();
        },
      });
    }, 300);
  }

  // ── Public: reset ─────────────────────────────────────────────────────────
  reset() {
    this._anim.cancelAll();
    if (this._transitionTimeout !== null) {
      clearTimeout(this._transitionTimeout);
      this._transitionTimeout = null;
    }
    this._clearHighlights();
    this.disableInteraction();

    // Physics
    this._shipPosX = 0;  this._shipPosZ = 0;  this._shipRotY = 0;
    this._shipVelX = 0;  this._shipVelZ = 0;  this._shipAngVel = 0;
    this._ropeTensionA = 0;  this._ropeTensionB = 0;
    this._demoTugA = false;  this._demoTugB = false;
    this._bobT  = 0;
    this._pulseT = 0;

    const o = this._objects;
    if (o.tugA)      { o.tugA.position.copy(TUG_A_REST);       o.tugA.rotation.set(0, 0, 0); }
    if (o.tugB)      { o.tugB.position.copy(TUG_B_REST);       o.tugB.rotation.set(0, 0, 0); }
    if (o.cargoShip) { o.cargoShip.position.set(0, 0, 0);      o.cargoShip.rotation.set(0, 0, 0); }

    this._updateRopes();
    if (o.ropeA?.material) o.ropeA.material.color.copy(ROPE_COL_SLACK);
    if (o.ropeB?.material) o.ropeB.material.color.copy(ROPE_COL_SLACK);

    const solids = [o.cargoShip, o.tugA, o.tugB, o.dock];
    for (const obj of solids) this._setOpacity(obj, 1);
    if (o.ocean?.material) {
      o.ocean.material.color.setHex(0x2a6585);
      o.ocean.material.opacity = 1;
    }
    for (const [key, obj] of Object.entries(o)) {
      if (!obj || key.startsWith('light')) continue;
      obj.visible = true;
    }
    if (this._scene) this._scene.background = new THREE.Color(0x87bfd9);
  }

  // ── Public: tick ─────────────────────────────────────────────────────────
  tick(dt) {
    this._anim.tick(dt);
    this._bobT += dt;
    this._updateShipPhysics(dt);
    this._updateBob();
    this._updateRopeTensionColors();
    if (this._pulseEntries.length > 0) {
      this._pulseT += dt;
      this._applyPulses();
    }
  }

  // ── Private: geometry builders ────────────────────────────────────────────

  _setupLighting(scene) {
    const hemi   = new THREE.HemisphereLight(0x90c8e0, 0x7a6548, 0.55);
    const ambient= new THREE.AmbientLight(0xfff8f0, 0.45);
    const sun    = new THREE.DirectionalLight(0xfff4cc, 1.9); sun.position.set(8, 20, 6);
    const fill   = new THREE.DirectionalLight(0xddeeff, 0.35); fill.position.set(-5, 8, -8);
    scene.add(hemi, ambient, sun, fill);
    this._objects.lightHemi    = hemi;
    this._objects.lightAmbient = ambient;
    this._objects.lightSun     = sun;
    this._objects.lightFill    = fill;
  }

  _buildOcean(scene) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({
        color: 0x2a6585, roughness: 0.35, metalness: 0.45,
        transparent: true, opacity: 1,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.06;
    scene.add(mesh);
    this._objects.ocean = mesh;
  }

  _buildShip(scene) {
    const group = new THREE.Group();
    const S = SHIP;

    const add = (geo, color, pos, opts = {}) => {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color,
          roughness: opts.roughness ?? 0.70,
          metalness: opts.metalness ?? 0.10,
        }),
      );
      m.position.set(...pos);
      group.add(m);
      return m;
    };

    add(new THREE.BoxGeometry(S.hullW, S.hullH, S.hullD),
        0x6b7280, [0, S.hullH / 2, 0], { roughness: 0.65, metalness: 0.15 });
    add(new THREE.BoxGeometry(S.hullW + 0.12, 0.04, S.hullD + 0.11),
        0x9ca3af, [0, S.hullH + 0.02, 0], { roughness: 0.60, metalness: 0.12 });

    const sternX = S.hullW / 2 - S.superW / 2 - 0.10;
    add(new THREE.BoxGeometry(S.superW, S.superH, S.superD),
        0xcfd3da, [sternX, S.hullH + S.superH / 2, 0], { roughness: 0.60, metalness: 0.06 });
    add(new THREE.BoxGeometry(S.towerW, S.towerH, S.towerD),
        0xbfc3c9, [sternX, S.hullH + S.superH + S.towerH / 2, 0], { roughness: 0.55, metalness: 0.08 });
    add(new THREE.BoxGeometry(S.towerW - 0.07, 0.15, 0.03),
        0x1a2a44, [sternX, S.hullH + S.superH + S.towerH * 0.55, S.towerD / 2 + 0.01],
        { roughness: 0.25, metalness: 0.20 });
    add(new THREE.BoxGeometry(S.craneW, S.craneH, S.craneW),
        0x9ca3af, [-0.20, S.hullH + S.craneH / 2, 0], { roughness: 0.80, metalness: 0.30 });
    add(new THREE.BoxGeometry(0.07, S.hullH, S.hullD),
        0x374151, [-(S.hullW / 2), S.hullH / 2, 0], { roughness: 0.75, metalness: 0.10 });

    group.position.set(0, 0, 0);
    scene.add(group);
    this._objects.cargoShip = group;
  }

  _buildTugs(scene) {
    const makeTug = (hullCol, pilotCol, restPos) => {
      const group = new THREE.Group();
      const T = TUG;
      const add = (geo, color, pos, opts = {}) => {
        const m = new THREE.Mesh(
          geo,
          new THREE.MeshStandardMaterial({
            color, roughness: opts.roughness ?? 0.65, metalness: opts.metalness ?? 0.08,
          }),
        );
        m.position.set(...pos);
        group.add(m);
        return m;
      };
      add(new THREE.BoxGeometry(T.hullW, T.hullH, T.hullD), hullCol, [0, T.hullH / 2, 0]);
      add(new THREE.BoxGeometry(T.pilotW, T.pilotH, T.pilotD),
          pilotCol, [0.08, T.hullH + T.pilotH / 2, 0], { roughness: 0.58 });
      add(new THREE.CylinderGeometry(0.042, 0.042, 0.17, 8),
          0x374151, [-0.08, T.hullH + T.pilotH + 0.085, 0.04], { roughness: 0.90, metalness: 0.20 });
      group.position.copy(restPos);
      return group;
    };
    this._objects.tugA = makeTug(0xc0392b, 0xe55353, TUG_A_REST);
    this._objects.tugB = makeTug(0xbc5d1e, 0xd97c35, TUG_B_REST);
    scene.add(this._objects.tugA, this._objects.tugB);
  }

  _buildDock(scene) {
    const group = new THREE.Group();
    const add = (geo, color, pos) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.90, metalness: 0.02 }));
      m.position.set(...pos);
      group.add(m);
    };
    add(new THREE.BoxGeometry(2.33, 0.09, 1.20), 0x8b7355, [0, 0, 0]);
    [[-1.0, 0.47], [-1.0, -0.47], [1.0, 0.47], [1.0, -0.47]].forEach(([dx, dz]) => {
      add(new THREE.CylinderGeometry(0.037, 0.047, 0.50, 6), 0x78614a, [dx, -0.25, dz]);
    });
    group.position.set(2.8, 0.04, 0);
    scene.add(group);
    this._objects.dock = group;
  }

  _buildRopes(scene) {
    const makeRope = () => new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 1, 6),
      new THREE.MeshStandardMaterial({ color: 0xd4b483, roughness: 0.90, metalness: 0 }),
    );
    this._objects.ropeA = makeRope();
    this._objects.ropeB = makeRope();
    scene.add(this._objects.ropeA, this._objects.ropeB);
    this._updateRopes();
  }

  // ── Private: demo animation ───────────────────────────────────────────────

  // Smoothly moves one tug from rest to its demo position, then holds.
  // This lets the physics engine produce the ship response naturally.
  _startTugDemo(which, reducedMotion) {
    const key      = which === 'A' ? 'tugA'      : 'tugB';
    const restPos  = which === 'A' ? TUG_A_REST  : TUG_B_REST;
    const demoPos  = which === 'A' ? TUG_A_DEMO  : TUG_B_DEMO;
    const flagKey  = which === 'A' ? '_demoTugA' : '_demoTugB';

    this[flagKey] = true;

    if (reducedMotion) {
      this._objects[key]?.position.copy(demoPos);
      return;
    }

    const startPos = restPos.clone();

    // Phase 1: tug moves slowly out (1.0 s) — simulates engines starting
    // Phase 2: tug holds final position — rope stays taut while ship accelerates
    this._anim.play({
      duration: 2.2,
      ease: easeOutCubic,
      onUpdate: t => {
        const tug = this._objects[key];
        if (tug) tug.position.lerpVectors(startPos, demoPos, t);
      },
    });
  }

  // ── Private: physics ──────────────────────────────────────────────────────

  // Force-based physics:
  //   1. Each active tugboat produces a rope tension force (proportional to displacement).
  //   2. Force is applied at the bow — off-centre — which creates torque and rotation.
  //   3. Velocity accumulates (inertia) and is damped (water drag).
  //   4. When nothing pulls, a gentle return spring brings the ship back to origin.
  _updateShipPhysics(dt) {
    const o = this._objects;
    if (!o.cargoShip) return;

    let forceX = 0, forceZ = 0, torqueY = 0;
    let anyTugActive = false;

    // Pre-compute bow position in world space (accounts for ship rotation).
    const bow = this._getBowWorldPos();

    // Accumulate rope forces from all active tugs (drag + demo).
    const processTug = (tug, restPos, tensionProp) => {
      if (!tug) return;

      // Tug displacement from rest determines rope tension.
      const disp = tug.position.distanceTo(restPos);
      const net  = Math.max(0, disp - ROPE_SLACK);

      // Update rope tension meter [0..1] for colour feedback.
      const tensionNorm = Math.min(1, net / (ROPE_STIFFNESS * 0.4));
      // Smooth the tension value to avoid flicker.
      this[tensionProp] += (tensionNorm - this[tensionProp]) * Math.min(1, dt * 8);

      if (net < 0.001) return; // rope still slack, no force
      anyTugActive = true;

      // Rope attachment on the tug (right-facing side toward the ship).
      const halfW = TUG.hullW / 2;
      const attachX = tug.position.x + halfW;
      const attachZ = tug.position.z;

      // Force direction: from bow toward tug attachment.
      const dx = attachX - bow.x;
      const dz = attachZ - bow.z;
      const ropeLen = Math.hypot(dx, dz);
      if (ropeLen < 0.001) return;

      const tension = net * ROPE_STIFFNESS;
      const dirX = dx / ropeLen;
      const dirZ = dz / ropeLen;

      forceX += dirX * tension;
      forceZ += dirZ * tension;

      // Torque: force is applied at the bow, which is offset from ship centre.
      // Lever arm in world space (simplified — ignores small rotation error).
      // torqueY = leverX × forceZ − leverZ × forceX
      // leverX ≈ -BOW_OFFSET (bow is behind ship's centre along X)
      torqueY += (-BOW_OFFSET) * (dirZ * tension);
    };

    if ((this._currentDragMask & 1) || this._demoTugA) processTug(o.tugA, TUG_A_REST, '_ropeTensionA');
    if ((this._currentDragMask & 2) || this._demoTugB) processTug(o.tugB, TUG_B_REST, '_ropeTensionB');

    // Decay tension on inactive ropes.
    if (!(this._currentDragMask & 1) && !this._demoTugA)
      this._ropeTensionA *= Math.exp(-dt * 6);
    if (!(this._currentDragMask & 2) && !this._demoTugB)
      this._ropeTensionB *= Math.exp(-dt * 6);

    // When nothing is pulling, apply a gentle spring back toward the origin.
    // This lets the ship drift back naturally after interaction ends.
    if (!anyTugActive) {
      forceX -= this._shipPosX * RETURN_SPRING;
      forceZ -= this._shipPosZ * RETURN_SPRING;
      torqueY -= this._shipRotY * RETURN_ANG_SPRING;
    }

    // ── Integrate linear motion ─────────────────────────────────────────────
    this._shipVelX += (forceX / SHIP_MASS) * dt;
    this._shipVelZ += (forceZ / SHIP_MASS) * dt;

    // Speed clamp prevents tug-dragging from sending ship flying.
    const speed = Math.hypot(this._shipVelX, this._shipVelZ);
    if (speed > MAX_SHIP_SPEED) {
      const s = MAX_SHIP_SPEED / speed;
      this._shipVelX *= s;
      this._shipVelZ *= s;
    }

    // Water drag: exponential velocity decay each frame.
    const linDecay = Math.exp(-SHIP_LIN_DAMPING * dt);
    this._shipVelX *= linDecay;
    this._shipVelZ *= linDecay;

    this._shipPosX += this._shipVelX * dt;
    this._shipPosZ += this._shipVelZ * dt;

    // ── Integrate angular motion ────────────────────────────────────────────
    this._shipAngVel += (torqueY / SHIP_MOMENT) * dt;
    this._shipAngVel *= Math.exp(-SHIP_ANG_DAMPING * dt);
    this._shipRotY   += this._shipAngVel * dt;

    // ── Position / rotation clamps ──────────────────────────────────────────
    this._shipPosX = Math.max(-SHIP_POS_CLAMP, Math.min(SHIP_POS_CLAMP, this._shipPosX));
    this._shipPosZ = Math.max(-SHIP_POS_CLAMP, Math.min(SHIP_POS_CLAMP, this._shipPosZ));
    this._shipRotY = Math.max(-SHIP_ROT_CLAMP, Math.min(SHIP_ROT_CLAMP, this._shipRotY));

    // Apply to mesh (Y will be overridden by _updateBob immediately after).
    o.cargoShip.position.set(this._shipPosX, 0, this._shipPosZ);
    o.cargoShip.rotation.y = this._shipRotY;

    this._updateRopes();
  }

  // Gentle sinusoidal vertical bob for ship and tugs — simulates ocean swell.
  // Called after _updateShipPhysics so it writes on top of the physics Y.
  _updateBob() {
    const t = this._bobT;
    const o = this._objects;
    if (o.cargoShip) {
      o.cargoShip.position.y = Math.sin(t * BOB_FREQ_SHIP * Math.PI * 2) * BOB_AMP_SHIP;
      // Subtle roll (Z rotation) as the ship bobs
      o.cargoShip.rotation.z = Math.sin(t * BOB_FREQ_SHIP * Math.PI * 2 + 0.5) * 0.008;
    }
    if (o.tugA) {
      o.tugA.position.y = Math.sin(t * BOB_FREQ_TUGA * Math.PI * 2 + 0.9) * BOB_AMP_TUG;
      o.tugA.rotation.z = Math.sin(t * BOB_FREQ_TUGA * Math.PI * 2 + 1.2) * 0.012;
    }
    if (o.tugB) {
      o.tugB.position.y = Math.sin(t * BOB_FREQ_TUGB * Math.PI * 2 + 2.1) * BOB_AMP_TUG;
      o.tugB.rotation.z = Math.sin(t * BOB_FREQ_TUGB * Math.PI * 2 + 2.4) * 0.012;
    }
  }

  // ── Private: rope geometry ────────────────────────────────────────────────

  _getBowWorldPos() {
    const ship = this._objects.cargoShip;
    if (!ship) return new THREE.Vector3();
    const local = new THREE.Vector3(-BOW_OFFSET, BOW_Y, 0);
    return local.applyQuaternion(ship.quaternion).add(ship.position);
  }

  _updateRopes() {
    const bow = this._getBowWorldPos();
    const o   = this._objects;
    if (!o.tugA || !o.tugB) return;
    const halfW   = TUG.hullW / 2;
    const attachA = new THREE.Vector3(o.tugA.position.x + halfW, BOW_Y, o.tugA.position.z);
    const attachB = new THREE.Vector3(o.tugB.position.x + halfW, BOW_Y, o.tugB.position.z);
    this._positionRopeCylinder(o.ropeA, attachA, bow);
    this._positionRopeCylinder(o.ropeB, attachB, bow);
  }

  _positionRopeCylinder(mesh, from, to) {
    if (!mesh) return;
    _v0.subVectors(to, from);
    const len = _v0.length();
    if (len < 0.001) { mesh.visible = false; return; }
    mesh.visible = true;
    _v1.addVectors(from, to).multiplyScalar(0.5);
    mesh.position.copy(_v1);
    mesh.scale.set(1, len, 1);
    _v0.normalize();
    const dot = _up.dot(_v0);
    if (Math.abs(dot) > 0.9999) {
      if (dot < 0) mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
      else         mesh.quaternion.identity();
    } else {
      _q0.setFromUnitVectors(_up, _v0);
      mesh.quaternion.copy(_q0);
    }
  }

  // ── Private: rope tension colour ──────────────────────────────────────────

  // Updates rope colour each frame to visualise tension.
  // Defers to the pulse system when rope highlights are active.
  _updateRopeTensionColors() {
    const hasRopePulse = this._pulseEntries.some(e => e.rope);
    if (hasRopePulse) return;

    const o = this._objects;

    if (o.ropeA?.material) {
      // Active drag gets bright glow; physics tension gets warm taut colour.
      if (this._activeDragTug === 'tugA') {
        const glow = 0.55 + 0.45 * Math.sin(this._pulseT * 5.5);
        o.ropeA.material.color.lerpColors(ROPE_COL_SLACK, ROPE_COL_DRAG, glow * 0.80);
      } else {
        o.ropeA.material.color.lerpColors(ROPE_COL_SLACK, ROPE_COL_TAUT, this._ropeTensionA);
      }
    }

    if (o.ropeB?.material) {
      if (this._activeDragTug === 'tugB') {
        const glow = 0.55 + 0.45 * Math.sin(this._pulseT * 5.5);
        o.ropeB.material.color.lerpColors(ROPE_COL_SLACK, ROPE_COL_DRAG, glow * 0.80);
      } else {
        o.ropeB.material.color.lerpColors(ROPE_COL_SLACK, ROPE_COL_TAUT, this._ropeTensionB);
      }
    }
  }

  // ── Private: highlight / pulse system ────────────────────────────────────

  _clearHighlights() {
    for (const e of this._pulseEntries) {
      if (e.mesh?.material?.emissive) {
        e.mesh.material.emissive.setHex(0x000000);
        e.mesh.material.emissiveIntensity = 0;
      }
      if (e.rope?.material) e.rope.material.color.copy(ROPE_COL_SLACK);
    }
    this._pulseEntries = [];
  }

  _pulseObject(obj3D, hexColor) {
    if (!obj3D) return;
    obj3D.traverse(child => {
      if (child.isMesh && child.material?.emissive) {
        this._pulseEntries.push({ mesh: child, color: hexColor, phase: Math.random() * Math.PI * 2 });
      }
    });
  }

  _pulseRope(rope, hexColor) {
    if (rope?.material) {
      this._pulseEntries.push({ rope, color: hexColor, phase: Math.random() * Math.PI * 2 });
    }
  }

  _applyPulses() {
    for (const e of this._pulseEntries) {
      const pulse = 0.38 + 0.38 * Math.sin(this._pulseT * 2.6 + e.phase);
      if (e.mesh?.material?.emissive) {
        e.mesh.material.emissive.setHex(e.color);
        e.mesh.material.emissiveIntensity = pulse;
      }
      if (e.rope?.material) {
        e.rope.material.color.lerpColors(ROPE_COL_SLACK, new THREE.Color(e.color), pulse * 0.85);
      }
    }
  }

  // ── Private: opacity & visibility ─────────────────────────────────────────

  _setOpacity(obj3D, alpha) {
    if (!obj3D) return;
    obj3D.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.transparent = true;
        child.material.opacity = alpha;
      }
    });
  }

  _hideAll(threeScene) {
    for (const [key, obj] of Object.entries(this._objects)) {
      if (!obj || key.startsWith('light')) continue;
      obj.visible = false;
    }
    threeScene.background = new THREE.Color(0xfaf8f3);
  }
}
