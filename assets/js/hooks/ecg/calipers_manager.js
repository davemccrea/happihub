// @ts-check

/**
 * CaliperManager - Pure functional utilities for ECG measurement calipers
 * 
 * This module provides pure functions for:
 * - Caliper data manipulation
 * - Canvas rendering operations
 * - Time interval calculations
 * - Event handler creation
 * 
 * State is managed by the parent state machine, following the patterns
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
  
  // Clear the canvas
  context.clearRect(0, 0, chartWidth, canvasHeight);
  
  // Render each caliper
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
  
  // Modern medical equipment colors: blue for active, green for complete
  const activeColor = "#4A90E2";   // Modern blue
  const completeColor = "#27AE60"; // Modern green
  const color = complete ? completeColor : activeColor;
  
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 3;
  context.lineCap = "round";
  
  // Draw professional caliper arms with perpendicular markers
  drawProfessionalCaliper(context, startX, startY, endX, endY, color);
  
  // Draw measurement text if complete
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
  context.lineWidth = 2;
  
  // Main measurement line
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();
  
  // Draw perpendicular markers at both ends
  drawPerpendicularMarker(context, startX, startY, endX, endY, true);  // Start marker
  drawPerpendicularMarker(context, endX, endY, startX, startY, false); // End marker
  
  // Draw measurement indicators (small triangles)
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
  const markerLength = 16;
  
  // Calculate perpendicular direction
  const dx = refX - x;
  const dy = refY - y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length > 0) {
    // Normalize and rotate 90 degrees
    const perpX = -dy / length;
    const perpY = dx / length;
    
    // Draw perpendicular line
    context.beginPath();
    context.moveTo(x + perpX * markerLength/2, y + perpY * markerLength/2);
    context.lineTo(x - perpX * markerLength/2, y - perpY * markerLength/2);
    context.stroke();
  } else {
    // Fallback for zero-length line
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
  const size = 4;
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
  
  // Modern medical monitor style text
  context.font = "bold 11px monospace"; // Monospace font for medical precision
  context.textAlign = "center";
  
  // Create measurement box background
  const timeText = `${measurement.milliseconds.toFixed(0)}ms`;
  const bpmText = measurement.heartRate > 0 ? `${measurement.heartRate.toFixed(0)} BPM` : "";
  
  // Calculate text dimensions for background box
  const textMetrics = context.measureText(timeText);
  const boxWidth = Math.max(textMetrics.width, context.measureText(bpmText).width) + 12;
  const boxHeight = bpmText ? 30 : 18;
  
  // Position text above the caliper line
  const textY = midY - 30;
  
  // Draw modern semi-transparent background box
  context.fillStyle = "rgba(255, 255, 255, 0.95)";
  context.fillRect(midX - boxWidth/2, textY - 14, boxWidth, boxHeight);
  
  // Draw subtle border around text box
  context.strokeStyle = "rgba(0, 0, 0, 0.2)";
  context.lineWidth = 1;
  context.strokeRect(midX - boxWidth/2, textY - 14, boxWidth, boxHeight);
  
  // Draw the measurement text in modern dark color
  context.fillStyle = "#2C3E50"; // Modern dark blue-gray
  context.strokeStyle = "rgba(255, 255, 255, 0.8)";
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
 * Following the pattern from event_manager.js
 * 
 * @param {HTMLCanvasElement} canvas - The calipers canvas
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {object} Object containing event handler functions
 */
export function createCalipersEventHandlers(canvas, sendEvent) {
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
 * Following the listener tracking pattern from ecg_player_v2.js
 * 
 * @param {HTMLCanvasElement} canvas - The calipers canvas
 * @param {Function} sendEvent - Function to send events to state machine
 * @param {Set} listeners - Set to track cleanup functions
 * @returns {Function} Cleanup function to remove calipers event listeners
 */
export function setupCalipersEventListeners(canvas, sendEvent, listeners) {
  if (!canvas) return () => {};

  const handlers = createCalipersEventHandlers(canvas, sendEvent);

  // Add canvas listeners
  canvas.addEventListener("mousedown", handlers.handleMouseDown);
  canvas.addEventListener("mousemove", handlers.handleMouseMove);
  canvas.addEventListener("mouseup", handlers.handleMouseUp);

  // Add document listeners for drag outside canvas
  document.addEventListener("mousemove", handlers.handleMouseMove);
  document.addEventListener("mouseup", handlers.handleMouseUp);

  // Create cleanup function
  const cleanup = () => {
    canvas.removeEventListener("mousedown", handlers.handleMouseDown);
    canvas.removeEventListener("mousemove", handlers.handleMouseMove);
    canvas.removeEventListener("mouseup", handlers.handleMouseUp);
    document.removeEventListener("mousemove", handlers.handleMouseMove);
    document.removeEventListener("mouseup", handlers.handleMouseUp);
  };

  // Track cleanup function in the global listeners set
  listeners.add(cleanup);
  
  // Return cleanup function so it can be called specifically for calipers
  return cleanup;
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
  const button = document.getElementById("calipers-button");
  if (button && button.classList) {
    button.classList.remove("btn-active");
    button.title = "Enable Time Calipers (c)";
  }

  // Handle canvas interaction as part of the button state (same pattern as play/pause)
  const calipersCanvas = /** @type {HTMLCanvasElement} */ (document.querySelector("[data-ecg-chart] canvas:last-child"));
  if (calipersCanvas) {
    calipersCanvas.style.pointerEvents = "none";
    calipersCanvas.style.cursor = "default";
  }
}

/**
 * Sets calipers button to enabled state
 */
export function setCalipersButtonToEnabled() {
  const button = document.getElementById("calipers-button");
  if (button && button.classList) {
    button.classList.add("btn-active");
    button.title = "Disable Time Calipers (c)";
  }

  // Handle canvas interaction as part of the button state (same pattern as play/pause)
  const calipersCanvas = /** @type {HTMLCanvasElement} */ (document.querySelector("[data-ecg-chart] canvas:last-child"));
  if (calipersCanvas) {
    calipersCanvas.style.pointerEvents = "auto";
    calipersCanvas.style.cursor = "crosshair";
  }
}
