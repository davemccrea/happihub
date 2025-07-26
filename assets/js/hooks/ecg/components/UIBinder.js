import { action, autorun } from "mobx";

class UIBinder {
  constructor(el, store, targetComponent, renderer) {
    this.el = el;
    this.store = store;
    this.targetComponent = targetComponent;
    this.renderer = renderer;
    this.eventListeners = [];
  }

  setupAllListeners() {
    this.setupResizeListener();
    this.setupThemeListener();
    this.setupKeyboardListeners();
    this.setupFullscreenListeners();
    this.setupBasicSelectors();
    this.setupCheckboxes();
    this.setupScaleSliders();
    this.setupActionButtons();
    this.syncFormElementsWithState();
    this.setupReactiveDOMUpdates();
  }

  setupResizeListener() {
    const handler = () => {
      this.store.updateDimensionsFromDOM();
    };
    window.addEventListener("resize", handler);
    this.eventListeners.push({ target: window, type: "resize", handler });
  }

  setupThemeListener() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          this.store.handleThemeChange();
        }
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    this.themeObserver = observer;
  }

  setupKeyboardListeners() {
    const handler = (event) => {
      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA" ||
        event.target.isContentEditable
      )
        return;
      switch (event.key) {
        case "j":
        case "ArrowDown":
          event.preventDefault();
          this.store.switchToNextLead();
          break;
        case "k":
        case "ArrowUp":
          event.preventDefault();
          this.store.switchToPrevLead();
          break;
        case " ":
          event.preventDefault();
          this.store.togglePlayback();
          break;
        case "f":
          event.preventDefault();
          this.toggleFullscreen();
          break;
        case "c":
          event.preventDefault();
          this.store.toggleCalipers();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    this.eventListeners.push({ target: document, type: "keydown", handler });
  }

  setupFullscreenListeners() {
    const handler = () => this.handleFullscreenChange();
    document.addEventListener("fullscreenchange", handler);
    this.eventListeners.push({
      target: document,
      type: "fullscreenchange",
      handler,
    });
  }

  updatePlayPauseButton() {
    const button = document.getElementById("play-pause-button");
    if (button) {
      const iconClass = this.store.isPlaying ? "hero-pause" : "hero-play";
      const buttonText = this.store.isPlaying ? "Pause" : "Play";
      button.innerHTML = `<svg class="w-4 h-4 ${iconClass}" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="${this.store.isPlaying ? "M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" : "M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"}" clip-rule="evenodd" /></svg><span class="ml-1">${buttonText}</span>`;
    }
  }

  setupActionButtons() {
    this.setupElementListener("play-pause-button", "click", () =>
      this.store.togglePlayback(),
    );
    this.setupElementListener("calipers-button", "click", () =>
      this.store.toggleCalipers(),
    );
    this.setupElementListener("fullscreen-button", "click", () =>
      this.toggleFullscreen(),
    );
  }

  handleFullscreenChange() {
    const isCurrentlyFullscreen = !!document.fullscreenElement;
    if (isCurrentlyFullscreen !== this.store.isFullscreen) {
      action(() => {
        this.store.isFullscreen = isCurrentlyFullscreen;
      })();
    }
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.getElementById("ecg-player-container").requestFullscreen();
  }

  updateFullscreenButton() {
    const button = document.getElementById("fullscreen-button");
    if (button) {
      const iconClass = this.store.isFullscreen
        ? "hero-arrows-pointing-in"
        : "hero-arrows-pointing-out";
      const tooltip = this.store.isFullscreen
        ? "Exit Fullscreen (f)"
        : "Enter Fullscreen (f)";
      button.innerHTML = `<svg class="w-5 h-5 ${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${this.store.isFullscreen ? "M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" : "M4 8V4m0 0h4M4 4l4 4m12-4v4m0-4h-4m4 0l-4 4M4 16v4m0 0h4m-4 0l4-4m12 4v-4m0 4h-4m4 0l-4-4"}" /></svg>`;
      button.title = tooltip;
    }
  }

  updateCalipersButton() {
    const button = document.getElementById("calipers-button");
    if (button) {
      button.classList.toggle("btn-active", this.store.calipersMode);
      button.title = this.store.calipersMode
        ? "Disable Time Calipers (c)"
        : "Enable Time Calipers (c)";
    }
  }

  setupElementListener(elementId, eventType, handler) {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener(eventType, handler);
      this.eventListeners.push({ target: element, type: eventType, handler });
    }
  }

  setupBasicSelectors() {
    this.setupElementListener("lead-selector", "change", (e) =>
      this.store.switchLead(parseInt(e.target.value)),
    );
    this.setupElementListener("display-mode-selector", "change", (e) =>
      this.store.setDisplayMode(e.target.value),
    );
    this.setupElementListener("grid-type-selector", "change", (e) =>
      this.store.setGridType(e.target.value),
    );
  }

  setupCheckboxes() {
    this.setupElementListener("loop-checkbox", "change", (e) =>
      this.store.setLoop(e.target.checked),
    );
    this.setupElementListener("qrs-indicator-checkbox", "change", (e) =>
      this.store.setQrsIndicator(e.target.checked),
    );
  }

  setupScaleSliders() {
    this.setupElementListener("grid-scale-slider", "input", (e) =>
      this.store.setGridScale(parseFloat(e.target.value)),
    );
    this.setupElementListener("amplitude-scale-slider", "input", (e) =>
      this.store.setAmplitudeScale(parseFloat(e.target.value)),
    );
    this.setupElementListener("height-scale-slider", "input", (e) =>
      this.store.setHeightScale(parseFloat(e.target.value)),
    );
  }

  syncFormElementsWithState() {
    // This is now handled by autorun reactions
  }

  updateLeadSelectorVisibility(displayMode) {
    const leadSelectorContainer = document.getElementById(
      "lead-selector-container",
    );
    if (leadSelectorContainer) {
      leadSelectorContainer.style.display =
        displayMode === "multi" ? "none" : "block";
    }
  }

  setupReactiveDOMUpdates() {
    this.disposers = this.disposers || [];
    const disposers = [
      autorun(() => this.updatePlayPauseButton()),
      autorun(() => this.updateFullscreenButton()),
      autorun(() => this.updateCalipersButton()),
      autorun(() => {
        const leadSelector = document.getElementById("lead-selector");
        if (leadSelector && this.store.hasValidLead)
          leadSelector.value = this.store.currentLead.toString();
      }),
      autorun(() => {
        const displayModeSelector = document.getElementById(
          "display-mode-selector",
        );
        if (displayModeSelector)
          displayModeSelector.value = this.store.displayMode;
      }),
      autorun(() => {
        const gridTypeSelector = document.getElementById("grid-type-selector");
        if (gridTypeSelector) gridTypeSelector.value = this.store.gridType;
      }),
      autorun(() => this.updateLeadSelectorVisibility(this.store.displayMode)),
      autorun(() => this.updateGridScaleDisplay()),
      autorun(() => this.updateAmplitudeScaleDisplay()),
      autorun(() => this.updateHeightScaleDisplay()),
    ];
    this.disposers.push(...disposers);
  }

  updateGridScaleDisplay() {
    const gridScaleValue = document.getElementById("grid-scale-value");
    if (gridScaleValue)
      gridScaleValue.textContent = `${this.store.gridScale.toFixed(2)}x`;
    const gridScaleSpeed = document.getElementById("grid-scale-speed");
    if (gridScaleSpeed)
      gridScaleSpeed.textContent = `${(25 * this.store.gridScale).toFixed(1)} mm/s`;
  }

  updateAmplitudeScaleDisplay() {
    const amplitudeScaleValue = document.getElementById(
      "amplitude-scale-value",
    );
    if (amplitudeScaleValue)
      amplitudeScaleValue.textContent = `${this.store.amplitudeScale.toFixed(2)}x`;
    const amplitudeScaleGain = document.getElementById("amplitude-scale-gain");
    if (amplitudeScaleGain)
      amplitudeScaleGain.textContent = `${(10 * this.store.amplitudeScale).toFixed(1)} mm/mV`;
  }

  updateHeightScaleDisplay() {
    const heightScaleValue = document.getElementById("height-scale-value");
    if (heightScaleValue)
      heightScaleValue.textContent = `${this.store.heightScale.toFixed(2)}x`;
    const heightScalePixels = document.getElementById("height-scale-pixels");
    if (heightScalePixels)
      heightScalePixels.textContent = `${Math.round(150 * this.store.heightScale)}px`;
  }

  cleanup() {
    this.eventListeners.forEach(({ target, type, handler }) =>
      target.removeEventListener(type, handler),
    );
    if (this.themeObserver) this.themeObserver.disconnect();
    if (this.disposers) this.disposers.forEach((dispose) => dispose());
  }
}

export default UIBinder;
