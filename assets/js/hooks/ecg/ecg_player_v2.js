import { createActor } from 'xstate';
import { ecgPlayerMachine } from './machines/ecg_player_machine';

// Import constants from the original player (we'll need to extract these)
const MM_PER_SECOND = 25;
const MM_PER_MILLIVOLT = 10;
const PIXELS_PER_MM = 6;
const HEIGHT_MILLIVOLTS = 2.5;
const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM;
const WAVEFORM_LINE_WIDTH = 1.3;
const DOT_RADIUS = 1.2;
const DEFAULT_WIDTH_SECONDS = 2.5;
const SINGLE_LEAD_CURSOR_WIDTH = 20;
const MULTI_LEAD_CURSOR_WIDTH = 8;
const MULTI_LEAD_HEIGHT_SCALE = 0.8;
const QRS_FLASH_DURATION_MS = 100;
const SEGMENT_DURATION_SECONDS = 0.1;

const ECGPlayerV2 = {
  mounted() {
    // Create and start the XState machine
    this.actor = createActor(ecgPlayerMachine);
    this.actor.start();
    
    // Subscribe to state changes
    this.actor.subscribe((state) => {
      this.handleStateChange(state);
    });
    
    // Initialize canvas and UI elements
    this.initializeCanvas();
    this.calculateMedicallyAccurateDimensions();
    this.updateThemeColors();
    this.setupEventListeners();
    
    // Get the target for push events (component ID)
    this.targetComponent = this.el.getAttribute("phx-target");
    
    // Load initial data if available
    this.loadInitialData();
  },
  
  destroyed() {
    // Clean up the actor when component is destroyed
    if (this.actor) {
      this.actor.stop();
    }
    this.cleanupEventListeners();
  },
  
  handleStateChange(state) {
    // This is where we'll handle rendering based on state changes
    console.log('State changed:', state.value, state.context);
    
    // Update UI based on parallel states
    this.updatePlaybackUI(state);
    this.updateCalipersUI(state);
    this.updateDisplayUI(state);
    this.updateFullscreenUI(state);
    
    // Render the canvas if needed
    if (state.matches({ playback: 'playing' }) || state.changed) {
      this.renderCanvas(state);
    }
  },
  
  updatePlaybackUI(state) {
    const playbackState = state.value.playback;
    
    // Update play/pause button
    const playButton = this.el.querySelector('[data-action="play"]');
    const pauseButton = this.el.querySelector('[data-action="pause"]');
    
    if (playButton && pauseButton) {
      if (playbackState === 'playing') {
        playButton.style.display = 'none';
        pauseButton.style.display = 'inline-block';
      } else {
        playButton.style.display = 'inline-block';
        pauseButton.style.display = 'none';
      }
    }
    
    // Update loop button
    const loopButton = this.el.querySelector('[data-action="toggle-loop"]');
    if (loopButton) {
      if (state.context.playback.loopEnabled) {
        loopButton.classList.add('active');
      } else {
        loopButton.classList.remove('active');
      }
    }
  },
  
  updateCalipersUI(state) {
    const calipersState = state.value.calipers;
    const calipersButton = this.el.querySelector('[data-action="toggle-calipers"]');
    
    if (calipersButton) {
      if (calipersState === 'enabled') {
        calipersButton.classList.add('active');
      } else {
        calipersButton.classList.remove('active');
      }
    }
  },
  
  updateDisplayUI(state) {
    const displayState = state.value.display;
    
    // Update display mode buttons
    const singleButton = this.el.querySelector('[data-action="single-display"]');
    const multiButton = this.el.querySelector('[data-action="multi-display"]');
    
    if (singleButton && multiButton) {
      if (displayState === 'single') {
        singleButton.classList.add('active');
        multiButton.classList.remove('active');
      } else {
        singleButton.classList.remove('active');
        multiButton.classList.add('active');
      }
    }
  },
  
  updateFullscreenUI(state) {
    const fullscreenState = state.value.fullscreen;
    const fullscreenButton = this.el.querySelector('[data-action="toggle-fullscreen"]');
    
    if (fullscreenButton) {
      if (fullscreenState === 'on') {
        fullscreenButton.classList.add('active');
      } else {
        fullscreenButton.classList.remove('active');
      }
    }
  },
  
  renderCanvas(state) {
    if (!state.context.ecgData) {
      return;
    }
    
    // Clear previous rendering
    this.clearCanvas();
    
    // Render based on display mode
    if (state.value.display === 'single') {
      this.renderSingleLead(state);
    } else {
      this.renderMultiLead(state);
    }
    
    // Render calipers if enabled
    if (state.value.calipers === 'enabled') {
      this.renderCalipers(state);
    }
    
    // Render cursor if playing
    if (state.value.playback === 'playing') {
      this.renderCursor(state);
    }
  },
  
  renderSingleLead(state) {
    // TODO: Implement single lead rendering
    console.log('Rendering single lead');
  },
  
  renderMultiLead(state) {
    // TODO: Implement multi lead rendering
    console.log('Rendering multi lead');
  },
  
  renderCalipers(state) {
    // TODO: Implement calipers rendering
    console.log('Rendering calipers');
  },
  
  renderCursor(state) {
    // TODO: Implement cursor rendering
    console.log('Rendering cursor');
  },
  
  clearCanvas() {
    // TODO: Implement canvas clearing
    console.log('Clearing canvas');
  },
  
  initializeCanvas() {
    // TODO: Initialize canvas layers
    console.log('Initializing canvas');
  },
  
  calculateMedicallyAccurateDimensions() {
    // TODO: Calculate dimensions based on medical standards
    console.log('Calculating dimensions');
  },
  
  updateThemeColors() {
    // TODO: Update theme colors
    console.log('Updating theme colors');
  },
  
  setupEventListeners() {
    // Set up event listeners for UI controls
    this.setupPlaybackControls();
    this.setupCalipersControls();
    this.setupDisplayControls();
    this.setupFullscreenControls();
    this.setupKeyboardListeners();
    this.setupResizeListener();
    this.setupThemeListener();
  },
  
  setupPlaybackControls() {
    // Play button
    const playButton = this.el.querySelector('[data-action="play"]');
    if (playButton) {
      playButton.addEventListener('click', () => {
        this.actor.send({ type: 'PLAY' });
      });
    }
    
    // Pause button
    const pauseButton = this.el.querySelector('[data-action="pause"]');
    if (pauseButton) {
      pauseButton.addEventListener('click', () => {
        this.actor.send({ type: 'PAUSE' });
      });
    }
    
    // Stop button
    const stopButton = this.el.querySelector('[data-action="stop"]');
    if (stopButton) {
      stopButton.addEventListener('click', () => {
        this.actor.send({ type: 'STOP' });
      });
    }
    
    // Loop button
    const loopButton = this.el.querySelector('[data-action="toggle-loop"]');
    if (loopButton) {
      loopButton.addEventListener('click', () => {
        this.actor.send({ type: 'TOGGLE_LOOP' });
      });
    }
  },
  
  setupCalipersControls() {
    const calipersButton = this.el.querySelector('[data-action="toggle-calipers"]');
    if (calipersButton) {
      calipersButton.addEventListener('click', () => {
        this.actor.send({ type: 'TOGGLE_CALIPERS' });
      });
    }
    
    const clearCalipersButton = this.el.querySelector('[data-action="clear-calipers"]');
    if (clearCalipersButton) {
      clearCalipersButton.addEventListener('click', () => {
        this.actor.send({ type: 'CLEAR_CALIPERS' });
      });
    }
  },
  
  setupDisplayControls() {
    const singleButton = this.el.querySelector('[data-action="single-display"]');
    if (singleButton) {
      singleButton.addEventListener('click', () => {
        this.actor.send({ type: 'TOGGLE_DISPLAY_MODE' });
      });
    }
    
    const multiButton = this.el.querySelector('[data-action="multi-display"]');
    if (multiButton) {
      multiButton.addEventListener('click', () => {
        this.actor.send({ type: 'TOGGLE_DISPLAY_MODE' });
      });
    }
  },
  
  setupFullscreenControls() {
    const fullscreenButton = this.el.querySelector('[data-action="toggle-fullscreen"]');
    if (fullscreenButton) {
      fullscreenButton.addEventListener('click', () => {
        this.actor.send({ type: 'TOGGLE_FULLSCREEN' });
      });
    }
  },
  
  setupKeyboardListeners() {
    // TODO: Implement keyboard shortcuts
    console.log('Setting up keyboard listeners');
  },
  
  setupResizeListener() {
    this.resizeHandler = () => {
      this.calculateMedicallyAccurateDimensions();
      // Re-render after resize
      const currentState = this.actor.getSnapshot();
      this.renderCanvas(currentState);
    };
    window.addEventListener("resize", this.resizeHandler);
  },
  
  setupThemeListener() {
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          this.updateThemeColors();
          const currentState = this.actor.getSnapshot();
          this.renderCanvas(currentState);
        }
      });
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  },
  
  cleanupEventListeners() {
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
    }
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  },
  
  loadInitialData() {
    // TODO: Load initial ECG data
    // For now, simulate loading
    setTimeout(() => {
      this.actor.send({ 
        type: 'DATA_LOADED', 
        data: {
          samplingRate: 500,
          leadNames: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
          totalDuration: 10,
          qrsTimestamps: [],
          ecgLeadDatasets: [],
          precomputedSegments: new Map()
        }
      });
    }, 100);
  }
};

export default ECGPlayerV2;