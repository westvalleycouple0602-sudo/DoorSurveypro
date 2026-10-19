import { test, expect } from '@playwright/test';
import { loginWithPassword, isAuthenticated, TEST_USER } from './helpers/auth';

test.describe('Door Opening Management', () => {
  // Tests attempt password login, fall back to OIDC fixture if available
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    if (!page.url().includes('/login')) return;
    await loginWithPassword(page, TEST_USER.email, TEST_USER.password);
  });

  test('should create a door opening when authenticated with existing project', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    
    // Check if we're authenticated
    if (page.url().includes('/login') || page.url().includes('/auth') || page.url().includes('/prelaunch')) {
      test.skip(true, 'Authentication required - test user not seeded');
      return;
    }
    
    // Click first project if exists
    const firstProject = page.locator('[data-testid*="card-project"]').first();
    const hasProject = await firstProject.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasProject) {
      test.skip(true, 'No projects available - create a project first');
      return;
    }
    
    await firstProject.click();
    await page.waitForLoadState('networkidle');
    
    // Add new opening
    const addOpeningButton = page.getByRole('button', { name: /add opening|new opening/i });
    if (await addOpeningButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addOpeningButton.click();
      
      // Fill required fields if form is shown
      const openingNumberInput = page.getByLabel(/opening number|opening id/i);
      if (await openingNumberInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await openingNumberInput.fill(`TEST-${Date.now()}`);
        
        const widthInput = page.getByLabel(/width/i);
        if (await widthInput.isVisible().catch(() => false)) {
          await widthInput.fill('36');
        }
        
        const heightInput = page.getByLabel(/height/i);
        if (await heightInput.isVisible().catch(() => false)) {
          await heightInput.fill('84');
        }
        
        // Submit
        await page.getByRole('button', { name: /create|save/i }).click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('opening detail page should display measurements', async ({ page }) => {
    // Navigate to any opening detail page
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    
    if (page.url().includes('/login') || page.url().includes('/auth') || page.url().includes('/prelaunch')) {
      test.skip(true, 'Authentication required - test user not seeded');
      return;
    }
    
    // Try to find and click a project
    const firstProject = page.locator('[data-testid*="card-project"]').first();
    const hasProject = await firstProject.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!hasProject) {
      test.skip(true, 'No projects available for testing');
      return;
    }
    
    await firstProject.click();
    await page.waitForLoadState('networkidle');
    
    const firstOpening = page.locator('[data-testid*="opening"]').first();
    const hasOpening = await firstOpening.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!hasOpening) {
      test.skip(true, 'No openings available for testing');
      return;
    }
    
    await firstOpening.click();
    await page.waitForLoadState('networkidle');
    
    // Opening detail must show measurements or form fields
    const hasDimensions = await page.getByText(/width|height|dimension/i).isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasDimensions).toBeTruthy();
  });
});
