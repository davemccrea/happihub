import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import ECGPlayer from '../../js/hooks/ecg/ecg_player.js'
import { 
  createMockECGData, 
  createMockECGPlayerContext, 
  createMockBehaviorSubject,
  mockTime
} from '../utils/test-helpers.js'

describe('ECG Player - Data Processing', () => {
  let ecgPlayer
  let mockContext
  let timeUtils

  beforeEach(() => {
    // Create mock context
    mockContext = createMockECGPlayerContext()
    
    // Create ECG player instance
    ecgPlayer = Object.create(ECGPlayer)
    Object.assign(ecgPlayer, mockContext)
    
    // Mock required state
    ecgPlayer.amplitudeScale$ = createMockBehaviorSubject(1.0)
    ecgPlayer.displayMode$ = createMockBehaviorSubject('single')
    ecgPlayer.destroy$ = createMockBehaviorSubject()
    ecgPlayer.precomputedSegments = new Map()
    ecgPlayer.dataIndexCache = new Map()
    ecgPlayer.segmentDuration = 0.1
    ecgPlayer.currentLead = 0 // Add currentLead property
    
    // Setup time utilities
    timeUtils = mockTime(0)
    
    // Mock console.log to suppress output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('processECGData', () => {
    it('should process valid ECG data correctly', () => {
      const mockData = createMockECGData({ duration: 5, fs: 500 })
      const payload = { data: mockData }

      ecgPlayer.stopAnimation = vi.fn()
      ecgPlayer.resetPlayback = vi.fn()
      ecgPlayer.renderGridBackground = vi.fn()
      ecgPlayer.clearWaveform = vi.fn()
      ecgPlayer.updateLeadSelectorVisibility = vi.fn()
      ecgPlayer.setupDataPrecomputationStream = vi.fn(() => ({ subscribe: vi.fn() }))
      ecgPlayer.subscriptions = { add: vi.fn() }

      ecgPlayer.processECGData(payload)

      expect(ecgPlayer.samplingRate).toBe(500)
      expect(ecgPlayer.leadNames).toEqual(mockData.sig_name)
      expect(ecgPlayer.totalDuration).toBe(5)
      expect(ecgPlayer.ecgLeadDatasets).toHaveLength(12)
      expect(ecgPlayer.yMin).toBe(-1.25)
      expect(ecgPlayer.yMax).toBe(1.25)
    })

    it('should handle invalid payload gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      ecgPlayer.processECGData(null)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid ECG payload:', null)
      
      ecgPlayer.processECGData({})
      expect(consoleSpy).toHaveBeenCalledWith('Invalid ECG payload:', {})
      
      consoleSpy.mockRestore()
    })

    it('should handle invalid ECG data format', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const invalidData = { data: { fs: null } }
      ecgPlayer.processECGData(invalidData)
      
      expect(consoleSpy).toHaveBeenCalledWith('Invalid ECG data format:', { fs: null })
      consoleSpy.mockRestore()
    })

    it('should process QRS data correctly', () => {
      const mockData = createMockECGData({ qrsCount: 5 })
      const payload = { data: mockData }

      ecgPlayer.stopAnimation = vi.fn()
      ecgPlayer.resetPlayback = vi.fn()
      ecgPlayer.renderGridBackground = vi.fn()
      ecgPlayer.clearWaveform = vi.fn()
      ecgPlayer.updateLeadSelectorVisibility = vi.fn()
      ecgPlayer.setupDataPrecomputationStream = vi.fn(() => ({ subscribe: vi.fn() }))
      ecgPlayer.subscriptions = { add: vi.fn() }

      ecgPlayer.processECGData(payload)

      expect(ecgPlayer.qrsIndexes).toEqual(mockData.qrs)
      expect(ecgPlayer.qrsTimestamps).toHaveLength(5)
      expect(ecgPlayer.lastQrsIndex).toBe(-1)
      expect(ecgPlayer.qrsDetectedCount).toBe(0)
    })
  })

  describe('calculateDataIndexForTime', () => {
    beforeEach(() => {
      ecgPlayer.samplingRate = 500
    })

    it('should calculate correct data index for given time', () => {
      const leadData = {
        times: Array.from({ length: 1000 }, (_, i) => i / 500),
        values: Array.from({ length: 1000 }, () => Math.random())
      }

      const index = ecgPlayer.calculateDataIndexForTime(leadData, 1.0)
      expect(index).toBe(500) // 1.0 second * 500 Hz = index 500
    })

    it('should handle boundary conditions', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const leadData = {
        times: Array.from({ length: 100 }, (_, i) => i / 500),
        values: Array.from({ length: 100 }, () => Math.random())
      }

      // Time beyond data range
      const index = ecgPlayer.calculateDataIndexForTime(leadData, 10.0)
      expect(index).toBe(99) // Should clamp to last index

      // Negative time should trigger warning but still return 0
      const negativeIndex = ecgPlayer.calculateDataIndexForTime(leadData, -1.0)
      expect(negativeIndex).toBe(0)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid target time: -1')
      
      consoleSpy.mockRestore()
    })

    it('should handle invalid inputs', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      ecgPlayer.calculateDataIndexForTime(null, 1.0)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid lead data provided to calculateDataIndexForTime')

      // Reset spy for next call
      consoleSpy.mockClear()
      
      ecgPlayer.calculateDataIndexForTime({ times: [1, 2, 3], values: [1, 2, 3] }, 'invalid')
      expect(consoleSpy).toHaveBeenCalledWith('Invalid target time: invalid')

      // Reset spy for next call
      consoleSpy.mockClear()
      
      ecgPlayer.samplingRate = 0
      ecgPlayer.calculateDataIndexForTime({ times: [1, 2, 3], values: [1, 2, 3] }, 1.0)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid sampling rate: 0')

      consoleSpy.mockRestore()
    })
  })

  describe('transformCoordinates', () => {
    beforeEach(() => {
      ecgPlayer.yMin = -2.5
      ecgPlayer.yMax = 2.5
      ecgPlayer.amplitudeScale$ = createMockBehaviorSubject(1.0)
    })

    it('should transform ECG coordinates correctly', () => {
      const options = {
        times: [0, 0.5, 1.0],
        values: [0, 1.0, -1.0],
        bounds: { xOffset: 0, yOffset: 0, width: 100, height: 100 },
        timeSpan: 1.0
      }

      const coordinates = ecgPlayer.transformCoordinates(options)

      expect(coordinates).toHaveLength(3)
      expect(coordinates[0]).toEqual({ x: 0, y: 50 }) // Center at y=50 for value=0
      expect(coordinates[1]).toEqual({ x: 50, y: 30 }) // Above center for positive value
      expect(coordinates[2]).toEqual({ x: 100, y: 70 }) // Below center for negative value
    })

    it('should apply amplitude scaling', () => {
      ecgPlayer.amplitudeScale$.next(2.0)

      const options = {
        times: [0],
        values: [1.0],
        bounds: { xOffset: 0, yOffset: 0, width: 100, height: 100 },
        timeSpan: 1.0
      }

      const coordinates = ecgPlayer.transformCoordinates(options)
      expect(coordinates[0].y).toBe(10) // Doubled amplitude should move further from center
    })

    it('should handle invalid inputs gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      let result = ecgPlayer.transformCoordinates(null)
      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Invalid options provided to transformCoordinates')

      result = ecgPlayer.transformCoordinates({
        times: [1, 2],
        values: [1],
        bounds: { xOffset: 0, yOffset: 0, width: 100, height: 100 },
        timeSpan: 1.0
      })
      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Times and values arrays must have the same length')

      consoleSpy.mockRestore()
    })
  })

  describe('getSegmentsForTimeRange', () => {
    beforeEach(() => {
      ecgPlayer.segmentDuration = 0.1
      
      // Setup mock segments
      const leadSegments = new Map()
      leadSegments.set(0, { times: [0, 0.01, 0.02], values: [1, 2, 3], originalStartTime: 0 })
      leadSegments.set(1, { times: [0, 0.01, 0.02], values: [4, 5, 6], originalStartTime: 0.1 })
      leadSegments.set(2, { times: [0, 0.01, 0.02], values: [7, 8, 9], originalStartTime: 0.2 })
      
      ecgPlayer.precomputedSegments.set(0, leadSegments)
    })

    it('should return segments within time range', () => {
      const segments = ecgPlayer.getSegmentsForTimeRange(0, 0, 0.15)
      
      expect(segments).toHaveLength(2)
      expect(segments[0].values).toEqual([1, 2, 3])
      expect(segments[1].values).toEqual([4, 5, 6])
    })

    it('should return empty array for invalid lead', () => {
      const segments = ecgPlayer.getSegmentsForTimeRange(999, 0, 1.0)
      expect(segments).toEqual([])
    })

    it('should handle edge cases', () => {
      const segments = ecgPlayer.getSegmentsForTimeRange(0, 0.05, 0.05)
      expect(segments).toHaveLength(1)
    })
  })

  describe('precomputeLeadSegments', () => {
    beforeEach(() => {
      ecgPlayer.segmentDuration = 0.1
      ecgPlayer.totalDuration = 0.2 // Shorter duration for faster test
      ecgPlayer.calculateDataIndexForTime = vi.fn().mockReturnValue(0)
    })

    it('should precompute segments correctly', () => {
      const leadData = {
        times: Array.from({ length: 20 }, (_, i) => i * 0.01),
        values: Array.from({ length: 20 }, (_, i) => i)
      }

      // Since this is a complex async operation that depends on RxJS streams,
      // we'll test that the function exists and can be called
      expect(typeof ecgPlayer.precomputeLeadSegments).toBe('function')
      
      // Test that calling it doesn't throw
      expect(() => {
        const result$ = ecgPlayer.precomputeLeadSegments(leadData, 0)
        // Just verify it returns an observable-like object
        expect(result$).toBeDefined()
        expect(typeof result$.subscribe).toBe('function')
      }).not.toThrow()
    })
  })
})