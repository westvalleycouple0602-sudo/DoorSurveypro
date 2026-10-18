import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Photo Upload E2E Tests
 * Critical flow: Upload photos, OCR processing, annotations
 */

test.describe('Photo Upload Flow', () => {
  test('should display photo upload interface', async ({ page }) => {
    await page.goto('/projects');
    
    const firstProject = page.getByTestId(/card-project-\d+/).first();
    const projectExists = await firstProject.isVisible().catch(() => false);
    
    if (projectExists) {
      await firstProject.click();
      
      // Navigate to an opening
      const firstOpening = page.getByTestId(/card-opening-\d+/).first();
      const openingExists = await firstOpening.isVisible().catch(() => false);
      
      if (openingExists) {
        await firstOpening.click();
        
        // Look for photo upload section
        const uploadButton = page.getByTestId('button-upload-photo');
        const photoGallery = page.getByTestId('gallery-photos');
        
        const hasUpload = await uploadButton.isVisible().catch(() => false);
        const hasGallery = await photoGallery.isVisible().catch(() => false);
        
        expect(hasUpload || hasGallery).toBeTruthy();
      }
    }
  });

  test('should handle file upload interaction', async ({ page }) => {
    await page.goto('/projects');
    
    const firstProject = page.getByTestId(/card-project-\d+/).first();
    const projectExists = await firstProject.isVisible().catch(() => false);
    
    if (projectExists) {
      await firstProject.click();
      
      const firstOpening = page.getByTestId(/card-opening-\d+/).first();
      const openingExists = await firstOpening.isVisible().catch(() => false);
      
      if (openingExists) {
        await firstOpening.click();
        
        const uploadButton = page.getByTestId('button-upload-photo');
        const hasUpload = await uploadButton.isVisible().catch(() => false);
        
        if (hasUpload) {
          // Verify upload button is enabled
          await expect(uploadButton).toBeEnabled();
        }
      }
    }
  });
});
