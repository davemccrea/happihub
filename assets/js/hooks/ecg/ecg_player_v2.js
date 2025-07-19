// @ts-check

import { createActor } from "xstate";
import { ecgPlayerMachine } from "./ecg_player_machine";
import {
  calipersListener,
  currentLeadListener,
  displayModeListener,
  gridTypeListener,
  keydownListener,
  loopListener,
  playPauseButtonListener,
  qrsIndicatorListener,
} from "./listeners";

const MM_PER_SECOND = 25;
const MM_PER_MILLIVOLT = 10;
const PIXELS_PER_MM = 6;
const HEIGHT_MILLIVOLTS = 2.5;
const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM;
const DEFAULT_WIDTH_SECONDS = 2.5;
const CONTAINER_PADDING = 0;
const ROWS_PER_DISPLAY = 3;
const MULTI_LEAD_HEIGHT_SCALE = 0.8;

const ECGPlayerV2 = {
  mounted() {
    this.listeners = new Set();

    this.actor = createActor(
      ecgPlayerMachine.provide({
        actions: {
          setupLiveViewEventHandlers:
            this.setupLiveViewEventHandlers.bind(this),
          setupEventListeners: this.setupEventListeners.bind(this),
          calculateDimensions: this.calculateDimensions.bind(this),
          initializeCanvases: this.initializeCanvases.bind(this),
          destroyCanvases: this.destroyCanvases.bind(this),
          renderGridBackground: this.renderGridBackground.bind(this),
          initializeThemeColors: this.initializeThemeColors.bind(this),
          onLeadChanged: this.onLeadChanged.bind(this),
          setButtonToPlay: this.setButtonToPlay.bind(this),
          setButtonToPause: this.setButtonToPause.bind(this),
        },
      }),
      {
        input: {
          gridType: this.readFormValue("grid-type-selector"),
          displayMode: this.readFormValue("display-mode-selector"),
          currentLead: parseInt(this.readFormValue("lead-selector")),
          heightScale: parseFloat(this.readFormValue("height-scale-slider")),
          gridScale: parseFloat(this.readFormValue("grid-scale-slider")),
          amplitudeScale: parseFloat(this.readFormValue("amplitude-scale-slider")),
          loopPlayback: this.readFormCheckbox("loop-checkbox"),
          qrsIndicator: this.readFormCheckbox("qrs-indicator-checkbox"),
          calipersEnabled: false, // Calipers start disabled, controlled by button not form
        },
      }
    );

    this.actor.start();

    // Debug subscription - remove in production
    this.debugSubscription = this.actor.subscribe((snapshot) => {
      console.log("🎛️ ECG Player State Change:", {
        state: snapshot.value,
        isPlaying: snapshot.matches({ playback: "playing" }),
        context: snapshot.context,
        event: snapshot.event?.type,
        timestamp: new Date().toISOString(),
      });
    });
  },

  destroyed() {
    // Clean up debug subscription
    if (this.debugSubscription) {
      this.debugSubscription.unsubscribe();
    }

    // Clean up all tracked listeners
    this.listeners.forEach((cleanup) => cleanup());
    this.listeners.clear();
    this.actor.stop();
  },

  setupLiveViewEventHandlers() {
    this.handleEvent("load_ecg_data", (payload) => {
      try {
        const data = payload.data;
        if (!data.fs || !data.sig_name || !data.p_signal) {
          return this.actor.send({
            type: "ERROR",
            message: "Invalid ECG data format",
          });
        }

        this.actor.send({
          type: "DATA_LOADED",
          data: this.processECGData(data),
        });
      } catch (error) {
        this.actor.send({ type: "ERROR", message: error.message });
      }
    });
  },

  setButtonToPlay() {
    const button = document.getElementById("play-pause-button");
    if (button) {
      const iconHtml = `<svg class="w-4 h-4 hero-play" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" /></svg>`;
      const textHtml = `<span class="ml-1">Play</span>`;
      button.innerHTML = iconHtml + textHtml;
    }
  },

  setButtonToPause() {
    const button = document.getElementById("play-pause-button");
    if (button) {
      const iconHtml = `<svg class="w-4 h-4 hero-pause" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" /></svg>`;
      const textHtml = `<span class="ml-1">Pause</span>`;
      button.innerHTML = iconHtml + textHtml;
    }
  },

  setupEventListeners() {
    this.addListener(keydownListener.bind(this));
    this.addListener(playPauseButtonListener.bind(this));
    this.addListener(calipersListener.bind(this));
    this.addListener(currentLeadListener.bind(this));
    this.addListener(displayModeListener.bind(this));
    this.addListener(gridTypeListener.bind(this));
    this.addListener(loopListener.bind(this));
    this.addListener(qrsIndicatorListener.bind(this));
  },

  processECGData(data) {
    const samplingRate = data.fs;
    const leadNames = data.sig_name;
    const totalDuration = data.p_signal.length / data.fs;
    const qrsIndexes = data.qrs || [];
    const qrsTimestamps = qrsIndexes.map((index) => index / samplingRate);
    const ecgLeadDatasets = [];
    let globalMin = Infinity;
    let globalMax = -Infinity;

    for (let leadIndex = 0; leadIndex < leadNames.length; leadIndex++) {
      const times = [];
      const values = [];

      for (
        let sampleIndex = 0;
        sampleIndex < data.p_signal.length;
        sampleIndex++
      ) {
        const time = sampleIndex / samplingRate;
        const value = data.p_signal[sampleIndex][leadIndex];

        times.push(time);
        values.push(value);

        if (value < globalMin) globalMin = value;
        if (value > globalMax) globalMax = value;
      }

      ecgLeadDatasets.push({ times, values });
    }

    return {
      samplingRate,
      leadNames,
      totalDuration,
      qrsIndexes,
      qrsTimestamps,
      ecgLeadDatasets,
      globalMin,
      globalMax,
      yMin: -HEIGHT_MILLIVOLTS / 2,
      yMax: HEIGHT_MILLIVOLTS / 2,
    };
  },

  readFormValue(id) {
    const element = document.getElementById(id);
    if (!element) {
      console.error(`Form element #${id} not found`);
      return null;
    }
    return element.value;
  },

  readFormCheckbox(id) {
    const element = document.getElementById(id);
    if (!element) {
      console.error(`Form checkbox #${id} not found`);
      return false;
    }
    return element.checked;
  },

  calculateDimensions() {
    const { context } = this.actor.getSnapshot();
    const container = this.el.querySelector("[data-ecg-chart]");
    const containerWidth = container.offsetWidth - CONTAINER_PADDING;
    const scaledPixelsPerMm = PIXELS_PER_MM * context.display.gridScale;
    const minWidth = DEFAULT_WIDTH_SECONDS * MM_PER_SECOND * scaledPixelsPerMm;

    if (containerWidth < minWidth) {
      this.chartWidth = minWidth;
      this.widthSeconds = DEFAULT_WIDTH_SECONDS;
    } else {
      this.widthSeconds = containerWidth / (MM_PER_SECOND * scaledPixelsPerMm);
      this.chartWidth = this.widthSeconds * MM_PER_SECOND * scaledPixelsPerMm;
    }
  },

  // =================
  // LEAD NAVIGATION
  // =================

  getNextLeadIndex() {
    const { context } = this.actor.getSnapshot();
    if (!context.ecgData?.leadNames) return 0;
    return (context.display.currentLead + 1) % context.ecgData.leadNames.length;
  },

  getPreviousLeadIndex() {
    const { context } = this.actor.getSnapshot();
    if (!context.ecgData?.leadNames) return 0;
    return context.display.currentLead === 0
      ? context.ecgData.leadNames.length - 1
      : context.display.currentLead - 1;
  },

  onLeadChanged({ event }) {
    const { leadIndex } = event;

    // Handle side effects (DOM updates)
    const leadSelect = this.el.querySelector('[name="current_lead"]');
    if (leadSelect) {
      leadSelect.value = leadIndex.toString();
    }

    // TODO: implement rendering
  },

  // =================
  // CANVAS MANAGEMENT
  // =================

  /**
   * Initializes the canvas system for ECG rendering.
   * Creates 4 overlapping canvas layers: background, waveform, QRS flash, and calipers.
   */
  initializeCanvases() {
    const { context } = this.actor.getSnapshot();

    // Get display settings from machine state
    const { displayMode, heightScale } = context.display;
    const { enabled: calipersEnabled } = context.calipers;

    const canvasHeight =
      displayMode === "multi"
        ? ROWS_PER_DISPLAY *
          ((CHART_HEIGHT * heightScale) / MULTI_LEAD_HEIGHT_SCALE)
        : CHART_HEIGHT * heightScale;

    this.leadHeight =
      displayMode === "multi"
        ? (CHART_HEIGHT * heightScale) / MULTI_LEAD_HEIGHT_SCALE
        : CHART_HEIGHT * heightScale;

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

    // Create waveform canvas (overlapping)
    this.waveformCanvas = document.createElement("canvas");
    this.waveformCanvas.width = this.chartWidth * devicePixelRatio;
    this.waveformCanvas.height = canvasHeight * devicePixelRatio;
    this.waveformCanvas.style.width = this.chartWidth + "px";
    this.waveformCanvas.style.height = canvasHeight + "px";
    this.waveformCanvas.style.display = "block";
    this.waveformCanvas.style.marginTop = `-${canvasHeight}px`;
    this.waveformCanvas.style.pointerEvents = "none";
    container.appendChild(this.waveformCanvas);

    this.waveformContext = this.waveformCanvas.getContext("2d");
    this.waveformContext.scale(devicePixelRatio, devicePixelRatio);

    // Create QRS flash canvas
    this.qrsFlashCanvas = document.createElement("canvas");
    this.qrsFlashCanvas.width = this.chartWidth * devicePixelRatio;
    this.qrsFlashCanvas.height = canvasHeight * devicePixelRatio;
    this.qrsFlashCanvas.style.width = this.chartWidth + "px";
    this.qrsFlashCanvas.style.height = canvasHeight + "px";
    this.qrsFlashCanvas.style.display = "block";
    this.qrsFlashCanvas.style.marginTop = `-${canvasHeight}px`;
    this.qrsFlashCanvas.style.pointerEvents = "none";
    container.appendChild(this.qrsFlashCanvas);

    this.qrsFlashContext = this.qrsFlashCanvas.getContext("2d");
    this.qrsFlashContext.scale(devicePixelRatio, devicePixelRatio);

    // Create calipers canvas
    this.calipersCanvas = document.createElement("canvas");
    this.calipersCanvas.width = this.chartWidth * devicePixelRatio;
    this.calipersCanvas.height = canvasHeight * devicePixelRatio;
    this.calipersCanvas.style.width = this.chartWidth + "px";
    this.calipersCanvas.style.height = canvasHeight + "px";
    this.calipersCanvas.style.display = "block";
    this.calipersCanvas.style.marginTop = `-${canvasHeight}px`;
    this.calipersCanvas.style.pointerEvents = calipersEnabled ? "auto" : "none";
    this.calipersCanvas.style.cursor = calipersEnabled
      ? "crosshair"
      : "default";
    container.appendChild(this.calipersCanvas);

    this.calipersContext = this.calipersCanvas.getContext("2d");
    this.calipersContext.scale(devicePixelRatio, devicePixelRatio);
  },

  /**
   * Destroys all canvas elements and cleans up references to prevent memory leaks.
   */
  destroyCanvases() {
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
    if (this.qrsFlashCanvas) {
      this.qrsFlashCanvas.remove();
      this.qrsFlashCanvas = null;
      this.qrsFlashContext = null;
    }
    if (this.calipersCanvas) {
      this.calipersCanvas.remove();
      this.calipersCanvas = null;
      this.calipersContext = null;
    }
  },

  // =================
  // GRID RENDERING
  // =================

  /**
   * Initializes theme colors for rendering based on current theme
   */
  initializeThemeColors() {
    const theme =
      document.documentElement.getAttribute("data-theme") || "light";
    const isDark = theme === "dark";

    this.colors = {
      waveform: isDark ? "#ffffff" : "#000000",
      gridFine: isDark ? "#660000" : "#ff9999",
      gridBold: isDark ? "#990000" : "#ff6666",
      gridDots: isDark ? "#666666" : "#999999",
      labels: isDark ? "#ffffff" : "#333333",
      background: isDark ? "#000000" : "#ffffff",
    };
  },

  /**
   * Renders the grid background to the background canvas
   */
  renderGridBackground() {
    if (!this.backgroundCanvas || !this.backgroundContext) return;

    const { context } = this.actor.getSnapshot();
    const { displayMode, gridType } = context.display;

    // Ensure colors are initialized
    if (!this.colors) {
      this.initializeThemeColors();
    }

    const canvasHeight =
      displayMode === "multi"
        ? ROWS_PER_DISPLAY * this.leadHeight
        : this.leadHeight;

    this.backgroundContext.clearRect(0, 0, this.chartWidth, canvasHeight);

    const gridBounds = {
      xOffset: 0,
      yOffset: 0,
      width: this.chartWidth,
      height: canvasHeight,
    };

    switch (gridType) {
      case "graph_paper":
        this.drawGraphPaperGrid({
          bounds: gridBounds,
          context: this.backgroundContext,
        });
        break;
      case "telemetry":
        this.drawTelemetryGrid({
          bounds: gridBounds,
          context: this.backgroundContext,
        });
        break;
      default:
        this.actor.send({
          type: "ERROR",
          message: `Error drawing grid of type ${gridType}`,
        });
        break;
    }
  },

  /**
   * Draws medical-grade ECG grid (graph paper style)
   */
  drawGraphPaperGrid({ bounds, context }) {
    const { xOffset, yOffset, width, height } = bounds;
    const { context: machineContext } = this.actor.getSnapshot();
    const { gridScale } = machineContext.display;

    const smallSquareSize = PIXELS_PER_MM * gridScale;
    const largeSquareSize = 5 * PIXELS_PER_MM * gridScale;

    // Draw fine grid lines (1mm squares)
    context.strokeStyle = this.colors.gridFine;
    context.lineWidth = 0.5;
    context.beginPath();

    // Vertical fine lines
    for (let x = xOffset; x <= xOffset + width; x += smallSquareSize) {
      context.moveTo(x, yOffset);
      context.lineTo(x, yOffset + height);
    }

    // Horizontal fine lines
    for (let y = yOffset; y <= yOffset + height; y += smallSquareSize) {
      context.moveTo(xOffset, y);
      context.lineTo(xOffset + width, y);
    }

    context.stroke();

    // Draw bold grid lines (5mm squares)
    context.strokeStyle = this.colors.gridBold;
    context.lineWidth = 1;
    context.beginPath();

    // Vertical bold lines
    for (let x = xOffset; x <= xOffset + width; x += largeSquareSize) {
      context.moveTo(x, yOffset);
      context.lineTo(x, yOffset + height);
    }

    // Horizontal bold lines
    for (let y = yOffset; y <= yOffset + height; y += largeSquareSize) {
      context.moveTo(xOffset, y);
      context.lineTo(xOffset + width, y);
    }

    context.stroke();
  },

  /**
   * Draws simple telemetry-style grid with dots
   */
  drawTelemetryGrid({ bounds, context }) {
    const { xOffset, yOffset, width, height } = bounds;
    const { context: machineContext } = this.actor.getSnapshot();
    const { gridScale } = machineContext.display;

    const dotSpacing = 5 * PIXELS_PER_MM * gridScale;
    const dotRadius = 1.2;

    context.fillStyle = this.colors.gridDots;

    // Draw dots at grid intersections
    for (let x = xOffset + 5; x < xOffset + width - 5; x += dotSpacing) {
      for (let y = 5; y < height - 5; y += dotSpacing) {
        context.beginPath();
        context.arc(x, yOffset + y, dotRadius, 0, 2 * Math.PI);
        context.fill();
      }
    }
  },

  // =============
  // Utilities
  // =============

  addListener(setupMethod) {
    const cleanup = setupMethod.call(this);
    this.listeners.add(cleanup);
    return cleanup;
  },
};

export default ECGPlayerV2;
