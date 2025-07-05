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

    this.chartConfig = { width, height };

    this.currentLeadData = await this.loadECGData();
    
    // Create lead selector if multiple leads available
    if (this.leadNames && this.leadNames.length > 1) {
      this.createLeadSelector();
    }
    
    // Create SVG chart
    this.svg = d3
      .select(this.el.querySelector("[data-ecg-chart]"))
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g");
    
    // Create scales
    this.xScale = d3.scaleLinear().domain([0, WIDTH_SECONDS]).range([0, width]);
    this.yScale = d3.scaleLinear().domain([-HEIGHT_MILLIVOLTS / 2, HEIGHT_MILLIVOLTS / 2]).range([height, 0]);
    
    // Create line generator
    this.line = d3.line().x((d) => this.xScale(d.time)).y((d) => this.yScale(d.value)).curve(d3.curveLinear);
    
    // Draw grid
    const minorSpacing = PIXELS_PER_MM;
    const majorSpacing = PIXELS_PER_MM * 5;
    
    // Generate grid paths inline
    const generateGridPath = (spacing) => {
      const lines = [];
      for (let x = 0; x <= width; x += spacing) lines.push(`M${x},0L${x},${height}`);
      for (let y = 0; y <= height; y += spacing) lines.push(`M0,${y}L${width},${y}`);
      return lines.join("");
    };
    
    this.svg.append("path").attr("d", generateGridPath(minorSpacing)).attr("stroke", "#f9c4c4").attr("stroke-width", 0.5).attr("fill", "none");
    this.svg.append("path").attr("d", generateGridPath(majorSpacing)).attr("stroke", "#f4a8a8").attr("stroke-width", 1).attr("fill", "none");
    
    // Create ECG display group and paths
    this.ecgGroup = this.svg.append("g");
    this.waveformPath = this.ecgGroup.append("path").attr("fill", "none").attr("stroke", "#000000").attr("stroke-width", 1.25);
    this.sweepLine = this.ecgGroup.append("line").attr("stroke", "#00ff00").attr("stroke-width", 2).attr("y1", 0).attr("y2", height).attr("x1", 0).attr("x2", 0);
    
    // Setup event listeners
    const playBtn = this.el.querySelector("[data-ecg-play]");
    if (playBtn) playBtn.addEventListener("click", () => this.togglePlayback());
    
    const leadSelector = this.el.querySelector("[data-lead-selector]");
    if (leadSelector) {
      leadSelector.addEventListener("change", (e) => {
        const leadIndex = parseInt(e.target.value, 10);
        if (!isNaN(leadIndex) && this.ecgLeadDatasets && leadIndex >= 0 && leadIndex < this.ecgLeadDatasets.length) {
          this.switchLead(leadIndex);
        }
      });
    }
    
    this.animationState.isPlaying = false;
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
    const wasPlaying = this.animationState.isPlaying;
    if (wasPlaying) this.stopAnimation();

    this.currentLead = leadIndex;
    this.currentLeadData = this.convertToD3Format(this.ecgLeadDatasets[leadIndex]);

    if (wasPlaying) {
      this.animationState.isPlaying = true;
      this.executeAnimationLoop();
    } else {
      this.waveformPath.datum(this.currentLeadData).attr("d", this.line);
    }
  },

  resetPlayback() {
    this.stopAnimation();
    this.animationState.startTime = null;
    this.animationState.pausedTime = 0;
    this.animationState.sweepLinePosition = 0;
    this.animationState.currentCycle = 0;
    if (this.sweepLine) this.sweepLine.attr("x1", 0).attr("x2", 0);
    if (this.waveformPath) this.waveformPath.datum([]).attr("d", this.line);
    const playBtn = this.el.querySelector("[data-ecg-play]");
    if (playBtn) playBtn.textContent = "Play";
    this.animationState.isPlaying = false;
  },

  togglePlayback() {
    this.animationState.isPlaying = !this.animationState.isPlaying;
    const playBtn = this.el.querySelector("[data-ecg-play]");
    
    if (this.animationState.isPlaying) {
      if (playBtn) playBtn.textContent = "Pause";
      this.resumeAnimation();
    } else {
      if (playBtn) playBtn.textContent = "Play";
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
    const { width } = this.chartConfig;

    this.animationState.timer = d3.timer(() => {
      if (!this.animationState.isPlaying) {
        this.animationState.timer.stop();
        return;
      }

      const currentTime = Date.now();
      
      // Calculate FPS
      this.frameRateMetrics.frameCount++;
      if (currentTime - this.frameRateMetrics.lastTime >= 1000) {
        this.frameRateMetrics.fps = this.frameRateMetrics.frameCount;
        this.frameRateMetrics.frameCount = 0;
        this.frameRateMetrics.lastTime = currentTime;
        console.log(`ECG Animation FPS: ${this.frameRateMetrics.fps}`);
      }

      const elapsedSeconds = (currentTime - this.animationState.startTime) / 1000;
      const sweepProgress = (elapsedSeconds % WIDTH_SECONDS) / WIDTH_SECONDS;
      this.animationState.sweepLinePosition = sweepProgress * width;
      const currentCycle = Math.floor(elapsedSeconds / WIDTH_SECONDS);

      // Update sweep line position
      this.sweepLine.attr("x1", this.animationState.sweepLinePosition).attr("x2", this.animationState.sweepLinePosition);

      if (currentCycle !== this.animationState.currentCycle) {
        this.animationState.currentCycle = currentCycle;
      }

      // Draw waveform progressively up to sweep position
      this.updateProgressiveWaveform(sweepProgress, currentCycle);
    });
  },


  // Update waveform progressively by drawing data up to sweep position
  updateProgressiveWaveform(sweepProgress, currentCycle) {
    const totalDuration = this.currentLeadData[this.currentLeadData.length - 1]?.time || 0;
    const totalCycles = Math.ceil(totalDuration / WIDTH_SECONDS);
    
    // Calculate current cycle index (loop back to start)
    const cycleIndex = currentCycle % totalCycles;
    const cycleStartTime = cycleIndex * WIDTH_SECONDS;
    const cycleEndTime = Math.min((cycleIndex + 1) * WIDTH_SECONDS, totalDuration);
    
    // Find data points for current cycle and map to screen coordinates
    const cycleData = this.currentLeadData.filter(d => d.time >= cycleStartTime && d.time < cycleEndTime);
    const screenData = cycleData.map(d => ({ time: d.time - cycleStartTime, value: d.value }));
    
    // Calculate how much of the cycle to show based on sweep progress
    const sweepTime = sweepProgress * WIDTH_SECONDS;
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
