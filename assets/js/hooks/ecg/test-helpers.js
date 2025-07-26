/**
 * Test Helper Functions for ECG Implementation Tests
 *
 * These helpers provide utilities for setting up test scenarios
 * and accessing ECG implementation internals during testing.
 */

/**
 * Log in with test user credentials
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function loginAsTestUser(page) {
  await page.goto("/users/log-in");

  // Wait for the login form and Phoenix LiveView to be ready
  await page.waitForSelector("#login_form_password", { timeout: 10000 });

  // Wait for Phoenix LiveView to be connected (look for phx-socket connection)
  await page.waitForFunction(
    () => {
      return window.liveSocket && window.liveSocket.isConnected();
    },
    { timeout: 10000 },
  );

  // Fill in the login form
  await page.fill(
    '#login_form_password input[name="user[email]"]',
    "test@example.com",
  );
  await page.fill(
    '#login_form_password input[name="user[password]"]',
    "testpassword123",
  );

  // Wait a moment for form to be ready
  await page.waitForTimeout(500);

  // Click the submit button and wait for navigation
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("/log-in"), {
      timeout: 25000,
    }),
    page.click("#login_form_password button"),
  ]);
}

/**
 * Checks if the ECG waveform canvas is visible and contains non-transparent pixels.
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @returns {Promise<Object>} An object containing visibility status, pixel count, and other details.
 */
export async function isWaveformVisible(page) {
  return await page.evaluate(() => {
    const waveformCanvas = document.querySelector(
      "[data-ecg-chart] canvas:nth-child(2)",
    );
    if (!waveformCanvas) {
      return { visible: false, error: "Waveform canvas not found" };
    }

    const ctx = waveformCanvas.getContext("2d");
    if (!ctx) {
      return { visible: false, error: "Canvas context not available" };
    }

    const imageData = ctx.getImageData(
      0,
      0,
      waveformCanvas.width,
      waveformCanvas.height,
    );
    const data = imageData.data;

    let nonTransparentPixels = 0;
    // Iterate through the alpha channel of the image data
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        // Check if the pixel is not fully transparent
        nonTransparentPixels++;
      }
    }

    return {
      visible: nonTransparentPixels > 0,
      pixelCount: nonTransparentPixels,
      strokeStyle: ctx.strokeStyle,
      canvasSize: {
        width: waveformCanvas.width,
        height: waveformCanvas.height,
      },
    };
  });
}
