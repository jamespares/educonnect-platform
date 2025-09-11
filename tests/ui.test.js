const { test, expect } = require('@playwright/test');

test.describe('UI and Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Visual Elements', () => {
    test('should display hero carousel correctly', async ({ page }) => {
      await page.goto('/');
      
      // Check carousel elements
      await expect(page.locator('.hero-carousel')).toBeVisible();
      await expect(page.locator('.hero-img.active')).toBeVisible();
      await expect(page.locator('.carousel-btn')).toHaveCount(2);
      await expect(page.locator('.dot')).toHaveCount.toBeGreaterThan(0);
      
      // Test carousel navigation
      await page.click('.carousel-next');
      await page.waitForTimeout(500);
      
      // Test dot navigation
      const dots = page.locator('.dot');
      const dotCount = await dots.count();
      if (dotCount > 1) {
        await dots.nth(1).click();
        await page.waitForTimeout(500);
      }
    });

    test('should display partner logos correctly', async ({ page }) => {
      await page.goto('/');
      
      // Scroll to partners section
      await page.locator('.partners').scrollIntoView();
      
      // Check partner logos
      const partnerLogos = page.locator('.partner-logo');
      const logoCount = await partnerLogos.count();
      
      expect(logoCount).toBeGreaterThan(0);
      
      // Check that logos are visible and have proper attributes
      for (let i = 0; i < logoCount; i++) {
        const logo = partnerLogos.nth(i);
        await expect(logo).toBeVisible();
        await expect(logo).toHaveAttribute('alt');
        await expect(logo).toHaveAttribute('src');
      }
    });

    test('should display testimonials correctly', async ({ page }) => {
      await page.goto('/');
      
      // Scroll to testimonials
      await page.locator('.testimonials').scrollIntoView();
      
      // Check testimonial cards
      const testimonialCards = page.locator('.testimonial-card');
      const cardCount = await testimonialCards.count();
      
      expect(cardCount).toBeGreaterThan(0);
      
      // Check each testimonial has required elements
      for (let i = 0; i < cardCount; i++) {
        const card = testimonialCards.nth(i);
        await expect(card.locator('.testimonial-image')).toBeVisible();
        await expect(card.locator('.testimonial-text')).toBeVisible();
        await expect(card.locator('.testimonial-author h4')).toBeVisible();
        await expect(card.locator('.testimonial-author span')).toBeVisible();
      }
    });

    test('should display FAQ section correctly', async ({ page }) => {
      await page.goto('/');
      
      // Check if FAQ section exists
      const faqSection = page.locator('.faq');
      if (await faqSection.count() > 0) {
        await faqSection.scrollIntoView();
        
        const faqItems = page.locator('.faq-item');
        const itemCount = await faqItems.count();
        
        expect(itemCount).toBeGreaterThan(0);
        
        // Check each FAQ item structure
        for (let i = 0; i < Math.min(itemCount, 3); i++) {
          const item = faqItems.nth(i);
          await expect(item.locator('.faq-question')).toBeVisible();
          await expect(item.locator('.faq-answer')).toBeVisible();
        }
      }
    });
  });

  test.describe('Interactive Elements', () => {
    test('should handle hover effects correctly', async ({ page }) => {
      await page.goto('/');
      
      // Test opportunity card hover
      const opportunityCard = page.locator('.opportunity-card').first();
      await expect(opportunityCard).toBeVisible();
      
      // Hover over card
      await opportunityCard.hover();
      await page.waitForTimeout(500);
      
      // Test testimonial card hover
      await page.locator('.testimonials').scrollIntoView();
      const testimonialCard = page.locator('.testimonial-card').first();
      if (await testimonialCard.count() > 0) {
        await testimonialCard.hover();
        await page.waitForTimeout(500);
      }
    });

    test('should handle smooth scrolling', async ({ page }) => {
      await page.goto('/');
      
      // Test anchor link scrolling
      await page.click('text=About');
      await page.waitForTimeout(1000);
      
      // Check that opportunities section is in viewport
      await expect(page.locator('#opportunities')).toBeInViewport();
    });

    test('should show loading states appropriately', async ({ page }) => {
      await page.goto('/jobs.html');
      
      // Jobs page should show either job cards or loading/error state
      await page.waitForLoadState('networkidle');
      
      const jobCards = page.locator('.job-card');
      const noResults = page.locator('#noResults');
      const errorMessage = page.locator('[style*="color: #ef4444"]');
      
      const hasJobs = await jobCards.count() > 0;
      const hasNoResults = await noResults.isVisible();
      const hasError = await errorMessage.count() > 0;
      
      // One of these states should be true
      expect(hasJobs || hasNoResults || hasError).toBe(true);
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      test(`should display correctly on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        
        // Check that header is visible and properly sized
        await expect(page.locator('header.header')).toBeVisible();
        
        // Check navigation
        const navLinks = page.locator('.nav-links');
        await expect(navLinks).toBeVisible();
        
        if (viewport.width <= 768) {
          // Mobile: nav toggle should be visible
          await expect(page.locator('.nav-toggle')).toBeVisible();
        } else {
          // Desktop/Tablet: nav links should be visible
          await expect(navLinks).toBeVisible();
        }
        
        // Check hero section
        await expect(page.locator('.hero')).toBeVisible();
        await expect(page.locator('.hero-title')).toBeVisible();
        
        // Check that content doesn't overflow
        const body = await page.locator('body').boundingBox();
        expect(body.width).toBeLessThanOrEqual(viewport.width + 20); // Allow small tolerance
      });
    }

    test('should handle mobile navigation correctly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Mobile nav toggle should be visible
      await expect(page.locator('.nav-toggle')).toBeVisible();
      
      // Nav links should be hidden initially
      const navLinks = page.locator('.nav-links');
      await expect(navLinks).not.toHaveClass(/active/);
      
      // Click toggle
      await page.click('.nav-toggle');
      await expect(navLinks).toHaveClass(/active/);
      
      // Click a nav link
      await page.click('.nav-links >> text=Requirements');
      
      // Should navigate and close menu
      await expect(page).toHaveURL(/.*requirements\.html/);
      await expect(navLinks).not.toHaveClass(/active/);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/');
      
      // Check for h1
      const h1 = page.locator('h1');
      expect(await h1.count()).toBeGreaterThan(0);
      
      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
    });

    test('should have alt text for images', async ({ page }) => {
      await page.goto('/');
      
      // Check all images have alt text
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        await expect(img).toHaveAttribute('alt');
      }
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/contact.html');
      
      // Check that form inputs have associated labels
      const inputs = page.locator('input[type="text"], input[type="email"], textarea, select');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        
        if (id) {
          // Check for associated label
          const label = page.locator(`label[for="${id}"]`);
          await expect(label).toBeVisible();
        }
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      // Should focus on first focusable element
      const focusedElement = await page.evaluate(() => document.activeElement.tagName);
      expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focusedElement);
      
      // Test that focus is visible
      const activeElement = page.locator(':focus');
      await expect(activeElement).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load main resources quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
    });

    test('should lazy load images properly', async ({ page }) => {
      await page.goto('/');
      
      // Check for lazy loading attributes
      const lazyImages = page.locator('img[loading="lazy"]');
      const lazyImageCount = await lazyImages.count();
      
      // Should have some lazy loaded images
      expect(lazyImageCount).toBeGreaterThan(0);
    });

    test('should handle large content gracefully', async ({ page }) => {
      await page.goto('/integration-guide.html');
      
      // Integration guide is a large page, should load without issues
      await page.waitForLoadState('networkidle');
      
      // Check that page is scrollable
      const pageHeight = await page.evaluate(() => document.body.scrollHeight);
      expect(pageHeight).toBeGreaterThan(1000);
      
      // Test scrolling performance
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(500);
      
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle missing images gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Check if any images fail to load
      const images = page.locator('img');
      const imageCount = await images.count();
      
      let failedImages = 0;
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const naturalWidth = await img.evaluate(el => el.naturalWidth);
        
        if (naturalWidth === 0) {
          failedImages++;
          
          // Failed images should have alt text as fallback
          await expect(img).toHaveAttribute('alt');
        }
      }
      
      // Log failed images for debugging
      if (failedImages > 0) {
        console.log(`${failedImages} images failed to load`);
      }
    });

    test('should handle JavaScript errors gracefully', async ({ page }) => {
      const errors = [];
      
      page.on('pageerror', error => {
        errors.push(error.message);
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Navigate to different pages to test for JS errors
      await page.goto('/jobs.html');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/contact.html');
      await page.waitForLoadState('networkidle');
      
      // Should have minimal or no JavaScript errors
      expect(errors.length).toBeLessThan(3);
      
      if (errors.length > 0) {
        console.log('JavaScript errors found:', errors);
      }
    });
  });
});