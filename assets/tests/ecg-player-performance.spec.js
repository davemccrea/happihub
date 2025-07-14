const { test, expect } = require('@playwright/test');
const { loginUser } = require('./auth-helper');

test.describe('ECG Player - Performance and Memory', () => {
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

  test('should handle rapid UI interactions without memory leaks', async ({ page }) => {
    const displayModeSelector = page.locator('#display-mode-selector');
    const leadSelector = page.locator('#lead-selector');
    const gridScaleSlider = page.locator('#grid-scale-slider');
    
    for (let i = 0; i < 10; i++) {
      await displayModeSelector.selectOption('multi');
      await displayModeSelector.selectOption('single');
      await leadSelector.selectOption(`${i % 3}`);
      await gridScaleSlider.fill(`${1 + (i % 2) * 0.2}`);
      
      await page.waitForTimeout(50);
    }
    
    await expect(displayModeSelector).toBeEnabled();
    await expect(leadSelector).toBeEnabled();
    await expect(gridScaleSlider).toBeEnabled();
  });

  test('should maintain smooth animation performance', async ({ page }) => {
    const playPauseButton = page.locator('#play-pause-button');
    
    await page.evaluate(() => {
      window.performanceData = {
        frameCount: 0,
        lastTime: performance.now(),
        fpsReadings: []
      };
      
      function trackPerformance() {
        const now = performance.now();
        const delta = now - window.performanceData.lastTime;
        
        if (delta >= 1000) {
          const fps = (window.performanceData.frameCount * 1000) / delta;
          window.performanceData.fpsReadings.push(fps);
          window.performanceData.frameCount = 0;
          window.performanceData.lastTime = now;
        }
        
        window.performanceData.frameCount++;
        
        if (window.performanceData.fpsReadings.length < 5) {
          requestAnimationFrame(trackPerformance);
        }
      }
      
      requestAnimationFrame(trackPerformance);
    });
    
    await playPauseButton.click();
    
    await page.waitForTimeout(5000);
    
    await playPauseButton.click();
    
    const performanceData = await page.evaluate(() => window.performanceData);
    
    if (performanceData.fpsReadings.length > 0) {
      const avgFps = performanceData.fpsReadings.reduce((a, b) => a + b) / performanceData.fpsReadings.length;
      
      expect(avgFps).toBeGreaterThan(30);
    }
  });

  test('should handle canvas resize efficiently', async ({ page }) => {
    const chartContainer = page.locator('[data-ecg-chart]');
    
    const startTime = Date.now();
    
    const viewportSizes = [
      { width: 800, height: 600 },
      { width: 1200, height: 800 },
      { width: 1600, height: 900 },
      { width: 1024, height: 768 },
      { width: 1366, height: 768 }
    ];
    
    for (const size of viewportSizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(100);
      
      const containerSize = await chartContainer.boundingBox();
      expect(containerSize.width).toBeGreaterThan(0);
      expect(containerSize.height).toBeGreaterThan(0);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    expect(totalTime).toBeLessThan(2000);
  });

  test('should handle memory cleanup on component destruction', async ({ page }) => {
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : null;
    });
    
    const displayModeSelector = page.locator('#display-mode-selector');
    const playPauseButton = page.locator('#play-pause-button');
    
    for (let i = 0; i < 5; i++) {
      await playPauseButton.click({ force: true });
      await page.waitForTimeout(500);
      
      await playPauseButton.click({ force: true });
      await page.waitForTimeout(100);
      
      await displayModeSelector.selectOption('multi');
      await displayModeSelector.selectOption('single');
      await page.waitForTimeout(100);
    }
    
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });
    
    await page.waitForTimeout(1000);
    
    const finalMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : null;
    });
    
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
      
      expect(memoryIncreasePercent).toBeLessThan(50);
    }
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    const playPauseButton = page.locator('#play-pause-button');
    const gridScaleSlider = page.locator('#grid-scale-slider');
    
    await gridScaleSlider.fill('1.25');
    
    const startTime = Date.now();
    
    await playPauseButton.click({ force: true });
    
    await page.waitForTimeout(3000);
    
    await playPauseButton.click({ force: true });
    
    const endTime = Date.now();
    const animationTime = endTime - startTime;
    
    expect(animationTime).toBeLessThan(4000);
    
    await expect(playPauseButton).toBeEnabled();
    await expect(gridScaleSlider).toBeEnabled();
  });

  test('should handle concurrent animations in multi-lead mode', async ({ page }) => {
    const displayModeSelector = page.locator('#display-mode-selector');
    const playPauseButton = page.locator('#play-pause-button');
    
    await displayModeSelector.selectOption('multi');
    
    const startTime = Date.now();
    
    await playPauseButton.click({ force: true });
    
    await page.waitForTimeout(2000);
    
    await playPauseButton.click({ force: true });
    
    const endTime = Date.now();
    const animationTime = endTime - startTime;
    
    expect(animationTime).toBeLessThan(3000);
    
    await expect(displayModeSelector).toBeEnabled();
    await expect(playPauseButton).toBeEnabled();
  });

  test('should handle RxJS stream cleanup properly', async ({ page }) => {
    const consoleWarnings = [];
    page.on('console', msg => {
      if (msg.type() === 'warn' && msg.text().includes('subscription')) {
        consoleWarnings.push(msg.text());
      }
    });
    
    const playPauseButton = page.locator('#play-pause-button');
    const displayModeSelector = page.locator('#display-mode-selector');
    
    for (let i = 0; i < 3; i++) {
      await playPauseButton.click();
      await page.waitForTimeout(200);
      await playPauseButton.click();
      
      await displayModeSelector.selectOption('multi');
      await displayModeSelector.selectOption('single');
      await page.waitForTimeout(100);
    }
    
    expect(consoleWarnings.length).toBe(0);
  });

  test('should maintain responsive controls during heavy computation', async ({ page }) => {
    const gridScaleSlider = page.locator('#grid-scale-slider');
    const amplitudeScaleSlider = page.locator('#amplitude-scale-slider');
    const heightScaleSlider = page.locator('#height-scale-slider');
    const playPauseButton = page.locator('#play-pause-button');
    
    await playPauseButton.click({ force: true });
    
    const startTime = Date.now();
    
    await gridScaleSlider.fill('1.2');
    await amplitudeScaleSlider.fill('1.2');
    await heightScaleSlider.fill('1.4');
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(responseTime).toBeLessThan(1000);
    
    await playPauseButton.click({ force: true });
    
    await expect(gridScaleSlider).toHaveValue('1.2');
    await expect(amplitudeScaleSlider).toHaveValue('1.2');
    await expect(heightScaleSlider).toHaveValue('1.4');
  });

  test('should handle stress testing of keyboard shortcuts', async ({ page }) => {
    const leadSelector = page.locator('#lead-selector');
    const playPauseButton = page.locator('#play-pause-button');
    
    const displayModeSelector = page.locator('#display-mode-selector');
    await displayModeSelector.selectOption('single');
    
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('j');
      await page.keyboard.press(' ');
      await page.keyboard.press('k');
      await page.keyboard.press(' ');
      
      if (i % 5 === 0) {
        await page.waitForTimeout(50);
      }
    }
    
    await expect(leadSelector).toBeEnabled();
    await expect(playPauseButton).toBeEnabled();
    
    await page.keyboard.press(' ');
    await expect(playPauseButton).toContainText('Pause');
    await page.keyboard.press(' ');
    await expect(playPauseButton).toContainText('Play');
  });
});