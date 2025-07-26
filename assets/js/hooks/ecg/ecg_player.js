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

    this.ui = new UIBinder(
      this.el,
      this.store,
      this.targetComponent,
      this.renderer
    );
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
    // Handle display mode changes, which require a full canvas recreation.
    reaction(
      () => this.store.displayMode,
      () => {
        this.renderer.recreateCanvas();
        this.renderer.renderGridBackground();
        if (!this.store.isPlaying && this.store.startTime) {
          this.store.renderCurrentFrame();
        }
      }
    );

    // Handle grid type changes (e.g. lines vs dots), which only require a background redraw.
    reaction(
      () => this.store.gridType,
      () => {
        this.renderer.renderGridBackground();
      }
    );

    // Re-render grid background when current lead changes to update the label.
    reaction(
      () => this.store.currentLead,
      () => {
        this.renderer.renderGridBackground();
      }
    );

    // Re-render grid background when lead names become available after data loading.
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
        if (isPlaying) {
          this.startAnimationLoop();
        } else {
          this.stopAnimation();
        }
      }
    );

    // Re-render the current frame when paused if relevant properties change
    reaction(
      () => ({
        currentLead: this.store.currentLead,
        amplitudeScale: this.store.amplitudeScale,
      }),
      () => {
        if (
          !this.store.isPlaying &&
          this.store.startTime &&
          this.store.pausedTime
        ) {
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