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
