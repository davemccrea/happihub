import { test, expect } from '@playwright/test';
import { loginAsTestUser } from "./test-helpers.js";

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

    // Capture console logs to monitor the fullscreen transition
    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('🔄') || msg.text().includes('🎆') || msg.text().includes('🎨')) {
        logs.push(msg.text());
      }
    });

    // Function to check waveform visibility
    const checkWaveform = async (label) => {
      const result = await page.evaluate(() => {
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
          canvasSize: { width: waveformCanvas.width, height: waveformCanvas.height },
          strokeStyle: ctx.strokeStyle
        };
      });
      
      console.log(`${label}:`, result);
      return result;
    };

    // Check waveform before fullscreen
    const beforeFullscreen = await checkWaveform('Before fullscreen');
    expect(beforeFullscreen.visible).toBe(true);

    // Enter fullscreen and monitor throughout the transition
    const fullscreenButton = page.locator("#fullscreen-button");
    
    // Start fullscreen transition
    await fullscreenButton.click();
    
    // Check immediately after clicking
    await page.waitForTimeout(100);
    const immediately = await checkWaveform('Immediately after fullscreen click');
    
    // Check after 500ms (during transition)
    await page.waitForTimeout(400);
    const during500 = await checkWaveform('After 500ms');
    
    // Check after 1000ms
    await page.waitForTimeout(500);
    const during1000 = await checkWaveform('After 1000ms');
    
    // Check after 2000ms
    await page.waitForTimeout(1000);
    const during2000 = await checkWaveform('After 2000ms');
    
    // Check after 5000ms (should be fully settled)
    await page.waitForTimeout(3000);
    const final = await checkWaveform('Final check after 5000ms');

    // Print all the console logs from the transition
    console.log('Console logs during transition:');
    logs.forEach(log => console.log(log));

    // The key test: waveform should remain visible throughout the entire transition
    console.log('\n=== TRANSITION SUMMARY ===');
    console.log('Before:', beforeFullscreen.visible, beforeFullscreen.pixelCount);
    console.log('Immediately:', immediately.visible, immediately.pixelCount);  
    console.log('500ms:', during500.visible, during500.pixelCount);
    console.log('1000ms:', during1000.visible, during1000.pixelCount);
    console.log('2000ms:', during2000.visible, during2000.pixelCount);
    console.log('Final:', final.visible, final.pixelCount);

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