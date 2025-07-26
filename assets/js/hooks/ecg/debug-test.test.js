import { test, expect } from '@playwright/test';
import { loginAsTestUser } from "./test-helpers.js";

test.describe('Debug Cursor Progress Calculation', () => {
  test('examine cursor progress calculation during fullscreen transition', async ({ page }) => {
    // Log in as test user
    await loginAsTestUser(page);

    // Navigate to ECG viewer with sample data
    await page.goto('/ecg/viewer?dataset_name=ptbxl&filename=records100%2F04000%2F04203_lr');
    
    // Wait for the ECG player and canvas to be loaded
    await page.waitForSelector("#ecg-player", { timeout: 15000 });
    await page.waitForSelector("[data-ecg-chart] canvas", { timeout: 15000 });

    // Capture console logs to monitor cursor progress calculations
    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('🎬') || msg.text().includes('cursorProgress') || msg.text().includes('widthSeconds')) {
        logs.push(msg.text());
      }
    });

    // Start playback, let it run, then pause
    const playButton = page.locator("#play-pause-button");
    await playButton.click();
    await page.waitForTimeout(2000); // Let it play for a bit
    await playButton.click(); // Pause
    await page.waitForTimeout(1000);

    logs.length = 0; // Clear logs

    // Enter fullscreen - this should trigger renderCurrentFrame()
    const fullscreenButton = page.locator("#fullscreen-button");
    await fullscreenButton.click();
    await page.waitForTimeout(3000);

    // Check if waveform is visible
    const waveformAfterFullscreen = await page.evaluate(() => {
      const waveformCanvas = document.querySelector('[data-ecg-chart] canvas:nth-child(2)');
      if (!waveformCanvas) return { error: 'Canvas not found' };
      
      const ctx = waveformCanvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, waveformCanvas.width, waveformCanvas.height);
      const data = imageData.data;
      
      let nonTransparentPixels = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) nonTransparentPixels++;
      }
      
      return {
        visible: nonTransparentPixels > 0,
        pixelCount: nonTransparentPixels,
        canvasSize: { width: waveformCanvas.width, height: waveformCanvas.height }
      };
    });

    // Exit fullscreen
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  });
});