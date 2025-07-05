import * as d3 from "d3";

const MM_PER_SECOND = 25; // Standard ECG paper speed
const MM_PER_MILLIVOLT = 10; // Standard ECG paper voltage scale
const PIXELS_PER_MM = 4; // Screen resolution conversion
const WIDTH_SECONDS = 5; // Chart width in seconds
const HEIGHT_MILLIVOLTS = 4; // Chart height in millivolts

const ECGPlayback = {
  async mounted() {
    await this.initializeECGChart();
    this.setupEventListeners();
  },

  destroyed() {
    if (this.timer) {
      this.timer.stop();
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

    this.ecgData = await this.loadECGData();
    this.createLeadSelectorIfNeeded();
    this.createSVGChart(width, height, margin);
    this.createScales();
    this.drawGrid();
    this.setupLineGenerator();
    this.createClippingPath(height);
    this.drawECGPath();
    this.isPlaying = false;
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

  // Create SVG clipping path for GE-style monitor display
  createClippingPath(height) {
    // Generate unique clip path ID to avoid conflicts with multiple charts
    this.clipId = `clip-playback-${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    this.svg
      .append("defs")
      .append("clipPath")
      .attr("id", this.clipId)
      .append("rect")
      .attr("width", this.chartConfig.width)
      .attr("height", height);
  },

  drawECGPath() {
    // Create a group for the ECG display
    this.ecgGroup = this.svg
      .append("g")
      .attr("clip-path", `url(#${this.clipId})`);

    // Create the old waveform path (previous cycle)
    this.oldPath = this.ecgGroup
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#000000")
      .attr("stroke-width", 1.25);

    // Create the new waveform path (current cycle)
    this.newPath = this.ecgGroup
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

  // Draw ECG paper grid with minor (1mm) and major (5mm) lines
  drawGrid() {
    const { width, height, pixelsPerMm } = this.chartConfig;
    this.drawGridLines(width, height, pixelsPerMm, 1, 0.5, "#f9c4c4");
    this.drawGridLines(width, height, pixelsPerMm, 5, 1, "#f4a8a8");
  },

  drawGridLines(
    width,
    height,
    pixelsPerMm,
    interval,
    strokeWidth,
    strokeColor
  ) {
    // Calculate spacing between grid lines in pixels
    const spacing = pixelsPerMm * interval;

    // Draw vertical grid lines
    for (let x = 0; x <= width; x += spacing) {
      this.svg
        .append("line")
        .attr("stroke", strokeColor)
        .attr("stroke-width", strokeWidth)
        .attr("x1", x)
        .attr("x2", x)
        .attr("y1", 0)
        .attr("y2", height);
    }

    // Draw horizontal grid lines
    for (let y = 0; y <= height; y += spacing) {
      this.svg
        .append("line")
        .attr("stroke", strokeColor)
        .attr("stroke-width", strokeWidth)
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y)
        .attr("y2", y);
    }
  },

  // Load ECG data from JSON file and convert to chart format
  async loadECGData() {
    try {
      const response = await fetch("/assets/js/00020.json");
      const data = await response.json();

      const samplingRate = data.fs;
      const leadNames = data.sig_names;

      this.leadNames = leadNames;
      this.currentLead = 0;

      // Convert raw signal data to time-value pairs for each lead
      this.allLeadsData = leadNames.map((leadName, leadIndex) => ({
        name: leadName,
        data: data.signals.map((sample, index) => ({
          time: index / samplingRate, // Convert sample index to time in seconds
          value: sample[leadIndex] || 0, // Get voltage value for this lead
        })),
      }));

      return this.allLeadsData[this.currentLead].data;
    } catch (error) {
      console.error("Failed to load ECG data:", error);
      return [];
    }
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

    const wasPlaying = this.isPlaying;
    this.currentLead = leadIndex;
    this.ecgData = this.allLeadsData[leadIndex].data;
    this.updateChart();

    if (wasPlaying) {
      this.startAnimation();
    }
  },

  isValidLeadIndex(leadIndex) {
    return (
      this.allLeadsData &&
      leadIndex >= 0 &&
      leadIndex < this.allLeadsData.length
    );
  },

  updateChart() {
    // Update both paths when switching leads
    this.newPath.datum(this.ecgData).attr("d", this.line);
    this.oldPath.datum([]).attr("d", this.line);
  },

  resetPlayback() {
    this.stopAnimation();
    this.animationStartTime = null;
    this.sweepPosition = 0;
    this.currentDataIndex = 0;
    if (this.sweepLine) {
      this.sweepLine.attr("x1", 0).attr("x2", 0);
    }
    if (this.newPath) {
      this.newPath.datum([]).attr("d", this.line);
    }
    if (this.oldPath) {
      this.oldPath.datum([]).attr("d", this.line);
    }
    this.updatePlayButton("Play");
    this.isPlaying = false;
  },

  updatePlayButton(text) {
    const playBtn = this.el.querySelector("[data-ecg-play]");
    if (playBtn) {
      playBtn.textContent = text;
    }
  },

  togglePlayback() {
    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.updatePlayButton("Pause");
      this.startAnimation();
    } else {
      this.updatePlayButton("Play");
      this.stopAnimation();
    }
  },

  // Animate ECG waveform with GE-style sweep effect
  startAnimation() {
    const { width, widthSeconds } = this.chartConfig;

    // Initialize animation state
    if (!this.animationStartTime) {
      this.animationStartTime = Date.now();
      this.sweepPosition = 0;
    }

    // Calculate the total duration of ECG data
    const totalDuration = this.ecgData[this.ecgData.length - 1].time;

    // Start animation loop
    const animate = () => {
      if (!this.isPlaying) return;

      const currentTime = Date.now();
      const elapsedSeconds = (currentTime - this.animationStartTime) / 1000;

      // Calculate sweep position (0 to width, then reset)
      const sweepCycleTime = widthSeconds;
      const sweepProgress = (elapsedSeconds % sweepCycleTime) / sweepCycleTime;
      this.sweepPosition = sweepProgress * width;

      // Update sweep line position
      this.sweepLine
        .attr("x1", this.sweepPosition)
        .attr("x2", this.sweepPosition);

      // Calculate current data time based on elapsed time
      const currentDataTime = elapsedSeconds % totalDuration;

      // Show only the waveform data up to the current sweep position
      this.updateWaveformDisplay(currentDataTime, totalDuration);

      // Continue animation
      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate();
  },

  // Update waveform display using efficient clipping approach
  updateWaveformDisplay(currentDataTime, totalDuration) {
    const { widthSeconds } = this.chartConfig;

    // Calculate which screen cycle we're in and position within that cycle
    const screenCycle = Math.floor(currentDataTime / widthSeconds);
    const timeWithinScreen = currentDataTime - screenCycle * widthSeconds;

    // Get current screen data
    const currentScreenData = this.getScreenData(screenCycle, widthSeconds, totalDuration);
    
    // Get previous screen data
    const previousScreenData = screenCycle > 0 ? 
      this.getScreenData(screenCycle - 1, widthSeconds, totalDuration) : [];

    // Update old path (previous cycle data) - clip to show only unwritten area
    if (previousScreenData.length > 0) {
      const normalizedOldData = previousScreenData.map(d => ({
        time: d.time - (screenCycle - 1) * widthSeconds,
        value: d.value
      }));
      this.oldPath.datum(normalizedOldData).attr("d", this.line);
      
      // Create clipping mask for old data (show only after sweep position)
      const oldClipId = `${this.clipId}-old`;
      this.createOldDataClip(oldClipId, timeWithinScreen);
      this.oldPath.attr("clip-path", `url(#${oldClipId})`);
    } else {
      this.oldPath.datum([]).attr("d", this.line);
    }

    // Update new path (current cycle data) - clip to show only written area
    const normalizedNewData = currentScreenData.map(d => ({
      time: d.time - screenCycle * widthSeconds,
      value: d.value
    }));
    this.newPath.datum(normalizedNewData).attr("d", this.line);
    
    // Create clipping mask for new data (show only up to sweep position)
    const newClipId = `${this.clipId}-new`;
    this.createNewDataClip(newClipId, timeWithinScreen);
    this.newPath.attr("clip-path", `url(#${newClipId})`);
  },

  // Helper to get screen data for a given cycle
  getScreenData(screenCycle, widthSeconds, totalDuration) {
    const screenStartTime = screenCycle * widthSeconds;
    const screenEndTime = screenStartTime + widthSeconds;

    if (screenEndTime <= totalDuration) {
      return this.ecgData.filter(d => d.time >= screenStartTime && d.time < screenEndTime);
    } else {
      const endData = this.ecgData.filter(d => d.time >= screenStartTime);
      const wrapAmount = screenEndTime - totalDuration;
      const startData = this.ecgData.filter(d => d.time < wrapAmount);
      
      const adjustedStartData = startData.map(d => ({
        time: d.time + totalDuration,
        value: d.value
      }));
      
      return [...endData, ...adjustedStartData];
    }
  },

  // Create clipping path for old data (show only after sweep)
  createOldDataClip(clipId, sweepPosition) {
    const { width } = this.chartConfig;
    const sweepX = (sweepPosition / this.chartConfig.widthSeconds) * width;
    
    let clipPath = this.svg.select(`#${clipId}`);
    if (clipPath.empty()) {
      clipPath = this.svg.select("defs").append("clipPath").attr("id", clipId);
      clipPath.append("rect").attr("height", this.chartConfig.height);
    }
    
    clipPath.select("rect")
      .attr("x", sweepX)
      .attr("width", width - sweepX);
  },

  // Create clipping path for new data (show only up to sweep)
  createNewDataClip(clipId, sweepPosition) {
    const { width } = this.chartConfig;
    const sweepX = (sweepPosition / this.chartConfig.widthSeconds) * width;
    
    let clipPath = this.svg.select(`#${clipId}`);
    if (clipPath.empty()) {
      clipPath = this.svg.select("defs").append("clipPath").attr("id", clipId);
      clipPath.append("rect").attr("height", this.chartConfig.height);
    }
    
    clipPath.select("rect")
      .attr("x", 0)
      .attr("width", sweepX);
  },

  stopAnimation() {
    // Stop the animation loop
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  },
};

export default ECGPlayback;
