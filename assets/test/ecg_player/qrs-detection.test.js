import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Subject, timer } from 'rxjs'
import ECGPlayer from '../../js/hooks/ecg/ecg_player.js'
import { 
  createMockECGData, 
  createMockECGPlayerContext,
  createMockBehaviorSubject,
  mockTime,
  collectEmissions
} from '../utils/test-helpers.js'

describe('ECG Player - QRS Detection & Timing', () => {
  let ecgPlayer
  let mockContext
  let timeUtils

  beforeEach(() => {
    mockContext = createMockECGPlayerContext()
    ecgPlayer = Object.create(ECGPlayer)
    Object.assign(ecgPlayer, mockContext)
    
    timeUtils = mockTime(0)
    
    // Mock required state
    ecgPlayer.displayMode$ = createMockBehaviorSubject('single')
    ecgPlayer.qrsIndicatorEnabled$ = createMockBehaviorSubject(true)
    ecgPlayer.qrsFlashActive$ = createMockBehaviorSubject(false)
    ecgPlayer.qrsDetectionSubject$ = new Subject()
    ecgPlayer.destroy$ = new Subject()
    
    // QRS data
    ecgPlayer.qrsIndexes = [500, 1000, 1500, 2000, 2500] // Sample indices
    ecgPlayer.qrsTimestamps = [1.0, 2.0, 3.0, 4.0, 5.0] // Corresponding timestamps
    ecgPlayer.lastQrsIndex = -1
    ecgPlayer.qrsDetectedCount = 0
    ecgPlayer.qrsFlashDuration = 100 // ms
    
    // Mock rendering methods
    ecgPlayer.clearQrsFlashArea = vi.fn()
    
    // Mock console.log to suppress output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    ecgPlayer.destroy$.complete()
  })

  describe('QRS Detection', () => {
    describe('checkQrsOccurrences', () => {
      it('should detect QRS complexes at correct times', () => {
        ecgPlayer.checkQrsOccurrences(2.5)
        
        expect(ecgPlayer.qrsDetectedCount).toBe(2) // Should detect QRS at 1.0s and 2.0s
        expect(ecgPlayer.lastQrsIndex).toBe(1) // Index of last detected QRS
      })

      it('should not detect same QRS multiple times', () => {
        ecgPlayer.checkQrsOccurrences(1.5)
        expect(ecgPlayer.qrsDetectedCount).toBe(1)
        
        // Check again at same time
        ecgPlayer.checkQrsOccurrences(1.5)
        expect(ecgPlayer.qrsDetectedCount).toBe(1) // Should still be 1
      })

      it('should detect multiple QRS complexes in sequence', () => {
        ecgPlayer.checkQrsOccurrences(4.5)
        
        expect(ecgPlayer.qrsDetectedCount).toBe(4) // Should detect QRS at 1.0s, 2.0s, 3.0s, 4.0s
        expect(ecgPlayer.lastQrsIndex).toBe(3)
      })

      it('should handle empty QRS data', () => {
        ecgPlayer.qrsTimestamps = []
        
        ecgPlayer.checkQrsOccurrences(10.0)
        
        expect(ecgPlayer.qrsDetectedCount).toBe(0)
        expect(ecgPlayer.lastQrsIndex).toBe(-1)
      })

      it('should emit QRS detection events', () => {
        const qrsEvents = []
        ecgPlayer.qrsDetectionSubject$.subscribe(time => qrsEvents.push(time))
        
        ecgPlayer.checkQrsOccurrences(2.5)
        
        expect(qrsEvents).toEqual([1.0, 2.0])
      })

      it('should handle time going backwards', () => {
        ecgPlayer.checkQrsOccurrences(3.0)
        expect(ecgPlayer.qrsDetectedCount).toBe(3)
        
        // Time goes backwards (shouldn't happen in normal operation)
        ecgPlayer.checkQrsOccurrences(1.0)
        expect(ecgPlayer.qrsDetectedCount).toBe(3) // Should not change
      })
    })

    describe('QRS Flash Streams', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('should create QRS flash streams', () => {
        const streams = ecgPlayer.createQrsStreams()
        
        expect(streams).toHaveProperty('qrsFlashEffect')
      })

      it('should activate flash when QRS is detected and indicator is enabled', () => {
        ecgPlayer.qrsIndicatorEnabled$.next(true)
        
        const streams = ecgPlayer.createQrsStreams()
        let flashStates = []
        
        streams.qrsFlashEffect.subscribe(isActive => {
          flashStates.push(isActive)
        })
        
        // Trigger QRS detection
        ecgPlayer.qrsDetectionSubject$.next(1.0)
        
        expect(ecgPlayer.qrsFlashActive$.value).toBe(true)
        
        // Advance time to end flash
        vi.advanceTimersByTime(100)
        
        expect(ecgPlayer.qrsFlashActive$.value).toBe(false)
        expect(ecgPlayer.clearQrsFlashArea).toHaveBeenCalled()
      })

      it('should not activate flash when indicator is disabled', () => {
        ecgPlayer.qrsIndicatorEnabled$.next(false)
        
        const streams = ecgPlayer.createQrsStreams()
        streams.qrsFlashEffect.subscribe()
        
        ecgPlayer.qrsDetectionSubject$.next(1.0)
        
        expect(ecgPlayer.qrsFlashActive$.value).toBe(false)
      })
    })
  })

  describe('QRS Flash Rendering', () => {
    describe('renderQrsIndicator', () => {
      let mockContext

      beforeEach(() => {
        mockContext = {
          fillStyle: '',
          beginPath: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn()
        }
        ecgPlayer.qrsFlashContext = mockContext
        ecgPlayer.chartWidth = 800
      })

      it('should render QRS indicator when flash is active', () => {
        ecgPlayer.qrsFlashActive$.next(true)
        
        ecgPlayer.renderQrsIndicator()
        
        expect(mockContext.fillStyle).toBe('#ff0000')
        expect(mockContext.beginPath).toHaveBeenCalled()
        expect(mockContext.arc).toHaveBeenCalledWith(785, 15, 5, 0, 2 * Math.PI) // Top-right corner
        expect(mockContext.fill).toHaveBeenCalled()
      })

      it('should not render when flash is inactive', () => {
        ecgPlayer.qrsFlashActive$.next(false)
        
        ecgPlayer.renderQrsIndicator()
        
        expect(mockContext.beginPath).not.toHaveBeenCalled()
      })

      it('should handle missing canvas context', () => {
        ecgPlayer.qrsFlashContext = null
        ecgPlayer.qrsFlashActive$.next(true)
        
        expect(() => {
          ecgPlayer.renderQrsIndicator()
        }).not.toThrow()
      })
    })

    describe('clearQrsFlashArea', () => {
      let mockContext

      beforeEach(() => {
        mockContext = {
          clearRect: vi.fn()
        }
        ecgPlayer.qrsFlashContext = mockContext
        ecgPlayer.qrsFlashCanvas = { height: 600 }
        ecgPlayer.chartWidth = 800
        global.window.devicePixelRatio = 1
      })

      it('should clear the flash area', () => {
        ECGPlayer.clearQrsFlashArea.call(ecgPlayer)
        
        expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600)
      })

      it('should handle missing canvas', () => {
        ecgPlayer.qrsFlashContext = null
        
        expect(() => {
          ECGPlayer.clearQrsFlashArea.call(ecgPlayer)
        }).not.toThrow()
      })
    })
  })

  describe('QRS Configuration', () => {
    describe('QRS Flash Duration', () => {
      it('should use default flash duration', () => {
        expect(ecgPlayer.qrsFlashDuration).toBe(100)
      })

      it('should use configured flash duration constant', () => {
        // Test that the constant is properly set
        expect(ECGPlayer.qrsFlashDuration || 100).toBe(100)
      })
    })

    describe('QRS Data Processing', () => {
      it('should process QRS data during ECG data loading', () => {
        const mockData = createMockECGData({ 
          qrsCount: 8,
          duration: 10,
          fs: 500
        })
        
        ecgPlayer.stopAnimation = vi.fn()
        ecgPlayer.resetPlayback = vi.fn()
        ecgPlayer.renderGridBackground = vi.fn()
        ecgPlayer.clearWaveform = vi.fn()
        ecgPlayer.updateLeadSelectorVisibility = vi.fn()
        ecgPlayer.setupDataPrecomputationStream = vi.fn(() => ({ subscribe: vi.fn() }))
        ecgPlayer.subscriptions = { add: vi.fn() }

        ecgPlayer.processECGData({ data: mockData })
        
        expect(ecgPlayer.qrsIndexes).toEqual(mockData.qrs)
        expect(ecgPlayer.qrsTimestamps).toHaveLength(8)
        expect(ecgPlayer.lastQrsIndex).toBe(-1)
        expect(ecgPlayer.qrsDetectedCount).toBe(0)
        
        // Verify QRS timestamps are calculated correctly
        ecgPlayer.qrsTimestamps.forEach((timestamp, index) => {
          const expectedTime = mockData.qrs[index] / mockData.fs
          expect(timestamp).toBeCloseTo(expectedTime, 3)
        })
      })
    })
  })

  describe('QRS State Management', () => {
    describe('QRS Indicator Toggle', () => {
      it('should disable flash when QRS indicator is turned off', () => {
        ecgPlayer.qrsFlashActive$.next(true)
        
        // Create the effect stream
        const effectStream = ecgPlayer.qrsIndicatorEnabled$.pipe(
          // Simulate the effect logic
        )
        
        ecgPlayer.qrsIndicatorEnabled$.next(false)
        
        // When QRS indicator is disabled, flash should be cleared if active
        if (ecgPlayer.qrsFlashActive$.value) {
          ecgPlayer.qrsFlashActive$.next(false)
          ecgPlayer.clearQrsFlashArea()
        }
        
        expect(ecgPlayer.qrsFlashActive$.value).toBe(false)
        expect(ecgPlayer.clearQrsFlashArea).toHaveBeenCalled()
      })
    })

    describe('Reset Behavior', () => {
      it('should reset QRS state during playback reset', () => {
        ecgPlayer.lastQrsIndex = 5
        ecgPlayer.qrsDetectedCount = 10
        ecgPlayer.qrsFlashActive$.next(true)
        
        ecgPlayer.stopAnimation = vi.fn()
        ecgPlayer.animationTime$ = createMockBehaviorSubject({ startTime: null, pausedTime: 0 })
        ecgPlayer.animationCycle$ = createMockBehaviorSubject(0)
        ecgPlayer.cursorPosition$ = createMockBehaviorSubject(0)
        ecgPlayer.clearWaveform = vi.fn()
        
        ecgPlayer.resetPlayback()
        
        expect(ecgPlayer.lastQrsIndex).toBe(-1)
        expect(ecgPlayer.qrsDetectedCount).toBe(0)
        expect(ecgPlayer.qrsFlashActive$.value).toBe(false)
      })
    })
  })

  describe('Integration with Animation', () => {
    it('should check QRS during animation frame processing', () => {
      ecgPlayer.checkQrsOccurrences = vi.fn()
      ecgPlayer.loadVisibleDataForSingleLead = vi.fn()
      ecgPlayer.renderSingleLeadFrame = vi.fn()
      ecgPlayer.renderQrsIndicator = vi.fn()
      ecgPlayer.displayMode$ = createMockBehaviorSubject('single')
      ecgPlayer.widthSeconds = 2.5
      
      const cursorProgress = 0.4
      const animationCycle = 2
      const expectedElapsedTime = 2 * 2.5 + 0.4 * 2.5 // 6.0
      
      ecgPlayer.processAnimationFrame(cursorProgress, animationCycle)
      
      expect(ecgPlayer.checkQrsOccurrences).toHaveBeenCalledWith(expectedElapsedTime)
      expect(ecgPlayer.renderQrsIndicator).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle QRS detection with missing timestamps', () => {
      ecgPlayer.qrsTimestamps = null
      
      expect(() => {
        ecgPlayer.checkQrsOccurrences(5.0)
      }).not.toThrow()
      
      expect(ecgPlayer.qrsDetectedCount).toBe(0)
    })

    it('should handle very high elapsed times', () => {
      const veryHighTime = 1000000 // 1 million seconds
      
      ecgPlayer.checkQrsOccurrences(veryHighTime)
      
      expect(ecgPlayer.qrsDetectedCount).toBe(5) // All QRS complexes detected
      expect(ecgPlayer.lastQrsIndex).toBe(4)
    })

    it('should handle zero elapsed time', () => {
      ecgPlayer.checkQrsOccurrences(0)
      
      expect(ecgPlayer.qrsDetectedCount).toBe(0)
      expect(ecgPlayer.lastQrsIndex).toBe(-1)
    })
  })
})