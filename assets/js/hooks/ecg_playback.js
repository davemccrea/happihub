/*
 * HOW ECG WAVEFORM RENDERING WORKS - Simple Explanation
 *
 * Think of it like drawing on paper:
 *
 * 1. The Canvas is Like a Piece of Paper
 *    - The browser creates a rectangular drawing area (canvas)
 *    - It has X (left-right) and Y (up-down) coordinates
 *    - Like graph paper with invisible grid lines
 *
 * 2. The ECG Data is Like a List of Dots
 *    times:  [0.0, 0.1, 0.2, 0.3, 0.4, ...]
 *    values: [0.5, 0.8, 1.2, 0.9, 0.3, ...]
 *
 * 3. Converting Data to Screen Positions
 *    For each data point, the code asks: "Where should I put this dot on the canvas?"
 *
 *    Time 0.2 seconds → X position on canvas
 *    const x = (0.2 / 5.0) * 500; // If 5 seconds fits in 500 pixels
 *    Result: x = 20 pixels from left edge
 *
 *    Voltage 0.8 millivolts → Y position on canvas
 *    const y = 160 - ((0.8 - 0) / 2.0) * 160; // If 2mV fits in 160 pixels
 *    Result: y = 96 pixels from top
 *
 * 4. Drawing the Lines
 *    Imagine holding a pen:
 *    context.beginPath();           // Put pen on paper
 *    context.moveTo(x1, y1);        // Move to first dot (don't draw yet)
 *    context.lineTo(x2, y2);        // Draw line to second dot
 *    context.lineTo(x3, y3);        // Draw line to third dot
 *    context.lineTo(x4, y4);        // Draw line to fourth dot
 *    context.stroke();              // Actually make the ink appear
 *
 * 5. The Animation
 *    - Every 1/60th of a second, the code says "show me the next slice of data"
 *    - It erases the old waveform and draws the new one
 *    - Like flipping pages in a flipbook to create motion
 *
 * Visual Example:
 * If you have these 4 data points:
 *   Time: 0.0, 0.1, 0.2, 0.3
 *   Voltage: 0.5, 1.0, 0.8, 0.2
 *
 * The code:
 * 1. Calculates where each dot goes on the canvas
 * 2. Draws a line connecting: dot1 → dot2 → dot3 → dot4
 * 3. The connected lines form the familiar ECG wave shape
 *
 * That's it! It's just connecting dots with lines, but doing it very fast to create smooth animation.
 */

const MM_PER_SECOND = 25;
const MM_PER_MILLIVOLT = 10;
const PIXELS_PER_MM = 4;
const DEFAULT_WIDTH_SECONDS = 5;
const HEIGHT_MILLIVOLTS = 4;
const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM;
const DOT_RADIUS = 1.2;
const CONTAINER_PADDING = 40; // Padding to account for in container width calculation
const MULTI_LEAD_HEIGHT_SCALE = 1; // Scale factor for multi-lead display height
const LEADS_PER_COLUMN = 6; // Number of leads per column in multi-lead mode
const COLUMN_PADDING = 0; // Padding between columns

const ECGPlayback = {
  // === Lifecycle Methods ===
  async mounted() {
    this.isPlaying = this.el.dataset.isPlaying === "true";
    this.startTime = null;
    this.pausedTime = 0;
    this.currentCycle = 0;
    this.animationId = null;
    this.visibleTimes = [];
    this.visibleValues = [];
    // Read initial settings from data attributes
    this.gridType = this.el.dataset.gridType || "medical";
    this.displayMode = this.el.dataset.displayMode || "single";
    this.cursorVisible = this.el.dataset.cursorVisible === "true";
    this.loopEnabled = this.el.dataset.loopEnabled === "true";
    this.currentLead = parseInt(this.el.dataset.currentLead) || 0;
    this.leadHeight = CHART_HEIGHT; // Will be recalculated for multi-lead
    this.calculateMedicallyAccurateDimensions();

    // Initialize theme colors
    this.updateThemeColors();

    // Listen for window resize events
    this.resizeHandler = () => {
      this.calculateMedicallyAccurateDimensions();
      this.handleResize();
    };
    window.addEventListener("resize", this.resizeHandler);

    // Listen for theme changes
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          this.updateThemeColors();
          this.drawGrid(); // Redraw grid with new colors
          // Redraw waveform if paused
          if (!this.isPlaying && this.startTime && this.pausedTime) {
            const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
            const cursorProgress =
              (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
            const currentCycle = Math.floor(elapsedSeconds / this.widthSeconds);
            this.updateWaveform(cursorProgress, currentCycle);
          }
        }
      });
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

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
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }

    this.ecgLeadDatasets = null;
    this.currentLeadData = null;
    this.leadNames = null;
    this.visibleTimes = [];
    this.visibleValues = [];
    this.multiLeadVisibleData = null;
    this.eventHandlers = null;

    // Clean up grid cache
    if (this.gridCanvas) {
      this.gridCanvas = null;
    }
  },

  // === Layout Helper Methods ===
  getLeadColumnAndRow(leadIndex) {
    const column = Math.floor(leadIndex / LEADS_PER_COLUMN);
    const row = leadIndex % LEADS_PER_COLUMN;
    return { column, row };
  },

  getLeadPosition(leadIndex) {
    const { column, row } = this.getLeadColumnAndRow(leadIndex);
    const columnWidth = (this.chartWidth - COLUMN_PADDING) / 2;

    const xOffset = column * (columnWidth + COLUMN_PADDING);
    const yOffset = row * this.leadHeight;

    return { xOffset, yOffset, columnWidth };
  },

  // === Theme Methods ===
  updateThemeColors() {
    const theme =
      document.documentElement.getAttribute("data-theme") || "light";
    const isDark = theme === "dark";

    // Set theme-aware colors
    this.colors = {
      // Waveform colors
      waveform: isDark ? "#ffffff" : "#000000",
      cursor: isDark ? "#00ff00" : "#00ff00",

      // Grid colors for medical grid
      gridFine: isDark ? "#660000" : "#ff9999",
      gridBold: isDark ? "#990000" : "#ff6666",

      // Grid colors for simple grid (dots)
      gridDots: isDark ? "#666666" : "#999999",

      // Text colors
      labels: isDark ? "#ffffff" : "#333333",
    };
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

    const containerWidth = container.offsetWidth - CONTAINER_PADDING;
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
        ? LEADS_PER_COLUMN * (CHART_HEIGHT / MULTI_LEAD_HEIGHT_SCALE)
        : CHART_HEIGHT;

    this.leadHeight =
      this.displayMode === "multi"
        ? canvasHeight / LEADS_PER_COLUMN
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
    const response = await fetch("/assets/json/ptb-xl/14254_hr.json");
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

    // Convert original format to per-lead data structure
    this.ecgLeadDatasets = [];

    // Find min/max values across all leads for consistent scaling
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

    this.yMin = globalMin;
    this.yMax = globalMax;
    this.currentLeadData = this.ecgLeadDatasets[this.currentLead];

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

    // If paused, redraw current state to show/hide cursor immediately
    if (!this.isPlaying && this.startTime && this.pausedTime) {
      const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
      const cursorProgress =
        (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const currentCycle = Math.floor(elapsedSeconds / this.widthSeconds);
      const cursorPosition = cursorProgress * this.chartWidth;

      this.updateWaveform(cursorProgress, currentCycle);
      this.drawCursor(cursorPosition);
    }
  },

  handleLoopChange(loopEnabled) {
    this.loopEnabled = loopEnabled;
  },

  // === Data Management Methods ===
  findDataIndexByTime(targetTime) {
    return this.findDataIndexByTimeForLead(this.currentLeadData, targetTime);
  },

  findDataIndexByTimeForLead(leadData, targetTime) {
    // Use binary search since times are sorted
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

    // Return the closest index (left is the insertion point)
    return Math.min(left, leadData.times.length - 1);
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
    let elapsedTime =
      currentCycle * this.widthSeconds + cursorProgress * this.widthSeconds;

    if (elapsedTime >= this.totalDuration) {
      if (this.loopEnabled) {
        // Reset timing variables for seamless restart
        this.startTime = Date.now();
        this.currentCycle = 0;
        this.visibleTimes = [];
        this.visibleValues = [];
        this.multiLeadVisibleData = null;

        // Continue with the first frame of the new loop
        elapsedTime = cursorProgress * this.widthSeconds;
        currentCycle = 0;
      } else {
        // Only send playback_ended event when not looping
        this.pushEvent("playback_ended", {});
        this.stopAnimation();
        this.resetPlayback();
        return;
      }
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
      const startIndex = this.findDataIndexByTimeForLead(
        firstLead,
        cycleStartTime
      );
      const endIndex = this.findDataIndexByTimeForLead(firstLead, cycleEndTime);
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
    this.multiLeadVisibleData = null;

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
    this.multiLeadVisibleData = null;

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
    this.drawGridForLeadAtPosition(0, yOffset, this.chartWidth);
  },

  drawGridForLeadAtPosition(xOffset, yOffset, width) {
    if (this.gridType === "medical") {
      this.drawMedicalGridAtPosition(xOffset, yOffset, width);
    } else {
      this.drawSimpleGridAtPosition(xOffset, yOffset, width);
    }
  },

  drawLeadLabel(leadIndex, xOffset, yOffset) {
    this.context.fillStyle = this.colors.labels;
    this.context.font = "12px Arial";
    this.context.fillText(this.leadNames[leadIndex], xOffset + 5, yOffset + 15);
  },

  drawMedicalGridAtOffset(yOffset) {
    this.drawMedicalGridAtPosition(0, yOffset, this.chartWidth);
  },

  drawMedicalGridAtPosition(xOffset, yOffset, width) {
    const smallSquareSize = PIXELS_PER_MM;
    const largeSquareSize = 5 * PIXELS_PER_MM;
    const gridHeight =
      this.displayMode === "multi" ? this.leadHeight : CHART_HEIGHT;

    // Fine grid lines (1mm squares)
    this.context.strokeStyle = this.colors.gridFine;
    this.context.lineWidth = 0.5;
    this.context.beginPath();

    // Vertical lines - always use proper 1mm spacing
    for (
      let x = xOffset + smallSquareSize;
      x < xOffset + width;
      x += smallSquareSize
    ) {
      this.context.moveTo(x, yOffset);
      this.context.lineTo(x, yOffset + gridHeight);
    }

    // Horizontal lines - only draw within the lead strip bounds and maintain 1mm spacing
    for (let y = smallSquareSize; y <= gridHeight; y += smallSquareSize) {
      if (yOffset + y <= yOffset + gridHeight) {
        this.context.moveTo(xOffset, yOffset + y);
        this.context.lineTo(xOffset + width, yOffset + y);
      }
    }

    this.context.stroke();

    // Bold grid lines (5mm squares)
    this.context.strokeStyle = this.colors.gridBold;
    this.context.lineWidth = 1;
    this.context.beginPath();

    // Vertical bold lines - always use proper 5mm spacing
    for (
      let x = xOffset + largeSquareSize;
      x < xOffset + width;
      x += largeSquareSize
    ) {
      this.context.moveTo(x, yOffset);
      this.context.lineTo(x, yOffset + gridHeight);
    }

    // Horizontal bold lines - only draw within bounds and maintain 5mm spacing
    for (let y = largeSquareSize; y <= gridHeight; y += largeSquareSize) {
      if (yOffset + y <= yOffset + gridHeight) {
        this.context.moveTo(xOffset, yOffset + y);
        this.context.lineTo(xOffset + width, yOffset + y);
      }
    }

    this.context.stroke();
  },

  drawSimpleGridAtOffset(yOffset) {
    this.drawSimpleGridAtPosition(0, yOffset, this.chartWidth);
  },

  drawSimpleGridAtPosition(xOffset, yOffset, width) {
    const dotSpacing = 5 * PIXELS_PER_MM;
    const gridHeight =
      this.displayMode === "multi" ? this.leadHeight : CHART_HEIGHT;
    this.context.fillStyle = this.colors.gridDots;

    for (let x = xOffset + 5; x < xOffset + width - 5; x += dotSpacing) {
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
      ? LEADS_PER_COLUMN * (CHART_HEIGHT / MULTI_LEAD_HEIGHT_SCALE)
      : CHART_HEIGHT;

    this.context.clearRect(0, 0, this.chartWidth, canvasHeight);

    if (this.displayMode === "multi") {
      for (let i = 0; i < this.leadNames.length; i++) {
        const { xOffset, yOffset, columnWidth } = this.getLeadPosition(i);
        this.drawGridForLeadAtPosition(xOffset, yOffset, columnWidth);
        this.drawLeadLabel(i, xOffset, yOffset);
      }
    } else {
      this.drawGridForLeadAtPosition(0, 0, this.chartWidth);
      this.drawLeadLabel(this.currentLead, 0, 0);
    }
  },

  drawSingleLeadWaveform() {
    const pointCount = this.visibleTimes.length;
    if (pointCount > 0) {
      this.context.strokeStyle = this.colors.waveform;
      this.context.lineWidth = 1.25;
      this.context.beginPath();

      // Pre-calculate constants once per frame
      const xScale = this.chartWidth / this.widthSeconds;
      const yScale = CHART_HEIGHT / (this.yMax - this.yMin);
      const yOffset = CHART_HEIGHT;

      // Transform all coordinates at once
      const points = [];
      for (let i = 0; i < pointCount; i++) {
        points.push(
          this.visibleTimes[i] * xScale,
          yOffset - (this.visibleValues[i] - this.yMin) * yScale
        );
      }

      // Single canvas operation with batched coordinates
      if (points.length >= 2) {
        this.context.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) {
          this.context.lineTo(points[i], points[i + 1]);
        }
      }

      this.context.stroke();
    }
  },

  drawMultiLeadWaveform() {
    if (!this.multiLeadVisibleData) return;

    this.context.strokeStyle = this.colors.waveform;
    this.context.lineWidth = 1;

    // Pre-calculate constants once for all leads
    const yScale = this.leadHeight / (this.yMax - this.yMin);

    for (
      let leadIndex = 0;
      leadIndex < this.multiLeadVisibleData.length;
      leadIndex++
    ) {
      const leadData = this.multiLeadVisibleData[leadIndex];
      const { xOffset, yOffset, columnWidth } = this.getLeadPosition(leadIndex);
      const xScale = columnWidth / this.widthSeconds;
      const pointCount = leadData.times.length;

      if (pointCount > 0) {
        this.context.beginPath();

        // Transform all coordinates at once for this lead
        const points = [];
        for (let i = 0; i < pointCount; i++) {
          points.push(
            xOffset + leadData.times[i] * xScale,
            yOffset +
              this.leadHeight -
              (leadData.values[i] - this.yMin) * yScale
          );
        }

        // Single canvas operation with batched coordinates
        if (points.length >= 2) {
          this.context.moveTo(points[0], points[1]);
          for (let i = 2; i < points.length; i += 2) {
            this.context.lineTo(points[i], points[i + 1]);
          }
        }

        this.context.stroke();
      }
    }
  },

  drawCursor(cursorPosition) {
    if (!this.cursorVisible) return;

    this.context.strokeStyle = this.colors.cursor;
    this.context.lineWidth = 2;
    this.context.beginPath();
    this.context.moveTo(cursorPosition, 0);
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
    this.context.lineTo(cursorPosition, canvasHeight);
    this.context.stroke();
  },
};

export default ECGPlayback;
