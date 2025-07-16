import { describe, it, expect, beforeEach, vi } from 'vitest';
import ECGPlayer from '../../js/hooks/ecg/ecg_player.js';

describe('ECGPlayer - Data Processing', () => {
  let ecgPlayer;

  beforeEach(() => {
    ecgPlayer = Object.create(ECGPlayer);
    ecgPlayer.handleEvent = vi.fn();
    ecgPlayer.samplingRate = 500;
    ecgPlayer.widthSeconds = 2.5;
    ecgPlayer.amplitudeScale = 1.0;
    ecgPlayer.yMin = -1.25;
    ecgPlayer.yMax = 1.25;
  });

  describe('calculateDataIndexForTime()', () => {
    it('should calculate correct index for valid time', () => {
      const leadData = {
        times: [0, 0.002, 0.004, 0.006, 0.008, 0.01],
        values: [0, 0.1, 0.2, 0.3, 0.4, 0.5]
      };
      
      const index = ecgPlayer.calculateDataIndexForTime(leadData, 0.004);
      expect(index).toBe(2);
    });

    it('should handle edge cases gracefully', () => {
      const leadData = {
        times: [0, 0.002, 0.004],
        values: [0, 0.1, 0.2]
      };

      // Time beyond data range
      const index1 = ecgPlayer.calculateDataIndexForTime(leadData, 10);
      expect(index1).toBe(2); // Should return last valid index

      // Negative time
      const index2 = ecgPlayer.calculateDataIndexForTime(leadData, -1);
      expect(index2).toBe(0);

      // Zero time
      const index3 = ecgPlayer.calculateDataIndexForTime(leadData, 0);
      expect(index3).toBe(0);
    });

    it('should handle invalid input gracefully', () => {
      // Invalid lead data
      expect(ecgPlayer.calculateDataIndexForTime(null, 0.5)).toBe(0);
      expect(ecgPlayer.calculateDataIndexForTime({}, 0.5)).toBe(0);
      expect(ecgPlayer.calculateDataIndexForTime({ times: [], values: [] }, 0.5)).toBe(0);

      // Invalid time
      const leadData = { times: [0, 0.002], values: [0, 0.1] };
      expect(ecgPlayer.calculateDataIndexForTime(leadData, 'invalid')).toBe(0);
    });

    it('should handle invalid sampling rate', () => {
      ecgPlayer.samplingRate = 0;
      const leadData = { times: [0, 0.002], values: [0, 0.1] };
      expect(ecgPlayer.calculateDataIndexForTime(leadData, 0.5)).toBe(0);
    });
  });

  describe('transformCoordinates()', () => {
    it('should transform time/value data to screen coordinates', () => {
      const options = {
        times: [0, 0.5, 1.0],
        values: [0, 0.5, -0.5],
        bounds: { xOffset: 0, yOffset: 0, width: 100, height: 100 },
        timeSpan: 1.0
      };

      const coords = ecgPlayer.transformCoordinates(options);
      
      expect(coords).toHaveLength(3);
      expect(coords[0]).toEqual({ x: 0, y: 50 });    // (0,0) -> middle
      expect(coords[1]).toEqual({ x: 50, y: 30 });   // (0.5,0.5) -> right, up
      expect(coords[2]).toEqual({ x: 100, y: 70 });  // (1.0,-0.5) -> far right, down
    });

    it('should apply amplitude scaling', () => {
      ecgPlayer.amplitudeScale = 2.0;
      
      const options = {
        times: [0, 0.5],
        values: [0, 0.25],
        bounds: { xOffset: 0, yOffset: 0, width: 100, height: 100 },
        timeSpan: 1.0
      };

      const coords = ecgPlayer.transformCoordinates(options);
      
      // With 2x amplitude scale, 0.25 value becomes 0.5 effective value
      expect(coords[1]).toEqual({ x: 50, y: 30 });
    });

    it('should handle offset bounds correctly', () => {
      const options = {
        times: [0, 0.5],
        values: [0, 0],
        bounds: { xOffset: 10, yOffset: 20, width: 100, height: 100 },
        timeSpan: 1.0
      };

      const coords = ecgPlayer.transformCoordinates(options);
      
      expect(coords[0]).toEqual({ x: 10, y: 70 });  // Applied offset
      expect(coords[1]).toEqual({ x: 60, y: 70 });  // Applied offset
    });

    it('should handle invalid input gracefully', () => {
      expect(ecgPlayer.transformCoordinates(null)).toEqual([]);
      expect(ecgPlayer.transformCoordinates({})).toEqual([]);
      
      const invalidOptions = {
        times: [0, 1],
        values: [0], // Mismatched length
        bounds: { xOffset: 0, yOffset: 0, width: 100, height: 100 },
        timeSpan: 1.0
      };
      
      expect(ecgPlayer.transformCoordinates(invalidOptions)).toEqual([]);
    });
  });

  describe('handleECGDataLoaded()', () => {
    beforeEach(() => {
      ecgPlayer.stopAnimation = vi.fn();
      ecgPlayer.resetPlayback = vi.fn();
      ecgPlayer.precomputeDataSegments = vi.fn();
      ecgPlayer.renderGridBackground = vi.fn();
      ecgPlayer.clearWaveform = vi.fn();
      ecgPlayer.setupPlayPauseButton = vi.fn();
      ecgPlayer.updatePlayPauseButton = vi.fn();
      ecgPlayer.setupSelectors = vi.fn();
      ecgPlayer.updateLeadSelectorVisibility = vi.fn();
      ecgPlayer.displayMode = 'single';
    });

    it('should process valid ECG data correctly', () => {
      const payload = {
        data: {
          fs: 500,
          sig_name: ['I', 'II', 'V1'],
          p_signal: [
            [0.1, 0.2, 0.3],
            [0.4, 0.5, 0.6],
            [0.7, 0.8, 0.9]
          ],
          qrs: [250, 750, 1250]
        }
      };

      ecgPlayer.handleECGDataLoaded(payload);

      expect(ecgPlayer.samplingRate).toBe(500);
      expect(ecgPlayer.leadNames).toEqual(['I', 'II', 'V1']);
      expect(ecgPlayer.totalDuration).toBe(3 / 500); // 3 samples / 500 Hz
      expect(ecgPlayer.ecgLeadDatasets).toHaveLength(3);
      expect(ecgPlayer.qrsIndexes).toEqual([250, 750, 1250]);
      expect(ecgPlayer.qrsTimestamps).toEqual([0.5, 1.5, 2.5]);
    });

    it('should handle missing QRS data gracefully', () => {
      const payload = {
        data: {
          fs: 500,
          sig_name: ['I'],
          p_signal: [[0.1], [0.2]]
          // No qrs field
        }
      };

      ecgPlayer.handleECGDataLoaded(payload);

      expect(ecgPlayer.qrsIndexes).toEqual([]);
      expect(ecgPlayer.qrsTimestamps).toEqual([]);
    });

    it('should reject invalid ECG data', () => {
      const invalidPayloads = [
        { data: null },
        { data: {} },
        { data: { fs: 500 } }, // Missing sig_name and p_signal
        { data: { sig_name: ['I'] } }, // Missing fs and p_signal
        { data: { p_signal: [[0.1]] } } // Missing fs and sig_name
      ];

      invalidPayloads.forEach(payload => {
        expect(() => ecgPlayer.handleECGDataLoaded(payload)).not.toThrow();
        // Should not crash but should log error
      });
    });

    it('should reset playback state when loading new data', () => {
      const payload = {
        data: {
          fs: 500,
          sig_name: ['I'],
          p_signal: [[0.1], [0.2]]
        }
      };

      ecgPlayer.handleECGDataLoaded(payload);

      expect(ecgPlayer.stopAnimation).toHaveBeenCalled();
      expect(ecgPlayer.resetPlayback).toHaveBeenCalled();
    });

    it('should initialize QRS tracking state', () => {
      const payload = {
        data: {
          fs: 500,
          sig_name: ['I'],
          p_signal: [[0.1], [0.2]],
          qrs: [250]
        }
      };

      ecgPlayer.handleECGDataLoaded(payload);

      expect(ecgPlayer.lastQrsIndex).toBe(-1);
      expect(ecgPlayer.qrsDetectedCount).toBe(0);
    });

    it('should set up UI components after data loading', () => {
      const payload = {
        data: {
          fs: 500,
          sig_name: ['I'],
          p_signal: [[0.1], [0.2]]
        }
      };

      ecgPlayer.handleECGDataLoaded(payload);

      expect(ecgPlayer.setupPlayPauseButton).toHaveBeenCalled();
      expect(ecgPlayer.updatePlayPauseButton).toHaveBeenCalled();
      expect(ecgPlayer.setupSelectors).toHaveBeenCalled();
      expect(ecgPlayer.updateLeadSelectorVisibility).toHaveBeenCalledWith('single');
    });
  });

  describe('precomputeDataSegments()', () => {
    beforeEach(() => {
      ecgPlayer.precomputedSegments = new Map();
      ecgPlayer.dataIndexCache = new Map();
      ecgPlayer.segmentDuration = 0.1;
      ecgPlayer.totalDuration = 1.0;
      ecgPlayer.calculateDataIndexForTime = vi.fn();
    });

    it('should precompute segments for all leads', () => {
      ecgPlayer.ecgLeadDatasets = [
        { times: [0, 0.05, 0.1, 0.15, 0.2], values: [0, 0.1, 0.2, 0.3, 0.4] },
        { times: [0, 0.05, 0.1, 0.15, 0.2], values: [0, 0.2, 0.4, 0.6, 0.8] }
      ];

      ecgPlayer.calculateDataIndexForTime
        .mockReturnValueOnce(0)  // start index for first segment
        .mockReturnValueOnce(1)  // end index for first segment
        .mockReturnValueOnce(1)  // start index for second segment
        .mockReturnValueOnce(2); // end index for second segment

      ecgPlayer.precomputeDataSegments();

      expect(ecgPlayer.precomputedSegments.size).toBe(2); // Two leads
      expect(ecgPlayer.precomputedSegments.has(0)).toBe(true);
      expect(ecgPlayer.precomputedSegments.has(1)).toBe(true);
    });

    it('should clear existing segments before precomputing', () => {
      ecgPlayer.precomputedSegments.set(0, new Map());
      ecgPlayer.dataIndexCache.set('test', 123);

      ecgPlayer.ecgLeadDatasets = [];
      ecgPlayer.precomputeDataSegments();

      expect(ecgPlayer.precomputedSegments.size).toBe(0);
      expect(ecgPlayer.dataIndexCache.size).toBe(0);
    });

    it('should handle empty datasets gracefully', () => {
      ecgPlayer.ecgLeadDatasets = [];
      ecgPlayer.precomputeDataSegments();

      expect(ecgPlayer.precomputedSegments.size).toBe(0);
    });
  });

  describe('getSegmentsForTimeRange()', () => {
    beforeEach(() => {
      ecgPlayer.precomputedSegments = new Map();
      ecgPlayer.segmentDuration = 0.1;
      
      // Mock precomputed segments
      const leadSegments = new Map();
      leadSegments.set(0, { times: [0, 0.05], values: [0, 0.1], originalStartTime: 0 });
      leadSegments.set(1, { times: [0, 0.05], values: [0.1, 0.2], originalStartTime: 0.1 });
      leadSegments.set(2, { times: [0, 0.05], values: [0.2, 0.3], originalStartTime: 0.2 });
      
      ecgPlayer.precomputedSegments.set(0, leadSegments);
    });

    it('should return segments within time range', () => {
      const segments = ecgPlayer.getSegmentsForTimeRange(0, 0.05, 0.15);
      
      expect(segments).toHaveLength(2);
      expect(segments[0].originalStartTime).toBe(0);
      expect(segments[1].originalStartTime).toBe(0.1);
    });

    it('should return empty array for invalid lead', () => {
      const segments = ecgPlayer.getSegmentsForTimeRange(999, 0, 0.1);
      expect(segments).toEqual([]);
    });

    it('should handle time range with no segments', () => {
      const segments = ecgPlayer.getSegmentsForTimeRange(0, 5.0, 6.0);
      expect(segments).toEqual([]);
    });

    it('should return single segment for exact match', () => {
      const segments = ecgPlayer.getSegmentsForTimeRange(0, 0.1, 0.1);
      expect(segments).toHaveLength(1);
      expect(segments[0].originalStartTime).toBe(0.1);
    });
  });
});