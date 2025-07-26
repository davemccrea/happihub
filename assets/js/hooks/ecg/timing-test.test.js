import { test, expect } from '@playwright/test';
import { loginAsTestUser, isWaveformVisible } from "./test-helpers.js";

test.describe('ECG Waveform Timing Issues', () => {
  test('monitor waveform visibility continuously during fullscreen transition', async ({ page }) => {
    // Log in as test user
    await loginAsTestUser(page);

    // Navigate to ECG viewer with sample data
    await page.goto('/ecg/viewer?dataset_name=ptbxl&filename=records100%2F04000%2F04203_lr');
    
    // Wait for the ECG player and canvas to be loaded
    await page.waitForSelector("#ecg-player", { timeout: 15000 });
    await page.waitForSelector("[data-ecg-chart] canvas", { timeout: 15000 });

    // Start playback and let waveform render
    const playButton = page.locator("#play-pause-button");
    await playButton.click();
    await page.waitForTimeout(3000);

    // Pause playback 
    await playButton.click();
    await page.waitForTimeout(1000);

    // Check waveform before fullscreen
    const beforeFullscreen = await isWaveformVisible(page);
    expect(beforeFullscreen.visible).toBe(true);

    // Enter fullscreen and monitor throughout the transition
    const fullscreenButton = page.locator("#fullscreen-button");
    
    // Start fullscreen transition
    await fullscreenButton.click();
    
    // Check immediately after clicking
    await page.waitForTimeout(100);
    const immediately = await isWaveformVisible(page);
    
    // Check after 500ms (during transition)
    await page.waitForTimeout(400);
    const during500 = await isWaveformVisible(page);
    
    // Check after 1000ms
    await page.waitForTimeout(500);
    const during1000 = await isWaveformVisible(page);
    
    // Check after 2000ms
    await page.waitForTimeout(1000);
    const during2000 = await isWaveformVisible(page);
    
    // Check after 5000ms (should be fully settled)
    await page.waitForTimeout(3000);
    const final = await isWaveformVisible(page);

    // If any of these fail, we've identified when the waveform disappears
    expect(immediately.visible).toBe(true);
    expect(during500.visible).toBe(true);
    expect(during1000.visible).toBe(true);
    expect(during2000.visible).toBe(true);
    expect(final.visible).toBe(true);

    // Exit fullscreen to clean up
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  });
});