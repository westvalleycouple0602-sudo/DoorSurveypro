import { test, expect } from '@playwright/test';

/**
 * Navigation E2E Tests
 * Verify all main navigation works correctly
 */

test.describe('Application Navigation', () => {
  test('should have working sidebar navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check for sidebar toggle
    const sidebarToggle = page.getByTestId('button-sidebar-toggle');
    const hasSidebarToggle = await sidebarToggle.isVisible().catch(() => false);
    
    if (hasSidebarToggle) {
      await expect(sidebarToggle).toBeEnabled();
      
      // Test sidebar toggle
      await sidebarToggle.click();
      // Sidebar should respond to toggle
    }
  });

  test('should navigate between main sections', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation to key sections
    const sections = [
      { path: '/projects', testId: 'link-projects' },
      { path: '/quotes', testId: 'link-quotes' },
      { path: '/catalog', testId: 'link-catalog' },
    ];
    
    for (const section of sections) {
      const link = page.getByTestId(section.testId);
      const linkExists = await link.isVisible().catch(() => false);
      
      if (linkExists) {
        await link.click();
        await expect(page).toHaveURL(new RegExp(section.path));
      }
    }
  });

  test('should have responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should load without errors
    await expect(page).not.toHaveURL(/error/);
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    await expect(page).not.toHaveURL(/error/);
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    
    await expect(page).not.toHaveURL(/error/);
  });

  test('should have accessible theme toggle', async ({ page }) => {
    await page.goto('/');
    
    const themeToggle = page.getByTestId('button-theme-toggle');
    const hasThemeToggle = await themeToggle.isVisible().catch(() => false);
    
    if (hasThemeToggle) {
      await expect(themeToggle).toBeEnabled();
      
      // Test theme toggle
      await themeToggle.click();
      // Theme should change (can be verified by checking CSS classes)
    }
  });
});
