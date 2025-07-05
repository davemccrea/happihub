import * as d3 from "d3";

const MM_PER_SECOND = 25; // Standard ECG paper speed
const MM_PER_MILLIVOLT = 10; // Standard ECG paper voltage scale
const PIXELS_PER_MM = 4; // Screen resolution conversion
const WIDTH_SECONDS = 5; // Chart width in seconds
const HEIGHT_MILLIVOLTS = 4; // Chart height in millivolts
const CHART_WIDTH = WIDTH_SECONDS * MM_PER_SECOND * PIXELS_PER_MM; // 500px
const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM; // 160px

// Performance and safety constants
const MAX_VISIBLE_POINTS = 500;
const MAX_STREAMING_ITERATIONS = 1000;
const DOT_RADIUS = 1.2;

const ECGPlayback = {
  async mounted() {
    // Initialize state
    this.animationState = {
      isPlaying: false,
      startTime: null,
      pausedTime: 0,
      currentCycle: 0,
      timer: null,
    };

    // Streaming data state
    this.streamingState = {
      currentDataIndex: 0,
      visibleDataPoints: [],
      lastUpdateTime: 0,
    };

    // Grid style options
    this.gridStyle = "clean_grid"; // 'ecg_paper' or 'clean_grid'

    await this.initializeECGChart();

    // Handle server-pushed events and store references for cleanup
    this.eventHandlers = {
      playback_changed: (payload) => {
        this.handlePlaybackChange(payload.is_playing);
      },
      lead_changed: (payload) => {
        this.handleLeadChange(payload.lead);
      },
      grid_style_changed: (payload) => {
        this.handleGridStyleChange(payload.grid_style);
      },
    };

    this.handleEvent("playback_changed", this.eventHandlers.playback_changed);
    this.handleEvent("lead_changed", this.eventHandlers.lead_changed);
    this.handleEvent(
      "grid_style_changed",
      this.eventHandlers.grid_style_changed
    );
  },

  destroyed() {
    this.cleanup();
  },

  cleanup() {
    if (this.animationState.timer) {
      this.animationState.timer.stop();
      this.animationState.timer = null;
    }
    if (this.canvas) {
      this.canvas.remove();
    }

    // Clear cached D3 data from all leads
    if (this.ecgLeadDatasets) {
      this.ecgLeadDatasets.forEach((dataset) => {
        if (dataset.clearCache) {
          dataset.clearCache();
        }
      });
      this.ecgLeadDatasets = null;
    }

    // Clear other data references
    this.currentLeadData = null;
    this.leadNames = null;

    // Clear streaming state
    if (this.streamingState) {
      this.streamingState.visibleDataPoints = [];
    }

    // Clear event handler references
    this.eventHandlers = null;
  },

  // Initialize ECG chart with ecg_paper standard dimensions and load data
  async initializeECGChart() {
    this.currentLeadData = await this.loadECGData();

    // Create Canvas chart
    this.canvas = d3
      .select(this.el.querySelector("[data-ecg-chart]"))
      .append("canvas")
      .attr("width", CHART_WIDTH)
      .attr("height", CHART_HEIGHT);
    
    this.context = this.canvas.node().getContext("2d");
    
    // Set high DPI support
    const devicePixelRatio = window.devicePixelRatio || 1;
    this.canvas.attr("width", CHART_WIDTH * devicePixelRatio)
               .attr("height", CHART_HEIGHT * devicePixelRatio)
               .style("width", CHART_WIDTH + "px")
               .style("height", CHART_HEIGHT + "px");
    this.context.scale(devicePixelRatio, devicePixelRatio);

    // Create scales
    this.xScale = d3
      .scaleLinear()
      .domain([0, WIDTH_SECONDS])
      .range([0, CHART_WIDTH]);
    this.yScale = d3.scaleLinear().domain([-2, 2]).range([CHART_HEIGHT, 0]);

    // Create line generator with canvas context
    this.line = d3
      .line()
      .x((d) => this.xScale(d.time))
      .y((d) => this.yScale(d.value))
      .curve(d3.curveLinear)
      .context(this.context);

    // Draw grid
    this.drawGrid();
  },

  // Draw grid based on current style
  drawGrid() {
    // Clear canvas
    this.context.clearRect(0, 0, CHART_WIDTH, CHART_HEIGHT);

    if (this.gridStyle === "ecg_paper") {
      this.drawEcgPaper();
    } else if (this.gridStyle === "clean_grid") {
      this.drawCleanGrid();
    }
  },

  // Draw ecg_paper-style ECG grid (current implementation)
  drawEcgPaper() {
    // Draw fine grid lines
    this.context.strokeStyle = "#f9c4c4";
    this.context.lineWidth = 0.5;
    this.context.beginPath();
    
    for (let x = 0; x <= CHART_WIDTH; x += PIXELS_PER_MM) {
      this.context.moveTo(x, 0);
      this.context.lineTo(x, CHART_HEIGHT);
    }
    for (let y = 0; y <= CHART_HEIGHT; y += PIXELS_PER_MM) {
      this.context.moveTo(0, y);
      this.context.lineTo(CHART_WIDTH, y);
    }
    this.context.stroke();
    
    // Draw major grid lines
    this.context.strokeStyle = "#f4a8a8";
    this.context.lineWidth = 1;
    this.context.beginPath();
    
    for (let x = 0; x <= CHART_WIDTH; x += PIXELS_PER_MM * 5) {
      this.context.moveTo(x, 0);
      this.context.lineTo(x, CHART_HEIGHT);
    }
    for (let y = 0; y <= CHART_HEIGHT; y += PIXELS_PER_MM * 5) {
      this.context.moveTo(0, y);
      this.context.lineTo(CHART_WIDTH, y);
    }
    this.context.stroke();
  },

  // Draw simple clean_grid-style grid
  drawCleanGrid() {
    // Use 5mm spacing for dots
    const dotSpacing = 5 * PIXELS_PER_MM; // 5mm (20px)

    this.context.fillStyle = "#d0d0d0";
    
    for (let x = 5; x < CHART_WIDTH - 5; x += dotSpacing) {
      for (let y = 5; y < CHART_HEIGHT - 5; y += dotSpacing) {
        this.context.beginPath();
        this.context.arc(x, y, DOT_RADIUS, 0, 2 * Math.PI);
        this.context.fill();
      }
    }
  },

  // Handle grid style change
  handleGridStyleChange(gridStyle) {
    if (gridStyle === "ecg_paper" || gridStyle === "clean_grid") {
      this.gridStyle = gridStyle;
      this.drawGrid();
    }
  },

  // Switch grid style programmatically
  switchGridStyle(style) {
    this.gridStyle = style;
    this.drawGrid();
  },

  // Load ECG data from JSON file and convert to optimized format with data windowing
  async loadECGData() {
    try {
      const response = await fetch("/assets/js/00020.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.fs || !data.sig_names || !data.signals) {
        throw new Error("Invalid ECG data format");
      }

      const samplingRate = data.fs;
      const leadNames = data.sig_names;

      this.leadNames = leadNames;
      this.currentLead = 0;
      this.samplingRate = samplingRate;

      // Pre-calculate time array once for all leads
      const timeArray = new Float32Array(data.signals.length);
      for (let i = 0; i < data.signals.length; i++) {
        timeArray[i] = i / samplingRate;
      }

      // Store as efficient typed arrays, convert to objects only when needed
      this.ecgLeadDatasets = leadNames.map((leadName, leadIndex) => {
        const values = new Float32Array(data.signals.length);
        for (let i = 0; i < data.signals.length; i++) {
          values[i] = data.signals[i][leadIndex] || 0;
        }
        return {
          name: leadName,
          times: timeArray,
          values: values,
          _d3Data: null,
          get data() {
            // Lazy conversion to D3 format only when accessed
            if (!this._d3Data) {
              this._d3Data = [];
              for (let i = 0; i < this.times.length; i++) {
                this._d3Data.push({
                  time: this.times[i],
                  value: this.values[i],
                });
              }
            }
            return this._d3Data;
          },
          clearCache() {
            this._d3Data = null;
          },
        };
      });

      const currentData = this.ecgLeadDatasets[this.currentLead].data;
      this.totalDuration = currentData[currentData.length - 1].time;
      return currentData;
    } catch (error) {
      console.error("Failed to load ECG data:", error);
      // Return empty array with minimal structure to prevent crashes
      this.leadNames = [];
      this.samplingRate = 500; // Default sampling rate
      this.totalDuration = 0;
      return [];
    }
  },

  // Switch to different ECG lead while preserving playback state
  switchLead(leadIndex) {
    const wasPlaying = this.animationState.isPlaying;
    if (wasPlaying) this.stopAnimation();

    // Clear cached data from previous lead to prevent memory leaks
    if (this.ecgLeadDatasets && this.ecgLeadDatasets[this.currentLead]) {
      this.ecgLeadDatasets[this.currentLead].clearCache();
    }

    this.currentLead = leadIndex;
    const leadData = this.ecgLeadDatasets[leadIndex].data;
    this.totalDuration = leadData[leadData.length - 1].time;
    this.currentLeadData = leadData;

    if (wasPlaying) {
      this.animationState.isPlaying = true;
      this.executeAnimationLoop();
    } else {
      // When paused, redraw the current visible waveform for the new lead
      if (this.animationState.startTime && this.animationState.pausedTime) {
        const elapsedSeconds =
          (this.animationState.pausedTime - this.animationState.startTime) /
          1000;
        const sweepProgress = (elapsedSeconds % WIDTH_SECONDS) / WIDTH_SECONDS;
        const currentCycle = Math.floor(elapsedSeconds / WIDTH_SECONDS);
        this.redrawCurrentWaveform(sweepProgress, currentCycle);
      } else {
        this.clearWaveform();
      }
    }
  },

  resetPlayback() {
    this.stopAnimation();
    this.animationState.startTime = null;
    this.animationState.pausedTime = 0;
    this.animationState.currentCycle = 0;

    // Reset streaming state
    this.streamingState.currentDataIndex = 0;
    this.streamingState.visibleDataPoints = [];
    this.streamingState.lastUpdateTime = 0;

    this.clearWaveform();
  },

  handlePlaybackChange(isPlaying) {
    this.animationState.isPlaying = isPlaying;
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

  // Animate ECG waveform with real-time drawing
  startAnimation() {
    this.animationState.startTime = Date.now();
    this.animationState.pausedTime = 0;
    this.animationState.sweepLinePosition = 0;
    this.animationState.currentCycle = 0;

    // Reset streaming state for new animation
    this.streamingState.currentDataIndex = 0;
    this.streamingState.visibleDataPoints = [];
    this.streamingState.lastUpdateTime = 0;

    this.executeAnimationLoop();
  },

  resumeAnimation() {
    if (!this.animationState.startTime) {
      this.startAnimation();
    } else {
      // Calculate how long we were paused and adjust start time
      const pauseDuration = Date.now() - this.animationState.pausedTime;
      this.animationState.startTime += pauseDuration;
      this.animationState.pausedTime = 0;
      this.executeAnimationLoop();
    }
  },

  pauseAnimation() {
    // Store when we paused
    this.animationState.pausedTime = Date.now();
    this.stopAnimation();
  },

  executeAnimationLoop() {
    // Stop any existing timer first to prevent multiple timers
    if (this.animationState.timer) {
      this.animationState.timer.stop();
      this.animationState.timer = null;
    }

    this.animationState.timer = d3.timer(() => {
      if (!this.animationState.isPlaying) {
        this.stopAnimation();
        return;
      }

      const currentTime = Date.now();
      const elapsedSeconds =
        (currentTime - this.animationState.startTime) / 1000;
      const sweepProgress = (elapsedSeconds % WIDTH_SECONDS) / WIDTH_SECONDS;
      const sweepLinePosition = sweepProgress * CHART_WIDTH;
      const currentCycle = Math.floor(elapsedSeconds / WIDTH_SECONDS);

      // Sweep line will be drawn in streamWaveformData

      if (currentCycle !== this.animationState.currentCycle) {
        this.animationState.currentCycle = currentCycle;
      }

      // Stream data points up to sweep position
      this.streamWaveformData(sweepProgress, currentCycle);
      
      // Draw sweep line
      this.drawSweepLine(sweepLinePosition);
    });
  },

  // Stream data points one at a time for smooth performance
  streamWaveformData(sweepProgress, currentCycle) {
    try {
      const totalCycles = Math.ceil(this.totalDuration / WIDTH_SECONDS);

      // Check if we've reached the end of the data first
      if (currentCycle >= totalCycles) {
        this.stopAnimation();
        this.resetPlayback();

        // Notify LiveView that playback has ended
        this.pushEvent("playback_ended", {});
        return;
      }

      const cycleIndex = currentCycle;
      const cycleStartTime = cycleIndex * WIDTH_SECONDS;
      const currentTimeInCycle = sweepProgress * WIDTH_SECONDS;
      const absoluteTime = cycleStartTime + currentTimeInCycle;

      // Clear data when starting a new cycle
      if (currentCycle !== this.animationState.currentCycle) {
        this.streamingState.visibleDataPoints = [];
        this.streamingState.currentDataIndex = 0;
      }

      // Safety check for data availability
      if (!this.currentLeadData || this.currentLeadData.length === 0) {
        return;
      }

      // Calculate target data index based on current time with bounds checking
      const targetIndex = Math.min(
        Math.floor(absoluteTime * this.samplingRate),
        this.currentLeadData.length - 1
      );

      // Stream new data points up to current position with improved bounds checking
      let iterations = 0;

      while (
        this.streamingState.currentDataIndex <= targetIndex &&
        this.streamingState.currentDataIndex < this.currentLeadData.length &&
        iterations < MAX_STREAMING_ITERATIONS
      ) {
        const dataPoint =
          this.currentLeadData[this.streamingState.currentDataIndex];
        if (
          dataPoint &&
          dataPoint.time >= cycleStartTime &&
          dataPoint.time < cycleStartTime + WIDTH_SECONDS
        ) {
          const screenTime = dataPoint.time - cycleStartTime;
          if (screenTime <= currentTimeInCycle) {
            this.streamingState.visibleDataPoints.push({
              time: screenTime,
              value: dataPoint.value,
            });
          }
        }

        this.streamingState.currentDataIndex++;
        iterations++;
      }

      // Remove old points that are outside the visible window
      this.streamingState.visibleDataPoints =
        this.streamingState.visibleDataPoints.filter(
          (point) => point.time <= currentTimeInCycle
        );

      // Limit visible points to prevent memory bloat with more aggressive trimming
      if (this.streamingState.visibleDataPoints.length > MAX_VISIBLE_POINTS) {
        // Remove from the beginning to keep the most recent points
        this.streamingState.visibleDataPoints =
          this.streamingState.visibleDataPoints.slice(-MAX_VISIBLE_POINTS);
      }

      // Update the waveform on canvas
      this.drawWaveform();
    } catch (error) {
      console.error("Error in streamWaveformData:", error);
      this.stopAnimation();
    }
  },

  stopAnimation() {
    if (this.animationState.timer) {
      this.animationState.timer.stop();
      this.animationState.timer = null;
    }
    this.animationState.isPlaying = false;
  },

  // Canvas drawing methods
  clearWaveform() {
    this.drawGrid();
  },

  drawWaveform() {
    // Redraw grid first
    this.drawGrid();
    
    // Draw ECG waveform
    if (this.streamingState.visibleDataPoints.length > 0) {
      this.context.strokeStyle = "#000000";
      this.context.lineWidth = 1.25;
      this.context.beginPath();
      this.line(this.streamingState.visibleDataPoints);
      this.context.stroke();
    }
  },

  drawSweepLine(sweepLinePosition) {
    // Draw sweep line
    this.context.strokeStyle = "#00ff00";
    this.context.lineWidth = 2;
    this.context.beginPath();
    this.context.moveTo(sweepLinePosition, 0);
    this.context.lineTo(sweepLinePosition, CHART_HEIGHT);
    this.context.stroke();
  },

  redrawCurrentWaveform(sweepProgress, currentCycle) {
    // Implementation for redrawing current waveform when paused
    // This would need to be implemented based on your specific needs
    this.drawGrid();
    console.log("Redrawing waveform at progress:", sweepProgress, "cycle:", currentCycle);
  },
};

export default ECGPlayback;
