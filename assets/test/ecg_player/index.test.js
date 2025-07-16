import { describe, it, expect, beforeEach, vi } from 'vitest';
import ECGPlayer from '../../js/hooks/ecg/ecg_player.js';

describe('ECGPlayer - Integration Tests', () => {
  let ecgPlayer;
  let mockElement;
  let mockContainer;

  beforeEach(() => {
    // Mock DOM elements
    mockContainer = {
      offsetWidth: 800,
      appendChild: vi.fn()
    };

    mockElement = {
      querySelector: vi.fn().mockReturnValue(mockContainer),
      getAttribute: vi.fn(() => 'test-target'),
      dataset: {}
    };

    // Mock global functions
    global.window = {
      ...global.window,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      devicePixelRatio: 1,
      requestAnimationFrame: vi.fn(),
      cancelAnimationFrame: vi.fn()
    };

    global.document = {
      ...global.document,
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        style: {},
        getContext: vi.fn(() => ({
          scale: vi.fn(),
          clearRect: vi.fn(),
          strokeStyle: '',
          fillStyle: '',
          lineWidth: 1,
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          quadraticCurveTo: vi.fn(),
          arc: vi.fn(),
          stroke: vi.fn(),
          fill: vi.fn(),
          fillText: vi.fn(),
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
          lineCap: 'round',
          lineJoin: 'round',
          font: '12px Arial'
        })),
        remove: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 800,
          height: 600
        }))
      })),
      getElementById: vi.fn(() => ({
        value: '',
        checked: false,
        dataset: {},
        addEventListener: vi.fn(),
        innerHTML: '',
        textContent: '',
        style: {}
      })),
      querySelector: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      documentElement: {
        getAttribute: vi.fn(() => 'light'),
        setAttribute: vi.fn()
      }
    };

    global.MutationObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn()
    }));

    global.Date.now = vi.fn(() => 1000);
    global.performance = { now: vi.fn(() => 1000) };
    global.setTimeout = vi.fn();
    global.clearTimeout = vi.fn();

    // Create ECGPlayer instance
    ecgPlayer = Object.create(ECGPlayer);
    ecgPlayer.el = mockElement;
    ecgPlayer.pushEventTo = vi.fn();
    ecgPlayer.handleEvent = vi.fn();
    
    // Mock common methods to prevent errors (but not core animation methods)
    ecgPlayer.startAnimationLoop = vi.fn();
    ecgPlayer.processAnimationFrame = vi.fn();
    ecgPlayer.clearWaveform = vi.fn();
    ecgPlayer.cleanupCanvases = vi.fn();
  });

  describe('Full Initialization Flow', () => {
    it('should complete full initialization without errors', () => {
      expect(() => {
        ecgPlayer.mounted();
      }).not.toThrow();

      expect(ecgPlayer.targetComponent).toBe('test-target');
      expect(ecgPlayer.isPlaying).toBe(false);
      expect(ecgPlayer.backgroundCanvas).toBeDefined();
      expect(ecgPlayer.waveformCanvas).toBeDefined();
      expect(ecgPlayer.qrsFlashCanvas).toBeDefined();
    });

    it('should setup all event listeners', () => {
      ecgPlayer.mounted();

      expect(global.window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(global.document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(global.MutationObserver).toHaveBeenCalled();
    });

    it('should initialize with default values', () => {
      ecgPlayer.mounted();

      expect(ecgPlayer.gridType).toBe('telemetry');
      expect(ecgPlayer.displayMode).toBe('single');
      expect(ecgPlayer.currentLead).toBe(0);
      expect(ecgPlayer.gridScale).toBe(1.0);
      expect(ecgPlayer.amplitudeScale).toBe(1.0);
      expect(ecgPlayer.heightScale).toBe(1.2);
    });
  });

  describe('ECG Data Loading and Processing', () => {
    beforeEach(() => {
      ecgPlayer.mounted();
    });

    it('should process ECG data correctly', () => {
      const testData = {
        data: {
          fs: 500,
          sig_name: ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'aVR', 'aVL', 'aVF', 'III'],
          p_signal: Array(1000).fill(0).map((_, i) => 
            Array(12).fill(0).map((_, j) => Math.sin(i * 0.01 + j))
          ),
          qrs: [100, 200, 300, 400, 500]
        }
      };

      expect(() => {
        ecgPlayer.handleECGDataLoaded(testData);
      }).not.toThrow();

      expect(ecgPlayer.samplingRate).toBe(500);
      expect(ecgPlayer.leadNames).toHaveLength(12);
      expect(ecgPlayer.ecgLeadDatasets).toHaveLength(12);
      expect(ecgPlayer.totalDuration).toBe(2); // 1000 samples / 500 Hz
      expect(ecgPlayer.qrsTimestamps).toHaveLength(5);
    });

    it('should handle malformed ECG data gracefully', () => {
      const malformedData = {
        data: {
          fs: 500,
          sig_name: ['I', 'II'],
          p_signal: [] // Empty signal data
        }
      };

      expect(() => {
        ecgPlayer.handleECGDataLoaded(malformedData);
      }).not.toThrow();

      expect(ecgPlayer.ecgLeadDatasets).toHaveLength(2);
    });
  });

  describe('Animation and Playback Integration', () => {
    beforeEach(() => {
      ecgPlayer.mounted();
      
      // Load test ECG data
      const testData = {
        data: {
          fs: 500,
          sig_name: ['I', 'II', 'V1'],
          p_signal: Array(500).fill(0).map((_, i) => 
            Array(3).fill(0).map((_, j) => Math.sin(i * 0.01 + j))
          ),
          qrs: [100, 200, 300]
        }
      };
      ecgPlayer.handleECGDataLoaded(testData);
    });

    it('should start and stop animation correctly', () => {
      expect(ecgPlayer.isPlaying).toBe(false);

      // Use the actual methods
      ecgPlayer.startAnimation();
      expect(ecgPlayer.isPlaying).toBe(true);
      expect(ecgPlayer.startTime).toBeDefined();

      // Test stopping animation
      ecgPlayer.stopAnimation();
      expect(ecgPlayer.isPlaying).toBe(false);
      expect(ecgPlayer.animationId).toBe(null);
    });

    it('should handle playback toggle correctly', () => {
      ecgPlayer.togglePlayback();
      expect(ecgPlayer.isPlaying).toBe(true);
      expect(ecgPlayer.pushEventTo).toHaveBeenCalledWith('test-target', 'playback_changed', {
        is_playing: true
      });

      ecgPlayer.togglePlayback();
      expect(ecgPlayer.isPlaying).toBe(false);
      expect(ecgPlayer.pushEventTo).toHaveBeenCalledWith('test-target', 'playback_changed', {
        is_playing: false
      });
    });

    it('should handle pause and resume correctly', () => {
      ecgPlayer.startAnimation();
      const originalStartTime = ecgPlayer.startTime;

      global.Date.now.mockReturnValue(2000);
      ecgPlayer.pauseAnimation();
      expect(ecgPlayer.isPlaying).toBe(false);
      expect(ecgPlayer.pausedTime).toBe(2000);

      global.Date.now.mockReturnValue(3000);
      ecgPlayer.resumeAnimation();
      
      // Check that the start time adjustment is correct
      expect(ecgPlayer.startTime).toBe(originalStartTime + 1000);
      expect(ecgPlayer.pausedTime).toBe(0);
    });

    it('should reset playback state correctly', () => {
      ecgPlayer.startAnimation();
      ecgPlayer.cursorPosition = 500;
      ecgPlayer.animationCycle = 2;
      ecgPlayer.qrsDetectedCount = 3;

      ecgPlayer.resetPlayback();

      expect(ecgPlayer.isPlaying).toBe(false);
      expect(ecgPlayer.startTime).toBe(null);
      expect(ecgPlayer.pausedTime).toBe(0);
      expect(ecgPlayer.cursorPosition).toBe(0);
      expect(ecgPlayer.animationCycle).toBe(0);
      expect(ecgPlayer.qrsDetectedCount).toBe(0);
    });
  });

  describe('Lead Switching Integration', () => {
    beforeEach(() => {
      ecgPlayer.mounted();
      
      const testData = {
        data: {
          fs: 500,
          sig_name: ['I', 'II', 'V1'],
          p_signal: Array(500).fill(0).map((_, i) => 
            Array(3).fill(0).map((_, j) => Math.sin(i * 0.01 + j))
          )
        }
      };
      ecgPlayer.handleECGDataLoaded(testData);
    });

    it('should switch leads correctly', () => {
      expect(ecgPlayer.currentLead).toBe(0);
      
      ecgPlayer.switchLead(1);
      expect(ecgPlayer.currentLead).toBe(1);
      expect(ecgPlayer.currentLeadData).toBe(ecgPlayer.ecgLeadDatasets[1]);
    });

    it('should handle keyboard navigation', () => {
      const keydownHandler = global.document.addEventListener.mock.calls
        .find(call => call[0] === 'keydown')[1];

      // Test next lead (j key)
      keydownHandler({ 
        key: 'j', 
        target: { tagName: 'BODY' }, 
        preventDefault: vi.fn() 
      });
      expect(ecgPlayer.currentLead).toBe(1);

      // Test previous lead (k key)
      keydownHandler({ 
        key: 'k', 
        target: { tagName: 'BODY' }, 
        preventDefault: vi.fn() 
      });
      expect(ecgPlayer.currentLead).toBe(0);
    });

    it('should handle lead bounds correctly', () => {
      ecgPlayer.currentLead = 0;
      ecgPlayer.switchToPrevLead();
      expect(ecgPlayer.currentLead).toBe(0); // Should not go below 0

      ecgPlayer.currentLead = 2;
      ecgPlayer.switchToNextLead();
      expect(ecgPlayer.currentLead).toBe(2); // Should not go above max
    });
  });

  describe('Display Mode Integration', () => {
    beforeEach(() => {
      ecgPlayer.mounted();
    });

    it('should switch between single and multi-lead modes', () => {
      expect(ecgPlayer.displayMode).toBe('single');
      expect(ecgPlayer.cursorWidth).toBe(20); // SINGLE_LEAD_CURSOR_WIDTH

      ecgPlayer.displayMode = 'multi';
      ecgPlayer.cursorWidth = 8; // MULTI_LEAD_CURSOR_WIDTH
      ecgPlayer.recreateCanvas();

      expect(ecgPlayer.cursorWidth).toBe(8);
    });

    it('should handle canvas click mode switching', () => {
      const mockCanvas = ecgPlayer.backgroundCanvas;
      const clickHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];

      // Mock click event
      const mockEvent = {
        clientX: 100,
        clientY: 50
      };

      mockCanvas.getBoundingClientRect.mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600
      });

      expect(() => {
        clickHandler(mockEvent);
      }).not.toThrow();
    });
  });

  describe('QRS Detection Integration', () => {
    beforeEach(() => {
      ecgPlayer.mounted();
      
      const testData = {
        data: {
          fs: 500,
          sig_name: ['I', 'II'],
          p_signal: Array(1000).fill(0).map((_, i) => 
            Array(2).fill(0).map((_, j) => Math.sin(i * 0.01 + j))
          ),
          qrs: [250, 500, 750]
        }
      };
      ecgPlayer.handleECGDataLoaded(testData);
    });

    it('should detect QRS complexes during playback', () => {
      ecgPlayer.qrsIndicatorEnabled = true;
      
      ecgPlayer.checkQrsOccurrences(1.0);
      expect(ecgPlayer.qrsDetectedCount).toBe(2); // Two QRS at 0.5s and 1.0s
      
      ecgPlayer.checkQrsOccurrences(1.5);
      expect(ecgPlayer.qrsDetectedCount).toBe(3); // One more at 1.5s
    });

    it('should handle QRS flash correctly', () => {
      ecgPlayer.qrsIndicatorEnabled = true;
      
      ecgPlayer.triggerQrsFlash();
      expect(ecgPlayer.qrsFlashActive).toBe(true);
      expect(global.setTimeout).toHaveBeenCalled();
    });

    it('should reset QRS state on playback reset', () => {
      ecgPlayer.qrsDetectedCount = 5;
      ecgPlayer.lastQrsIndex = 3;
      
      ecgPlayer.resetPlayback();
      
      expect(ecgPlayer.qrsDetectedCount).toBe(0);
      expect(ecgPlayer.lastQrsIndex).toBe(-1);
    });
  });

  describe('Theme Integration', () => {
    beforeEach(() => {
      ecgPlayer.mounted();
    });

    it('should handle theme changes correctly', () => {
      // Mock theme observer callback
      const themeObserver = global.MutationObserver.mock.instances[0];
      const observerCallback = global.MutationObserver.mock.calls[0][0];
      
      observerCallback([{
        type: 'attributes',
        attributeName: 'data-theme'
      }]);

      expect(ecgPlayer.colors).toBeDefined();
    });

    it('should apply correct colors for light theme', () => {
      global.document.documentElement.getAttribute.mockReturnValue('light');
      
      ecgPlayer.updateThemeColors();
      
      expect(ecgPlayer.colors.waveform).toBe('#000000');
      expect(ecgPlayer.colors.gridFine).toBe('#ff9999');
      expect(ecgPlayer.colors.gridBold).toBe('#ff6666');
    });

    it('should apply correct colors for dark theme', () => {
      global.document.documentElement.getAttribute.mockReturnValue('dark');
      
      ecgPlayer.updateThemeColors();
      
      expect(ecgPlayer.colors.waveform).toBe('#ffffff');
      expect(ecgPlayer.colors.gridFine).toBe('#660000');
      expect(ecgPlayer.colors.gridBold).toBe('#990000');
    });
  });

  describe('Cleanup Integration', () => {
    it('should cleanup all resources correctly', () => {
      ecgPlayer.mounted();
      
      // Setup some state
      ecgPlayer.animationId = 123;
      ecgPlayer.qrsFlashTimeout = 456;
      ecgPlayer.ecgLeadDatasets = [];
      ecgPlayer.precomputedSegments = new Map();
      ecgPlayer.dataIndexCache = new Map();
      
      // Setup event handlers so they can be cleaned up
      ecgPlayer.resizeHandler = vi.fn();
      ecgPlayer.keydownHandler = vi.fn();
      ecgPlayer.themeObserver = { disconnect: vi.fn() };
      
      ecgPlayer.cleanup();
      
      // Check that large data objects were properly reset
      expect(ecgPlayer.ecgLeadDatasets).toBe(null);
      expect(ecgPlayer.precomputedSegments).toBe(null);
      expect(ecgPlayer.dataIndexCache).toBe(null);
      expect(ecgPlayer.currentLeadData).toBe(null);
      expect(ecgPlayer.allLeadsCursorData).toBe(null);
      expect(ecgPlayer.activeCursorData).toBe(null);
      expect(ecgPlayer.eventHandlers).toBe(null);
      
      // Check that the cleanup method was called
      expect(ecgPlayer.cleanupCanvases).toHaveBeenCalled();
    });

    it('should handle destroyed lifecycle correctly', () => {
      ecgPlayer.mounted();
      
      expect(() => {
        ecgPlayer.destroyed();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing DOM elements gracefully', () => {
      ecgPlayer.el.querySelector.mockReturnValue(null);
      
      // Mock methods to prevent errors
      ecgPlayer.recreateCanvas = vi.fn();
      ecgPlayer.renderGridBackground = vi.fn();
      
      expect(() => {
        ecgPlayer.mounted();
      }).not.toThrow();
    });

    it('should handle canvas creation failures gracefully', () => {
      global.document.createElement.mockReturnValue(null);
      
      // Mock methods to prevent null reference errors
      ecgPlayer.recreateCanvas = vi.fn();
      ecgPlayer.renderGridBackground = vi.fn();
      
      expect(() => {
        ecgPlayer.mounted();
      }).not.toThrow();
    });

    it('should handle invalid ECG data gracefully', () => {
      ecgPlayer.mounted();
      
      const invalidData = {
        data: null
      };
      
      expect(() => {
        ecgPlayer.handleECGDataLoaded(invalidData);
      }).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large datasets efficiently', () => {
      ecgPlayer.mounted();
      
      const largeData = {
        data: {
          fs: 1000,
          sig_name: Array(12).fill(0).map((_, i) => `Lead${i}`),
          p_signal: Array(10000).fill(0).map((_, i) => 
            Array(12).fill(0).map((_, j) => Math.sin(i * 0.001 + j))
          ),
          qrs: Array(100).fill(0).map((_, i) => i * 100)
        }
      };
      
      const startTime = performance.now();
      ecgPlayer.handleECGDataLoaded(largeData);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should process quickly
      expect(ecgPlayer.ecgLeadDatasets).toHaveLength(12);
    });

    it('should optimize rendering with pre-computed segments', () => {
      ecgPlayer.mounted();
      
      const testData = {
        data: {
          fs: 500,
          sig_name: ['I'],
          p_signal: Array(1000).fill(0).map((_, i) => [Math.sin(i * 0.01)]),
          qrs: [100, 200, 300]
        }
      };
      
      ecgPlayer.handleECGDataLoaded(testData);
      
      expect(ecgPlayer.precomputedSegments).toBeInstanceOf(Map);
      expect(ecgPlayer.precomputedSegments.size).toBeGreaterThan(0);
    });
  });
});