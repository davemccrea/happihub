import { describe, it, expect, beforeEach, vi } from 'vitest';
import ECGPlayer from '../../js/hooks/ecg/ecg_player.js';

describe('ECGPlayer - Initialization', () => {
  let mockElement;
  let ecgPlayer;

  beforeEach(() => {
    // Mock DOM element
    mockElement = {
      querySelector: vi.fn(),
      getAttribute: vi.fn(() => 'test-target'),
      dataset: {}
    };

    // Mock container element
    const mockContainer = {
      offsetWidth: 800,
      appendChild: vi.fn()
    };

    mockElement.querySelector.mockReturnValue(mockContainer);

    // Create a new ECGPlayer instance with mocked methods
    ecgPlayer = Object.create(ECGPlayer);
    ecgPlayer.el = mockElement;
    ecgPlayer.handleEvent = vi.fn();
    
    // Mock methods that would normally be called during initialization
    ecgPlayer.initializeState = vi.fn();
    ecgPlayer.calculateMedicallyAccurateDimensions = vi.fn();
    ecgPlayer.updateThemeColors = vi.fn();
    ecgPlayer.setupEventListeners = vi.fn();
    ecgPlayer.initializeECGChart = vi.fn();
  });

  describe('mounted()', () => {
    it('should initialize all required components', () => {
      ecgPlayer.mounted();

      expect(ecgPlayer.initializeState).toHaveBeenCalledOnce();
      expect(ecgPlayer.calculateMedicallyAccurateDimensions).toHaveBeenCalledOnce();
      expect(ecgPlayer.updateThemeColors).toHaveBeenCalledOnce();
      expect(ecgPlayer.setupEventListeners).toHaveBeenCalledOnce();
      expect(ecgPlayer.initializeECGChart).toHaveBeenCalledOnce();
    });

    it('should set targetComponent from element attribute', () => {
      ecgPlayer.mounted();
      
      expect(mockElement.getAttribute).toHaveBeenCalledWith('phx-target');
      expect(ecgPlayer.targetComponent).toBe('test-target');
    });
  });

  describe('initializeState()', () => {
    beforeEach(() => {
      ecgPlayer.initializeState = ECGPlayer.initializeState;
      ecgPlayer.initializeFormValues = vi.fn();
    });

    it('should initialize all state properties', () => {
      ecgPlayer.initializeState();

      expect(ecgPlayer.isPlaying).toBe(false);
      expect(ecgPlayer.activeSegments).toEqual([]);
      expect(ecgPlayer.startTime).toBe(null);
      expect(ecgPlayer.pausedTime).toBe(0);
      expect(ecgPlayer.animationCycle).toBe(0);
      expect(ecgPlayer.animationId).toBe(null);
      expect(ecgPlayer.cursorPosition).toBe(0);
      expect(ecgPlayer.activeCursorData).toBe(null);
      expect(ecgPlayer.allLeadsCursorData).toBe(null);
    });

    it('should initialize QRS flash properties', () => {
      ecgPlayer.initializeState();

      expect(ecgPlayer.qrsFlashActive).toBe(false);
      expect(ecgPlayer.qrsFlashTimeout).toBe(null);
      expect(ecgPlayer.qrsFlashDuration).toBe(100);
    });

    it('should initialize performance optimization properties', () => {
      ecgPlayer.initializeState();

      expect(ecgPlayer.precomputedSegments).toBeInstanceOf(Map);
      expect(ecgPlayer.segmentDuration).toBe(0.1);
      expect(ecgPlayer.dataIndexCache).toBeInstanceOf(Map);
    });

    it('should initialize canvas properties to null', () => {
      ecgPlayer.initializeState();

      expect(ecgPlayer.backgroundCanvas).toBe(null);
      expect(ecgPlayer.backgroundContext).toBe(null);
      expect(ecgPlayer.waveformCanvas).toBe(null);
      expect(ecgPlayer.waveformContext).toBe(null);
      expect(ecgPlayer.qrsFlashCanvas).toBe(null);
      expect(ecgPlayer.qrsFlashContext).toBe(null);
    });
  });

  describe('initializeFormValues()', () => {
    beforeEach(() => {
      ecgPlayer.initializeFormValues = ECGPlayer.initializeFormValues;
      ecgPlayer.readFormValue = vi.fn();
      ecgPlayer.readFormCheckbox = vi.fn();
    });

    it('should initialize display and playback settings with defaults', () => {
      ecgPlayer.readFormValue.mockReturnValue(null);
      ecgPlayer.readFormCheckbox.mockReturnValue(false);

      ecgPlayer.initializeFormValues();

      expect(ecgPlayer.gridType).toBe('telemetry');
      expect(ecgPlayer.displayMode).toBe('single');
      expect(ecgPlayer.currentLead).toBe(0);
      expect(ecgPlayer.loopEnabled).toBe(false);
      expect(ecgPlayer.qrsIndicatorEnabled).toBe(false);
    });

    it('should initialize scale settings with defaults', () => {
      ecgPlayer.readFormValue.mockReturnValue(null);
      ecgPlayer.readFormCheckbox.mockReturnValue(false);

      ecgPlayer.initializeFormValues();

      expect(ecgPlayer.gridScale).toBe(1.0);
      expect(ecgPlayer.amplitudeScale).toBe(1.0);
      expect(ecgPlayer.heightScale).toBe(1.2);
    });

    it('should use form values when available', () => {
      ecgPlayer.readFormValue
        .mockReturnValueOnce('graph_paper')  // grid_type
        .mockReturnValueOnce('multi')        // display_mode
        .mockReturnValueOnce('3')            // current_lead
        .mockReturnValueOnce('2.0')          // grid_scale
        .mockReturnValueOnce('1.5')          // amplitude_scale
        .mockReturnValueOnce('0.8');         // height_scale

      ecgPlayer.readFormCheckbox
        .mockReturnValueOnce(true)   // loop_playback
        .mockReturnValueOnce(true);  // qrs_indicator

      ecgPlayer.initializeFormValues();

      expect(ecgPlayer.gridType).toBe('graph_paper');
      expect(ecgPlayer.displayMode).toBe('multi');
      expect(ecgPlayer.currentLead).toBe(3);
      expect(ecgPlayer.loopEnabled).toBe(true);
      expect(ecgPlayer.qrsIndicatorEnabled).toBe(true);
      expect(ecgPlayer.gridScale).toBe(2.0);
      expect(ecgPlayer.amplitudeScale).toBe(1.5);
      expect(ecgPlayer.heightScale).toBe(0.8);
    });

    it('should set cursor width based on display mode', () => {
      ecgPlayer.readFormValue.mockImplementation((field) => {
        if (field === 'display_mode') return 'single';
        return null;
      });
      ecgPlayer.readFormCheckbox.mockReturnValue(false);

      ecgPlayer.initializeFormValues();
      expect(ecgPlayer.cursorWidth).toBe(20); // SINGLE_LEAD_CURSOR_WIDTH

      ecgPlayer.readFormValue.mockImplementation((field) => {
        if (field === 'display_mode') return 'multi';
        return null;
      });

      ecgPlayer.initializeFormValues();
      expect(ecgPlayer.cursorWidth).toBe(8); // MULTI_LEAD_CURSOR_WIDTH
    });
  });

  describe('cleanup()', () => {
    beforeEach(() => {
      ecgPlayer.cleanup = ECGPlayer.cleanup;
      ecgPlayer.cleanupCanvases = vi.fn();
    });

    it('should cancel animation frame if active', () => {
      const mockCancelAnimationFrame = vi.fn();
      global.cancelAnimationFrame = mockCancelAnimationFrame;
      
      ecgPlayer.animationId = 123;
      ecgPlayer.cleanup();

      expect(mockCancelAnimationFrame).toHaveBeenCalledWith(123);
    });

    it('should clear QRS flash timeout if active', () => {
      const mockClearTimeout = vi.fn();
      global.clearTimeout = mockClearTimeout;
      
      ecgPlayer.qrsFlashTimeout = 456;
      ecgPlayer.cleanup();

      expect(mockClearTimeout).toHaveBeenCalledWith(456);
    });

    it('should remove event listeners', () => {
      const mockRemoveEventListener = vi.fn();
      global.window.removeEventListener = mockRemoveEventListener;
      global.document.removeEventListener = mockRemoveEventListener;

      ecgPlayer.resizeHandler = vi.fn();
      ecgPlayer.keydownHandler = vi.fn();
      ecgPlayer.themeObserver = { disconnect: vi.fn() };

      ecgPlayer.cleanup();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('resize', ecgPlayer.resizeHandler);
      expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', ecgPlayer.keydownHandler);
      expect(ecgPlayer.themeObserver.disconnect).toHaveBeenCalled();
    });

    it('should nullify large data objects', () => {
      ecgPlayer.ecgLeadDatasets = [];
      ecgPlayer.precomputedSegments = new Map();
      ecgPlayer.dataIndexCache = new Map();
      ecgPlayer.currentLeadData = {};
      ecgPlayer.allLeadsCursorData = [];
      ecgPlayer.activeCursorData = {};
      ecgPlayer.eventHandlers = {};

      ecgPlayer.cleanup();

      expect(ecgPlayer.ecgLeadDatasets).toBe(null);
      expect(ecgPlayer.precomputedSegments).toBe(null);
      expect(ecgPlayer.dataIndexCache).toBe(null);
      expect(ecgPlayer.currentLeadData).toBe(null);
      expect(ecgPlayer.allLeadsCursorData).toBe(null);
      expect(ecgPlayer.activeCursorData).toBe(null);
      expect(ecgPlayer.eventHandlers).toBe(null);
    });
  });
});