/**
 * Test Helper Functions for ECG Implementation Tests
 * 
 * These helpers provide utilities for setting up test scenarios
 * and accessing ECG implementation internals during testing.
 */

/**
 * Log in with test user credentials
 * @param {Page} page - Playwright page object
 */
export async function loginAsTestUser(page) {
  await page.goto('/users/log-in');
  
  // Wait for the login form and Phoenix LiveView to be ready
  await page.waitForSelector('#login_form_password', { timeout: 10000 });
  
  // Wait for Phoenix LiveView to be connected (look for phx-socket connection)
  await page.waitForFunction(() => {
    return window.liveSocket && window.liveSocket.isConnected();
  }, { timeout: 10000 });
  
  // Fill in the login form
  await page.fill('#login_form_password input[name="user[email]"]', 'test@example.com');
  await page.fill('#login_form_password input[name="user[password]"]', 'testpassword123');
  
  // Wait a moment for form to be ready
  await page.waitForTimeout(500);
  
  // Click the submit button and wait for navigation
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/log-in'), { timeout: 25000 }),
    page.click('#login_form_password button')
  ]);
}