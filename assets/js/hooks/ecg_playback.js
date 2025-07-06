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
const DEFAULT_WIDTH_SECONDS = 2.5;
const HEIGHT_MILLIVOLTS = 2.5;
const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM;
const DOT_RADIUS = 1.2;
const CONTAINER_PADDING = 40; // Padding to account for in container width calculation
const MULTI_LEAD_HEIGHT_SCALE = 1; // Scale factor for multi-lead display height
const COLUMNS_PER_DISPLAY = 4; // Number of columns in multi-lead mode (traditional ECG layout)
const ROWS_PER_DISPLAY = 3; // Number of rows in multi-lead mode
const COLUMN_PADDING = 0; // Padding between columns
const ROW_PADDING = 0; // Padding between rows
const WAVEFORM_LINE_WIDTH = 1.25;

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
    // Sweep mode variables
    this.sweepPosition = 0;
    this.sweepWidth = 20; // Width of sweep erase area in pixels
    this.sweepWaveformData = null;
    this.multiLeadSweepData = null;
    // Read initial settings from data attributes
    this.gridType = this.el.dataset.gridType || "medical";
    this.displayMode = this.el.dataset.displayMode || "single";
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

    // Add keyboard event listeners for lead switching and playback control (only when focused)
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

    // Make the element focusable and add focus styling
    this.el.setAttribute("tabindex", "0");
    this.el.style.outline = "none";

    // Add focus/blur event listeners
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
    this.visibleTimes = [];
    this.visibleValues = [];
    this.multiLeadVisibleData = null;
    this.eventHandlers = null;

    // Clean up grid cache properly
    if (this.gridCanvas) {
      this.gridCanvas.remove();
      this.gridCanvas = null;
    }

    this.sweepBuffer = null;
    this.context = null;
  },

  // === Layout Helper Methods ===
  getLeadColumnAndRow(leadIndex) {
    // Custom lead ordering for traditional ECG layout:
    // Column 0: I(0), II(1), III(2)
    // Column 1: aVR(3), aVL(4), aVF(5)
    // Column 2: V1(6), V2(7), V3(8)
    // Column 3: V4(9), V5(10), V6(11)
    const leadPositions = [
      { column: 0, row: 0 }, // I
      { column: 0, row: 1 }, // II
      { column: 0, row: 2 }, // III
      { column: 1, row: 0 }, // aVR
      { column: 1, row: 1 }, // aVL
      { column: 1, row: 2 }, // aVF
      { column: 2, row: 0 }, // V1
      { column: 2, row: 1 }, // V2
      { column: 2, row: 2 }, // V3
      { column: 3, row: 0 }, // V4
      { column: 3, row: 1 }, // V5
      { column: 3, row: 2 }, // V6
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

  // === Theme Methods ===
  updateThemeColors() {
    const theme =
      document.documentElement.getAttribute("data-theme") || "light";
    const isDark = theme === "dark";

    // Set theme-aware colors
    this.colors = {
      // Waveform colors
      waveform: isDark ? "#ffffff" : "#000000",

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

    // Use fixed medical voltage scale instead of auto-scaling
    // Center the waveform in the available height range
    this.yMin = -HEIGHT_MILLIVOLTS / 2; // e.g., -1.25mV for 2.5mV total range
    this.yMax = HEIGHT_MILLIVOLTS / 2; // e.g., +1.25mV for 2.5mV total range
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

  switchToNextLead() {
    if (!this.ecgLeadDatasets || this.ecgLeadDatasets.length === 0) return;

    if (this.currentLead < this.ecgLeadDatasets.length - 1) {
      const nextLead = this.currentLead + 1;
      this.switchLead(nextLead);

      // Notify the LiveView of the lead change
      this.pushEvent("lead_changed", { lead: nextLead });
    }
  },

  switchToPrevLead() {
    if (!this.ecgLeadDatasets || this.ecgLeadDatasets.length === 0) return;

    if (this.currentLead > 0) {
      const prevLead = this.currentLead - 1;
      this.switchLead(prevLead);

      // Notify the LiveView of the lead change
      this.pushEvent("lead_changed", { lead: prevLead });
    }
  },

  togglePlayback() {
    const newPlayingState = !this.isPlaying;
    this.isPlaying = newPlayingState;

    // Notify the LiveView of the playback change
    this.pushEvent("playback_changed", { is_playing: newPlayingState });

    if (newPlayingState) {
      this.resumeAnimation();
    } else {
      this.pauseAnimation();
    }
  },

  updateWaveform(cursorProgress, currentCycle) {
    let elapsedTime =
      currentCycle * this.widthSeconds + cursorProgress * this.widthSeconds;

    if (elapsedTime >= this.totalDuration) {
      // Send playback_ended event and stop
      this.pushEvent("playback_ended", {});
      this.stopAnimation();
      this.resetPlayback();
      return;
    }

    // Calculate sweep position based on elapsed time
    this.sweepPosition = (elapsedTime * this.chartWidth) / this.widthSeconds;
    
    // Wrap sweep position when it exceeds chart width
    this.sweepPosition = this.sweepPosition % this.chartWidth;
    
    // Calculate the time window to display (one screen width of data)
    const currentScreenStartTime = Math.floor(elapsedTime / this.widthSeconds) * this.widthSeconds;
    
    // Get current data time
    const currentDataTime = elapsedTime;

    if (this.displayMode === "single") {
      // Get data for the current sweep window
      const startIndex = this.findDataIndexByTime(currentScreenStartTime);
      const endIndex = this.findDataIndexByTime(currentDataTime);
      
      if (endIndex >= startIndex && startIndex < this.currentLeadData.times.length) {
        const times = this.currentLeadData.times.slice(startIndex, endIndex + 1);
        const values = this.currentLeadData.values.slice(startIndex, endIndex + 1);
        
        this.sweepWaveformData = {
          times: times.map(t => (t - currentScreenStartTime)),
          values: values
        };
      } else {
        this.sweepWaveformData = {
          times: [],
          values: []
        };
      }
    } else {
      // Multi-lead mode: each column shows DEFAULT_WIDTH_SECONDS worth of data
      // Calculate time window for multi-lead columns
      const columnTimeSpan = DEFAULT_WIDTH_SECONDS;
      const columnDataTime = elapsedTime;
      
      this.multiLeadSweepData = [];
      
      for (let leadIndex = 0; leadIndex < this.ecgLeadDatasets.length; leadIndex++) {
        const leadData = this.ecgLeadDatasets[leadIndex];
        
        // Get data from start of current column cycle to current position
        const columnCycleStart = Math.floor(elapsedTime / columnTimeSpan) * columnTimeSpan;
        const startDataTime = columnCycleStart;
        
        const startIndex = this.findDataIndexByTimeForLead(leadData, startDataTime);
        const endIndex = this.findDataIndexByTimeForLead(leadData, columnDataTime);
        
        if (endIndex >= startIndex && startIndex < leadData.times.length) {
          const times = leadData.times.slice(startIndex, endIndex + 1);
          const values = leadData.values.slice(startIndex, endIndex + 1);
          
          this.multiLeadSweepData.push({
            leadIndex,
            times: times.map(t => (t - startDataTime)),
            values: values
          });
        }
      }
    }

    this.drawSweepWaveform();
  },

  // === Animation Control Methods ===
  startAnimation() {
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.currentCycle = 0;
    this.sweepPosition = 0;

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
    this.sweepPosition = 0;

    this.visibleTimes = [];
    this.visibleValues = [];
    this.multiLeadVisibleData = null;

    this.clearWaveform();
  },

  executeAnimationLoop() {
    // Safety check to prevent multiple animation loops
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    const animate = () => {
      // Additional safety check in case cleanup was called
      if (!this.isPlaying || !this.canvas) {
        this.stopAnimation();
        return;
      }

      const currentTime = Date.now();
      const elapsedSeconds = (currentTime - this.startTime) / 1000;
      const cursorProgress =
        (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const currentCycle = Math.floor(elapsedSeconds / this.widthSeconds);

      if (currentCycle !== this.currentCycle) {
        this.currentCycle = currentCycle;
      }

      this.updateWaveform(cursorProgress, currentCycle);

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

  // Unified grid rendering method for any lead bounds
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
      this.context.lineTo(x, yOffset + height);
    }

    // Horizontal lines - only draw within the lead strip bounds and maintain 1mm spacing
    for (let y = smallSquareSize; y <= height; y += smallSquareSize) {
      if (yOffset + y <= yOffset + height) {
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
      this.context.lineTo(x, yOffset + height);
    }

    // Horizontal bold lines - only draw within bounds and maintain 5mm spacing
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

  clearWaveform() {
    // For sweep mode, clear entire canvas and redraw grid
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.canvas.height / devicePixelRatio;
    this.context.clearRect(0, 0, this.chartWidth, canvasHeight);
    this.drawGridOnly();
  },

  drawSweepWaveform() {
    if (this.displayMode === "single") {
      this.drawSingleLeadSweep();
    } else {
      this.drawMultiLeadSweep();
    }
  },


  // Unified Y-position calculation for any lead height
  calculateYForLead(value, height) {
    const yScale = height / (this.yMax - this.yMin);
    return height - (value - this.yMin) * yScale;
  },

  clearSweepArea(x, width) {
    // Clear a vertical strip and redraw grid in that area
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.canvas.height / devicePixelRatio;
    
    // Clear the strip
    this.context.clearRect(x, 0, width, canvasHeight);
    
    // Redraw grid in the cleared area
    this.context.save();
    this.context.beginPath();
    this.context.rect(x, 0, width, canvasHeight);
    this.context.clip();
    
    if (this.displayMode === "single") {
      this.renderLeadBackground(this.currentLead, 0, 0, this.chartWidth, CHART_HEIGHT);
    } else {
      for (let i = 0; i < this.leadNames.length; i++) {
        const { xOffset, yOffset, columnWidth } = this.getLeadPosition(i);
        this.renderLeadBackground(i, xOffset, yOffset, columnWidth, this.leadHeight);
      }
    }
    
    this.context.restore();
  },

  // Unified sweep rendering method for any lead bounds
  drawLeadSweep(times, values, xOffset, yOffset, width, height, timeSpan, sweepPosition, sweepWidth) {
    if (!times || times.length === 0) return;
    
    // Clear sweep area ahead of current position
    const clearX = Math.max(xOffset, sweepPosition - sweepWidth/2);
    const clearWidth = Math.min(sweepWidth, xOffset + width - clearX);
    
    if (clearWidth > 0) {
      this.clearSweepArea(clearX, clearWidth);
    }
    
    // Draw the accumulated waveform data
    this.context.strokeStyle = this.colors.waveform;
    this.context.lineWidth = WAVEFORM_LINE_WIDTH;
    this.context.beginPath();
    
    // Pre-calculate constants
    const xScale = width / timeSpan;
    const yScale = height / (this.yMax - this.yMin);
    
    // Draw the waveform up to the current sweep position
    let hasMovedTo = false;
    for (let i = 0; i < times.length; i++) {
      const x = xOffset + times[i] * xScale;
      const y = yOffset + height - (values[i] - this.yMin) * yScale;
      
      if (x <= sweepPosition) {
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

  drawSingleLeadSweep() {
    if (!this.sweepWaveformData || this.sweepWaveformData.times.length === 0) return;
    
    const sweepClearWidth = this.sweepWidth || 20;
    const sweepData = {
      times: this.sweepWaveformData.times,
      values: this.sweepWaveformData.values,
      sweepPosition: this.sweepPosition,
      sweepWidth: sweepClearWidth
    };
    
    this.renderLead(
      this.currentLead,
      null, // No base lead data, only sweep data
      0,
      0,
      this.chartWidth,
      CHART_HEIGHT,
      this.widthSeconds,
      sweepData
    );
  },

  drawMultiLeadSweep() {
    if (!this.multiLeadSweepData || this.multiLeadSweepData.length === 0) return;
    
    for (const leadData of this.multiLeadSweepData) {
      const { xOffset, yOffset, columnWidth } = this.getLeadPosition(leadData.leadIndex);
      
      // Calculate local sweep position based on column time cycle
      const columnTimeSpan = DEFAULT_WIDTH_SECONDS;
      const columnProgress = (this.sweepPosition / this.chartWidth) * (this.widthSeconds / columnTimeSpan);
      const localSweepPosition = xOffset + (columnProgress % 1) * columnWidth;
      
      // Use thinner sweep width for multi-lead mode
      const sweepClearWidth = 8;
      const sweepData = {
        times: leadData.times,
        values: leadData.values,
        sweepPosition: localSweepPosition,
        sweepWidth: sweepClearWidth
      };
      
      this.renderLead(
        leadData.leadIndex,
        null, // No base lead data, only sweep data
        xOffset,
        yOffset,
        columnWidth,
        this.leadHeight,
        DEFAULT_WIDTH_SECONDS,
        sweepData
      );
    }
  },

  clearWaveformOnly() {
    // In sweep mode, we don't clear the entire waveform
    // This method is kept for compatibility but does nothing
    // All clearing is handled by clearSweepArea
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

  // Unified method to render a single lead (grid + label)
  renderLeadBackground(leadIndex, xOffset, yOffset, width, height) {
    this.drawLeadGrid(xOffset, yOffset, width, height);
    this.drawLeadLabel(leadIndex, xOffset, yOffset);
  },

  // Unified method to render a complete lead (background + waveform/sweep)
  renderLead(leadIndex, leadData, xOffset, yOffset, width, height, timeSpan, sweepData = null) {
    // Draw background (grid + label)
    this.renderLeadBackground(leadIndex, xOffset, yOffset, width, height);
    
    // Draw waveform data if available
    if (sweepData) {
      // Sweep mode
      this.drawLeadSweep(
        sweepData.times,
        sweepData.values,
        xOffset,
        yOffset,
        width,
        height,
        timeSpan,
        sweepData.sweepPosition,
        sweepData.sweepWidth
      );
    } else if (leadData && leadData.times && leadData.values) {
      // Normal waveform mode
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

  drawGridOnly() {
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
        this.renderLeadBackground(i, xOffset, yOffset, columnWidth, this.leadHeight);
      }
    } else {
      this.renderLeadBackground(this.currentLead, 0, 0, this.chartWidth, CHART_HEIGHT);
    }
  },

  // Unified waveform rendering method for any lead bounds
  drawLeadWaveform(times, values, xOffset, yOffset, width, height, timeSpan) {
    const pointCount = times.length;
    if (pointCount === 0) return;

    this.context.strokeStyle = this.colors.waveform;
    this.context.lineWidth = WAVEFORM_LINE_WIDTH;
    this.context.beginPath();

    // Pre-calculate constants once per frame
    const xScale = width / timeSpan;
    const yScale = height / (this.yMax - this.yMin);

    // Transform all coordinates at once
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

  drawSingleLeadWaveform() {
    const pointCount = this.visibleTimes.length;
    if (pointCount > 0) {
      const leadData = { times: this.visibleTimes, values: this.visibleValues };
      this.renderLead(
        this.currentLead,
        leadData,
        0,
        0,
        this.chartWidth,
        CHART_HEIGHT,
        this.widthSeconds
      );
    }
  },

  drawMultiLeadWaveform() {
    if (!this.multiLeadVisibleData) return;

    for (
      let leadIndex = 0;
      leadIndex < this.multiLeadVisibleData.length;
      leadIndex++
    ) {
      const leadData = this.multiLeadVisibleData[leadIndex];
      const { xOffset, yOffset, columnWidth } = this.getLeadPosition(leadIndex);

      this.renderLead(
        leadIndex,
        leadData,
        xOffset,
        yOffset,
        columnWidth,
        this.leadHeight,
        this.widthSeconds
      );
    }
  },

};

export default ECGPlayback;
