import { IntroCamera }         from './IntroCamera.js';
import { IntroDialogue }       from './IntroDialogue.js';
import { IntroStepController } from './IntroStepController.js';
import { REDUCED_MOTION }      from '../sceneSetup.js';

// ─── Scene config — Resultant of Forces harbour introduction ─────────────────
// Camera positions are chosen so ALL key objects (ship + both tugs) remain
// visible at every step. Steps 2–3 shift focus slightly but never clip tugs.
export const HARBOR_SCENES = [
  {
    title:       'Welcome to the Harbour.',
    description: 'Large ships cannot manoeuvre safely inside narrow ports. They need tugboat assistance.',
    allowBack:   false,
    camera:      { position: [0, 13, 10], lookAt: [-1, 0, 0], duration: 1.8 },
    interaction: null,
  },
  {
    title:       'A cargo ship needs assistance.',
    description: 'This cargo ship must change direction to safely leave the port.',
    allowBack:   true,
    camera:      { position: [-1, 11, 9], lookAt: [-0.5, 0, 0], duration: 1.0 },
    interaction: null,
    highlight:   'cargoShip',
  },
  {
    title:       'Tugboat A applies a pulling force.',
    description: 'Tugboat A attaches a tow rope and pulls the bow of the ship.',
    allowBack:   true,
    camera:      { position: [0, 12, 9], lookAt: [-2, 0, 1.2], duration: 1.0 },
    interaction: null,
    highlight:   'tugA',
  },
  {
    title:       'Tugboat B also applies a force.',
    description: 'Tugboat B pulls from a different direction — a different angle.',
    allowBack:   true,
    camera:      { position: [0, 12, 9], lookAt: [-2, 0, -1.2], duration: 1.0 },
    interaction: null,
    highlight:   'tugB',
  },
  {
    title:       'The ropes transmit the forces.',
    description: 'Each tow rope carries the pulling force from the tugboat to the ship bow. Two tugs — two forces.',
    allowBack:   true,
    camera:      { position: [0, 12, 9], lookAt: [-2, 0, 0], duration: 0.8 },
    interaction: null,
    highlight:   'ropes',
  },
  {
    title:       'Try it yourself.',
    description: 'Drag Tugboat A. Watch how the rope stretches and the ship responds.',
    allowBack:   true,
    camera:      { position: [0, 13, 10], lookAt: [-1.5, 0, 0], duration: 0.6 },
    interaction: 'tugA',
  },
  {
    title:       'Both forces together.',
    description: 'Now drag both tugboats. Notice how the ship moves according to both pulling forces combined.',
    allowBack:   true,
    camera:      { position: [0, 13, 10], lookAt: [-1, 0, 0], duration: 0.6 },
    interaction: 'both',
  },
  {
    title:       'Two forces become one.',
    description: 'The two pulling forces can be represented as vectors. Together, they produce a single resultant force — the direction the ship actually moves.',
    allowBack:   true,
    camera:      { position: [0, 24, 1.5], lookAt: [0, 0, 0], duration: 2.2 },
    interaction: null,
    isLast:      true,
  },
];

// Initial camera state — must match IntroCamera's constructor position so that
// restart() recreates the same "approaching the harbour" fly-in as the first run.
const INITIAL_CAM_POS    = [0, 18, 14];
const INITIAL_CAM_LOOKAT = [0, 0, 0];

// ─── IntroManager ─────────────────────────────────────────────────────────────
// Generic orchestrator for the simulation introduction.
// Works with any IntroScene class that implements the standard interface.
// Holds references indefinitely (no dispose on complete) to support replay.
export class IntroManager {
  constructor({ renderer, scene, canvas, onComplete }) {
    this._renderer   = renderer;
    this._scene      = scene;
    this._canvas     = canvas;
    this._onComplete = onComplete;

    this._camera     = new IntroCamera();
    this._dialogue   = new IntroDialogue();
    this._stepper    = null;
    this._introScene = null;
    this._scenes     = null;
    this._active     = false;
    this._lastTime   = null;

    this._wireDialogue();
    this._resizeCamera();
    // ResizeObserver catches canvas size changes from layout shifts (intro-active
    // toggling the step panel) which do not fire a window resize event.
    new ResizeObserver(() => this._resizeCamera()).observe(canvas);
  }

  // ── prepare ───────────────────────────────────────────────────────────────
  // Builds harbour geometry and starts the idle camera motion, but does NOT
  // show the dialogue card. Call activate() when the user chooses to begin.
  prepare(scenesConfig, introSceneInstance) {
    this._scenes     = scenesConfig;
    this._introScene = introSceneInstance;
    this._stepper    = new IntroStepController(scenesConfig.length);
    this._active     = false;

    introSceneInstance.build(this._scene);
    this._dialogue.hide(); // ensure dialogue starts hidden
    this._camera.startIdle();
  }

  // ── activate ──────────────────────────────────────────────────────────────
  // Shows the dialogue and starts the intro from step 0.
  // Call after prepare() once the user has clicked "Start Introduction".
  activate() {
    this._active = true;
    this._dialogue.show();
    this._goToStep(0);
  }

  // ── abort ─────────────────────────────────────────────────────────────────
  // Instantly hides the harbour scene without any transition animation.
  // Used when the user skips from the launch overlay before the intro began.
  abort() {
    this._active = false;
    this._introScene?.disableInteraction();
    this._introScene?.beginTransition(this._scene, null, true); // instant hide
    this._dialogue.hide();
  }

  // ── start ─────────────────────────────────────────────────────────────────
  // Convenience: prepare + activate in one call.
  start(scenesConfig, introSceneInstance) {
    this.prepare(scenesConfig, introSceneInstance);
    this.activate();
  }

  // ── restart ───────────────────────────────────────────────────────────────
  // Resets harbour scene and camera to the initial "prepared" state.
  // Dialogue is hidden — the caller is responsible for showing the launch overlay.
  restart() {
    this._lastTime = null; // prevents dt spike on first tick after restart
    this._active   = false;

    this._stepper.jumpTo(0);

    this._camera.stopIdle();
    this._camera.camera.position.set(...INITIAL_CAM_POS);
    this._camera._lookTarget.set(...INITIAL_CAM_LOOKAT);
    this._camera.camera.lookAt(this._camera._lookTarget);
    this._camera._anim.cancelAll();

    this._introScene?.reset();
    this._dialogue.hide();
    this._camera.startIdle();

    // Re-sync camera aspect ratio after DOM layout settles.
    requestAnimationFrame(() => this._resizeCamera());
  }

  // ── skip ──────────────────────────────────────────────────────────────────
  skip() {
    if (!this._active) return;
    this._active = false;

    // Use instant transition path (reducedMotion = true)
    this._introScene?.beginTransition(
      this._scene,
      () => {
        this._dialogue.hide();
        this._dialogue.showReplayButton();
        this._onComplete?.();
      },
      true, // instant — no fade animation
    );
  }

  // ── tick ──────────────────────────────────────────────────────────────────
  tick(timestamp) {
    const dt = this._lastTime !== null
      ? Math.min((timestamp - this._lastTime) / 1000, 0.1)
      : 0;
    this._lastTime = timestamp;

    this._camera.tick(dt);
    if (this._introScene) this._introScene.tick(dt);

    return this._camera.camera;
  }

  get introCamera() { return this._camera.camera; }

  // ── Private: step handling ────────────────────────────────────────────────

  _goToStep(index) {
    if (!this._scenes || !this._introScene) return;
    const sceneConf = this._scenes[index];

    this._dialogue.update(sceneConf, index, this._scenes.length);

    if (sceneConf.camera && !REDUCED_MOTION) {
      this._camera.stopIdle();
      this._camera.flyTo(sceneConf.camera).then(() => {
        if (index === 0) this._camera.startIdle();
      });
    } else if (index === 0) {
      this._camera.startIdle();
    }

    this._introScene.disableInteraction();
    this._introScene.onStep(index, REDUCED_MOTION);

    if (sceneConf.interaction === 'tugA') {
      this._introScene.enableInteraction(this._canvas, this._camera.camera, 1);
    } else if (sceneConf.interaction === 'both') {
      this._introScene.enableInteraction(this._canvas, this._camera.camera, 3);
    }
  }

  _wireDialogue() {
    this._dialogue.onNext(() => {
      if (!this._stepper || this._stepper.isLast) return;
      this._stepper.next();
      this._goToStep(this._stepper.current);
    });

    this._dialogue.onBack(() => {
      if (!this._stepper) return;
      this._stepper.back();
      this._goToStep(this._stepper.current);
    });

    this._dialogue.onSkip(() => this.skip());

    this._dialogue.onBegin(() => this._beginTransition());

    this._dialogue.onReplay(() => {
      const replayBtn = document.getElementById('sim-replay-intro');
      if (replayBtn) replayBtn.style.display = 'none';
      window.dispatchEvent(new CustomEvent('simatrix:replay-intro'));
    });
  }

  _beginTransition() {
    if (!this._active) return;
    this._active = false;

    this._introScene.beginTransition(
      this._scene,
      () => {
        this._dialogue.hide();
        // Objects are hidden, not disposed — available for replay.
        this._dialogue.showReplayButton();
        this._onComplete?.();
      },
      REDUCED_MOTION,
    );
  }

  _resizeCamera() {
    if (this._canvas) {
      this._camera.resize(this._canvas.clientWidth, this._canvas.clientHeight);
    }
  }
}
