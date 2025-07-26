import { test, expect } from '@playwright/test';
import { loginAsTestUser, isWaveformVisible } from "./test-helpers.js";

test.describe('Debug Cursor Progress Calculation', () => {
  test('examine cursor progress calculation during fullscreen transition', async ({ page }) => {
    // Log in as test user
    await loginAsTestUser(page);

    // Navigate to ECG viewer with sample data
    await page.goto('/ecg/viewer?dataset_name=ptbxl&filename=records100%2F04000%2F04203_lr');
    
    // Wait for the ECG player and canvas to be loaded
    await page.waitForSelector("#ecg-player", { timeout: 15000 });
    await page.waitForSelector("[data-ecg-chart] canvas", { timeout: 15000 });

    // Start playback, let it run, then pause
    const playButton = page.locator("#play-pause-button");
    await playButton.click();
    await page.waitForTimeout(2000); // Let it play for a bit
    await playButton.click(); // Pause
    await page.waitForTimeout(1000);

    // Enter fullscreen - this should trigger renderCurrentFrame()
    const fullscreenButton = page.locator("#fullscreen-button");
    await fullscreenButton.click();
    await page.waitForTimeout(3000);

    // Check if waveform is visible
    const waveformAfterFullscreen = await isWaveformVisible(page);
    expect(waveformAfterFullscreen.visible).toBe(true);

    // Exit fullscreen
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  });
});