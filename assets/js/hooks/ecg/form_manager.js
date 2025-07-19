// @ts-check

/**
 * FormManager - Manages form control event listeners
 * 
 * This module handles:
 * - Select dropdown event listeners (lead selector, display mode, grid type)
 * - Checkbox event listeners (loop, QRS indicator)  
 * - Slider event listeners (grid scale, amplitude scale, height scale)
 * 
 * Following the modular pattern established with other managers
 */

/**
 * Sets up form control event listeners
 * @param {Function} sendEvent - Function to send events to state machine
 * @param {Set} listeners - Set to track cleanup functions
 * @returns {Function} Cleanup function to remove all form event listeners
 */
export function setupFormEventListeners(sendEvent, listeners) {
  const cleanupFunctions = [];

  // Selects
  cleanupFunctions.push(setupCurrentLeadListener(sendEvent));
  cleanupFunctions.push(setupDisplayModeListener(sendEvent));
  cleanupFunctions.push(setupGridTypeListener(sendEvent));

  // Checkboxes  
  cleanupFunctions.push(setupLoopListener(sendEvent));
  cleanupFunctions.push(setupQrsIndicatorListener(sendEvent));

  // Sliders
  cleanupFunctions.push(setupGridScaleListener(sendEvent));
  cleanupFunctions.push(setupAmplitudeScaleListener(sendEvent));
  cleanupFunctions.push(setupHeightScaleListener(sendEvent));

  // Create combined cleanup function
  const cleanup = () => {
    cleanupFunctions.forEach(fn => fn());
  };

  // Track cleanup function in the global listeners set
  listeners.add(cleanup);
  
  // Return cleanup function so it can be called specifically for forms
  return cleanup;
}

// =================
// SELECT LISTENERS
// =================

/**
 * Sets up current lead selector listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {Function} Cleanup function
 */
function setupCurrentLeadListener(sendEvent) {
  const currentLeadSelect = document.getElementById("lead-selector");
  if (!currentLeadSelect) {
    console.error("Element #lead-selector not found");
    return () => {};
  }
  
  const handler = (/** @type {Event} */ event) => {
    const target = /** @type {HTMLSelectElement} */ (event.target);
    const leadIndex = parseInt(target.value);
    sendEvent({ type: "CHANGE_LEAD", leadIndex });
  };
  
  currentLeadSelect.addEventListener("change", handler);
  return () => currentLeadSelect.removeEventListener("change", handler);
}

/**
 * Sets up display mode selector listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {Function} Cleanup function
 */
function setupDisplayModeListener(sendEvent) {
  const displayModeSelect = document.getElementById("display-mode-selector");

  if (!displayModeSelect) {
    console.error("Element #display-mode-selector not found");
    return () => {};
  }

  const handler = (/** @type {Event} */ event) => {
    const target = /** @type {HTMLSelectElement} */ (event.target);
    const displayMode = target.value;
    sendEvent({ type: "CHANGE_DISPLAY_MODE", displayMode });
  };

  displayModeSelect.addEventListener("change", handler);
  return () => displayModeSelect.removeEventListener("change", handler);
}

/**
 * Sets up grid type selector listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {Function} Cleanup function
 */
function setupGridTypeListener(sendEvent) {
  const gridTypeSelect = document.getElementById("grid-type-selector");

  if (!gridTypeSelect) {
    console.error("Element #grid-type-selector not found");
    return () => {};
  }

  const handler = (/** @type {Event} */ event) => {
    const target = /** @type {HTMLSelectElement} */ (event.target);
    const gridType = target.value;
    sendEvent({ type: "CHANGE_GRID_TYPE", gridType });
  };

  gridTypeSelect.addEventListener("change", handler);
  return () => gridTypeSelect.removeEventListener("change", handler);
}

// ===================
// CHECKBOX LISTENERS
// ===================

/**
 * Sets up loop checkbox listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {Function} Cleanup function
 */
function setupLoopListener(sendEvent) {
  const loopCheckbox = document.getElementById("loop-checkbox");

  if (!loopCheckbox) {
    console.error("Element #loop-checkbox not found");
    return () => {};
  }

  const handler = () => {
    sendEvent({ type: "TOGGLE_LOOP" });
  };

  loopCheckbox.addEventListener("change", handler);
  return () => loopCheckbox.removeEventListener("change", handler);
}

/**
 * Sets up QRS indicator checkbox listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {Function} Cleanup function
 */
function setupQrsIndicatorListener(sendEvent) {
  const qrsIndicatorCheckbox = document.getElementById("qrs-indicator-checkbox");

  if (!qrsIndicatorCheckbox) {
    console.error("Element #qrs-indicator-checkbox not found");
    return () => {};
  }

  const handler = () => {
    sendEvent({ type: "TOGGLE_QRS_INDICATOR" });
  };

  qrsIndicatorCheckbox.addEventListener("change", handler);
  return () => qrsIndicatorCheckbox.removeEventListener("change", handler);
}

// ==================
// SLIDER LISTENERS
// ==================

/**
 * Sets up grid scale slider listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {Function} Cleanup function
 */
function setupGridScaleListener(sendEvent) {
  const gridScaleSlider = document.getElementById("grid-scale-slider");

  if (!gridScaleSlider) {
    console.error("Element #grid-scale-slider not found");
    return () => {};
  }

  const handler = (/** @type {Event} */ event) => {
    const target = /** @type {HTMLInputElement} */ (event.target);
    const gridScale = parseFloat(target.value);
    sendEvent({ type: "UPDATE_GRID_SCALE", value: gridScale });
  };

  gridScaleSlider.addEventListener("input", handler);
  return () => gridScaleSlider.removeEventListener("input", handler);
}

/**
 * Sets up amplitude scale slider listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {Function} Cleanup function
 */
function setupAmplitudeScaleListener(sendEvent) {
  const amplitudeScaleSlider = document.getElementById("amplitude-scale-slider");

  if (!amplitudeScaleSlider) {
    console.error("Element #amplitude-scale-slider not found");
    return () => {};
  }

  const handler = (/** @type {Event} */ event) => {
    const target = /** @type {HTMLInputElement} */ (event.target);
    const amplitudeScale = parseFloat(target.value);
    sendEvent({ type: "UPDATE_AMPLITUDE_SCALE", value: amplitudeScale });
  };

  amplitudeScaleSlider.addEventListener("input", handler);
  return () => amplitudeScaleSlider.removeEventListener("input", handler);
}

/**
 * Sets up height scale slider listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {Function} Cleanup function
 */
function setupHeightScaleListener(sendEvent) {
  const heightScaleSlider = document.getElementById("height-scale-slider");

  if (!heightScaleSlider) {
    console.error("Element #height-scale-slider not found");
    return () => {};
  }

  const handler = (/** @type {Event} */ event) => {
    const target = /** @type {HTMLInputElement} */ (event.target);
    const heightScale = parseFloat(target.value);
    sendEvent({ type: "UPDATE_HEIGHT_SCALE", value: heightScale });
  };

  heightScaleSlider.addEventListener("input", handler);
  return () => heightScaleSlider.removeEventListener("input", handler);
}