// @ts-check

// ==================
// RENDERING CONSTANTS
// ==================
const MM_PER_SECOND = 25;
const MM_PER_MILLIVOLT = 10;
const PIXELS_PER_MM = 6;
const HEIGHT_MILLIVOLTS = 2.5;
const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM;
const WAVEFORM_LINE_WIDTH = 1.15;
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

// ===================
// ANIMATION CONSTANTS
// ===================
const SINGLE_LEAD_CURSOR_WIDTH = 20;
const MULTI_LEAD_CURSOR_WIDTH = 8;

// Multi-lead display constants
const MULTI_LEAD_HEIGHT_SCALE = 0.8; // Reduces individual lead height in multi-lead view
const QRS_FLASH_DURATION_MS = 100; // Duration of QRS indicator flash in milliseconds
const SEGMENT_DURATION_SECONDS = 0.1; // Pre-computed data segment size for performance
const MEMORY_UPDATE_INTERVAL_MS = 2000; // Diagnostic memory update frequency

const ECGPlayback = {
  // ==========================
  // 1. INITIALIZATION & LIFECYCLE - Entry point and cleanup
  // ==========================

  mounted() {
    this.initializeState();
    this.calculateMedicallyAccurateDimensions();
    this.updateThemeColors();
    this.setupEventListeners();
    this.initializeECGChart();

    if (this.el.dataset.env !== "prod") {
      this.showDiagnostics = false; // Hidden by default
      this.memoryInterval = setInterval(() => this.updateMemoryStats(), MEMORY_UPDATE_INTERVAL_MS);
    }
  },

  destroyed() {
    this.cleanup();
  },

  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
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
      this.backgroundCanvas.removeEventListener("click", this.canvasClickHandler);
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

  // ==========================
  // 2. STATE MANAGEMENT - Central state container
  // ==========================

  initializeState() {
    this.isPlaying = false;
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
    this.gridType = "simple";
    this.displayMode = "single";
    this.currentLead = 1; // Lead II as default
    this.leadHeight = CHART_HEIGHT * this.heightScale;
    this.memory = {};
    this.loopEnabled = true;

    // QRS flash indicator
    this.qrsFlashActive = false;
    this.qrsFlashTimeout = null;
    this.qrsFlashDuration = QRS_FLASH_DURATION_MS;
    this.qrsIndicatorEnabled = true;
    this.gridScale = 1.0;
    this.amplitudeScale = 1.0;
    this.heightScale = 1.2;

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
  },

  // ==========================
  // 3. DATA LOADING & SETUP - ECG data ingestion and processing
  // ==========================

  initializeECGChart() {
    if (!this.widthSeconds) {
      this.calculateMedicallyAccurateDimensions();
    }
    this.recreateCanvas();
    this.renderGridBackground();
  },

  handleECGDataPushed(payload) {
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
      this.qrsTimestamps = this.qrsIndexes.map((index) => index / this.samplingRate);
      this.lastQrsIndex = -1;
      this.qrsDetectedCount = 0;

      // Clear diagnostics data for new ECG
      this.lastDynamicData = {};

      // Immediately update diagnostics if they're visible
      if (this.showDiagnostics) {
        this.updateDiagnostics();
      }

      this.ecgLeadDatasets = [];

      let globalMin = Infinity;
      let globalMax = -Infinity;

      for (let leadIndex = 0; leadIndex < this.leadNames.length; leadIndex++) {
        const times = [];
        const values = [];

        for (let sampleIndex = 0; sampleIndex < data.p_signal.length; sampleIndex++) {
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

  // ==========================
  // 4. DATA PRE-COMPUTATION - Performance optimization engine
  // ==========================

  precomputeDataSegments() {
    this.precomputedSegments.clear();
    this.dataIndexCache.clear();

    if (!this.ecgLeadDatasets || this.ecgLeadDatasets.length === 0) {
      return;
    }

    // Pre-compute segments for each lead
    for (let leadIndex = 0; leadIndex < this.ecgLeadDatasets.length; leadIndex++) {
      const leadData = this.ecgLeadDatasets[leadIndex];
      const leadSegments = new Map();

      // Create segments every 100ms
      for (let time = 0; time < this.totalDuration; time += this.segmentDuration) {
        const segmentKey = Math.floor(time / this.segmentDuration);
        const startTime = segmentKey * this.segmentDuration;
        const endTime = Math.min(startTime + this.segmentDuration, this.totalDuration);

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

  getPrecomputedSegment(leadIndex, time) {
    const leadSegments = this.precomputedSegments.get(leadIndex);
    if (!leadSegments) return null;

    const segmentKey = Math.floor(time / this.segmentDuration);
    return leadSegments.get(segmentKey) || null;
  },

  getSegmentsForTimeRange(leadIndex, startTime, endTime) {
    const leadSegments = this.precomputedSegments.get(leadIndex);
    if (!leadSegments) return [];

    const startSegment = Math.floor(startTime / this.segmentDuration);
    const endSegment = Math.floor(endTime / this.segmentDuration);

    const segments = [];
    for (let segmentKey = startSegment; segmentKey <= endSegment; segmentKey++) {
      const segment = leadSegments.get(segmentKey);
      if (segment) {
        segments.push(segment);
      }
    }

    return segments;
  },

  // ==========================
  // 5. CANVAS & DIMENSIONS - Display foundation
  // ==========================

  calculateMedicallyAccurateDimensions() {
    const container = this.el.querySelector("[data-ecg-chart]");
    if (!container) {
      this.chartWidth = DEFAULT_WIDTH_SECONDS * MM_PER_SECOND * PIXELS_PER_MM * this.gridScale;
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

  recreateCanvas() {
    this.cleanupCanvases();

    const canvasHeight =
      this.displayMode === "multi"
        ? ROWS_PER_DISPLAY * ((CHART_HEIGHT * this.heightScale) / MULTI_LEAD_HEIGHT_SCALE) +
          (ROWS_PER_DISPLAY - 1) * ROW_PADDING
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
  },

  cleanupCanvases() {
    if (this.backgroundCanvas) {
      if (this.canvasClickHandler) {
        this.backgroundCanvas.removeEventListener("click", this.canvasClickHandler);
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
  },

  // ==========================
  // 6. RENDERING - GRID - Background grid system
  // ==========================

  drawLeadGrid(options) {
    const {
      bounds: { xOffset, yOffset, width, height },
      context = this.waveformContext,
    } = options;

    if (this.gridType === "medical") {
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

    for (let x = xOffset + smallSquareSize; x < xOffset + width; x += smallSquareSize) {
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

    for (let x = xOffset + largeSquareSize; x < xOffset + width; x += largeSquareSize) {
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

  renderGridBackground() {
    if (!this.backgroundCanvas || !this.backgroundContext) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.backgroundCanvas.height / devicePixelRatio;

    // Clear and render to background canvas only
    this.backgroundContext.clearRect(0, 0, this.chartWidth, canvasHeight);

    // Render grid directly to background context
    if (this.displayMode === "multi" && this.leadNames) {
      for (let i = 0; i < this.leadNames.length; i++) {
        const { xOffset, yOffset, columnWidth } = this.calculateLeadGridCoordinates(i);
        this.renderLeadBackground(i, xOffset, yOffset, columnWidth, this.leadHeight, this.backgroundContext);
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

  renderLeadBackground(leadIndex, xOffset, yOffset, width, height, context = this.waveformContext) {
    this.drawLeadGrid({
      bounds: { xOffset, yOffset, width, height },
      context,
    });
    this.drawLeadLabel(leadIndex, xOffset, yOffset, context);
  },

  drawLeadLabel(leadIndex, xOffset, yOffset, context = this.waveformContext) {
    if (!this.leadNames || !this.leadNames[leadIndex]) return;

    context.fillStyle = this.colors.labels;
    context.font = "12px Arial";
    context.fillText(this.leadNames[leadIndex], xOffset + 5, yOffset + 15);
  },

  // ==========================
  // 7. RENDERING - WAVEFORM - ECG waveform drawing
  // ==========================

  clearWaveform() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.waveformCanvas.height / devicePixelRatio;
    // Only clear waveform canvas, background grid persists
    this.waveformContext.clearRect(0, 0, this.chartWidth, canvasHeight);
  },

  renderCurrentDisplayMode() {
    if (this.displayMode === "single") {
      this.drawSingleLeadCursor();
    } else {
      this.drawMultiLeadCursor();
    }
  },

  drawSingleLeadCursor() {
    if (!this.activeCursorData || this.activeCursorData.times.length === 0) return;

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
  },

  drawMultiLeadCursor() {
    if (!this.allLeadsCursorData || this.allLeadsCursorData.length === 0) return;

    for (const leadData of this.allLeadsCursorData) {
      const { xOffset, yOffset, columnWidth } = this.calculateLeadGridCoordinates(leadData.leadIndex);

      const columnTimeSpan = this.widthSeconds / COLUMNS_PER_DISPLAY;
      const columnProgress = (this.cursorPosition / this.chartWidth) * (this.widthSeconds / columnTimeSpan);
      const localCursorPosition = xOffset + (columnProgress % 1) * columnWidth;

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
  },

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

  // ==========================
  // 8. RENDERING - CANVAS OPERATIONS - Low-level drawing utilities
  // ==========================

  setupWaveformDrawing(context = this.waveformContext) {
    context.strokeStyle = this.colors.waveform;
    context.lineWidth = WAVEFORM_LINE_WIDTH;
    context.beginPath();
  },

  calculateClearBounds(xOffset, width, cursorPosition, cursorWidth) {
    const clearX = Math.max(xOffset, cursorPosition - cursorWidth / 2);
    const clearWidth = Math.min(cursorWidth, xOffset + width - clearX);
    return { clearX, clearWidth };
  },

  clearCursorArea(x, width) {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.waveformCanvas.height / devicePixelRatio;

    // Only clear the waveform canvas, background grid remains untouched
    this.waveformContext.clearRect(x, 0, width, canvasHeight);
  },

  drawWaveformToCursor(options) {
    const {
      times,
      values,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
      cursor: { position: cursorPosition, width: cursorWidth },
    } = options;

    if (!times || times.length === 0) return;

    const { clearX, clearWidth } = this.calculateClearBounds(xOffset, width, cursorPosition, cursorWidth);

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

  // ==========================
  // 9. PLAYBACK & ANIMATION LOOP - Real-time animation engine
  // ==========================

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
      const cursorProgress = (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);

      if (animationCycle !== this.animationCycle) {
        this.animationCycle = animationCycle;
      }

      this.processAnimationFrame(cursorProgress, animationCycle);

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  },

  processAnimationFrame(cursorProgress, animationCycle) {
    const elapsedTime = animationCycle * this.widthSeconds + cursorProgress * this.widthSeconds;

    if (elapsedTime >= this.totalDuration) {
      this.handlePlaybackEnd();
      return;
    }

    this.checkQrsOccurrences(elapsedTime);
    this.calculateCursorPosition(elapsedTime);
    this.loadVisibleDataForCurrentMode(elapsedTime);
    this.renderCurrentDisplayMode();
    this.drawQrsFlashDot();
    this.updateDiagnosticsData(elapsedTime, cursorProgress, animationCycle);
  },

  calculateCursorPosition(elapsedTime) {
    this.cursorPosition = (elapsedTime * this.chartWidth) / this.widthSeconds;
    this.cursorPosition = this.cursorPosition % this.chartWidth;
  },

  loadVisibleDataForCurrentMode(elapsedTime) {
    if (this.displayMode === "single") {
      this.loadVisibleDataForSingleLead(elapsedTime);
    } else {
      this.loadVisibleDataForAllLeads(elapsedTime);
    }
  },

  loadVisibleDataForSingleLead(elapsedTime) {
    const currentScreenStartTime = Math.floor(elapsedTime / this.widthSeconds) * this.widthSeconds;

    // Use pre-computed segments instead of real-time slicing
    const segments = this.getSegmentsForTimeRange(this.currentLead, currentScreenStartTime, elapsedTime);
    this.activeSegments = segments;

    if (segments.length > 0) {
      // Combine segments into cursor data
      const times = [];
      const values = [];

      for (const segment of segments) {
        for (let i = 0; i < segment.times.length; i++) {
          const absoluteTime = segment.originalStartTime + segment.times[i];
          if (absoluteTime >= currentScreenStartTime && absoluteTime <= elapsedTime) {
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

  loadVisibleDataForAllLeads(elapsedTime) {
    const columnTimeSpan = this.widthSeconds / COLUMNS_PER_DISPLAY;
    const columnCycleStart = Math.floor(elapsedTime / columnTimeSpan) * columnTimeSpan;

    this.allLeadsCursorData = [];
    this.activeSegments = [];

    for (let leadIndex = 0; leadIndex < this.ecgLeadDatasets.length; leadIndex++) {
      // Use pre-computed segments instead of real-time slicing
      const segments = this.getSegmentsForTimeRange(leadIndex, columnCycleStart, elapsedTime);
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
            if (absoluteTime >= columnCycleStart && absoluteTime <= elapsedTime) {
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

  togglePlayback() {
    const newPlayingState = !this.isPlaying;
    this.isPlaying = newPlayingState;

    this.pushEvent("playback_changed", { is_playing: newPlayingState });

    if (newPlayingState) {
      this.resumeAnimation();
    } else {
      this.pauseAnimation();
    }

    this.updatePlayPauseButton();
  },

  startAnimation() {
    this.isPlaying = true;
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.animationCycle = 0;
    this.cursorPosition = 0;

    this.allLeadsVisibleData = null;

    this.startAnimationLoop();
  },

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

  pauseAnimation() {
    this.pausedTime = Date.now();
    this.stopAnimation();

    // Render the final frame when paused
    const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
    const cursorProgress = (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
    const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
    this.processAnimationFrame(cursorProgress, animationCycle);
  },

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isPlaying = false;
  },

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

  handlePlaybackEnd() {
    this.pushEvent("playback_ended", {});
    const loopCheckbox = /** @type {HTMLInputElement} */ (document.getElementById("loop-checkbox"));
    const currentLoopState = loopCheckbox ? loopCheckbox.checked : false;
    if (this.loopEnabled || currentLoopState) {
      this.resetPlayback();
      this.startAnimation();
    } else {
      this.stopAnimation();
      this.resetPlayback();
      this.updatePlayPauseButton();
    }
  },

  // ==========================
  // 10. QRS DETECTION & UI - Heart rhythm detection and indicators
  // ==========================

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

  clearQrsFlashArea() {
    if (!this.qrsFlashContext || !this.qrsFlashCanvas) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.qrsFlashCanvas.height / devicePixelRatio;

    // Clear the entire QRS flash canvas
    this.qrsFlashContext.clearRect(0, 0, this.chartWidth, canvasHeight);
  },

  drawQrsFlashDot() {
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

  // ==========================
  // 11. EVENT HANDLERS - Server communication and user input
  // ==========================

  setupEventListeners() {
    this.setupResizeListener();
    this.setupThemeListener();
    this.setupKeyboardListeners();
    this.setupLiveViewListeners();
  },

  setupResizeListener() {
    this.resizeHandler = () => {
      this.calculateMedicallyAccurateDimensions();
      this.handleResize();
    };
    window.addEventListener("resize", this.resizeHandler);
  },

  setupThemeListener() {
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
          this.handleThemeChange();
        }
      });
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  },

  setupKeyboardListeners() {
    this.keydownHandler = (event) => {
      // Only handle shortcuts if not typing in an input field
      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.isContentEditable) {
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
      }
    };

    // Add global keyboard listener
    document.addEventListener("keydown", this.keydownHandler);
  },

  setupLiveViewListeners() {
    this.handleEvent("initial_state", (payload) => {
      this.handleInitialState(payload);
    });

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

    this.handleEvent("ecg_data_pushed", (payload) => {
      this.handleECGDataPushed(payload);
    });
  },

  handleResize() {
    this.recreateCanvasAndRestart();
  },

  handleThemeChange() {
    this.updateThemeColors();
    this.renderGridBackground();
    if (!this.isPlaying && this.startTime && this.pausedTime) {
      const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
      const cursorProgress = (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
      this.processAnimationFrame(cursorProgress, animationCycle);
    }
  },

  handleInitialState(state) {
    if (typeof state.is_playing === "boolean") {
      this.isPlaying = state.is_playing;
    }
    if (typeof state.current_lead === "number") {
      this.currentLead = state.current_lead;
    }
    if (typeof state.display_mode === "string") {
      this.displayMode = state.display_mode;
      this.cursorWidth = state.display_mode === "single" ? SINGLE_LEAD_CURSOR_WIDTH : MULTI_LEAD_CURSOR_WIDTH;
    }
    if (typeof state.grid_type === "string") {
      this.gridType = state.grid_type;
    }
  },

  handlePlaybackChange(isPlaying) {
    this.isPlaying = isPlaying;
    if (isPlaying) {
      this.resumeAnimation();
    } else {
      this.pauseAnimation();
    }
  },

  handleLeadChange(leadIndex) {
    if (!isNaN(leadIndex) && this.ecgLeadDatasets && leadIndex >= 0 && leadIndex < this.ecgLeadDatasets.length) {
      this.switchLead(leadIndex);
    }
  },

  handleGridChange(gridType) {
    if (gridType === "medical" || gridType === "simple") {
      this.gridType = gridType;
      this.renderGridBackground();
    }
  },

  handleDisplayModeChange(displayMode) {
    if (displayMode === "single" || displayMode === "multi") {
      this.displayMode = displayMode;
      this.recreateCanvasAndRestart();
    }
  },

  setupCanvasClickHandler() {
    if (this.canvasClickHandler) {
      this.backgroundCanvas.removeEventListener("click", this.canvasClickHandler);
    }

    this.canvasClickHandler = (event) => {
      const rect = this.backgroundCanvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (this.displayMode === "multi") {
        const clickedLeadIndex = this.getLeadIndexFromClick(x, y);
        if (clickedLeadIndex !== null) {
          this.switchToSingleLeadMode(clickedLeadIndex);
        }
      } else if (this.displayMode === "single") {
        // In single lead mode, any click on the grid switches to multi-lead mode
        this.switchToMultiLeadMode();
      }
    };

    this.backgroundCanvas.addEventListener("click", this.canvasClickHandler);
  },

  // ==========================
  // 12. DISPLAY MODE & LEAD SWITCHING - View mode management
  // ==========================

  /**
   * Determines which lead was clicked based on click coordinates.
   * @param {number} x - The x coordinate of the click
   * @param {number} y - The y coordinate of the click
   * @returns {number|null} The index of the clicked lead, or null if no lead was clicked
   */
  getLeadIndexFromClick(x, y) {
    if (!this.leadNames || this.displayMode !== "multi") {
      return null;
    }

    for (let leadIndex = 0; leadIndex < this.leadNames.length; leadIndex++) {
      const { xOffset, yOffset, columnWidth } = this.calculateLeadGridCoordinates(leadIndex);

      // Check if click is within this lead's bounds
      if (x >= xOffset && x <= xOffset + columnWidth && y >= yOffset && y <= yOffset + this.leadHeight) {
        return leadIndex;
      }
    }

    return null;
  },

  /**
   * Switches from multi-lead mode to single-lead mode with the specified lead.
   * @param {number} leadIndex - The index of the lead to switch to
   */
  switchToSingleLeadMode(leadIndex) {
    this.displayMode = "single";
    this.updateDisplayModeSelector("single");
    this.switchLead(leadIndex);
    this.updateLeadSelectorVisibility("single");
    this.recreateCanvasAndRestart();
  },

  switchToMultiLeadMode() {
    this.displayMode = "multi";
    this.updateDisplayModeSelector("multi");
    this.updateLeadSelectorVisibility("multi");
    this.recreateCanvasAndRestart();
  },

  /**
   * Updates the display mode selector in the DOM.
   * @param {string} mode - The display mode ("single" or "multi")
   */
  updateDisplayModeSelector(mode) {
    const displayModeSelector = /** @type {HTMLSelectElement} */ (document.getElementById("display-mode-selector"));
    if (displayModeSelector) {
      displayModeSelector.value = mode;
    }
  },

  // ==========================
  // 13. LEAD SWITCHING & CONTROL - Lead navigation
  // ==========================

  /**
   * Switches the view to a different ECG lead.
   * @param {number} leadIndex - The index of the lead to switch to
   */
  switchLead(leadIndex) {
    if (!this.ecgLeadDatasets || leadIndex < 0 || leadIndex >= this.ecgLeadDatasets.length) {
      console.warn(`Invalid lead index: ${leadIndex}`);
      return;
    }

    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopAnimation();

    this.currentLead = leadIndex;
    this.currentLeadData = this.ecgLeadDatasets[leadIndex];

    // Update the lead selector to match the current lead
    this.updateLeadSelector();

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
        const cursorProgress = (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
        const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
        this.processAnimationFrame(cursorProgress, animationCycle);
      } else {
        this.clearWaveform();
      }
    }
  },

  switchToNextLead() {
    if (!this.ecgLeadDatasets || this.ecgLeadDatasets.length === 0) return;

    if (this.currentLead < this.ecgLeadDatasets.length - 1) {
      const nextLead = this.currentLead + 1;
      this.switchLead(nextLead);

      this.pushEvent("lead_changed", { lead: nextLead });
    }
  },

  switchToPrevLead() {
    if (!this.ecgLeadDatasets || this.ecgLeadDatasets.length === 0) return;

    if (this.currentLead > 0) {
      const prevLead = this.currentLead - 1;
      this.switchLead(prevLead);

      this.pushEvent("lead_changed", { lead: prevLead });
    }
  },

  updateLeadSelector() {
    const leadSelector = /** @type {HTMLSelectElement} */ (document.getElementById("lead-selector"));
    if (leadSelector) {
      leadSelector.value = this.currentLead;
    }
  },

  /**
   * Shows or hides the lead selector based on display mode.
   * @param {string} displayMode - The display mode ("single" or "multi")
   */
  updateLeadSelectorVisibility(displayMode) {
    const leadSelectorContainer = document.getElementById("lead-selector-container");
    if (leadSelectorContainer) {
      if (displayMode === "multi") {
        leadSelectorContainer.style.display = "none";
      } else {
        leadSelectorContainer.style.display = "block";
      }
    }
  },

  // ==========================
  // 14. LEAD POSITIONING & LAYOUT - Multi-lead grid positioning
  // ==========================

  /**
   * Determines the grid column and row for a given lead index in multi-lead view.
   * @param {number} leadIndex - The index of the ECG lead
   * @returns {{column: number, row: number}} The grid position
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
   * @param {number} leadIndex - The index of the ECG lead
   * @returns {{xOffset: number, yOffset: number, columnWidth: number}} The position and width for the lead
   */
  calculateLeadGridCoordinates(leadIndex) {
    const { column, row } = this.getLeadColumnAndRow(leadIndex);
    const totalColumnPadding = (COLUMNS_PER_DISPLAY - 1) * COLUMN_PADDING;
    const columnWidth = (this.chartWidth - totalColumnPadding) / COLUMNS_PER_DISPLAY;

    const xOffset = column * (columnWidth + COLUMN_PADDING);
    const yOffset = row * (this.leadHeight + ROW_PADDING);

    return { xOffset, yOffset, columnWidth };
  },

  // ==========================
  // 15. SCALE & UI CONTROLS - User interface controls
  // ==========================

  handleGridScaleChange() {
    this.withCanvasStatePreservation(() => {
      this.calculateMedicallyAccurateDimensions();
      this.recreateCanvas();
      this.renderGridBackground();
      this.clearWaveform();
    });
  },

  handleAmplitudeScaleChange() {
    this.withCanvasStatePreservation(() => {
      this.clearWaveform();
    });
  },

  handleHeightScaleChange() {
    this.withCanvasStatePreservation(() => {
      this.recreateCanvas();
      this.renderGridBackground();
      this.clearWaveform();
    });
  },

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

  updateAmplitudeScaleDisplay() {
    const amplitudeScaleValue = document.getElementById("amplitude-scale-value");
    const amplitudeScaleGain = document.getElementById("amplitude-scale-gain");

    if (amplitudeScaleValue) {
      amplitudeScaleValue.textContent = `${this.amplitudeScale.toFixed(2)}x`;
    }

    if (amplitudeScaleGain) {
      const actualGain = (MM_PER_MILLIVOLT * this.amplitudeScale).toFixed(1);
      amplitudeScaleGain.textContent = `${actualGain} mm/mV`;
    }
  },

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

  updatePlayPauseButton() {
    const button = document.getElementById("play-pause-button");
    if (button) {
      button.textContent = this.isPlaying ? "Pause" : "Play";
    }
  },

  setupPlayPauseButton() {
    const button = document.getElementById("play-pause-button");
    if (button && !button.dataset.listenerAdded) {
      button.addEventListener("click", () => {
        this.togglePlayback();
      });
      button.dataset.listenerAdded = "true";
    }
  },

  /**
   * Sets up event listener with duplicate prevention.
   * @param {string} elementId - The ID of the element
   * @param {string} eventType - The event type to listen for
   * @param {EventListener} handler - The event handler function
   * @param {Function} [initializer] - Optional initializer function
   */
  setupElementListener(elementId, eventType, handler, initializer = null) {
    const element = document.getElementById(elementId);
    if (element && !element.dataset.listenerAdded) {
      if (initializer) initializer(element);
      element.addEventListener(eventType, handler);
      element.dataset.listenerAdded = "true";
    }
  },

  setupBasicSelectors() {
    this.setupElementListener("lead-selector", "change", (e) => {
      const leadIndex = parseInt(/** @type {HTMLSelectElement} */ (e.target).value);
      this.switchLead(leadIndex);
    });

    this.setupElementListener("display-mode-selector", "change", (e) => {
      const value = /** @type {HTMLSelectElement} */ (e.target).value;
      this.handleDisplayModeChange(value);
      this.updateLeadSelectorVisibility(value);
    });

    this.setupElementListener("grid-type-selector", "change", (e) => {
      this.handleGridChange(/** @type {HTMLSelectElement} */ (e.target).value);
    });
  },

  setupCheckboxes() {
    this.setupElementListener(
      "loop-checkbox",
      "change",
      (event) => {
        this.loopEnabled = /** @type {HTMLInputElement} */ (event.target).checked;
      },
      (element) => {
        /** @type {HTMLInputElement} */ (element).checked = this.loopEnabled;
      }
    );

    this.setupElementListener(
      "qrs-indicator-checkbox",
      "change",
      (event) => {
        this.qrsIndicatorEnabled = /** @type {HTMLInputElement} */ (event.target).checked;
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
        /** @type {HTMLInputElement} */ (element).checked = this.qrsIndicatorEnabled;
      }
    );

    this.setupElementListener(
      "debug-checkbox",
      "change",
      (event) => {
        this.toggleDebugView(/** @type {HTMLInputElement} */ (event.target).checked);
      },
      (element) => {
        /** @type {HTMLInputElement} */ (element).checked = this.showDiagnostics;
      }
    );
  },

  setupScaleSliders() {
    this.setupElementListener(
      "grid-scale-slider",
      "input",
      (event) => {
        this.gridScale = parseFloat(/** @type {HTMLInputElement} */ (event.target).value);
        this.updateGridScaleDisplay();
        this.handleGridScaleChange();
      },
      (element) => {
        /** @type {HTMLInputElement} */ (element).value = this.gridScale;
        this.updateGridScaleDisplay();
      }
    );

    this.setupElementListener(
      "amplitude-scale-slider",
      "input",
      (event) => {
        this.amplitudeScale = parseFloat(/** @type {HTMLInputElement} */ (event.target).value);
        this.updateAmplitudeScaleDisplay();
        this.handleAmplitudeScaleChange();
      },
      (element) => {
        /** @type {HTMLInputElement} */ (element).value = this.amplitudeScale;
        this.updateAmplitudeScaleDisplay();
      }
    );

    this.setupElementListener(
      "height-scale-slider",
      "input",
      (event) => {
        this.heightScale = parseFloat(/** @type {HTMLInputElement} */ (event.target).value);
        this.updateHeightScaleDisplay();
        this.handleHeightScaleChange();
      },
      (element) => {
        /** @type {HTMLInputElement} */ (element).value = this.heightScale;
        this.updateHeightScaleDisplay();
      }
    );
  },

  setupSelectors() {
    this.setupBasicSelectors();
    this.setupCheckboxes();
    this.setupScaleSliders();
  },

  /**
   * Toggles the debug view on or off.
   * @param {boolean} enabled - Whether to enable the debug view
   */
  toggleDebugView(enabled) {
    this.showDiagnostics = enabled;

    if (enabled) {
      this.createDiagnosticsPanel();
      this.updateDiagnostics();
      if (!this.memoryInterval) {
        this.memoryInterval = setInterval(() => this.updateMemoryStats(), MEMORY_UPDATE_INTERVAL_MS);
      }
    } else {
      this.destroyDiagnosticsPanel();
      if (this.memoryInterval) {
        clearInterval(this.memoryInterval);
        this.memoryInterval = null;
      }
    }
  },

  // ==========================
  // 16. THEME & VISUAL CONFIGURATION - Styling and colors
  // ==========================

  updateThemeColors() {
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const isDark = theme === "dark";

    this.colors = {
      waveform: isDark ? "#ffffff" : "#000000",
      gridFine: isDark ? "#660000" : "#ff9999",
      gridBold: isDark ? "#990000" : "#ff6666",
      gridDots: isDark ? "#666666" : "#999999",
      labels: isDark ? "#ffffff" : "#333333",
    };
  },

  // ==========================
  // 17. UTILITY FUNCTIONS - Shared helper methods
  // ==========================

  /**
   * Common utility for preserving canvas state during operations.
   * @param {Function} operation - The operation to perform
   */
  withCanvasStatePreservation(operation) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopAnimation();

    operation();

    if (!wasPlaying && this.startTime && this.pausedTime) {
      const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
      const cursorProgress = (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
      this.processAnimationFrame(cursorProgress, animationCycle);
    }

    if (wasPlaying) {
      this.isPlaying = true;
      this.startAnimationLoop();
    }
  },

  recreateCanvasAndRestart() {
    this.withCanvasStatePreservation(() => {
      this.recreateCanvas();
      this.renderGridBackground();
    });
  },

  /**
   * Calculates the data index for a given time using the sampling rate.
   * @param {Object} leadData - The lead data containing times array
   * @param {number} targetTime - The target time in seconds
   * @returns {number} The calculated data index
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
   * @param {Object} options - Transform options containing times, values, bounds, and timeSpan
   * @returns {Array<{x: number, y: number}>} Array of screen coordinates
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

  // ==========================
  // 18. DIAGNOSTICS - Debug and performance monitoring
  // ==========================

  async updateMemoryStats() {
    if (window.crossOriginIsolated && "measureUserAgentSpecificMemory" in performance) {
      try {
        const measurement = await /** @type {any} */ (performance).measureUserAgentSpecificMemory();
        this.memory = {
          usedJSHeapSize: measurement.bytes,
          // The new API doesn't provide total or limit, so we leave them undefined.
        };
      } catch (error) {
        console.error("Failed to measure memory:", error);
        this.memory = { error: "Measurement failed" };
      }
    } else if ("memory" in performance) {
      const perfMemory = /** @type {any} */ (performance).memory;
      this.memory = {
        usedJSHeapSize: perfMemory.usedJSHeapSize,
        totalJSHeapSize: perfMemory.totalJSHeapSize,
        jsHeapSizeLimit: perfMemory.jsHeapSizeLimit,
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
    panel.className = "mt-4 p-4 bg-base-200 rounded-lg text-sm font-mono grid grid-cols-3 justify-start gap-4";
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
   * Updates the diagnostics panel with current performance data.
   * @param {Object} [dynamicData] - Dynamic data to display
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
        totalSegments: this.precomputedSegments.get(this.currentLead)?.size || 0,
      },
    };

    if (this.memory) {
      const memoryData = {};
      if (this.memory.error) {
        memoryData.status = this.memory.error;
      } else {
        if (this.memory.usedJSHeapSize) {
          memoryData.usedJSHeapSize = `${(this.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`;
        }
        if (this.memory.totalJSHeapSize) {
          memoryData.totalJSHeapSize = `${(this.memory.totalJSHeapSize / 1048576).toFixed(2)} MB`;
        }
        if (this.memory.jsHeapSizeLimit) {
          memoryData.jsHeapSizeLimit = `${(this.memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`;
        }
      }
      groupsCol2["Memory"] = memoryData;
    }

    const groupsCol3 = {
      "Playback & Animation": {
        isPlaying: this.isPlaying,
        currentLead: this.leadNames ? this.leadNames[this.currentLead] : "N/A",
        animationCycle: dynamicData.animationCycle,
        elapsedTime: dynamicData.elapsedTime,
        cursorProgress: dynamicData.cursorProgress,
        cursorPosition: dynamicData.cursorPosition,
        localCursorPosition: this.displayMode === "multi" ? dynamicData.localCursorPosition : null,
      },
      "QRS Detection": {
        totalQrsCount: this.qrsIndexes ? this.qrsIndexes.length : 0,
        detectedCount: this.qrsDetectedCount || 0,
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
              } else if (typeof value === "string" && (value.endsWith("MB") || !isNaN(parseFloat(value)))) {
                displayValue = value;
              } else if (typeof value === "number") {
                displayValue = `${value.toFixed(2)}${units[key] ? ` ${units[key]}` : ""}`;
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

  /**
   * Updates diagnostics data with current animation frame information.
   * @param {number} elapsedTime - The elapsed time in seconds
   * @param {number} cursorProgress - The cursor progress as a percentage (0-1)
   * @param {number} animationCycle - The current animation cycle number
   */
  updateDiagnosticsData(elapsedTime, cursorProgress, animationCycle) {
    if (!this.showDiagnostics) return;

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
  },
};

export default ECGPlayback;
