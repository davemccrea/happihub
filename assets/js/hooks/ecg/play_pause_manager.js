// @ts-check

/**
 * PlayPauseManager - Manages play/pause button functionality
 * 
 * This module handles:
 * - Play/pause button event listeners
 * - Button state management (play/pause visual states)
 * 
 * Following the modular pattern established with calipers_manager.js
 */

/**
 * Sets up play/pause button event listener
 * @param {Function} sendEvent - Function to send events to state machine
 * @param {Set} listeners - Set to track cleanup functions
 * @returns {Function} Cleanup function to remove play/pause event listener
 */
export function setupPlayPauseEventListener(sendEvent, listeners) {
  const playPauseButton = document.getElementById("play-pause-button");

  if (!playPauseButton) {
    console.error("Element #play-pause-button not found");
    return () => {};
  }

  const handler = () => sendEvent({ type: "TOGGLE_PLAY_PAUSE" });
  playPauseButton.addEventListener("click", handler);

  // Create cleanup function
  const cleanup = () => {
    playPauseButton.removeEventListener("click", handler);
  };

  // Track cleanup function in the global listeners set
  listeners.add(cleanup);
  
  // Return cleanup function so it can be called specifically for play/pause
  return cleanup;
}

/**
 * Sets button to play state (shows play icon and text)
 */
export function setButtonToPlay() {
  const button = document.getElementById("play-pause-button");
  if (button) {
    const iconHtml = `<svg class="w-4 h-4 hero-play" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" /></svg>`;
    const textHtml = `<span class="ml-1">Play</span>`;
    button.innerHTML = iconHtml + textHtml;
  }
}

/**
 * Sets button to pause state (shows pause icon and text)
 */
export function setButtonToPause() {
  const button = document.getElementById("play-pause-button");
  if (button) {
    const iconHtml = `<svg class="w-4 h-4 hero-pause" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" /></svg>`;
    const textHtml = `<span class="ml-1">Pause</span>`;
    button.innerHTML = iconHtml + textHtml;
  }
}