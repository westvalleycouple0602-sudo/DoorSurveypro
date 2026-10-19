import { Page } from '@playwright/test';

// Test user credentials - must be seeded in database or use OIDC test fixture
export const TEST_USER = {
  email: 'e2e-test@doorsurvey.test',
  password: 'TestPassword123!',
  firstName: 'E2E',
  lastName: 'Tester',
};

export async function mockAuthentication(page: Page) {
  // Set up authenticated session by mocking the user cookie
  // This simulates a logged-in user without going through OAuth
  await page.context().addCookies([
    {
      name: 'connect.sid',
      value: 'test-session-id',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

/**
 * Login using email/password authentication
 * This uses the password login endpoint we implemented
 */
export async function loginWithPassword(page: Page, email: string = TEST_USER.email, password: string = TEST_USER.password) {
  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Check if already logged in (redirected away from login)
  if (!page.url().includes('/login')) {
    return true;
  }
  
  // Fill in the login form
  const emailInput = page.locator('[data-testid="input-email"]');
  const passwordInput = page.locator('[data-testid="input-password"]');
  const submitButton = page.locator('[data-testid="button-password-signin"]');
  
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitButton.click();
  
  // Wait for either redirect to dashboard or error message
  await page.waitForLoadState('networkidle');
  
  // Check if login was successful (redirected away from login page)
  const currentUrl = page.url();
  return !currentUrl.includes('/login') && !currentUrl.includes('/auth');
}

/**
 * Check if the current session is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Look for authenticated indicators
  const sidebarToggle = page.locator('[data-testid="button-sidebar-toggle"]');
  const userMenu = page.locator('[data-testid="button-user-menu"]');
  
  const hasSidebar = await sidebarToggle.isVisible().catch(() => false);
  const hasUserMenu = await userMenu.isVisible().catch(() => false);
  
  return hasSidebar || hasUserMenu;
}

export async function login(page: Page, email: string = 'test@example.com') {
  // Navigate to login
  await page.goto('/');
  
  // Check if already logged in
  const isLoggedIn = await page.locator('[data-testid="text-username"]').isVisible().catch(() => false);
  if (isLoggedIn) {
    return;
  }

  // For Replit Auth, we'd need to mock the OIDC flow
  // In a real test environment, you'd configure test credentials
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  
  // Wait for redirect back after auth
  await page.waitForURL('/', { timeout: 10000 });
}

export async function logout(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /sign out|log out/i }).click();
  await page.waitForURL('/');
}
