import { vi } from 'vitest'

// Mock DOM APIs that are not available in JSDOM
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock Canvas API
const mockCanvas = {
  getContext: vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    clip: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    createLinearGradient: vi.fn(),
    createRadialGradient: vi.fn(),
    createPattern: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
  })),
  width: 800,
  height: 600,
  style: {},
  remove: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
  })),
}

global.HTMLCanvasElement = class MockHTMLCanvasElement {
  constructor() {
    return mockCanvas
  }
}

// Mock createElement for canvas
const originalCreateElement = document.createElement
document.createElement = vi.fn((tagName) => {
  if (tagName === 'canvas') {
    return mockCanvas
  }
  return originalCreateElement.call(document, tagName)
})

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16))
global.cancelAnimationFrame = vi.fn(clearTimeout)

// Mock performance.now
Object.defineProperty(performance, 'now', {
  value: vi.fn(() => Date.now()),
  writable: true
})

// Mock window properties
Object.defineProperty(window, 'devicePixelRatio', {
  value: 1,
  writable: true
})

// Mock MutationObserver
global.MutationObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock Date.now for consistent testing
const originalDateNow = Date.now
global.mockDateNow = (timestamp) => {
  Date.now = vi.fn(() => timestamp)
}

global.restoreDateNow = () => {
  Date.now = originalDateNow
}