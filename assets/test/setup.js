import { vi } from 'vitest';

// Mock global objects that would normally be provided by the browser
global.window = {
  devicePixelRatio: 1,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  requestAnimationFrame: vi.fn(),
  cancelAnimationFrame: vi.fn(),
  Date: {
    now: vi.fn(() => Date.now())
  }
};

global.document = {
  documentElement: {
    getAttribute: vi.fn(() => 'light'),
    setAttribute: vi.fn()
  },
  createElement: vi.fn((tag) => {
    const element = {
      tagName: tag.toUpperCase(),
      style: {},
      getAttribute: vi.fn(),
      setAttribute: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      appendChild: vi.fn(),
      getContext: vi.fn(() => ({
        scale: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'low',
        font: '10px sans-serif'
      })),
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600
      })),
      offsetWidth: 800,
      offsetHeight: 600,
      width: 800,
      height: 600,
      dataset: {}
    };
    return element;
  }),
  getElementById: vi.fn(),
  querySelector: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Mock MutationObserver
global.MutationObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}));

// Mock performance API
global.performance = {
  now: vi.fn(() => Date.now())
};

// Mock console methods to avoid noise in tests
global.console = {
  ...global.console,
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn()
};

// Mock Phoenix LiveView hook methods
global.mockPhoenixHook = {
  handleEvent: vi.fn(),
  pushEventTo: vi.fn()
};