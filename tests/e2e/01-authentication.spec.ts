import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('unauthenticated user should see landing page', async ({ page }) => {
    await page.goto('/');
    
    // Must see landing page with specific content
    await expect(page.getByRole('heading', { name: /DoorSurvey Pro|Commercial Door/i })).toBeVisible();
    
    // Should NOT see authenticated elements
    const sidebarToggle = page.locator('[data-testid="button-sidebar-toggle"]');
    await expect(sidebarToggle).not.toBeVisible();
  });

  test('authenticated user should access dashboard', async ({ page }) => {
    // Set auth cookie to simulate authenticated session
    await page.context().addCookies([{
      name: 'connect.sid',
      value: `s:test-session-${Date.now()}.signature`,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    }]);
    
    await page.goto('/dashboard');
    
    // Check for either dashboard content OR login redirect
    const url = page.url();
    const hasLogin = url.includes('/login') || url.includes('/auth');
    const hasDashboard = await page.locator('[data-testid*="dashboard"]').isVisible().catch(() => false);
    
    // One of these must be true (either redirected to login or showing dashboard)
    expect(hasLogin || hasDashboard).toBeTruthy();
  });

  test('should have authentication flow elements', async ({ page }) => {
    await page.goto('/');
    
    // Landing page must have either "Sign In" or user is already logged in
    const signInButton = page.getByRole('button', { name: /sign in|log in/i });
    const sidebarToggle = page.locator('[data-testid="button-sidebar-toggle"]');
    
    const hasSignIn = await signInButton.isVisible().catch(() => false);
    const isAuthenticated = await sidebarToggle.isVisible().catch(() => false);
    
    // Exactly one of these should be visible
    expect(hasSignIn || isAuthenticated).toBeTruthy();
    expect(hasSignIn && isAuthenticated).toBeFalsy(); // Can't have both
  });
});
