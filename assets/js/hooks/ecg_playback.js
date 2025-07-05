import * as d3 from "d3";

const MM_PER_SECOND = 25; // Standard ECG paper speed
const MM_PER_MILLIVOLT = 10; // Standard ECG paper voltage scale
const PIXELS_PER_MM = 4; // Screen resolution conversion
const WIDTH_SECONDS = 5; // Chart width in seconds
const HEIGHT_MILLIVOLTS = 4; // Chart height in millivolts

const ECGPlayback = {
  async mounted() {
    // Initialize state
    this.animationState = {
      isPlaying: false,
      startTime: null,
      pausedTime: 0,
      sweepLinePosition: 0,
      currentCycle: 0,
      timer: null
    };
    
    this.frameRateMetrics = {
      fps: 0,
      frameCount: 0,
      lastTime: Date.now()
    };
    
    await this.initializeECGChart();
    this.setupEventListeners();
  },

  destroyed() {
    this.cleanup();
  },

  cleanup() {
    if (this.animationState.timer) {
      this.animationState.timer.stop();
      this.animationState.timer = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Clean up SVG elements
    if (this.svg) {
      this.svg.selectAll("*").remove();
    }
  },

  // Initialize ECG chart with medical standard dimensions and load data
  async initializeECGChart() {
    // Calculate pixel dimensions based on medical standards
    const width = WIDTH_SECONDS * MM_PER_SECOND * PIXELS_PER_MM;
    const height = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM;
    const margin = { top: 0, right: 0, bottom: 0, left: 0 };

    this.chartConfig = {
      width,
      height,
      margin,
      widthSeconds: WIDTH_SECONDS,
      heightMilliVolts: HEIGHT_MILLIVOLTS,
      mmPerSecond: MM_PER_SECOND,
      mmPerMilliVolt: MM_PER_MILLIVOLT,
      pixelsPerMm: PIXELS_PER_MM,
    };

    this.currentLeadData = await this.loadECGData();
    this.createLeadSelectorIfNeeded();
    this.createSVGChart(width, height, margin);
    this.createScales();
    this.renderGrid();
    this.setupLineGenerator();
    this.drawECGPath();
    this.animationState.isPlaying = false;
  },

  createLeadSelectorIfNeeded() {
    if (this.leadNames && this.leadNames.length > 1) {
      this.createLeadSelector();
    }
  },

  createSVGChart(width, height, margin) {
    this.svg = d3
      .select(this.el.querySelector("[data-ecg-chart]"))
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  },

  // Create D3 scales for mapping time and voltage values to pixel coordinates
  createScales() {
    const { width, height, widthSeconds, heightMilliVolts } = this.chartConfig;
    // Map time (0 to widthSeconds) to horizontal pixels (0 to width)
    this.xScale = d3.scaleLinear().domain([0, widthSeconds]).range([0, width]);
    // Map voltage (-heightMilliVolts/2 to +heightMilliVolts/2) to vertical pixels
    // Note: SVG y-axis is inverted (0 at top), so range is [height, 0]
    this.yScale = d3
      .scaleLinear()
      .domain([-heightMilliVolts / 2, heightMilliVolts / 2])
      .range([height, 0]);
  },

  setupLineGenerator() {
    this.line = d3
      .line()
      .x((d) => this.xScale(d.time))
      .y((d) => this.yScale(d.value))
      .curve(d3.curveLinear);
  },


  drawECGPath() {
    // Create a group for the ECG display
    this.ecgGroup = this.svg.append("g");

    // Create single waveform path for real-time drawing
    this.waveformPath = this.ecgGroup
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#000000")
      .attr("stroke-width", 1.25);

    // Create sweep line to show current position
    this.sweepLine = this.ecgGroup
      .append("line")
      .attr("stroke", "#00ff00")
      .attr("stroke-width", 2)
      .attr("y1", 0)
      .attr("y2", this.chartConfig.height)
      .attr("x1", 0)
      .attr("x2", 0);
  },

  // Draw ECG paper grid with minor (1mm) and major (5mm) lines using batch operations
  renderGrid() {
    const { width, height, pixelsPerMm } = this.chartConfig;
    this.renderGridLines(width, height, pixelsPerMm);
  },

  renderGridLines(width, height, pixelsPerMm) {
    const minorSpacing = pixelsPerMm;
    const majorSpacing = pixelsPerMm * 5;

    // Pre-generate grid paths
    const minorGridPath = this.generateGridPath(width, height, minorSpacing);
    const majorGridPath = this.generateGridPath(width, height, majorSpacing);

    // Append minor grid lines as single path
    this.svg
      .append("path")
      .attr("d", minorGridPath)
      .attr("stroke", "#f9c4c4")
      .attr("stroke-width", 0.5)
      .attr("fill", "none");

    // Append major grid lines as single path
    this.svg
      .append("path")
      .attr("d", majorGridPath)
      .attr("stroke", "#f4a8a8")
      .attr("stroke-width", 1)
      .attr("fill", "none");
  },

  generateGridPath(width, height, spacing) {
    const verticalLines = [];
    const horizontalLines = [];

    // Generate vertical lines
    for (let x = 0; x <= width; x += spacing) {
      verticalLines.push(`M${x},0L${x},${height}`);
    }

    // Generate horizontal lines
    for (let y = 0; y <= height; y += spacing) {
      horizontalLines.push(`M0,${y}L${width},${y}`);
    }

    return verticalLines.join("") + horizontalLines.join("");
  },

  // Load ECG data from JSON file and convert to optimized format with data windowing
  async loadECGData() {
    try {
      const response = await fetch("/assets/js/00020.json");
      const data = await response.json();

      const samplingRate = data.fs;
      const leadNames = data.sig_names;

      this.leadNames = leadNames;
      this.currentLead = 0;
      this.samplingRate = samplingRate;

      // Convert raw signal data to optimized format with typed arrays
      this.ecgLeadDatasets = leadNames.map((leadName, leadIndex) => {
        const signalData = new Float32Array(data.signals.length);
        const timeData = new Float32Array(data.signals.length);

        for (let i = 0; i < data.signals.length; i++) {
          timeData[i] = i / samplingRate;
          signalData[i] = data.signals[i][leadIndex] || 0;
        }

        return {
          name: leadName,
          timeData,
          signalData,
          length: data.signals.length,
        };
      });


      return this.convertToD3Format(this.ecgLeadDatasets[this.currentLead]);
    } catch (error) {
      console.error("Failed to load ECG data:", error);
      return [];
    }
  },

  convertToD3Format(leadData) {
    const result = [];
    for (let i = 0; i < leadData.length; i++) {
      result.push({
        time: leadData.timeData[i],
        value: leadData.signalData[i],
      });
    }
    return result;
  },



  setupEventListeners() {
    this.setupPlayButton();
    this.setupLeadSelector();
  },

  setupPlayButton() {
    const playBtn = this.el.querySelector("[data-ecg-play]");
    if (playBtn) {
      playBtn.addEventListener("click", () => this.togglePlayback());
    }
  },

  setupLeadSelector() {
    const leadSelector = this.el.querySelector("[data-lead-selector]");
    if (leadSelector) {
      leadSelector.addEventListener("change", (e) => {
        const leadIndex = parseInt(e.target.value, 10);
        if (!isNaN(leadIndex)) {
          this.switchLead(leadIndex);
        }
      });
    }
  },

  createLeadSelector() {
    const container = this.el.querySelector("[data-ecg-chart]");
    const selector = document.createElement("select");
    selector.setAttribute("data-lead-selector", "");
    selector.className = "select select-bordered w-full max-w-xs mb-3";

    this.leadNames.forEach((leadName, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = `Lead ${leadName}`;
      if (index === this.currentLead) option.selected = true;
      selector.appendChild(option);
    });

    container.insertBefore(selector, container.firstChild);
  },

  // Switch to different ECG lead while preserving playback state
  switchLead(leadIndex) {
    if (!this.isValidLeadIndex(leadIndex)) return;

    const wasPlaying = this.animationState.isPlaying;

    // Stop current animation if playing
    if (wasPlaying) {
      this.stopAnimation();
    }

    this.currentLead = leadIndex;
    this.currentLeadData = this.convertToD3Format(
      this.ecgLeadDatasets[leadIndex]
    );

    if (wasPlaying) {
      // Resume animation
      this.animationState.isPlaying = true;
      this.executeAnimationLoop();
    } else {
      // Just update the chart for static display
      this.updateChart();
    }
  },

  isValidLeadIndex(leadIndex) {
    return (
      this.ecgLeadDatasets &&
      leadIndex >= 0 &&
      leadIndex < this.ecgLeadDatasets.length
    );
  },

  updateChart() {
    // Update waveform path when switching leads
    this.waveformPath.datum(this.currentLeadData).attr("d", this.line);
  },

  resetPlayback() {
    this.stopAnimation();
    this.animationState.startTime = null;
    this.animationState.pausedTime = 0;
    this.animationState.sweepLinePosition = 0;
    this.animationState.currentCycle = 0;
    if (this.sweepLine) {
      this.sweepLine.attr("x1", 0).attr("x2", 0);
    }
    if (this.waveformPath) {
      this.waveformPath.datum([]).attr("d", this.line);
    }
    this.updatePlayButton("Play");
    this.animationState.isPlaying = false;
  },

  updatePlayButton(text) {
    const playBtn = this.el.querySelector("[data-ecg-play]");
    if (playBtn) {
      playBtn.textContent = text;
    }
  },

  togglePlayback() {
    this.animationState.isPlaying = !this.animationState.isPlaying;

    if (this.animationState.isPlaying) {
      this.updatePlayButton("Pause");
      this.resumeAnimation();
    } else {
      this.updatePlayButton("Play");
      this.pauseAnimation();
    }
  },

  // Animate ECG waveform with real-time drawing
  startAnimation() {
    this.animationState.startTime = Date.now();
    this.animationState.pausedTime = 0;
    this.animationState.sweepLinePosition = 0;
    this.animationState.currentCycle = 0;
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
    const { width, widthSeconds } = this.chartConfig;

    // Use d3.timer for better performance control
    this.animationState.timer = d3.timer(() => {
      if (!this.animationState.isPlaying) {
        this.animationState.timer.stop();
        return;
      }

      const currentTime = Date.now();

      // Calculate FPS
      this.updateFPS(currentTime);

      const elapsedSeconds =
        (currentTime - this.animationState.startTime) / 1000;

      // Calculate sweep position (0 to width, then reset)
      const sweepCycleTime = widthSeconds;
      const sweepProgress = (elapsedSeconds % sweepCycleTime) / sweepCycleTime;
      this.animationState.sweepLinePosition = sweepProgress * width;
      const currentCycle = Math.floor(elapsedSeconds / sweepCycleTime);

      // Update sweep line position
      this.sweepLine
        .attr("x1", this.animationState.sweepLinePosition)
        .attr("x2", this.animationState.sweepLinePosition);

      // Update waveform when cycle changes or on first run
      if (currentCycle !== this.animationState.currentCycle) {
        this.animationState.currentCycle = currentCycle;
      }

      // Draw waveform progressively up to sweep position
      this.updateProgressiveWaveform(sweepProgress, currentCycle);
    });
  },

  updateFPS(currentTime) {
    this.frameRateMetrics.frameCount++;

    if (currentTime - this.frameRateMetrics.lastTime >= 1000) {
      this.frameRateMetrics.fps = this.frameRateMetrics.frameCount;
      this.frameRateMetrics.frameCount = 0;
      this.frameRateMetrics.lastTime = currentTime;

      // Log FPS to console
      console.log(`ECG Animation FPS: ${this.frameRateMetrics.fps}`);
    }
  },

  // Update waveform progressively by drawing data up to sweep position
  updateProgressiveWaveform(sweepProgress, currentCycle) {
    const { widthSeconds } = this.chartConfig;
    const totalDuration = this.currentLeadData[this.currentLeadData.length - 1]?.time || 0;
    const cycleDuration = widthSeconds;
    const totalCycles = Math.ceil(totalDuration / cycleDuration);
    
    // Calculate current cycle index (loop back to start)
    const cycleIndex = currentCycle % totalCycles;
    const cycleStartTime = cycleIndex * cycleDuration;
    const cycleEndTime = Math.min((cycleIndex + 1) * cycleDuration, totalDuration);
    
    // Find data points for current cycle
    const cycleData = this.currentLeadData.filter(d => 
      d.time >= cycleStartTime && d.time < cycleEndTime
    );
    
    // Map cycle data to screen coordinates (0 to widthSeconds)
    const screenData = cycleData.map(d => ({
      time: d.time - cycleStartTime,
      value: d.value
    }));
    
    // Calculate how much of the cycle to show based on sweep progress
    const sweepTime = sweepProgress * cycleDuration;
    const visibleData = screenData.filter(d => d.time <= sweepTime);
    
    // Update waveform path with visible data
    this.waveformPath.datum(visibleData).attr("d", this.line);
  },


  stopAnimation() {
    // Stop the animation loop
    this.animationState.isPlaying = false;
    if (this.animationState.timer) {
      this.animationState.timer.stop();
      this.animationState.timer = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  },
};

export default ECGPlayback;
