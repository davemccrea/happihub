// ===========
//  RENDERING
// ===========
export const MM_PER_SECOND = 25;
export const MM_PER_MILLIVOLT = 10;
export const PIXELS_PER_MM = 6;
export const HEIGHT_MILLIVOLTS = 2.5;
export const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM;

// ========
//  LAYOUT
// ========
export const DEFAULT_WIDTH_SECONDS = 2.5;
export const CONTAINER_PADDING = 0;
export const COLUMNS_PER_DISPLAY = 4;
export const ROWS_PER_DISPLAY = 3;
export const COLUMN_PADDING = 0;
export const ROW_PADDING = 0;

// ===========
//  ANIMATION
// ===========
export const SINGLE_LEAD_CURSOR_WIDTH = 20;
export const MULTI_LEAD_CURSOR_WIDTH = 8;

// ====================
//  MULTI-LEAD DISPLAY
// ====================
export const MULTI_LEAD_HEIGHT_SCALE = 0.8; // Reduces individual lead height in multi-lead view
export const QRS_FLASH_DURATION_MS = 100; // Duration of QRS indicator flash in milliseconds
export const SEGMENT_DURATION_SECONDS = 0.1; // Pre-computed data segment size for performance

// =========
//  CALIPERS
// =========
export const CALIPER_MARKER_LENGTH = 16; // Length of perpendicular markers in pixels
export const CALIPER_INDICATOR_SIZE = 4; // Size of triangular measurement indicators
export const CALIPER_LINE_WIDTH = 2; // Main caliper line width
export const CALIPER_HEAVY_LINE_WIDTH = 3; // Heavy line width for active rendering
export const CALIPER_TEXT_PADDING = 12; // Padding around measurement text boxes
export const CALIPER_TEXT_HEIGHT = 18; // Height of single-line text box
export const CALIPER_TEXT_HEIGHT_DOUBLE = 30; // Height of double-line text box (with BPM)
export const CALIPER_TEXT_OFFSET = 30; // Distance above caliper line for text placement
export const CALIPER_DUPLICATE_EVENT_THRESHOLD = 100; // Milliseconds to prevent duplicate CALIPER_END events
export const CALIPER_FONT_SIZE = 11; // Font size for measurement text
export const CALIPER_COLORS = {
  ACTIVE: "#4A90E2",    // Modern blue for active calipers
  COMPLETE: "#27AE60",  // Modern green for completed calipers
  TEXT: "#2C3E50",      // Modern dark blue-gray for text
  TEXT_BG: "rgba(255, 255, 255, 0.95)", // Semi-transparent white background
  TEXT_BORDER: "rgba(0, 0, 0, 0.2)",    // Subtle border around text
  TEXT_STROKE: "rgba(255, 255, 255, 0.8)" // Text stroke for readability
};

// =============
//  DOM SELECTORS
// =============
export const DOM_SELECTORS = {
  // Button IDs
  CALIPERS_BUTTON: "calipers-button",
  PLAY_PAUSE_BUTTON: "play-pause-button",
  
  // Form Control IDs
  LEAD_SELECTOR: "lead-selector",
  DISPLAY_MODE_SELECTOR: "display-mode-selector",
  GRID_TYPE_SELECTOR: "grid-type-selector",
  LOOP_CHECKBOX: "loop-checkbox",
  QRS_INDICATOR_CHECKBOX: "qrs-indicator-checkbox",
  GRID_SCALE_SLIDER: "grid-scale-slider",
  AMPLITUDE_SCALE_SLIDER: "amplitude-scale-slider",
  HEIGHT_SCALE_SLIDER: "height-scale-slider",
  
  // Display Value Elements
  GRID_SCALE_VALUE: "grid-scale-value",
  AMPLITUDE_SCALE_VALUE: "amplitude-scale-value", 
  HEIGHT_SCALE_VALUE: "height-scale-value",
  HEIGHT_SCALE_PIXELS: "height-scale-pixels",
  
  // Container Selectors
  ECG_CHART_CONTAINER: "[data-ecg-chart]",
  CALIPERS_CANVAS_FALLBACK: "[data-ecg-chart] canvas:last-child" // Fallback selector (fragile)
};
