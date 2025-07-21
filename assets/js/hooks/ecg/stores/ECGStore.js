import { makeAutoObservable, action } from "mobx";

const MM_PER_SECOND = 25;
const PIXELS_PER_MM = 6;
const DEFAULT_WIDTH_SECONDS = 2.5;
const QRS_FLASH_DURATION_MS = 100;

class ECGStore {
  // Renderer reference for cleanup operations
  renderer = null;

  // State properties
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

  constructor(renderer = null) {
    this.renderer = renderer;
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
      initializeFormValues: action,
      readFormValue: action,
      readFormCheckbox: action,
      setRenderer: action,
      renderCurrentFrame: action,
      withCanvasStatePreservation: action,
      updateDimensions: action,
      updateCursorPosition: action,
      updateLeadHeight: action,
      setActiveCursorData: action,
      setAllLeadsCursorData: action,
      setActiveSegments: action,
      addToAllLeadsCursorData: action,
      initializeStartTime: action,
      resumePlayback: action,
      startAnimation: action,
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
    const newPlayingState = !this.isPlaying;
    this.isPlaying = newPlayingState;
    
    if (!newPlayingState) {
      // Pausing - record the pause time
      this.pausedTime = Date.now();
    } else {
      // Resuming - adjust start time to account for pause duration
      if (this.pausedTime && this.startTime) {
        const pauseDuration = Date.now() - this.pausedTime;
        this.startTime += pauseDuration;
        this.pausedTime = 0;
      } else if (!this.startTime) {
        // Starting for the first time
        this.startTime = Date.now();
        this.pausedTime = 0;
      }
    }
  }

  resetPlayback() {
    this.isPlaying = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.cursorPosition = 0;
    this.lastQrsIndex = -1;
    this.qrsDetectedCount = 0;
    
    // Reset data state
    this.activeCursorData = null;
    this.allLeadsCursorData = null;
    
    // Reset QRS flash state
    if (this.qrsFlashTimeout) {
      clearTimeout(this.qrsFlashTimeout);
      this.qrsFlashTimeout = null;
    }
    this.qrsFlashActive = false;
    
    // Clear the waveform canvas when resetting playback (like original implementation)
    if (this.renderer && this.renderer.clearWaveform) {
      this.renderer.clearWaveform();
    }
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
    
    const wasPlaying = this.isPlaying;
    
    // Single atomic action for state changes
    action(() => {
      if (wasPlaying) {
        this.isPlaying = false; // Temporarily stop animation
      }
      
      this.currentLead = leadIndex;
      this.currentLeadData = this.ecgLeadDatasets[leadIndex];
      this.calipers = [];
      this.activeCaliper = null;
    })();
    
    // Clear the waveform canvas when switching leads
    if (this.renderer && this.renderer.clearWaveform) {
      this.renderer.clearWaveform();
    }
    
    // Resume animation if it was playing
    if (wasPlaying) {
      action(() => {
        this.isPlaying = true; // Resume animation
      })();
    }
    
    if (!wasPlaying && this.startTime && this.pausedTime) {
      // Re-render current frame for paused state
      this.renderCurrentFrame();
    }
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
    // Update theme colors in renderer
    if (this.renderer && this.renderer.updateThemeColors) {
      this.renderer.updateThemeColors();
    }
    
    // Re-render grid background with new colors
    if (this.renderer && this.renderer.renderGridBackground) {
      this.renderer.renderGridBackground();
    }
    
    // Clear and re-render waveform with new colors
    if (this.renderer && this.renderer.clearWaveform) {
      this.renderer.clearWaveform();
    }
    
    // Re-render current frame if paused to show waveform in new colors
    if (!this.isPlaying && this.startTime && this.pausedTime) {
      this.renderCurrentFrame();
    }
  }

  recreateCanvasAndRestart() {
    // This will be handled by the Renderer
  }

  startAnimation() {
    this.isPlaying = true;
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.cursorPosition = 0;
    this.activeCursorData = null;
    this.allLeadsCursorData = null;
  }

  handlePlaybackEnd() {
    if (this.loopEnabled) {
      this.resetPlayback();
      this.startAnimation();
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
    action(() => {
      if (this.qrsFlashTimeout) {
        clearTimeout(this.qrsFlashTimeout);
      }
      this.qrsFlashActive = true;
    })();
    
    this.qrsFlashTimeout = setTimeout(action(() => {
      this.qrsFlashActive = false;
      this.qrsFlashTimeout = null;
      this.clearQrsFlashArea();
    }), QRS_FLASH_DURATION_MS);
  }

  clearQrsFlashArea() {
    // This method is called by the QRS flash timeout
    // Call the renderer's clearQrsFlashArea method if available
    if (this.renderer && this.renderer.clearQrsFlashArea) {
      this.renderer.clearQrsFlashArea();
    }
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }
  
  renderCurrentFrame() {
    // Render the current frame when paused
    if (this.renderer && this.startTime && this.pausedTime && this.isDataLoaded) {
      const elapsedSeconds = (this.pausedTime - this.startTime) / 1000;
      
      // Ensure we don't go beyond the total duration
      if (elapsedSeconds >= this.totalDuration) {
        return;
      }
      
      const cursorProgress = (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
      
      // Use setTimeout to ensure canvas is ready and data is available
      setTimeout(() => {
        if (this.renderer && this.renderer.processAnimationFrame) {
          this.renderer.processAnimationFrame(cursorProgress, animationCycle);
        }
      }, 0);
    }
  }

  withCanvasStatePreservation(operation) {
    // Preserve animation state during canvas operations
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.isPlaying = false; // Temporarily stop animation
    }

    operation();

    // Restore state
    if (!wasPlaying && this.startTime && this.pausedTime) {
      // Re-render current frame for paused state
      this.renderCurrentFrame();
    }

    if (wasPlaying) {
      this.isPlaying = true; // Resume animation
    }
  }

  // Actions for Renderer to use instead of direct mutations
  updateDimensions(chartWidth, widthSeconds) {
    this.chartWidth = chartWidth;
    this.widthSeconds = widthSeconds;
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
    if (!this.startTime) {
      this.startTime = Date.now();
    }
  }

  resumePlayback() {
    this.isPlaying = true;
  }

  // Computed properties for derived state
  get qrsDetectionRate() {
    return this.totalDuration > 0 ? (this.qrsDetectedCount / this.totalDuration) * 60 : 0;
  }

  get playbackProgress() {
    if (!this.startTime || !this.totalDuration) return 0;
    const elapsed = this.isPlaying 
      ? (Date.now() - this.startTime) / 1000
      : (this.pausedTime - this.startTime) / 1000;
    return Math.min(elapsed / this.totalDuration, 1);
  }

  get currentPlaybackTime() {
    if (!this.startTime) return 0;
    return this.isPlaying 
      ? (Date.now() - this.startTime) / 1000
      : (this.pausedTime - this.startTime) / 1000;
  }

  get isDataLoaded() {
    return this.ecgLeadDatasets && this.ecgLeadDatasets.length > 0;
  }

  get hasValidLead() {
    return this.isDataLoaded && this.currentLead >= 0 && this.currentLead < this.leadNames.length;
  }

  get currentLeadName() {
    return this.hasValidLead ? this.leadNames[this.currentLead] : 'Unknown';
  }

  // Form reading methods
  readFormValue(fieldName) {
    const input = document.querySelector(
      `input[name="settings[${fieldName}]"], select[name="settings[${fieldName}]"]`
    );
    return input ? input.value : null;
  }

  readFormCheckbox(fieldName) {
    const input = document.querySelector(
      `input[name="settings[${fieldName}]"][type="checkbox"]`
    );
    return input ? input.checked : false;
  }

  initializeFormValues() {
    // Display and playback settings
    this.gridType = this.readFormValue("grid_type") || "telemetry";
    this.displayMode = this.readFormValue("display_mode") || "single";
    this.currentLead = parseInt(this.readFormValue("current_lead") || "0");

    // Playback options
    this.loopEnabled = this.readFormCheckbox("loop_playback");
    this.qrsIndicatorEnabled = this.readFormCheckbox("qrs_indicator");

    // Scale settings
    this.gridScale = parseFloat(this.readFormValue("grid_scale") || "1.0");
    this.amplitudeScale = parseFloat(
      this.readFormValue("amplitude_scale") || "1.0"
    );
    this.heightScale = parseFloat(this.readFormValue("height_scale") || "1.2");
  }
}

export default ECGStore;