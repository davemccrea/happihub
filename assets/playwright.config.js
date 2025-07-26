import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './js/hooks/ecg',
  testMatch: '**/*.test.js',
  
  // Configure browser settings
  use: {
    baseURL: 'http://localhost:4000',
    headless: false, // Run in headed mode for debugging
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Test timeout settings
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },

  // Configure web server
  webServer: {
    command: 'cd .. && CLAUDE_API_KEY="test-key" mix phx.server',
    url: 'http://localhost:4000',
    reuseExistingServer: true,
    timeout: 30 * 1000,
  },

  // Configure browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
      },
    },
  ],
});