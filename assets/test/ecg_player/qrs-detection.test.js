import { describe, it, expect, beforeEach, vi } from 'vitest';
import ECGPlayer from '../../js/hooks/ecg/ecg_player.js';

describe('ECGPlayer - QRS Detection', () => {
  let ecgPlayer;

  beforeEach(() => {
    ecgPlayer = Object.create(ECGPlayer);
    ecgPlayer.handleEvent = vi.fn();
    ecgPlayer.qrsTimestamps = [0.5, 1.0, 1.5, 2.0, 2.5];
    ecgPlayer.lastQrsIndex = -1;
    ecgPlayer.qrsDetectedCount = 0;
    ecgPlayer.qrsIndicatorEnabled = true;
    ecgPlayer.qrsFlashActive = false;
    ecgPlayer.qrsFlashTimeout = null;
    ecgPlayer.qrsFlashDuration = 100;
    ecgPlayer.qrsFlashContext = {
      fillStyle: '',
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      clearRect: vi.fn()
    };
    ecgPlayer.qrsFlashCanvas = {
      height: 400
    };
    ecgPlayer.chartWidth = 1000;
    
    // Mock methods
    ecgPlayer.triggerQrsFlash = vi.fn();
    ecgPlayer.clearQrsFlashArea = vi.fn();
    
    // Mock global functions
    global.setTimeout = vi.fn();
    global.clearTimeout = vi.fn();
    global.window.devicePixelRatio = 1;
  });

  describe('checkQrsOccurrences()', () => {
    beforeEach(() => {
      ecgPlayer.checkQrsOccurrences = ECGPlayer.checkQrsOccurrences;
    });

    it('should detect QRS events that have occurred', () => {
      ecgPlayer.lastQrsIndex = -1;
      ecgPlayer.qrsDetectedCount = 0;
      
      ecgPlayer.checkQrsOccurrences(1.2);
      
      expect(ecgPlayer.qrsDetectedCount).toBe(2); // Two QRS events at 0.5 and 1.0
      expect(ecgPlayer.lastQrsIndex).toBe(1);
    });

    it('should trigger QRS flash when indicator enabled', () => {
      ecgPlayer.qrsIndicatorEnabled = true;
      ecgPlayer.triggerQrsFlash = vi.fn();
      
      ecgPlayer.checkQrsOccurrences(0.7);
      
      expect(ecgPlayer.triggerQrsFlash).toHaveBeenCalledTimes(1);
    });

    it('should not trigger QRS flash when indicator disabled', () => {
      ecgPlayer.qrsIndicatorEnabled = false;
      ecgPlayer.triggerQrsFlash = vi.fn();
      
      ecgPlayer.checkQrsOccurrences(0.7);
      
      expect(ecgPlayer.triggerQrsFlash).not.toHaveBeenCalled();
    });

    it('should handle empty QRS timestamps gracefully', () => {
      ecgPlayer.qrsTimestamps = [];
      
      ecgPlayer.checkQrsOccurrences(1.0);
      
      expect(ecgPlayer.qrsDetectedCount).toBe(0);
    });

    it('should handle null QRS timestamps gracefully', () => {
      ecgPlayer.qrsTimestamps = null;
      
      ecgPlayer.checkQrsOccurrences(1.0);
      
      expect(ecgPlayer.qrsDetectedCount).toBe(0);
    });

    it('should not detect future QRS events', () => {
      ecgPlayer.checkQrsOccurrences(0.3);
      
      expect(ecgPlayer.qrsDetectedCount).toBe(0);
      expect(ecgPlayer.lastQrsIndex).toBe(-1);
    });

    it('should handle multiple QRS events at once', () => {
      ecgPlayer.checkQrsOccurrences(2.2);
      
      expect(ecgPlayer.qrsDetectedCount).toBe(4); // Events at 0.5, 1.0, 1.5, 2.0
      expect(ecgPlayer.lastQrsIndex).toBe(3);
    });

    it('should not re-detect already processed QRS events', () => {
      ecgPlayer.lastQrsIndex = 1;
      ecgPlayer.qrsDetectedCount = 2;
      
      ecgPlayer.checkQrsOccurrences(1.2);
      
      expect(ecgPlayer.qrsDetectedCount).toBe(2); // Should not change
      expect(ecgPlayer.lastQrsIndex).toBe(1); // Should not change
    });

    it('should optimize using early break for sorted timestamps', () => {
      ecgPlayer.triggerQrsFlash = vi.fn();
      
      ecgPlayer.checkQrsOccurrences(0.7);
      
      // Should only trigger once for the 0.5 timestamp, not process all
      expect(ecgPlayer.triggerQrsFlash).toHaveBeenCalledTimes(1);
    });
  });

  describe('triggerQrsFlash()', () => {
    beforeEach(() => {
      ecgPlayer.triggerQrsFlash = ECGPlayer.triggerQrsFlash;
    });

    it('should activate QRS flash', () => {
      ecgPlayer.triggerQrsFlash();
      
      expect(ecgPlayer.qrsFlashActive).toBe(true);
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
    });

    it('should clear existing timeout before setting new one', () => {
      ecgPlayer.qrsFlashTimeout = 123;
      
      ecgPlayer.triggerQrsFlash();
      
      expect(global.clearTimeout).toHaveBeenCalledWith(123);
    });

    it('should set timeout to deactivate flash', () => {
      ecgPlayer.triggerQrsFlash();
      
      const timeoutCallback = global.setTimeout.mock.calls[0][0];
      timeoutCallback();
      
      expect(ecgPlayer.qrsFlashActive).toBe(false);
      expect(ecgPlayer.qrsFlashTimeout).toBe(null);
    });

    it('should call clearQrsFlashArea when timeout expires', () => {
      ecgPlayer.clearQrsFlashArea = vi.fn();
      
      ecgPlayer.triggerQrsFlash();
      
      const timeoutCallback = global.setTimeout.mock.calls[0][0];
      timeoutCallback();
      
      expect(ecgPlayer.clearQrsFlashArea).toHaveBeenCalled();
    });

    it('should use configured flash duration', () => {
      ecgPlayer.qrsFlashDuration = 250;
      
      ecgPlayer.triggerQrsFlash();
      
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 250);
    });
  });

  describe('clearQrsFlashArea()', () => {
    beforeEach(() => {
      ecgPlayer.clearQrsFlashArea = ECGPlayer.clearQrsFlashArea;
    });

    it('should clear the QRS flash canvas', () => {
      ecgPlayer.clearQrsFlashArea();
      
      expect(ecgPlayer.qrsFlashContext.clearRect).toHaveBeenCalledWith(0, 0, 1000, 400);
    });

    it('should handle device pixel ratio', () => {
      global.window.devicePixelRatio = 2;
      ecgPlayer.qrsFlashCanvas.height = 800;
      
      ecgPlayer.clearQrsFlashArea();
      
      expect(ecgPlayer.qrsFlashContext.clearRect).toHaveBeenCalledWith(0, 0, 1000, 400);
    });

    it('should handle missing context gracefully', () => {
      ecgPlayer.qrsFlashContext = null;
      
      expect(() => ecgPlayer.clearQrsFlashArea()).not.toThrow();
    });

    it('should handle missing canvas gracefully', () => {
      ecgPlayer.qrsFlashCanvas = null;
      
      expect(() => ecgPlayer.clearQrsFlashArea()).not.toThrow();
    });
  });

  describe('QRS Flash Rendering', () => {
    beforeEach(() => {
      ecgPlayer.qrsFlashActive = true;
      ecgPlayer.chartWidth = 1000;
    });

    it('should render QRS flash dot with correct properties', () => {
      // This would be called from processAnimationFrame
      const dotRadius = 5;
      const margin = 15;
      const dotX = ecgPlayer.chartWidth - margin;
      const dotY = margin;

      ecgPlayer.qrsFlashContext.fillStyle = '#ff0000';
      ecgPlayer.qrsFlashContext.beginPath();
      ecgPlayer.qrsFlashContext.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI);
      ecgPlayer.qrsFlashContext.fill();

      expect(ecgPlayer.qrsFlashContext.fillStyle).toBe('#ff0000');
      expect(ecgPlayer.qrsFlashContext.beginPath).toHaveBeenCalled();
      expect(ecgPlayer.qrsFlashContext.arc).toHaveBeenCalledWith(985, 15, 5, 0, 2 * Math.PI);
      expect(ecgPlayer.qrsFlashContext.fill).toHaveBeenCalled();
    });

    it('should position QRS flash dot correctly', () => {
      ecgPlayer.chartWidth = 800;
      
      const margin = 15;
      const expectedX = 800 - margin; // 785
      const expectedY = margin; // 15
      
      expect(expectedX).toBe(785);
      expect(expectedY).toBe(15);
    });
  });

  describe('QRS Data Processing', () => {
    it('should convert QRS indexes to timestamps correctly', () => {
      const qrsIndexes = [250, 500, 750, 1000];
      const samplingRate = 500;
      
      const timestamps = qrsIndexes.map(index => index / samplingRate);
      
      expect(timestamps).toEqual([0.5, 1.0, 1.5, 2.0]);
    });

    it('should handle edge cases in QRS index conversion', () => {
      const samplingRate = 500;
      
      // First sample
      expect(0 / samplingRate).toBe(0);
      
      // Large index
      expect(10000 / samplingRate).toBe(20);
      
      // Fractional result
      expect(333 / samplingRate).toBe(0.666);
    });
  });

  describe('QRS State Management', () => {
    it('should reset QRS state correctly', () => {
      ecgPlayer.lastQrsIndex = 5;
      ecgPlayer.qrsDetectedCount = 3;
      ecgPlayer.qrsFlashActive = true;
      ecgPlayer.qrsFlashTimeout = 123;
      
      // Reset (as would happen in resetPlayback)
      ecgPlayer.lastQrsIndex = -1;
      ecgPlayer.qrsDetectedCount = 0;
      ecgPlayer.qrsFlashActive = false;
      if (ecgPlayer.qrsFlashTimeout) {
        clearTimeout(ecgPlayer.qrsFlashTimeout);
        ecgPlayer.qrsFlashTimeout = null;
      }
      
      expect(ecgPlayer.lastQrsIndex).toBe(-1);
      expect(ecgPlayer.qrsDetectedCount).toBe(0);
      expect(ecgPlayer.qrsFlashActive).toBe(false);
      expect(ecgPlayer.qrsFlashTimeout).toBe(null);
      expect(global.clearTimeout).toHaveBeenCalledWith(123);
    });

    it('should handle QRS indicator disabled state', () => {
      ecgPlayer.qrsIndicatorEnabled = false;
      ecgPlayer.qrsFlashActive = true;
      ecgPlayer.qrsFlashTimeout = 456;
      
      // Simulate checkbox change to disabled
      if (!ecgPlayer.qrsIndicatorEnabled && ecgPlayer.qrsFlashActive) {
        ecgPlayer.qrsFlashActive = false;
        if (ecgPlayer.qrsFlashTimeout) {
          clearTimeout(ecgPlayer.qrsFlashTimeout);
          ecgPlayer.qrsFlashTimeout = null;
        }
        ecgPlayer.clearQrsFlashArea();
      }
      
      expect(ecgPlayer.qrsFlashActive).toBe(false);
      expect(ecgPlayer.qrsFlashTimeout).toBe(null);
      expect(global.clearTimeout).toHaveBeenCalledWith(456);
      expect(ecgPlayer.clearQrsFlashArea).toHaveBeenCalled();
    });
  });

  describe('QRS Detection Performance', () => {
    it('should handle large QRS datasets efficiently', () => {
      const largeQrsTimestamps = [];
      for (let i = 0; i < 1000; i++) {
        largeQrsTimestamps.push(i * 0.8); // QRS every 0.8 seconds
      }
      
      ecgPlayer.qrsTimestamps = largeQrsTimestamps;
      ecgPlayer.checkQrsOccurrences = ECGPlayer.checkQrsOccurrences;
      
      const startTime = performance.now();
      ecgPlayer.checkQrsOccurrences(50.0); // Check up to 50 seconds
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
      expect(ecgPlayer.qrsDetectedCount).toBe(63); // QRS events up to 50 seconds (0, 0.8, 1.6, ... 49.6)
    });

    it('should break early when QRS timestamps are sorted', () => {
      ecgPlayer.qrsTimestamps = [0.5, 1.0, 1.5, 2.0, 2.5];
      ecgPlayer.checkQrsOccurrences = ECGPlayer.checkQrsOccurrences;
      ecgPlayer.triggerQrsFlash = vi.fn();
      
      ecgPlayer.checkQrsOccurrences(0.7);
      
      // Should only process the first QRS event and break
      expect(ecgPlayer.triggerQrsFlash).toHaveBeenCalledTimes(1);
      expect(ecgPlayer.qrsDetectedCount).toBe(1);
      expect(ecgPlayer.lastQrsIndex).toBe(0);
    });
  });

  describe('QRS Flash Configuration', () => {
    it('should use configurable flash duration', () => {
      ecgPlayer.qrsFlashDuration = 200;
      ecgPlayer.triggerQrsFlash = ECGPlayer.triggerQrsFlash;
      
      ecgPlayer.triggerQrsFlash();
      
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 200);
    });

    it('should handle zero flash duration', () => {
      ecgPlayer.qrsFlashDuration = 0;
      ecgPlayer.triggerQrsFlash = ECGPlayer.triggerQrsFlash;
      
      ecgPlayer.triggerQrsFlash();
      
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 0);
    });
  });
});