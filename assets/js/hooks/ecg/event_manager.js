// @ts-check

function addListener(setupMethod) {
  const cleanup = setupMethod.call(this);
  this.listeners.add(cleanup);
  return cleanup;
}

export function setupEventListeners() {
  addListener.call(this, keydownListener.bind(this));
  this.setupPlayPauseEventListener();
  this.setupFormEventListeners();
  addListener.call(this, calipersListener.bind(this));
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
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}

// Buttons

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

