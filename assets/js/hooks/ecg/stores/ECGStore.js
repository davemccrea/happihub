import { makeAutoObservable, action } from "mobx";

const MM_PER_SECOND = 25;
const PIXELS_PER_MM = 6;
const DEFAULT_WIDTH_SECONDS = 2.5;
const QRS_FLASH_DURATION_MS = 100;

class ECGStore {
  // State properties
  isPlaying = false;
  displayMode = "single";
  gridScale = 1.0;
  amplitudeScale = 1.0;
  heightScale = 1.2;
  ecgData = null;
  startTime = null;
  pausedTime = 0;
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

  constructor() {
    makeAutoObservable(this, {
      // Mark methods that modify state as actions
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
      recreateCanvasAndRestart: action,
      handlePlaybackEnd: action,
      checkQrsOccurrences: action,
      triggerQrsFlash: action,
      clearQrsFlashArea: action,
    });
  }

  // Actions
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
      this.clearQrsFlashArea();
    }
  }

  togglePlayback() {
    this.isPlaying = !this.isPlaying;
  }

  resetPlayback() {
    this.isPlaying = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.lastQrsIndex = -1;
    this.qrsDetectedCount = 0;
    if (this.qrsFlashTimeout) {
      clearTimeout(this.qrsFlashTimeout);
      this.qrsFlashTimeout = null;
    }
    this.qrsFlashActive = false;
  }

  loadData(data) {
    this.ecgData = data;
    this.resetPlayback();
  }

  switchLead(leadIndex) {
    if (!this.ecgLeadDatasets || leadIndex < 0 || leadIndex >= this.ecgLeadDatasets.length) {
      console.warn(`Invalid lead index: ${leadIndex}`);
      return;
    }
    this.currentLead = leadIndex;
    this.currentLeadData = this.ecgLeadDatasets[leadIndex];
    this.calipers = [];
    this.activeCaliper = null;
  }

  switchToNextLead() {
    if (this.currentLead < this.ecgLeadDatasets.length - 1) {
      this.switchLead(this.currentLead + 1);
    }
  }

  switchToPrevLead() {
    if (this.currentLead > 0) {
      this.switchLead(this.currentLead - 1);
    }
  }

  toggleCalipers() {
    this.calipersMode = !this.calipersMode;
    if (!this.calipersMode) {
      this.calipers = [];
      this.activeCaliper = null;
    }
  }

  handleThemeChange() {
    // This will be handled by the Renderer, but we can keep the action here
    // if we need to react to theme changes in the store.
  }

  recreateCanvasAndRestart() {
    // This will be handled by the Renderer
  }

  handlePlaybackEnd() {
    if (this.loopEnabled) {
      this.resetPlayback();
      this.togglePlayback();
    } else {
      this.resetPlayback();
    }
  }

  checkQrsOccurrences(elapsedTime) {
    if (!this.qrsTimestamps || this.qrsTimestamps.length === 0) {
      return;
    }

    for (let i = this.lastQrsIndex + 1; i < this.qrsTimestamps.length; i++) {
      const qrsTime = this.qrsTimestamps[i];
      if (qrsTime <= elapsedTime) {
        this.qrsDetectedCount++;
        if (this.qrsIndicatorEnabled) {
          this.triggerQrsFlash();
        }
        this.lastQrsIndex = i;
      } else {
        break;
      }
    }
  }

  triggerQrsFlash() {
    if (this.qrsFlashTimeout) {
      clearTimeout(this.qrsFlashTimeout);
    }
    this.qrsFlashActive = true;
    this.qrsFlashTimeout = setTimeout(() => {
      this.qrsFlashActive = false;
      this.qrsFlashTimeout = null;
      this.clearQrsFlashArea();
    }, QRS_FLASH_DURATION_MS);
  }

  clearQrsFlashArea() {
    // This will be handled by the Renderer
  }
}

export default ECGStore;