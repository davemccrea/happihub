// @ts-check

export function setButtonToPlay() {
  const button = document.getElementById("play-pause-button");
  if (button) {
    const iconHtml = `<svg class="w-4 h-4 hero-play" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" /></svg>`;
    const textHtml = `<span class="ml-1">Play</span>`;
    button.innerHTML = iconHtml + textHtml;
  }
}

export function setButtonToPause() {
  const button = document.getElementById("play-pause-button");
  if (button) {
    const iconHtml = `<svg class="w-4 h-4 hero-pause" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" /></svg>`;
    const textHtml = `<span class="ml-1">Pause</span>`;
    button.innerHTML = iconHtml + textHtml;
  }
}

export function setCalipersButtonToDisabled() {
  const button = document.getElementById("calipers-button");
  if (button && button.classList) {
    button.classList.remove("btn-active");
    button.title = "Enable Time Calipers (c)";
  }

  // Handle canvas interaction as part of the button state (same pattern as play/pause)
  const calipersCanvas = document.querySelector("[data-ecg-chart] canvas:last-child");
  if (calipersCanvas) {
    calipersCanvas.style.pointerEvents = "none";
    calipersCanvas.style.cursor = "default";
  }
}

export function setCalipersButtonToEnabled() {
  const button = document.getElementById("calipers-button");
  if (button && button.classList) {
    button.classList.add("btn-active");
    button.title = "Disable Time Calipers (c)";
  }

  // Handle canvas interaction as part of the button state (same pattern as play/pause)
  const calipersCanvas = document.querySelector("[data-ecg-chart] canvas:last-child");
  if (calipersCanvas) {
    calipersCanvas.style.pointerEvents = "auto";
    calipersCanvas.style.cursor = "crosshair";
  }
}
