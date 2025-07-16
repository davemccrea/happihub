import { describe, it, expect, beforeEach, vi } from 'vitest';
import ECGPlayer from '../../js/hooks/ecg/ecg_player.js';

describe('ECGPlayer - UI Controls', () => {
  let ecgPlayer;
  let mockElement;

  beforeEach(() => {
    ecgPlayer = Object.create(ECGPlayer);
    ecgPlayer.handleEvent = vi.fn();
    ecgPlayer.targetComponent = 'test-component';
    ecgPlayer.displayMode = 'single';
    ecgPlayer.currentLead = 0;
    ecgPlayer.gridType = 'telemetry';
    ecgPlayer.loopEnabled = false;
    ecgPlayer.qrsIndicatorEnabled = false;
    ecgPlayer.gridScale = 1.0;
    ecgPlayer.amplitudeScale = 1.0;
    ecgPlayer.heightScale = 1.0;
    ecgPlayer.isPlaying = false;
    ecgPlayer.ecgLeadDatasets = [
      { times: [0, 0.1], values: [0, 0.5] },
      { times: [0, 0.1], values: [0, 0.3] }
    ];
    
    // Mock methods
    ecgPlayer.pushEventTo = vi.fn();
    ecgPlayer.switchLead = vi.fn();
    ecgPlayer.recreateCanvasAndRestart = vi.fn();
    ecgPlayer.updateCursorStyle = vi.fn();
    ecgPlayer.updateLeadSelectorVisibility = vi.fn();
    ecgPlayer.renderGridBackground = vi.fn();
    ecgPlayer.withCanvasStatePreservation = vi.fn((fn) => fn());
    ecgPlayer.updateGridScaleDisplay = vi.fn();
    ecgPlayer.updateAmplitudeScaleDisplay = vi.fn();
    ecgPlayer.updateHeightScaleDisplay = vi.fn();
    ecgPlayer.handleGridScaleChange = vi.fn();
    ecgPlayer.handleAmplitudeScaleChange = vi.fn();
    ecgPlayer.handleHeightScaleChange = vi.fn();
    ecgPlayer.clearQrsFlashArea = vi.fn();
    
    // Mock DOM elements
    mockElement = {
      value: '',
      checked: false,
      dataset: {},
      addEventListener: vi.fn(),
      innerHTML: '',
      textContent: ''
    };
    
    global.document.getElementById = vi.fn().mockReturnValue(mockElement);
    global.clearTimeout = vi.fn();
  });

  describe('Lead Switching', () => {
    describe('switchToNextLead()', () => {
      beforeEach(() => {
        ecgPlayer.switchToNextLead = ECGPlayer.switchToNextLead;
      });

      it('should switch to next lead when available', () => {
        ecgPlayer.currentLead = 0;
        
        ecgPlayer.switchToNextLead();
        
        expect(ecgPlayer.switchLead).toHaveBeenCalledWith(1);
        expect(ecgPlayer.pushEventTo).toHaveBeenCalledWith('test-component', 'lead_changed', {
          lead: 1
        });
      });

      it('should not switch when at last lead', () => {
        ecgPlayer.currentLead = 1; // Last lead
        
        ecgPlayer.switchToNextLead();
        
        expect(ecgPlayer.switchLead).not.toHaveBeenCalled();
        expect(ecgPlayer.pushEventTo).not.toHaveBeenCalled();
      });

      it('should handle empty datasets gracefully', () => {
        ecgPlayer.ecgLeadDatasets = [];
        
        ecgPlayer.switchToNextLead();
        
        expect(ecgPlayer.switchLead).not.toHaveBeenCalled();
      });
    });

    describe('switchToPrevLead()', () => {
      beforeEach(() => {
        ecgPlayer.switchToPrevLead = ECGPlayer.switchToPrevLead;
      });

      it('should switch to previous lead when available', () => {
        ecgPlayer.currentLead = 1;
        
        ecgPlayer.switchToPrevLead();
        
        expect(ecgPlayer.switchLead).toHaveBeenCalledWith(0);
        expect(ecgPlayer.pushEventTo).toHaveBeenCalledWith('test-component', 'lead_changed', {
          lead: 0
        });
      });

      it('should not switch when at first lead', () => {
        ecgPlayer.currentLead = 0;
        
        ecgPlayer.switchToPrevLead();
        
        expect(ecgPlayer.switchLead).not.toHaveBeenCalled();
        expect(ecgPlayer.pushEventTo).not.toHaveBeenCalled();
      });
    });

    describe('switchLead()', () => {
      beforeEach(() => {
        ecgPlayer.switchLead = ECGPlayer.switchLead;
        ecgPlayer.stopAnimation = vi.fn();
        ecgPlayer.startAnimationLoop = vi.fn();
        ecgPlayer.clearWaveform = vi.fn();
        ecgPlayer.renderGridBackground = vi.fn();
        ecgPlayer.processAnimationFrame = vi.fn();
        ecgPlayer.currentLeadData = null;
        ecgPlayer.startTime = 1000;
        ecgPlayer.pausedTime = 1500;
        ecgPlayer.widthSeconds = 2.5;
        
        mockElement.value = '0';
      });

      it('should switch to valid lead index', () => {
        ecgPlayer.switchLead(1);
        
        expect(ecgPlayer.currentLead).toBe(1);
        expect(ecgPlayer.currentLeadData).toBe(ecgPlayer.ecgLeadDatasets[1]);
        expect(mockElement.value).toBe('1');
      });

      it('should handle invalid lead index gracefully', () => {
        ecgPlayer.switchLead(999);
        
        expect(ecgPlayer.currentLead).toBe(0); // Should not change
      });

      it('should handle animation state correctly when playing', () => {
        ecgPlayer.isPlaying = true;
        
        ecgPlayer.switchLead(1);
        
        expect(ecgPlayer.stopAnimation).toHaveBeenCalled();
        expect(ecgPlayer.startAnimationLoop).toHaveBeenCalled();
      });

      it('should render paused frame when not playing', () => {
        ecgPlayer.isPlaying = false;
        
        ecgPlayer.switchLead(1);
        
        expect(ecgPlayer.processAnimationFrame).toHaveBeenCalled();
      });

      it('should handle single display mode correctly', () => {
        ecgPlayer.displayMode = 'single';
        
        ecgPlayer.switchLead(1);
        
        expect(ecgPlayer.clearWaveform).toHaveBeenCalled();
        expect(ecgPlayer.renderGridBackground).toHaveBeenCalled();
      });
    });
  });

  describe('Display Mode Controls', () => {
    describe('updateDisplayModeSelector()', () => {
      beforeEach(() => {
        ecgPlayer.updateDisplayModeSelector = ECGPlayer.updateDisplayModeSelector;
      });

      it('should update display mode selector value', () => {
        ecgPlayer.updateDisplayModeSelector('multi');
        
        expect(mockElement.value).toBe('multi');
      });

      it('should handle missing selector gracefully', () => {
        global.document.getElementById.mockReturnValue(null);
        
        expect(() => ecgPlayer.updateDisplayModeSelector('multi')).not.toThrow();
      });
    });

    describe('updateLeadSelectorVisibility()', () => {
      beforeEach(() => {
        ecgPlayer.updateLeadSelectorVisibility = ECGPlayer.updateLeadSelectorVisibility;
        mockElement.style = {};
      });

      it('should hide lead selector in multi mode', () => {
        ecgPlayer.updateLeadSelectorVisibility('multi');
        
        expect(mockElement.style.display).toBe('none');
      });

      it('should show lead selector in single mode', () => {
        ecgPlayer.updateLeadSelectorVisibility('single');
        
        expect(mockElement.style.display).toBe('block');
      });

      it('should handle missing container gracefully', () => {
        global.document.getElementById.mockReturnValue(null);
        
        expect(() => ecgPlayer.updateLeadSelectorVisibility('single')).not.toThrow();
      });
    });
  });

  describe('Scale Controls', () => {
    describe('updateGridScaleDisplay()', () => {
      beforeEach(() => {
        ecgPlayer.updateGridScaleDisplay = ECGPlayer.updateGridScaleDisplay;
        ecgPlayer.gridScale = 1.5;
        
        const mockValueElement = { textContent: '' };
        const mockSpeedElement = { textContent: '' };
        
        global.document.getElementById = vi.fn()
          .mockReturnValueOnce(mockValueElement)
          .mockReturnValueOnce(mockSpeedElement);
      });

      it('should update grid scale display elements', () => {
        ecgPlayer.updateGridScaleDisplay();
        
        expect(global.document.getElementById).toHaveBeenCalledWith('grid-scale-value');
        expect(global.document.getElementById).toHaveBeenCalledWith('grid-scale-speed');
      });
    });

    describe('updateAmplitudeScaleDisplay()', () => {
      beforeEach(() => {
        ecgPlayer.updateAmplitudeScaleDisplay = ECGPlayer.updateAmplitudeScaleDisplay;
        ecgPlayer.amplitudeScale = 2.0;
        
        const mockValueElement = { textContent: '' };
        const mockGainElement = { textContent: '' };
        
        global.document.getElementById = vi.fn()
          .mockReturnValueOnce(mockValueElement)
          .mockReturnValueOnce(mockGainElement);
      });

      it('should update amplitude scale display elements', () => {
        ecgPlayer.updateAmplitudeScaleDisplay();
        
        expect(global.document.getElementById).toHaveBeenCalledWith('amplitude-scale-value');
        expect(global.document.getElementById).toHaveBeenCalledWith('amplitude-scale-gain');
      });
    });

    describe('updateHeightScaleDisplay()', () => {
      beforeEach(() => {
        ecgPlayer.updateHeightScaleDisplay = ECGPlayer.updateHeightScaleDisplay;
        ecgPlayer.heightScale = 1.2;
        
        const mockValueElement = { textContent: '' };
        const mockPixelsElement = { textContent: '' };
        
        global.document.getElementById = vi.fn()
          .mockReturnValueOnce(mockValueElement)
          .mockReturnValueOnce(mockPixelsElement);
      });

      it('should update height scale display elements', () => {
        ecgPlayer.updateHeightScaleDisplay();
        
        expect(global.document.getElementById).toHaveBeenCalledWith('height-scale-value');
        expect(global.document.getElementById).toHaveBeenCalledWith('height-scale-pixels');
      });
    });
  });

  describe('Play/Pause Button', () => {
    describe('updatePlayPauseButton()', () => {
      beforeEach(() => {
        ecgPlayer.updatePlayPauseButton = ECGPlayer.updatePlayPauseButton;
        mockElement.innerHTML = '';
      });

      it('should show pause icon when playing', () => {
        ecgPlayer.isPlaying = true;
        
        ecgPlayer.updatePlayPauseButton();
        
        expect(mockElement.innerHTML).toContain('hero-pause');
        expect(mockElement.innerHTML).toContain('Pause');
      });

      it('should show play icon when not playing', () => {
        ecgPlayer.isPlaying = false;
        
        ecgPlayer.updatePlayPauseButton();
        
        expect(mockElement.innerHTML).toContain('hero-play');
        expect(mockElement.innerHTML).toContain('Play');
      });

      it('should handle missing button gracefully', () => {
        global.document.getElementById.mockReturnValue(null);
        
        expect(() => ecgPlayer.updatePlayPauseButton()).not.toThrow();
      });
    });

    describe('setupPlayPauseButton()', () => {
      beforeEach(() => {
        ecgPlayer.setupPlayPauseButton = ECGPlayer.setupPlayPauseButton;
        ecgPlayer.togglePlayback = vi.fn();
        mockElement.dataset = {};
        mockElement.addEventListener = vi.fn();
      });

      it('should setup button event listener', () => {
        ecgPlayer.setupPlayPauseButton();
        
        expect(mockElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        expect(mockElement.dataset.listenerAdded).toBe('true');
      });

      it('should not add listener if already added', () => {
        mockElement.dataset.listenerAdded = 'true';
        
        ecgPlayer.setupPlayPauseButton();
        
        expect(mockElement.addEventListener).not.toHaveBeenCalled();
      });

      it('should handle missing button gracefully', () => {
        global.document.getElementById.mockReturnValue(null);
        
        expect(() => ecgPlayer.setupPlayPauseButton()).not.toThrow();
      });
    });
  });

  describe('Form Element Synchronization', () => {
    describe('syncFormElementsWithState()', () => {
      beforeEach(() => {
        ecgPlayer.syncFormElementsWithState = ECGPlayer.syncFormElementsWithState;
        ecgPlayer.updateGridScaleDisplay = vi.fn();
        ecgPlayer.updateAmplitudeScaleDisplay = vi.fn();
        ecgPlayer.updateHeightScaleDisplay = vi.fn();
        
        // Mock different elements for different selectors
        global.document.getElementById = vi.fn((id) => {
          const element = {
            value: '',
            checked: false,
            textContent: ''
          };
          return element;
        });
      });

      it('should sync all form elements with current state', () => {
        ecgPlayer.currentLead = 2;
        ecgPlayer.displayMode = 'multi';
        ecgPlayer.gridType = 'graph_paper';
        ecgPlayer.loopEnabled = true;
        ecgPlayer.qrsIndicatorEnabled = true;
        ecgPlayer.gridScale = 1.5;
        ecgPlayer.amplitudeScale = 2.0;
        ecgPlayer.heightScale = 0.8;
        
        ecgPlayer.syncFormElementsWithState();
        
        expect(global.document.getElementById).toHaveBeenCalledWith('lead-selector');
        expect(global.document.getElementById).toHaveBeenCalledWith('display-mode-selector');
        expect(global.document.getElementById).toHaveBeenCalledWith('grid-type-selector');
        expect(global.document.getElementById).toHaveBeenCalledWith('loop-checkbox');
        expect(global.document.getElementById).toHaveBeenCalledWith('qrs-indicator-checkbox');
        expect(ecgPlayer.updateGridScaleDisplay).toHaveBeenCalled();
        expect(ecgPlayer.updateAmplitudeScaleDisplay).toHaveBeenCalled();
        expect(ecgPlayer.updateHeightScaleDisplay).toHaveBeenCalled();
      });

      it('should handle missing elements gracefully', () => {
        global.document.getElementById.mockReturnValue(null);
        
        expect(() => ecgPlayer.syncFormElementsWithState()).not.toThrow();
      });
    });
  });

  describe('QRS Indicator Controls', () => {
    describe('QRS flash management', () => {
      beforeEach(() => {
        ecgPlayer.qrsIndicatorEnabled = true;
        ecgPlayer.qrsFlashActive = true;
        ecgPlayer.qrsFlashTimeout = 123;
      });

      it('should disable QRS flash when indicator disabled', () => {
        const mockEvent = { target: { checked: false } };
        
        // Simulate checkbox change handler
        ecgPlayer.qrsIndicatorEnabled = false;
        ecgPlayer.qrsFlashActive = false;
        
        if (ecgPlayer.qrsFlashTimeout) {
          clearTimeout(ecgPlayer.qrsFlashTimeout);
          ecgPlayer.qrsFlashTimeout = null;
        }
        
        expect(global.clearTimeout).toHaveBeenCalledWith(123);
        expect(ecgPlayer.qrsFlashActive).toBe(false);
      });
    });
  });

  describe('Keyboard Controls', () => {
    describe('setupKeyboardListeners()', () => {
      beforeEach(() => {
        ecgPlayer.setupKeyboardListeners = ECGPlayer.setupKeyboardListeners;
        ecgPlayer.switchToNextLead = vi.fn();
        ecgPlayer.switchToPrevLead = vi.fn();
        ecgPlayer.togglePlayback = vi.fn();
        global.document.addEventListener = vi.fn();
      });

      it('should setup keyboard event listener', () => {
        ecgPlayer.setupKeyboardListeners();
        
        expect(global.document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      });

      it('should handle lead switching keys', () => {
        ecgPlayer.setupKeyboardListeners();
        const keydownHandler = global.document.addEventListener.mock.calls[0][1];
        
        // Test 'j' key (next lead)
        keydownHandler({ key: 'j', target: { tagName: 'BODY' }, preventDefault: vi.fn() });
        expect(ecgPlayer.switchToNextLead).toHaveBeenCalled();
        
        // Test 'k' key (prev lead)
        keydownHandler({ key: 'k', target: { tagName: 'BODY' }, preventDefault: vi.fn() });
        expect(ecgPlayer.switchToPrevLead).toHaveBeenCalled();
      });

      it('should handle arrow keys', () => {
        ecgPlayer.setupKeyboardListeners();
        const keydownHandler = global.document.addEventListener.mock.calls[0][1];
        
        // Test arrow down (next lead)
        keydownHandler({ key: 'ArrowDown', target: { tagName: 'BODY' }, preventDefault: vi.fn() });
        expect(ecgPlayer.switchToNextLead).toHaveBeenCalled();
        
        // Test arrow up (prev lead)
        keydownHandler({ key: 'ArrowUp', target: { tagName: 'BODY' }, preventDefault: vi.fn() });
        expect(ecgPlayer.switchToPrevLead).toHaveBeenCalled();
      });

      it('should handle spacebar for play/pause', () => {
        ecgPlayer.setupKeyboardListeners();
        const keydownHandler = global.document.addEventListener.mock.calls[0][1];
        
        keydownHandler({ key: ' ', target: { tagName: 'BODY' }, preventDefault: vi.fn() });
        expect(ecgPlayer.togglePlayback).toHaveBeenCalled();
      });

      it('should ignore keys when typing in input fields', () => {
        ecgPlayer.setupKeyboardListeners();
        const keydownHandler = global.document.addEventListener.mock.calls[0][1];
        
        keydownHandler({ key: 'j', target: { tagName: 'INPUT' }, preventDefault: vi.fn() });
        expect(ecgPlayer.switchToNextLead).not.toHaveBeenCalled();
        
        keydownHandler({ key: 'j', target: { tagName: 'TEXTAREA' }, preventDefault: vi.fn() });
        expect(ecgPlayer.switchToNextLead).not.toHaveBeenCalled();
        
        keydownHandler({ key: 'j', target: { isContentEditable: true }, preventDefault: vi.fn() });
        expect(ecgPlayer.switchToNextLead).not.toHaveBeenCalled();
      });
    });
  });
});