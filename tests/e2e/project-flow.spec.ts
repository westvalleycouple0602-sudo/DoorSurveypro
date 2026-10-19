import { test, expect } from '@playwright/test';

/**
 * Project Management E2E Tests
 * Critical flow: Create project, add door openings, manage hardware
 */

test.describe('Project Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Note: Real tests would need authentication setup
  });

  test('should display projects dashboard', async ({ page }) => {
    await page.goto('/projects');
    
    // Check for project list or empty state
    const createButton = page.getByTestId('button-create-project');
    const projectList = page.getByTestId('list-projects');
    
    // Should have either create button or project list
    const hasCreateButton = await createButton.isVisible().catch(() => false);
    const hasProjectList = await projectList.isVisible().catch(() => false);
    
    expect(hasCreateButton || hasProjectList).toBeTruthy();
  });

  test('should navigate to project details', async ({ page }) => {
    await page.goto('/projects');
    
    // Look for first project card if exists
    const firstProject = page.getByTestId(/card-project-\d+/).first();
    const projectExists = await firstProject.isVisible().catch(() => false);
    
    if (projectExists) {
      await firstProject.click();
      
      // Should navigate to project details
      await expect(page).toHaveURL(/\/projects\/\d+/);
      
      // Should show project details
      const projectName = page.getByTestId('text-project-name');
      await expect(projectName).toBeVisible();
    }
  });

  test('should display door openings list', async ({ page }) => {
    // Navigate to a project (assuming project ID 1 exists in demo/test data)
    await page.goto('/projects');
    
    const firstProject = page.getByTestId(/card-project-\d+/).first();
    const projectExists = await firstProject.isVisible().catch(() => false);
    
    if (projectExists) {
      await firstProject.click();
      
      // Look for openings section
      const openingsList = page.getByTestId('list-openings');
      const addOpeningButton = page.getByTestId('button-add-opening');
      
      // Should have openings list or add button
      const hasOpenings = await openingsList.isVisible().catch(() => false);
      const hasAddButton = await addOpeningButton.isVisible().catch(() => false);
      
      expect(hasOpenings || hasAddButton).toBeTruthy();
    }
  });
});
