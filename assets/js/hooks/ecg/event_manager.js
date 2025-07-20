// @ts-check

import { DOM_SELECTORS } from "./constants";

export function setupEventListeners() {
  keydownListener.call(this);
  this.setupPlayPauseEventListener();
  this.setupFormEventListeners();
  calipersListener.call(this);
}

export function setupLiveViewEventHandlers() {
  this.handleEvent("load_ecg_data", (payload) => {
    try {
      const data = payload.data;
      if (!data.fs || !data.sig_name || !data.p_signal) {
        return this.actor.send({
          type: "ERROR",
          message: "Invalid ECG data format",
        });
      }

      this.actor.send({
        type: "DATA_LOADED",
        data: this.processECGData(data),
      });
    } catch (error) {
      this.actor.send({ type: "ERROR", message: error.message });
    }
  });
}

// Keys

export function keydownListener() {
  const handler = (event) => {
    // Only handle shortcuts when the ECG player is focused or no input is focused
    const activeElement = document.activeElement;
    const isInputFocused =
      activeElement?.tagName === "INPUT" ||
      activeElement?.tagName === "TEXTAREA" ||
      activeElement?.tagName === "SELECT";

    if (isInputFocused) return;

    const { context } = this.actor.getSnapshot();
    if (!context.ecgData?.leadNames) return;

    switch (event.key) {
      case "j":
        event.preventDefault();
        this.actor.send({ type: "NEXT_LEAD" });
        break;
      case "k":
        event.preventDefault();
        this.actor.send({ type: "PREV_LEAD" });
        break;
    }
  };
  document.addEventListener("keydown", handler, { signal: this.controller.signal });
}

// Buttons

export function calipersListener() {
  const calipersButton = document.getElementById(DOM_SELECTORS.CALIPERS_BUTTON);

  if (!calipersButton) {
    console.error("Element #calipers-button not found");
    return;
  }

  const handler = () => {
    this.actor.send({ type: "TOGGLE_CALIPERS" });
  };

  calipersButton.addEventListener("click", handler, { signal: this.controller.signal });
}

