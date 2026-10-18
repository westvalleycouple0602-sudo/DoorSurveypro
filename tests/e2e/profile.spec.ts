import { test, expect } from '@playwright/test';

test.describe('User Profile', () => {
  test.beforeEach(async ({ page }) => {
    // Note: Assumes OIDC auth will be auto-configured during test
    await page.goto('/');
  });

  test('should display user profile information', async ({ page }) => {
    // Navigate to profile page
    await page.click('[data-testid="link-profile"]');
    
    // Wait for profile page to load
    await expect(page).toHaveURL(/\/profile/);
    
    // Verify profile header elements are visible
    await expect(page.locator('[data-testid="text-user-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="text-user-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="badge-user-role"]')).toBeVisible();
  });

  test('should allow editing profile information', async ({ page }) => {
    await page.click('[data-testid="link-profile"]');
    
    // Click edit button
    await page.click('[data-testid="button-edit-profile"]');
    
    // Verify edit mode is active
    await expect(page.locator('[data-testid="button-save-profile"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-cancel-edit"]')).toBeVisible();
    
    // Update first name
    const firstNameInput = page.locator('[data-testid="input-first-name"]');
    await firstNameInput.fill('Test');
    
    // Update last name
    const lastNameInput = page.locator('[data-testid="input-last-name"]');
    await lastNameInput.fill('User');
    
    // Save changes
    await page.click('[data-testid="button-save-profile"]');
    
    // Verify success (edit mode should close)
    await expect(page.locator('[data-testid="button-save-profile"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="button-edit-profile"]')).toBeVisible();
  });

  test('should cancel profile editing', async ({ page }) => {
    await page.click('[data-testid="link-profile"]');
    
    // Start editing
    await page.click('[data-testid="button-edit-profile"]');
    
    // Make changes
    await page.locator('[data-testid="input-first-name"]').fill('Cancel');
    
    // Click cancel
    await page.click('[data-testid="button-cancel-edit"]');
    
    // Verify edit mode is closed
    await expect(page.locator('[data-testid="button-edit-profile"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-save-profile"]')).not.toBeVisible();
  });

  test('should switch between profile tabs', async ({ page }) => {
    await page.click('[data-testid="link-profile"]');
    
    // Verify default tab is Profile
    await expect(page.locator('[data-testid="tab-profile"]')).toHaveAttribute('data-state', 'active');
    
    // Switch to Preferences tab
    await page.click('[data-testid="tab-preferences"]');
    await expect(page.locator('[data-testid="tab-preferences"]')).toHaveAttribute('data-state', 'active');
    
    // Verify preference switches are visible
    await expect(page.locator('[data-testid="switch-email-notifications"]')).toBeVisible();
    await expect(page.locator('[data-testid="switch-project-updates"]')).toBeVisible();
    
    // Switch to Organization tab
    await page.click('[data-testid="tab-organization"]');
    await expect(page.locator('[data-testid="tab-organization"]')).toHaveAttribute('data-state', 'active');
    
    // Verify organization details are visible
    await expect(page.locator('[data-testid="text-org-name"]')).toBeVisible();
  });

  test('should display user statistics', async ({ page }) => {
    await page.click('[data-testid="link-profile"]');
    
    // Verify stats are displayed
    await expect(page.locator('[data-testid="text-projects-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="text-quotes-count"]')).toBeVisible();
  });

  test('should toggle notification preferences', async ({ page }) => {
    await page.click('[data-testid="link-profile"]');
    
    // Go to Preferences tab
    await page.click('[data-testid="tab-preferences"]');
    
    // Toggle email notifications
    const emailSwitch = page.locator('[data-testid="switch-email-notifications"]');
    const initialState = await emailSwitch.getAttribute('data-state');
    
    await emailSwitch.click();
    
    // Verify state changed
    const newState = await emailSwitch.getAttribute('data-state');
    expect(newState).not.toBe(initialState);
  });

  test('should display organization details correctly', async ({ page }) => {
    await page.click('[data-testid="link-profile"]');
    
    // Go to Organization tab
    await page.click('[data-testid="tab-organization"]');
    
    // Verify organization information
    await expect(page.locator('[data-testid="text-org-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="text-subscription-tier"]')).toBeVisible();
    await expect(page.locator('[data-testid="badge-subscription-status"]')).toBeVisible();
    
    // Verify action buttons are present
    await expect(page.locator('[data-testid="button-view-team"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-view-billing"]')).toBeVisible();
  });

  test('should prevent editing email address', async ({ page }) => {
    await page.click('[data-testid="link-profile"]');
    
    // Start editing
    await page.click('[data-testid="button-edit-profile"]');
    
    // Verify email input is disabled
    const emailInput = page.locator('[data-testid="input-email"]');
    await expect(emailInput).toBeDisabled();
  });
});
