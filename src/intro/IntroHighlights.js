// Generic object highlighting for the intro framework.
// Highlights a Three.js Object3D by pulsing its meshes' emissive colour.
// Usage: highlights.add(object, color) / highlights.clear() / highlights.tick(dt)

export class IntroHighlights {
  constructor() {
    this._targets = []; // [{ mesh, originalEmissive, originalIntensity, phase }]
    this._t       = 0;
  }

  // Highlight all Mesh children of `object3D` with a pulsing emissive glow.
  // color is a hex number (e.g. 0xffffff). Silently skips non-mesh geometry.
  add(object3D, color = 0xffffff) {
    object3D.traverse(child => {
      if (!child.isMesh || !child.material) return;
      const mat = child.material;
      if (!mat.emissive) return; // material does not support emissive
      const entry = {
        mesh:              child,
        originalEmissive:  mat.emissive.clone(),
        originalIntensity: mat.emissiveIntensity ?? 0,
        highlightColor:    color,
        phase:             Math.random() * Math.PI * 2, // stagger per mesh
      };
      mat.emissive.setHex(color);
      this._targets.push(entry);
    });
  }

  // Remove all highlights and restore original emissive values.
  clear() {
    for (const entry of this._targets) {
      const mat = entry.mesh.material;
      if (!mat.emissive) continue;
      mat.emissive.copy(entry.originalEmissive);
      mat.emissiveIntensity = entry.originalIntensity;
    }
    this._targets = [];
  }

  // Call once per rAF frame (dt in seconds). Animates the pulse.
  tick(dt) {
    if (!this._targets.length) return;
    this._t += dt;
    for (const entry of this._targets) {
      const pulse   = 0.5 + 0.5 * Math.sin(this._t * 2.4 + entry.phase);
      const mat     = entry.mesh.material;
      if (!mat.emissive) continue;
      mat.emissive.setHex(entry.highlightColor);
      mat.emissiveIntensity = pulse * 0.55;
    }
  }
}
