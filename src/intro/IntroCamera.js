import * as THREE from 'three';
import { AnimationManager, easeInOutCubic } from '../shared/AnimationManager.js';

// Perspective camera used exclusively during the introduction.
// The simulation uses its own orthographic camera (from sceneSetup.js).
// IntroCamera provides a flyTo() API for smooth camera movements between scenes.

export class IntroCamera {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);

    // Initial: elevated and slightly forward, giving a natural bird's-eye view
    // of the harbour. The camera looks down at the origin.
    this.camera.position.set(0, 18, 14);
    this._lookTarget = new THREE.Vector3(0, 0, 0);
    this.camera.lookAt(this._lookTarget);

    this._anim      = new AnimationManager();
    this._idling    = false;
    this._idleT     = 0;
    this._idleBase  = new THREE.Vector3();
  }

  resize(width, height) {
    if (!height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  // Smoothly move the camera to a new position, looking at a new target.
  // Returns a Promise that resolves when the move completes.
  flyTo({ position, lookAt, duration = 1.4, ease = easeInOutCubic, onComplete } = {}) {
    this.stopIdle();
    const startPos    = this.camera.position.clone();
    const startLook   = this._lookTarget.clone();
    const endPos      = new THREE.Vector3(...position);
    const endLook     = new THREE.Vector3(...(lookAt ?? [0, 0, 0]));
    const scratchPos  = new THREE.Vector3();
    const scratchLook = new THREE.Vector3();

    this._anim.cancelAll();

    return new Promise(resolve => {
      this._anim.play({
        duration,
        ease,
        onUpdate: t => {
          scratchPos.lerpVectors(startPos, endPos, t);
          this.camera.position.copy(scratchPos);

          scratchLook.lerpVectors(startLook, endLook, t);
          this._lookTarget.copy(scratchLook);
          this.camera.lookAt(this._lookTarget);
        },
        onComplete: () => {
          if (onComplete) onComplete();
          resolve();
        },
      });
    });
  }

  // Subtle idle camera drift — keeps the scene feeling alive during narrative.
  startIdle() {
    this._idling   = true;
    this._idleT    = 0;
    this._idleBase.copy(this.camera.position);
  }

  stopIdle() { this._idling = false; }

  // Call every rAF frame (dt in seconds).
  tick(dt) {
    this._anim.tick(dt);
    if (this._idling) {
      this._idleT += dt * 0.35;
      this.camera.position.y = this._idleBase.y + Math.sin(this._idleT) * 0.12;
      this.camera.lookAt(this._lookTarget);
    }
  }
}
