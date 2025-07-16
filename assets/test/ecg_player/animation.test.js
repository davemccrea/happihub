import { describe, it, expect, beforeEach, vi } from 'vitest';
import ECGPlayer from '../../js/hooks/ecg/ecg_player.js';

describe('ECGPlayer - Animation', () => {
  let ecgPlayer;

  beforeEach(() => {
    ecgPlayer = Object.create(ECGPlayer);
    ecgPlayer.handleEvent = vi.fn();
    ecgPlayer.widthSeconds = 2.5;
    ecgPlayer.chartWidth = 1000;
    ecgPlayer.totalDuration = 10.0;
    ecgPlayer.isPlaying = false;
    ecgPlayer.loopEnabled = false;
    ecgPlayer.animationId = null;
    ecgPlayer.startTime = null;
    ecgPlayer.pausedTime = 0;
    ecgPlayer.animationCycle = 0;
    ecgPlayer.cursorPosition = 0;
    ecgPlayer.targetComponent = 'test-component';
    
    // Mock methods
    ecgPlayer.pushEventTo = vi.fn();
    ecgPlayer.handlePlaybackEnd = vi.fn();
    ecgPlayer.checkQrsOccurrences = vi.fn();
    ecgPlayer.calculateCursorPosition = vi.fn();
    ecgPlayer.loadVisibleDataForSingleLead = vi.fn();
    ecgPlayer.loadVisibleDataForAllLeads = vi.fn();
    ecgPlayer.renderLeadWaveform = vi.fn();
    ecgPlayer.updatePlayPauseButton = vi.fn();
    ecgPlayer.resetPlayback = vi.fn();
    ecgPlayer.startAnimation = vi.fn();
    ecgPlayer.stopAnimation = vi.fn();
    ecgPlayer.startAnimationLoop = vi.fn();

    // Mock window methods
    global.Date.now = vi.fn();
    global.requestAnimationFrame = vi.fn();
    global.cancelAnimationFrame = vi.fn();
  });

  describe('togglePlayback()', () => {
    beforeEach(() => {
      ecgPlayer.togglePlayback = ECGPlayer.togglePlayback;
      ecgPlayer.resumeAnimation = vi.fn();
      ecgPlayer.pauseAnimation = vi.fn();
    });

    it('should toggle from paused to playing', () => {
      ecgPlayer.isPlaying = false;
      
      ecgPlayer.togglePlayback();
      
      expect(ecgPlayer.isPlaying).toBe(true);
      expect(ecgPlayer.pushEventTo).toHaveBeenCalledWith('test-component', 'playback_changed', {
        is_playing: true
      });
      expect(ecgPlayer.resumeAnimation).toHaveBeenCalled();
      expect(ecgPlayer.updatePlayPauseButton).toHaveBeenCalled();
    });

    it('should toggle from playing to paused', () => {
      ecgPlayer.isPlaying = true;
      
      ecgPlayer.togglePlayback();
      
      expect(ecgPlayer.isPlaying).toBe(false);
      expect(ecgPlayer.pushEventTo).toHaveBeenCalledWith('test-component', 'playback_changed', {
        is_playing: false
      });
      expect(ecgPlayer.pauseAnimation).toHaveBeenCalled();
      expect(ecgPlayer.updatePlayPauseButton).toHaveBeenCalled();
    });
  });

  describe('startAnimation()', () => {
    beforeEach(() => {
      ecgPlayer.startAnimation = ECGPlayer.startAnimation;
      ecgPlayer.startAnimationLoop = vi.fn();
      global.Date.now.mockReturnValue(1000);
    });

    it('should initialize animation state', () => {
      ecgPlayer.startAnimation();
      
      expect(ecgPlayer.isPlaying).toBe(true);
      expect(ecgPlayer.startTime).toBe(1000);
      expect(ecgPlayer.pausedTime).toBe(0);
      expect(ecgPlayer.animationCycle).toBe(0);
      expect(ecgPlayer.cursorPosition).toBe(0);
      expect(ecgPlayer.allLeadsVisibleData).toBe(null);
      expect(ecgPlayer.startAnimationLoop).toHaveBeenCalled();
    });
  });

  describe('resumeAnimation()', () => {
    beforeEach(() => {
      ecgPlayer.resumeAnimation = ECGPlayer.resumeAnimation;
      ecgPlayer.startAnimation = vi.fn();
      ecgPlayer.startAnimationLoop = vi.fn();
      global.Date.now.mockReturnValue(2000);
    });

    it('should start new animation if no start time', () => {
      ecgPlayer.startTime = null;
      
      ecgPlayer.resumeAnimation();
      
      expect(ecgPlayer.startAnimation).toHaveBeenCalled();
    });

    it('should resume from paused state', () => {
      ecgPlayer.startTime = 1000;
      ecgPlayer.pausedTime = 1500;
      
      ecgPlayer.resumeAnimation();
      
      expect(ecgPlayer.startTime).toBe(1500); // 1000 + (2000 - 1500)
      expect(ecgPlayer.pausedTime).toBe(0);
      expect(ecgPlayer.startAnimationLoop).toHaveBeenCalled();
    });
  });

  describe('pauseAnimation()', () => {
    beforeEach(() => {
      ecgPlayer.pauseAnimation = ECGPlayer.pauseAnimation;
      ecgPlayer.stopAnimation = vi.fn();
      ecgPlayer.processAnimationFrame = vi.fn();
      ecgPlayer.startTime = 1000;
      global.Date.now.mockReturnValue(2000);
    });

    it('should pause animation and render final frame', () => {
      ecgPlayer.pauseAnimation();
      
      expect(ecgPlayer.pausedTime).toBe(2000);
      expect(ecgPlayer.stopAnimation).toHaveBeenCalled();
      expect(ecgPlayer.processAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('stopAnimation()', () => {
    beforeEach(() => {
      ecgPlayer.stopAnimation = ECGPlayer.stopAnimation;
      ecgPlayer.animationId = 123;
      ecgPlayer.isPlaying = true;
    });

    it('should cancel animation frame and set state', () => {
      ecgPlayer.stopAnimation();
      
      expect(global.cancelAnimationFrame).toHaveBeenCalledWith(123);
      expect(ecgPlayer.animationId).toBe(null);
      expect(ecgPlayer.isPlaying).toBe(false);
    });

    it('should handle null animation ID gracefully', () => {
      ecgPlayer.animationId = null;
      
      ecgPlayer.stopAnimation();
      
      expect(global.cancelAnimationFrame).not.toHaveBeenCalled();
      expect(ecgPlayer.isPlaying).toBe(false);
    });
  });

  describe('resetPlayback()', () => {
    beforeEach(() => {
      ecgPlayer.resetPlayback = ECGPlayer.resetPlayback;
      ecgPlayer.stopAnimation = vi.fn();
      ecgPlayer.clearWaveform = vi.fn();
      ecgPlayer.qrsFlashTimeout = 456;
      ecgPlayer.lastQrsIndex = 5;
      ecgPlayer.qrsDetectedCount = 3;
      ecgPlayer.qrsFlashActive = true;
      global.clearTimeout = vi.fn();
    });

    it('should reset all playback state', () => {
      ecgPlayer.resetPlayback();
      
      expect(ecgPlayer.stopAnimation).toHaveBeenCalled();
      expect(ecgPlayer.startTime).toBe(null);
      expect(ecgPlayer.pausedTime).toBe(0);
      expect(ecgPlayer.animationCycle).toBe(0);
      expect(ecgPlayer.cursorPosition).toBe(0);
      expect(ecgPlayer.allLeadsVisibleData).toBe(null);
      expect(ecgPlayer.clearWaveform).toHaveBeenCalled();
    });

    it('should reset QRS tracking state', () => {
      ecgPlayer.resetPlayback();
      
      expect(ecgPlayer.lastQrsIndex).toBe(-1);
      expect(ecgPlayer.qrsDetectedCount).toBe(0);
      expect(global.clearTimeout).toHaveBeenCalledWith(456);
      expect(ecgPlayer.qrsFlashTimeout).toBe(null);
      expect(ecgPlayer.qrsFlashActive).toBe(false);
    });
  });

  describe('calculateCursorPosition()', () => {
    beforeEach(() => {
      ecgPlayer.calculateCursorPosition = ECGPlayer.calculateCursorPosition;
    });

    it('should calculate cursor position based on elapsed time', () => {
      ecgPlayer.calculateCursorPosition(1.25); // Half of widthSeconds
      
      expect(ecgPlayer.cursorPosition).toBe(500); // Half of chartWidth
    });

    it('should wrap cursor position for multiple cycles', () => {
      ecgPlayer.calculateCursorPosition(5.0); // 2 full cycles
      
      expect(ecgPlayer.cursorPosition).toBe(0); // Back to start
    });

    it('should handle fractional cycle correctly', () => {
      ecgPlayer.calculateCursorPosition(3.75); // 1.5 cycles
      
      expect(ecgPlayer.cursorPosition).toBe(500); // Half of chartWidth
    });
  });

  describe('handlePlaybackEnd()', () => {
    beforeEach(() => {
      ecgPlayer.handlePlaybackEnd = ECGPlayer.handlePlaybackEnd;
      ecgPlayer.resetPlayback = vi.fn();
      ecgPlayer.startAnimation = vi.fn();
      ecgPlayer.stopAnimation = vi.fn();
      ecgPlayer.updatePlayPauseButton = vi.fn();
    });

    it('should loop playback when enabled', () => {
      ecgPlayer.loopEnabled = true;
      
      ecgPlayer.handlePlaybackEnd();
      
      expect(ecgPlayer.pushEventTo).toHaveBeenCalledWith('test-component', 'playback_ended', {});
      expect(ecgPlayer.resetPlayback).toHaveBeenCalled();
      expect(ecgPlayer.startAnimation).toHaveBeenCalled();
    });

    it('should stop playback when loop disabled', () => {
      ecgPlayer.loopEnabled = false;
      
      ecgPlayer.handlePlaybackEnd();
      
      expect(ecgPlayer.pushEventTo).toHaveBeenCalledWith('test-component', 'playback_ended', {});
      expect(ecgPlayer.stopAnimation).toHaveBeenCalled();
      expect(ecgPlayer.resetPlayback).toHaveBeenCalled();
      expect(ecgPlayer.updatePlayPauseButton).toHaveBeenCalled();
    });
  });

  describe('processAnimationFrame()', () => {
    beforeEach(() => {
      ecgPlayer.processAnimationFrame = ECGPlayer.processAnimationFrame;
      ecgPlayer.handlePlaybackEnd = vi.fn();
      ecgPlayer.checkQrsOccurrences = vi.fn();
      ecgPlayer.calculateCursorPosition = vi.fn();
      ecgPlayer.loadVisibleDataForSingleLead = vi.fn();
      ecgPlayer.loadVisibleDataForAllLeads = vi.fn();
      ecgPlayer.displayMode = 'single';
      ecgPlayer.activeCursorData = { times: [0, 0.1], values: [0, 0.1] };
      ecgPlayer.renderLeadWaveform = vi.fn();
      ecgPlayer.currentLead = 0;
      ecgPlayer.chartWidth = 1000;
      ecgPlayer.heightScale = 1.0;
    });

    it('should end playback when elapsed time exceeds total duration', () => {
      // Test with cursor progress and cycle that would exceed total duration
      ecgPlayer.processAnimationFrame(0.5, 4); // 4 * 2.5 + 0.5 * 2.5 = 11.25 > 10.0
      
      expect(ecgPlayer.handlePlaybackEnd).toHaveBeenCalled();
    });

    it('should process frame normally within duration', () => {
      const cursorProgress = 0.5;
      const animationCycle = 2;
      
      ecgPlayer.processAnimationFrame(cursorProgress, animationCycle);
      
      expect(ecgPlayer.checkQrsOccurrences).toHaveBeenCalled();
      expect(ecgPlayer.calculateCursorPosition).toHaveBeenCalled();
      expect(ecgPlayer.loadVisibleDataForSingleLead).toHaveBeenCalled();
    });

    it('should handle single lead display mode', () => {
      ecgPlayer.displayMode = 'single';
      
      ecgPlayer.processAnimationFrame(0.5, 1);
      
      expect(ecgPlayer.loadVisibleDataForSingleLead).toHaveBeenCalled();
      expect(ecgPlayer.renderLeadWaveform).toHaveBeenCalled();
    });

    it('should handle multi lead display mode', () => {
      ecgPlayer.displayMode = 'multi';
      ecgPlayer.allLeadsCursorData = [
        { leadIndex: 0, times: [0, 0.1], values: [0, 0.1] },
        { leadIndex: 1, times: [0, 0.1], values: [0, 0.1] }
      ];
      ecgPlayer.calculateLeadGridCoordinates = vi.fn().mockReturnValue({
        xOffset: 0,
        yOffset: 0,
        columnWidth: 250
      });
      ecgPlayer.leadHeight = 150;
      ecgPlayer.cursorPosition = 500;
      
      ecgPlayer.processAnimationFrame(0.5, 1);
      
      expect(ecgPlayer.loadVisibleDataForAllLeads).toHaveBeenCalled();
      expect(ecgPlayer.renderLeadWaveform).toHaveBeenCalledTimes(2);
    });

    it('should return early if no cursor data available', () => {
      ecgPlayer.activeCursorData = null;
      
      ecgPlayer.processAnimationFrame(0.5, 1);
      
      expect(ecgPlayer.renderLeadWaveform).not.toHaveBeenCalled();
    });
  });

  describe('QRS Flash Animation', () => {
    beforeEach(() => {
      ecgPlayer.qrsFlashContext = {
        fillStyle: '',
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn()
      };
      ecgPlayer.qrsFlashActive = true;
      ecgPlayer.chartWidth = 1000;
      ecgPlayer.processAnimationFrame = ECGPlayer.processAnimationFrame;
      ecgPlayer.handlePlaybackEnd = vi.fn();
      ecgPlayer.checkQrsOccurrences = vi.fn();
      ecgPlayer.calculateCursorPosition = vi.fn();
      ecgPlayer.loadVisibleDataForSingleLead = vi.fn();
      ecgPlayer.displayMode = 'single';
      ecgPlayer.activeCursorData = { times: [0], values: [0] };
      ecgPlayer.renderLeadWaveform = vi.fn();
    });

    it('should render QRS flash indicator when active', () => {
      ecgPlayer.processAnimationFrame(0.5, 1);
      
      expect(ecgPlayer.qrsFlashContext.fillStyle).toBe('#ff0000');
      expect(ecgPlayer.qrsFlashContext.beginPath).toHaveBeenCalled();
      expect(ecgPlayer.qrsFlashContext.arc).toHaveBeenCalledWith(985, 15, 5, 0, 2 * Math.PI);
      expect(ecgPlayer.qrsFlashContext.fill).toHaveBeenCalled();
    });

    it('should not render QRS flash when inactive', () => {
      ecgPlayer.qrsFlashActive = false;
      
      ecgPlayer.processAnimationFrame(0.5, 1);
      
      expect(ecgPlayer.qrsFlashContext.beginPath).not.toHaveBeenCalled();
    });
  });
});