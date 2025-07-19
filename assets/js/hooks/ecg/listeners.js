// @ts-check

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
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}

// Buttons

export function playPauseListener() {
  const playPauseButton = document.getElementById("play-pause-button");

  if (!playPauseButton) {
    console.error("Element #play-pause-button not found");
    return () => {};
  }

  const handler = () => this.actor.send({ type: "TOGGLE_PLAY_PAUSE" });
  playPauseButton.addEventListener("click", handler);
  return () => playPauseButton.removeEventListener("click", handler);
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

// Selects

export function currentLeadListener() {
  const currentLeadSelect = document.getElementById("lead-selector");
  if (!currentLeadSelect) {
    console.error("Element #lead-selector not found");
    return () => {};
  }
  const handler = (event) => {
    const leadIndex = parseInt(event.target.value);
    this.actor.send({ type: "CHANGE_LEAD", leadIndex });
  };
  currentLeadSelect.addEventListener("change", handler);
  return () => currentLeadSelect.removeEventListener("change", handler);
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
  const qrsIndicatorCheckbox = document.getElementById("qrs-indicator-checkbox");

  if (!qrsIndicatorCheckbox) {
    console.error("Element #qrs-indicator-checkbox not found");
    return () => {};
  }

  const handler = () => {
    this.actor.send({ type: "TOGGLE_QRS_INDICATOR" });
  };

  qrsIndicatorCheckbox.addEventListener("change", handler);
  return () => qrsIndicatorCheckbox.removeEventListener("change", handler);
}

// Scale Sliders

export function gridScaleListener() {
  const gridScaleSlider = document.getElementById("grid-scale-slider");

  if (!gridScaleSlider) {
    console.error("Element #grid-scale-slider not found");
    return () => {};
  }

  const handler = (event) => {
    const gridScale = parseFloat(event.target.value);
    this.actor.send({ type: "CHANGE_GRID_SCALE", gridScale });
  };

  gridScaleSlider.addEventListener("input", handler);
  return () => gridScaleSlider.removeEventListener("input", handler);
}

export function amplitudeScaleListener() {
  const amplitudeScaleSlider = document.getElementById(
    "amplitude-scale-slider"
  );

  if (!amplitudeScaleSlider) {
    console.error("Element #amplitude-scale-slider not found");
    return () => {};
  }

  const handler = (event) => {
    const amplitudeScale = parseFloat(event.target.value);
    this.actor.send({ type: "CHANGE_AMPLITUDE_SCALE", amplitudeScale });
  };

  amplitudeScaleSlider.addEventListener("input", handler);
  return () => amplitudeScaleSlider.removeEventListener("input", handler);
}

export function heightScaleListener() {
  const heightScaleSlider = document.getElementById("height-scale-slider");

  if (!heightScaleSlider) {
    console.error("Element #height-scale-slider not found");
    return () => {};
  }

  const handler = (event) => {
    const heightScale = parseFloat(event.target.value);
    this.actor.send({ type: "CHANGE_HEIGHT_SCALE", heightScale });
  };

  heightScaleSlider.addEventListener("input", handler);
  return () => heightScaleSlider.removeEventListener("input", handler);
}
