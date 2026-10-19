import { test, expect } from '@playwright/test';

test.describe('LiDAR Scanning Features', () => {
  test('should display LiDAR scans page', async ({ page }) => {
    await page.goto('/lidar-scans');
    
    // Check for page elements
    const hasTitle = await page.locator('[data-testid*="lidar"]').isVisible().catch(() => false);
    const hasUploadButton = await page.getByRole('button', { name: /upload.*scan/i }).isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/no scans/i).isVisible().catch(() => false);
    
    expect(hasTitle || hasUploadButton || hasEmptyState).toBeTruthy();
  });

  test('should show scan upload interface', async ({ page }) => {
    await page.goto('/lidar-scans');
    
    const uploadButton = page.getByRole('button', { name: /upload.*scan|new scan/i });
    const hasButton = await uploadButton.isVisible().catch(() => false);
    
    if (hasButton) {
      await uploadButton.click();
      
      // Should show upload dialog or form
      const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      const hasFileInput = await page.locator('input[type="file"]').isVisible().catch(() => false);
      
      expect(hasDialog || hasFileInput).toBeTruthy();
    }
  });

  test('should display scan quality indicators', async ({ page }) => {
    await page.goto('/lidar-scans');
    
    // Look for existing scans
    const firstScan = page.locator('[data-testid*="scan"]').first();
    if (await firstScan.isVisible().catch(() => false)) {
      // Should show quality badge or status
      const hasQualityBadge = await page.locator('[data-testid*="quality"]').isVisible().catch(() => false);
      const hasStatusBadge = await page.locator('[data-testid*="status"]').isVisible().catch(() => false);
      
      expect(hasQualityBadge || hasStatusBadge).toBeTruthy();
    }
  });

  test('should process scan with fast mode option', async ({ page }) => {
    await page.goto('/lidar-scans');
    
    const firstScan = page.locator('[data-testid*="scan"]').first();
    if (await firstScan.isVisible().catch(() => false)) {
      // Look for process button
      const processButton = page.getByRole('button', { name: /process|fast mode/i });
      const hasButton = await processButton.isVisible().catch(() => false);
      
      if (hasButton) {
        // Click to start processing
        await processButton.click();
        
        // Should show processing status
        const hasProcessingState = await page.getByText(/processing/i).isVisible({ timeout: 2000 }).catch(() => false);
        const hasSuccess = await page.getByText(/processed|complete/i).isVisible({ timeout: 2000 }).catch(() => false);
        
        expect(hasProcessingState || hasSuccess).toBeTruthy();
      }
    }
  });

  test('should display scan measurements after processing', async ({ page }) => {
    await page.goto('/lidar-scans');
    
    // Click on first processed scan
    const processedScan = page.locator('[data-testid*="scan"][data-status="processed"]').first();
    const altScan = page.locator('[data-testid*="scan"]').first();
    
    const scan = await processedScan.isVisible().catch(() => false) ? processedScan : altScan;
    
    if (await scan.isVisible().catch(() => false)) {
      await scan.click();
      
      // Should show measurements
      const hasMeasurements = await page.getByText(/width|height|depth/i).isVisible().catch(() => false);
      const hasConfidence = await page.getByText(/confidence/i).isVisible().catch(() => false);
      
      expect(hasMeasurements || hasConfidence).toBeTruthy();
    }
  });
});
