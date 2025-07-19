// @ts-check

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
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}

export function playPauseButtonListener() {
  const button = document.getElementById("play-pause-button");

  if (!button) {
    console.error("Element #play-pause-button not found");
    return () => {};
  }

  const handler = () => this.actor.send({ type: "TOGGLE_PLAY_PAUSE" });
  button.addEventListener("click", handler);
  return () => button.removeEventListener("click", handler);
}

export function calipersListener() {
  const calipersButton = document.getElementById("calipers-button");

  if (!calipersButton) {
    console.error("Element #calipers-button not found");
    return () => {};
  }

  const handler = () => {
    this.actor.send({ type: "TOGGLE_CALIPERS" });
  };

  calipersButton.addEventListener("click", handler);
  return () => calipersButton.removeEventListener("click", handler);
}

// Forms

export function currentLeadListener() {
  const leadSelect = document.getElementById("lead-selector");
  if (!leadSelect) {
    console.error("Element #lead-selector not found");
    return () => {};
  }
  const handler = (event) => {
    const leadIndex = parseInt(event.target.value);
    this.actor.send({ type: "CHANGE_LEAD", leadIndex });
  };
  leadSelect.addEventListener("change", handler);
  return () => leadSelect.removeEventListener("change", handler);
}

export function displayModeListener() {
  const displayModeSelect = document.getElementById("display-mode-selector");

  if (!displayModeSelect) {
    console.error("Element #display-mode-selector not found");
    return () => {};
  }

  const handler = (event) => {
    const displayMode = event.target.value;
    this.actor.send({ type: "CHANGE_DISPLAY_MODE", displayMode });
  };

  displayModeSelect.addEventListener("change", handler);
  return () => displayModeSelect.removeEventListener("change", handler);
}

export function gridTypeListener() {
  const gridTypeSelect = document.getElementById("grid-type-selector");

  if (!gridTypeSelect) {
    console.error("Element #grid-type-selector not found");
    return () => {};
  }

  const handler = (event) => {
    const gridType = event.target.value;
    this.actor.send({ type: "CHANGE_GRID_TYPE", gridType });
  };

  gridTypeSelect.addEventListener("change", handler);
  return () => gridTypeSelect.removeEventListener("change", handler);
}

// Checkboxes

export function loopListener() {
  const loopCheckbox = document.getElementById("loop-checkbox");

  if (!loopCheckbox) {
    console.error("Element #loop-checkbox not found");
    return () => {};
  }

  const handler = () => {
    this.actor.send({ type: "TOGGLE_LOOP" });
  };

  loopCheckbox.addEventListener("change", handler);
  return () => loopCheckbox.removeEventListener("change", handler);
}

export function qrsIndicatorListener() {
  const qrsCheckbox = document.getElementById("qrs-indicator-checkbox");

  if (!qrsCheckbox) {
    console.error("Element #qrs-indicator-checkbox not found");
    return () => {};
  }

  const handler = () => {
    this.actor.send({ type: "TOGGLE_QRS_INDICATOR" });
  };

  qrsCheckbox.addEventListener("change", handler);
  return () => qrsCheckbox.removeEventListener("change", handler);
}
