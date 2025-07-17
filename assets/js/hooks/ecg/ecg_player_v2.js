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
    // Clear all canvas layers
    const canvases = [
      { canvas: this.backgroundCanvas, context: this.backgroundContext },
      { canvas: this.waveformCanvas, context: this.waveformContext },
      { canvas: this.qrsFlashCanvas, context: this.qrsFlashContext },
      { canvas: this.calipersCanvas, context: this.calipersContext }
    ];
    
    canvases.forEach(({ canvas, context }) => {
      if (canvas && context) {
        // Clear the entire canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    
    console.log('All canvas layers cleared');
  },
  
  initializeCanvas() {
    // Get the container for canvas elements
    const container = this.el.querySelector("[data-ecg-chart]");
    if (!container) {
      console.error('ECG chart container not found');
      return;
    }
    
    // Clean up any existing canvases
    this.cleanupCanvases();
    
    // Calculate canvas dimensions
    this.calculateCanvasDimensions();
    
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.canvasHeight;
    const canvasWidth = this.chartWidth;
    
    // Create background canvas for static grid (bottom layer)
    this.backgroundCanvas = document.createElement("canvas");
    this.backgroundCanvas.width = canvasWidth * devicePixelRatio;
    this.backgroundCanvas.height = canvasHeight * devicePixelRatio;
    this.backgroundCanvas.style.width = canvasWidth + "px";
    this.backgroundCanvas.style.height = canvasHeight + "px";
    this.backgroundCanvas.style.display = "block";
    container.appendChild(this.backgroundCanvas);
    
    this.backgroundContext = this.backgroundCanvas.getContext("2d");
    this.backgroundContext.scale(devicePixelRatio, devicePixelRatio);
    
    // Create waveform canvas for animated ECG data (overlapping layer)
    this.waveformCanvas = document.createElement("canvas");
    this.waveformCanvas.width = canvasWidth * devicePixelRatio;
    this.waveformCanvas.height = canvasHeight * devicePixelRatio;
    this.waveformCanvas.style.width = canvasWidth + "px";
    this.waveformCanvas.style.height = canvasHeight + "px";
    this.waveformCanvas.style.display = "block";
    this.waveformCanvas.style.marginTop = `-${canvasHeight}px`; // Overlap the background canvas
    this.waveformCanvas.style.pointerEvents = "none"; // Allow clicks to pass through
    container.appendChild(this.waveformCanvas);
    
    this.waveformContext = this.waveformCanvas.getContext("2d");
    this.waveformContext.scale(devicePixelRatio, devicePixelRatio);
    
    // Create QRS flash canvas for indicators (overlapping layer)
    this.qrsFlashCanvas = document.createElement("canvas");
    this.qrsFlashCanvas.width = canvasWidth * devicePixelRatio;
    this.qrsFlashCanvas.height = canvasHeight * devicePixelRatio;
    this.qrsFlashCanvas.style.width = canvasWidth + "px";
    this.qrsFlashCanvas.style.height = canvasHeight + "px";
    this.qrsFlashCanvas.style.display = "block";
    this.qrsFlashCanvas.style.marginTop = `-${canvasHeight}px`; // Overlap the waveform canvas
    this.qrsFlashCanvas.style.pointerEvents = "none"; // Allow clicks to pass through
    container.appendChild(this.qrsFlashCanvas);
    
    this.qrsFlashContext = this.qrsFlashCanvas.getContext("2d");
    this.qrsFlashContext.scale(devicePixelRatio, devicePixelRatio);
    
    // Create calipers canvas for measurements (top layer)
    this.calipersCanvas = document.createElement("canvas");
    this.calipersCanvas.width = canvasWidth * devicePixelRatio;
    this.calipersCanvas.height = canvasHeight * devicePixelRatio;
    this.calipersCanvas.style.width = canvasWidth + "px";
    this.calipersCanvas.style.height = canvasHeight + "px";
    this.calipersCanvas.style.display = "block";
    this.calipersCanvas.style.marginTop = `-${canvasHeight}px`; // Overlap the QRS flash canvas
    this.calipersCanvas.style.pointerEvents = "none"; // Will be updated based on calipers state
    this.calipersCanvas.style.cursor = "default";
    container.appendChild(this.calipersCanvas);
    
    this.calipersContext = this.calipersCanvas.getContext("2d");
    this.calipersContext.scale(devicePixelRatio, devicePixelRatio);
    
    // Store canvas references in the machine context for easy access
    this.actor.send({
      type: 'UPDATE_CANVAS_REFS',
      canvasRefs: {
        backgroundCanvas: this.backgroundCanvas,
        backgroundContext: this.backgroundContext,
        waveformCanvas: this.waveformCanvas,
        waveformContext: this.waveformContext,
        qrsFlashCanvas: this.qrsFlashCanvas,
        qrsFlashContext: this.qrsFlashContext,
        calipersCanvas: this.calipersCanvas,
        calipersContext: this.calipersContext,
      }
    });
    
    console.log('Canvas layers initialized:', {
      width: canvasWidth,
      height: canvasHeight,
      devicePixelRatio,
      layers: ['background', 'waveform', 'qrsFlash', 'calipers']
    });
  },
  
  calculateCanvasDimensions() {
    // Get the container for size calculations
    const container = this.el.querySelector("[data-ecg-chart]");
    if (!container) {
      console.error('ECG chart container not found for dimension calculation');
      return;
    }
    
    // Get current display mode from state machine
    const currentState = this.actor?.getSnapshot();
    const displayMode = currentState?.value?.display || 'single';
    const heightScale = currentState?.context?.display?.heightScale || 1;
    
    // Calculate chart width (allow some flexibility based on container)
    const containerWidth = container.clientWidth || 800; // fallback to 800px
    this.chartWidth = Math.max(containerWidth - 20, 600); // minimum 600px width
    
    // Calculate height based on display mode and medical standards
    const ROWS_PER_DISPLAY = 3; // for multi-lead display
    if (displayMode === "multi") {
      this.canvasHeight = ROWS_PER_DISPLAY * ((CHART_HEIGHT * heightScale) / MULTI_LEAD_HEIGHT_SCALE);
      this.leadHeight = (CHART_HEIGHT * heightScale) / MULTI_LEAD_HEIGHT_SCALE;
    } else {
      this.canvasHeight = CHART_HEIGHT * heightScale;
      this.leadHeight = CHART_HEIGHT * heightScale;
    }
  },

  calculateMedicallyAccurateDimensions() {
    // Calculate dimensions based on medical standards (25mm/sec, 10mm/mV)
    this.calculateCanvasDimensions();
    
    // Get current state for scale factors
    const currentState = this.actor?.getSnapshot();
    const context = currentState?.context;
    
    // Apply scaling factors from state machine context
    if (context?.display) {
      const { gridScale, amplitudeScale, heightScale } = context.display;
      
      // Medical standard calculations
      this.pixelsPerMillisecond = (MM_PER_SECOND * PIXELS_PER_MM * gridScale) / 1000;
      this.pixelsPerMillivolt = MM_PER_MILLIVOLT * PIXELS_PER_MM * amplitudeScale;
      
      // Time-based calculations
      this.widthSeconds = DEFAULT_WIDTH_SECONDS * (2 / gridScale); // Adjust visible timespan
      this.totalPixelsWidth = this.widthSeconds * MM_PER_SECOND * PIXELS_PER_MM * gridScale;
      
      // Update chart dimensions if they need recalculation
      if (heightScale !== 1) {
        this.calculateCanvasDimensions();
      }
    } else {
      // Fallback to default medical standards
      this.pixelsPerMillisecond = (MM_PER_SECOND * PIXELS_PER_MM) / 1000;
      this.pixelsPerMillivolt = MM_PER_MILLIVOLT * PIXELS_PER_MM;
      this.widthSeconds = DEFAULT_WIDTH_SECONDS;
      this.totalPixelsWidth = this.widthSeconds * MM_PER_SECOND * PIXELS_PER_MM;
    }
    
    console.log('Medical dimensions calculated:', {
      chartWidth: this.chartWidth,
      canvasHeight: this.canvasHeight,
      leadHeight: this.leadHeight,
      pixelsPerMs: this.pixelsPerMillisecond,
      pixelsPerMv: this.pixelsPerMillivolt,
      widthSeconds: this.widthSeconds
    });
  },

  cleanupCanvases() {
    // Remove existing canvas elements if they exist
    const canvases = [
      'backgroundCanvas', 'waveformCanvas', 'qrsFlashCanvas', 'calipersCanvas'
    ];
    
    canvases.forEach(canvasName => {
      if (this[canvasName]) {
        // Remove from DOM
        if (this[canvasName].parentNode) {
          this[canvasName].parentNode.removeChild(this[canvasName]);
        }
        // Clear reference
        this[canvasName] = null;
        // Clear corresponding context
        const contextName = canvasName.replace('Canvas', 'Context');
        this[contextName] = null;
      }
    });
  },
  
  updateThemeColors() {
    // Detect current theme from document data attribute
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const isDark = theme === "dark";

    // Define theme-specific colors for canvas rendering
    this.colors = {
      waveform: isDark ? "#ffffff" : "#000000",
      gridFine: isDark ? "#660000" : "#ff9999",
      gridBold: isDark ? "#990000" : "#ff6666",
      gridDots: isDark ? "#666666" : "#999999",
      labels: isDark ? "#ffffff" : "#333333",
      background: isDark ? "#1a1a1a" : "#ffffff",
      cursor: isDark ? "#ff4444" : "#0066cc",
      calipers: isDark ? "#00ff00" : "#009900",
      qrsFlash: isDark ? "#ffff00" : "#ff8800",
    };

    console.log('Theme colors updated:', {
      theme,
      isDark,
      colors: this.colors
    });
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
    // Clean up canvas elements
    this.cleanupCanvases();
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