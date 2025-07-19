// ==================
// RENDERING CONSTANTS
// ==================
const MM_PER_SECOND = 25;
const MM_PER_MILLIVOLT = 10;
const PIXELS_PER_MM = 6;
const HEIGHT_MILLIVOLTS = 2.5;
const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM;
const WAVEFORM_LINE_WIDTH = 1.3;
const DOT_RADIUS = 1.2;

// ===============
// LAYOUT CONSTANTS
// ===============
const DEFAULT_WIDTH_SECONDS = 2.5;
const CONTAINER_PADDING = 0;
const COLUMNS_PER_DISPLAY = 4;
const ROWS_PER_DISPLAY = 3;
const COLUMN_PADDING = 0;
const ROW_PADDING = 0;

// ===================
// ANIMATION CONSTANTS
// ===================
const SINGLE_LEAD_CURSOR_WIDTH = 20;
const MULTI_LEAD_CURSOR_WIDTH = 8;

// Multi-lead display constants
const MULTI_LEAD_HEIGHT_SCALE = 0.8; // Reduces individual lead height in multi-lead view
const QRS_FLASH_DURATION_MS = 100; // Duration of QRS indicator flash in milliseconds
const SEGMENT_DURATION_SECONDS = 0.1; // Pre-computed data segment size for performance

const ECGPlayer = {
  // ==========================
  // INITIALIZATION & LIFECYCLE
  // ==========================

  mounted() { // ✅
    this.initializeState();
    this.calculateMedicallyAccurateDimensions();
    this.updateThemeColors();
    this.setupEventListeners();
    this.initializeECGChart();

    // Get the target for push events (component ID)
    this.targetComponent = this.el.getAttribute("phx-target");
  },

  setupEventListeners() { // ✅
    this.setupResizeListener();
    this.setupThemeListener();
    this.setupKeyboardListeners();
    this.setupLiveViewListeners();
    this.setupFullscreenListeners();
  },

  /**
   * Sets up the window resize event listener.
   * @returns {void}
   */
  setupResizeListener() {
    this.resizeHandler = () => {
      this.calculateMedicallyAccurateDimensions();
      this.recreateCanvasAndRestart();
    };
    window.addEventListener("resize", this.resizeHandler);
  },

  /**
   * Sets up the theme change observer using MutationObserver.
   * @returns {void}
   */
  setupThemeListener() {
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          this.handleThemeChange();
        }
      });
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  },

  /**
   * Handles theme changes by updating colors and re-rendering.
   * @returns {void}
   */
  handleThemeChange() {
    this.updateThemeColors();
    this.renderGridBackground();
    this.clearWaveform();
    if (!this.isPlaying && this.startTime && this.pausedTime) {
      const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
      const cursorProgress =
        (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
      this.processAnimationFrame(cursorProgress, animationCycle);
    }
  },

  /**
   * Sets up keyboard event listeners for playback controls and lead switching.
   * @returns {void}
   */
  setupKeyboardListeners() {
    this.keydownHandler = (event) => {
      // Only handle shortcuts if not typing in an input field
      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA" ||
        event.target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case "j":
        case "ArrowDown":
          event.preventDefault();
          this.switchToNextLead();
          break;
        case "k":
        case "ArrowUp":
          event.preventDefault();
          this.switchToPrevLead();
          break;
        case " ":
          event.preventDefault();
          this.togglePlayback();
          break;
        case "f":
          event.preventDefault();
          this.toggleFullscreen();
          break;
        case "c":
          event.preventDefault();
          this.toggleCalipers();
          break;
      }
    };

    // Add global keyboard listener
    document.addEventListener("keydown", this.keydownHandler);
  },

  /**
   * Sets up LiveView event listeners for ECG data loading.
   * @returns {void}
   */
  setupLiveViewListeners() { // ✅
    this.handleEvent("load_ecg_data", (payload) => {
      this.handleECGDataLoaded(payload);
    });
  },

  /**
   * Phoenix LiveView hook lifecycle method called when the component is destroyed.
   * @returns {void}
   */
  destroyed() { // ✅
    this.cleanup();
  },

  /**
   * Performs cleanup of resources, event listeners, and memory references.
   * @returns {void}
   */
  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.qrsFlashTimeout) {
      clearTimeout(this.qrsFlashTimeout);
    }
    this.cleanupCanvases();
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
    }
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler);
    }
    if (this.canvasClickHandler && this.backgroundCanvas) {
      this.backgroundCanvas.removeEventListener(
        "click",
        this.canvasClickHandler
      );
    }
    if (this.fullscreenChangeHandler) {
      document.removeEventListener(
        "fullscreenchange",
        this.fullscreenChangeHandler
      );
      document.removeEventListener(
        "webkitfullscreenchange",
        this.fullscreenChangeHandler
      );
      document.removeEventListener(
        "mozfullscreenchange",
        this.fullscreenChangeHandler
      );
      document.removeEventListener(
        "MSFullscreenChange",
        this.fullscreenChangeHandler
      );
    }

    // Explicitly nullify large data objects to break references
    this.ecgLeadDatasets = null;
    this.precomputedSegments = null;
    this.dataIndexCache = null;
    this.currentLeadData = null;
    this.allLeadsCursorData = null;
    this.activeCursorData = null;
    this.eventHandlers = null;
    this.calipers = null;
    this.activeCaliper = null;
  },

  // =================
  // STATE MANAGEMENT
  // =================

  initializeState() {
    this.initializeFormValues();

    this.isPlaying = false;
    this.activeSegments = [];
    this.startTime = null;
    this.pausedTime = 0;
    this.animationCycle = 0;
    this.animationId = null;
    this.cursorPosition = 0;
    this.cursorWidth = SINGLE_LEAD_CURSOR_WIDTH;
    this.activeCursorData = null;
    this.allLeadsCursorData = null;
    this.leadHeight = CHART_HEIGHT * this.heightScale;

    // QRS flash indicator
    this.qrsFlashActive = false;
    this.qrsFlashTimeout = null;
    this.qrsFlashDuration = QRS_FLASH_DURATION_MS;

    // Pre-computed data segments for performance
    this.precomputedSegments = new Map();
    this.segmentDuration = SEGMENT_DURATION_SECONDS;
    this.dataIndexCache = new Map();

    // Canvas layers for optimized rendering
    this.backgroundCanvas = null;
    this.backgroundContext = null;
    this.waveformCanvas = null;
    this.waveformContext = null;
    this.qrsFlashCanvas = null;
    this.qrsFlashContext = null;
    this.calipersCanvas = null;
    this.calipersContext = null;

    // Calipers state
    this.calipersMode = false;
    this.calipers = [];
    this.activeCaliper = null;
    this.calipersType = 'time';
    this.isDragging = false;
    this.dragStartPoint = null;
    this.calipersClickHandler = null;
    this.calipersMouseMoveHandler = null;
    this.calipersMouseUpHandler = null;

    // Fullscreen state
    this.isFullscreen = false;
    this.fullscreenChangeHandler = null;
  },

  // ========================
  // DATA LOADING & SETUP
  // ========================

  /**
   * Orchestrates the initial setup process: calculates dimensions,
   * creates canvases, and renders the initial view.
   * ECG data will be loaded separately when pushed from the server.
   * @returns {void}
   */
  initializeECGChart() {
    if (!this.widthSeconds) {
      this.calculateMedicallyAccurateDimensions();
    }
    this.recreateCanvas();
    this.renderGridBackground();
  },

  /**
   * Handles ECG data loaded from the server.
   * Processes the data and stores it in memory.
   * @param {object} payload - The ECG data payload from the server.
   * @returns {void}
   */
  handleECGDataLoaded(payload) { // ✅
    try {
      const data = payload.data;

      if (!data.fs || !data.sig_name || !data.p_signal) {
        console.error("Invalid ECG data format:", data);
        return;
      }

      // Reset playback state when loading new ECG data
      this.stopAnimation();

      this.resetPlayback();

      this.samplingRate = data.fs;
      this.leadNames = data.sig_name;
      this.totalDuration = data.p_signal.length / data.fs;

      // Store QRS data for logging
      this.qrsIndexes = data.qrs || [];
      this.qrsTimestamps = this.qrsIndexes.map(
        (index) => index / this.samplingRate
      );
      this.lastQrsIndex = -1;
      this.qrsDetectedCount = 0;

      this.ecgLeadDatasets = [];

      let globalMin = Infinity;
      let globalMax = -Infinity;

      for (let leadIndex = 0; leadIndex < this.leadNames.length; leadIndex++) {
        const times = [];
        const values = [];

        for (
          let sampleIndex = 0;
          sampleIndex < data.p_signal.length;
          sampleIndex++
        ) {
          const time = sampleIndex / this.samplingRate;
          const value = data.p_signal[sampleIndex][leadIndex];

          times.push(time);
          values.push(value);

          if (value < globalMin) globalMin = value;
          if (value > globalMax) globalMax = value;
        }

        this.ecgLeadDatasets.push({ times, values });
      }

      this.yMin = -HEIGHT_MILLIVOLTS / 2;
      this.yMax = HEIGHT_MILLIVOLTS / 2;
      this.currentLeadData = this.ecgLeadDatasets[this.currentLead];

      // Pre-compute data segments for all leads
      this.precomputeDataSegments();

      // Re-render the grid background with the new data
      this.renderGridBackground();

      // Clear any existing waveform
      this.clearWaveform();

      // Setup and update button state (button now exists in DOM)
      this.setupPlayPauseButton();
      this.updatePlayPauseButton();

      // Setup selectors (they now exist in DOM)
      this.setupSelectors();

      // Set initial lead selector visibility
      this.updateLeadSelectorVisibility(this.displayMode);

      // Setup fullscreen button
      this.setupFullscreenButton();
      
      // Setup calipers button
      this.setupCalipersButton();

      console.log("ECG data loaded successfully:", {
        samplingRate: this.samplingRate,
        leadNames: this.leadNames,
        totalDuration: this.totalDuration,
        leadCount: this.ecgLeadDatasets.length,
        qrsCount: this.qrsIndexes.length,
      });
    } catch (error) {
      console.error("Error processing ECG data:", error);
    }
  },

  /**
   * Initializes all form-controlled values with proper defaults
   * @returns {void}
   */
  initializeFormValues() {
    // Display and playback settings
    this.gridType = this.readFormValue("grid_type") || "telemetry";
    this.displayMode = this.readFormValue("display_mode") || "single";
    this.currentLead = parseInt(this.readFormValue("current_lead") || "0");

    // Playback options
    this.loopEnabled = this.readFormCheckbox("loop_playback");
    this.qrsIndicatorEnabled = this.readFormCheckbox("qrs_indicator");

    // Scale settings
    this.gridScale = parseFloat(this.readFormValue("grid_scale") || "1.0");
    this.amplitudeScale = parseFloat(
      this.readFormValue("amplitude_scale") || "1.0"
    );
    this.heightScale = parseFloat(this.readFormValue("height_scale") || "1.2");

    // Update cursor width based on display mode
    this.cursorWidth =
      this.displayMode === "single"
        ? SINGLE_LEAD_CURSOR_WIDTH
        : MULTI_LEAD_CURSOR_WIDTH;
  },

  // ===================
  // SCALE & UI CONTROLS
  // ===================

  /**
   * Handles grid scale changes by updating dimensions and re-rendering.
   * @returns {void}
   */
  handleGridScaleChange() {
    this.withCanvasStatePreservation(() => {
      this.calculateMedicallyAccurateDimensions();
      this.recreateCanvas();
      this.renderGridBackground();
      this.clearWaveform();
    });
  },

  /**
   * Handles amplitude scale changes by clearing and re-rendering the waveform.
   * @returns {void}
   */
  handleAmplitudeScaleChange() {
    this.withCanvasStatePreservation(() => {
      this.clearWaveform();
    });
  },

  /**
   * Handles height scale changes by recreating canvas and re-rendering.
   * @returns {void}
   */
  handleHeightScaleChange() {
    this.withCanvasStatePreservation(() => {
      this.recreateCanvas();
      this.renderGridBackground();
      this.clearWaveform();
    });
  },

  /**
   * Updates the grid scale display elements with current values.
   * @returns {void}
   */
  updateGridScaleDisplay() {
    const gridScaleValue = document.getElementById("grid-scale-value");
    const gridScaleSpeed = document.getElementById("grid-scale-speed");

    if (gridScaleValue) {
      gridScaleValue.textContent = `${this.gridScale.toFixed(2)}x`;
    }

    if (gridScaleSpeed) {
      const actualSpeed = (MM_PER_SECOND * this.gridScale).toFixed(1);
      gridScaleSpeed.textContent = `${actualSpeed} mm/s`;
    }
  },

  /**
   * Updates the amplitude scale display elements with current values.
   * @returns {void}
   */
  updateAmplitudeScaleDisplay() {
    const amplitudeScaleValue = document.getElementById(
      "amplitude-scale-value"
    );
    const amplitudeScaleGain = document.getElementById("amplitude-scale-gain");

    if (amplitudeScaleValue) {
      amplitudeScaleValue.textContent = `${this.amplitudeScale.toFixed(2)}x`;
    }

    if (amplitudeScaleGain) {
      const actualGain = (MM_PER_MILLIVOLT * this.amplitudeScale).toFixed(1);
      amplitudeScaleGain.textContent = `${actualGain} mm/mV`;
    }
  },

  /**
   * Updates the height scale display elements with current values.
   * @returns {void}
   */
  updateHeightScaleDisplay() {
    const heightScaleValue = document.getElementById("height-scale-value");
    const heightScalePixels = document.getElementById("height-scale-pixels");

    if (heightScaleValue) {
      heightScaleValue.textContent = `${this.heightScale.toFixed(2)}x`;
    }

    if (heightScalePixels) {
      const actualHeight = Math.round(CHART_HEIGHT * this.heightScale);
      heightScalePixels.textContent = `${actualHeight}px`;
    }
  },

  // ============================
  // DISPLAY MODE & LEAD SWITCHING
  // ============================

  /**
   * Updates the cursor style based on the current display mode.
   * @returns {void}
   */
  updateCursorStyle() {
    if (this.backgroundCanvas) {
      if (this.calipersMode) {
        // Caliper mode: show crosshair cursor
        this.backgroundCanvas.style.cursor = "crosshair";
      } else if (this.displayMode === "single") {
        // Single lead mode: show zoom-out cursor (click to show all leads)
        this.backgroundCanvas.style.cursor = "zoom-out";
      } else {
        // Multi lead mode: show zoom-in cursor (click to zoom into a specific lead)
        this.backgroundCanvas.style.cursor = "zoom-in";
      }
    }
  },

  /**
   * Sets up click event handler for canvas to allow lead selection in multi-lead mode.
   * @returns {void}
   */
  setupCanvasClickHandler() {
    if (this.canvasClickHandler) {
      this.backgroundCanvas.removeEventListener(
        "click",
        this.canvasClickHandler
      );
    }

    this.canvasClickHandler = (event) => {
      const rect = this.backgroundCanvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (this.displayMode === "multi") {
        const clickedLeadIndex = this.getLeadIndexFromClick(x, y);
        if (clickedLeadIndex !== null) {
          // Clear calipers when switching to single lead mode
          this.clearCalipers();
          this.displayMode = "single";
          this.updateDisplayModeSelector("single");
          this.switchLead(clickedLeadIndex);
          this.updateLeadSelectorVisibility("single");
          this.recreateCanvasAndRestart();
          this.updateCursorStyle();
        }
      } else if (this.displayMode === "single") {
        // In single lead mode, any click on the grid switches to multi-lead mode
        this.clearCalipers();
        this.displayMode = "multi";
        this.updateDisplayModeSelector("multi");
        this.updateLeadSelectorVisibility("multi");
        this.recreateCanvasAndRestart();
        this.updateCursorStyle();
      }
    };

    this.backgroundCanvas.addEventListener("click", this.canvasClickHandler);
  },

  /**
   * Determines which lead was clicked based on click coordinates.
   * @param {number} x - The x coordinate of the click.
   * @param {number} y - The y coordinate of the click.
   * @returns {number|null} The index of the clicked lead, or null if no lead was clicked.
   */
  getLeadIndexFromClick(x, y) {
    if (!this.leadNames || this.displayMode !== "multi") {
      return null;
    }

    for (let leadIndex = 0; leadIndex < this.leadNames.length; leadIndex++) {
      const { xOffset, yOffset, columnWidth } =
        this.calculateLeadGridCoordinates(leadIndex);

      // Check if click is within this lead's bounds
      if (
        x >= xOffset &&
        x <= xOffset + columnWidth &&
        y >= yOffset &&
        y <= yOffset + this.leadHeight
      ) {
        return leadIndex;
      }
    }

    return null;
  },

  /**
   * Switches from multi-lead mode to single-lead mode with the specified lead.
   * @param {number} leadIndex - The index of the lead to switch to.
   * @returns {void}
   */
  switchLead(leadIndex) {
    if (
      !this.ecgLeadDatasets ||
      leadIndex < 0 ||
      leadIndex >= this.ecgLeadDatasets.length
    ) {
      console.warn(`Invalid lead index: ${leadIndex}`);
      return;
    }

    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopAnimation();

    this.currentLead = leadIndex;
    this.currentLeadData = this.ecgLeadDatasets[leadIndex];

    // Clear any existing caliper measurements when changing leads
    this.clearCalipers();

    // Update the lead selector to match the current lead
    const leadSelector = /** @type {HTMLSelectElement} */ (
      document.getElementById("lead-selector")
    );
    if (leadSelector) {
      leadSelector.value = this.currentLead.toString();
    }

    if (this.displayMode === "single") {
      // Clear both canvases and re-render for new lead
      this.clearWaveform();
      this.renderGridBackground();
    }

    if (wasPlaying) {
      this.isPlaying = true;
      this.startAnimationLoop();
    } else {
      if (this.startTime && this.pausedTime) {
        const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
        const cursorProgress =
          (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
        const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
        this.processAnimationFrame(cursorProgress, animationCycle);
      } else {
        this.clearWaveform();
      }
    }
  },

  // =========================
  // LEAD POSITIONING & LAYOUT
  // =========================

  /**
   * Determines the grid column and row for a given lead index in multi-lead view.
   * @param {number} leadIndex - The index of the ECG lead.
   * @returns {{column: number, row: number}} The grid position.
   */
  getLeadColumnAndRow(leadIndex) {
    const leadPositions = [
      { column: 0, row: 0 },
      { column: 0, row: 1 },
      { column: 0, row: 2 },
      { column: 1, row: 0 },
      { column: 1, row: 1 },
      { column: 1, row: 2 },
      { column: 2, row: 0 },
      { column: 2, row: 1 },
      { column: 2, row: 2 },
      { column: 3, row: 0 },
      { column: 3, row: 1 },
      { column: 3, row: 2 },
    ];

    return leadPositions[leadIndex] || { column: 0, row: 0 };
  },

  /**
   * Calculates the pixel offset and width for a lead in the multi-lead display grid.
   * Uses a unified continuous grid approach where leads are positioned to align perfectly
   * with the underlying grid pattern, ensuring boundary areas are proper grid cell sizes.
   * @param {number} leadIndex - The index of the ECG lead.
   * @returns {{xOffset: number, yOffset: number, columnWidth: number}} The position and width for the lead.
   */
  calculateLeadGridCoordinates(leadIndex) {
    const { column, row } = this.getLeadColumnAndRow(leadIndex);
    
    // Use natural column width - don't artificially constrain to grid multiples
    // The grid will be drawn continuously and leads positioned to align with it
    const columnWidth = this.chartWidth / COLUMNS_PER_DISPLAY;

    // Position leads directly - grids touch with no padding
    const xOffset = column * columnWidth;
    const yOffset = row * this.leadHeight;

    return { xOffset, yOffset, columnWidth };
  },

  // =============================
  // THEME & VISUAL CONFIGURATION
  // =============================

  /**
   * Reads the current `data-theme` from the HTML element and updates the color palette
   * for the grid, waveform, and labels.
   * @returns {void}
   */
  updateThemeColors() { // ✅
    const theme =
      document.documentElement.getAttribute("data-theme") || "light";
    const isDark = theme === "dark";

    this.colors = {
      waveform: isDark ? "#ffffff" : "#000000",
      gridFine: isDark ? "#660000" : "#ff9999",
      gridBold: isDark ? "#990000" : "#ff6666",
      gridDots: isDark ? "#666666" : "#999999",
      labels: isDark ? "#ffffff" : "#333333",
    };
  },

  // ==================
  // FULLSCREEN SUPPORT
  // ==================

  /**
   * Sets up fullscreen change event listeners with cross-browser compatibility.
   * @returns {void}
   */
  setupFullscreenListeners() {
    this.fullscreenChangeHandler = () => {
      this.handleFullscreenChange();
    };

    document.addEventListener("fullscreenchange", this.fullscreenChangeHandler);
    document.addEventListener(
      "webkitfullscreenchange",
      this.fullscreenChangeHandler
    );
    document.addEventListener(
      "mozfullscreenchange",
      this.fullscreenChangeHandler
    );
    document.addEventListener(
      "MSFullscreenChange",
      this.fullscreenChangeHandler
    );
  },

  /**
   * Handles fullscreen state changes and updates the UI accordingly.
   * @returns {void}
   */
  handleFullscreenChange() {
    const isCurrentlyFullscreen = this.isDocumentInFullscreen();

    if (isCurrentlyFullscreen !== this.isFullscreen) {
      this.isFullscreen = isCurrentlyFullscreen;
      this.updateFullscreenStyles(this.isFullscreen);
      this.updateFullscreenButton();
      this.recreateCanvasAndRestart();
    }
  },

  /**
   * Checks if the document is currently in fullscreen mode.
   * @returns {boolean} True if in fullscreen mode, false otherwise.
   */
  isDocumentInFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  },

  /**
   * Toggles fullscreen mode on/off.
   * @returns {void}
   */
  toggleFullscreen() {
    if (this.isDocumentInFullscreen()) {
      this.exitFullscreen();
    } else {
      this.requestFullscreen();
    }
  },

  /**
   * Requests fullscreen mode for the ECG player container.
   * @returns {void}
   */
  requestFullscreen() {
    const element = document.getElementById("ecg-player-container");

    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  },

  /**
   * Exits fullscreen mode.
   * @returns {void}
   */
  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  },

  /**
   * Sets up the fullscreen button click handler.
   * @returns {void}
   */
  setupFullscreenButton() {
    const button = document.getElementById("fullscreen-button");
    if (button && !button.dataset.listenerAdded) {
      button.addEventListener("click", () => {
        this.toggleFullscreen();
      });
      button.dataset.listenerAdded = "true";
    }
  },

  /**
   * Updates the fullscreen button icon and tooltip based on current state.
   * @returns {void}
   */
  updateFullscreenButton() {
    const button = document.getElementById("fullscreen-button");
    if (button) {
      const iconClass = this.isFullscreen
        ? "hero-arrows-pointing-in"
        : "hero-arrows-pointing-out";
      const tooltip = this.isFullscreen
        ? "Exit Fullscreen (f)"
        : "Enter Fullscreen (f)";

      button.innerHTML = `<svg class="w-5 h-5 ${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        ${
          this.isFullscreen
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l4 4m12-4v4m0-4h-4m4 0l-4 4M4 16v4m0 0h4m-4 0l4-4m12 4v-4m0 4h-4m4 0l-4-4" />'
        }
      </svg>`;

      button.title = tooltip;
    }
  },

  // ===================
  // CALIPERS FUNCTIONALITY
  // ===================

  /**
   * Sets up the calipers button click handler.
   * @returns {void}
   */
  setupCalipersButton() {
    const button = document.getElementById("calipers-button");
    if (button && !button.dataset.listenerAdded) {
      button.addEventListener("click", () => {
        this.toggleCalipers();
      });
      button.dataset.listenerAdded = "true";
    }
  },

  /**
   * Toggles calipers mode on/off.
   * @returns {void}
   */
  toggleCalipers() {
    this.calipersMode = !this.calipersMode;
    this.updateCalipersButton();
    this.updateCalipersInteraction();
    
    if (!this.calipersMode) {
      this.clearCalipers();
      this.hideCalipersDisplay();
    } else {
      this.showCalipersDisplay();
    }
  },

  /**
   * Updates the calipers button visual state.
   * @returns {void}
   */
  updateCalipersButton() {
    const button = document.getElementById("calipers-button");
    if (button && button.classList) {
      if (this.calipersMode) {
        button.classList.add("btn-active");
        button.title = "Disable Time Calipers (c)";
      } else {
        button.classList.remove("btn-active");
        button.title = "Enable Time Calipers (c)";
      }
    }
  },

  /**
   * Updates the canvas pointer events for calipers interaction.
   * @returns {void}
   */
  updateCalipersInteraction() {
    if (this.calipersCanvas) {
      this.calipersCanvas.style.pointerEvents = this.calipersMode ? "auto" : "none";
      
      if (this.calipersMode) {
        this.calipersCanvas.style.cursor = "crosshair";
        this.setupCalipersEventListeners();
      } else {
        this.calipersCanvas.style.cursor = "default";
        this.removeCalipersEventListeners();
      }
    }
  },

  /**
   * Sets up mouse event listeners for caliper interaction.
   * @returns {void}
   */
  setupCalipersEventListeners() {
    if (!this.calipersCanvas) return;
    
    this.calipersClickHandler = (event) => {
      const rect = this.calipersCanvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // If no active caliper or previous one is complete, start new caliper
      if (!this.activeCaliper || this.activeCaliper.complete) {
        this.startCaliper(x, y);
      }
    };
    
    this.calipersMouseMoveHandler = (event) => {
      if (this.isDragging && this.activeCaliper) {
        const rect = this.calipersCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        this.updateCaliper(x, y);
      }
    };
    
    this.calipersMouseUpHandler = (event) => {
      if (this.isDragging) {
        this.finishCaliper();
      }
    };
    
    this.calipersCanvas.addEventListener("mousedown", this.calipersClickHandler);
    this.calipersCanvas.addEventListener("mousemove", this.calipersMouseMoveHandler);
    this.calipersCanvas.addEventListener("mouseup", this.calipersMouseUpHandler);
    
    // Also listen for mouse events on document to handle drag outside canvas
    document.addEventListener("mousemove", this.calipersMouseMoveHandler);
    document.addEventListener("mouseup", this.calipersMouseUpHandler);
  },

  /**
   * Removes mouse event listeners for caliper interaction.
   * @returns {void}
   */
  removeCalipersEventListeners() {
    if (this.calipersCanvas && this.calipersClickHandler) {
      this.calipersCanvas.removeEventListener("mousedown", this.calipersClickHandler);
      this.calipersCanvas.removeEventListener("mousemove", this.calipersMouseMoveHandler);
      this.calipersCanvas.removeEventListener("mouseup", this.calipersMouseUpHandler);
      
      // Remove document listeners too
      document.removeEventListener("mousemove", this.calipersMouseMoveHandler);
      document.removeEventListener("mouseup", this.calipersMouseUpHandler);
    }
  },

  /**
   * Starts creating a new caliper.
   * @param {number} x - The x coordinate of the starting point.
   * @param {number} y - The y coordinate of the starting point.
   * @returns {void}
   */
  startCaliper(x, y) {
    // Clear previous caliper only if there's a completed one
    if (this.activeCaliper && this.activeCaliper.complete) {
      this.clearCalipers();
    }
    
    // Set dragging state AFTER clearing (since clearCalipers sets isDragging = false)
    this.isDragging = true;
    this.dragStartPoint = { x, y };
    
    // Create new caliper starting at this position
    this.activeCaliper = {
      id: Date.now(),
      type: 'time',
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      complete: false
    };
    
    // Add to calipers array (or replace if clearing)
    this.calipers = [this.activeCaliper];
    this.renderCalipers();
  },

  /**
   * Updates the active caliper during dragging.
   * @param {number} x - The x coordinate of the current point.
   * @param {number} y - The y coordinate of the current point.
   * @returns {void}
   */
  updateCaliper(x, y) {
    if (this.activeCaliper) {
      this.activeCaliper.endX = x;
      this.activeCaliper.endY = y;
      this.renderCalipers();
      this.updateCalipersDisplay();
    }
  },

  /**
   * Finishes creating the active caliper.
   * @returns {void}
   */
  finishCaliper() {
    if (this.activeCaliper) {
      this.activeCaliper.complete = true;
      this.isDragging = false;
      this.dragStartPoint = null;
      this.updateCalipersDisplay();
      this.renderCalipers(); // Re-render to show green color
    }
  },

  /**
   * Clears all calipers from the canvas.
   * @returns {void}
   */
  clearCalipers() {
    this.calipers = [];
    this.activeCaliper = null;
    this.isDragging = false;
    this.dragStartPoint = null;
    this.calipersMode = false;
    
    if (this.calipersContext) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const canvasHeight = this.calipersCanvas.height / devicePixelRatio;
      this.calipersContext.clearRect(0, 0, this.chartWidth, canvasHeight);
    }
    
    // Update button state and cursor
    this.updateCalipersButton();
    this.updateCursorStyle();
  },

  /**
   * Shows the calipers measurement display.
   * @returns {void}
   */
  showCalipersDisplay() {
    // No UI display box - measurements only shown on canvas
  },

  /**
   * Hides the calipers measurement display.
   * @returns {void}
   */
  hideCalipersDisplay() {
    // No UI display box - measurements only shown on canvas
  },

  /**
   * Renders all calipers on the canvas.
   * @returns {void}
   */
  renderCalipers() {
    if (!this.calipersContext) return;
    
    // Clear the canvas
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.calipersCanvas.height / devicePixelRatio;
    this.calipersContext.clearRect(0, 0, this.chartWidth, canvasHeight);
    
    // Render each caliper
    this.calipers.forEach(caliper => {
      this.renderSingleCaliper(caliper);
    });
  },

  /**
   * Renders a single caliper on the canvas.
   * @param {object} caliper - The caliper object to render.
   * @returns {void}
   */
  renderSingleCaliper(caliper) {
    if (!this.calipersContext) return;
    
    const ctx = this.calipersContext;
    const { startX, startY, endX, endY, complete } = caliper;
    
    // Modern medical equipment colors: blue for active, green for complete
    const activeColor = "#4A90E2";   // Modern blue
    const completeColor = "#27AE60"; // Modern green
    const color = complete ? completeColor : activeColor;
    
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    
    // Draw professional caliper arms with perpendicular markers
    this.drawProfessionalCaliper(ctx, startX, startY, endX, endY, color);
    
    // Draw measurement text if complete
    if (complete) {
      this.drawMeasurementText(ctx, caliper);
    }
  },

  /**
   * Draws a professional ECG caliper with perpendicular markers.
   * @param {CanvasRenderingContext2D} ctx - The canvas context.
   * @param {number} startX - Starting x coordinate.
   * @param {number} startY - Starting y coordinate.
   * @param {number} endX - Ending x coordinate.
   * @param {number} endY - Ending y coordinate.
   * @param {string} color - The color to use.
   * @returns {void}
   */
  drawProfessionalCaliper(ctx, startX, startY, endX, endY, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    
    // Main measurement line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Draw perpendicular markers at both ends
    this.drawPerpendicularMarker(ctx, startX, startY, endX, endY, true);  // Start marker
    this.drawPerpendicularMarker(ctx, endX, endY, startX, startY, false); // End marker
    
    // Draw measurement indicators (small triangles)
    this.drawMeasurementIndicator(ctx, startX, startY, color);
    this.drawMeasurementIndicator(ctx, endX, endY, color);
  },

  /**
   * Draws a perpendicular marker at the specified point.
   * @param {CanvasRenderingContext2D} ctx - The canvas context.
   * @param {number} x - The x coordinate of the marker.
   * @param {number} y - The y coordinate of the marker.
   * @param {number} refX - Reference x coordinate for perpendicular calculation.
   * @param {number} refY - Reference y coordinate for perpendicular calculation.
   * @param {boolean} isStart - Whether this is the start marker.
   * @returns {void}
   */
  drawPerpendicularMarker(ctx, x, y, refX, refY, isStart) {
    const markerLength = 16;
    
    // Calculate perpendicular direction
    const dx = refX - x;
    const dy = refY - y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length > 0) {
      // Normalize and rotate 90 degrees
      const perpX = -dy / length;
      const perpY = dx / length;
      
      // Draw perpendicular line
      ctx.beginPath();
      ctx.moveTo(x + perpX * markerLength/2, y + perpY * markerLength/2);
      ctx.lineTo(x - perpX * markerLength/2, y - perpY * markerLength/2);
      ctx.stroke();
    } else {
      // Fallback for zero-length line
      ctx.beginPath();
      ctx.moveTo(x, y - markerLength/2);
      ctx.lineTo(x, y + markerLength/2);
      ctx.stroke();
    }
  },

  /**
   * Draws a small triangular measurement indicator.
   * @param {CanvasRenderingContext2D} ctx - The canvas context.
   * @param {number} x - The x coordinate.
   * @param {number} y - The y coordinate.
   * @param {string} color - The color to use.
   * @returns {void}
   */
  drawMeasurementIndicator(ctx, x, y, color) {
    const size = 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.lineTo(x + size, y + size);
    ctx.closePath();
    ctx.fill();
  },

  /**
   * Draws measurement text near the caliper.
   * @param {CanvasRenderingContext2D} ctx - The canvas context.
   * @param {object} caliper - The caliper object.
   * @returns {void}
   */
  drawMeasurementText(ctx, caliper) {
    const measurement = this.calculateTimeInterval(caliper.startX, caliper.endX);
    const midX = (caliper.startX + caliper.endX) / 2;
    const midY = (caliper.startY + caliper.endY) / 2;
    
    // Modern medical monitor style text
    ctx.font = "bold 11px monospace"; // Monospace font for medical precision
    ctx.textAlign = "center";
    
    // Create measurement box background
    const timeText = `${measurement.milliseconds.toFixed(0)}ms`;
    const bpmText = measurement.heartRate > 0 ? `${measurement.heartRate.toFixed(0)} BPM` : "";
    
    // Calculate text dimensions for background box
    const textMetrics = ctx.measureText(timeText);
    const boxWidth = Math.max(textMetrics.width, ctx.measureText(bpmText).width) + 12;
    const boxHeight = bpmText ? 30 : 18;
    
    // Position text above the caliper line
    const textY = midY - 30;
    
    // Draw modern semi-transparent background box
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(midX - boxWidth/2, textY - 14, boxWidth, boxHeight);
    
    // Draw subtle border around text box
    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(midX - boxWidth/2, textY - 14, boxWidth, boxHeight);
    
    // Draw the measurement text in modern dark color
    ctx.fillStyle = "#2C3E50"; // Modern dark blue-gray
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    
    ctx.strokeText(timeText, midX, textY);
    ctx.fillText(timeText, midX, textY);
    
    if (bpmText) {
      ctx.strokeText(bpmText, midX, textY + 14);
      ctx.fillText(bpmText, midX, textY + 14);
    }
  },

  /**
   * Calculates time interval from pixel coordinates.
   * @param {number} startX - The start x coordinate.
   * @param {number} endX - The end x coordinate.
   * @returns {object} Object containing milliseconds and heart rate.
   */
  calculateTimeInterval(startX, endX) {
    const timePerPixel = this.widthSeconds / this.chartWidth;
    const interval = Math.abs(endX - startX) * timePerPixel;
    
    return {
      milliseconds: interval * 1000,
      heartRate: interval > 0 ? 60 / interval : 0
    };
  },

  /**
   * Updates the caliper measurement display.
   * @returns {void}
   */
  updateCalipersDisplay() {
    // No UI display box - measurements only shown on canvas
  },

  // ===================
  // CANVAS & DIMENSIONS
  // ===================

  /**
   * Calculates the chart's width in pixels based on standard medical units (mm/second).
   * This ensures the visualization is medically accurate and scales correctly with the container.
   * @returns {void}
   */
  calculateMedicallyAccurateDimensions() { // ✅
    const container = this.el.querySelector("[data-ecg-chart]");
    if (!container) {
      this.chartWidth =
        DEFAULT_WIDTH_SECONDS * MM_PER_SECOND * PIXELS_PER_MM * this.gridScale;
      this.widthSeconds = DEFAULT_WIDTH_SECONDS;
      return;
    }

    const containerWidth = container.offsetWidth - CONTAINER_PADDING;
    const scaledPixelsPerMm = PIXELS_PER_MM * this.gridScale;
    const minWidth = DEFAULT_WIDTH_SECONDS * MM_PER_SECOND * scaledPixelsPerMm;

    if (containerWidth < minWidth) {
      this.chartWidth = minWidth;
      this.widthSeconds = DEFAULT_WIDTH_SECONDS;
    } else {
      this.widthSeconds = containerWidth / (MM_PER_SECOND * scaledPixelsPerMm);
      this.chartWidth = this.widthSeconds * MM_PER_SECOND * scaledPixelsPerMm;
    }
  },

  /**
   * Creates and configures the dual-canvas system for rendering.
   * A background canvas is used for the static grid, and a foreground canvas
   * is used for the animated waveform to optimize performance.
   * @returns {void}
   */
  recreateCanvas() { // ✅
    this.cleanupCanvases();

    const canvasHeight =
      this.displayMode === "multi"
        ? ROWS_PER_DISPLAY *
            ((CHART_HEIGHT * this.heightScale) / MULTI_LEAD_HEIGHT_SCALE)
        : CHART_HEIGHT * this.heightScale;

    this.leadHeight =
      this.displayMode === "multi"
        ? (CHART_HEIGHT * this.heightScale) / MULTI_LEAD_HEIGHT_SCALE
        : CHART_HEIGHT * this.heightScale;

    const container = this.el.querySelector("[data-ecg-chart]");
    const devicePixelRatio = window.devicePixelRatio || 1;

    // Create background canvas for static grid
    this.backgroundCanvas = document.createElement("canvas");
    this.backgroundCanvas.width = this.chartWidth * devicePixelRatio;
    this.backgroundCanvas.height = canvasHeight * devicePixelRatio;
    this.backgroundCanvas.style.width = this.chartWidth + "px";
    this.backgroundCanvas.style.height = canvasHeight + "px";
    this.backgroundCanvas.style.display = "block";
    container.appendChild(this.backgroundCanvas);

    this.backgroundContext = this.backgroundCanvas.getContext("2d");
    this.backgroundContext.scale(devicePixelRatio, devicePixelRatio);

    // Add click event listener for lead selection in multi-lead mode
    this.setupCanvasClickHandler();

    // Set initial cursor based on display mode
    this.updateCursorStyle();

    // Create foreground canvas for animated waveform (overlapping)
    this.waveformCanvas = document.createElement("canvas");
    this.waveformCanvas.width = this.chartWidth * devicePixelRatio;
    this.waveformCanvas.height = canvasHeight * devicePixelRatio;
    this.waveformCanvas.style.width = this.chartWidth + "px";
    this.waveformCanvas.style.height = canvasHeight + "px";
    this.waveformCanvas.style.display = "block";
    this.waveformCanvas.style.marginTop = `-${canvasHeight}px`; // Overlap the background canvas
    this.waveformCanvas.style.pointerEvents = "none"; // Allow clicks to pass through
    container.appendChild(this.waveformCanvas);

    this.waveformContext = this.waveformCanvas.getContext("2d");
    this.waveformContext.scale(devicePixelRatio, devicePixelRatio);

    // Create QRS flash canvas (top layer for indicators)
    this.qrsFlashCanvas = document.createElement("canvas");
    this.qrsFlashCanvas.width = this.chartWidth * devicePixelRatio;
    this.qrsFlashCanvas.height = canvasHeight * devicePixelRatio;
    this.qrsFlashCanvas.style.width = this.chartWidth + "px";
    this.qrsFlashCanvas.style.height = canvasHeight + "px";
    this.qrsFlashCanvas.style.display = "block";
    this.qrsFlashCanvas.style.marginTop = `-${canvasHeight}px`; // Overlap the waveform canvas
    this.qrsFlashCanvas.style.pointerEvents = "none"; // Allow clicks to pass through
    container.appendChild(this.qrsFlashCanvas);

    this.qrsFlashContext = this.qrsFlashCanvas.getContext("2d");
    this.qrsFlashContext.scale(devicePixelRatio, devicePixelRatio);

    // Create calipers canvas (top layer for measurements)
    this.calipersCanvas = document.createElement("canvas");
    this.calipersCanvas.width = this.chartWidth * devicePixelRatio;
    this.calipersCanvas.height = canvasHeight * devicePixelRatio;
    this.calipersCanvas.style.width = this.chartWidth + "px";
    this.calipersCanvas.style.height = canvasHeight + "px";
    this.calipersCanvas.style.display = "block";
    this.calipersCanvas.style.marginTop = `-${canvasHeight}px`; // Overlap the QRS flash canvas
    this.calipersCanvas.style.pointerEvents = this.calipersMode ? "auto" : "none";
    this.calipersCanvas.style.cursor = this.calipersMode ? "crosshair" : "default";
    container.appendChild(this.calipersCanvas);

    this.calipersContext = this.calipersCanvas.getContext("2d");
    this.calipersContext.scale(devicePixelRatio, devicePixelRatio);
  },

  /**
   * Removes the canvas elements from the DOM to prevent memory leaks.
   * @returns {void}
   */
  cleanupCanvases() { // ✅
    if (this.backgroundCanvas) {
      if (this.canvasClickHandler) {
        this.backgroundCanvas.removeEventListener(
          "click",
          this.canvasClickHandler
        );
      }
      this.backgroundCanvas.remove();
      this.backgroundCanvas = null;
      this.backgroundContext = null;
    }
    if (this.waveformCanvas) {
      this.waveformCanvas.remove();
      this.waveformCanvas = null;
      this.waveformContext = null;
    }
    if (this.qrsFlashCanvas) {
      this.qrsFlashCanvas.remove();
      this.qrsFlashCanvas = null;
      this.qrsFlashContext = null;
    }
    if (this.calipersCanvas) {
      if (this.calipersClickHandler) {
        this.calipersCanvas.removeEventListener("mousedown", this.calipersClickHandler);
        this.calipersCanvas.removeEventListener("mousemove", this.calipersMouseMoveHandler);
        this.calipersCanvas.removeEventListener("mouseup", this.calipersMouseUpHandler);
        
        // Remove document listeners too
        document.removeEventListener("mousemove", this.calipersMouseMoveHandler);
        document.removeEventListener("mouseup", this.calipersMouseUpHandler);
      }
      this.calipersCanvas.remove();
      this.calipersCanvas = null;
      this.calipersContext = null;
    }
  },

  // =================
  // EVENT HANDLERS
  // =================

  /**
   * Handles window resize events by recalculating dimensions and redrawing the chart.
   * @returns {void}
   */

  // ====================
  // DATA PRE-COMPUTATION
  // ====================

  /**
   * A key performance optimization. This function runs once at startup to process
   * the entire ECG dataset. It chunks the data for each lead into small, 100ms segments
   * and stores them in a Map for extremely fast lookups during the animation loop.
   * This avoids slow array searches on every frame.
   * @returns {void}
   */
  precomputeDataSegments() {
    this.precomputedSegments.clear();
    this.dataIndexCache.clear();

    if (!this.ecgLeadDatasets || this.ecgLeadDatasets.length === 0) {
      return;
    }

    // Pre-compute segments for each lead
    for (
      let leadIndex = 0;
      leadIndex < this.ecgLeadDatasets.length;
      leadIndex++
    ) {
      const leadData = this.ecgLeadDatasets[leadIndex];
      const leadSegments = new Map();

      // Create segments every 100ms
      for (
        let time = 0;
        time < this.totalDuration;
        time += this.segmentDuration
      ) {
        const segmentKey = Math.floor(time / this.segmentDuration);
        const startTime = segmentKey * this.segmentDuration;
        const endTime = Math.min(
          startTime + this.segmentDuration,
          this.totalDuration
        );

        const startIndex = this.calculateDataIndexForTime(leadData, startTime);
        const endIndex = this.calculateDataIndexForTime(leadData, endTime);

        if (endIndex >= startIndex && startIndex < leadData.times.length) {
          const times = leadData.times.slice(startIndex, endIndex + 1);
          const values = leadData.values.slice(startIndex, endIndex + 1);

          leadSegments.set(segmentKey, {
            times: times.map((t) => t - startTime),
            values: values,
            originalStartTime: startTime,
          });
        }
      }

      this.precomputedSegments.set(leadIndex, leadSegments);
    }
  },

  /**
   * Retrieves all the pre-computed data segments that fall within a given time range.
   * This is the main function used by the animation to get the data it needs to draw.
   * @param {number} leadIndex - The index of the ECG lead.
   * @param {number} startTime - The start of the time range in seconds.
   * @param {number} endTime - The end of the time range in seconds.
   * @returns {Array<object>} A list of pre-computed data segments.
   */
  getSegmentsForTimeRange(leadIndex, startTime, endTime) {
    const leadSegments = this.precomputedSegments.get(leadIndex);
    if (!leadSegments) return [];

    const startSegment = Math.floor(startTime / this.segmentDuration);
    const endSegment = Math.floor(endTime / this.segmentDuration);

    const segments = [];
    for (
      let segmentKey = startSegment;
      segmentKey <= endSegment;
      segmentKey++
    ) {
      const segment = leadSegments.get(segmentKey);
      if (segment) {
        segments.push(segment);
      }
    }

    return segments;
  },

  // ========================
  // LEAD SWITCHING & CONTROL
  // ========================

  /**
   * Switches to the next lead in the list and notifies the server.
   * @returns {void}
   */
  switchToNextLead() {
    if (!this.ecgLeadDatasets || this.ecgLeadDatasets.length === 0) return;

    if (this.currentLead < this.ecgLeadDatasets.length - 1) {
      const nextLead = this.currentLead + 1;
      this.switchLead(nextLead);
    }
  },

  /**
   * Switches to the previous lead in the list and notifies the server.
   * @returns {void}
   */
  switchToPrevLead() {
    if (!this.ecgLeadDatasets || this.ecgLeadDatasets.length === 0) return;

    if (this.currentLead > 0) {
      const prevLead = this.currentLead - 1;
      this.switchLead(prevLead);
    }
  },

  // =========================
  // PLAYBACK & ANIMATION LOOP
  // =========================

  /**
   * Toggles the playback state between playing and paused and notifies the server.
   * @returns {void}
   */
  togglePlayback() {
    const newPlayingState = !this.isPlaying;
    this.isPlaying = newPlayingState;

    if (newPlayingState) {
      this.resumeAnimation();
    } else {
      this.pauseAnimation();
    }

    this.updatePlayPauseButton();
  },

  /**
   * Handles playback end events, managing looping and state updates.
   * @returns {void}
   */
  handlePlaybackEnd() {
    if (this.loopEnabled) {
      this.resetPlayback();
      this.startAnimation();
    } else {
      this.stopAnimation();
      this.resetPlayback();
      this.updatePlayPauseButton();
    }
  },

  /**
   * Processes a single animation frame, updating cursor position and rendering.
   * @param {number} cursorProgress - The cursor progress within the current cycle (0-1).
   * @param {number} animationCycle - The current animation cycle number.
   * @returns {void}
   */
  processAnimationFrame(cursorProgress, animationCycle) {
    const elapsedTime =
      animationCycle * this.widthSeconds + cursorProgress * this.widthSeconds;

    if (elapsedTime >= this.totalDuration) {
      this.handlePlaybackEnd();
      return;
    }

    this.checkQrsOccurrences(elapsedTime);
    this.calculateCursorPosition(elapsedTime);

    if (this.displayMode === "single") {
      this.loadVisibleDataForSingleLead(elapsedTime);
    } else {
      this.loadVisibleDataForAllLeads(elapsedTime);
    }

    if (this.displayMode === "single") {
      if (!this.activeCursorData || this.activeCursorData.times.length === 0)
        return;

      const cursorClearWidth = SINGLE_LEAD_CURSOR_WIDTH;
      const cursorData = {
        times: this.activeCursorData.times,
        values: this.activeCursorData.values,
        cursorPosition: this.cursorPosition,
        cursorWidth: cursorClearWidth,
      };

      this.renderLeadWaveform({
        leadIndex: this.currentLead,
        leadData: null,
        bounds: {
          xOffset: 0,
          yOffset: 0,
          width: this.chartWidth,
          height: CHART_HEIGHT * this.heightScale,
        },
        timeSpan: this.widthSeconds,
        cursorData,
      });
    } else {
      if (!this.allLeadsCursorData || this.allLeadsCursorData.length === 0)
        return;

      for (const leadData of this.allLeadsCursorData) {
        const { xOffset, yOffset, columnWidth } =
          this.calculateLeadGridCoordinates(leadData.leadIndex);

        const columnTimeSpan = this.widthSeconds / COLUMNS_PER_DISPLAY;
        const columnProgress =
          (this.cursorPosition / this.chartWidth) *
          (this.widthSeconds / columnTimeSpan);
        const localCursorPosition =
          xOffset + (columnProgress % 1) * columnWidth;

        const cursorClearWidth = MULTI_LEAD_CURSOR_WIDTH;
        const cursorData = {
          times: leadData.times,
          values: leadData.values,
          cursorPosition: localCursorPosition,
          cursorWidth: cursorClearWidth,
        };

        this.renderLeadWaveform({
          leadIndex: leadData.leadIndex,
          leadData: null,
          bounds: {
            xOffset,
            yOffset,
            width: columnWidth,
            height: this.leadHeight,
          },
          timeSpan: columnTimeSpan,
          cursorData,
        });
      }
    }

    if (!this.qrsFlashActive || !this.qrsFlashContext) return;

    const dotRadius = 5;
    const margin = 15;
    const dotX = this.chartWidth - margin;
    const dotY = margin;

    this.qrsFlashContext.fillStyle = "#ff0000"; // Red color
    this.qrsFlashContext.beginPath();
    this.qrsFlashContext.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI);
    this.qrsFlashContext.fill();
  },

  /**
   * Calculates the cursor's horizontal pixel position based on the elapsed time.
   * @param {number} elapsedTime - The total time elapsed since playback started.
   * @returns {void}
   */
  calculateCursorPosition(elapsedTime) {
    this.cursorPosition = (elapsedTime * this.chartWidth) / this.widthSeconds;
    this.cursorPosition = this.cursorPosition % this.chartWidth;
  },

  /**
   * Prepares the waveform data for the single-lead view.
   * It uses `getSegmentsForTimeRange` to efficiently fetch the visible data.
   * @param {number} elapsedTime - The total time elapsed since playback started.
   * @returns {void}
   */
  loadVisibleDataForSingleLead(elapsedTime) {
    const currentScreenStartTime =
      Math.floor(elapsedTime / this.widthSeconds) * this.widthSeconds;

    // Use pre-computed segments instead of real-time slicing
    const segments = this.getSegmentsForTimeRange(
      this.currentLead,
      currentScreenStartTime,
      elapsedTime
    );
    this.activeSegments = segments;

    if (segments.length > 0) {
      // Combine segments into cursor data
      const times = [];
      const values = [];

      for (const segment of segments) {
        for (let i = 0; i < segment.times.length; i++) {
          const absoluteTime = segment.originalStartTime + segment.times[i];
          if (
            absoluteTime >= currentScreenStartTime &&
            absoluteTime <= elapsedTime
          ) {
            times.push(absoluteTime - currentScreenStartTime);
            values.push(segment.values[i]);
          }
        }
      }

      this.activeCursorData = { times, values };
    } else {
      this.activeCursorData = { times: [], values: [] };
    }
  },

  /**
   * Prepares the waveform data for the multi-lead view.
   * It fetches data for all 12 leads for the current time slice.
   * @param {number} elapsedTime - The total time elapsed since playback started.
   * @returns {void}
   */
  loadVisibleDataForAllLeads(elapsedTime) {
    const columnTimeSpan = this.widthSeconds / COLUMNS_PER_DISPLAY;
    const columnCycleStart =
      Math.floor(elapsedTime / columnTimeSpan) * columnTimeSpan;

    this.allLeadsCursorData = [];
    this.activeSegments = [];

    for (
      let leadIndex = 0;
      leadIndex < this.ecgLeadDatasets.length;
      leadIndex++
    ) {
      // Use pre-computed segments instead of real-time slicing
      const segments = this.getSegmentsForTimeRange(
        leadIndex,
        columnCycleStart,
        elapsedTime
      );
      if (leadIndex === 0) {
        this.activeSegments = segments;
      }

      if (segments.length > 0) {
        // Combine segments into cursor data
        const times = [];
        const values = [];

        for (const segment of segments) {
          for (let i = 0; i < segment.times.length; i++) {
            const absoluteTime = segment.originalStartTime + segment.times[i];
            if (
              absoluteTime >= columnCycleStart &&
              absoluteTime <= elapsedTime
            ) {
              times.push(absoluteTime - columnCycleStart);
              values.push(segment.values[i]);
            }
          }
        }

        this.allLeadsCursorData.push({
          leadIndex,
          times,
          values,
        });
      }
    }
  },

  // ==================
  // QRS DETECTION & UI
  // ==================

  /**
   * Checks for QRS occurrences at the given elapsed time and triggers indicators.
   * @param {number} elapsedTime - The elapsed time in seconds.
   * @returns {void}
   */
  checkQrsOccurrences(elapsedTime) {
    if (!this.qrsTimestamps || this.qrsTimestamps.length === 0) {
      return;
    }

    // Find QRS events that have occurred since the last check
    for (let i = this.lastQrsIndex + 1; i < this.qrsTimestamps.length; i++) {
      const qrsTime = this.qrsTimestamps[i];

      if (qrsTime <= elapsedTime) {
        this.qrsDetectedCount++;

        if (this.qrsIndicatorEnabled) {
          this.triggerQrsFlash();
        }

        this.lastQrsIndex = i;
      } else {
        // Since QRS timestamps are sorted, we can break early
        break;
      }
    }
  },

  /**
   * Triggers a QRS flash indicator with automatic timeout.
   * @returns {void}
   */
  triggerQrsFlash() {
    // Clear any existing timeout
    if (this.qrsFlashTimeout) {
      clearTimeout(this.qrsFlashTimeout);
    }

    // Activate the flash
    this.qrsFlashActive = true;

    // Set timeout to deactivate the flash and clear the dot
    this.qrsFlashTimeout = setTimeout(() => {
      this.qrsFlashActive = false;
      this.qrsFlashTimeout = null;
      // Clear the flash dot area
      this.clearQrsFlashArea();
    }, this.qrsFlashDuration);
  },

  /**
   * Clears the QRS flash indicator area on the canvas.
   * @returns {void}
   */
  clearQrsFlashArea() {
    if (!this.qrsFlashContext || !this.qrsFlashCanvas) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.qrsFlashCanvas.height / devicePixelRatio;

    // Clear the entire QRS flash canvas
    this.qrsFlashContext.clearRect(0, 0, this.chartWidth, canvasHeight);
  },

  /**
   * Starts the animation from the beginning.
   * @returns {void}
   */
  startAnimation() {
    this.isPlaying = true;
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.animationCycle = 0;
    this.cursorPosition = 0;

    this.allLeadsVisibleData = null;

    this.startAnimationLoop();
  },

  /**
   * Resumes the animation from a paused state.
   * @returns {void}
   */
  resumeAnimation() {
    if (!this.startTime) {
      this.startAnimation();
    } else {
      const pauseDuration = Date.now() - this.pausedTime;
      this.startTime += pauseDuration;
      this.pausedTime = 0;
      this.startAnimationLoop();
    }
  },

  /**
   * Pauses the animation, records the pause time, and renders the final frame at the current position.
   * @returns {void}
   */
  pauseAnimation() {
    this.pausedTime = Date.now();
    this.stopAnimation();

    // Render the final frame when paused
    const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
    const cursorProgress =
      (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
    const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
    this.processAnimationFrame(cursorProgress, animationCycle);
  },

  /**
   * Stops the `requestAnimationFrame` loop.
   * @returns {void}
   */
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isPlaying = false;
  },

  /**
   * Resets the entire playback state to the beginning.
   * @returns {void}
   */
  resetPlayback() {
    this.stopAnimation();
    this.startTime = null;
    this.pausedTime = 0;
    this.animationCycle = 0;
    this.cursorPosition = 0;

    this.allLeadsVisibleData = null;

    // Reset QRS tracking
    this.lastQrsIndex = -1;
    this.qrsDetectedCount = 0;

    // Reset QRS flash state
    if (this.qrsFlashTimeout) {
      clearTimeout(this.qrsFlashTimeout);
      this.qrsFlashTimeout = null;
    }
    this.qrsFlashActive = false;

    this.clearWaveform();
  },

  /**
   * Updates the play/pause button icon and text based on current playback state.
   * @returns {void}
   */
  updatePlayPauseButton() { // ✅
    const button = document.getElementById("play-pause-button");
    if (button) {
      // Update icon
      const iconClass = this.isPlaying ? "hero-pause" : "hero-play";
      const iconHtml = `<svg class="w-4 h-4 ${iconClass}" fill="currentColor" viewBox="0 0 24 24">
        ${
          this.isPlaying
            ? '<path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" />'
            : '<path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />'
        }
      </svg>`;

      // Update text
      const buttonText = this.isPlaying ? "Pause" : "Play";
      const textHtml = `<span class="ml-1">${buttonText}</span>`;

      // Replace button content with icon + text
      button.innerHTML = iconHtml + textHtml;
    }
  },

  /**
   * Sets up the play/pause button click handler.
   * @returns {void}
   */
  setupPlayPauseButton() { // ✅
    const button = document.getElementById("play-pause-button");
    if (button && !button.dataset.listenerAdded) {
      button.addEventListener("click", () => {
        this.togglePlayback();
      });
      button.dataset.listenerAdded = "true";
    }
  },

  /**
   * Sets up event handlers for the three selectors.
   * @returns {void}
   */
  // Helper to setup event listener with duplicate prevention
  /**
   * @param {string} elementId
   * @param {string} eventType
   * @param {EventListener} handler
   * @param {((element: HTMLElement) => void) | null} [initializer]
   */
  setupElementListener(elementId, eventType, handler, initializer = null) {
    const element = document.getElementById(elementId);
    if (element && !element.dataset.listenerAdded) {
      if (initializer) initializer(element);
      element.addEventListener(eventType, handler);
      element.dataset.listenerAdded = "true";
    }
  },

  setupBasicSelectors() { // ✅
    this.setupElementListener("lead-selector", "change", (e) => {
      const leadIndex = parseInt(
        /** @type {HTMLSelectElement} */ (e.target).value
      );
      this.currentLead = leadIndex;
      this.switchLead(leadIndex);
    });

    this.setupElementListener("display-mode-selector", "change", (e) => {
      const value = /** @type {HTMLSelectElement} */ (e.target).value;
      this.displayMode = value;
      this.cursorWidth =
        value === "single" ? SINGLE_LEAD_CURSOR_WIDTH : MULTI_LEAD_CURSOR_WIDTH;
      this.recreateCanvasAndRestart();
      this.updateCursorStyle();
      this.updateLeadSelectorVisibility(value);
    });

    this.setupElementListener("grid-type-selector", "change", (e) => {
      const value = /** @type {HTMLSelectElement} */ (e.target).value;
      this.gridType = value;
      this.renderGridBackground();
    });
  },

  setupCheckboxes() {
    this.setupElementListener(
      "loop-checkbox",
      "change",
      (event) => {
        this.loopEnabled = /** @type {HTMLInputElement} */ (
          event.target
        ).checked;
      },
      (element) => {
        /** @type {HTMLInputElement} */ (element).checked = this.loopEnabled;
      }
    );

    this.setupElementListener(
      "qrs-indicator-checkbox",
      "change",
      (event) => {
        this.qrsIndicatorEnabled = /** @type {HTMLInputElement} */ (
          event.target
        ).checked;
        if (!this.qrsIndicatorEnabled && this.qrsFlashActive) {
          this.qrsFlashActive = false;
          if (this.qrsFlashTimeout) {
            clearTimeout(this.qrsFlashTimeout);
            this.qrsFlashTimeout = null;
          }
          this.clearQrsFlashArea();
        }
      },
      (element) => {
        /** @type {HTMLInputElement} */ (element).checked =
          this.qrsIndicatorEnabled;
      }
    );
  },

  setupScaleSliders() {
    this.setupElementListener(
      "grid-scale-slider",
      "input",
      (event) => {
        this.gridScale = parseFloat(
          /** @type {HTMLInputElement} */ (event.target).value
        );
        this.updateGridScaleDisplay();
        this.handleGridScaleChange();
      },
      (element) => {
        /** @type {HTMLInputElement} */ (element).value =
          this.gridScale.toString();
        this.updateGridScaleDisplay();
      }
    );

    this.setupElementListener(
      "amplitude-scale-slider",
      "input",
      (event) => {
        this.amplitudeScale = parseFloat(
          /** @type {HTMLInputElement} */ (event.target).value
        );
        this.updateAmplitudeScaleDisplay();
        this.handleAmplitudeScaleChange();
      },
      (element) => {
        /** @type {HTMLInputElement} */ (element).value =
          this.amplitudeScale.toString();
        this.updateAmplitudeScaleDisplay();
      }
    );

    this.setupElementListener(
      "height-scale-slider",
      "input",
      (event) => {
        this.heightScale = parseFloat(
          /** @type {HTMLInputElement} */ (event.target).value
        );
        this.leadHeight = CHART_HEIGHT * this.heightScale;
        this.updateHeightScaleDisplay();
        this.handleHeightScaleChange();
      },
      (element) => {
        /** @type {HTMLInputElement} */ (element).value =
          this.heightScale.toString();
        this.updateHeightScaleDisplay();
      }
    );
  },

  setupSelectors() {
    this.setupBasicSelectors();
    this.setupCheckboxes();
    this.setupScaleSliders();

    // Sync all form elements with current state
    this.syncFormElementsWithState();
  },

  /**
   * Synchronizes all form elements with the current JavaScript state
   * @returns {void}
   */
  syncFormElementsWithState() {
    // Update selectors
    const leadSelector = /** @type {HTMLSelectElement} */ (
      document.getElementById("lead-selector")
    );
    if (leadSelector) {
      leadSelector.value = this.currentLead.toString();
    }

    const displayModeSelector = /** @type {HTMLSelectElement} */ (
      document.getElementById("display-mode-selector")
    );
    if (displayModeSelector) {
      displayModeSelector.value = this.displayMode;
    }

    const gridTypeSelector = /** @type {HTMLSelectElement} */ (
      document.getElementById("grid-type-selector")
    );
    if (gridTypeSelector) {
      gridTypeSelector.value = this.gridType;
    }

    // Update checkboxes
    const loopCheckbox = /** @type {HTMLInputElement} */ (
      document.getElementById("loop-checkbox")
    );
    if (loopCheckbox) {
      loopCheckbox.checked = this.loopEnabled;
    }

    const qrsCheckbox = /** @type {HTMLInputElement} */ (
      document.getElementById("qrs-indicator-checkbox")
    );
    if (qrsCheckbox) {
      qrsCheckbox.checked = this.qrsIndicatorEnabled;
    }

    // Update sliders
    const gridScaleSlider = /** @type {HTMLInputElement} */ (
      document.getElementById("grid-scale-slider")
    );
    if (gridScaleSlider) {
      gridScaleSlider.value = this.gridScale.toString();
      this.updateGridScaleDisplay();
    }

    const amplitudeScaleSlider = /** @type {HTMLInputElement} */ (
      document.getElementById("amplitude-scale-slider")
    );
    if (amplitudeScaleSlider) {
      amplitudeScaleSlider.value = this.amplitudeScale.toString();
      this.updateAmplitudeScaleDisplay();
    }

    const heightScaleSlider = /** @type {HTMLInputElement} */ (
      document.getElementById("height-scale-slider")
    );
    if (heightScaleSlider) {
      heightScaleSlider.value = this.heightScale.toString();
      this.updateHeightScaleDisplay();
    }
  },

  /**
   * Shows or hides the lead selector based on display mode.
   * @param {string} displayMode - The display mode ("single" or "multi")
   * @returns {void}
   */
  updateLeadSelectorVisibility(displayMode) {
    const leadSelectorContainer = document.getElementById(
      "lead-selector-container"
    );
    if (leadSelectorContainer) {
      if (displayMode === "multi") {
        leadSelectorContainer.style.display = "none";
      } else {
        leadSelectorContainer.style.display = "block";
      }
    }
  },

  /**
   * Updates the lead selector value to match the current lead.
   * @returns {void}
   */

  /**
   * The main animation driver. It uses `requestAnimationFrame` to repeatedly
   * call itself, creating a smooth animation loop that is synchronized with
   * the browser's rendering cycle.
   * @returns {void}
   */
  startAnimationLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    const animate = () => {
      if (!this.isPlaying || !this.waveformCanvas) {
        this.stopAnimation();
        return;
      }

      const currentTime = Date.now();
      const elapsedSeconds = (currentTime - this.startTime) / 1000;
      const cursorProgress =
        (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);

      if (animationCycle !== this.animationCycle) {
        this.animationCycle = animationCycle;
      }

      this.processAnimationFrame(cursorProgress, animationCycle);

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  },

  // =================
  // RENDERING - GRID
  // =================

  /**
   * Draws the grid for a single lead, dispatching to either the graph paper or telemetry grid style.
   * @param {object} options - Grid drawing options.
   * @param {object} options.bounds - The drawing bounds.
   * @param {number} options.bounds.xOffset - The horizontal starting position.
   * @param {number} options.bounds.yOffset - The vertical starting position.
   * @param {number} options.bounds.width - The width of the grid.
   * @param {number} options.bounds.height - The height of the grid.
   * @param {CanvasRenderingContext2D} options.context - The canvas context to draw on.
   * @returns {void}
   */
  drawLeadGrid(options) {
    const {
      bounds: { xOffset, yOffset, width, height },
      context = this.waveformContext,
    } = options;

    if (this.gridType === "graph_paper") {
      this.drawMedicalGrid({
        bounds: { xOffset, yOffset, width, height },
        context,
      });
    } else {
      this.drawSimpleGrid({
        bounds: { xOffset, yOffset, width, height },
        context,
      });
    }
  },

  /**
   * Draws the text label (e.g., "V1", "II") for a lead.
   * @param {number} leadIndex - The index of the lead to label.
   * @param {number} xOffset - The horizontal starting position.
   * @param {number} yOffset - The vertical starting position.
   * @param {CanvasRenderingContext2D} context - The canvas context to draw on.
   * @returns {void}
   */
  drawLeadLabel(leadIndex, xOffset, yOffset, context = this.waveformContext) {
    if (!this.leadNames || !this.leadNames[leadIndex]) return;

    context.fillStyle = this.colors.labels;
    context.font = "12px Arial";
    context.fillText(this.leadNames[leadIndex], xOffset + 5, yOffset + 15);
  },

  /**
   * Draws a standard graph paper ECG grid with major and minor lines.
   * @param {object} options - Grid drawing options.
   * @param {object} options.bounds - The drawing bounds.
   * @param {number} options.bounds.xOffset - The horizontal starting position.
   * @param {number} options.bounds.yOffset - The vertical starting position.
   * @param {number} options.bounds.width - The width of the grid.
   * @param {number} options.bounds.height - The height of the grid.
   * @param {CanvasRenderingContext2D} options.context - The canvas context to draw on.
   * @returns {void}
   */
  drawMedicalGrid(options) {
    const {
      bounds: { xOffset, yOffset, width, height },
      context = this.waveformContext,
    } = options;
    const smallSquareSize = PIXELS_PER_MM * this.gridScale;
    const largeSquareSize = 5 * PIXELS_PER_MM * this.gridScale;

    context.strokeStyle = this.colors.gridFine;
    context.lineWidth = 0.5;
    context.beginPath();

    for (
      let x = xOffset + smallSquareSize;
      x < xOffset + width;
      x += smallSquareSize
    ) {
      context.moveTo(x, yOffset);
      context.lineTo(x, yOffset + height);
    }

    for (let y = smallSquareSize; y <= height; y += smallSquareSize) {
      if (yOffset + y <= yOffset + height) {
        context.moveTo(xOffset, yOffset + y);
        context.lineTo(xOffset + width, yOffset + y);
      }
    }

    context.stroke();

    context.strokeStyle = this.colors.gridBold;
    context.lineWidth = 1;
    context.beginPath();

    for (
      let x = xOffset + largeSquareSize;
      x < xOffset + width;
      x += largeSquareSize
    ) {
      context.moveTo(x, yOffset);
      context.lineTo(x, yOffset + height);
    }

    for (let y = largeSquareSize; y <= height; y += largeSquareSize) {
      if (yOffset + y <= yOffset + height) {
        context.moveTo(xOffset, yOffset + y);
        context.lineTo(xOffset + width, yOffset + y);
      }
    }

    context.stroke();
  },

  /**
   * Draws a simplified grid using dots instead of lines.
   * @param {object} options - Grid drawing options.
   * @param {object} options.bounds - The drawing bounds.
   * @param {number} options.bounds.xOffset - The horizontal starting position.
   * @param {number} options.bounds.yOffset - The vertical starting position.
   * @param {number} options.bounds.width - The width of the grid.
   * @param {number} options.bounds.height - The height of the grid.
   * @param {CanvasRenderingContext2D} options.context - The canvas context to draw on.
   * @returns {void}
   */
  drawSimpleGrid(options) {
    const {
      bounds: { xOffset, yOffset, width, height },
      context = this.waveformContext,
    } = options;
    const dotSpacing = 5 * PIXELS_PER_MM * this.gridScale;
    context.fillStyle = this.colors.gridDots;

    for (let x = xOffset + 5; x < xOffset + width - 5; x += dotSpacing) {
      for (let y = 5; y < height - 5; y += dotSpacing) {
        context.beginPath();
        context.arc(x, yOffset + y, DOT_RADIUS, 0, 2 * Math.PI);
        context.fill();
      }
    }
  },

  // =====================
  // RENDERING - WAVEFORM
  // =====================

  /**
   * Clears the entire foreground (waveform) canvas.
   * @returns {void}
   */
  clearWaveform() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.waveformCanvas.height / devicePixelRatio;
    // Only clear waveform canvas, background grid persists
    this.waveformContext.clearRect(0, 0, this.chartWidth, canvasHeight);
  },

  /**
   * Main rendering dispatcher, called on every animation frame.
   * It dispatches to the correct drawing function based on the display mode (single vs multi-lead).
   * @returns {void}
   */

  // ==============================
  // RENDERING - CANVAS OPERATIONS
  // ==============================

  /**
   * Sets up canvas context for waveform drawing.
   * @param {CanvasRenderingContext2D} context - The canvas context to setup.
   * @returns {void}
   */
  setupWaveformDrawing(context = this.waveformContext) {
    context.strokeStyle = this.colors.waveform;
    context.lineWidth = WAVEFORM_LINE_WIDTH;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.beginPath();
  },

  /**
   * Calculates the bounds for clearing the cursor area.
   * @param {number} xOffset - The horizontal starting position of the lead's grid.
   * @param {number} width - The total width of the lead's grid.
   * @param {number} cursorPosition - The current horizontal pixel position of the cursor.
   * @param {number} cursorWidth - The width of the area to clear ahead of the cursor.
   * @returns {{clearX: number, clearWidth: number}} The calculated clear bounds.
   */
  calculateClearBounds(xOffset, width, cursorPosition, cursorWidth) {
    const clearX = Math.max(xOffset, cursorPosition - cursorWidth / 2);
    const clearWidth = Math.min(cursorWidth, xOffset + width - clearX);
    return { clearX, clearWidth };
  },

  /**
   * Clears a small rectangular area on the waveform canvas, typically right in
   * front of the moving cursor, to prepare for the next draw cycle.
   * @param {number} x - The horizontal position to start clearing.
   * @param {number} width - The width of the area to clear.
   * @returns {void}
   */
  clearCursorArea(x, width) {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.waveformCanvas.height / devicePixelRatio;

    // Only clear the waveform canvas, background grid remains untouched
    this.waveformContext.clearRect(x, 0, width, canvasHeight);
  },

  /**
   * Draws a segment of the waveform up to the current cursor position.
   * It clears a small area just ahead of the cursor to create the illusion of a moving line.
   * This is the lowest-level drawing function for the animated waveform.
   * @param {object} options - Drawing options.
   * @param {Array<number>} options.times - Array of time points for the waveform segment.
   * @param {Array<number>} options.values - Array of millivolt values for the waveform segment.
   * @param {object} options.bounds - The drawing bounds.
   * @param {number} options.bounds.xOffset - The horizontal starting position of the lead's grid.
   * @param {number} options.bounds.yOffset - The vertical starting position of the lead's grid.
   * @param {number} options.bounds.width - The total width of the lead's grid.
   * @param {number} options.bounds.height - The total height of the lead's grid.
   * @param {number} options.timeSpan - The total duration shown in this grid (in seconds).
   * @param {object} options.cursor - The cursor options.
   * @param {number} options.cursor.position - The current horizontal pixel position of the cursor.
   * @param {number} options.cursor.width - The width of the area to clear ahead of the cursor.
   * @returns {void}
   */
  drawWaveformToCursor(options) {
    const {
      times,
      values,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
      cursor: { position: cursorPosition, width: cursorWidth },
    } = options;

    if (!times || times.length === 0) return;

    const { clearX, clearWidth } = this.calculateClearBounds(
      xOffset,
      width,
      cursorPosition,
      cursorWidth
    );

    if (clearWidth > 0) {
      this.clearCursorArea(clearX, clearWidth);
    }

    this.setupWaveformDrawing();

    const coordinates = this.transformCoordinates({
      times,
      values,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
    });

    let hasMovedTo = false;
    let prevPoint = null;

    for (let i = 0; i < coordinates.length; i++) {
      const { x, y } = coordinates[i];
      if (x <= cursorPosition) {
        if (!hasMovedTo) {
          this.waveformContext.moveTo(x, y);
          hasMovedTo = true;
          prevPoint = { x, y };
        } else if (prevPoint && i < coordinates.length - 1) {
          // Use quadratic curves for smoother lines
          const nextPoint = coordinates[i + 1];
          if (nextPoint && nextPoint.x <= cursorPosition) {
            const cpX = (prevPoint.x + x) / 2;
            const cpY = (prevPoint.y + y) / 2;
            this.waveformContext.quadraticCurveTo(cpX, cpY, x, y);
          } else {
            this.waveformContext.lineTo(x, y);
          }
          prevPoint = { x, y };
        } else {
          this.waveformContext.lineTo(x, y);
          prevPoint = { x, y };
        }
      }
    }

    if (hasMovedTo) {
      this.waveformContext.stroke();
    }
  },

  /**
   * Orchestrates drawing the animated cursor for the single-lead view.
   * @returns {void}
   */

  // ============================
  // RENDERING - LEAD COMPONENTS
  // ============================

  /**
   * Renders the background for a single lead, including its grid and label.
   * This is drawn to the static background canvas for performance.
   * @param {number} leadIndex - The index of the lead to render.
   * @param {number} xOffset - The horizontal starting position.
   * @param {number} yOffset - The vertical starting position.
   * @param {number} width - The width of the lead's grid.
   * @param {number} height - The height of the lead's grid.
   * @param {CanvasRenderingContext2D} context - The canvas context to draw on.
   * @returns {void}
   */
  renderLeadBackground(
    leadIndex,
    xOffset,
    yOffset,
    width,
    height,
    context = this.waveformContext
  ) {
    this.drawLeadGrid({
      bounds: { xOffset, yOffset, width, height },
      context,
    });
    this.drawLeadLabel(leadIndex, xOffset, yOffset, context);
  },

  /**
   * Renders waveform data for a single lead on the foreground canvas. It handles drawing either
   * a static waveform or an animated cursor-driven waveform. The background grid is assumed to be
   * already rendered on the background canvas.
   * @param {object} options - Rendering options.
   * @param {number} options.leadIndex - The index of the lead (used for context).
   * @param {object} options.leadData - The full dataset for the lead (for static drawing).
   * @param {object} options.bounds - The drawing bounds.
   * @param {number} options.bounds.xOffset - The horizontal starting position.
   * @param {number} options.bounds.yOffset - The vertical starting position.
   * @param {number} options.bounds.width - The width of the lead's grid.
   * @param {number} options.bounds.height - The height of the lead's grid.
   * @param {number} options.timeSpan - The total duration shown in this grid (in seconds).
   * @param {object} options.cursorData - Data for drawing the animated cursor. If null, a static waveform is drawn.
   * @returns {void}
   */
  renderLeadWaveform(options) {
    const {
      leadData,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
      cursorData = null,
    } = options;

    // Background is already rendered on the background canvas
    // Only draw waveform data on the foreground canvas

    if (cursorData) {
      this.drawWaveformToCursor({
        times: cursorData.times,
        values: cursorData.values,
        bounds: { xOffset, yOffset, width, height },
        timeSpan,
        cursor: {
          position: cursorData.cursorPosition,
          width: cursorData.cursorWidth,
        },
      });
    } else if (leadData && leadData.times && leadData.values) {
      this.drawLeadWaveform({
        times: leadData.times,
        values: leadData.values,
        bounds: { xOffset, yOffset, width, height },
        timeSpan,
      });
    }
  },

  /**
   * Renders the entire grid background for the current display mode.
   * This function draws to the background canvas only, which is a key performance
   * optimization as the grid does not need to be redrawn on every animation frame.
   * @returns {void}
   */
  renderGridBackground() { // ✅
    if (!this.backgroundCanvas || !this.backgroundContext) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.backgroundCanvas.height / devicePixelRatio;

    // Clear and render to background canvas only
    this.backgroundContext.clearRect(0, 0, this.chartWidth, canvasHeight);

    // Render grid directly to background context
    if (this.displayMode === "multi" && this.leadNames) {
      // Draw one continuous grid across the entire canvas
      this.drawContinuousGrid(canvasHeight);
      
      // Draw lead labels only (no individual grids)
      for (let i = 0; i < this.leadNames.length; i++) {
        const { xOffset, yOffset } = this.calculateLeadGridCoordinates(i);
        this.drawLeadLabel(i, xOffset, yOffset, this.backgroundContext);
      }
    } else if (this.leadNames) {
      this.renderLeadBackground(
        this.currentLead,
        0,
        0,
        this.chartWidth,
        CHART_HEIGHT * this.heightScale,
        this.backgroundContext
      );
    }
  },

  /**
   * Draws a continuous grid across the entire canvas for multi-lead mode.
   * This ensures proper grid cell sizes at boundaries between leads.
   * @param {number} canvasHeight - The height of the canvas.
   * @returns {void}
   */
  drawContinuousGrid(canvasHeight) {
    if (this.gridType === "graph_paper") {
      this.drawMedicalGrid({
        bounds: { xOffset: 0, yOffset: 0, width: this.chartWidth, height: canvasHeight },
        context: this.backgroundContext,
      });
    } else {
      this.drawSimpleGrid({
        bounds: { xOffset: 0, yOffset: 0, width: this.chartWidth, height: canvasHeight },
        context: this.backgroundContext,
      });
    }
  },

  /**
   * Draws a complete, static waveform for a given lead.
   * @param {object} options - Drawing options.
   * @param {Array<number>} options.times - Array of time points.
   * @param {Array<number>} options.values - Array of millivolt values.
   * @param {object} options.bounds - The drawing bounds.
   * @param {number} options.bounds.xOffset - The horizontal starting position.
   * @param {number} options.bounds.yOffset - The vertical starting position.
   * @param {number} options.bounds.width - The width of the drawing area.
   * @param {number} options.bounds.height - The height of the drawing area.
   * @param {number} options.timeSpan - The total duration shown in this area (in seconds).
   * @returns {void}
   */
  drawLeadWaveform(options) {
    const {
      times,
      values,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
    } = options;

    if (times.length === 0) return;

    this.setupWaveformDrawing();

    const coordinates = this.transformCoordinates({
      times,
      values,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
    });

    let hasMovedTo = false;
    let prevPoint = null;

    for (let i = 0; i < coordinates.length; i++) {
      const { x, y } = coordinates[i];
      if (!hasMovedTo) {
        this.waveformContext.moveTo(x, y);
        hasMovedTo = true;
        prevPoint = { x, y };
      } else if (prevPoint && i < coordinates.length - 1) {
        // Use quadratic curves for smoother lines
        const nextPoint = coordinates[i + 1];
        if (nextPoint) {
          const cpX = (prevPoint.x + x) / 2;
          const cpY = (prevPoint.y + y) / 2;
          this.waveformContext.quadraticCurveTo(cpX, cpY, x, y);
        } else {
          this.waveformContext.lineTo(x, y);
        }
        prevPoint = { x, y };
      } else {
        this.waveformContext.lineTo(x, y);
        prevPoint = { x, y };
      }
    }

    this.waveformContext.stroke();
  },

  // =================
  // UTILITY FUNCTIONS
  // =================

  /**
   * Reads a form field value by name
   * @param {string} fieldName - The name of the form field to read
   * @returns {string|null} The field value or null if not found
   */
  readFormValue(fieldName) { // ✅
    const input = /** @type {HTMLInputElement | HTMLSelectElement | null} */ (
      document.querySelector(
        `input[name="settings[${fieldName}]"], select[name="settings[${fieldName}]"]`
      )
    );
    return input ? input.value : null;
  },

  /**
   * Reads a checkbox form field value by name
   * @param {string} fieldName - The name of the checkbox field to read
   * @returns {boolean} The checkbox state
   */
  readFormCheckbox(fieldName) { // ✅
    const input = /** @type {HTMLInputElement | null} */ (
      document.querySelector(
        `input[name="settings[${fieldName}]"][type="checkbox"]`
      )
    );
    return input ? input.checked : false;
  },

  /**
   * Preserves canvas state during operations by managing animation lifecycle.
   * @param {Function} operation - The operation to execute while preserving state.
   * @returns {void}
   */
  withCanvasStatePreservation(operation) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopAnimation();

    operation();

    if (!wasPlaying && this.startTime && this.pausedTime) {
      const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
      const cursorProgress =
        (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
      this.processAnimationFrame(cursorProgress, animationCycle);
    }

    if (wasPlaying) {
      this.isPlaying = true;
      this.startAnimationLoop();
    }
  },

  /**
   * Recreates canvas and restarts animation if it was playing
   * @returns {void}
   */
  recreateCanvasAndRestart() {
    this.withCanvasStatePreservation(() => {
      this.recreateCanvas();
      this.renderGridBackground();
    });
  },

  /**
   * Updates the display mode selector in the DOM
   * @param {string} mode - The display mode ("single" or "multi")
   * @returns {void}
   */
  updateDisplayModeSelector(mode) {
    const displayModeSelector = /** @type {HTMLSelectElement} */ (
      document.getElementById("display-mode-selector")
    );
    if (displayModeSelector) {
      displayModeSelector.value = mode;
    }
  },

  /**
   * Calculates the data index for a given time using the sampling rate.
   * @param {object} leadData - The lead data containing times and values arrays.
   * @param {number} targetTime - The target time in seconds.
   * @returns {number} The calculated data index.
   */
  calculateDataIndexForTime(leadData, targetTime) {
    if (!leadData || !leadData.times || leadData.times.length === 0) {
      console.warn("Invalid lead data provided to calculateDataIndexForTime");
      return 0;
    }

    if (typeof targetTime !== "number" || targetTime < 0) {
      console.warn(`Invalid target time: ${targetTime}`);
      return 0;
    }

    if (!this.samplingRate || this.samplingRate <= 0) {
      console.warn(`Invalid sampling rate: ${this.samplingRate}`);
      return 0;
    }

    // With a constant sampling rate, we can calculate the index directly.
    const estimatedIndex = Math.round(targetTime * this.samplingRate);
    return Math.min(estimatedIndex, leadData.times.length - 1);
  },

  /**
   * Transforms time and value data into screen coordinates.
   * @param {object} options - The transformation options.
   * @param {Array<number>} options.times - Array of time points.
   * @param {Array<number>} options.values - Array of voltage values.
   * @param {object} options.bounds - The drawing bounds.
   * @param {number} options.bounds.xOffset - Horizontal offset.
   * @param {number} options.bounds.yOffset - Vertical offset.
   * @param {number} options.bounds.width - Width of the drawing area.
   * @param {number} options.bounds.height - Height of the drawing area.
   * @param {number} options.timeSpan - The time span for the display.
   * @returns {Array<{x: number, y: number}>} Array of screen coordinates.
   */
  transformCoordinates(options) {
    if (!options || !options.times || !options.values || !options.bounds) {
      console.warn("Invalid options provided to transformCoordinates");
      return [];
    }

    const {
      times,
      values,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
    } = options;

    if (times.length !== values.length) {
      console.warn("Times and values arrays must have the same length");
      return [];
    }

    if (timeSpan <= 0 || width <= 0 || height <= 0) {
      console.warn("Invalid dimensions provided to transformCoordinates");
      return [];
    }

    const xScale = width / timeSpan;
    const yScale = height / (this.yMax - this.yMin);

    const coordinates = [];
    for (let i = 0; i < times.length; i++) {
      const x = xOffset + times[i] * xScale;
      // Apply amplitude scale to the voltage values
      const scaledValue = values[i] * this.amplitudeScale;
      const y = yOffset + height - (scaledValue - this.yMin) * yScale;
      coordinates.push({ x, y });
    }

    return coordinates;
  },
};

export default ECGPlayer;
