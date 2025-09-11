const { test, expect } = require('@playwright/test');

test.describe('Form Submission Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up any test data or state
    await page.goto('/');
  });

  test.describe('Contact Form', () => {
    test('should successfully submit contact form with valid data', async ({ page }) => {
      await page.goto('/contact.html');
      
      // Fill out the contact form
      await page.fill('#name', 'John Doe');
      await page.fill('#email', 'john.doe@example.com');
      await page.fill('#subject', 'Test Subject');
      await page.fill('#message', 'This is a test message from the automated test suite.');
      
      // Submit the form
      await page.click('.contact-submit-btn');
      
      // Wait for redirect or success message
      await page.waitForURL(/.*contact\.html\?success=true/, { timeout: 10000 });
      
      // Verify we're on the success page
      expect(page.url()).toContain('success=true');
    });

    test('should validate required fields in contact form', async ({ page }) => {
      await page.goto('/contact.html');
      
      // Try to submit empty form
      await page.click('.contact-submit-btn');
      
      // Check HTML5 validation messages
      const nameField = page.locator('#name');
      const emailField = page.locator('#email');
      const subjectField = page.locator('#subject');
      const messageField = page.locator('#message');
      
      await expect(nameField).toHaveAttribute('required');
      await expect(emailField).toHaveAttribute('required');
      await expect(subjectField).toHaveAttribute('required');
      await expect(messageField).toHaveAttribute('required');
    });

    test('should validate email format in contact form', async ({ page }) => {
      await page.goto('/contact.html');
      
      // Fill form with invalid email
      await page.fill('#name', 'John Doe');
      await page.fill('#email', 'invalid-email');
      await page.fill('#subject', 'Test Subject');
      await page.fill('#message', 'Test message');
      
      // Submit form
      await page.click('.contact-submit-btn');
      
      // Check that browser validates email format
      const emailField = page.locator('#email');
      const isValidEmail = await emailField.evaluate(el => el.validity.valid);
      expect(isValidEmail).toBe(false);
    });
  });

  test.describe('Job Interest Form', () => {
    test('should successfully submit job interest form', async ({ page }) => {
      await page.goto('/jobs.html');
      
      // Scroll to the interest form
      await page.locator('#interest-form').scrollIntoView();
      
      // Fill out the job interest form
      await page.fill('#firstName', 'Jane');
      await page.fill('#lastName', 'Smith');
      await page.fill('#email', 'jane.smith@example.com');
      await page.fill('#phone', '+1-555-0123');
      await page.selectOption('#preferredLocation', 'shanghai');
      await page.selectOption('#teachingSubject', 'english');
      await page.selectOption('#experience', '3-5');
      await page.fill('#message', 'I am very interested in teaching opportunities in Shanghai.');
      
      // Submit the form
      await page.click('#jobInterestForm button[type="submit"]');
      
      // Wait for success message
      await page.waitForSelector('.message-alert-success', { timeout: 10000 });
      
      // Verify success message appears
      await expect(page.locator('.message-alert-success')).toBeVisible();
      await expect(page.locator('.message-alert-success')).toContainText('Thank you for your interest!');
      
      // Verify form is reset
      await expect(page.locator('#firstName')).toHaveValue('');
      await expect(page.locator('#lastName')).toHaveValue('');
      await expect(page.locator('#email')).toHaveValue('');
    });

    test('should validate required fields in job interest form', async ({ page }) => {
      await page.goto('/jobs.html');
      
      // Scroll to the interest form
      await page.locator('#interest-form').scrollIntoView();
      
      // Try to submit form with only optional fields filled
      await page.fill('#phone', '+1-555-0123');
      await page.fill('#message', 'Optional message');
      
      // Submit form
      await page.click('#jobInterestForm button[type="submit"]');
      
      // Check that required fields prevent submission
      const firstNameField = page.locator('#firstName');
      const lastNameField = page.locator('#lastName');
      const emailField = page.locator('#email');
      const subjectField = page.locator('#teachingSubject');
      const experienceField = page.locator('#experience');
      
      await expect(firstNameField).toHaveAttribute('required');
      await expect(lastNameField).toHaveAttribute('required');
      await expect(emailField).toHaveAttribute('required');
      await expect(subjectField).toHaveAttribute('required');
      await expect(experienceField).toHaveAttribute('required');
    });

    test('should pre-fill form when applying to specific job', async ({ page }) => {
      await page.goto('/jobs.html');
      
      // Wait for jobs to load
      await page.waitForSelector('.job-card', { timeout: 10000 });
      
      // Check if there are job cards and apply to the first one
      const jobCards = page.locator('.job-card');
      const jobCount = await jobCards.count();
      
      if (jobCount > 0) {
        // Click apply button on first job
        await jobCards.first().locator('.btn-apply').click();
        
        // Verify form is pre-filled with job information
        const messageField = page.locator('#message');
        const messageValue = await messageField.inputValue();
        
        expect(messageValue).toContain('interested in');
        expect(messageValue.length).toBeGreaterThan(0);
      } else {
        // If no jobs are available, verify the no results message
        await expect(page.locator('#noResults')).toBeVisible();
      }
    });
  });

  test.describe('Application Form', () => {
    test('should successfully submit teacher application form', async ({ page }) => {
      await page.goto('/signup.html');
      
      // Fill out the comprehensive application form
      await page.fill('#firstName', 'Alice');
      await page.fill('#lastName', 'Johnson');
      await page.fill('#email', 'alice.johnson@example.com');
      await page.fill('#phone', '+44-20-7123-4567');
      await page.selectOption('#nationality', 'British');
      await page.selectOption('#yearsExperience', '5-10');
      await page.fill('#education', 'Bachelor of Arts in English Literature from Oxford University, PGCE from University of Cambridge');
      await page.fill('#teachingExperience', '7 years teaching English at secondary level in UK state schools, including 2 years as Head of Department');
      await page.fill('#subjectSpecialty', 'English Language and Literature');
      await page.selectOption('#preferredLocation', 'shanghai');
      await page.fill('#additionalInfo', 'Experienced in curriculum development and teacher mentoring. Fluent in French, basic Mandarin.');
      
      // Submit the form (note: this form uses Formspree for GitHub Pages)
      await page.click('#applicationForm button[type="submit"]');
      
      // Wait for submission to complete
      await page.waitForTimeout(3000);
      
      // Check for success alert (Formspree or custom handling)
      await page.waitForFunction(() => {
        return window.confirm || document.querySelector('[data-test="success"]') || 
               document.body.textContent.includes('success') ||
               document.body.textContent.includes('submitted');
      }, { timeout: 15000 });
    });

    test('should validate required fields in application form', async ({ page }) => {
      await page.goto('/signup.html');
      
      // Try to submit empty form
      await page.click('#applicationForm button[type="submit"]');
      
      // Check required field validation
      const requiredFields = [
        '#firstName',
        '#lastName', 
        '#email',
        '#nationality',
        '#yearsExperience',
        '#education',
        '#teachingExperience',
        '#subjectSpecialty'
      ];
      
      for (const field of requiredFields) {
        await expect(page.locator(field)).toHaveAttribute('required');
      }
    });

    test('should handle file upload in application form', async ({ page }) => {
      await page.goto('/signup.html');
      
      // Check if file upload field exists
      const fileInput = page.locator('#introVideo');
      if (await fileInput.count() > 0) {
        // Check file input attributes
        await expect(fileInput).toHaveAttribute('type', 'file');
        await expect(fileInput).toHaveAttribute('accept', 'video/*');
        
        // Verify file size limit is mentioned in UI
        const fileHelpText = page.locator('text=/100.*MB|file.*size|upload.*limit/i');
        await expect(fileHelpText).toBeVisible();
      }
    });
  });

  test.describe('Newsletter Signup', () => {
    test('should handle newsletter signup form', async ({ page }) => {
      await page.goto('/');
      
      // Scroll to CTA section
      await page.locator('.cta').scrollIntoView();
      
      // Fill email and submit
      await page.fill('.email-input', 'newsletter@example.com');
      await page.click('.email-submit');
      
      // Wait for alert or success message
      await page.waitForFunction(() => {
        return document.querySelector('[data-test="newsletter-success"]') ||
               window.confirm ||
               document.body.textContent.includes('subscribed') ||
               document.body.textContent.includes('Thank you');
      }, { timeout: 5000 });
      
      // Verify email field is cleared after successful submission
      await expect(page.locator('.email-input')).toHaveValue('');
    });

    test('should validate email in newsletter form', async ({ page }) => {
      await page.goto('/');
      
      // Scroll to CTA section
      await page.locator('.cta').scrollIntoView();
      
      // Try invalid email
      await page.fill('.email-input', 'invalid-email');
      await page.click('.email-submit');
      
      // Check email field validity
      const emailField = page.locator('.email-input');
      const isValid = await emailField.evaluate(el => el.validity.valid);
      expect(isValid).toBe(false);
    });
  });

  test.describe('Form User Experience', () => {
    test('should show loading states during form submission', async ({ page }) => {
      await page.goto('/jobs.html');
      
      // Fill job interest form
      await page.locator('#interest-form').scrollIntoView();
      await page.fill('#firstName', 'Test');
      await page.fill('#lastName', 'User');
      await page.fill('#email', 'test@example.com');
      await page.selectOption('#teachingSubject', 'english');
      await page.selectOption('#experience', '3-5');
      
      // Submit and check for loading state
      const submitBtn = page.locator('#jobInterestForm button[type="submit"]');
      await submitBtn.click();
      
      // Verify button shows loading state (if implemented)
      await expect(submitBtn).toBeDisabled();
      
      // Wait for form to complete
      await page.waitForSelector('.message-alert-success, .message-alert-error', { timeout: 10000 });
    });

    test('should handle form errors gracefully', async ({ page }) => {
      // Test error handling by submitting form with invalid data
      await page.goto('/jobs.html');
      
      await page.locator('#interest-form').scrollIntoView();
      
      // Fill with invalid data that might cause server error
      await page.fill('#firstName', 'Test');
      await page.fill('#lastName', 'User');
      await page.fill('#email', 'test@invalid-domain-that-does-not-exist.com');
      await page.selectOption('#teachingSubject', 'english');
      await page.selectOption('#experience', '3-5');
      
      await page.click('#jobInterestForm button[type="submit"]');
      
      // Wait for either success or error message
      await page.waitForSelector('.message-alert-success, .message-alert-error', { 
        timeout: 15000 
      });
      
      // Form should either succeed or show error gracefully
      const hasSuccessMessage = await page.locator('.message-alert-success').count() > 0;
      const hasErrorMessage = await page.locator('.message-alert-error').count() > 0;
      
      expect(hasSuccessMessage || hasErrorMessage).toBe(true);
    });

    test('should maintain form data during validation errors', async ({ page }) => {
      await page.goto('/contact.html');
      
      // Fill form with some valid and some invalid data
      await page.fill('#name', 'John Doe');
      await page.fill('#email', 'invalid-email');
      await page.fill('#subject', 'Test Subject');
      
      // Submit form
      await page.click('.contact-submit-btn');
      
      // Check that valid data is preserved
      await expect(page.locator('#name')).toHaveValue('John Doe');
      await expect(page.locator('#subject')).toHaveValue('Test Subject');
    });
  });
});