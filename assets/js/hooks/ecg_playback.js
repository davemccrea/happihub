const MM_PER_SECOND = 25;
const MM_PER_MILLIVOLT = 10;
const PIXELS_PER_MM = 4;
const WIDTH_SECONDS = 5;
const HEIGHT_MILLIVOLTS = 4;
const CHART_WIDTH = WIDTH_SECONDS * MM_PER_SECOND * PIXELS_PER_MM;
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
    this.gridType = "medical"; // "medical" or "simple"
    this.displayMode = "single"; // "single" or "multi"
    this.leadHeight = CHART_HEIGHT; // Will be recalculated for multi-lead

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
    this.updateCanvasSize();
    this.drawGrid();
  },

  updateCanvasSize() {
    if (this.canvas) {
      this.canvas.remove();
    }

    const canvasHeight =
      this.displayMode === "multi"
        ? this.leadNames.length * (CHART_HEIGHT / 4)
        : CHART_HEIGHT;

    this.leadHeight =
      this.displayMode === "multi"
        ? canvasHeight / this.leadNames.length
        : CHART_HEIGHT;

    const canvas = document.createElement("canvas");
    canvas.width = CHART_WIDTH;
    canvas.height = canvasHeight;
    this.el.querySelector("[data-ecg-chart]").appendChild(canvas);
    this.canvas = canvas;

    this.context = canvas.getContext("2d");

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = CHART_WIDTH * devicePixelRatio;
    canvas.height = canvasHeight * devicePixelRatio;
    canvas.style.width = CHART_WIDTH + "px";
    canvas.style.height = canvasHeight + "px";
    this.context.scale(devicePixelRatio, devicePixelRatio);
  },

  async loadECGData() {
    const response = await fetch("/assets/js/00020-optimized.json");
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

      if (wasPlaying) {
        this.isPlaying = true;
        this.executeAnimationLoop();
      }
    }
  },

  // === Data Management Methods ===
  switchLead(leadIndex) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopAnimation();

    this.currentLead = leadIndex;
    this.currentLeadData = this.ecgLeadDatasets[leadIndex];

    if (wasPlaying) {
      this.isPlaying = true;
      this.executeAnimationLoop();
    } else {
      this.clearWaveform();
    }
  },

  updateWaveform(sweepProgress, currentCycle) {
    if (currentCycle * WIDTH_SECONDS >= this.totalDuration) {
      this.stopAnimation();
      this.resetPlayback();
      this.pushEvent("playback_ended", {});
      return;
    }

    const currentTime = sweepProgress * WIDTH_SECONDS;
    const cycleStartTime = currentCycle * WIDTH_SECONDS;
    const cycleEndTime = cycleStartTime + currentTime;

    if (this.displayMode === "single") {
      this.visibleTimes = [];
      this.visibleValues = [];

      for (let i = 0; i < this.currentLeadData.times.length; i++) {
        const dataTime = this.currentLeadData.times[i];

        if (dataTime >= cycleStartTime && dataTime <= cycleEndTime) {
          this.visibleTimes.push(dataTime - cycleStartTime);
          this.visibleValues.push(this.currentLeadData.values[i]);
        }
      }
    } else {
      // Multi-lead mode: prepare data for all leads
      this.multiLeadVisibleData = [];

      for (
        let leadIndex = 0;
        leadIndex < this.ecgLeadDatasets.length;
        leadIndex++
      ) {
        const leadData = this.ecgLeadDatasets[leadIndex];
        const leadVisibleTimes = [];
        const leadVisibleValues = [];

        for (let i = 0; i < leadData.times.length; i++) {
          const dataTime = leadData.times[i];

          if (dataTime >= cycleStartTime && dataTime <= cycleEndTime) {
            leadVisibleTimes.push(dataTime - cycleStartTime);
            leadVisibleValues.push(leadData.values[i]);
          }
        }

        this.multiLeadVisibleData.push({
          times: leadVisibleTimes,
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
      const sweepProgress = (elapsedSeconds % WIDTH_SECONDS) / WIDTH_SECONDS;
      const sweepLinePosition = sweepProgress * CHART_WIDTH;
      const currentCycle = Math.floor(elapsedSeconds / WIDTH_SECONDS);

      if (currentCycle !== this.currentCycle) {
        this.currentCycle = currentCycle;
      }

      this.updateWaveform(sweepProgress, currentCycle);
      this.drawSweepLine(sweepLinePosition);

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
    for (let x = smallSquareSize; x < CHART_WIDTH; x += smallSquareSize) {
      this.context.moveTo(x, yOffset);
      this.context.lineTo(x, yOffset + gridHeight);
    }

    // Horizontal lines - only draw within the lead strip bounds and maintain 1mm spacing
    for (let y = smallSquareSize; y <= gridHeight; y += smallSquareSize) {
      if (yOffset + y <= yOffset + gridHeight) {
        this.context.moveTo(0, yOffset + y);
        this.context.lineTo(CHART_WIDTH, yOffset + y);
      }
    }

    this.context.stroke();

    // Bold grid lines (5mm squares)
    this.context.strokeStyle = "#ff6666";
    this.context.lineWidth = 1;
    this.context.beginPath();

    // Vertical bold lines - always use proper 5mm spacing
    for (let x = largeSquareSize; x < CHART_WIDTH; x += largeSquareSize) {
      this.context.moveTo(x, yOffset);
      this.context.lineTo(x, yOffset + gridHeight);
    }

    // Horizontal bold lines - only draw within bounds and maintain 5mm spacing
    for (let y = largeSquareSize; y <= gridHeight; y += largeSquareSize) {
      if (yOffset + y <= yOffset + gridHeight) {
        this.context.moveTo(0, yOffset + y);
        this.context.lineTo(CHART_WIDTH, yOffset + y);
      }
    }

    this.context.stroke();
  },

  drawSimpleGridAtOffset(yOffset) {
    const dotSpacing = 5 * PIXELS_PER_MM;
    const gridHeight =
      this.displayMode === "multi" ? this.leadHeight : CHART_HEIGHT;
    this.context.fillStyle = "#d0d0d0";

    for (let x = 5; x < CHART_WIDTH - 5; x += dotSpacing) {
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
    this.context.clearRect(0, 0, CHART_WIDTH, canvasHeight);
    
    // Restore grid from cache at proper scale
    this.context.drawImage(this.gridCanvas, 0, 0, CHART_WIDTH, canvasHeight);
  },

  cacheGrid() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.canvas.height / devicePixelRatio;
    
    this.gridCanvas = document.createElement('canvas');
    this.gridCanvas.width = CHART_WIDTH;
    this.gridCanvas.height = canvasHeight;
    
    // Set actual canvas size for high-DPI displays
    this.gridCanvas.width = CHART_WIDTH * devicePixelRatio;
    this.gridCanvas.height = canvasHeight * devicePixelRatio;
    this.gridCanvas.style.width = CHART_WIDTH + "px";
    this.gridCanvas.style.height = canvasHeight + "px";
    
    const gridContext = this.gridCanvas.getContext('2d');
    gridContext.scale(devicePixelRatio, devicePixelRatio);
    
    // Draw grid to cache
    const originalContext = this.context;
    this.context = gridContext;
    this.drawGridOnly();
    this.context = originalContext;
  },

  drawGridOnly() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.canvas ? 
      this.canvas.height / devicePixelRatio : 
      (this.displayMode === "multi" ? this.leadNames.length * (CHART_HEIGHT / 4) : CHART_HEIGHT);
    
    this.context.clearRect(0, 0, CHART_WIDTH, canvasHeight);

    if (this.displayMode === "multi") {
      for (let i = 0; i < this.leadNames.length; i++) {
        const yOffset = i * this.leadHeight;
        this.drawGridForLead(yOffset);
        this.drawLeadLabel(i, yOffset);
      }
    } else {
      this.drawGridForLead(0);
    }
  },

  drawSingleLeadWaveform() {
    const pointCount = this.visibleTimes.length;
    if (pointCount > 0) {
      this.context.strokeStyle = "#000000";
      this.context.lineWidth = 1.25;
      this.context.beginPath();

      for (let i = 0; i < pointCount; i++) {
        const x = (this.visibleTimes[i] / WIDTH_SECONDS) * CHART_WIDTH;
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
          const x = (leadData.times[i] / WIDTH_SECONDS) * CHART_WIDTH;
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

  drawSweepLine(sweepLinePosition) {
    this.context.strokeStyle = "#00ff00";
    this.context.lineWidth = 2;
    this.context.beginPath();
    this.context.moveTo(sweepLinePosition, 0);
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
    this.context.lineTo(sweepLinePosition, canvasHeight);
    this.context.stroke();
  },
};

export default ECGPlayback;
