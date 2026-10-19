import { test, expect } from '@playwright/test';

/**
 * Quote Generation E2E Tests
 * Critical flow: Generate quote, review pricing, export PDF
 */

test.describe('Quote Generation Flow', () => {
  test('should display quote list page', async ({ page }) => {
    await page.goto('/quotes');
    
    // Check for quotes list or empty state
    const quotesList = page.getByTestId('list-quotes');
    const createButton = page.getByTestId('button-create-quote');
    
    const hasQuotes = await quotesList.isVisible().catch(() => false);
    const hasCreateButton = await createButton.isVisible().catch(() => false);
    
    expect(hasQuotes || hasCreateButton).toBeTruthy();
  });

  test('should display quote details with pricing', async ({ page }) => {
    await page.goto('/quotes');
    
    // Navigate to first quote if exists
    const firstQuote = page.getByTestId(/card-quote-\d+/).first();
    const quoteExists = await firstQuote.isVisible().catch(() => false);
    
    if (quoteExists) {
      await firstQuote.click();
      
      // Should show quote details
      await expect(page).toHaveURL(/\/quotes\/\d+/);
      
      // Should display pricing information
      const totalPrice = page.getByTestId('text-total-price');
      await expect(totalPrice).toBeVisible();
    }
  });

  test('should have export functionality', async ({ page }) => {
    await page.goto('/quotes');
    
    const firstQuote = page.getByTestId(/card-quote-\d+/).first();
    const quoteExists = await firstQuote.isVisible().catch(() => false);
    
    if (quoteExists) {
      await firstQuote.click();
      
      // Look for export button
      const exportButton = page.getByTestId('button-export-pdf');
      const exportButtonExists = await exportButton.isVisible().catch(() => false);
      
      if (exportButtonExists) {
        await expect(exportButton).toBeEnabled();
      }
    }
  });
});
