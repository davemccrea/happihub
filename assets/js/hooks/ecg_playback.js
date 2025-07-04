import * as d3 from "d3";

const MM_PER_SECOND = 25;
const MM_PER_MILLIVOLT = 10;
const PIXELS_PER_MM = 4;
const WIDTH_SECONDS = 10;
const HEIGHT_MILLIVOLTS = 3;

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

  async initializeECGChart() {
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

  createScales() {
    const { width, height, widthSeconds, heightMilliVolts } = this.chartConfig;
    this.xScale = d3.scaleLinear().domain([0, widthSeconds]).range([0, width]);
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

  createClippingPath(height) {
    this.clipId = `clip-playback-${Math.random().toString(36).substr(2, 9)}`;
    this.svg
      .append("defs")
      .append("clipPath")
      .attr("id", this.clipId)
      .append("rect")
      .attr("width", 0)
      .attr("height", height);
  },

  drawECGPath() {
    this.path = this.svg
      .append("path")
      .datum(this.ecgData)
      .attr("class", "ecg-path")
      .attr("d", this.line)
      .attr("clip-path", `url(#${this.clipId})`);
  },

  drawGrid() {
    const { width, height, pixelsPerMm } = this.chartConfig;
    this.drawGridLines(width, height, pixelsPerMm, 1, "grid-line-minor");
    this.drawGridLines(width, height, pixelsPerMm, 5, "grid-line-major");
  },

  drawGridLines(width, height, pixelsPerMm, interval, className) {
    const spacing = pixelsPerMm * interval;

    for (let x = 0; x <= width; x += spacing) {
      this.svg
        .append("line")
        .attr("class", className)
        .attr("x1", x)
        .attr("x2", x)
        .attr("y1", 0)
        .attr("y2", height);
    }

    for (let y = 0; y <= height; y += spacing) {
      this.svg
        .append("line")
        .attr("class", className)
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y)
        .attr("y2", y);
    }
  },

  async loadECGData() {
    try {
      const response = await fetch("/assets/js/00282.json");
      const data = await response.json();

      const samplingRate = data.fs;
      const leadNames = data.sig_names;

      this.leadNames = leadNames;
      this.currentLead = 0;

      this.allLeadsData = leadNames.map((leadName, leadIndex) => ({
        name: leadName,
        data: data.signals.map((sample, index) => ({
          time: index / samplingRate,
          value: sample[leadIndex] || 0,
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
    selector.className = "form-select mb-3";

    this.leadNames.forEach((leadName, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = `Lead ${leadName}`;
      if (index === this.currentLead) option.selected = true;
      selector.appendChild(option);
    });

    container.insertBefore(selector, container.firstChild);
  },

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
    this.path.datum(this.ecgData).attr("d", this.line);
  },

  resetPlayback() {
    this.stopAnimation();
    this.svg.select(`#${this.clipId} rect`).attr("width", 0);
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

  startAnimation() {
    const { width, widthSeconds } = this.chartConfig;
    const clipRect = this.svg.select(`#${this.clipId} rect`);
    const initialWidth = parseFloat(clipRect.attr("width"));

    // If playback is at the end, restart it
    if (initialWidth >= width) {
      clipRect.attr("width", 0);
    }

    const remainingWidth = width - parseFloat(clipRect.attr("width"));
    const duration = widthSeconds * 1000 * (remainingWidth / width);

    clipRect
      .transition()
      .duration(duration)
      .ease(d3.easeLinear)
      .attr("width", width)
      .on("end", () => {
        if (this.isPlaying) {
          clipRect.attr("width", 0);
          this.startAnimation();
        }
      });
  },

  stopAnimation() {
    this.svg.select(`#${this.clipId} rect`).transition().duration(0);
  },
};

export default ECGPlayback;
