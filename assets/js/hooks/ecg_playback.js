import * as d3 from "d3";

const MM_PER_SECOND = 25;
const MM_PER_MILLIVOLT = 10;
const PIXELS_PER_MM = 4;
const WIDTH_SECONDS = 5;
const HEIGHT_MILLIVOLTS = 4;
const CHART_WIDTH = WIDTH_SECONDS * MM_PER_SECOND * PIXELS_PER_MM;
const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM;
const DOT_RADIUS = 1.2;

const ECGPlayback = {
  async mounted() {
    this.isPlaying = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.currentCycle = 0;
    this.timer = null;
    this.visibleTimes = [];
    this.visibleValues = [];

    await this.initializeECGChart();

    this.handleEvent("playback_changed", (payload) => {
      this.handlePlaybackChange(payload.is_playing);
    });

    this.handleEvent("lead_changed", (payload) => {
      this.handleLeadChange(payload.lead);
    });
  },

  destroyed() {
    this.cleanup();
  },

  cleanup() {
    if (this.timer) {
      this.timer.stop();
      this.timer = null;
    }
    if (this.canvas) {
      this.canvas.remove();
    }

    this.ecgLeadDatasets = null;

    // Clear other data references
    this.currentLeadData = null;
    this.leadNames = null;

    this.visibleTimes = [];
    this.visibleValues = [];

    // Clear event handler references
    this.eventHandlers = null;
  },

  async initializeECGChart() {
    this.currentLeadData = await this.loadECGData();

    this.canvas = d3
      .select(this.el.querySelector("[data-ecg-chart]"))
      .append("canvas")
      .attr("width", CHART_WIDTH)
      .attr("height", CHART_HEIGHT);

    this.context = this.canvas.node().getContext("2d");

    const devicePixelRatio = window.devicePixelRatio || 1;
    this.canvas
      .attr("width", CHART_WIDTH * devicePixelRatio)
      .attr("height", CHART_HEIGHT * devicePixelRatio)
      .style("width", CHART_WIDTH + "px")
      .style("height", CHART_HEIGHT + "px");
    this.context.scale(devicePixelRatio, devicePixelRatio);

    this.xScale = d3
      .scaleLinear()
      .domain([0, WIDTH_SECONDS])
      .range([0, CHART_WIDTH]);
    this.drawGrid();
  },

  drawGrid() {
    this.context.clearRect(0, 0, CHART_WIDTH, CHART_HEIGHT);
    const dotSpacing = 5 * PIXELS_PER_MM;
    this.context.fillStyle = "#d0d0d0";

    for (let x = 5; x < CHART_WIDTH - 5; x += dotSpacing) {
      for (let y = 5; y < CHART_HEIGHT - 5; y += dotSpacing) {
        this.context.beginPath();
        this.context.arc(x, y, DOT_RADIUS, 0, 2 * Math.PI);
        this.context.fill();
      }
    }
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
    this.yScale = d3
      .scaleLinear()
      .domain([globalRange.min, globalRange.max])
      .range([CHART_HEIGHT, 0]);

    return this.currentLeadData;
  },

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

  resetPlayback() {
    this.stopAnimation();
    this.startTime = null;
    this.pausedTime = 0;
    this.currentCycle = 0;

    this.visibleTimes = [];
    this.visibleValues = [];

    this.clearWaveform();
  },

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

  executeAnimationLoop() {
    if (this.timer) {
      this.timer.stop();
      this.timer = null;
    }

    this.timer = d3.timer(() => {
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
    });
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

    this.visibleTimes = [];
    this.visibleValues = [];

    for (let i = 0; i < this.currentLeadData.times.length; i++) {
      const dataTime = this.currentLeadData.times[i];

      if (dataTime >= cycleStartTime && dataTime <= cycleEndTime) {
        this.visibleTimes.push(dataTime - cycleStartTime);
        this.visibleValues.push(this.currentLeadData.values[i]);
      }
    }

    this.drawWaveform();
  },

  stopAnimation() {
    if (this.timer) {
      this.timer.stop();
      this.timer = null;
    }
    this.isPlaying = false;
  },

  clearWaveform() {
    this.drawGrid();
  },

  drawWaveform() {
    this.drawGrid();
    const pointCount = this.visibleTimes.length;
    if (pointCount > 0) {
      this.context.strokeStyle = "#000000";
      this.context.lineWidth = 1.25;
      this.context.beginPath();

      for (let i = 0; i < pointCount; i++) {
        const x = this.xScale(this.visibleTimes[i]);
        const y = this.yScale(this.visibleValues[i]);

        if (i === 0) {
          this.context.moveTo(x, y);
        } else {
          this.context.lineTo(x, y);
        }
      }

      this.context.stroke();
    }
  },

  drawSweepLine(sweepLinePosition) {
    this.context.strokeStyle = "#00ff00";
    this.context.lineWidth = 2;
    this.context.beginPath();
    this.context.moveTo(sweepLinePosition, 0);
    this.context.lineTo(sweepLinePosition, CHART_HEIGHT);
    this.context.stroke();
  },
};

export default ECGPlayback;
