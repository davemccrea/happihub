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
      // Set up UI controls after data is loaded
      this.ui.updatePlayPauseButton();
    });

    this.setupReactions();
  },

  setupReactions() {
    // Redraw the grid when scale or type changes
    reaction(
      () => {
        console.log("reaction triggered");
        return {
          gridScale: this.store.gridScale,
          gridType: this.store.gridType,
          displayMode: this.store.displayMode,
          heightScale: this.store.heightScale,
        };
      },
      () => {
        this.renderer.recreateCanvas();
        this.renderer.renderGridBackground();
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
  },

  startAnimationLoop() {
    const animate = () => {
      if (!this.store.isPlaying) return;

      const now = Date.now();
      if (!this.store.startTime) {
        this.store.startTime = now;
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
