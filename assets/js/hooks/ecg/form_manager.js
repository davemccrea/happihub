// @ts-check

import { DOM_SELECTORS } from "./constants";

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
 */
export function setupFormEventListeners(sendEvent) {
  // Selects
  setupCurrentLeadListener.call(this, sendEvent);
  setupDisplayModeListener.call(this, sendEvent);
  setupGridTypeListener.call(this, sendEvent);

  // Checkboxes  
  setupLoopListener.call(this, sendEvent);
  setupQrsIndicatorListener.call(this, sendEvent);

  // Sliders
  setupGridScaleListener.call(this, sendEvent);
  setupAmplitudeScaleListener.call(this, sendEvent);
  setupHeightScaleListener.call(this, sendEvent);
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
  const currentLeadSelect = document.getElementById(DOM_SELECTORS.LEAD_SELECTOR);
  if (!currentLeadSelect) {
    console.error("Element #lead-selector not found");
    return;
  }
  
  const handler = (/** @type {Event} */ event) => {
    const target = /** @type {HTMLSelectElement} */ (event.target);
    const leadIndex = parseInt(target.value);
    sendEvent({ type: "CHANGE_LEAD", leadIndex });
  };
  
  currentLeadSelect.addEventListener("change", handler, { signal: this.controller.signal });
  }

/**
 * Sets up display mode selector listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {Function} Cleanup function
 */
function setupDisplayModeListener(sendEvent) {
  const displayModeSelect = document.getElementById(DOM_SELECTORS.DISPLAY_MODE_SELECTOR);

  if (!displayModeSelect) {
    console.error("Element #display-mode-selector not found");
    return;
  }

  const handler = (/** @type {Event} */ event) => {
    const target = /** @type {HTMLSelectElement} */ (event.target);
    const displayMode = target.value;
    sendEvent({ type: "CHANGE_DISPLAY_MODE", displayMode });
  };

  displayModeSelect.addEventListener("change", handler, { signal: this.controller.signal });
  }

/**
 * Sets up grid type selector listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {Function} Cleanup function
 */
function setupGridTypeListener(sendEvent) {
  const gridTypeSelect = document.getElementById(DOM_SELECTORS.GRID_TYPE_SELECTOR);

  if (!gridTypeSelect) {
    console.error("Element #grid-type-selector not found");
    return;
  }

  const handler = (/** @type {Event} */ event) => {
    const target = /** @type {HTMLSelectElement} */ (event.target);
    const gridType = target.value;
    sendEvent({ type: "CHANGE_GRID_TYPE", gridType });
  };

  gridTypeSelect.addEventListener("change", handler, { signal: this.controller.signal });
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
  const loopCheckbox = document.getElementById(DOM_SELECTORS.LOOP_CHECKBOX);

  if (!loopCheckbox) {
    console.error("Element #loop-checkbox not found");
    return;
  }

  const handler = () => {
    sendEvent({ type: "TOGGLE_LOOP" });
  };

  loopCheckbox.addEventListener("change", handler, { signal: this.controller.signal });
  }

/**
 * Sets up QRS indicator checkbox listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {Function} Cleanup function
 */
function setupQrsIndicatorListener(sendEvent) {
  const qrsIndicatorCheckbox = document.getElementById(DOM_SELECTORS.QRS_INDICATOR_CHECKBOX);

  if (!qrsIndicatorCheckbox) {
    console.error("Element #qrs-indicator-checkbox not found");
    return;
  }

  const handler = () => {
    sendEvent({ type: "TOGGLE_QRS_INDICATOR" });
  };

  qrsIndicatorCheckbox.addEventListener("change", handler, { signal: this.controller.signal });
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
  const gridScaleSlider = document.getElementById(DOM_SELECTORS.GRID_SCALE_SLIDER);

  if (!gridScaleSlider) {
    console.error("Element #grid-scale-slider not found");
    return;
  }

  const handler = (/** @type {Event} */ event) => {
    const target = /** @type {HTMLInputElement} */ (event.target);
    const gridScale = parseFloat(target.value);
    sendEvent({ type: "UPDATE_GRID_SCALE", value: gridScale });
  };

  gridScaleSlider.addEventListener("input", handler, { signal: this.controller.signal });
  }

/**
 * Sets up amplitude scale slider listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {Function} Cleanup function
 */
function setupAmplitudeScaleListener(sendEvent) {
  const amplitudeScaleSlider = document.getElementById(DOM_SELECTORS.AMPLITUDE_SCALE_SLIDER);

  if (!amplitudeScaleSlider) {
    console.error("Element #amplitude-scale-slider not found");
    return;
  }

  const handler = (/** @type {Event} */ event) => {
    const target = /** @type {HTMLInputElement} */ (event.target);
    const amplitudeScale = parseFloat(target.value);
    sendEvent({ type: "UPDATE_AMPLITUDE_SCALE", value: amplitudeScale });
  };

  amplitudeScaleSlider.addEventListener("input", handler, { signal: this.controller.signal });
  }

/**
 * Sets up height scale slider listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @returns {Function} Cleanup function
 */
function setupHeightScaleListener(sendEvent) {
  const heightScaleSlider = document.getElementById(DOM_SELECTORS.HEIGHT_SCALE_SLIDER);

  if (!heightScaleSlider) {
    console.error("Element #height-scale-slider not found");
    return;
  }

  const handler = (/** @type {Event} */ event) => {
    const target = /** @type {HTMLInputElement} */ (event.target);
    const heightScale = parseFloat(target.value);
    sendEvent({ type: "UPDATE_HEIGHT_SCALE", value: heightScale });
  };

  heightScaleSlider.addEventListener("input", handler, { signal: this.controller.signal });
  }