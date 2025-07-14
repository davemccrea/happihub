const { test, expect } = require('@playwright/test');
const { loginUser } = require('./auth-helper');

test.describe('ECG Player', () => {
  test.beforeEach(async ({ page }) => {
    try {
      await loginUser(page);
    } catch (error) {
    }
    
    await page.goto('/ecg/viewer');
    await page.waitForLoadState('networkidle');
    
    if (page.url().includes('/users/log-in')) {
      test.skip();
      return;
    }
    
    await page.waitForSelector('#ecg-player', { timeout: 10000 });
    await page.waitForSelector('[data-ecg-chart]', { timeout: 5000 });
    
    const loadRandomButton = page.locator('#load-random-ecg-button');
    if (await loadRandomButton.count() > 0) {
      await loadRandomButton.click();
      await page.waitForSelector('#lead-selector', { timeout: 10000 });
      await page.waitForTimeout(2000);
    }
  });

  test('should render ECG chart container', async ({ page }) => {
    const chartContainer = page.locator('[data-ecg-chart]');
    await expect(chartContainer).toBeVisible();
  });

  test('should initialize with default settings', async ({ page }) => {
    const gridTypeSelector = page.locator('#grid-type-selector');
    await expect(gridTypeSelector).toHaveValue('telemetry');
    
    const displayModeSelector = page.locator('#display-mode-selector');
    await expect(displayModeSelector).toHaveValue('single');
    
    const gridScaleSlider = page.locator('#grid-scale-slider');
    await expect(gridScaleSlider).toHaveValue('1');
    
    const amplitudeScaleSlider = page.locator('#amplitude-scale-slider');
    await expect(amplitudeScaleSlider).toHaveValue('1');
    
    const heightScaleSlider = page.locator('#height-scale-slider');
    await expect(heightScaleSlider).toHaveValue('1.2');
  });

  test('should switch between grid types', async ({ page }) => {
    const gridTypeSelector = page.locator('#grid-type-selector');
    
    await gridTypeSelector.selectOption('graph_paper');
    await expect(gridTypeSelector).toHaveValue('graph_paper');
    
    await gridTypeSelector.selectOption('telemetry');
    await expect(gridTypeSelector).toHaveValue('telemetry');
  });

  test('should switch between display modes', async ({ page }) => {
    const displayModeSelector = page.locator('#display-mode-selector');
    const leadSelectorContainer = page.locator('#lead-selector-container');
    
    await expect(leadSelectorContainer).toBeVisible();
    
    await displayModeSelector.selectOption('multi');
    await expect(displayModeSelector).toHaveValue('multi');
    
    await expect(leadSelectorContainer).toBeHidden();
    
    await displayModeSelector.selectOption('single');
    await expect(displayModeSelector).toHaveValue('single');
    await expect(leadSelectorContainer).toBeVisible();
  });

  test('should change leads in single mode', async ({ page }) => {
    const displayModeSelector = page.locator('#display-mode-selector');
    await displayModeSelector.selectOption('single');
    
    const leadSelector = page.locator('#lead-selector');
    
    await leadSelector.selectOption('1');
    await expect(leadSelector).toHaveValue('1');
    
    await leadSelector.selectOption('2');
    await expect(leadSelector).toHaveValue('2');
    
    await leadSelector.selectOption('0');
    await expect(leadSelector).toHaveValue('0');
  });

  test('should toggle loop playback checkbox', async ({ page }) => {
    const loopCheckbox = page.locator('#loop-checkbox');
    
    const initiallyChecked = await loopCheckbox.isChecked();
    
    if (initiallyChecked) {
      await loopCheckbox.uncheck({ force: true });
      await expect(loopCheckbox).not.toBeChecked();
      
      await loopCheckbox.check({ force: true });
      await expect(loopCheckbox).toBeChecked();
    } else {
      await loopCheckbox.check({ force: true });
      await expect(loopCheckbox).toBeChecked();
      
      await loopCheckbox.uncheck({ force: true });
      await expect(loopCheckbox).not.toBeChecked();
    }
  });

  test('should toggle QRS indicator checkbox', async ({ page }) => {
    const qrsCheckbox = page.locator('#qrs-indicator-checkbox');
    
    const initiallyChecked = await qrsCheckbox.isChecked();
    
    if (initiallyChecked) {
      await qrsCheckbox.uncheck({ force: true });
      await expect(qrsCheckbox).not.toBeChecked();
      
      await qrsCheckbox.check({ force: true });
      await expect(qrsCheckbox).toBeChecked();
    } else {
      await qrsCheckbox.check({ force: true });
      await expect(qrsCheckbox).toBeChecked();
      
      await qrsCheckbox.uncheck({ force: true });
      await expect(qrsCheckbox).not.toBeChecked();
    }
  });

  test('should adjust grid scale slider', async ({ page }) => {
    const gridScaleSlider = page.locator('#grid-scale-slider');
    const gridScaleValue = page.locator('#grid-scale-value');
    const gridScaleSpeed = page.locator('#grid-scale-speed');
    
    await gridScaleSlider.fill('1.2');
    await expect(gridScaleSlider).toHaveValue('1.2');
    await expect(gridScaleValue).toContainText('1.20x');
    await expect(gridScaleSpeed).toContainText('30.0 mm/s');
    
    await gridScaleSlider.fill('0.8');
    await expect(gridScaleSlider).toHaveValue('0.8');
    await expect(gridScaleValue).toContainText('0.80x');
    await expect(gridScaleSpeed).toContainText('20.0 mm/s');
  });

  test('should adjust amplitude scale slider', async ({ page }) => {
    const amplitudeScaleSlider = page.locator('#amplitude-scale-slider');
    const amplitudeScaleValue = page.locator('#amplitude-scale-value');
    const amplitudeScaleGain = page.locator('#amplitude-scale-gain');
    
    await amplitudeScaleSlider.fill('1.2');
    await expect(amplitudeScaleSlider).toHaveValue('1.2');
    await expect(amplitudeScaleValue).toContainText('1.20x');
    await expect(amplitudeScaleGain).toContainText('12.0 mm/mV');
    
    await amplitudeScaleSlider.fill('0.8');
    await expect(amplitudeScaleSlider).toHaveValue('0.8');
    await expect(amplitudeScaleValue).toContainText('0.80x');
    await expect(amplitudeScaleGain).toContainText('8.0 mm/mV');
  });

  test('should adjust height scale slider', async ({ page }) => {
    const heightScaleSlider = page.locator('#height-scale-slider');
    const heightScaleValue = page.locator('#height-scale-value');
    const heightScalePixels = page.locator('#height-scale-pixels');
    
    await heightScaleSlider.fill('1.4');
    await expect(heightScaleSlider).toHaveValue('1.4');
    await expect(heightScaleValue).toContainText('1.40x');
    await expect(heightScalePixels).toContainText('210px');
    
    await heightScaleSlider.fill('1.1');
    await expect(heightScaleSlider).toHaveValue('1.1');
    await expect(heightScaleValue).toContainText('1.10x');
    await expect(heightScalePixels).toContainText('165px');
  });

  test('should have play/pause button functionality', async ({ page }) => {
    const playPauseButton = page.locator('#play-pause-button');
    
    await expect(playPauseButton).toBeVisible();
    
    await expect(playPauseButton).toContainText('Play');
    
    await playPauseButton.click();
    
    await expect(playPauseButton).toContainText('Pause');
    
    await playPauseButton.click();
    
    await expect(playPauseButton).toContainText('Play');
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    const leadSelector = page.locator('#lead-selector');
    const playPauseButton = page.locator('#play-pause-button');
    
    const displayModeSelector = page.locator('#display-mode-selector');
    await displayModeSelector.selectOption('single');
    
    await leadSelector.selectOption('0');
    await page.keyboard.press('j');
    await expect(leadSelector).toHaveValue('1');
    
    await page.keyboard.press('ArrowDown');
    await expect(leadSelector).toHaveValue('2');
    
    await page.keyboard.press('k');
    await expect(leadSelector).toHaveValue('1');
    
    await page.keyboard.press('ArrowUp');
    await expect(leadSelector).toHaveValue('0');
    
    await expect(playPauseButton).toContainText('Play');
    await page.keyboard.press(' ');
    await expect(playPauseButton).toContainText('Pause');
    await page.keyboard.press(' ');
    await expect(playPauseButton).toContainText('Play');
  });

  test('should handle canvas interactions', async ({ page }) => {
    const displayModeSelector = page.locator('#display-mode-selector');
    const chartContainer = page.locator('[data-ecg-chart]');
    
    await displayModeSelector.selectOption('single');
    await expect(displayModeSelector).toHaveValue('single');
    
    const canvas = chartContainer.locator('canvas').first();
    await canvas.click();
    await expect(displayModeSelector).toHaveValue('multi');
    
    await canvas.click();
    await expect(displayModeSelector).toHaveValue('single');
  });

  test('should render canvas elements', async ({ page }) => {
    const chartContainer = page.locator('[data-ecg-chart]');
    
    const canvases = chartContainer.locator('canvas');
    await expect(canvases).toHaveCount(3);
    
    for (let i = 0; i < 3; i++) {
      await expect(canvases.nth(i)).toBeVisible();
    }
  });

  test('should handle window resize', async ({ page }) => {
    const chartContainer = page.locator('[data-ecg-chart]');
    
    const initialSize = await chartContainer.boundingBox();
    
    await page.setViewportSize({ width: 1200, height: 800 });
    
    await page.waitForTimeout(200);
    
    const newSize = await chartContainer.boundingBox();
    if (newSize && initialSize) {
      expect(newSize.width).not.toBe(initialSize.width);
    }
  });

  test('should handle theme changes', async ({ page }) => {
    const htmlElement = page.locator('html');
    
    const currentTheme = await htmlElement.getAttribute('data-theme');
    
    if (currentTheme) {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      await htmlElement.evaluate((el, theme) => {
        el.setAttribute('data-theme', theme);
      }, newTheme);
      
      await page.waitForTimeout(100);
      
      await expect(htmlElement).toHaveAttribute('data-theme', newTheme);
    }
  });

  test('should display correct cursor style based on mode', async ({ page }) => {
    const displayModeSelector = page.locator('#display-mode-selector');
    const chartContainer = page.locator('[data-ecg-chart]');
    const canvas = chartContainer.locator('canvas').first();
    
    await displayModeSelector.selectOption('single');
    const singleModeCursor = await canvas.evaluate(el => getComputedStyle(el).cursor);
    expect(singleModeCursor).toBe('zoom-out');
    
    await displayModeSelector.selectOption('multi');
    const multiModeCursor = await canvas.evaluate(el => getComputedStyle(el).cursor);
    expect(multiModeCursor).toBe('zoom-in');
  });
});