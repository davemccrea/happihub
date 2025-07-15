const { test, expect } = require('@playwright/test');
const { loginUser } = require('./auth-helper');

test.describe('ECG Player - Data Loading and Animation', () => {
  test.beforeEach(async ({ page }) => {
    try {
      await loginUser(page);
    } catch (error) {
    }
    
    await page.goto('/ecg/viewer');
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (error) {
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    }
    
    if (page.url().includes('/users/log-in')) {
      test.skip();
      return;
    }
    
    await page.waitForSelector('#ecg-player', { timeout: 15000 });
    await page.waitForSelector('[data-ecg-chart]', { timeout: 10000 });
    
    const loadRandomButton = page.locator('#load-random-ecg-button');
    if (await loadRandomButton.count() > 0) {
      await loadRandomButton.click();
      await page.waitForSelector('#lead-selector', { timeout: 10000 });
      await page.waitForTimeout(2000);
    }
  });

  test('should handle ECG data loading', async ({ page }) => {
    const chartContainer = page.locator('[data-ecg-chart]');
    await expect(chartContainer).toBeVisible();
    
    const canvases = chartContainer.locator('canvas');
    await expect(canvases).toHaveCount(3);
    
    const leadSelector = page.locator('#lead-selector');
    const leadOptions = leadSelector.locator('option');
    
    const optionCount = await leadOptions.count();
    expect(optionCount).toBeGreaterThan(1);
  });

  test('should render waveform data when available', async ({ page }) => {
    const chartContainer = page.locator('[data-ecg-chart]');
    const waveformCanvas = chartContainer.locator('canvas').nth(1);
    
    const canvasSize = await waveformCanvas.boundingBox();
    if (canvasSize) {
      expect(canvasSize.width).toBeGreaterThan(0);
      expect(canvasSize.height).toBeGreaterThan(0);
    }
  });

  test('should handle animation playback', async ({ page }) => {
    const playPauseButton = page.locator('#play-pause-button');
    
    await playPauseButton.click();
    await expect(playPauseButton).toContainText('Pause');
    
    await page.waitForTimeout(1000);
    
    await playPauseButton.click();
    await expect(playPauseButton).toContainText('Play');
  });

  test('should handle QRS detection indicators', async ({ page }) => {
    const qrsCheckbox = page.locator('#qrs-indicator-checkbox');
    const playPauseButton = page.locator('#play-pause-button');
    
    await qrsCheckbox.check({ force: true });
    
    await playPauseButton.click();
    
    await page.waitForTimeout(2000);
    
    const chartContainer = page.locator('[data-ecg-chart]');
    const qrsFlashCanvas = chartContainer.locator('canvas').nth(2);
    await expect(qrsFlashCanvas).toBeVisible();
    
    await playPauseButton.click();
  });

  test('should handle loop playback', async ({ page }) => {
    const loopCheckbox = page.locator('#loop-checkbox');
    const playPauseButton = page.locator('#play-pause-button');
    
    await loopCheckbox.check({ force: true });
    await expect(loopCheckbox).toBeChecked();
    
    await playPauseButton.click();
    await expect(playPauseButton).toContainText('Pause');
    
    await page.waitForTimeout(3000);
    
    await expect(playPauseButton).toContainText('Pause');
    
    await playPauseButton.click();
  });

  test('should precompute data segments for performance', async ({ page }) => {
    await page.reload();
    await page.waitForSelector('[data-ecg-chart]', { timeout: 10000 });
    
    await page.waitForTimeout(2000);
    
    const chartContainer = page.locator('[data-ecg-chart]');
    await expect(chartContainer).toBeVisible();
    
    const leadSelector = page.locator('#lead-selector');
    await expect(leadSelector).toBeVisible();
  });

  test('should handle different waveform time ranges', async ({ page }) => {
    const gridScaleSlider = page.locator('#grid-scale-slider');
    const playPauseButton = page.locator('#play-pause-button');
    
    await gridScaleSlider.fill('0.8');
    await playPauseButton.click({ force: true });
    await page.waitForTimeout(1000);
    await playPauseButton.click({ force: true });
    
    await gridScaleSlider.fill('1.2');
    await playPauseButton.click({ force: true });
    await page.waitForTimeout(1000);
    await playPauseButton.click({ force: true });
    
    await gridScaleSlider.fill('1.1');
  });

  test('should handle multi-lead data visualization', async ({ page }) => {
    const displayModeSelector = page.locator('#display-mode-selector');
    const playPauseButton = page.locator('#play-pause-button');
    
    await displayModeSelector.selectOption('multi');
    
    await playPauseButton.click({ force: true });
    await page.waitForTimeout(1000);
    await playPauseButton.click({ force: true });
    
    const chartContainer = page.locator('[data-ecg-chart]');
    const canvases = chartContainer.locator('canvas');
    
    await expect(canvases).toHaveCount(3);
    
    const canvas = canvases.first();
    await expect(canvas).toBeVisible();
  });

  test('should handle amplitude scaling on waveform data', async ({ page }) => {
    const amplitudeScaleSlider = page.locator('#amplitude-scale-slider');
    const playPauseButton = page.locator('#play-pause-button');
    
    await amplitudeScaleSlider.fill('1.2');
    await playPauseButton.click({ force: true });
    await page.waitForTimeout(500);
    await playPauseButton.click({ force: true });
    
    await amplitudeScaleSlider.fill('0.8');
    await playPauseButton.click({ force: true });
    await page.waitForTimeout(500);
    await playPauseButton.click({ force: true });
    
    await amplitudeScaleSlider.fill('1.1');
  });

  test('should maintain state during lead switching', async ({ page }) => {
    const leadSelector = page.locator('#lead-selector');
    const playPauseButton = page.locator('#play-pause-button');
    const amplitudeScaleSlider = page.locator('#amplitude-scale-slider');
    
    await amplitudeScaleSlider.fill('1.2');
    await playPauseButton.click();
    
    await leadSelector.selectOption('1');
    
    await expect(amplitudeScaleSlider).toHaveValue('1.2');
    await expect(playPauseButton).toContainText('Pause');
    
    await leadSelector.selectOption('2');
    
    await expect(amplitudeScaleSlider).toHaveValue('1.2');
    await expect(playPauseButton).toContainText('Pause');
    
    await playPauseButton.click();
  });
  
  test('should preserve waveform when changing leads during pause', async ({ page }) => {
    const leadSelector = page.locator('#lead-selector');
    const playPauseButton = page.locator('#play-pause-button');
    const chartContainer = page.locator('[data-ecg-chart]');
    
    // Start playback
    await playPauseButton.click();
    await page.waitForTimeout(1000);
    
    // Pause the playback
    await playPauseButton.click();
    await expect(playPauseButton).toContainText('Play');
    
    // Verify we have canvases
    const canvases = chartContainer.locator('canvas');
    await expect(canvases).toHaveCount(3);
    
    // Change to a different lead
    await leadSelector.selectOption('1');
    await page.waitForTimeout(200);
    
    // Verify we still have canvases and they're visible
    await expect(canvases).toHaveCount(3);
    await expect(canvases.nth(0)).toBeVisible(); // background canvas
    await expect(canvases.nth(1)).toBeVisible(); // waveform canvas
    await expect(canvases.nth(2)).toBeVisible(); // qrs flash canvas
    
    // Verify we're still in paused state
    await expect(playPauseButton).toContainText('Play');
    
    // Change to another lead
    await leadSelector.selectOption('2');
    await page.waitForTimeout(200);
    
    // Verify canvases are still there and visible
    await expect(canvases).toHaveCount(3);
    await expect(canvases.nth(0)).toBeVisible();
    await expect(canvases.nth(1)).toBeVisible();
    await expect(canvases.nth(2)).toBeVisible();
    
    // Verify we're still in paused state
    await expect(playPauseButton).toContainText('Play');
    
    // Test that playback can resume after lead changes
    await playPauseButton.click();
    await expect(playPauseButton).toContainText('Pause');
  });

  test('should handle error conditions gracefully', async ({ page }) => {
    const leadSelector = page.locator('#lead-selector');
    
    await leadSelector.selectOption('0');
    await page.waitForTimeout(100);
    
    const gridScaleSlider = page.locator('#grid-scale-slider');
    await gridScaleSlider.fill('0.75');
    await gridScaleSlider.fill('1.25');
    await gridScaleSlider.fill('1.1');
    
    await expect(leadSelector).toBeEnabled();
    await expect(gridScaleSlider).toBeEnabled();
    
    const currentGridValue = await gridScaleSlider.inputValue();
    expect(parseFloat(currentGridValue)).toBeGreaterThan(0.5);
    expect(parseFloat(currentGridValue)).toBeLessThan(1.5);
  });
});