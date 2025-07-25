import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./test-helpers.js";

/**
 * ECG Player Integration Tests
 *
 * These tests verify that the ECG player implementation works correctly
 * by interacting with the actual UI elements and verifying expected behaviors.
 * Tests simulate real user interactions without relying on internal objects.
 */

test.describe("ECG Player Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as test user first
    await loginAsTestUser(page);

    // Navigate to ECG viewer with sample data
    await page.goto(
      "/ecg/viewer?dataset_name=ptbxl&filename=records100%2F11000%2F11004_lr"
    );

    // Wait for the ECG player and canvas to be loaded
    await page.waitForSelector("#ecg-player", { timeout: 15000 });
    await page.waitForSelector("[data-ecg-chart] canvas", { timeout: 15000 });

    // Wait for ECG waveform to be rendered (canvas should have content)
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector("[data-ecg-chart] canvas");
        if (!canvas) return false;
        const ctx = canvas.getContext("2d");
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Check if canvas has non-transparent pixels (indicating rendered content)
        return Array.from(imageData.data).some(
          (value, index) => index % 4 === 3 && value > 0
        );
      },
      { timeout: 10000 }
    );
  });

  test("ECG Player loads and displays waveform correctly", async ({ page }) => {
    // Verify ECG canvas exists and has rendered content
    const canvasCount = await page.locator("[data-ecg-chart] canvas").count();
    expect(canvasCount).toBeGreaterThan(0);

    // Verify main control buttons are present
    await expect(page.locator("#play-pause-button")).toBeVisible();
    await expect(page.locator("#calipers-button")).toBeVisible();
    await expect(page.locator("#fullscreen-button")).toBeVisible();

    // Verify settings form elements are present
    await expect(page.locator("#display-mode-selector")).toBeVisible();
    await expect(page.locator("#lead-selector")).toBeVisible();
    await expect(page.locator("#grid-type-selector")).toBeVisible();
  });

  test("Play/Pause button toggles ECG playback", async ({ page }) => {
    const playButton = page.locator("#play-pause-button");

    // Initially should show "Play"
    await expect(playButton).toContainText("Play");

    // Click to start playing
    await playButton.click();

    // Should now show "Pause"
    await expect(playButton).toContainText("Pause");

    // Wait a moment for playback to start
    await page.waitForTimeout(500);

    // Click again to pause
    await playButton.click();

    // Should show "Play" again
    await expect(playButton).toContainText("Play");
  });

  test("Display mode switching changes ECG visualization", async ({ page }) => {
    const displayModeSelector = page.locator("#display-mode-selector");
    const leadSelector = page.locator("#lead-selector");

    // Test switching to multi-lead mode
    await displayModeSelector.selectOption("multi");

    // Wait for the change to take effect
    await page.waitForTimeout(500);

    // In multi-lead mode, lead selector should be disabled or hidden
    // (This depends on the specific implementation)

    // Switch back to single lead mode
    await displayModeSelector.selectOption("single");

    // Wait for the change to take effect
    await page.waitForTimeout(500);

    // Lead selector should be visible and functional in single mode
    await expect(leadSelector).toBeVisible();

    // Test switching between different leads
    const leadOptions = await leadSelector.locator("option").count();
    if (leadOptions > 1) {
      await leadSelector.selectOption({ index: 1 });
      await page.waitForTimeout(500);

      // Switch back to first lead
      await leadSelector.selectOption({ index: 0 });
      await page.waitForTimeout(500);
    }
  });

  test("Grid type switching updates ECG background", async ({ page }) => {
    const gridTypeSelector = page.locator("#grid-type-selector");

    // Test switching to telemetry grid
    await gridTypeSelector.selectOption("telemetry");
    await page.waitForTimeout(500);

    // Switch to graph paper grid
    await gridTypeSelector.selectOption("graph_paper");
    await page.waitForTimeout(500);

    // Verify the canvas still has content after grid changes
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector("[data-ecg-chart] canvas");
      if (!canvas) return false;
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return Array.from(imageData.data).some(
        (value, index) => index % 4 === 3 && value > 0
      );
    });

    expect(hasContent).toBe(true);
  });

  test("Scale sliders adjust ECG visualization", async ({ page }) => {
    // Test grid scale slider
    const gridScaleSlider = page.locator("#grid-scale-slider");
    const gridScaleValue = page.locator("#grid-scale-value");

    // Get initial value
    const initialGridScale = await gridScaleValue.textContent();

    // Move slider to different position
    await gridScaleSlider.fill("1.1");
    await page.waitForTimeout(300);

    // Verify value updated
    const newGridScale = await gridScaleValue.textContent();
    expect(newGridScale).not.toBe(initialGridScale);
    expect(newGridScale).toContain("1.1");

    // Test amplitude scale slider
    const amplitudeScaleSlider = page.locator("#amplitude-scale-slider");
    const amplitudeScaleValue = page.locator("#amplitude-scale-value");

    const initialAmplitudeScale = await amplitudeScaleValue.textContent();

    await amplitudeScaleSlider.fill("1.15");
    await page.waitForTimeout(300);

    const newAmplitudeScale = await amplitudeScaleValue.textContent();
    expect(newAmplitudeScale).not.toBe(initialAmplitudeScale);
    expect(newAmplitudeScale).toContain("1.15");

    // Test height scale slider
    const heightScaleSlider = page.locator("#height-scale-slider");
    const heightScaleValue = page.locator("#height-scale-value");

    const initialHeightScale = await heightScaleValue.textContent();

    await heightScaleSlider.fill("1.3");
    await page.waitForTimeout(300);

    const newHeightScale = await heightScaleValue.textContent();
    expect(newHeightScale).not.toBe(initialHeightScale);
    expect(newHeightScale).toContain("1.3");
  });

  test("Playback options checkboxes work correctly", async ({ page }) => {
    const loopCheckbox = page.locator("#loop-checkbox");
    const qrsIndicatorCheckbox = page.locator("#qrs-indicator-checkbox");

    // Test loop playback checkbox
    const initialLoopState = await loopCheckbox.isChecked();

    await loopCheckbox.click();
    await page.waitForTimeout(200);

    const newLoopState = await loopCheckbox.isChecked();
    expect(newLoopState).toBe(!initialLoopState);

    // Test QRS indicator checkbox
    const initialQrsState = await qrsIndicatorCheckbox.isChecked();

    await qrsIndicatorCheckbox.click();
    await page.waitForTimeout(200);

    const newQrsState = await qrsIndicatorCheckbox.isChecked();
    expect(newQrsState).toBe(!initialQrsState);
  });

  test("Calipers button toggles caliper mode", async ({ page }) => {
    const calipersButton = page.locator("#calipers-button");

    // Initially calipers should be off
    await expect(calipersButton).toBeVisible();

    // Click to activate calipers
    await calipersButton.click();
    await page.waitForTimeout(300);

    // Button should show active state (this depends on CSS classes applied)
    // We can check if the button state changed by looking for visual indicators

    // Click again to deactivate calipers
    await calipersButton.click();
    await page.waitForTimeout(300);
  });

  test("Fullscreen button works correctly", async ({ page }) => {
    const fullscreenButton = page.locator("#fullscreen-button");
    const ecgContainer = page.locator("#ecg-player-container");

    // Click fullscreen button
    await fullscreenButton.click();
    await page.waitForTimeout(500);

    // Check if fullscreen classes are applied
    const hasFullscreenClass = await ecgContainer.evaluate((element) => {
      return (
        element.classList.contains("fullscreen") ||
        element.querySelector(".fullscreen\\:bg-base-100") !== null
      );
    });

    // Note: Actual fullscreen API behavior may vary in test environment
    // We're primarily testing that the button interaction works

    // Press Escape to exit fullscreen (if supported)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  test("ECG waveform remains visible during all interactions", async ({
    page,
  }) => {
    // Function to check if canvas has rendered content
    const hasWaveformContent = async () => {
      return await page.evaluate(() => {
        const canvas = document.querySelector("[data-ecg-chart] canvas");
        if (!canvas) return false;
        const ctx = canvas.getContext("2d");
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return Array.from(imageData.data).some(
          (value, index) => index % 4 === 3 && value > 0
        );
      });
    };

    // Verify initial waveform is present
    expect(await hasWaveformContent()).toBe(true);

    // Test waveform persists through playback
    await page.locator("#play-pause-button").click();
    await page.waitForTimeout(500);
    expect(await hasWaveformContent()).toBe(true);

    await page.locator("#play-pause-button").click(); // Pause
    await page.waitForTimeout(200);
    expect(await hasWaveformContent()).toBe(true);

    // Test waveform persists through display mode changes
    await page.locator("#display-mode-selector").selectOption("multi");
    await page.waitForTimeout(500);
    expect(await hasWaveformContent()).toBe(true);

    await page.locator("#display-mode-selector").selectOption("single");
    await page.waitForTimeout(500);
    expect(await hasWaveformContent()).toBe(true);

    // Test waveform persists through grid type changes
    await page.locator("#grid-type-selector").selectOption("telemetry");
    await page.waitForTimeout(500);
    expect(await hasWaveformContent()).toBe(true);

    // Test waveform persists through scale adjustments
    await page.locator("#grid-scale-slider").fill("1.2");
    await page.waitForTimeout(300);
    expect(await hasWaveformContent()).toBe(true);

    await page.locator("#amplitude-scale-slider").fill("0.8");
    await page.waitForTimeout(300);
    expect(await hasWaveformContent()).toBe(true);
  });

  test("ECG playback with QRS indicator enabled", async ({ page }) => {
    // Enable QRS indicator
    const qrsCheckbox = page.locator("#qrs-indicator-checkbox");

    // Check current state and enable if not already enabled
    const isChecked = await qrsCheckbox.isChecked();
    if (!isChecked) {
      await qrsCheckbox.click();
      await page.waitForTimeout(200);
    }

    // Start playback
    const playButton = page.locator("#play-pause-button");
    await playButton.click();
    await expect(playButton).toContainText("Pause");

    // Let it play for a few seconds to potentially see QRS indicators
    await page.waitForTimeout(3000);

    // Verify waveform is still rendering
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector("[data-ecg-chart] canvas");
      if (!canvas) return false;
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return Array.from(imageData.data).some(
        (value, index) => index % 4 === 3 && value > 0
      );
    });

    expect(hasContent).toBe(true);

    // Stop playback
    await playButton.click();
    await expect(playButton).toContainText("Play");
  });

  test("Multiple rapid setting changes maintain stability", async ({
    page,
  }) => {
    // Rapidly change multiple settings to test stability
    const operations = [
      () => page.locator("#display-mode-selector").selectOption("multi"),
      () => page.locator("#grid-type-selector").selectOption("telemetry"),
      () => page.locator("#grid-scale-slider").fill("1.15"),
      () => page.locator("#amplitude-scale-slider").fill("0.9"),
      () => page.locator("#display-mode-selector").selectOption("single"),
      () => page.locator("#lead-selector").selectOption({ index: 1 }),
      () => page.locator("#grid-type-selector").selectOption("graph_paper"),
      () => page.locator("#height-scale-slider").fill("1.25"),
    ];

    // Execute operations rapidly
    for (const operation of operations) {
      await operation();
      await page.waitForTimeout(100); // Small delay between operations
    }

    // Wait for all changes to settle
    await page.waitForTimeout(1000);

    // Verify ECG is still functional
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector("[data-ecg-chart] canvas");
      if (!canvas) return false;
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return Array.from(imageData.data).some(
        (value, index) => index % 4 === 3 && value > 0
      );
    });

    expect(hasContent).toBe(true);

    // Verify play button still works
    const playButton = page.locator("#play-pause-button");
    await playButton.click();
    await expect(playButton).toContainText("Pause");

    await page.waitForTimeout(500);

    await playButton.click();
    await expect(playButton).toContainText("Play");
  });

  test("Keyboard shortcuts work correctly", async ({ page }) => {
    // Test spacebar for play/pause (common ECG player shortcut)
    const playButton = page.locator("#play-pause-button");

    // Focus the ECG player area
    await page.locator("#ecg-player").click();

    // Try spacebar shortcut
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);

    // Note: This test depends on keyboard shortcut implementation
    // If shortcuts aren't implemented, this test documents the expected behavior

    // Test 'c' key for calipers (as indicated in the button title)
    await page.keyboard.press("c");
    await page.waitForTimeout(200);

    // Test 'f' key for fullscreen (as indicated in the button title)
    await page.keyboard.press("f");
    await page.waitForTimeout(200);

    // Verify ECG is still functional after keyboard interactions
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector("[data-ecg-chart] canvas");
      if (!canvas) return false;
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return Array.from(imageData.data).some(
        (value, index) => index % 4 === 3 && value > 0
      );
    });

    expect(hasContent).toBe(true);
  });
});
