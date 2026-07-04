// IntroDialogue: manages the HTML overlay that provides narrative text,
// progress dots, and navigation buttons during the introduction.
// It is completely generic — it knows nothing about the harbour scene.
// The scene config objects (passed to IntroManager) provide all copy.

export class IntroDialogue {
  // elIds maps to DOM element IDs defined in index.html
  constructor({
    overlayId    = 'intro-overlay',
    titleId      = 'intro-title',
    descId       = 'intro-description',
    progressId   = 'intro-progress',
    backBtnId    = 'intro-back',
    nextBtnId    = 'intro-next',
    beginBtnId   = 'intro-begin',
    skipBtnId    = 'intro-skip',
    replayBtnId  = 'sim-replay-intro',
  } = {}) {
    this._overlay  = document.getElementById(overlayId);
    this._title    = document.getElementById(titleId);
    this._desc     = document.getElementById(descId);
    this._progress = document.getElementById(progressId);
    this._backBtn  = document.getElementById(backBtnId);
    this._nextBtn  = document.getElementById(nextBtnId);
    this._beginBtn = document.getElementById(beginBtnId);
    this._skipBtn  = document.getElementById(skipBtnId);
    this._replayBtn = document.getElementById(replayBtnId);

    this._onNext   = null;
    this._onBack   = null;
    this._onSkip   = null;
    this._onBegin  = null;
    this._onReplay = null;

    this._wireButtons();
  }

  _wireButtons() {
    if (this._nextBtn)   this._nextBtn.addEventListener('click',  () => this._onNext?.());
    if (this._backBtn)   this._backBtn.addEventListener('click',  () => this._onBack?.());
    if (this._skipBtn)   this._skipBtn.addEventListener('click',  () => this._onSkip?.());
    if (this._beginBtn)  this._beginBtn.addEventListener('click', () => this._onBegin?.());
    if (this._replayBtn) this._replayBtn.addEventListener('click',() => this._onReplay?.());
  }

  // Register callbacks (called by IntroManager after construction)
  onNext(fn)   { this._onNext   = fn; }
  onBack(fn)   { this._onBack   = fn; }
  onSkip(fn)   { this._onSkip   = fn; }
  onBegin(fn)  { this._onBegin  = fn; }
  onReplay(fn) { this._onReplay = fn; }

  // Show the intro overlay
  show() {
    if (this._overlay) {
      this._overlay.classList.remove('intro-overlay--hidden');
      this._overlay.removeAttribute('aria-hidden');
      this._overlay.removeAttribute('inert');
    }
  }

  // Hide the intro overlay (called at the end of transition)
  hide() {
    if (this._overlay) {
      this._overlay.classList.add('intro-overlay--hidden');
      this._overlay.setAttribute('aria-hidden', 'true');
      // inert prevents the overlay's children (header with pointer-events:auto)
      // from intercepting clicks on elements behind the invisible overlay.
      this._overlay.setAttribute('inert', '');
    }
  }

  // Show the "Replay Introduction" button inside the simulation
  showReplayButton() {
    if (this._replayBtn) {
      this._replayBtn.style.display = '';
    }
  }

  // Update all dialogue content for a given scene descriptor.
  // scene: { title, description, allowBack, isLast }
  // stepIndex and totalSteps drive the progress dots.
  update(scene, stepIndex, totalSteps) {
    if (this._title) this._title.textContent = scene.title ?? '';
    if (this._desc)  this._desc.textContent  = scene.description ?? '';

    this._updateProgress(stepIndex, totalSteps);

    // Navigation buttons
    const isLast = scene.isLast ?? stepIndex === totalSteps - 1;

    if (this._backBtn) {
      this._backBtn.disabled = !(scene.allowBack ?? stepIndex > 0);
      this._backBtn.style.visibility = stepIndex === 0 ? 'hidden' : 'visible';
    }

    if (this._nextBtn)  this._nextBtn.style.display  = isLast ? 'none' : '';
    if (this._beginBtn) this._beginBtn.style.display = isLast ? '' : 'none';
  }

  _updateProgress(stepIndex, totalSteps) {
    if (!this._progress) return;
    this._progress.innerHTML = '';
    for (let i = 0; i < totalSteps; i++) {
      const dot = document.createElement('span');
      dot.className = 'intro-dot';
      if (i < stepIndex)  dot.classList.add('intro-dot--done');
      if (i === stepIndex) dot.classList.add('intro-dot--current');
      dot.setAttribute('aria-label', `Scene ${i + 1} of ${totalSteps}${i === stepIndex ? ' (current)' : ''}`);
      this._progress.appendChild(dot);
    }
  }
}
