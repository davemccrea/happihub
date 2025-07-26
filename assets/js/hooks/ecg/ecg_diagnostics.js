// @ts-check

const MEMORY_UPDATE_INTERVAL_MS = 2000;

export class ECGDiagnostics {
  /**
   * @param {any} ecgPlayer - The ECG player instance
   */
  constructor(ecgPlayer) {
    /** @type {any} */
    this.ecgPlayer = ecgPlayer;
    /** @type {boolean} */
    this.showDiagnostics = false;
    /** @type {Object} */
    this.memory = {};
    /** @type {Object} */
    this.lastDynamicData = {};
    /** @type {number|null} */
    this.memoryInterval = null;
  }

  /**
   * Asynchronously measures and updates memory usage statistics
   * @returns {Promise<void>}
   */
  async updateMemory() {
    if (
      window.crossOriginIsolated &&
      "measureUserAgentSpecificMemory" in performance
    ) {
      try {
        const measurement = await /** @type {any} */ (
          performance
        ).measureUserAgentSpecificMemory();
        this.memory = {
          usedJSHeapSize: measurement.bytes,
        };
      } catch (error) {
        this.memory = { error: "Measurement failed" };
      }
    } else if ("memory" in performance) {
      const perfMemory = /** @type {any} */ (performance).memory;
      this.memory = {
        usedJSHeapSize: perfMemory.usedJSHeapSize,
        totalJSHeapSize: perfMemory.totalJSHeapSize,
        jsHeapSizeLimit: perfMemory.jsHeapSizeLimit,
      };
    } else {
      this.memory = { error: "Not supported" };
    }
    this.render();
  }

  /**
   * Creates the diagnostics panel in the DOM
   * @returns {void}
   */
  createDebugPanel() {
    const existingPanel = document.getElementById("diagnostics-panel");
    if (existingPanel) return;

    const panel = document.createElement("div");
    panel.id = "diagnostics-panel";
    panel.className =
      "mt-4 mb-4 p-4 bg-base-200 rounded-lg text-sm font-mono grid grid-cols-3 justify-start gap-4";
    panel.innerHTML = `
      <div id="diagnostics-col1" class="col-span-1"></div>
      <div id="diagnostics-col2" class="col-span-1"></div>
      <div id="diagnostics-col3" class="col-span-1"></div>
    `;

    const chartContainer = this.ecgPlayer.el.querySelector("[data-ecg-chart]");
    this.ecgPlayer.el.insertBefore(panel, chartContainer);
  }

  /**
   * Removes the diagnostics panel from the DOM
   * @returns {void}
   */
  removeDebugPanel() {
    const panel = document.getElementById("diagnostics-panel");
    if (panel) {
      panel.remove();
    }
  }

  /**
   * Renders the diagnostics panel with current data
   * @param {Object} [dynamicData=this.lastDynamicData] - Dynamic data to display
   * @returns {void}
   */
  render(dynamicData = this.lastDynamicData) {
    if (!this.showDiagnostics) return;

    const col1 = document.querySelector("#diagnostics-col1");
    const col2 = document.querySelector("#diagnostics-col2");
    const col3 = document.querySelector("#diagnostics-col3");

    if (!col1 || !col2 || !col3) return;

    const groupsCol1 = {
      Configuration: {
        displayMode: this.ecgPlayer.displayMode,
        gridType: this.ecgPlayer.gridType,
      },
      "ECG Paper Standards": {
        mmPerSecond: (25 * this.ecgPlayer.gridScale).toFixed(1),
        mmPerMillivolt: (10 * this.ecgPlayer.amplitudeScale).toFixed(1),
        pixelsPerMm: (6 * this.ecgPlayer.gridScale).toFixed(1),
      },
    };

    const groupsCol2 = {
      "Data & Dimensions": {
        chartWidth: this.ecgPlayer.chartWidth,
        widthSeconds: this.ecgPlayer.widthSeconds,
        totalDuration: this.ecgPlayer.totalDuration,
        samplingRate: this.ecgPlayer.samplingRate,
        totalSegments:
          this.ecgPlayer.precomputedSegments.get(this.ecgPlayer.currentLead)
            ?.size || 0,
      },
    };

    if (this.memory) {
      const memoryData = {};
      if (this.memory.error) {
        memoryData.status = this.memory.error;
      } else {
        if (this.memory.usedJSHeapSize) {
          memoryData.usedJSHeapSize = `${(this.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`;
        }
        if (this.memory.totalJSHeapSize) {
          memoryData.totalJSHeapSize = `${(this.memory.totalJSHeapSize / 1048576).toFixed(2)} MB`;
        }
        if (this.memory.jsHeapSizeLimit) {
          memoryData.jsHeapSizeLimit = `${(this.memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`;
        }
      }
      groupsCol2["Memory"] = memoryData;
    }

    const groupsCol3 = {
      "Playback & Animation": {
        isPlaying: this.ecgPlayer.isPlaying,
        currentLead: this.ecgPlayer.leadNames
          ? this.ecgPlayer.leadNames[this.ecgPlayer.currentLead]
          : "N/A",
        animationCycle: dynamicData.animationCycle,
        elapsedTime: dynamicData.elapsedTime,
        cursorProgress: dynamicData.cursorProgress,
        cursorPosition: dynamicData.cursorPosition,
        localCursorPosition:
          this.ecgPlayer.displayMode === "multi"
            ? dynamicData.localCursorPosition
            : null,
      },
      "QRS Detection": {
        totalQrsCount: this.ecgPlayer.qrsIndexes
          ? this.ecgPlayer.qrsIndexes.length
          : 0,
        detectedCount: this.ecgPlayer.qrsDetectedCount || 0,
      },
      "Real-time Rendering": {
        activeSegments: this.ecgPlayer.activeSegments.length,
        activePoints: dynamicData.activePoints,
        totalActiveLeads: dynamicData.totalActiveLeads,
        activePointsPerLead: dynamicData.activePointsPerLead,
      },
    };

    const units = {
      chartWidth: "px",
      widthSeconds: "s",
      totalDuration: "s",
      samplingRate: "Hz",
      elapsedTime: "s",
      cursorPosition: "px",
      localCursorPosition: "px",
      mmPerSecond: "mm/s",
      mmPerMillivolt: "mm/mV",
      pixelsPerMm: "px/mm",
    };

    const formatGrouped = (groups) => {
      return Object.entries(groups)
        .map(([groupName, values]) => {
          const valueHTML = Object.entries(values)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => {
              let displayValue;
              if (key === "cursorProgress") {
                displayValue = `${((value || 0) * 100).toFixed(0)}%`;
              } else if (
                typeof value === "string" &&
                (value.endsWith("MB") || !isNaN(parseFloat(value)))
              ) {
                displayValue = value;
              } else if (typeof value === "number") {
                displayValue = `${value.toFixed(2)}${units[key] ? ` ${units[key]}` : ""}`;
              } else {
                displayValue = value;
              }
              return `<div><strong class="opacity-70">${key}:</strong> ${displayValue}</div>`;
            })
            .join("");

          if (valueHTML.trim() === "") return "";

          return `
            <div class="mt-4">
              <h4 class="font-bold text-xs uppercase tracking-wider">${groupName}</h4>
              ${valueHTML}
            </div>
          `;
        })
        .join("");
    };

    col1.innerHTML = formatGrouped(groupsCol1);
    col2.innerHTML = formatGrouped(groupsCol2);
    col3.innerHTML = formatGrouped(groupsCol3);
  }

  /**
   * Captures animation metrics and updates the display
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} cursorProgress - Progress of cursor as a percentage (0-1)
   * @param {number} animationCycle - Current animation cycle number
   * @returns {void}
   */
  captureMetrics(elapsedTime, cursorProgress, animationCycle) {
    if (!this.showDiagnostics) return;

    let segmentsInfo = {};
    if (this.ecgPlayer.displayMode === "single") {
      segmentsInfo = {
        activePoints: this.ecgPlayer.activeCursorData?.values.length || 0,
      };
    } else {
      segmentsInfo = {
        activePointsPerLead:
          this.ecgPlayer.allLeadsCursorData?.[0]?.values.length || 0,
        totalActiveLeads: this.ecgPlayer.allLeadsCursorData?.length || 0,
      };
    }

    this.lastDynamicData = {
      elapsedTime,
      cursorProgress,
      animationCycle,
      cursorPosition: this.ecgPlayer.cursorPosition,
      ...segmentsInfo,
    };
    this.render();
  }

  /**
   * Toggles the visibility of the diagnostics panel
   * @param {boolean} enabled - Whether to show or hide the panel
   * @returns {void}
   */
  toggle(enabled) {
    this.showDiagnostics = enabled;

    if (enabled) {
      this.createDebugPanel();
      this.render();
      if (!this.memoryInterval) {
        this.memoryInterval = setInterval(
          () => this.updateMemory(),
          MEMORY_UPDATE_INTERVAL_MS,
        );
      }
    } else {
      this.removeDebugPanel();
      if (this.memoryInterval) {
        clearInterval(this.memoryInterval);
        this.memoryInterval = null;
      }
    }
  }

  /**
   * Cleans up resources and removes the panel
   * @returns {void}
   */
  cleanup() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    this.removeDebugPanel();
  }
}
