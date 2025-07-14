async function loginUser(page, email = 'test@example.com', password = 'testpassword123') {
  await page.goto('/users/log-in');
  await page.waitForLoadState('networkidle');
  
  const loginForms = await page.locator('form[action="/users/log-in"]').all();
  
  if (loginForms.length < 2) {
    throw new Error('Expected 2 login forms (magic link and password), but found: ' + loginForms.length);
  }
  
  const loginForm = loginForms[1];
  
  const emailInput = loginForm.locator('input[name="user[email]"]').first();
  await emailInput.waitFor({ state: 'visible' });
  
  const passwordInput = loginForm.locator('input[name="user[password]"]').first();
  await passwordInput.waitFor({ state: 'visible' });
  
  await emailInput.fill(email);
  await passwordInput.fill(password);
  
  const submitButton = await loginForm.locator('button').first();
  await submitButton.click();
  
  try {
    await page.waitForURL(url => !url.toString().includes('/users/log-in'), { timeout: 10000 });
  } catch (error) {
    const errorMessages = await page.locator('.alert-error, .error, .alert-danger, [class*="error"]').allTextContents();
    const realErrors = errorMessages.filter(msg => 
      !msg.includes("We can't find the internet") && 
      !msg.includes("Something went wrong!") &&
      !msg.includes("Attempting to reconnect") &&
      msg.trim().length > 0
    );
    
    if (realErrors.length > 0) {
      throw new Error('Login failed - authentication errors: ' + realErrors.join(', '));
    } else {
      throw new Error('Login failed - timeout during authentication');
    }
  }
}

module.exports = {
  loginUser
};