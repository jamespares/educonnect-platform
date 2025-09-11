const { test, expect } = require('@playwright/test');

test.describe('Navigation Tests', () => {
  const pages = [
    { name: 'Home', url: '/', title: 'EduConnect - Teaching Jobs in China' },
    { name: 'Jobs', url: '/jobs.html', title: 'Teaching Jobs in China - Current Openings | EduConnect' },
    { name: 'Requirements', url: '/requirements.html', title: 'Teacher Requirements for China Jobs | Qualifications Needed | EduConnect' },
    { name: 'Integration Guide', url: '/integration-guide.html', title: 'EduConnect - China Integration Guide' },
    { name: 'Contact', url: '/contact.html', title: 'EduConnect - Contact' },
    { name: 'Signup', url: '/signup.html', title: 'EduConnect - Application' },
    { name: 'Legal', url: '/legal.html', title: 'EduConnect - Legal' }
  ];

  test.beforeEach(async ({ page }) => {
    // Start from homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/EduConnect/);
  });

  test('should load all main pages without errors', async ({ page }) => {
    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      
      // Check that page loads without errors
      await expect(page).toHaveTitle(pageInfo.title);
      
      // Check that header exists
      await expect(page.locator('header.header')).toBeVisible();
      
      // Check that navigation exists
      await expect(page.locator('.nav-links')).toBeVisible();
      
      // Check that footer exists (except for admin pages)
      if (!pageInfo.url.includes('admin') && !pageInfo.url.includes('login')) {
        await expect(page.locator('footer.footer')).toBeVisible();
      }
    }
  });

  test('should have consistent navigation order across all pages', async ({ page }) => {
    const expectedNavOrder = ['Home', 'About', 'Requirements', 'Jobs', 'China Guide', 'Join Now'];
    
    for (const pageInfo of pages.slice(0, -1)) { // Skip legal page as it has different nav
      await page.goto(pageInfo.url);
      
      const navLinks = page.locator('.nav-links .nav-link');
      const navTexts = await navLinks.allTextContents();
      
      // Filter out empty text and trim
      const cleanNavTexts = navTexts.filter(text => text.trim().length > 0).map(text => text.trim());
      
      expect(cleanNavTexts).toEqual(expectedNavOrder);
    }
  });

  test('should navigate between pages using header navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation to Jobs page
    await page.click('text=Jobs');
    await expect(page).toHaveURL(/.*jobs\.html/);
    await expect(page.locator('.nav-link.active')).toHaveText('Jobs');
    
    // Test navigation to Requirements page
    await page.click('text=Requirements');
    await expect(page).toHaveURL(/.*requirements\.html/);
    
    // Test navigation to China Guide page
    await page.click('text=China Guide');
    await expect(page).toHaveURL(/.*integration-guide\.html/);
    
    // Test navigation back to Home
    await page.click('text=Home');
    await expect(page).toHaveURL(/.*\/$|.*index\.html/);
  });

  test('should handle mobile navigation correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Check that nav toggle button is visible on mobile
    await expect(page.locator('.nav-toggle')).toBeVisible();
    
    // Check that nav links are initially hidden
    await expect(page.locator('.nav-links')).not.toHaveClass(/active/);
    
    // Click nav toggle to open menu
    await page.click('.nav-toggle');
    await page.waitForTimeout(300); // Wait for toggle animation
    await expect(page.locator('.nav-links')).toHaveClass(/active/);
    
    // Click a nav link and verify it navigates
    await page.click('.nav-links >> text=Jobs');
    await expect(page).toHaveURL(/.*jobs\.html/);
    
    // Verify nav menu closes after navigation
    await expect(page.locator('.nav-links')).not.toHaveClass(/active/);
  });

  test('should have working logo link', async ({ page }) => {
    // Start from any page other than home
    await page.goto('/requirements.html');
    
    // Click on logo to return to home
    await page.click('.logo a');
    await expect(page).toHaveURL(/.*\/$|.*index\.html/);
  });

  test('should have smooth scrolling for anchor links', async ({ page }) => {
    await page.goto('/');
    
    // Click on About link (which should scroll to #opportunities section)
    await page.click('text=About');
    
    // Wait a bit for smooth scroll
    await page.waitForTimeout(1000);
    
    // Check that the opportunities section is in view
    await expect(page.locator('#opportunities')).toBeInViewport();
  });

  test('should display correct active state for current page', async ({ page }) => {
    // Go to jobs page
    await page.goto('/jobs.html');
    
    // Check that Jobs nav link has active class
    await expect(page.locator('.nav-links .nav-link.active')).toHaveText('Jobs');
    
    // Verify other nav links don't have active class
    const nonActiveLinks = page.locator('.nav-links .nav-link:not(.active)');
    const count = await nonActiveLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should load all required fonts and styles', async ({ page }) => {
    await page.goto('/');
    
    // Check that main stylesheet is loaded
    const styleLink = page.locator('link[href*="style.css"]');
    await expect(styleLink).toHaveAttribute('rel', 'stylesheet');
    
    // Check that Google Fonts are loaded
    const fontLink = page.locator('link[href*="fonts.googleapis.com"]');
    await expect(fontLink).toHaveAttribute('rel', 'stylesheet');
    
    // Verify that key elements have expected styling
    const header = page.locator('header.header');
    await expect(header).toHaveCSS('position', 'fixed');
    await expect(header).toHaveCSS('z-index', '1000');
  });

  test('should handle external links properly', async ({ page }) => {
    await page.goto('/');
    
    // Check that Join Now button leads to signup page
    await page.click('.cta-button >> text=Join Now');
    await expect(page).toHaveURL(/.*signup\.html/);
  });
});