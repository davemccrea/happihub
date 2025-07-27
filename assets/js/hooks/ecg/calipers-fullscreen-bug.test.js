import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./test-helpers.js";

// Helper function to check if calipers are drawn on canvas
async function hasCalipersDrawn(page) {
  return await page.evaluate(() => {
    const calipersCanvas = document.querySelector('[data-canvas-id="calipers"]');
    if (!calipersCanvas) return false;
    const ctx = calipersCanvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, calipersCanvas.width, calipersCanvas.height);
    
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 0) return true;
    }
    return false;
  });
}

// Helper function to draw a caliper
async function drawCaliper(page, startX = 100, startY = 100, endX = 200, endY = 100) {
  const calipersCanvas = page.locator('[data-canvas-id="calipers"]');
  await calipersCanvas.click({ position: { x: startX, y: startY } });
  await page.mouse.move(endX, endY);
  await page.mouse.up();
  await page.waitForTimeout(300);
}

// Helper function to setup ECG player with calipers enabled
async function setupECGWithCalipers(page) {
  await loginAsTestUser(page);
  await page.goto("/ecg/viewer?dataset_name=ptbxl&filename=records100%2F11000%2F11004_lr");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const calipersButton = page.locator("#calipers-button");
  await calipersButton.click();
  await page.waitForTimeout(300);
  return calipersButton;
}

test.describe("Calipers Fullscreen Bug Fix", () => {
  test("calipers work in normal mode", async ({ page }) => {
    await setupECGWithCalipers(page);
    
    await drawCaliper(page);
    const calipersVisible = await hasCalipersDrawn(page);
    
    expect(calipersVisible).toBe(true);
  });

  test("calipers work after entering fullscreen", async ({ page }) => {
    await setupECGWithCalipers(page);
    
    const fullscreenButton = page.locator("#fullscreen-button");
    await fullscreenButton.click();
    await page.waitForTimeout(2000);
    
    await drawCaliper(page, 150, 120, 250, 120);
    const calipersVisible = await hasCalipersDrawn(page);
    
    expect(calipersVisible).toBe(true);
    
    // Cleanup
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  test("calipers work after exiting fullscreen", async ({ page }) => {
    await setupECGWithCalipers(page);
    
    // Enter and exit fullscreen
    const fullscreenButton = page.locator("#fullscreen-button");
    await fullscreenButton.click();
    await page.waitForTimeout(2000);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(2000);
    
    await drawCaliper(page, 300, 100, 400, 100);
    const calipersVisible = await hasCalipersDrawn(page);
    
    expect(calipersVisible).toBe(true);
  });

  test("canvas reference is updated during fullscreen transition", async ({ page }) => {
    await setupECGWithCalipers(page);
    
    // Simply test that calipers work before and after fullscreen
    // This tests the functionality without relying on DOM inspection
    await drawCaliper(page, 100, 100, 200, 100);
    const calipersWorkBefore = await hasCalipersDrawn(page);
    expect(calipersWorkBefore).toBe(true);

    // Trigger fullscreen
    const fullscreenButton = page.locator("#fullscreen-button");
    await fullscreenButton.click();
    await page.waitForTimeout(2000);

    // Verify calipers canvas exists and works after fullscreen
    const calipersCanvasExists = await page.evaluate(() => {
      return !!document.querySelector('[data-canvas-id="calipers"]');
    });
    expect(calipersCanvasExists).toBe(true);
    
    // Test that calipers still work after fullscreen (the real test)
    await drawCaliper(page, 150, 120, 250, 120);
    const calipersWorkAfter = await hasCalipersDrawn(page);
    expect(calipersWorkAfter).toBe(true);
    
    // Cleanup
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  test("calipers work after canvas recreation", async ({ page }) => {
    await setupECGWithCalipers(page);
    
    // Trigger canvas recreation
    const fullscreenButton = page.locator("#fullscreen-button");
    await fullscreenButton.click();
    await page.waitForTimeout(2000);

    await drawCaliper(page);
    const calipersWork = await hasCalipersDrawn(page);
    
    expect(calipersWork).toBe(true);
    
    // Cleanup
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  test("calipers work after switching to multi mode", async ({ page }) => {
    await setupECGWithCalipers(page);
    
    const displayModeSelector = page.locator("#display-mode-selector");
    await displayModeSelector.selectOption("multi");
    await page.waitForTimeout(1000);
    
    await drawCaliper(page, 150, 80, 250, 80);
    const calipersWork = await hasCalipersDrawn(page);
    
    expect(calipersWork).toBe(true);
  });

  test("calipers work after switching back to single mode", async ({ page }) => {
    await setupECGWithCalipers(page);
    
    const displayModeSelector = page.locator("#display-mode-selector");
    
    // Switch to multi then back to single
    await displayModeSelector.selectOption("multi");
    await page.waitForTimeout(1000);
    await displayModeSelector.selectOption("single");
    await page.waitForTimeout(1000);
    
    await drawCaliper(page, 300, 100, 400, 100);
    const calipersWork = await hasCalipersDrawn(page);
    
    expect(calipersWork).toBe(true);
  });
});