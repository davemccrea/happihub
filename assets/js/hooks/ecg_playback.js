import * as d3 from "d3";

const MM_PER_SECOND = 25; // Standard ECG paper speed
const MM_PER_MILLIVOLT = 10; // Standard ECG paper voltage scale
const PIXELS_PER_MM = 4; // Screen resolution conversion
const WIDTH_SECONDS = 5; // Chart width in seconds
const HEIGHT_MILLIVOLTS = 4; // Chart height in millivolts
const CHART_WIDTH = WIDTH_SECONDS * MM_PER_SECOND * PIXELS_PER_MM; // 500px
const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM; // 160px

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
    if (this.svg) {
      this.svg.selectAll("*").remove();
    }
  },

  // Initialize ECG chart with medical standard dimensions and load data
  async initializeECGChart() {
    this.currentLeadData = await this.loadECGData();

    // Create lead selector if multiple leads available
    if (this.leadNames && this.leadNames.length > 1) {
      this.createLeadSelector();
    }

    // Create SVG chart
    this.svg = d3
      .select(this.el.querySelector("[data-ecg-chart]"))
      .append("svg")
      .attr("width", CHART_WIDTH)
      .attr("height", CHART_HEIGHT)
      .append("g");

    // Create scales
    this.xScale = d3
      .scaleLinear()
      .domain([0, WIDTH_SECONDS])
      .range([0, CHART_WIDTH]);
    this.yScale = d3.scaleLinear().domain([-2, 2]).range([CHART_HEIGHT, 0]);

    // Create line generator
    this.line = d3
      .line()
      .x((d) => this.xScale(d.time))
      .y((d) => this.yScale(d.value))
      .curve(d3.curveLinear);

    // Draw grid
    const generateGridPath = (spacing) => {
      const lines = [];
      for (let x = 0; x <= CHART_WIDTH; x += spacing)
        lines.push(`M${x},0L${x},${CHART_HEIGHT}`);
      for (let y = 0; y <= CHART_HEIGHT; y += spacing)
        lines.push(`M0,${y}L${CHART_WIDTH},${y}`);
      return lines.join("");
    };

    this.svg
      .append("path")
      .attr("d", generateGridPath(PIXELS_PER_MM))
      .attr("stroke", "#f9c4c4")
      .attr("stroke-width", 0.5)
      .attr("fill", "none");
    this.svg
      .append("path")
      .attr("d", generateGridPath(PIXELS_PER_MM * 5))
      .attr("stroke", "#f4a8a8")
      .attr("stroke-width", 1)
      .attr("fill", "none");

    // Create ECG display group and paths
    this.ecgGroup = this.svg.append("g");
    this.waveformPath = this.ecgGroup
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#000000")
      .attr("stroke-width", 1.25);
    this.sweepLine = this.ecgGroup
      .append("line")
      .attr("stroke", "#00ff00")
      .attr("stroke-width", 2)
      .attr("y1", 0)
      .attr("y2", CHART_HEIGHT)
      .attr("x1", 0)
      .attr("x2", 0);
  },

  setupEventListeners() {
    this.playBtn = this.el.querySelector("[data-ecg-play]");
    if (this.playBtn)
      this.playBtn.addEventListener("click", () => this.togglePlayback());

    const leadSelector = this.el.querySelector("[data-lead-selector]");
    if (leadSelector) {
      leadSelector.addEventListener("change", (e) => {
        const leadIndex = parseInt(e.target.value, 10);
        if (
          !isNaN(leadIndex) &&
          this.ecgLeadDatasets &&
          leadIndex >= 0 &&
          leadIndex < this.ecgLeadDatasets.length
        ) {
          this.switchLead(leadIndex);
        }
      });
    }
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

      // Convert raw signal data to D3 format directly
      this.ecgLeadDatasets = leadNames.map((leadName, leadIndex) => {
        const d3Data = [];
        for (let i = 0; i < data.signals.length; i++) {
          d3Data.push({
            time: i / samplingRate,
            value: data.signals[i][leadIndex] || 0,
          });
        }
        return { name: leadName, data: d3Data };
      });

      const currentData = this.ecgLeadDatasets[this.currentLead].data;
      this.totalDuration = currentData[currentData.length - 1].time;
      return currentData;
    } catch (error) {
      console.error("Failed to load ECG data:", error);
      return [];
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
    const wasPlaying = this.animationState.isPlaying;
    if (wasPlaying) this.stopAnimation();

    this.currentLead = leadIndex;
    const leadData = this.ecgLeadDatasets[leadIndex].data;
    this.totalDuration = leadData[leadData.length - 1].time;
    this.currentLeadData = leadData;

    if (wasPlaying) {
      this.animationState.isPlaying = true;
      this.executeAnimationLoop();
    } else {
      this.waveformPath.datum([]).attr("d", this.line);
    }
  },

  resetPlayback() {
    this.stopAnimation();
    this.animationState.startTime = null;
    this.animationState.pausedTime = 0;
    this.animationState.currentCycle = 0;
    if (this.sweepLine) this.sweepLine.attr("x1", 0).attr("x2", 0);
    if (this.waveformPath) this.waveformPath.datum([]).attr("d", this.line);
    if (this.playBtn) this.playBtn.textContent = "Play";
  },

  togglePlayback() {
    this.animationState.isPlaying = !this.animationState.isPlaying;
    if (this.animationState.isPlaying) {
      this.playBtn.textContent = "Pause";
      this.resumeAnimation();
    } else {
      this.playBtn.textContent = "Play";
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
    this.animationState.timer = d3.timer(() => {
      if (!this.animationState.isPlaying) {
        this.animationState.timer.stop();
        return;
      }

      const currentTime = Date.now();
      const elapsedSeconds =
        (currentTime - this.animationState.startTime) / 1000;
      const sweepProgress = (elapsedSeconds % WIDTH_SECONDS) / WIDTH_SECONDS;
      const sweepLinePosition = sweepProgress * CHART_WIDTH;
      const currentCycle = Math.floor(elapsedSeconds / WIDTH_SECONDS);

      // Update sweep line position
      this.sweepLine
        .attr("x1", sweepLinePosition)
        .attr("x2", sweepLinePosition);

      if (currentCycle !== this.animationState.currentCycle) {
        this.animationState.currentCycle = currentCycle;
      }

      // Draw waveform progressively up to sweep position
      this.updateProgressiveWaveform(sweepProgress, currentCycle);
    });
  },

  // Update waveform progressively by drawing data up to sweep position
  updateProgressiveWaveform(sweepProgress, currentCycle) {
    const totalCycles = Math.ceil(this.totalDuration / WIDTH_SECONDS);
    const cycleIndex = currentCycle % totalCycles;
    const cycleStartTime = cycleIndex * WIDTH_SECONDS;
    const cycleEndTime = Math.min(
      (cycleIndex + 1) * WIDTH_SECONDS,
      this.totalDuration
    );
    const sweepTime = sweepProgress * WIDTH_SECONDS;

    // Build visible data array directly without intermediate filtering
    const visibleData = [];
    for (const d of this.currentLeadData) {
      if (d.time >= cycleStartTime && d.time < cycleEndTime) {
        const screenTime = d.time - cycleStartTime;
        if (screenTime <= sweepTime) {
          visibleData.push({ time: screenTime, value: d.value });
        }
      }
    }

    this.waveformPath.datum(visibleData).attr("d", this.line);
  },

  stopAnimation() {
    if (this.animationState.timer) {
      this.animationState.timer.stop();
      this.animationState.timer = null;
    }
    this.animationState.isPlaying = false;
  },
};

export default ECGPlayback;
