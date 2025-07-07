// ==================
// RENDERING CONSTANTS
// ==================
const MM_PER_SECOND = 25;
const MM_PER_MILLIVOLT = 10;
const PIXELS_PER_MM = 4;
const HEIGHT_MILLIVOLTS = 2.5;
const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM;
const WAVEFORM_LINE_WIDTH = 1.25;
const DOT_RADIUS = 1.2;

// ===============
// LAYOUT CONSTANTS
// ===============
const DEFAULT_WIDTH_SECONDS = 2.5;
const CONTAINER_PADDING = 40;
const COLUMNS_PER_DISPLAY = 4;
const ROWS_PER_DISPLAY = 3;
const COLUMN_PADDING = 0;
const ROW_PADDING = 0;
const MULTI_LEAD_HEIGHT_SCALE = 1;

// ===================
// ANIMATION CONSTANTS
// ===================
const SINGLE_LEAD_CURSOR_WIDTH = 20;
const MULTI_LEAD_CURSOR_WIDTH = 8;

const ECGPlayback = {
  // ==========================
  // INITIALIZATION & LIFECYCLE
  // ==========================

  async mounted() {
    this.initializeState();
    this.calculateMedicallyAccurateDimensions();
    this.updateThemeColors();
    this.setupEventListeners();
    await this.initializeECGChart();

    if (this.el.dataset.env !== "prod") {
      this.showDiagnostics = true;
      this.createDiagnosticsPanel();
      this.updateDiagnostics();
      this.memoryInterval = setInterval(() => this.updateMemoryStats(), 2000);
    }
  },

  /**
   * Sets up all event listeners for the component.
   * @returns {void}
   */
  setupEventListeners() {
    this.setupResizeListener();
    this.setupThemeListener();
    this.setupKeyboardListeners();
    this.setupLiveViewListeners();
  },

  /**
   * Sets up the window resize event listener.
   * @returns {void}
   */
  setupResizeListener() {
    this.resizeHandler = () => {
      this.calculateMedicallyAccurateDimensions();
      this.handleWindowResizeAndRecalculateChart();
    };
    window.addEventListener("resize", this.resizeHandler);
  },

  /**
   * Sets up a MutationObserver to watch for theme changes.
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
   * Handles the logic for when the theme changes.
   * @returns {void}
   */
  handleThemeChange() {
    this.updateThemeColors();
    this.renderGridBackground();
    if (!this.isPlaying && this.startTime && this.pausedTime) {
      const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
      const cursorProgress =
        (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
      this.processAnimationFrame(cursorProgress, animationCycle);
    }
  },

  /**
   * Sets up keyboard event listeners for playback control.
   * @returns {void}
   */
  setupKeyboardListeners() {
    this.keydownHandler = (event) => {
      switch (event.key) {
        case "j":
          event.preventDefault();
          this.switchToNextLead();
          break;
        case "k":
          event.preventDefault();
          this.switchToPrevLead();
          break;
        case " ":
          event.preventDefault();
          this.togglePlayback();
          break;
      }
    };

    this.el.setAttribute("tabindex", "0");
    this.el.style.outline = "none";

    this.focusHandler = () => {
      this.el.addEventListener("keydown", this.keydownHandler);
    };

    this.blurHandler = () => {
      this.el.removeEventListener("keydown", this.keydownHandler);
    };

    this.el.addEventListener("focus", this.focusHandler);
    this.el.addEventListener("blur", this.blurHandler);
  },

  /**
   * Sets up handlers for LiveView events.
   * @returns {void}
   */
  setupLiveViewListeners() {
    this.handleEvent("playback_changed", (payload) => {
      this.handlePlaybackChange(payload.is_playing);
    });

    this.handleEvent("lead_changed", (payload) => {
      this.handleLeadChange(payload.lead);
    });

    this.handleEvent("grid_changed", (payload) => {
      this.handleGridChange(payload.grid_type);
    });

    this.handleEvent("display_mode_changed", (payload) => {
      this.handleDisplayModeChange(payload.display_mode);
    });
  },

  destroyed() {
    this.cleanup();
  },

  /**
   * Cleans up all resources, event listeners, and observers to prevent memory leaks.
   * This is called when the component is about to be removed from the DOM.
   * @returns {void}
   */
  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    this.cleanupCanvases();
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
    }
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
    if (this.focusHandler) {
      this.el.removeEventListener("focus", this.focusHandler);
    }
    if (this.blurHandler) {
      this.el.removeEventListener("blur", this.blurHandler);
    }
    if (this.keydownHandler) {
      this.el.removeEventListener("keydown", this.keydownHandler);
    }

    // Explicitly nullify large data objects to break references
    this.ecgLeadDatasets = null;
    this.precomputedSegments = null;
    this.dataIndexCache = null;
    this.currentLeadData = null;
    this.allLeadsCursorData = null;
    this.activeCursorData = null;
    this.eventHandlers = null;
  },

  // =================
  // STATE MANAGEMENT
  // =================

  /**
   * Initializes the component's internal state from data attributes on the element.
   * Sets up default values for playback, display mode, and other properties.
   * @returns {void}
   */
  initializeState() {
    this.isPlaying = this.el.dataset.isPlaying === "true";
    this.showDiagnostics = false;
    this.lastDynamicData = {};
    this.activeSegments = [];
    this.startTime = null;
    this.pausedTime = 0;
    this.animationCycle = 0;
    this.animationId = null;
    this.cursorPosition = 0;
    this.cursorWidth = SINGLE_LEAD_CURSOR_WIDTH;
    this.activeCursorData = null;
    this.allLeadsCursorData = null;
    this.gridType = this.el.dataset.gridType || "medical";
    this.displayMode = this.el.dataset.displayMode || "single";
    this.currentLead = parseInt(this.el.dataset.currentLead) || 0;
    this.leadHeight = CHART_HEIGHT;
    this.memory = {};

    // Pre-computed data segments for performance
    this.precomputedSegments = new Map();
    this.segmentDuration = 0.1; // 100ms segments
    this.dataIndexCache = new Map();

    // Canvas layers for optimized rendering
    this.backgroundCanvas = null;
    this.backgroundContext = null;
    this.waveformCanvas = null;
    this.waveformContext = null;
  },

  // =================
  // DIAGNOSTICS
  // =================

  /**
   * Asynchronously updates memory statistics using available performance APIs.
   * It first tries the modern `measureUserAgentSpecificMemory` for a comprehensive,
   * cross-origin-isolated measurement. If unavailable, it falls back to the
   * deprecated `performance.memory` API, which is less accurate but still useful
   * for basic diagnostics in supporting browsers.
   *
   * The results are stored in `this.memory` and the diagnostics panel is updated.
   * @returns {Promise<void>}
   */
  async updateMemoryStats() {
    if (
      window.crossOriginIsolated &&
      "measureUserAgentSpecificMemory" in performance
    ) {
      try {
        const measurement = await performance.measureUserAgentSpecificMemory();
        this.memory = {
          usedJSHeapSize: measurement.bytes,
          // The new API doesn't provide total or limit, so we leave them undefined.
        };
      } catch (error) {
        console.error("Failed to measure memory:", error);
        this.memory = { error: "Measurement failed" };
      }
    } else if ("memory" in performance) {
      this.memory = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      };
    } else {
      this.memory = { error: "Not supported" };
    }
    this.updateDiagnostics();
  },

  createDiagnosticsPanel() {
    const existingPanel = document.getElementById("diagnostics-panel");
    if (existingPanel) return;

    const panel = document.createElement("div");
    panel.id = "diagnostics-panel";
    panel.className =
      "mt-4 p-4 bg-base-200 rounded-lg text-sm font-mono grid grid-cols-3 justify-start gap-4";
    panel.innerHTML = `
      <div id="diagnostics-col1" class="col-span-1"></div>
      <div id="diagnostics-col2" class="col-span-1"></div>
      <div id="diagnostics-col3" class="col-span-1"></div>
    `;
    this.el.appendChild(panel);
  },

  destroyDiagnosticsPanel() {
    const panel = document.getElementById("diagnostics-panel");
    if (panel) {
      panel.remove();
    }
  },

  /**
   * Updates the on-screen diagnostics panel with the latest data.
   * @param {object} dynamicData - The dynamic data to display (defaults to this.lastDynamicData).
   * @returns {void}
   */
  updateDiagnostics(dynamicData = this.lastDynamicData) {
    if (!this.showDiagnostics) return;

    const col1 = document.querySelector("#diagnostics-col1");
    const col2 = document.querySelector("#diagnostics-col2");
    const col3 = document.querySelector("#diagnostics-col3");

    if (!col1 || !col2 || !col3) return;

    const groupsCol1 = {
      Configuration: {
        displayMode: this.displayMode,
        gridType: this.gridType,
      },
      "ECG Paper Standards": {
        mmPerSecond: MM_PER_SECOND,
        mmPerMillivolt: MM_PER_MILLIVOLT,
        pixelsPerMm: PIXELS_PER_MM,
      },
    };

    const groupsCol2 = {
      "Data & Dimensions": {
        chartWidth: this.chartWidth,
        widthSeconds: this.widthSeconds,
        totalDuration: this.totalDuration,
        samplingRate: this.samplingRate,
        totalSegments:
          this.precomputedSegments.get(this.currentLead)?.size || 0,
      },
    };

    if (this.memory) {
      const memoryData = {};
      if (this.memory.error) {
        memoryData.status = this.memory.error;
      } else {
        if (this.memory.usedJSHeapSize) {
          memoryData.usedJSHeapSize = `${(
            this.memory.usedJSHeapSize / 1048576
          ).toFixed(2)} MB`;
        }
        if (this.memory.totalJSHeapSize) {
          memoryData.totalJSHeapSize = `${(
            this.memory.totalJSHeapSize / 1048576
          ).toFixed(2)} MB`;
        }
        if (this.memory.jsHeapSizeLimit) {
          memoryData.jsHeapSizeLimit = `${(
            this.memory.jsHeapSizeLimit / 1048576
          ).toFixed(2)} MB`;
        }
      }
      groupsCol2["Memory"] = memoryData;
    }

    const groupsCol3 = {
      "Playback & Animation": {
        isPlaying: this.isPlaying,
        currentLead: this.leadNames[this.currentLead],
        animationCycle: dynamicData.animationCycle,
        elapsedTime: dynamicData.elapsedTime,
        cursorProgress: dynamicData.cursorProgress,
        cursorPosition: dynamicData.cursorPosition,
        localCursorPosition:
          this.displayMode === "multi" ? dynamicData.localCursorPosition : null,
      },
      "Real-time Rendering": {
        activeSegments: this.activeSegments.length,
        activePoints: dynamicData.activePoints,
        totalActiveLeads: dynamicData.totalActiveLeads,
        activePointsPerLead: dynamicData.activePointsPerLead,
      },
    };

    const units = {
      chartWidth: "px",
      widthSeconds: "s",
      totalDuration: "s",
      samplingRate: "Hz",
      elapsedTime: "s",
      cursorPosition: "px",
      localCursorPosition: "px",
      mmPerSecond: "mm/s",
      mmPerMillivolt: "mm/mV",
      pixelsPerMm: "px/mm",
    };

    const formatGrouped = (groups) => {
      return Object.entries(groups)
        .map(([groupName, values]) => {
          const valueHTML = Object.entries(values)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => {
              let displayValue;
              if (key === "cursorProgress") {
                displayValue = `${((value || 0) * 100).toFixed(0)}%`;
              } else if (
                typeof value === "string" &&
                (value.endsWith("MB") || !isNaN(parseFloat(value)))
              ) {
                displayValue = value;
              } else if (typeof value === "number") {
                displayValue = `${value.toFixed(2)}${
                  units[key] ? ` ${units[key]}` : ""
                }`;
              } else {
                displayValue = value;
              }
              return `<div><strong class="opacity-70">${key}:</strong> ${displayValue}</div>`;
            })
            .join("");

          if (valueHTML.trim() === "") return "";

          return `
            <div class="mt-4">
              <h4 class="font-bold text-xs uppercase tracking-wider">${groupName}</h4>
              ${valueHTML}
            </div>
          `;
        })
        .join("");
    };

    col1.innerHTML = formatGrouped(groupsCol1);
    col2.innerHTML = formatGrouped(groupsCol2);
    col3.innerHTML = formatGrouped(groupsCol3);
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
   * @param {number} leadIndex - The index of the ECG lead.
   * @returns {{xOffset: number, yOffset: number, columnWidth: number}} The position and width for the lead.
   */
  calculateLeadGridCoordinates(leadIndex) {
    const { column, row } = this.getLeadColumnAndRow(leadIndex);
    const totalColumnPadding = (COLUMNS_PER_DISPLAY - 1) * COLUMN_PADDING;
    const columnWidth =
      (this.chartWidth - totalColumnPadding) / COLUMNS_PER_DISPLAY;

    const xOffset = column * (columnWidth + COLUMN_PADDING);
    const yOffset = row * (this.leadHeight + ROW_PADDING);

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
  updateThemeColors() {
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

  // ========================
  // DATA LOADING & SETUP
  // ========================

  /**
   * Orchestrates the entire setup process: loads data, calculates dimensions,
   * creates canvases, and renders the initial view.
   * @returns {Promise<void>}
   */
  async initializeECGChart() {
    this.currentLeadData = await this.loadECGData();
    if (!this.widthSeconds) {
      this.calculateMedicallyAccurateDimensions();
    }
    this.recreateCanvas();
    this.renderGridBackground();
  },

  /**
   * Fetches the ECG data from a JSON file, parses it, and stores it in memory.
   * It separates the raw signal into individual datasets for each lead.
   * @returns {Promise<object>} The dataset for the initially selected lead.
   */
  async loadECGData() {
    const response = await fetch("/assets/json/ptb-xl/09436_hr.json");
    if (!response.ok) {
      throw new Error(`Failed to load ECG data: ${response.status}`);
    }

    const data = await response.json();

    if (!data.fs || !data.sig_name || !data.p_signal) {
      throw new Error("Invalid ECG data format");
    }

    this.samplingRate = data.fs;
    this.leadNames = data.sig_name;
    this.totalDuration = data.p_signal.length / data.fs;

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

    return this.currentLeadData;
  },

  // ===================
  // CANVAS & DIMENSIONS
  // ===================

  /**
   * Calculates the chart's width in pixels based on standard medical units (mm/second).
   * This ensures the visualization is medically accurate and scales correctly with the container.
   * @returns {void}
   */
  calculateMedicallyAccurateDimensions() {
    const container = this.el.querySelector("[data-ecg-chart]");
    if (!container) {
      this.chartWidth = DEFAULT_WIDTH_SECONDS * MM_PER_SECOND * PIXELS_PER_MM;
      this.widthSeconds = DEFAULT_WIDTH_SECONDS;
      return;
    }

    const containerWidth = container.offsetWidth - CONTAINER_PADDING;
    const minWidth = DEFAULT_WIDTH_SECONDS * MM_PER_SECOND * PIXELS_PER_MM;

    if (containerWidth < minWidth) {
      this.chartWidth = minWidth;
      this.widthSeconds = DEFAULT_WIDTH_SECONDS;
    } else {
      this.widthSeconds = containerWidth / (MM_PER_SECOND * PIXELS_PER_MM);
      this.chartWidth = this.widthSeconds * MM_PER_SECOND * PIXELS_PER_MM;
    }
  },

  /**
   * Creates and configures the dual-canvas system for rendering.
   * A background canvas is used for the static grid, and a foreground canvas
   * is used for the animated waveform to optimize performance.
   * @returns {void}
   */
  recreateCanvas() {
    this.cleanupCanvases();

    const canvasHeight =
      this.displayMode === "multi"
        ? ROWS_PER_DISPLAY * (CHART_HEIGHT / MULTI_LEAD_HEIGHT_SCALE) +
          (ROWS_PER_DISPLAY - 1) * ROW_PADDING
        : CHART_HEIGHT;

    this.leadHeight =
      this.displayMode === "multi"
        ? CHART_HEIGHT / MULTI_LEAD_HEIGHT_SCALE
        : CHART_HEIGHT;

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
  },

  /**
   * Removes the canvas elements from the DOM to prevent memory leaks.
   * @returns {void}
   */
  cleanupCanvases() {
    if (this.backgroundCanvas) {
      this.backgroundCanvas.remove();
      this.backgroundCanvas = null;
      this.backgroundContext = null;
    }
    if (this.waveformCanvas) {
      this.waveformCanvas.remove();
      this.waveformCanvas = null;
      this.waveformContext = null;
    }
  },

  // ==============
  // EVENT HANDLERS
  // ==============

  /**
   * Handles window resize events by recalculating dimensions and redrawing the chart,
   * preserving the current playback state.
   * @returns {void}
   */
  handleWindowResizeAndRecalculateChart() {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopAnimation();

    this.recreateCanvas();
    this.renderGridBackground();

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
   * Responds to `playback_changed` events from the server to play or pause the animation.
   * @param {boolean} isPlaying - The new playback state.
   * @returns {void}
   */
  handlePlaybackChange(isPlaying) {
    this.isPlaying = isPlaying;
    if (isPlaying) {
      this.resumeAnimation();
    } else {
      this.pauseAnimation();
    }
  },

  /**
   * Responds to `lead_changed` events from the server to switch the displayed lead.
   * @param {number} leadIndex - The index of the new lead to display.
   * @returns {void}
   */
  handleLeadChange(leadIndex) {
    if (
      !isNaN(leadIndex) &&
      this.ecgLeadDatasets &&
      leadIndex >= 0 &&
      leadIndex < this.ecgLeadDatasets.length
    ) {
      this.switchLead(leadIndex);
    }
  },

  /**
   * Responds to `grid_changed` events to toggle between medical and simple grid styles.
   * @param {string} gridType - The new grid type ("medical" or "simple").
   * @returns {void}
   */
  handleGridChange(gridType) {
    if (gridType === "medical" || gridType === "simple") {
      this.gridType = gridType;
      this.renderGridBackground();
    }
  },

  /**
   * Responds to `display_mode_changed` events to switch between single and multi-lead views.
   * @param {string} displayMode - The new display mode ("single" or "multi").
   * @returns {void}
   */
  handleDisplayModeChange(displayMode) {
    if (displayMode === "single" || displayMode === "multi") {
      const wasPlaying = this.isPlaying;
      if (wasPlaying) this.stopAnimation();

      this.displayMode = displayMode;
      this.recreateCanvas();
      this.renderGridBackground();

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
    }
  },

  // =================
  // UTILITY FUNCTIONS
  // =================

  /**
   * Calculates the index in the data array that corresponds to a specific time.
   * Uses a direct O(1) calculation based on the constant sampling rate for high performance.
   * @param {object} leadData - The dataset for a single lead.
   * @param {number} targetTime - The time in seconds to calculate the index for.
   * @returns {number} The closest index in the data array for the given time.
   */
  calculateDataIndexForTime(leadData, targetTime) {
    if (!leadData || !leadData.times.length) {
      return 0;
    }

    // With a constant sampling rate, we can calculate the index directly.
    const estimatedIndex = Math.round(targetTime * this.samplingRate);
    return Math.min(estimatedIndex, leadData.times.length - 1);
  },

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
   * Retrieves a single pre-computed data segment for a given lead and time.
   * @param {number} leadIndex - The index of the ECG lead.
   * @param {number} time - The time in seconds.
   * @returns {object | null} The pre-computed segment, or null if not found.
   */
  getPrecomputedSegment(leadIndex, time) {
    const leadSegments = this.precomputedSegments.get(leadIndex);
    if (!leadSegments) return null;

    const segmentKey = Math.floor(time / this.segmentDuration);
    return leadSegments.get(segmentKey) || null;
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

  // ==============
  // LEAD SWITCHING
  // ==============

  /**
   * Switches the view to a different ECG lead.
   * @param {number} leadIndex - The index of the lead to switch to.
   * @returns {void}
   */
  switchLead(leadIndex) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopAnimation();

    this.currentLead = leadIndex;
    this.currentLeadData = this.ecgLeadDatasets[leadIndex];

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

  /**
   * Switches to the next lead in the list and notifies the server.
   * @returns {void}
   */
  switchToNextLead() {
    if (!this.ecgLeadDatasets || this.ecgLeadDatasets.length === 0) return;

    if (this.currentLead < this.ecgLeadDatasets.length - 1) {
      const nextLead = this.currentLead + 1;
      this.switchLead(nextLead);

      this.pushEvent("lead_changed", { lead: nextLead });
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

      this.pushEvent("lead_changed", { lead: prevLead });
    }
  },

  // ================
  // PLAYBACK CONTROL
  // ================

  /**
   * Toggles the playback state between playing and paused and notifies the server.
   * @returns {void}
   */
  togglePlayback() {
    const newPlayingState = !this.isPlaying;
    this.isPlaying = newPlayingState;

    this.pushEvent("playback_changed", { is_playing: newPlayingState });

    if (newPlayingState) {
      this.resumeAnimation();
    } else {
      this.pauseAnimation();
    }
  },

  // =====================
  // DATA TRANSFORMATION
  // =====================

  /**
   * This is the core data processing function called on every animation frame.
   * It calculates the current playback time, determines which data is needed,
   * and triggers the rendering of the waveform.
   * @param {number} cursorProgress - The cursor's progress (0 to 1) across the current screen.
   * @param {number} animationCycle - How many times the animation has looped over the screen.
   * @returns {void}
   */
  processAnimationFrame(cursorProgress, animationCycle) {
    let elapsedTime =
      animationCycle * this.widthSeconds + cursorProgress * this.widthSeconds;

    if (elapsedTime >= this.totalDuration) {
      this.pushEvent("playback_ended", {});
      this.stopAnimation();
      this.resetPlayback();
      return;
    }

    this.calculateCursorPosition(elapsedTime);

    if (this.displayMode === "single") {
      this.loadVisibleDataForSingleLead(elapsedTime);
    } else {
      this.loadVisibleDataForAllLeads(elapsedTime);
    }

    this.renderCurrentDisplayMode();

    if (this.showDiagnostics) {
      let segmentsInfo = {};
      if (this.displayMode === "single") {
        segmentsInfo = {
          activePoints: this.activeCursorData?.values.length || 0,
        };
      } else {
        segmentsInfo = {
          activePointsPerLead: this.allLeadsCursorData?.[0]?.values.length || 0,
          totalActiveLeads: this.allLeadsCursorData?.length || 0,
        };
      }

      this.lastDynamicData = {
        elapsedTime,
        cursorProgress,
        animationCycle,
        cursorPosition: this.cursorPosition,
        ...segmentsInfo,
      };
      this.updateDiagnostics();
    }
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

  // =================
  // ANIMATION CONTROL
  // =================

  /**
   * Starts the animation from the beginning.
   * @returns {void}
   */
  startAnimation() {
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

    this.clearWaveform();
  },

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
   * Draws the grid for a single lead, dispatching to either the medical or simple grid style.
   * @param {number} xOffset - The horizontal starting position.
   * @param {number} yOffset - The vertical starting position.
   * @param {number} width - The width of the grid.
   * @param {number} height - The height of the grid.
   * @param {CanvasRenderingContext2D} context - The canvas context to draw on.
   * @returns {void}
   */
  drawLeadGrid(
    xOffset,
    yOffset,
    width,
    height,
    context = this.waveformContext
  ) {
    if (this.gridType === "medical") {
      this.drawMedicalGrid(xOffset, yOffset, width, height, context);
    } else {
      this.drawSimpleGrid(xOffset, yOffset, width, height, context);
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
    context.fillStyle = this.colors.labels;
    context.font = "12px Arial";
    context.fillText(this.leadNames[leadIndex], xOffset + 5, yOffset + 15);
  },

  /**
   * Draws a standard medical ECG grid with major and minor lines.
   * @param {number} xOffset - The horizontal starting position.
   * @param {number} yOffset - The vertical starting position.
   * @param {number} width - The width of the grid.
   * @param {number} height - The height of the grid.
   * @param {CanvasRenderingContext2D} context - The canvas context to draw on.
   * @returns {void}
   */
  drawMedicalGrid(
    xOffset,
    yOffset,
    width,
    height,
    context = this.waveformContext
  ) {
    const smallSquareSize = PIXELS_PER_MM;
    const largeSquareSize = 5 * PIXELS_PER_MM;

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
   * @param {number} xOffset - The horizontal starting position.
   * @param {number} yOffset - The vertical starting position.
   * @param {number} width - The width of the grid.
   * @param {number} height - The height of the grid.
   * @param {CanvasRenderingContext2D} context - The canvas context to draw on.
   * @returns {void}
   */
  drawSimpleGrid(
    xOffset,
    yOffset,
    width,
    height,
    context = this.waveformContext
  ) {
    const dotSpacing = 5 * PIXELS_PER_MM;
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
  renderCurrentDisplayMode() {
    if (this.displayMode === "single") {
      this.drawSingleLeadCursor();
    } else {
      this.drawMultiLeadCursor();
    }
  },

  // ==============================
  // RENDERING - CANVAS OPERATIONS
  // ==============================

  /**
   * Transforms time and value arrays to canvas coordinates.
   * @param {Array<number>} times - Array of time points.
   * @param {Array<number>} values - Array of millivolt values.
   * @param {number} xOffset - The horizontal starting position.
   * @param {number} yOffset - The vertical starting position.
   * @param {number} width - The width of the drawing area.
   * @param {number} height - The height of the drawing area.
   * @param {number} timeSpan - The total duration shown in this area (in seconds).
   * @returns {Array<{x: number, y: number}>} Array of canvas coordinates.
   */
  transformCoordinates(times, values, xOffset, yOffset, width, height, timeSpan) {
    const xScale = width / timeSpan;
    const yScale = height / (this.yMax - this.yMin);
    
    const coordinates = [];
    for (let i = 0; i < times.length; i++) {
      const x = xOffset + times[i] * xScale;
      const y = yOffset + height - (values[i] - this.yMin) * yScale;
      coordinates.push({ x, y });
    }
    
    return coordinates;
  },

  /**
   * Sets up canvas context for waveform drawing.
   * @param {CanvasRenderingContext2D} context - The canvas context to setup.
   * @returns {void}
   */
  setupWaveformDrawing(context = this.waveformContext) {
    context.strokeStyle = this.colors.waveform;
    context.lineWidth = WAVEFORM_LINE_WIDTH;
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
   * @param {Array<number>} times - Array of time points for the waveform segment.
   * @param {Array<number>} values - Array of millivolt values for the waveform segment.
   * @param {number} xOffset - The horizontal starting position of the lead's grid.
   * @param {number} yOffset - The vertical starting position of the lead's grid.
   * @param {number} width - The total width of the lead's grid.
   * @param {number} height - The total height of the lead's grid.
   * @param {number} timeSpan - The total duration shown in this grid (in seconds).
   * @param {number} cursorPosition - The current horizontal pixel position of the cursor.
   * @param {number} cursorWidth - The width of the area to clear ahead of the cursor.
   * @returns {void}
   */
  drawWaveformToCursor(
    times,
    values,
    xOffset,
    yOffset,
    width,
    height,
    timeSpan,
    cursorPosition,
    cursorWidth
  ) {
    if (!times || times.length === 0) return;

    const { clearX, clearWidth } = this.calculateClearBounds(xOffset, width, cursorPosition, cursorWidth);

    if (clearWidth > 0) {
      this.clearCursorArea(clearX, clearWidth);
    }

    this.setupWaveformDrawing();
    
    const coordinates = this.transformCoordinates(times, values, xOffset, yOffset, width, height, timeSpan);

    let hasMovedTo = false;
    for (const { x, y } of coordinates) {
      if (x <= cursorPosition) {
        if (!hasMovedTo) {
          this.waveformContext.moveTo(x, y);
          hasMovedTo = true;
        } else {
          this.waveformContext.lineTo(x, y);
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
  drawSingleLeadCursor() {
    if (!this.activeCursorData || this.activeCursorData.times.length === 0)
      return;

    const cursorClearWidth = SINGLE_LEAD_CURSOR_WIDTH;
    const cursorData = {
      times: this.activeCursorData.times,
      values: this.activeCursorData.values,
      cursorPosition: this.cursorPosition,
      cursorWidth: cursorClearWidth,
    };

    this.renderLead(
      this.currentLead,
      null,
      0,
      0,
      this.chartWidth,
      CHART_HEIGHT,
      this.widthSeconds,
      cursorData
    );
  },

  /**
   * Orchestrates drawing the animated cursors for all 12 leads in the multi-lead view.
   * @returns {void}
   */
  drawMultiLeadCursor() {
    if (!this.allLeadsCursorData || this.allLeadsCursorData.length === 0)
      return;

    for (const leadData of this.allLeadsCursorData) {
      const { xOffset, yOffset, columnWidth } = this.calculateLeadGridCoordinates(
        leadData.leadIndex
      );

      const columnTimeSpan = this.widthSeconds / COLUMNS_PER_DISPLAY;
      const columnProgress =
        (this.cursorPosition / this.chartWidth) *
        (this.widthSeconds / columnTimeSpan);
      const localCursorPosition = xOffset + (columnProgress % 1) * columnWidth;

      const cursorClearWidth = MULTI_LEAD_CURSOR_WIDTH;
      const cursorData = {
        times: leadData.times,
        values: leadData.values,
        cursorPosition: localCursorPosition,
        cursorWidth: cursorClearWidth,
      };

      this.renderLeadWaveform(
        leadData.leadIndex,
        null,
        xOffset,
        yOffset,
        columnWidth,
        this.leadHeight,
        columnTimeSpan,
        cursorData
      );
    }
  },

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
    this.drawLeadGrid(xOffset, yOffset, width, height, context);
    this.drawLeadLabel(leadIndex, xOffset, yOffset, context);
  },

  /**
   * Renders waveform data for a single lead on the foreground canvas. It handles drawing either
   * a static waveform or an animated cursor-driven waveform. The background grid is assumed to be 
   * already rendered on the background canvas.
   * @param {number} _leadIndex - The index of the lead (used for context).
   * @param {object} leadData - The full dataset for the lead (for static drawing).
   * @param {number} xOffset - The horizontal starting position.
   * @param {number} yOffset - The vertical starting position.
   * @param {number} width - The width of the lead's grid.
   * @param {number} height - The height of the lead's grid.
   * @param {number} timeSpan - The total duration shown in this grid (in seconds).
   * @param {object} cursorData - Data for drawing the animated cursor. If null, a static waveform is drawn.
   * @returns {void}
   */
  renderLeadWaveform(
    _leadIndex,
    leadData,
    xOffset,
    yOffset,
    width,
    height,
    timeSpan,
    cursorData = null
  ) {
    // Background is already rendered on the background canvas
    // Only draw waveform data on the foreground canvas

    if (cursorData) {
      this.drawWaveformToCursor(
        cursorData.times,
        cursorData.values,
        xOffset,
        yOffset,
        width,
        height,
        timeSpan,
        cursorData.cursorPosition,
        cursorData.cursorWidth
      );
    } else if (leadData && leadData.times && leadData.values) {
      this.drawLeadWaveform(
        leadData.times,
        leadData.values,
        xOffset,
        yOffset,
        width,
        height,
        timeSpan
      );
    }
  },

  /**
   * Renders the entire grid background for the current display mode.
   * This function draws to the background canvas only, which is a key performance
   * optimization as the grid does not need to be redrawn on every animation frame.
   * @returns {void}
   */
  renderGridBackground() {
    if (!this.backgroundCanvas || !this.backgroundContext) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.backgroundCanvas.height / devicePixelRatio;

    // Clear and render to background canvas only
    this.backgroundContext.clearRect(0, 0, this.chartWidth, canvasHeight);

    // Render grid directly to background context
    if (this.displayMode === "multi") {
      for (let i = 0; i < this.leadNames.length; i++) {
        const { xOffset, yOffset, columnWidth } = this.calculateLeadGridCoordinates(i);
        this.renderLeadBackground(
          i,
          xOffset,
          yOffset,
          columnWidth,
          this.leadHeight,
          this.backgroundContext
        );
      }
    } else {
      this.renderLeadBackground(
        this.currentLead,
        0,
        0,
        this.chartWidth,
        CHART_HEIGHT,
        this.backgroundContext
      );
    }
  },

  /**
   * Draws a complete, static waveform for a given lead.
   * @param {Array<number>} times - Array of time points.
   * @param {Array<number>} values - Array of millivolt values.
   * @param {number} xOffset - The horizontal starting position.
   * @param {number} yOffset - The vertical starting position.
   * @param {number} width - The width of the drawing area.
   * @param {number} height - The height of the drawing area.
   * @param {number} timeSpan - The total duration shown in this area (in seconds).
   * @returns {void}
   */
  drawLeadWaveform(times, values, xOffset, yOffset, width, height, timeSpan) {
    if (times.length === 0) return;

    this.setupWaveformDrawing();
    
    const coordinates = this.transformCoordinates(times, values, xOffset, yOffset, width, height, timeSpan);

    let hasMovedTo = false;
    for (const { x, y } of coordinates) {
      if (!hasMovedTo) {
        this.waveformContext.moveTo(x, y);
        hasMovedTo = true;
      } else {
        this.waveformContext.lineTo(x, y);
      }
    }

    this.waveformContext.stroke();
  },
};

export default ECGPlayback;
