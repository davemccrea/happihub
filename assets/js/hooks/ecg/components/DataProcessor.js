
import { action } from "mobx";

const HEIGHT_MILLIVOLTS = 2.5;
const SEGMENT_DURATION_SECONDS = 0.1; // Pre-computed data segment size for performance

class DataProcessor {
  constructor(store) {
    this.store = store;
  }

  // Method to be called after data is processed to set up UI
  setupUIAfterDataLoad() {
    // This can be extended to trigger UI updates after data loading
    console.log("Data processing complete - UI can be updated");
  }

  process(data) {
    try {
      if (!data.fs || !data.sig_name || !data.p_signal) {
        console.error("Invalid ECG data format:", data);
        return;
      }

      action(() => {
        this.store.resetPlayback();

        this.store.samplingRate = data.fs;
        this.store.leadNames = data.sig_name;
        this.store.totalDuration = data.p_signal.length / data.fs;

        this.store.qrsIndexes = data.qrs || [];
        this.store.qrsTimestamps = this.store.qrsIndexes.map(
          (index) => index / this.store.samplingRate
        );
        this.store.lastQrsIndex = -1;
        this.store.qrsDetectedCount = 0;

        this.store.ecgLeadDatasets = [];

        let globalMin = Infinity;
        let globalMax = -Infinity;

        for (let leadIndex = 0; leadIndex < this.store.leadNames.length; leadIndex++) {
          const times = [];
          const values = [];

          for (
            let sampleIndex = 0;
            sampleIndex < data.p_signal.length;
            sampleIndex++
          ) {
            const time = sampleIndex / this.store.samplingRate;
            const value = data.p_signal[sampleIndex][leadIndex];

            times.push(time);
            values.push(value);

            if (value < globalMin) globalMin = value;
            if (value > globalMax) globalMax = value;
          }

          this.store.ecgLeadDatasets.push({ times, values });
        }

        this.store.yMin = -HEIGHT_MILLIVOLTS / 2;
        this.store.yMax = HEIGHT_MILLIVOLTS / 2;
        this.store.currentLeadData = this.store.ecgLeadDatasets[this.store.currentLead];

        this.precomputeDataSegments();

        console.log("ECG data loaded successfully:", {
          samplingRate: this.store.samplingRate,
          leadNames: this.store.leadNames,
          totalDuration: this.store.totalDuration,
          leadCount: this.store.ecgLeadDatasets.length,
          qrsCount: this.store.qrsIndexes.length,
        });

        // Trigger UI setup after data is loaded
        this.setupUIAfterDataLoad();
      })();
    } catch (error) {
      console.error("Error processing ECG data:", error);
    }
  }

  precomputeDataSegments() {
    this.store.precomputedSegments.clear();
    this.store.dataIndexCache.clear();

    if (!this.store.ecgLeadDatasets || this.store.ecgLeadDatasets.length === 0) {
      return;
    }

    for (
      let leadIndex = 0;
      leadIndex < this.store.ecgLeadDatasets.length;
      leadIndex++
    ) {
      const leadData = this.store.ecgLeadDatasets[leadIndex];
      const leadSegments = new Map();

      for (
        let time = 0;
        time < this.store.totalDuration;
        time += SEGMENT_DURATION_SECONDS
      ) {
        const segmentKey = Math.floor(time / SEGMENT_DURATION_SECONDS);
        const startTime = segmentKey * SEGMENT_DURATION_SECONDS;
        const endTime = Math.min(
          startTime + SEGMENT_DURATION_SECONDS,
          this.store.totalDuration
        );

        const startIndex = this.calculateDataIndexForTime(leadData, startTime);
        const endIndex = this.calculateDataIndexForTime(leadData, endTime);

        if (endIndex >= startIndex && startIndex < leadData.times.length) {
          const times = leadData.times.slice(startIndex, endIndex + 1);
          const values = leadData.values.slice(startIndex, endIndex + 1);

          leadSegments.set(segmentKey, {
            times: times.map((t) => t - startTime),
            values: values,
            originalStartTime: startTime,
          });
        }
      }

      this.store.precomputedSegments.set(leadIndex, leadSegments);
    }
  }

  calculateDataIndexForTime(leadData, targetTime) {
    if (!leadData || !leadData.times || leadData.times.length === 0) {
      console.warn("Invalid lead data provided to calculateDataIndexForTime");
      return 0;
    }

    if (typeof targetTime !== "number" || targetTime < 0) {
      console.warn(`Invalid target time: ${targetTime}`);
      return 0;
    }

    if (!this.store.samplingRate || this.store.samplingRate <= 0) {
      console.warn(`Invalid sampling rate: ${this.store.samplingRate}`);
      return 0;
    }

    const estimatedIndex = Math.round(targetTime * this.store.samplingRate);
    return Math.min(estimatedIndex, leadData.times.length - 1);
  }
}

export default DataProcessor;
