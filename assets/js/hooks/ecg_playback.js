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

// ================
// LAYOUT CONSTANTS
// ================
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

    this.resizeHandler = () => {
      this.calculateMedicallyAccurateDimensions();
      this.handleResize();
    };
    window.addEventListener("resize", this.resizeHandler);

    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          this.updateThemeColors();
          this.renderGridBackground();
          if (!this.isPlaying && this.startTime && this.pausedTime) {
            const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
            const cursorProgress =
              (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
            const animationCycle = Math.floor(
              elapsedSeconds / this.widthSeconds
            );
            this.processWaveformUpdate(cursorProgress, animationCycle);
          }
        }
      });
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    this.keydownHandler = (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        this.switchToNextLead();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        this.switchToPrevLead();
      } else if (event.key === " ") {
        event.preventDefault();
        this.togglePlayback();
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

    await this.initializeECGChart();

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

  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
    if (this.focusHandler) {
      this.el.removeEventListener("focus", this.focusHandler);
      this.focusHandler = null;
    }
    if (this.blurHandler) {
      this.el.removeEventListener("blur", this.blurHandler);
      this.blurHandler = null;
    }
    if (this.keydownHandler) {
      this.el.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }

    this.ecgLeadDatasets = null;
    this.currentLeadData = null;
    this.leadNames = null;
    this.screenVisibleTimes = [];
    this.screenVisibleValues = [];
    this.allLeadsVisibleData = null;
    this.eventHandlers = null;

    if (this.gridCanvas) {
      this.gridCanvas.remove();
      this.gridCanvas = null;
    }

    this.cursorBuffer = null;
    this.context = null;
  },

  // =================
  // STATE MANAGEMENT
  // =================

  initializeState() {
    this.isPlaying = this.el.dataset.isPlaying === "true";
    this.startTime = null;
    this.pausedTime = 0;
    this.animationCycle = 0;
    this.animationId = null;
    this.screenVisibleTimes = [];
    this.screenVisibleValues = [];
    this.cursorPosition = 0;
    this.cursorWidth = SINGLE_LEAD_CURSOR_WIDTH;
    this.activeCursorData = null;
    this.allLeadsCursorData = null;
    this.gridType = this.el.dataset.gridType || "medical";
    this.displayMode = this.el.dataset.displayMode || "single";
    this.currentLead = parseInt(this.el.dataset.currentLead) || 0;
    this.leadHeight = CHART_HEIGHT;
  },

  // =========================
  // LEAD POSITIONING & LAYOUT
  // =========================

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

  getLeadPosition(leadIndex) {
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

  async initializeECGChart() {
    this.currentLeadData = await this.loadECGData();
    if (!this.widthSeconds) {
      this.calculateMedicallyAccurateDimensions();
    }
    this.recreateCanvas();
    this.renderGridBackground();
  },

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

    return this.currentLeadData;
  },

  // ===================
  // CANVAS & DIMENSIONS
  // ===================

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

  recreateCanvas() {
    if (this.canvas) {
      this.canvas.remove();
    }

    const canvasHeight =
      this.displayMode === "multi"
        ? ROWS_PER_DISPLAY * (CHART_HEIGHT / MULTI_LEAD_HEIGHT_SCALE) +
          (ROWS_PER_DISPLAY - 1) * ROW_PADDING
        : CHART_HEIGHT;

    this.leadHeight =
      this.displayMode === "multi"
        ? CHART_HEIGHT / MULTI_LEAD_HEIGHT_SCALE
        : CHART_HEIGHT;

    const canvas = document.createElement("canvas");
    canvas.width = this.chartWidth;
    canvas.height = canvasHeight;
    this.el.querySelector("[data-ecg-chart]").appendChild(canvas);
    this.canvas = canvas;

    this.context = canvas.getContext("2d");

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = this.chartWidth * devicePixelRatio;
    canvas.height = canvasHeight * devicePixelRatio;
    canvas.style.width = this.chartWidth + "px";
    canvas.style.height = canvasHeight + "px";
    this.context.scale(devicePixelRatio, devicePixelRatio);
  },

  // ==============
  // EVENT HANDLERS
  // ==============

  handleResize() {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopAnimation();

    this.gridCanvas = null;
    this.recreateCanvas();
    this.renderGridBackground();

    if (!wasPlaying && this.startTime && this.pausedTime) {
      const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
      const cursorProgress =
        (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
      this.processWaveformUpdate(cursorProgress, animationCycle);
    }

    if (wasPlaying) {
      this.isPlaying = true;
      this.startAnimationLoop();
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
    if (
      !isNaN(leadIndex) &&
      this.ecgLeadDatasets &&
      leadIndex >= 0 &&
      leadIndex < this.ecgLeadDatasets.length
    ) {
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
      const wasPlaying = this.isPlaying;
      if (wasPlaying) this.stopAnimation();

      this.displayMode = displayMode;
      this.gridCanvas = null;
      this.recreateCanvas();
      this.renderGridBackground();

      if (!wasPlaying && this.startTime && this.pausedTime) {
        const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
        const cursorProgress =
          (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
        const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
        this.processWaveformUpdate(cursorProgress, animationCycle);
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

  findDataIndexByTime(targetTime) {
    return this.findDataIndexByTimeForLead(this.currentLeadData, targetTime);
  },

  findDataIndexByTimeForLead(leadData, targetTime) {
    if (!leadData || !leadData.times.length) {
      return 0;
    }

    let left = 0;
    let right = leadData.times.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = leadData.times[mid];

      if (midTime === targetTime) {
        return mid;
      } else if (midTime < targetTime) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return Math.min(left, leadData.times.length - 1);
  },

  // ==============
  // LEAD SWITCHING
  // ==============

  switchLead(leadIndex) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopAnimation();

    this.currentLead = leadIndex;
    this.currentLeadData = this.ecgLeadDatasets[leadIndex];

    if (this.displayMode === "single") {
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
        this.processWaveformUpdate(cursorProgress, animationCycle);
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

  // ================
  // PLAYBACK CONTROL
  // ================

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

  processWaveformUpdate(cursorProgress, animationCycle) {
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
      this.prepareSingleLeadData(elapsedTime);
    } else {
      this.prepareMultiLeadData(elapsedTime);
    }

    this.drawCursorWaveform();
  },

  calculateCursorPosition(elapsedTime) {
    this.cursorPosition = (elapsedTime * this.chartWidth) / this.widthSeconds;
    this.cursorPosition = this.cursorPosition % this.chartWidth;
  },

  prepareSingleLeadData(elapsedTime) {
    const currentScreenStartTime =
      Math.floor(elapsedTime / this.widthSeconds) * this.widthSeconds;
    const currentDataTime = elapsedTime;

    const startIndex = this.findDataIndexByTime(currentScreenStartTime);
    const endIndex = this.findDataIndexByTime(currentDataTime);

    if (
      endIndex >= startIndex &&
      startIndex < this.currentLeadData.times.length
    ) {
      const times = this.currentLeadData.times.slice(startIndex, endIndex + 1);
      const values = this.currentLeadData.values.slice(
        startIndex,
        endIndex + 1
      );

      this.activeCursorData = {
        times: times.map((t) => t - currentScreenStartTime),
        values: values,
      };
    } else {
      this.activeCursorData = {
        times: [],
        values: [],
      };
    }
  },

  prepareMultiLeadData(elapsedTime) {
    const columnTimeSpan = DEFAULT_WIDTH_SECONDS;
    const columnDataTime = elapsedTime;

    this.allLeadsCursorData = [];

    for (
      let leadIndex = 0;
      leadIndex < this.ecgLeadDatasets.length;
      leadIndex++
    ) {
      const leadData = this.ecgLeadDatasets[leadIndex];

      const columnCycleStart =
        Math.floor(elapsedTime / columnTimeSpan) * columnTimeSpan;
      const startDataTime = columnCycleStart;

      const startIndex = this.findDataIndexByTimeForLead(
        leadData,
        startDataTime
      );
      const endIndex = this.findDataIndexByTimeForLead(
        leadData,
        columnDataTime
      );

      if (endIndex >= startIndex && startIndex < leadData.times.length) {
        const times = leadData.times.slice(startIndex, endIndex + 1);
        const values = leadData.values.slice(startIndex, endIndex + 1);

        this.allLeadsCursorData.push({
          leadIndex,
          times: times.map((t) => t - startDataTime),
          values: values,
        });
      }
    }
  },

  // =================
  // ANIMATION CONTROL
  // =================

  startAnimation() {
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.animationCycle = 0;
    this.cursorPosition = 0;

    this.screenVisibleTimes = [];
    this.screenVisibleValues = [];
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

    this.screenVisibleTimes = [];
    this.screenVisibleValues = [];
    this.allLeadsVisibleData = null;

    this.clearWaveform();
  },

  startAnimationLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    const animate = () => {
      if (!this.isPlaying || !this.canvas) {
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

      this.processWaveformUpdate(cursorProgress, animationCycle);

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  },

  // =================
  // RENDERING - GRID
  // =================

  drawLeadGrid(xOffset, yOffset, width, height) {
    if (this.gridType === "medical") {
      this.drawMedicalGrid(xOffset, yOffset, width, height);
    } else {
      this.drawSimpleGrid(xOffset, yOffset, width, height);
    }
  },

  drawLeadLabel(leadIndex, xOffset, yOffset) {
    this.context.fillStyle = this.colors.labels;
    this.context.font = "12px Arial";
    this.context.fillText(this.leadNames[leadIndex], xOffset + 5, yOffset + 15);
  },

  drawMedicalGrid(xOffset, yOffset, width, height) {
    const smallSquareSize = PIXELS_PER_MM;
    const largeSquareSize = 5 * PIXELS_PER_MM;

    this.context.strokeStyle = this.colors.gridFine;
    this.context.lineWidth = 0.5;
    this.context.beginPath();

    for (
      let x = xOffset + smallSquareSize;
      x < xOffset + width;
      x += smallSquareSize
    ) {
      this.context.moveTo(x, yOffset);
      this.context.lineTo(x, yOffset + height);
    }

    for (let y = smallSquareSize; y <= height; y += smallSquareSize) {
      if (yOffset + y <= yOffset + height) {
        this.context.moveTo(xOffset, yOffset + y);
        this.context.lineTo(xOffset + width, yOffset + y);
      }
    }

    this.context.stroke();

    this.context.strokeStyle = this.colors.gridBold;
    this.context.lineWidth = 1;
    this.context.beginPath();

    for (
      let x = xOffset + largeSquareSize;
      x < xOffset + width;
      x += largeSquareSize
    ) {
      this.context.moveTo(x, yOffset);
      this.context.lineTo(x, yOffset + height);
    }

    for (let y = largeSquareSize; y <= height; y += largeSquareSize) {
      if (yOffset + y <= yOffset + height) {
        this.context.moveTo(xOffset, yOffset + y);
        this.context.lineTo(xOffset + width, yOffset + y);
      }
    }

    this.context.stroke();
  },

  drawSimpleGrid(xOffset, yOffset, width, height) {
    const dotSpacing = 5 * PIXELS_PER_MM;
    this.context.fillStyle = this.colors.gridDots;

    for (let x = xOffset + 5; x < xOffset + width - 5; x += dotSpacing) {
      for (let y = 5; y < height - 5; y += dotSpacing) {
        this.context.beginPath();
        this.context.arc(x, yOffset + y, DOT_RADIUS, 0, 2 * Math.PI);
        this.context.fill();
      }
    }
  },

  cacheGrid() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.canvas.height / devicePixelRatio;

    this.gridCanvas = document.createElement("canvas");
    this.gridCanvas.width = this.chartWidth;
    this.gridCanvas.height = canvasHeight;

    this.gridCanvas.width = this.chartWidth * devicePixelRatio;
    this.gridCanvas.height = canvasHeight * devicePixelRatio;
    this.gridCanvas.style.width = this.chartWidth + "px";
    this.gridCanvas.style.height = canvasHeight + "px";

    const gridContext = this.gridCanvas.getContext("2d");
    gridContext.scale(devicePixelRatio, devicePixelRatio);

    const originalContext = this.context;
    this.context = gridContext;
    this.renderGridBackground();
    this.context = originalContext;
  },

  // =====================
  // RENDERING - WAVEFORM
  // =====================

  clearWaveform() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.canvas.height / devicePixelRatio;
    this.context.clearRect(0, 0, this.chartWidth, canvasHeight);
    this.renderGridBackground();
  },

  drawCursorWaveform() {
    if (this.displayMode === "single") {
      this.drawSingleLeadCursor();
    } else {
      this.drawMultiLeadCursor();
    }
  },

  // ==============================
  // RENDERING - CANVAS OPERATIONS
  // ==============================

  clearCursorArea(x, width) {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.canvas.height / devicePixelRatio;

    this.context.clearRect(x, 0, width, canvasHeight);

    this.context.save();
    this.context.beginPath();
    this.context.rect(x, 0, width, canvasHeight);
    this.context.clip();

    if (this.displayMode === "single") {
      this.renderLeadBackground(
        this.currentLead,
        0,
        0,
        this.chartWidth,
        CHART_HEIGHT
      );
    } else {
      for (let i = 0; i < this.leadNames.length; i++) {
        const { xOffset, yOffset, columnWidth } = this.getLeadPosition(i);
        this.renderLeadBackground(
          i,
          xOffset,
          yOffset,
          columnWidth,
          this.leadHeight
        );
      }
    }

    this.context.restore();
  },

  drawLeadCursor(
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

    const clearX = Math.max(xOffset, cursorPosition - cursorWidth / 2);
    const clearWidth = Math.min(cursorWidth, xOffset + width - clearX);

    if (clearWidth > 0) {
      this.clearCursorArea(clearX, clearWidth);
    }

    this.context.strokeStyle = this.colors.waveform;
    this.context.lineWidth = WAVEFORM_LINE_WIDTH;
    this.context.beginPath();

    const xScale = width / timeSpan;
    const yScale = height / (this.yMax - this.yMin);

    let hasMovedTo = false;
    for (let i = 0; i < times.length; i++) {
      const x = xOffset + times[i] * xScale;
      const y = yOffset + height - (values[i] - this.yMin) * yScale;

      if (x <= cursorPosition) {
        if (!hasMovedTo) {
          this.context.moveTo(x, y);
          hasMovedTo = true;
        } else {
          this.context.lineTo(x, y);
        }
      }
    }

    if (hasMovedTo) {
      this.context.stroke();
    }
  },

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

  drawMultiLeadCursor() {
    if (!this.allLeadsCursorData || this.allLeadsCursorData.length === 0)
      return;

    for (const leadData of this.allLeadsCursorData) {
      const { xOffset, yOffset, columnWidth } = this.getLeadPosition(
        leadData.leadIndex
      );

      const columnTimeSpan = DEFAULT_WIDTH_SECONDS;
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

      this.renderLead(
        leadData.leadIndex,
        null,
        xOffset,
        yOffset,
        columnWidth,
        this.leadHeight,
        DEFAULT_WIDTH_SECONDS,
        cursorData
      );
    }
  },

  // ============================
  // RENDERING - LEAD COMPONENTS
  // ============================

  renderLeadBackground(leadIndex, xOffset, yOffset, width, height) {
    this.drawLeadGrid(xOffset, yOffset, width, height);
    this.drawLeadLabel(leadIndex, xOffset, yOffset);
  },

  renderLead(
    leadIndex,
    leadData,
    xOffset,
    yOffset,
    width,
    height,
    timeSpan,
    cursorData = null
  ) {
    this.renderLeadBackground(leadIndex, xOffset, yOffset, width, height);

    if (cursorData) {
      this.drawLeadCursor(
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

  renderGridBackground() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.canvas
      ? this.canvas.height / devicePixelRatio
      : this.displayMode === "multi"
      ? ROWS_PER_DISPLAY * (CHART_HEIGHT / MULTI_LEAD_HEIGHT_SCALE) +
        (ROWS_PER_DISPLAY - 1) * ROW_PADDING
      : CHART_HEIGHT;

    this.context.clearRect(0, 0, this.chartWidth, canvasHeight);

    if (this.displayMode === "multi") {
      for (let i = 0; i < this.leadNames.length; i++) {
        const { xOffset, yOffset, columnWidth } = this.getLeadPosition(i);
        this.renderLeadBackground(
          i,
          xOffset,
          yOffset,
          columnWidth,
          this.leadHeight
        );
      }
    } else {
      this.renderLeadBackground(
        this.currentLead,
        0,
        0,
        this.chartWidth,
        CHART_HEIGHT
      );
    }
  },

  drawLeadWaveform(times, values, xOffset, yOffset, width, height, timeSpan) {
    const pointCount = times.length;
    if (pointCount === 0) return;

    this.context.strokeStyle = this.colors.waveform;
    this.context.lineWidth = WAVEFORM_LINE_WIDTH;
    this.context.beginPath();

    const xScale = width / timeSpan;
    const yScale = height / (this.yMax - this.yMin);

    let hasMovedTo = false;
    for (let i = 0; i < pointCount; i++) {
      const x = xOffset + times[i] * xScale;
      const y = yOffset + height - (values[i] - this.yMin) * yScale;

      if (!hasMovedTo) {
        this.context.moveTo(x, y);
        hasMovedTo = true;
      } else {
        this.context.lineTo(x, y);
      }
    }

    this.context.stroke();
  },
};

export default ECGPlayback;
