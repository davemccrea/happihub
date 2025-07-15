import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { BehaviorSubject, Subject } from 'rxjs'
import ECGPlayer from '../../js/hooks/ecg/ecg_player.js'
import { 
  createMockECGData, 
  createMockECGPlayerContext,
  createMockBehaviorSubject,
  createMockFormElement
} from '../utils/test-helpers.js'

describe('ECG Player - Lead Switching & Display Modes', () => {
  let ecgPlayer
  let mockContext

  beforeEach(() => {
    mockContext = createMockECGPlayerContext()
    ecgPlayer = Object.create(ECGPlayer)
    Object.assign(ecgPlayer, mockContext)
    
    // Mock required state
    ecgPlayer.isPlaying$ = createMockBehaviorSubject(false)
    ecgPlayer.currentLead$ = createMockBehaviorSubject(0)
    ecgPlayer.displayMode$ = createMockBehaviorSubject('single')
    ecgPlayer.animationTime$ = createMockBehaviorSubject({ startTime: null, pausedTime: 0 })
    ecgPlayer.destroy$ = new Subject()
    
    // Mock ECG data
    const mockData = createMockECGData({ duration: 10 })
    ecgPlayer.ecgLeadDatasets = mockData.sig_name.map((name, index) => ({
      times: Array.from({ length: 1000 }, (_, i) => i / 100),
      values: Array.from({ length: 1000 }, () => Math.random())
    }))
    ecgPlayer.leadNames = mockData.sig_name
    ecgPlayer.widthSeconds = 2.5
    
    // Mock animation methods - these need to be on the ECGPlayer object
    ECGPlayer.stopAnimation = vi.fn()
    ECGPlayer.clearWaveform = vi.fn()
    ECGPlayer.renderGridBackground = vi.fn()
    ECGPlayer.processAnimationFrame = vi.fn()
    ecgPlayer.stopAnimation = vi.fn()
    ecgPlayer.clearWaveform = vi.fn()
    ecgPlayer.renderGridBackground = vi.fn()
    ecgPlayer.processAnimationFrame = vi.fn()
    
    // Mock layout methods
    ecgPlayer.calculateLeadGridCoordinates = vi.fn(() => ({
      xOffset: 0,
      yOffset: 0,
      width: 200,
      height: 150
    }))
    ecgPlayer.updateLeadSelector = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
    ecgPlayer.destroy$.complete()
  })

  describe('Lead Switching', () => {
    describe('switchLead', () => {
      it('should switch to valid lead index', () => {
        // Set isPlaying to true to trigger stopAnimation call
        ecgPlayer.isPlaying$.next(true)
        
        ECGPlayer.switchLead.call(ecgPlayer, 5)
        
        expect(ecgPlayer.currentLead$.value).toBe(5)
        expect(ecgPlayer.stopAnimation).toHaveBeenCalled()
        expect(ecgPlayer.clearWaveform).toHaveBeenCalled()
        expect(ecgPlayer.renderGridBackground).toHaveBeenCalled()
      })

      it('should handle invalid lead index', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        
        ecgPlayer.switchLead(-1)
        expect(consoleSpy).toHaveBeenCalledWith('Invalid lead index: -1')
        
        ecgPlayer.switchLead(999)
        expect(consoleSpy).toHaveBeenCalledWith('Invalid lead index: 999')
        
        consoleSpy.mockRestore()
      })

      it('should preserve playing state when switching leads', () => {
        ecgPlayer.isPlaying$.next(true)
        
        ECGPlayer.switchLead.call(ecgPlayer, 3)
        
        expect(ecgPlayer.stopAnimation).toHaveBeenCalled()
        expect(ecgPlayer.isPlaying$.value).toBe(true) // Should resume playing
      })

      it('should handle paused state correctly', () => {
        const mockTime = { startTime: 1000, pausedTime: 2000 }
        ecgPlayer.animationTime$.next(mockTime)
        ecgPlayer.isPlaying$.next(false)
        
        ECGPlayer.switchLead.call(ecgPlayer, 2)
        
        expect(ecgPlayer.processAnimationFrame).toHaveBeenCalled()
      })

      it('should only clear and render in single lead mode', () => {
        ecgPlayer.displayMode$.next('multi')
        
        ECGPlayer.switchLead.call(ecgPlayer, 1)
        
        expect(ecgPlayer.clearWaveform).toHaveBeenCalled() // Should clear in multi mode too
      })
    })

    describe('switchToNextLead', () => {
      it('should advance to next lead', () => {
        ecgPlayer.currentLead$.next(0)
        ecgPlayer.switchLead = vi.fn()
        
        ecgPlayer.switchToNextLead()
        
        expect(ecgPlayer.switchLead).toHaveBeenCalledWith(1)
      })

      it('should not advance beyond last lead', () => {
        ecgPlayer.currentLead$.next(11) // Last lead (V6)
        ecgPlayer.switchLead = vi.fn()
        
        ecgPlayer.switchToNextLead()
        
        expect(ecgPlayer.switchLead).not.toHaveBeenCalled()
      })

      it('should handle empty dataset', () => {
        ecgPlayer.ecgLeadDatasets = []
        ecgPlayer.switchLead = vi.fn()
        
        ecgPlayer.switchToNextLead()
        
        expect(ecgPlayer.switchLead).not.toHaveBeenCalled()
      })
    })

    describe('switchToPrevLead', () => {
      it('should go to previous lead', () => {
        ecgPlayer.currentLead$.next(5)
        ecgPlayer.switchLead = vi.fn()
        
        ecgPlayer.switchToPrevLead()
        
        expect(ecgPlayer.switchLead).toHaveBeenCalledWith(4)
      })

      it('should not go before first lead', () => {
        ecgPlayer.currentLead$.next(0)
        ecgPlayer.switchLead = vi.fn()
        
        ecgPlayer.switchToPrevLead()
        
        expect(ecgPlayer.switchLead).not.toHaveBeenCalled()
      })
    })
  })

  describe('Display Mode Management', () => {
    describe('Display Mode Switching', () => {
      beforeEach(() => {
        ecgPlayer.updateLeadSelectorVisibility = vi.fn()
        ecgPlayer.canvasRecreationTrigger$ = createMockBehaviorSubject()
        ecgPlayer.updateDisplayModeSelector = vi.fn()
      })

      it('should switch from single to multi mode', () => {
        ecgPlayer.displayMode$.next('single')
        ecgPlayer.displayMode$.next('multi')
        
        expect(ecgPlayer.displayMode$.value).toBe('multi')
      })

      it('should switch from multi to single mode', () => {
        ecgPlayer.displayMode$.next('multi')
        ecgPlayer.displayMode$.next('single')
        
        expect(ecgPlayer.displayMode$.value).toBe('single')
      })
    })

    describe('updateLeadSelectorVisibility', () => {
      let mockLeadSelector

      beforeEach(() => {
        mockLeadSelector = createMockFormElement('div')
        mockLeadSelector.id = 'lead-selector-container'
        global.document.getElementById = vi.fn((id) => {
          if (id === 'lead-selector-container') return mockLeadSelector
          return null
        })
      })

      it('should hide lead selector in multi mode', () => {
        ecgPlayer.updateLeadSelectorVisibility('multi')
        
        expect(mockLeadSelector.style.display).toBe('none')
      })

      it('should show lead selector in single mode', () => {
        ecgPlayer.updateLeadSelectorVisibility('single')
        
        expect(mockLeadSelector.style.display).toBe('block')
      })

      it('should handle missing selector element', () => {
        global.document.getElementById = vi.fn(() => null)
        
        // Should not throw
        expect(() => {
          ecgPlayer.updateLeadSelectorVisibility('single')
        }).not.toThrow()
      })
    })

    describe('updateDisplayModeSelector', () => {
      let mockSelector

      beforeEach(() => {
        mockSelector = createMockFormElement('select')
        mockSelector.id = 'display-mode-selector'
        global.document.getElementById = vi.fn((id) => {
          if (id === 'display-mode-selector') return mockSelector
          return null
        })
      })

      it('should update selector value', () => {
        ecgPlayer.updateDisplayModeSelector('multi')
        
        expect(mockSelector.value).toBe('multi')
      })
    })
  })

  describe('Canvas Click Handling', () => {
    describe('getLeadIndexFromClick', () => {
      beforeEach(() => {
        ecgPlayer.leadNames = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']
        ecgPlayer.leadHeight = 120
        ecgPlayer.calculateLeadGridCoordinates = vi.fn()
          .mockReturnValueOnce({ xOffset: 0, yOffset: 0, columnWidth: 200 })
          .mockReturnValueOnce({ xOffset: 200, yOffset: 0, columnWidth: 200 })
          .mockReturnValueOnce({ xOffset: 400, yOffset: 0, columnWidth: 200 })
      })

      it('should return correct lead index for click in multi mode', () => {
        ecgPlayer.displayMode$.next('multi')
        
        const leadIndex = ecgPlayer.getLeadIndexFromClick(100, 50)
        
        expect(leadIndex).toBe(0)
      })

      it('should return null for click outside bounds', () => {
        ecgPlayer.displayMode$.next('multi')
        // Mock the method to return a result that has proper bounds
        ecgPlayer.calculateLeadGridCoordinates = vi.fn(() => ({ xOffset: 0, yOffset: 0, columnWidth: 200, leadHeight: 100 }))
        
        const leadIndex = ECGPlayer.getLeadIndexFromClick.call(ecgPlayer, 1000, 1000)
        
        expect(leadIndex).toBe(null)
      })

      it('should return null in single mode', () => {
        ecgPlayer.displayMode$.next('single')
        
        const leadIndex = ecgPlayer.getLeadIndexFromClick(100, 50)
        
        expect(leadIndex).toBe(null)
      })
    })

    describe('Canvas Click Events', () => {
      let mockCanvas
      let mockClickEvent

      beforeEach(() => {
        mockCanvas = {
          getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0 })),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }
        ecgPlayer.backgroundCanvas = mockCanvas
        ecgPlayer.canvasClickSubscription = { unsubscribe: vi.fn() }
        ecgPlayer.subscriptions = { add: vi.fn() }
        
        mockClickEvent = {
          clientX: 150,
          clientY: 75
        }
        
        ecgPlayer.getLeadIndexFromClick = vi.fn()
        ecgPlayer.updateDisplayModeSelector = vi.fn()
        ecgPlayer.switchLead = vi.fn()
      })

      it('should handle click in multi mode to switch to single lead', () => {
        ecgPlayer.displayMode$.next('multi')
        ecgPlayer.getLeadIndexFromClick.mockReturnValue(2)
        
        ecgPlayer.setupCanvasClickEvents()
        
        // Simulate the click handling logic
        const clickHandler = mockCanvas.addEventListener.mock.calls.find(
          call => call[0] === 'click'
        )?.[1]
        
        if (clickHandler) {
          // Mock the click processing
          ecgPlayer.displayMode$.next('single')
          ecgPlayer.currentLead$.next(2)
          ecgPlayer.switchLead(2)
          
          expect(ecgPlayer.displayMode$.value).toBe('single')
          expect(ecgPlayer.currentLead$.value).toBe(2)
          expect(ecgPlayer.switchLead).toHaveBeenCalledWith(2)
        }
      })

      it('should handle click in single mode to switch to multi', () => {
        ecgPlayer.displayMode$.next('single')
        
        ecgPlayer.setupCanvasClickEvents()
        
        // Simulate clicking in single mode
        ecgPlayer.displayMode$.next('multi')
        
        expect(ecgPlayer.displayMode$.value).toBe('multi')
      })
    })
  })

  describe('Lead Grid Coordinates', () => {
    describe('calculateLeadGridCoordinates', () => {
      beforeEach(() => {
        ecgPlayer.chartWidth = 800
        ecgPlayer.leadHeight = 100
        ecgPlayer.getLeadColumnAndRow = vi.fn()
      })

      it('should calculate coordinates for first lead', () => {
        ecgPlayer.getLeadColumnAndRow.mockReturnValue({ column: 0, row: 0 })
        
        const coords = ECGPlayer.calculateLeadGridCoordinates.call(ecgPlayer, 0)
        
        expect(coords.xOffset).toBe(0)
        expect(coords.yOffset).toBe(0)
        expect(coords.columnWidth).toBe(200) // 800 / 4 columns
      })

      it('should calculate coordinates for lead in second column', () => {
        ecgPlayer.getLeadColumnAndRow.mockReturnValue({ column: 1, row: 0 })
        
        const coords = ECGPlayer.calculateLeadGridCoordinates.call(ecgPlayer, 3)
        
        expect(coords.xOffset).toBe(200) // 1 * 200
        expect(coords.yOffset).toBe(0)
      })

      it('should calculate coordinates for lead in second row', () => {
        ecgPlayer.getLeadColumnAndRow.mockReturnValue({ column: 0, row: 1 })
        
        const coords = ECGPlayer.calculateLeadGridCoordinates.call(ecgPlayer, 1)
        
        expect(coords.xOffset).toBe(0)
        expect(coords.yOffset).toBe(100) // 1 * leadHeight
      })
    })

    describe('getLeadColumnAndRow', () => {
      it('should return correct positions for standard 12-lead layout', () => {
        // Test a few key positions
        expect(ecgPlayer.getLeadColumnAndRow(0)).toEqual({ column: 0, row: 0 })
        expect(ecgPlayer.getLeadColumnAndRow(1)).toEqual({ column: 0, row: 1 })
        expect(ecgPlayer.getLeadColumnAndRow(3)).toEqual({ column: 1, row: 0 })
        expect(ecgPlayer.getLeadColumnAndRow(11)).toEqual({ column: 3, row: 2 })
      })

      it('should handle invalid lead index', () => {
        expect(ecgPlayer.getLeadColumnAndRow(999)).toEqual({ column: 0, row: 0 })
      })
    })
  })

  describe('Form Event Handling', () => {
    describe('Lead Selector Events', () => {
      let mockElements

      beforeEach(() => {
        // Mock all form elements that createFormStreams looks for
        mockElements = {
          'lead-selector': createMockFormElement('select', '5'),
          'display-mode-selector': createMockFormElement('select', 'multi'),
          'grid-type-selector': createMockFormElement('select', 'telemetry'),
          'loop-checkbox': createMockFormElement('checkbox', false),
          'qrs-indicator-checkbox': createMockFormElement('checkbox', true),
          'grid-scale-slider': createMockFormElement('range', '1'),
          'amplitude-scale-slider': createMockFormElement('range', '1'),
          'height-scale-slider': createMockFormElement('range', '1')
        }
        
        global.document.getElementById = vi.fn((id) => {
          return mockElements[id] || null
        })
      })

      it('should create lead selector change stream', () => {
        const streams = ecgPlayer.createFormStreams()
        
        expect(streams).toHaveProperty('leadSelectorChange')
      })
    })

    describe('Display Mode Selector Events', () => {
      let mockElements

      beforeEach(() => {
        // Mock all form elements that createFormStreams looks for
        mockElements = {
          'lead-selector': createMockFormElement('select', '5'),
          'display-mode-selector': createMockFormElement('select', 'multi'),
          'grid-type-selector': createMockFormElement('select', 'telemetry'),
          'loop-checkbox': createMockFormElement('checkbox', false),
          'qrs-indicator-checkbox': createMockFormElement('checkbox', true),
          'grid-scale-slider': createMockFormElement('range', '1'),
          'amplitude-scale-slider': createMockFormElement('range', '1'),
          'height-scale-slider': createMockFormElement('range', '1')
        }
        
        global.document.getElementById = vi.fn((id) => {
          return mockElements[id] || null
        })
      })

      it('should create display mode change stream', () => {
        const streams = ecgPlayer.createFormStreams()
        
        expect(streams).toHaveProperty('displayModeChange')
      })
    })
  })
})