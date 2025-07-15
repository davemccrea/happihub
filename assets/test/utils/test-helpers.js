import { vi } from 'vitest'
import { BehaviorSubject, Subject, of, EMPTY } from 'rxjs'

// RxJS Testing Utilities
export const createMockSubject = (initialValue = undefined) => {
  const subject = initialValue !== undefined 
    ? new BehaviorSubject(initialValue)
    : new Subject()
  
  // Add spy methods for testing
  subject.nextSpy = vi.fn((value) => subject.next(value))
  subject.completeSpy = vi.fn(() => subject.complete())
  subject.errorSpy = vi.fn((error) => subject.error(error))
  
  return subject
}

export const createMockBehaviorSubject = (initialValue) => {
  const subject = new BehaviorSubject(initialValue)
  subject.nextSpy = vi.fn((value) => subject.next(value))
  return subject
}

// Mock ECG data generators
export const createMockECGData = (options = {}) => {
  const defaults = {
    fs: 500, // sampling rate
    sig_name: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
    duration: 10, // seconds
    amplitude: 1.0,
    qrsCount: 10
  }
  
  const config = { ...defaults, ...options }
  const sampleCount = config.fs * config.duration
  const leadCount = config.sig_name.length
  
  // Generate synthetic ECG signal
  const p_signal = Array.from({ length: sampleCount }, (_, sampleIndex) => {
    const time = sampleIndex / config.fs
    const heartRate = 60 // BPM
    const beatsPerSecond = heartRate / 60
    const phase = 2 * Math.PI * beatsPerSecond * time
    
    return Array.from({ length: leadCount }, (_, leadIndex) => {
      // Simple sine wave with some noise for ECG-like signal
      const baseSignal = Math.sin(phase) * config.amplitude
      const noise = (Math.random() - 0.5) * 0.1
      const leadVariation = Math.sin(phase + leadIndex * 0.1) * 0.3
      return baseSignal + noise + leadVariation
    })
  })
  
  // Generate QRS indexes (approximate positions)
  const qrs = Array.from({ length: config.qrsCount }, (_, i) => {
    return Math.floor((i + 1) * (sampleCount / (config.qrsCount + 1)))
  })
  
  return {
    fs: config.fs,
    sig_name: config.sig_name,
    p_signal,
    qrs
  }
}

// Mock DOM element factory
export const createMockElement = (tagName = 'div', attributes = {}) => {
  const element = document.createElement(tagName)
  
  // Add common properties
  element.style = {}
  
  // Use defineProperty for offsetWidth/offsetHeight since they're getters
  Object.defineProperty(element, 'offsetWidth', {
    value: attributes.width || 800,
    writable: true,
    configurable: true
  })
  Object.defineProperty(element, 'offsetHeight', {
    value: attributes.height || 600,
    writable: true,
    configurable: true
  })
  
  // Mock methods
  element.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    width: element.offsetWidth,
    height: element.offsetHeight,
    right: element.offsetWidth,
    bottom: element.offsetHeight
  }))
  
  element.querySelector = vi.fn()
  element.appendChild = vi.fn()
  element.removeChild = vi.fn()
  element.remove = vi.fn()
  
  // For canvas elements
  if (tagName === 'canvas') {
    element.getContext = vi.fn(() => ({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 50 })),
      scale: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn()
    }))
  }
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key !== 'width' && key !== 'height') {
      element.setAttribute(key, value)
    }
  })
  
  return element
}

// Mock form elements
export const createMockFormElement = (type = 'input', value = '') => {
  const element = createMockElement(type === 'select' ? 'select' : 'input')
  
  // Use defineProperty for form element properties
  Object.defineProperty(element, 'type', {
    value: type,
    writable: true,
    configurable: true
  })
  
  // Handle different input types
  if (type === 'checkbox') {
    Object.defineProperty(element, 'checked', {
      value: typeof value === 'boolean' ? value : false,
      writable: true,
      configurable: true
    })
    Object.defineProperty(element, 'value', {
      value: typeof value === 'boolean' ? (value ? 'on' : '') : value,
      writable: true,
      configurable: true
    })
  } else {
    Object.defineProperty(element, 'value', {
      value: value,
      writable: true,
      configurable: true
    })
  }
  
  // Mock event handling
  element.addEventListener = vi.fn()
  element.removeEventListener = vi.fn()
  element.dispatchEvent = vi.fn()
  
  return element
}

// Animation testing utilities
export const mockAnimationFrame = () => {
  let frameId = 0
  const callbacks = new Map()
  
  const requestAnimationFrame = vi.fn((callback) => {
    frameId++
    callbacks.set(frameId, callback)
    return frameId
  })
  
  const cancelAnimationFrame = vi.fn((id) => {
    callbacks.delete(id)
  })
  
  const triggerFrame = (timestamp = performance.now()) => {
    callbacks.forEach((callback) => callback(timestamp))
    callbacks.clear()
  }
  
  global.requestAnimationFrame = requestAnimationFrame
  global.cancelAnimationFrame = cancelAnimationFrame
  
  return { triggerFrame, requestAnimationFrame, cancelAnimationFrame }
}

// Time manipulation utilities
export const mockTime = (startTime = 0) => {
  let currentTime = startTime
  
  const advanceTime = (ms) => {
    currentTime += ms
    vi.setSystemTime(currentTime)
  }
  
  const setTime = (time) => {
    currentTime = time
    vi.setSystemTime(currentTime)
  }
  
  vi.useFakeTimers()
  vi.setSystemTime(currentTime)
  
  return { advanceTime, setTime, getCurrentTime: () => currentTime }
}

// ECG Player specific test utilities
export const createMockECGPlayerContext = () => {
  const mockEl = createMockElement('div')
  const mockChart = createMockElement('div', { 'data-ecg-chart': true })
  mockEl.querySelector = vi.fn((selector) => {
    if (selector === '[data-ecg-chart]') return mockChart
    return null
  })
  
  return {
    el: mockEl,
    handleEvent: vi.fn(),
    pushEvent: vi.fn()
  }
}

// Canvas testing utilities
export const createMockCanvas = (width = 800, height = 600) => {
  const canvas = createMockElement('canvas')
  canvas.width = width
  canvas.height = height
  
  const context = {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn()
  }
  
  canvas.getContext = vi.fn(() => context)
  
  return { canvas, context }
}

// Observable stream testing utilities
export const collectEmissions = (observable, count = 1) => {
  return new Promise((resolve) => {
    const emissions = []
    const subscription = observable.subscribe({
      next: (value) => {
        emissions.push(value)
        if (emissions.length >= count) {
          subscription.unsubscribe()
          resolve(emissions)
        }
      },
      error: (error) => {
        subscription.unsubscribe()
        resolve({ error })
      },
      complete: () => {
        subscription.unsubscribe()
        resolve(emissions)
      }
    })
  })
}

export const waitForEmission = (observable) => {
  return collectEmissions(observable, 1).then(emissions => emissions[0])
}