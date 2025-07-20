
import { action } from "mobx";

class UIBinder {
  constructor(el, store, targetComponent) {
    this.el = el;
    this.store = store;
    this.targetComponent = targetComponent;
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
  }

  setupResizeListener() {
    const handler = () => {
      this.store.calculateMedicallyAccurateDimensions();
      this.store.recreateCanvasAndRestart();
    };
    window.addEventListener("resize", handler);
    this.eventListeners.push({ target: window, type: "resize", handler });
  }

  setupThemeListener() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
          this.store.handleThemeChange();
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    this.themeObserver = observer;
  }

  setupKeyboardListeners() {
    const handler = (event) => {
      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.isContentEditable) {
        return;
      }

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
    const handler = () => {
      this.handleFullscreenChange();
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    document.addEventListener("mozfullscreenchange", handler);
    document.addEventListener("MSFullscreenChange", handler);
    this.eventListeners.push({ target: document, type: "fullscreenchange", handler });
    this.eventListeners.push({ target: document, type: "webkitfullscreenchange", handler });
    this.eventListeners.push({ target: document, type: "mozfullscreenchange", handler });
    this.eventListeners.push({ target: document, type: "MSFullscreenChange", handler });
  }

  updatePlayPauseButton() {
    const button = document.getElementById("play-pause-button");
    if (button) {
      const iconClass = this.store.isPlaying ? "hero-pause" : "hero-play";
      const buttonText = this.store.isPlaying ? "Pause" : "Play";
      button.innerHTML = `<svg class="w-4 h-4 ${iconClass}" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="${this.store.isPlaying ? "M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" : "M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"} " clip-rule="evenodd" /></svg><span class="ml-1">${buttonText}</span>`;
    }
  }

  setupActionButtons() {
    this.setupElementListener("play-pause-button", "click", () => {
      this.store.togglePlayback();
      this.updatePlayPauseButton();
    });

    this.setupElementListener("calipers-button", "click", () => {
      this.store.toggleCalipers();
    });

    this.setupElementListener("fullscreen-button", "click", () => {
      this.toggleFullscreen();
    });
  }

  handleFullscreenChange() {
    const isCurrentlyFullscreen = this.isDocumentInFullscreen();
    if (isCurrentlyFullscreen !== this.store.isFullscreen) {
      action(() => {
        this.store.isFullscreen = isCurrentlyFullscreen;
      })();
      this.updateFullscreenStyles(this.store.isFullscreen);
      this.updateFullscreenButton();
      this.store.recreateCanvasAndRestart();
    }
  }

  isDocumentInFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  }

  toggleFullscreen() {
    if (this.isDocumentInFullscreen()) {
      this.exitFullscreen();
    } else {
      this.requestFullscreen();
    }
  }

  requestFullscreen() {
    const element = document.getElementById("ecg-player-container");
    if (element.requestFullscreen) element.requestFullscreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
    else if (element.msRequestFullscreen) element.msRequestFullscreen();
  }

  exitFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }

  updateFullscreenStyles(isFullscreen) {
    // Add styles to the container when in fullscreen
  }

  updateFullscreenButton() {
    const button = document.getElementById("fullscreen-button");
    if (button) {
      const iconClass = this.store.isFullscreen ? "hero-arrows-pointing-in" : "hero-arrows-pointing-out";
      const tooltip = this.store.isFullscreen ? "Exit Fullscreen (f)" : "Enter Fullscreen (f)";
      button.innerHTML = `<svg class="w-5 h-5 ${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${this.store.isFullscreen ? "M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" : "M4 8V4m0 0h4M4 4l4 4m12-4v4m0-4h-4m4 0l-4 4M4 16v4m0 0h4m-4 0l4-4m12 4v-4m0 4h-4m4 0l-4-4"}" /></svg>`;
      button.title = tooltip;
    }
  }

  setupElementListener(elementId, eventType, handler, initializer = null) {
    const element = document.getElementById(elementId);
    if (element && !element.dataset.listenerAdded) {
      if (initializer) initializer(element);
      element.addEventListener(eventType, handler);
      element.dataset.listenerAdded = "true";
      this.eventListeners.push({ target: element, type: eventType, handler });
    }
  }

  setupBasicSelectors() {
    this.setupElementListener("lead-selector", "change", (e) => {
      const leadIndex = parseInt(e.target.value);
      this.store.switchLead(leadIndex);
    });

    this.setupElementListener("display-mode-selector", "change", (e) => {
      const value = e.target.value;
      this.store.setDisplayMode(value);
    });

    this.setupElementListener("grid-type-selector", "change", (e) => {
      const value = e.target.value;
      this.store.setGridType(value);
    });
  }

  setupCheckboxes() {
    this.setupElementListener("loop-checkbox", "change", (e) => {
      this.store.setLoop(e.target.checked);
    }, (element) => { element.checked = this.store.loopEnabled; });

    this.setupElementListener("qrs-indicator-checkbox", "change", (e) => {
      this.store.setQrsIndicator(e.target.checked);
    }, (element) => { element.checked = this.store.qrsIndicatorEnabled; });
  }

  setupScaleSliders() {
    this.setupElementListener("grid-scale-slider", "input", (e) => {
      this.store.setGridScale(parseFloat(e.target.value));
      this.updateGridScaleDisplay();
    }, (element) => {
      element.value = this.store.gridScale.toString();
      this.updateGridScaleDisplay();
    });

    this.setupElementListener("amplitude-scale-slider", "input", (e) => {
      this.store.setAmplitudeScale(parseFloat(e.target.value));
      this.updateAmplitudeScaleDisplay();
    }, (element) => {
      element.value = this.store.amplitudeScale.toString();
      this.updateAmplitudeScaleDisplay();
    });

    this.setupElementListener("height-scale-slider", "input", (e) => {
      this.store.setHeightScale(parseFloat(e.target.value));
      this.updateHeightScaleDisplay();
    }, (element) => {
      element.value = this.store.heightScale.toString();
      this.updateHeightScaleDisplay();
    });
  }

  syncFormElementsWithState() {
    const leadSelector = document.getElementById("lead-selector");
    if (leadSelector) leadSelector.value = this.store.currentLead.toString();

    const displayModeSelector = document.getElementById("display-mode-selector");
    if (displayModeSelector) displayModeSelector.value = this.store.displayMode;

    const gridTypeSelector = document.getElementById("grid-type-selector");
    if (gridTypeSelector) gridTypeSelector.value = this.store.gridType;

    const loopCheckbox = document.getElementById("loop-checkbox");
    if (loopCheckbox) loopCheckbox.checked = this.store.loopEnabled;

    const qrsCheckbox = document.getElementById("qrs-indicator-checkbox");
    if (qrsCheckbox) qrsCheckbox.checked = this.store.qrsIndicatorEnabled;

    this.updateGridScaleDisplay();
    this.updateAmplitudeScaleDisplay();
    this.updateHeightScaleDisplay();
  }

  updateGridScaleDisplay() {
    const gridScaleValue = document.getElementById("grid-scale-value");
    const gridScaleSpeed = document.getElementById("grid-scale-speed");
    if (gridScaleValue) gridScaleValue.textContent = `${this.store.gridScale.toFixed(2)}x`;
    if (gridScaleSpeed) {
      const actualSpeed = (25 * this.store.gridScale).toFixed(1);
      gridScaleSpeed.textContent = `${actualSpeed} mm/s`;
    }
  }

  updateAmplitudeScaleDisplay() {
    const amplitudeScaleValue = document.getElementById("amplitude-scale-value");
    const amplitudeScaleGain = document.getElementById("amplitude-scale-gain");
    if (amplitudeScaleValue) amplitudeScaleValue.textContent = `${this.store.amplitudeScale.toFixed(2)}x`;
    if (amplitudeScaleGain) {
      const actualGain = (10 * this.store.amplitudeScale).toFixed(1);
      amplitudeScaleGain.textContent = `${actualGain} mm/mV`;
    }
  }

  updateHeightScaleDisplay() {
    const heightScaleValue = document.getElementById("height-scale-value");
    const heightScalePixels = document.getElementById("height-scale-pixels");
    if (heightScaleValue) heightScaleValue.textContent = `${this.store.heightScale.toFixed(2)}x`;
    if (heightScalePixels) {
      const actualHeight = Math.round(150 * this.store.heightScale);
      heightScalePixels.textContent = `${actualHeight}px`;
    }
  }

  cleanup() {
    this.eventListeners.forEach(({ target, type, handler }) => {
      target.removeEventListener(type, handler);
    });
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  }
}

export default UIBinder;
