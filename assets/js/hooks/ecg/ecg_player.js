import ECGStore from "./stores/ECGStore";
import Renderer from "./components/Renderer";
import DataProcessor from "./components/DataProcessor";
import UIBinder from "./components/UIBinder";
import CaliperController from "./components/CaliperController";
import { reaction } from "mobx";

/**
 * ECG Player Phoenix LiveView Hook
 * @typedef {Object} ECGPlayerHook
 * @property {Function} mounted - Called when hook is mounted
 * @property {Function} setupReactions - Sets up MobX reactions for component coordination
 * @property {Function} startAnimationLoop - Starts ECG animation loop
 * @property {Function} stopAnimation - Stops ECG animation
 * @property {Function} destroyed - Cleanup when hook is destroyed
 */

const ECGPlayer = {
  mounted() {
    this.targetComponent = this.el.getAttribute("phx-target");
    const chartContainer = this.el.querySelector("[data-ecg-chart]");

    this.store = new ECGStore(chartContainer);
    this.store.initializeFormValues();
    this.store.updateDimensionsFromDOM(); // Initial dimension calculation

    this.dataProcessor = new DataProcessor(this.store);
    this.renderer = new Renderer(this.el, this.store);
    this.ui = new UIBinder(this.el, this.store);
    this.ui.setupAllListeners();
    this.caliperController = new CaliperController(
      this.el,
      this.store,
      this.renderer.calipersCanvas
    );

    this.handleEvent("load_ecg_data", (payload) => {
      this.dataProcessor.process(payload.data);
    });

    this.setupReactions();
  },

  setupReactions() {
    reaction(
      () => ({
        width: this.store.chartWidth,
        height: this.store.heightScale,
        displayMode: this.store.displayMode,
      }),
      () => {
        this.renderer.recreateCanvas();
        // Update caliper controller with new canvas reference
        this.caliperController.updateCanvas(this.renderer.calipersCanvas);
        this.renderer.renderGridBackground();
        if (!this.store.isPlaying) {
          this.store.renderCurrentFrame();
        }
      }
    );

    reaction(
      () => ({
        gridType: this.store.gridType,
        currentLead: this.store.currentLead,
        leadNames: this.store.leadNames.length,
      }),
      (current, previous) => {
        if (previous && current.currentLead !== previous.currentLead) {
          this.renderer.clearWaveform();
        }
        this.renderer.renderGridBackground();
      }
    );

    reaction(
      () => this.ui.themeObserver, // A bit of a hack to react to theme changes via UIBinder
      () => {
        this.renderer.updateThemeColors();
        this.renderer.renderGridBackground();
        if (!this.store.isPlaying) {
          this.store.renderCurrentFrame();
        }
      }
    );

    reaction(
      () => this.store.isPlaying,
      (isPlaying) => {
        if (isPlaying) this.startAnimationLoop();
        else this.stopAnimation();
      }
    );

    reaction(
      () => this.store.pausedFrameData,
      (frameData) => {
        if (frameData && !this.store.isPlaying) {
          this.renderer.processAnimationFrame(
            frameData.progress,
            frameData.cycle
          );
        }
      }
    );

    reaction(
      () => ({
        currentLead: this.store.currentLead,
        amplitudeScale: this.store.amplitudeScale,
      }),
      () => {
        if (!this.store.isPlaying) this.store.renderCurrentFrame();
      }
    );

    reaction(
      () => this.store.calipersMode,
      (calipersMode) => {
        this.caliperController.updateCalipersInteraction();
        if (!calipersMode) this.caliperController.clearCalipers();
      }
    );

    reaction(
      () => this.store.amplitudeScale,
      () => {
        if (this.store.isPlaying) this.renderer.clearWaveform();
      }
    );

    reaction(
      () => this.store.qrsFlashActive,
      (isActive) => {
        if (!isActive) this.renderer.clearQrsFlashArea();
      }
    );
  },

  startAnimationLoop() {
    const animate = () => {
      if (!this.store.isPlaying) return;
      const now = Date.now();
      if (!this.store.startTime) this.store.initializeStartTime();
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
    if (this.animationId) cancelAnimationFrame(this.animationId);
  },
};

export default ECGPlayer;
