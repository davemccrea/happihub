import { makeAutoObservable, action } from "mobx";

/**
 * MobX store for ECG player state management
 * @class ECGStore
 */

const DEFAULT_WIDTH_SECONDS = 2.5;
const QRS_FLASH_DURATION_MS = 100;
const PIXELS_PER_MM = 6;
const MM_PER_SECOND = 25;
const CONTAINER_PADDING = 0;

class ECGStore {
  chartContainer = null;
  isPlaying = false;
  displayMode = "single";
  gridType = "telemetry";
  gridScale = 1.0;
  amplitudeScale = 1.0;
  heightScale = 1.2;
  isFullscreen = false;
  ecgData = null;
  startTime = null;
  pausedTime = 0;
  pausedFrameData = null; // Holds data for rendering a paused frame
  loopEnabled = false;
  qrsIndicatorEnabled = false;
  calipersMode = false;
  activeCaliper = null;
  calipers = [];
  yMin = 0;
  yMax = 0;
  currentLead = 0;
  currentLeadData = null;
  precomputedSegments = new Map();
  dataIndexCache = new Map();
  qrsIndexes = [];
  qrsTimestamps = [];
  lastQrsIndex = -1;
  qrsDetectedCount = 0;
  qrsFlashActive = false;
  qrsFlashTimeout = null;
  chartWidth = 0;
  widthSeconds = DEFAULT_WIDTH_SECONDS;
  leadHeight = 0;
  samplingRate = 0;
  leadNames = [];
  totalDuration = 0;
  ecgLeadDatasets = [];
  cursorPosition = 0;
  activeCursorData = null;
  allLeadsCursorData = null;
  activeSegments = [];

  /**
   * @param {HTMLElement} chartContainer - The DOM container for the ECG chart
   */
  constructor(chartContainer) {
    this.chartContainer = chartContainer;
    makeAutoObservable(this, {
      chartContainer: false,
      setGridScale: action,
      setAmplitudeScale: action,
      setHeightScale: action,
      setDisplayMode: action,
      setGridType: action,
      setLoop: action,
      setQrsIndicator: action,
      togglePlayback: action,
      resetPlayback: action,
      loadData: action,
      switchLead: action,
      switchToNextLead: action,
      switchToPrevLead: action,
      toggleCalipers: action,
      handleThemeChange: action,
      handlePlaybackEnd: action,
      checkQrsOccurrences: action,
      triggerQrsFlash: action,
      renderCurrentFrame: action,
      updateDimensions: action,
      updateDimensionsFromDOM: action,
      updateCursorPosition: action,
      updateLeadHeight: action,
      setActiveCursorData: action,
      setAllLeadsCursorData: action,
      setActiveSegments: action,
      addToAllLeadsCursorData: action,
      initializeStartTime: action,
    });
  }

  setGridScale(newScale) {
    this.gridScale = newScale;
  }
  setAmplitudeScale(newScale) {
    this.amplitudeScale = newScale;
  }
  setHeightScale(newScale) {
    this.heightScale = newScale;
  }
  setDisplayMode(mode) {
    this.displayMode = mode;
  }
  setGridType(type) {
    this.gridType = type;
  }
  setLoop(enabled) {
    this.loopEnabled = enabled;
  }

  setQrsIndicator(enabled) {
    this.qrsIndicatorEnabled = enabled;
    if (!enabled && this.qrsFlashActive) {
      this.qrsFlashActive = false;
      if (this.qrsFlashTimeout) {
        clearTimeout(this.qrsFlashTimeout);
        this.qrsFlashTimeout = null;
      }
    }
  }

  togglePlayback() {
    this.isPlaying = !this.isPlaying;
    if (!this.isPlaying) {
      this.pausedTime = Date.now();
    } else {
      if (this.pausedTime && this.startTime) {
        this.startTime += Date.now() - this.pausedTime;
      }
      this.pausedTime = 0;
    }
  }

  resetPlayback() {
    this.isPlaying = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.cursorPosition = 0;
    this.lastQrsIndex = -1;
    this.qrsDetectedCount = 0;
    this.activeCursorData = null;
    this.allLeadsCursorData = null;
    if (this.qrsFlashTimeout) clearTimeout(this.qrsFlashTimeout);
    this.qrsFlashActive = false;
  }

  /**
   * @param {Object} data - ECG data object containing signals and metadata
   */
  loadData(data) {
    this.ecgData = data;
    this.resetPlayback();
  }

  /**
   * @param {number} leadIndex - Zero-based lead index
   */
  switchLead(leadIndex) {
    if (
      !this.ecgLeadDatasets ||
      leadIndex < 0 ||
      leadIndex >= this.ecgLeadDatasets.length
    )
      return;
    this.currentLead = leadIndex;
    this.currentLeadData = this.ecgLeadDatasets[leadIndex];
    this.calipers = [];
    this.activeCaliper = null;
  }

  switchToNextLead() {
    if (this.currentLead < this.ecgLeadDatasets.length - 1)
      this.switchLead(this.currentLead + 1);
  }

  switchToPrevLead() {
    if (this.currentLead > 0) this.switchLead(this.currentLead - 1);
  }

  toggleCalipers() {
    this.calipersMode = !this.calipersMode;
    if (!this.calipersMode) {
      this.calipers = [];
      this.activeCaliper = null;
    }
  }

  handleThemeChange() {
  }

  handlePlaybackEnd() {
    if (this.loopEnabled) {
      this.resetPlayback();
      this.isPlaying = true;
      this.startTime = Date.now();
    } else {
      this.resetPlayback();
    }
  }

  /**
   * @param {number} elapsedTime - Current playback time in seconds
   */
  checkQrsOccurrences(elapsedTime) {
    if (!this.qrsTimestamps || this.qrsTimestamps.length === 0) return;
    for (let i = this.lastQrsIndex + 1; i < this.qrsTimestamps.length; i++) {
      const qrsTime = this.qrsTimestamps[i];
      if (qrsTime <= elapsedTime) {
        this.qrsDetectedCount++;
        if (this.qrsIndicatorEnabled) this.triggerQrsFlash();
        this.lastQrsIndex = i;
      } else {
        break;
      }
    }
  }

  triggerQrsFlash() {
    if (this.qrsFlashTimeout) clearTimeout(this.qrsFlashTimeout);
    this.qrsFlashActive = true;
    this.qrsFlashTimeout = setTimeout(
      action(() => {
        this.qrsFlashActive = false;
        this.qrsFlashTimeout = null;
      }),
      QRS_FLASH_DURATION_MS,
    );
  }

  renderCurrentFrame() {
    if (!this.isDataLoaded || !this.startTime || !this.pausedTime) return;
    const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
    if (elapsedSeconds >= this.totalDuration) return;

    this.pausedFrameData = {
      progress: (elapsedSeconds % this.widthSeconds) / this.widthSeconds,
      cycle: Math.floor(elapsedSeconds / this.widthSeconds),
      timestamp: Date.now(), // Add timestamp to ensure reaction fires
    };
  }

  /**
   * @param {number} chartWidth - Chart width in pixels
   * @param {number} widthSeconds - Time span shown in seconds
   */
  updateDimensions(chartWidth, widthSeconds) {
    this.chartWidth = chartWidth;
    this.widthSeconds = widthSeconds;
  }

  /**
   * Update chart dimensions based on DOM container size
   */
  updateDimensionsFromDOM() {
    if (!this.chartContainer) {
      const chartWidth =
        DEFAULT_WIDTH_SECONDS * MM_PER_SECOND * PIXELS_PER_MM * this.gridScale;
      this.updateDimensions(chartWidth, DEFAULT_WIDTH_SECONDS);
      return;
    }
    const containerWidth = this.chartContainer.offsetWidth - CONTAINER_PADDING;
    const scaledPixelsPerMm = PIXELS_PER_MM * this.gridScale;
    const minWidth = DEFAULT_WIDTH_SECONDS * MM_PER_SECOND * scaledPixelsPerMm;

    if (containerWidth < minWidth) {
      this.updateDimensions(minWidth, DEFAULT_WIDTH_SECONDS);
    } else {
      const widthSeconds = containerWidth / (MM_PER_SECOND * scaledPixelsPerMm);
      const chartWidth = widthSeconds * MM_PER_SECOND * scaledPixelsPerMm;
      this.updateDimensions(chartWidth, widthSeconds);
    }
  }

  updateCursorPosition(position) {
    this.cursorPosition = position % this.chartWidth;
  }
  updateLeadHeight(height) {
    this.leadHeight = height;
  }
  setActiveCursorData(data) {
    this.activeCursorData = data;
  }
  setAllLeadsCursorData(data) {
    this.allLeadsCursorData = data;
  }
  setActiveSegments(segments) {
    this.activeSegments = segments;
  }
  addToAllLeadsCursorData(leadData) {
    this.allLeadsCursorData.push(leadData);
  }
  initializeStartTime() {
    if (!this.startTime) this.startTime = Date.now();
  }

  get isDataLoaded() {
    return this.ecgLeadDatasets && this.ecgLeadDatasets.length > 0;
  }
  get hasValidLead() {
    return (
      this.isDataLoaded &&
      this.currentLead >= 0 &&
      this.currentLead < this.leadNames.length
    );
  }
  get currentLeadName() {
    return this.hasValidLead ? this.leadNames[this.currentLead] : "Unknown";
  }

  /**
   * @param {string} fieldName - Name of the form field
   * @returns {string|null} Form field value
   */
  readFormValue(fieldName) {
    const input = document.querySelector(
      `input[name="settings[${fieldName}]"], select[name="settings[${fieldName}]"]`,
    );
    return input ? input.value : null;
  }
  readFormCheckbox(fieldName) {
    const input = document.querySelector(
      `input[name="settings[${fieldName}]"][type="checkbox"]`,
    );
    return input ? input.checked : false;
  }
  initializeFormValues() {
    this.gridType = this.readFormValue("grid_type") || "telemetry";
    this.displayMode = this.readFormValue("display_mode") || "single";
    this.currentLead = parseInt(this.readFormValue("current_lead") || "0");
    this.loopEnabled = this.readFormCheckbox("loop_playback");
    this.qrsIndicatorEnabled = this.readFormCheckbox("qrs_indicator");
    this.gridScale = parseFloat(this.readFormValue("grid_scale") || "1.0");
    this.amplitudeScale = parseFloat(
      this.readFormValue("amplitude_scale") || "1.0",
    );
    this.heightScale = parseFloat(this.readFormValue("height_scale") || "1.2");
  }
}

export default ECGStore;
