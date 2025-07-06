const MM_PER_SECOND = 25;
const MM_PER_MILLIVOLT = 10;
const PIXELS_PER_MM = 4;
const DEFAULT_WIDTH_SECONDS = 5;
const HEIGHT_MILLIVOLTS = 4;
const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM;
const DOT_RADIUS = 1.2;

const ECGPlayback = {
  // === Lifecycle Methods ===
  async mounted() {
    this.isPlaying = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.currentCycle = 0;
    this.animationId = null;
    this.visibleTimes = [];
    this.visibleValues = [];
    this.gridType = "simple"; // "medical" or "simple"
    this.displayMode = "single"; // "single" or "multi"
    this.cursorVisible = true; // cursor visibility state
    this.loopEnabled = true; // loop playback when recording ends
    this.leadHeight = CHART_HEIGHT; // Will be recalculated for multi-lead
    this.calculateMedicallyAccurateDimensions();

    // Listen for window resize events
    this.resizeHandler = () => {
      this.calculateMedicallyAccurateDimensions();
      this.handleResize();
    };
    window.addEventListener("resize", this.resizeHandler);

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

    this.handleEvent("cursor_visibility_changed", (payload) => {
      this.handleCursorVisibilityChange(payload.cursor_visible);
    });

    this.handleEvent("loop_changed", (payload) => {
      this.handleLoopChange(payload.loop_enabled);
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
    }
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
    }

    this.ecgLeadDatasets = null;
    this.currentLeadData = null;
    this.leadNames = null;
    this.visibleTimes = [];
    this.visibleValues = [];
    this.eventHandlers = null;

    // Clean up grid cache
    if (this.gridCanvas) {
      this.gridCanvas = null;
    }
  },

  // === Initialization Methods ===
  async initializeECGChart() {
    this.currentLeadData = await this.loadECGData();
    // Ensure dimensions are calculated before canvas setup
    if (!this.widthSeconds) {
      this.calculateMedicallyAccurateDimensions();
    }
    this.updateCanvasSize();
    this.drawGrid();
  },

  calculateMedicallyAccurateDimensions() {
    const container = this.el.querySelector("[data-ecg-chart]");
    if (!container) {
      this.chartWidth = DEFAULT_WIDTH_SECONDS * MM_PER_SECOND * PIXELS_PER_MM;
      this.widthSeconds = DEFAULT_WIDTH_SECONDS;
      return;
    }

    const containerWidth = container.offsetWidth - 40; // Account for padding
    const minWidth = DEFAULT_WIDTH_SECONDS * MM_PER_SECOND * PIXELS_PER_MM;

    if (containerWidth < minWidth) {
      // If container is too small, use minimum width
      this.chartWidth = minWidth;
      this.widthSeconds = DEFAULT_WIDTH_SECONDS;
    } else {
      // Calculate how many seconds we can display while maintaining medical accuracy
      // Must maintain exactly 25mm/second (100 pixels/second at 4 pixels/mm)
      this.widthSeconds = containerWidth / (MM_PER_SECOND * PIXELS_PER_MM);
      this.chartWidth = this.widthSeconds * MM_PER_SECOND * PIXELS_PER_MM;
    }
  },

  handleResize() {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopAnimation();

    this.gridCanvas = null; // Invalidate grid cache
    this.updateCanvasSize();
    this.drawGrid();

    // Redraw current waveform if paused
    if (!wasPlaying && this.startTime && this.pausedTime) {
      const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
      const cursorProgress =
        (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const currentCycle = Math.floor(elapsedSeconds / this.widthSeconds);
      this.updateWaveform(cursorProgress, currentCycle);
    }

    if (wasPlaying) {
      this.isPlaying = true;
      this.executeAnimationLoop();
    }
  },

  updateCanvasSize() {
    if (this.canvas) {
      this.canvas.remove();
    }

    const canvasHeight =
      this.displayMode === "multi"
        ? this.leadNames.length * (CHART_HEIGHT / 1.5)
        : CHART_HEIGHT;

    this.leadHeight =
      this.displayMode === "multi"
        ? canvasHeight / this.leadNames.length
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

  async loadECGData() {
    const response = await fetch("/assets/json/10160-optimized.json");
    if (!response.ok) {
      throw new Error(`Failed to load ECG data: ${response.status}`);
    }

    const data = await response.json();

    if (!data.metadata || !data.leadNames || !data.leads) {
      throw new Error("Invalid optimized ECG data format");
    }

    this.samplingRate = data.metadata.samplingRate;
    this.leadNames = data.leadNames;
    this.currentLead = 0;
    this.totalDuration = data.metadata.totalDuration;

    this.ecgLeadDatasets = data.leads;
    this.currentLeadData = this.ecgLeadDatasets[this.currentLead];
    const globalRange = data.globalValueRange;
    this.yMin = globalRange.min;
    this.yMax = globalRange.max;

    return this.currentLeadData;
  },

  // === Event Handler Methods ===
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
      this.drawGrid();
    }
  },

  handleDisplayModeChange(displayMode) {
    if (displayMode === "single" || displayMode === "multi") {
      const wasPlaying = this.isPlaying;
      if (wasPlaying) this.stopAnimation();

      this.displayMode = displayMode;
      this.gridCanvas = null; // Invalidate grid cache
      this.updateCanvasSize();
      this.drawGrid();

      // Redraw current waveform if paused
      if (!wasPlaying && this.startTime && this.pausedTime) {
        const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
        const cursorProgress =
          (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
        const currentCycle = Math.floor(elapsedSeconds / this.widthSeconds);
        this.updateWaveform(cursorProgress, currentCycle);
      }

      if (wasPlaying) {
        this.isPlaying = true;
        this.executeAnimationLoop();
      }
    }
  },

  handleCursorVisibilityChange(cursorVisible) {
    this.cursorVisible = cursorVisible;
    // No need to restart animation, just update the visibility flag
    // The cursor will be drawn or not based on this flag in the next animation frame
  },

  handleLoopChange(loopEnabled) {
    this.loopEnabled = loopEnabled;
  },

  // === Data Management Methods ===
  findDataIndexByTime(targetTime) {
    // Use binary search since times are sorted
    if (!this.currentLeadData || !this.currentLeadData.times.length) {
      return 0;
    }

    let left = 0;
    let right = this.currentLeadData.times.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = this.currentLeadData.times[mid];

      if (midTime === targetTime) {
        return mid;
      } else if (midTime < targetTime) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    // Return the closest index (left is the insertion point)
    return Math.min(left, this.currentLeadData.times.length - 1);
  },

  switchLead(leadIndex) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopAnimation();

    this.currentLead = leadIndex;
    this.currentLeadData = this.ecgLeadDatasets[leadIndex];

    // Redraw grid to update lead label in single-lead mode
    if (this.displayMode === "single") {
      this.drawGrid();
    }

    if (wasPlaying) {
      this.isPlaying = true;
      this.executeAnimationLoop();
    } else {
      // When paused, maintain the current waveform display for the new lead
      // by redrawing with the current progress
      if (this.startTime && this.pausedTime) {
        const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
        const cursorProgress =
          (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
        const currentCycle = Math.floor(elapsedSeconds / this.widthSeconds);
        this.updateWaveform(cursorProgress, currentCycle);
      } else {
        this.clearWaveform();
      }
    }
  },

  updateWaveform(cursorProgress, currentCycle) {
    const elapsedTime =
      currentCycle * this.widthSeconds + cursorProgress * this.widthSeconds;

    if (elapsedTime >= this.totalDuration) {
      this.pushEvent("playback_ended", {});

      if (this.loopEnabled) {
        // Reset timing variables for seamless restart
        this.startTime = Date.now();
        this.currentCycle = 0;
        this.visibleTimes = [];
        this.visibleValues = [];
      } else {
        // Stop playback when loop is disabled
        this.stopAnimation();
        this.resetPlayback();
      }
      return;
    }

    const currentTime = cursorProgress * this.widthSeconds;
    const cycleStartTime = currentCycle * this.widthSeconds;
    const cycleEndTime = cycleStartTime + currentTime;

    if (this.displayMode === "single") {
      // Use binary search to find exact data range - much more efficient!
      const startIndex = this.findDataIndexByTime(cycleStartTime);
      const endIndex = this.findDataIndexByTime(cycleEndTime);

      // Extract only the data we need using slice (more efficient)
      const startIdx = Math.max(0, startIndex);
      const endIdx = Math.min(this.currentLeadData.times.length - 1, endIndex);

      // Use slice for better performance than individual pushes
      const slicedTimes = this.currentLeadData.times.slice(
        startIdx,
        endIdx + 1
      );
      const slicedValues = this.currentLeadData.values.slice(
        startIdx,
        endIdx + 1
      );

      this.visibleTimes = slicedTimes.map((time) => time - cycleStartTime);
      this.visibleValues = slicedValues;
    } else {
      // Multi-lead mode: prepare data for all leads (optimized)
      this.multiLeadVisibleData = [];

      // Since all leads have the same timing structure, calculate indices once
      const firstLead = this.ecgLeadDatasets[0];
      // Temporarily set currentLeadData to use the helper method
      const originalLeadData = this.currentLeadData;
      this.currentLeadData = firstLead;
      const startIndex = this.findDataIndexByTime(cycleStartTime);
      const endIndex = this.findDataIndexByTime(cycleEndTime);
      this.currentLeadData = originalLeadData;
      const startIdx = Math.max(0, startIndex);
      const endIdx = Math.min(firstLead.times.length - 1, endIndex);

      // Pre-calculate times once (all leads share same timing)
      const sharedTimes = firstLead.times
        .slice(startIdx, endIdx + 1)
        .map((time) => time - cycleStartTime);

      for (
        let leadIndex = 0;
        leadIndex < this.ecgLeadDatasets.length;
        leadIndex++
      ) {
        const leadData = this.ecgLeadDatasets[leadIndex];
        const leadVisibleValues = leadData.values.slice(startIdx, endIdx + 1);

        this.multiLeadVisibleData.push({
          times: sharedTimes,
          values: leadVisibleValues,
          name: this.leadNames[leadIndex],
        });
      }
    }

    this.drawWaveform();
  },

  // === Animation Control Methods ===
  startAnimation() {
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.currentCycle = 0;

    this.visibleTimes = [];
    this.visibleValues = [];

    this.executeAnimationLoop();
  },

  resumeAnimation() {
    if (!this.startTime) {
      this.startAnimation();
    } else {
      const pauseDuration = Date.now() - this.pausedTime;
      this.startTime += pauseDuration;
      this.pausedTime = 0;
      this.executeAnimationLoop();
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
    this.currentCycle = 0;

    this.visibleTimes = [];
    this.visibleValues = [];

    this.clearWaveform();
  },

  executeAnimationLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    const animate = () => {
      if (!this.isPlaying) {
        this.stopAnimation();
        return;
      }

      const currentTime = Date.now();
      const elapsedSeconds = (currentTime - this.startTime) / 1000;
      const cursorProgress =
        (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const cursorPosition = cursorProgress * this.chartWidth;
      const currentCycle = Math.floor(elapsedSeconds / this.widthSeconds);

      if (currentCycle !== this.currentCycle) {
        this.currentCycle = currentCycle;
      }

      this.updateWaveform(cursorProgress, currentCycle);
      this.drawCursor(cursorPosition);

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  },

  // === Rendering Methods ===
  drawGrid() {
    // Invalidate grid cache when grid changes
    this.gridCanvas = null;
    this.drawGridOnly();
  },

  drawGridForLead(yOffset) {
    if (this.gridType === "medical") {
      this.drawMedicalGridAtOffset(yOffset);
    } else {
      this.drawSimpleGridAtOffset(yOffset);
    }
  },

  drawLeadLabel(leadIndex, yOffset) {
    this.context.fillStyle = "#333";
    this.context.font = "12px Arial";
    this.context.fillText(this.leadNames[leadIndex], 5, yOffset + 15);
  },

  drawMedicalGridAtOffset(yOffset) {
    const smallSquareSize = PIXELS_PER_MM;
    const largeSquareSize = 5 * PIXELS_PER_MM;
    const gridHeight =
      this.displayMode === "multi" ? this.leadHeight : CHART_HEIGHT;

    // Fine grid lines (1mm squares)
    this.context.strokeStyle = "#ff9999";
    this.context.lineWidth = 0.5;
    this.context.beginPath();

    // Vertical lines - always use proper 1mm spacing
    for (let x = smallSquareSize; x < this.chartWidth; x += smallSquareSize) {
      this.context.moveTo(x, yOffset);
      this.context.lineTo(x, yOffset + gridHeight);
    }

    // Horizontal lines - only draw within the lead strip bounds and maintain 1mm spacing
    for (let y = smallSquareSize; y <= gridHeight; y += smallSquareSize) {
      if (yOffset + y <= yOffset + gridHeight) {
        this.context.moveTo(0, yOffset + y);
        this.context.lineTo(this.chartWidth, yOffset + y);
      }
    }

    this.context.stroke();

    // Bold grid lines (5mm squares)
    this.context.strokeStyle = "#ff6666";
    this.context.lineWidth = 1;
    this.context.beginPath();

    // Vertical bold lines - always use proper 5mm spacing
    for (let x = largeSquareSize; x < this.chartWidth; x += largeSquareSize) {
      this.context.moveTo(x, yOffset);
      this.context.lineTo(x, yOffset + gridHeight);
    }

    // Horizontal bold lines - only draw within bounds and maintain 5mm spacing
    for (let y = largeSquareSize; y <= gridHeight; y += largeSquareSize) {
      if (yOffset + y <= yOffset + gridHeight) {
        this.context.moveTo(0, yOffset + y);
        this.context.lineTo(this.chartWidth, yOffset + y);
      }
    }

    this.context.stroke();
  },

  drawSimpleGridAtOffset(yOffset) {
    const dotSpacing = 5 * PIXELS_PER_MM;
    const gridHeight =
      this.displayMode === "multi" ? this.leadHeight : CHART_HEIGHT;
    this.context.fillStyle = "#d0d0d0";

    for (let x = 5; x < this.chartWidth - 5; x += dotSpacing) {
      for (let y = 5; y < gridHeight - 5; y += dotSpacing) {
        this.context.beginPath();
        this.context.arc(x, yOffset + y, DOT_RADIUS, 0, 2 * Math.PI);
        this.context.fill();
      }
    }
  },

  clearWaveform() {
    this.clearWaveformOnly();
  },

  drawWaveform() {
    // Only clear the waveform area, not the entire canvas
    this.clearWaveformOnly();

    if (this.displayMode === "single") {
      this.drawSingleLeadWaveform();
    } else {
      this.drawMultiLeadWaveform();
    }
  },

  clearWaveformOnly() {
    // Create a temporary canvas to preserve the grid
    if (!this.gridCanvas) {
      this.cacheGrid();
    }

    // Clear entire canvas
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.canvas.height / devicePixelRatio;
    this.context.clearRect(0, 0, this.chartWidth, canvasHeight);

    // Restore grid from cache at proper scale
    this.context.drawImage(
      this.gridCanvas,
      0,
      0,
      this.chartWidth,
      canvasHeight
    );
  },

  cacheGrid() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.canvas.height / devicePixelRatio;

    this.gridCanvas = document.createElement("canvas");
    this.gridCanvas.width = this.chartWidth;
    this.gridCanvas.height = canvasHeight;

    // Set actual canvas size for high-DPI displays
    this.gridCanvas.width = this.chartWidth * devicePixelRatio;
    this.gridCanvas.height = canvasHeight * devicePixelRatio;
    this.gridCanvas.style.width = this.chartWidth + "px";
    this.gridCanvas.style.height = canvasHeight + "px";

    const gridContext = this.gridCanvas.getContext("2d");
    gridContext.scale(devicePixelRatio, devicePixelRatio);

    // Draw grid to cache
    const originalContext = this.context;
    this.context = gridContext;
    this.drawGridOnly();
    this.context = originalContext;
  },

  drawGridOnly() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.canvas
      ? this.canvas.height / devicePixelRatio
      : this.displayMode === "multi"
      ? this.leadNames.length * (CHART_HEIGHT / 4)
      : CHART_HEIGHT;

    this.context.clearRect(0, 0, this.chartWidth, canvasHeight);

    if (this.displayMode === "multi") {
      for (let i = 0; i < this.leadNames.length; i++) {
        const yOffset = i * this.leadHeight;
        this.drawGridForLead(yOffset);
        this.drawLeadLabel(i, yOffset);
      }
    } else {
      this.drawGridForLead(0);
      this.drawLeadLabel(this.currentLead, 0);
    }
  },

  drawSingleLeadWaveform() {
    const pointCount = this.visibleTimes.length;
    if (pointCount > 0) {
      this.context.strokeStyle = "#000000";
      this.context.lineWidth = 1.25;
      this.context.beginPath();

      for (let i = 0; i < pointCount; i++) {
        const x = (this.visibleTimes[i] / this.widthSeconds) * this.chartWidth;
        const y =
          CHART_HEIGHT -
          ((this.visibleValues[i] - this.yMin) / (this.yMax - this.yMin)) *
            CHART_HEIGHT;

        if (i === 0) {
          this.context.moveTo(x, y);
        } else {
          this.context.lineTo(x, y);
        }
      }

      this.context.stroke();
    }
  },

  drawMultiLeadWaveform() {
    if (!this.multiLeadVisibleData) return;

    this.context.strokeStyle = "#000000";
    this.context.lineWidth = 1;

    for (
      let leadIndex = 0;
      leadIndex < this.multiLeadVisibleData.length;
      leadIndex++
    ) {
      const leadData = this.multiLeadVisibleData[leadIndex];
      const yOffset = leadIndex * this.leadHeight;
      const pointCount = leadData.times.length;

      if (pointCount > 0) {
        this.context.beginPath();

        for (let i = 0; i < pointCount; i++) {
          const x = (leadData.times[i] / this.widthSeconds) * this.chartWidth;
          const y =
            yOffset +
            this.leadHeight -
            ((leadData.values[i] - this.yMin) / (this.yMax - this.yMin)) *
              this.leadHeight;

          if (i === 0) {
            this.context.moveTo(x, y);
          } else {
            this.context.lineTo(x, y);
          }
        }

        this.context.stroke();
      }
    }
  },

  drawCursor(cursorPosition) {
    if (!this.cursorVisible) return;

    this.context.strokeStyle = "#00000";
    this.context.lineWidth = 1;
    this.context.beginPath();
    this.context.moveTo(cursorPosition, 0);
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
    this.context.lineTo(cursorPosition, canvasHeight);
    this.context.stroke();
  },
};

export default ECGPlayback;
