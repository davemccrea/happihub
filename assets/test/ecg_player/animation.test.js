import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { BehaviorSubject, Subject, EMPTY } from 'rxjs'
import ECGPlayer from '../../js/hooks/ecg/ecg_player.js'
import { 
  createMockECGData, 
  createMockECGPlayerContext,
  createMockBehaviorSubject,
  mockAnimationFrame,
  mockTime
} from '../utils/test-helpers.js'

describe('ECG Player - Animation & Cursor', () => {
  let ecgPlayer
  let mockContext
  let animationUtils
  let timeUtils

  beforeEach(() => {
    mockContext = createMockECGPlayerContext()
    ecgPlayer = Object.create(ECGPlayer)
    Object.assign(ecgPlayer, mockContext)
    
    // Setup animation utilities
    animationUtils = mockAnimationFrame()
    timeUtils = mockTime(1000)
    
    // Mock required state
    ecgPlayer.isPlaying$ = createMockBehaviorSubject(false)
    ecgPlayer.animationTime$ = createMockBehaviorSubject({ startTime: null, pausedTime: 0 })
    ecgPlayer.animationCycle$ = createMockBehaviorSubject(0)
    ecgPlayer.cursorPosition$ = createMockBehaviorSubject(0)
    ecgPlayer.displayMode$ = createMockBehaviorSubject('single')
    ecgPlayer.currentLead$ = createMockBehaviorSubject(0)
    ecgPlayer.loopEnabled$ = createMockBehaviorSubject(false)
    ecgPlayer.destroy$ = new Subject()
    
    ecgPlayer.totalDuration = 10
    ecgPlayer.widthSeconds = 2.5
    ecgPlayer.chartWidth = 800
    ecgPlayer.waveformCanvas = { width: 800, height: 600 }
    
    // Mock animation methods
    ecgPlayer.processAnimationFrame = vi.fn()
    ecgPlayer.handlePlaybackEnd = vi.fn()
    ecgPlayer.clearWaveform = vi.fn()
    ecgPlayer.resetPlayback = vi.fn()
    ecgPlayer.startAnimation = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    ecgPlayer.destroy$.complete()
  })

  describe('Animation Control', () => {
    describe('togglePlayback', () => {
      it('should start playback when not playing', () => {
        ecgPlayer.resumeAnimation = vi.fn()
        ecgPlayer.pauseAnimation = vi.fn()
        
        ecgPlayer.isPlaying$.next(false)
        ecgPlayer.togglePlayback()
        
        expect(ecgPlayer.isPlaying$.value).toBe(true)
        expect(ecgPlayer.resumeAnimation).toHaveBeenCalled()
        expect(ecgPlayer.pauseAnimation).not.toHaveBeenCalled()
      })

      it('should pause playback when playing', () => {
        ecgPlayer.resumeAnimation = vi.fn()
        ecgPlayer.pauseAnimation = vi.fn()
        
        ecgPlayer.isPlaying$.next(true)
        ecgPlayer.togglePlayback()
        
        expect(ecgPlayer.isPlaying$.value).toBe(false)
        expect(ecgPlayer.pauseAnimation).toHaveBeenCalled()
        expect(ecgPlayer.resumeAnimation).not.toHaveBeenCalled()
      })
    })

    describe('startAnimation', () => {
      it('should initialize animation state correctly', () => {
        // Call the actual ECG Player method
        ECGPlayer.startAnimation.call(ecgPlayer)
        
        expect(ecgPlayer.isPlaying$.value).toBe(true)
        expect(ecgPlayer.animationTime$.value.startTime).toBeTruthy()
        expect(ecgPlayer.animationTime$.value.pausedTime).toBe(0)
        expect(ecgPlayer.animationCycle$.value).toBe(0)
        expect(ecgPlayer.cursorPosition$.value).toBe(0)
      })
    })

    describe('pauseAnimation', () => {
      it('should pause animation and record pause time', () => {
        const startTime = 1000
        ecgPlayer.animationTime$.next({ startTime, pausedTime: 0 })
        
        timeUtils.setTime(1500) // 500ms later
        ECGPlayer.pauseAnimation.call(ecgPlayer)
        
        expect(ecgPlayer.isPlaying$.value).toBe(false)
        expect(ecgPlayer.animationTime$.value.startTime).toBe(startTime)
        expect(ecgPlayer.animationTime$.value.pausedTime).toBe(1500)
        expect(ecgPlayer.processAnimationFrame).toHaveBeenCalled()
      })
    })

    describe('resumeAnimation', () => {
      it('should start new animation if no previous start time', () => {
        ecgPlayer.animationTime$.next({ startTime: null, pausedTime: 0 })
        ecgPlayer.startAnimation = vi.fn()
        
        ECGPlayer.resumeAnimation.call(ecgPlayer)
        
        expect(ecgPlayer.startAnimation).toHaveBeenCalled()
      })

      it('should resume from paused state', () => {
        const startTime = 1000
        const pausedTime = 1500
        ecgPlayer.animationTime$.next({ startTime, pausedTime })
        
        timeUtils.setTime(2000) // Resume 500ms after pause
        ECGPlayer.resumeAnimation.call(ecgPlayer)
        
        expect(ecgPlayer.isPlaying$.value).toBe(true)
        // New start time should account for pause duration
        expect(ecgPlayer.animationTime$.value.startTime).toBe(1500) // 1000 + (2000 - 1500)
        expect(ecgPlayer.animationTime$.value.pausedTime).toBe(0)
      })
    })

    describe('stopAnimation', () => {
      it('should stop animation', () => {
        ecgPlayer.isPlaying$.next(true)
        ECGPlayer.stopAnimation.call(ecgPlayer)
        
        expect(ecgPlayer.isPlaying$.value).toBe(false)
      })
    })

    describe('resetPlayback', () => {
      it('should reset all animation state', () => {
        ecgPlayer.stopAnimation = vi.fn()
        ecgPlayer.qrsFlashActive$ = createMockBehaviorSubject(true)
        
        ECGPlayer.resetPlayback.call(ecgPlayer)
        
        expect(ecgPlayer.stopAnimation).toHaveBeenCalled()
        expect(ecgPlayer.animationTime$.value).toEqual({ startTime: null, pausedTime: 0 })
        expect(ecgPlayer.animationCycle$.value).toBe(0)
        expect(ecgPlayer.cursorPosition$.value).toBe(0)
        expect(ecgPlayer.qrsFlashActive$.value).toBe(false)
        expect(ecgPlayer.clearWaveform).toHaveBeenCalled()
      })
    })
  })

  describe('Animation Frames', () => {
    describe('processAnimationFrame', () => {
      beforeEach(() => {
        ecgPlayer.checkQrsOccurrences = vi.fn()
        ecgPlayer.loadVisibleDataForSingleLead = vi.fn()
        ecgPlayer.loadVisibleDataForAllLeads = vi.fn()
        ecgPlayer.renderSingleLeadFrame = vi.fn()
        ecgPlayer.renderMultiLeadFrame = vi.fn()
        ecgPlayer.renderQrsIndicator = vi.fn()
      })

      it('should process single lead frame correctly', () => {
        ecgPlayer.displayMode$.next('single')
        
        ECGPlayer.processAnimationFrame.call(ecgPlayer, 0.5, 1)
        
        expect(ecgPlayer.checkQrsOccurrences).toHaveBeenCalledWith(3.75) // 1 * 2.5 + 0.5 * 2.5
        expect(ecgPlayer.loadVisibleDataForSingleLead).toHaveBeenCalledWith(3.75)
        expect(ecgPlayer.renderSingleLeadFrame).toHaveBeenCalled()
        expect(ecgPlayer.renderQrsIndicator).toHaveBeenCalled()
      })

      it('should process multi lead frame correctly', () => {
        ecgPlayer.displayMode$.next('multi')
        
        ECGPlayer.processAnimationFrame.call(ecgPlayer, 0.3, 2)
        
        const expectedTime = 2 * 2.5 + 0.3 * 2.5 // 5.75
        expect(ecgPlayer.checkQrsOccurrences).toHaveBeenCalledWith(expectedTime)
        expect(ecgPlayer.loadVisibleDataForAllLeads).toHaveBeenCalledWith(expectedTime)
        expect(ecgPlayer.renderMultiLeadFrame).toHaveBeenCalled()
        expect(ecgPlayer.renderQrsIndicator).toHaveBeenCalled()
      })
    })

    describe('handlePlaybackEnd', () => {
      it('should loop when loop is enabled', () => {
        ecgPlayer.loopEnabled$.next(true)
        ecgPlayer.resetPlayback = vi.fn()
        ecgPlayer.startAnimation = vi.fn()
        
        ECGPlayer.handlePlaybackEnd.call(ecgPlayer)
        
        expect(ecgPlayer.resetPlayback).toHaveBeenCalled()
        expect(ecgPlayer.startAnimation).toHaveBeenCalled()
      })

      it('should stop when loop is disabled', () => {
        ecgPlayer.loopEnabled$.next(false)
        ecgPlayer.stopAnimation = vi.fn()
        ecgPlayer.resetPlayback = vi.fn()
        
        ECGPlayer.handlePlaybackEnd.call(ecgPlayer)
        
        expect(ecgPlayer.stopAnimation).toHaveBeenCalled()
        expect(ecgPlayer.resetPlayback).toHaveBeenCalled()
      })
    })
  })

  describe('Data Loading', () => {
    describe('loadVisibleDataForSingleLead', () => {
      beforeEach(() => {
        ecgPlayer.currentLead$ = createMockBehaviorSubject(0)
        ecgPlayer.getSegmentsForTimeRange = vi.fn()
        ecgPlayer.activeSegments = []
        ecgPlayer.activeCursorData = null
        ecgPlayer.widthSeconds = 2.5
      })

      it('should call getSegmentsForTimeRange correctly', () => {
        ecgPlayer.getSegmentsForTimeRange.mockReturnValue([])
        
        ECGPlayer.loadVisibleDataForSingleLead.call(ecgPlayer, 2.5)
        
        expect(ecgPlayer.getSegmentsForTimeRange).toHaveBeenCalled()
        expect(ecgPlayer.activeCursorData).toEqual({ times: [], values: [] })
      })

      it('should handle empty segments', () => {
        ecgPlayer.getSegmentsForTimeRange.mockReturnValue([])
        
        ECGPlayer.loadVisibleDataForSingleLead.call(ecgPlayer, 2.5)
        
        expect(ecgPlayer.activeCursorData).toEqual({ times: [], values: [] })
      })
    })

    describe('loadVisibleDataForAllLeads', () => {
      beforeEach(() => {
        ecgPlayer.ecgLeadDatasets = Array.from({ length: 3 }, () => ({}))
        ecgPlayer.getSegmentsForTimeRange = vi.fn().mockReturnValue([])
        ecgPlayer.allLeadsCursorData = []
        ecgPlayer.activeSegments = []
        ecgPlayer.widthSeconds = 2.5
      })

      it('should process all leads', () => {
        ECGPlayer.loadVisibleDataForAllLeads.call(ecgPlayer, 1.5)
        
        expect(ecgPlayer.getSegmentsForTimeRange).toHaveBeenCalledTimes(3)
        expect(ecgPlayer.allLeadsCursorData).toBeDefined()
        expect(Array.isArray(ecgPlayer.allLeadsCursorData)).toBe(true)
      })
    })
  })

  describe('Cursor Position', () => {
    it('should have processAnimationFrame method that processes animation data', () => {
      // Test that processAnimationFrame exists and handles the data processing
      ecgPlayer.checkQrsOccurrences = vi.fn()
      ecgPlayer.loadVisibleDataForSingleLead = vi.fn()
      ecgPlayer.renderSingleLeadFrame = vi.fn()
      ecgPlayer.renderQrsIndicator = vi.fn()
      
      const cursorProgress = 0.5
      const animationCycle = 0
      
      // processAnimationFrame should call the expected methods
      ECGPlayer.processAnimationFrame.call(ecgPlayer, cursorProgress, animationCycle)
      
      // Verify the method was called and processed the frame
      expect(ecgPlayer.checkQrsOccurrences).toHaveBeenCalled()
      expect(ecgPlayer.renderQrsIndicator).toHaveBeenCalled()
    })
  })

  describe('Animation Streams', () => {
    it('should create animation streams correctly', () => {
      ecgPlayer.isPlaying$ = createMockBehaviorSubject(false)
      ecgPlayer.animationTime$ = createMockBehaviorSubject({ startTime: Date.now(), pausedTime: 0 })
      ecgPlayer.animationCycle$ = createMockBehaviorSubject(0)
      ecgPlayer.cursorPosition$ = createMockBehaviorSubject(0)
      ecgPlayer.totalDuration = 10
      ecgPlayer.waveformCanvas = true
      
      const streams = ecgPlayer.createAnimationStreams()
      
      expect(streams).toHaveProperty('animationStateEffect')
      expect(streams).toHaveProperty('animationRenderEffect')
      expect(streams).toHaveProperty('animationCompletionEffect')
    })
  })
})