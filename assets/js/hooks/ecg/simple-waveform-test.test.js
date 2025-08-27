import { test, expect } from "@playwright/test";
import { loginAsTestUser, isWaveformVisible } from "./test-helpers.js";

test.describe("Simple Waveform Bug Reproduction", () => {
  test("reproduce the reported bug: waveform disappears when paused and fullscreen toggled", async ({
    page,
  }) => {
    // Log in as test user
    await loginAsTestUser(page);

    // Navigate to ECG viewer with sample data
    await page.goto(
      "/ecg/viewer?dataset_name=ptbxl&filename=records100%2F04000%2F04203_lr",
    );

    // Wait for the ECG player and canvas to be loaded
    await page.waitForSelector("#ecg-player", { timeout: 15000 });
    await page.waitForSelector("[data-ecg-chart] canvas", { timeout: 15000 });

    // Start playback
    const playButton = page.locator("#play-pause-button");
    await playButton.click();
    await page.waitForTimeout(3000); // Let waveform render

    // Check that waveform is visible while playing
    const waveformVisiblePlaying = await isWaveformVisible(page);
    expect(waveformVisiblePlaying.visible).toBe(true);

    // Pause playback (CRITICAL STEP 1 in the bug)
    await playButton.click();
    await page.waitForTimeout(1000);

    // Check waveform is still visible after pause
    const waveformAfterPause = await isWaveformVisible(page);
    expect(waveformAfterPause.visible).toBe(true);

    // Enter fullscreen (CRITICAL STEP 2 in the bug)
    const fullscreenButton = page.locator("#fullscreen-button");
    await fullscreenButton.click();
    await page.waitForTimeout(3000); // Wait for fullscreen transition and re-rendering

    // Check if waveform is still visible after fullscreen (THIS IS WHERE THE BUG OCCURS)
    const waveformAfterFullscreen = await isWaveformVisible(page);

    // THE BUG: waveform should remain visible but the original issue was it disappeared
    // With our fix, this should pass
    expect(waveformAfterFullscreen.visible).toBe(true);

    // Exit fullscreen to clean up
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);
  });
});
