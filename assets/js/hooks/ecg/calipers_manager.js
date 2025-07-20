// @ts-check

import {
  CALIPER_MARKER_LENGTH,
  CALIPER_INDICATOR_SIZE,
  CALIPER_LINE_WIDTH,
  CALIPER_HEAVY_LINE_WIDTH,
  CALIPER_TEXT_PADDING,
  CALIPER_TEXT_HEIGHT,
  CALIPER_TEXT_HEIGHT_DOUBLE,
  CALIPER_TEXT_OFFSET,
  CALIPER_DUPLICATE_EVENT_THRESHOLD,
  CALIPER_FONT_SIZE,
  CALIPER_COLORS,
  DOM_SELECTORS
} from "./constants";

/**
 * Gets the calipers button element with error handling
 * @returns {HTMLElement|null} The calipers button element
 */
export function getCalipersButton() {
  const button = document.getElementById(DOM_SELECTORS.CALIPERS_BUTTON);
  if (!button) {
    console.warn(`Calipers button not found: #${DOM_SELECTORS.CALIPERS_BUTTON}`);
  }
  return button;
}

/**
 * Gets the calipers canvas element using data attribute
 * @returns {HTMLCanvasElement|null} The calipers canvas element
 */
export function getCalipersCanvas() {
  const canvas = document.querySelector("[data-canvas-type='calipers']");
  
  if (canvas) {
    return /** @type {HTMLCanvasElement} */ (canvas);
  }
  
  console.warn("Calipers canvas not found");
  return null;
}

/**
 * CaliperManager - Pure functional utilities for ECG measurement calipers
 * 
 * This module provides pure functions for:
 * - Caliper data manipulation
 * - Canvas rendering operations
 * - Time interval calculations
 * - Event handler creation
 * 
 * State is managed entirely by the parent state machine, following simplified patterns
 * established in ecg_player_v2.js with functional composition.
 */

/**
 * Calculates time interval from pixel coordinates
 * @param {number} startX - The start x coordinate
 * @param {number} endX - The end x coordinate
 * @param {number} chartWidth - Total chart width in pixels
 * @param {number} widthSeconds - Chart width in seconds
 * @returns {object} Object containing milliseconds and heart rate
 */
export function calculateTimeInterval(startX, endX, chartWidth, widthSeconds) {
  const timePerPixel = widthSeconds / chartWidth;
  const interval = Math.abs(endX - startX) * timePerPixel;
  
  return {
    milliseconds: interval * 1000,
    heartRate: interval > 0 ? 60 / interval : 0
  };
}

/**
 * Renders all calipers on the canvas
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {Array} calipers - Array of caliper objects
 * @param {number} chartWidth - Chart width for clearing
 * @param {number} canvasHeight - Canvas height for clearing
 * @param {number} widthSeconds - Chart width in seconds for measurements
 */
export function renderCalipers(context, calipers, chartWidth, canvasHeight, widthSeconds) {
  if (!context) return;
  
  context.clearRect(0, 0, chartWidth, canvasHeight);
  
  calipers.forEach(caliper => {
    renderSingleCaliper(context, caliper, chartWidth, widthSeconds);
  });
}

/**
 * Renders a single caliper on the canvas
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {object} caliper - The caliper object to render
 * @param {number} chartWidth - Chart width for measurements
 * @param {number} widthSeconds - Chart width in seconds for measurements
 */
export function renderSingleCaliper(context, caliper, chartWidth, widthSeconds) {
  if (!context) return;
  
  const { startX, startY, endX, endY, complete } = caliper;
  
  const color = complete ? CALIPER_COLORS.COMPLETE : CALIPER_COLORS.ACTIVE;
  
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = CALIPER_HEAVY_LINE_WIDTH;
  context.lineCap = "round";
  
  drawProfessionalCaliper(context, startX, startY, endX, endY, color);
  
  if (complete) {
    drawMeasurementText(context, caliper, chartWidth, widthSeconds);
  }
}

/**
 * Draws a professional ECG caliper with perpendicular markers
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {number} startX - Starting x coordinate
 * @param {number} startY - Starting y coordinate
 * @param {number} endX - Ending x coordinate
 * @param {number} endY - Ending y coordinate
 * @param {string} color - The color to use
 */
function drawProfessionalCaliper(context, startX, startY, endX, endY, color) {
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = CALIPER_LINE_WIDTH;
  
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();
  
  drawPerpendicularMarker(context, startX, startY, endX, endY, true);
  drawPerpendicularMarker(context, endX, endY, startX, startY, false);
  
  drawMeasurementIndicator(context, startX, startY, color);
  drawMeasurementIndicator(context, endX, endY, color);
}

/**
 * Draws a perpendicular marker at the specified point
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {number} x - The x coordinate of the marker
 * @param {number} y - The y coordinate of the marker
 * @param {number} refX - Reference x coordinate for perpendicular calculation
 * @param {number} refY - Reference y coordinate for perpendicular calculation
 * @param {boolean} _isStart - Whether this is the start marker (currently unused)
 */
function drawPerpendicularMarker(context, x, y, refX, refY, _isStart) {
  const markerLength = CALIPER_MARKER_LENGTH;
  
  const dx = refX - x;
  const dy = refY - y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length > 0) {
    const perpX = -dy / length;
    const perpY = dx / length;
    
    context.beginPath();
    context.moveTo(x + perpX * markerLength/2, y + perpY * markerLength/2);
    context.lineTo(x - perpX * markerLength/2, y - perpY * markerLength/2);
    context.stroke();
  } else {
    context.beginPath();
    context.moveTo(x, y - markerLength/2);
    context.lineTo(x, y + markerLength/2);
    context.stroke();
  }
}

/**
 * Draws a small triangular measurement indicator
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {string} color - The color to use
 */
function drawMeasurementIndicator(context, x, y, color) {
  const size = CALIPER_INDICATOR_SIZE;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x, y - size);
  context.lineTo(x - size, y + size);
  context.lineTo(x + size, y + size);
  context.closePath();
  context.fill();
}

/**
 * Draws measurement text near the caliper
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {object} caliper - The caliper object
 * @param {number} chartWidth - Chart width for calculations
 * @param {number} widthSeconds - Chart width in seconds
 */
function drawMeasurementText(context, caliper, chartWidth, widthSeconds) {
  const measurement = calculateTimeInterval(caliper.startX, caliper.endX, chartWidth, widthSeconds);
  const midX = (caliper.startX + caliper.endX) / 2;
  const midY = (caliper.startY + caliper.endY) / 2;
  
  context.font = `bold ${CALIPER_FONT_SIZE}px monospace`;
  context.textAlign = "center";
  
  const timeText = `${measurement.milliseconds.toFixed(0)}ms`;
  const bpmText = measurement.heartRate > 0 ? `${measurement.heartRate.toFixed(0)} BPM` : "";
  
  const textMetrics = context.measureText(timeText);
  const boxWidth = Math.max(textMetrics.width, context.measureText(bpmText).width) + CALIPER_TEXT_PADDING;
  const boxHeight = bpmText ? CALIPER_TEXT_HEIGHT_DOUBLE : CALIPER_TEXT_HEIGHT;
  
  const textY = midY - CALIPER_TEXT_OFFSET;
  
  context.fillStyle = CALIPER_COLORS.TEXT_BG;
  context.fillRect(midX - boxWidth/2, textY - 14, boxWidth, boxHeight);
  
  context.strokeStyle = CALIPER_COLORS.TEXT_BORDER;
  context.lineWidth = 1;
  context.strokeRect(midX - boxWidth/2, textY - 14, boxWidth, boxHeight);
  context.fillStyle = CALIPER_COLORS.TEXT;
  context.strokeStyle = CALIPER_COLORS.TEXT_STROKE;
  context.lineWidth = 2;
  
  context.strokeText(timeText, midX, textY);
  context.fillText(timeText, midX, textY);
  
  if (bpmText) {
    context.strokeText(bpmText, midX, textY + 14);
    context.fillText(bpmText, midX, textY + 14);
  }
}

/**
 * Creates mouse event handlers for caliper interaction
 * Returns bound functions that can be added/removed from canvas
 * Using simplified AbortController pattern for automatic cleanup
 * 
 * @param {HTMLCanvasElement} canvas - The calipers canvas
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {object} Object containing event handler functions
 */
export function createCalipersEventHandlers(canvas, sendEvent) {
  let lastCalipersEndTime = 0;
  
  const getCanvasCoordinates = (/** @type {MouseEvent} */ event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const handleMouseDown = (/** @type {MouseEvent} */ event) => {
    const coords = getCanvasCoordinates(event);
    sendEvent({
      type: "CALIPER_START",
      x: coords.x,
      y: coords.y
    });
  };

  const handleMouseMove = (/** @type {MouseEvent} */ event) => {
    const coords = getCanvasCoordinates(event);
    sendEvent({
      type: "CALIPER_DRAG",
      x: coords.x,
      y: coords.y
    });
  };

  const handleMouseUp = (/** @type {MouseEvent} */ _event) => {
    const now = Date.now();
    
    if (now - lastCalipersEndTime < CALIPER_DUPLICATE_EVENT_THRESHOLD) {
      return;
    }
    
    lastCalipersEndTime = now;
    sendEvent({
      type: "CALIPER_END"
    });
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  };
}

/**
 * Sets up caliper event listeners on canvas and document
 * 
 * @param {HTMLCanvasElement} canvas - The calipers canvas
 * @param {Function} sendEvent - Function to send events to state machine
 */
export function setupCalipersEventListeners(canvas, sendEvent) {
  if (!canvas) return;

  const handlers = createCalipersEventHandlers(canvas, sendEvent);

  canvas.addEventListener("mousedown", handlers.handleMouseDown, { signal: this.calipersController.signal });
  canvas.addEventListener("mousemove", handlers.handleMouseMove, { signal: this.calipersController.signal });

  document.addEventListener("mousemove", handlers.handleMouseMove, { signal: this.calipersController.signal });
  document.addEventListener("mouseup", handlers.handleMouseUp, { signal: this.calipersController.signal });
}

/**
 * Clears all calipers from canvas
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {number} chartWidth - Chart width
 * @param {number} canvasHeight - Canvas height
 */
export function clearCalipersCanvas(context, chartWidth, canvasHeight) {
  if (!context) return;
  context.clearRect(0, 0, chartWidth, canvasHeight);
}

/**
 * Sets calipers button to disabled state
 */
export function setCalipersButtonToDisabled() {
  const button = getCalipersButton();
  if (button && button.classList) {
    button.classList.remove("btn-active");
    button.title = "Enable Time Calipers (c)";
  }

  const calipersCanvas = getCalipersCanvas();
  if (calipersCanvas) {
    calipersCanvas.style.pointerEvents = "none";
    calipersCanvas.style.cursor = "default";
  }
}

/**
 * Sets calipers button to enabled state
 */
export function setCalipersButtonToEnabled() {
  const button = getCalipersButton();
  if (button && button.classList) {
    button.classList.add("btn-active");
    button.title = "Disable Time Calipers (c)";
  }

  const calipersCanvas = getCalipersCanvas();
  if (calipersCanvas) {
    calipersCanvas.style.pointerEvents = "auto";
    calipersCanvas.style.cursor = "crosshair";
  }
}
