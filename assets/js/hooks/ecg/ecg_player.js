import ECGStore from "./stores/ECGStore";
import Renderer from "./components/Renderer";
import DataProcessor from "./components/DataProcessor";
import UIBinder from "./components/UIBinder";
import CaliperController from "./components/CaliperController";
import { reaction } from "mobx";

const ECGPlayer = {
  mounted() {
    // Get the target for push events (component ID)
    this.targetComponent = this.el.getAttribute("phx-target");

    this.store = new ECGStore();
    
    // Initialize form values before setting up other components
    this.store.initializeFormValues();

    this.dataProcessor = new DataProcessor(this.store);
    this.renderer = new Renderer(this.el, this.store);
    
    // Set renderer reference in store for cleanup operations
    this.store.setRenderer(this.renderer);

    this.ui = new UIBinder(this.el, this.store, this.targetComponent, this.renderer);
    this.ui.setupAllListeners();

    this.caliperController = new CaliperController(
      this.el,
      this.store,
      this.renderer.calipersCanvas
    );

    this.handleEvent("load_ecg_data", (payload) => {
      this.dataProcessor.process(payload.data);
      // UI controls will be updated automatically by reactions
    });

    this.setupReactions();
  },

  setupReactions() {
    // Handle changes that require canvas recreation (dimensions change)
    reaction(
      () => {
        return {
          gridScale: this.store.gridScale,
          displayMode: this.store.displayMode,
          heightScale: this.store.heightScale,
        };
      },
      (changes) => {
        console.log('🔧 ECGPlayer canvas recreation reaction triggered', {
          changes,
          isFullscreen: this.store.isFullscreen,
          storeState: {
            isPlaying: this.store.isPlaying,
            startTime: this.store.startTime,
            pausedTime: this.store.pausedTime
          }
        });
        
        this.store.withCanvasStatePreservation(() => {
          console.log('🔧 ECGPlayer dimensions reaction - recreating canvas');
          this.renderer.recreateCanvas();
          console.log('🔧 ECGPlayer dimensions reaction - rendering grid background');
          this.renderer.renderGridBackground();
        });
        console.log('🔧 ECGPlayer canvas recreation reaction completed');
      }
    );

    // Handle fullscreen changes separately to ensure proper waveform preservation
    reaction(
      () => this.store.isFullscreen,
      (isFullscreen) => {
        console.log('🎆 ECGPlayer fullscreen reaction triggered', {
          isFullscreen,
          storeState: {
            isPlaying: this.store.isPlaying,
            startTime: this.store.startTime,
            pausedTime: this.store.pausedTime,
            currentLead: this.store.currentLead
          }
        });
        
        // Use the canvas state preservation wrapper which handles the full lifecycle
        console.log('🎆 ECGPlayer calling withCanvasStatePreservation for fullscreen change');
        this.store.withCanvasStatePreservation(() => {
          console.log('🎆 ECGPlayer fullscreen reaction - recreating canvas');
          this.renderer.recreateCanvas();
          console.log('🎆 ECGPlayer fullscreen reaction - rendering grid background');
          this.renderer.renderGridBackground();
        });
        console.log('🎆 ECGPlayer fullscreen reaction completed');
      }
    );

    // Handle grid type changes (only re-render background, preserve waveform)
    reaction(
      () => this.store.gridType,
      () => {
        this.renderer.renderGridBackground();
        // Don't recreate canvas or clear waveform - just update the grid
      }
    );

    // Re-render grid background when current lead changes (for label update)
    reaction(
      () => this.store.currentLead,
      () => {
        this.renderer.renderGridBackground();
      }
    );

    // Re-render grid background when lead names become available after data loading
    reaction(
      () => this.store.leadNames,
      (leadNames) => {
        if (leadNames && leadNames.length > 0) {
          this.renderer.renderGridBackground();
        }
      }
    );

    // The main animation loop
    reaction(
      () => this.store.isPlaying,
      (isPlaying) => {
        console.log('🎨 ECGPlayer animation loop reaction triggered', {
          isPlaying,
          isFullscreen: this.store.isFullscreen,
          hasAnimationId: !!this.animationId
        });
        
        if (isPlaying) {
          console.log('🎨 ECGPlayer starting animation loop');
          this.startAnimationLoop();
        } else {
          console.log('🎨 ECGPlayer stopping animation');
          this.stopAnimation();
        }
      }
    );

    // Re-render current frame when paused and lead switches
    reaction(
      () => ({ currentLead: this.store.currentLead, isPlaying: this.store.isPlaying }),
      ({ currentLead, isPlaying }) => {
        console.log('🎬 ECGPlayer paused frame reaction triggered', {
          currentLead,
          isPlaying,
          hasStartTime: !!this.store.startTime,
          hasPausedTime: !!this.store.pausedTime,
          isFullscreen: this.store.isFullscreen
        });
        
        if (!isPlaying && this.store.startTime && this.store.pausedTime) {
          console.log('🎬 ECGPlayer paused frame reaction - re-rendering current frame');
          // Re-render the current frame for the new lead when paused
          this.store.renderCurrentFrame();
        } else {
          console.log('🎬 ECGPlayer paused frame reaction - conditions not met for re-render');
        }
      }
    );

    // Play/pause button updates are now handled by UIBinder autorun

    // Re-render current frame when amplitude scale changes
    reaction(
      () => this.store.amplitudeScale,
      () => {
        if (!this.store.isPlaying && this.store.startTime && this.store.pausedTime) {
          this.store.renderCurrentFrame();
        }
      }
    );

    // Update caliper interaction when calipers mode changes
    reaction(
      () => this.store.calipersMode,
      (calipersMode) => {
        this.caliperController.updateCalipersInteraction();
        
        // Clear calipers from canvas when mode is disabled
        if (!calipersMode) {
          this.caliperController.clearCalipers();
        }
      }
    );

    // Clear waveform when amplitude scale changes during animation
    reaction(
      () => this.store.amplitudeScale,
      () => {
        if (this.store.isPlaying) {
          // Clear waveform to re-render with new amplitude
          this.renderer.clearWaveform();
        }
      }
    );
  },

  startAnimationLoop() {
    const animate = () => {
      if (!this.store.isPlaying) return;

      const now = Date.now();
      if (!this.store.startTime) {
        this.store.initializeStartTime();
      }

      const elapsedTime = (now - this.store.startTime) / 1000;
      const cursorProgress =
        (elapsedTime % this.store.widthSeconds) / this.store.widthSeconds;
      const animationCycle = Math.floor(elapsedTime / this.store.widthSeconds);

      this.renderer.processAnimationFrame(cursorProgress, animationCycle);

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  },

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  },

  destroyed() {
    this.ui.cleanup();
    this.renderer.cleanup();
    this.caliperController.cleanup();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  },
};

export default ECGPlayer;
