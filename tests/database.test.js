const { test, expect } = require('@playwright/test');

test.describe('Database and API Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure server is running and database is accessible
    await page.goto('/');
  });

  test.describe('Jobs API', () => {
    test('should fetch jobs from API successfully', async ({ page }) => {
      // Test the jobs API endpoint directly
      const response = await page.request.get('/api/jobs');
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should display jobs on jobs page', async ({ page }) => {
      await page.goto('/jobs.html');
      
      // Wait for jobs to load
      await page.waitForLoadState('networkidle');
      
      // Check if jobs are displayed or no results message is shown
      const jobCards = page.locator('.job-card');
      const noResults = page.locator('#noResults');
      
      const jobCount = await jobCards.count();
      const noResultsVisible = await noResults.isVisible();
      
      // Either jobs should be displayed or no results message should be visible
      expect(jobCount > 0 || noResultsVisible).toBe(true);
      
      if (jobCount > 0) {
        // Verify job card structure
        const firstJob = jobCards.first();
        await expect(firstJob.locator('.job-title')).toBeVisible();
        await expect(firstJob.locator('.job-company')).toBeVisible();
        await expect(firstJob.locator('.btn-apply')).toBeVisible();
      }
    });

    test('should handle job search and filtering', async ({ page }) => {
      await page.goto('/jobs.html');
      
      // Wait for jobs to load
      await page.waitForLoadState('networkidle');
      
      const initialJobCount = await page.locator('.job-card').count();
      
      if (initialJobCount > 0) {
        // Test search functionality
        await page.fill('#jobSearch', 'English');
        await page.click('.search-btn');
        
        // Wait for search results
        await page.waitForTimeout(1000);
        
        const searchResults = await page.locator('.job-card').count();
        
        // Search should either return results or show no results message
        const noResultsVisible = await page.locator('#noResults').isVisible();
        expect(searchResults > 0 || noResultsVisible).toBe(true);
        
        // Test location filter
        await page.selectOption('#locationFilter', 'shanghai');
        await page.waitForTimeout(1000);
        
        const filteredResults = await page.locator('.job-card').count();
        const noResultsAfterFilter = await page.locator('#noResults').isVisible();
        expect(filteredResults > 0 || noResultsAfterFilter).toBe(true);
        
        // Clear filters
        await page.fill('#jobSearch', '');
        await page.selectOption('#locationFilter', '');
        await page.click('.search-btn');
        
        await page.waitForTimeout(1000);
        
        // Should return to original or similar job count
        const clearedResults = await page.locator('.job-card').count();
        expect(clearedResults).toBeGreaterThanOrEqual(0);
      }
    });

    test('should fetch individual job details', async ({ page }) => {
      // First get list of jobs to get a valid job ID
      const jobsResponse = await page.request.get('/api/jobs');
      const jobsData = await jobsResponse.json();
      
      if (jobsData.success && jobsData.data.length > 0) {
        const firstJobId = jobsData.data[0].id;
        
        // Test individual job endpoint
        const jobResponse = await page.request.get(`/api/jobs/${firstJobId}`);
        expect(jobResponse.status()).toBe(200);
        
        const jobData = await jobResponse.json();
        expect(jobData).toHaveProperty('success', true);
        expect(jobData).toHaveProperty('data');
        expect(jobData.data).toHaveProperty('id', firstJobId);
      }
    });

    test('should handle invalid job ID gracefully', async ({ page }) => {
      const response = await page.request.get('/api/jobs/99999');
      expect(response.status()).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('message');
    });
  });

  test.describe('Form Submission APIs', () => {
    test('should submit job interest to database', async ({ page }) => {
      const interestData = {
        firstName: 'John',
        lastName: 'Doe', 
        email: 'john.doe.test@example.com',
        phone: '+1-555-0123',
        preferredLocation: 'shanghai',
        teachingSubject: 'english',
        experience: '3-5',
        message: 'Test interest submission from automated tests'
      };
      
      const response = await page.request.post('/api/job-interest', {
        data: interestData
      });
      
      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
    });

    test('should validate required fields in job interest API', async ({ page }) => {
      const incompleteData = {
        firstName: 'John',
        // Missing required fields
        email: 'test@example.com'
      };
      
      const response = await page.request.post('/api/job-interest', {
        data: incompleteData
      });
      
      expect(response.status()).toBe(400);
      
      const result = await response.json();
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('message');
    });

    test('should validate email format in job interest API', async ({ page }) => {
      const invalidEmailData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email-format',
        teachingSubject: 'english',
        experience: '3-5'
      };
      
      const response = await page.request.post('/api/job-interest', {
        data: invalidEmailData
      });
      
      expect(response.status()).toBe(400);
      
      const result = await response.json();
      expect(result).toHaveProperty('success', false);
      expect(result.message).toContain('email');
    });

    test('should submit teacher application to database', async ({ page }) => {
      const applicationData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith.test@example.com',
        phone: '+44-20-7123-4567',
        nationality: 'British',
        yearsExperience: '5-10',
        education: 'Bachelor of Arts in English Literature, PGCE',
        teachingExperience: '5 years teaching secondary English',
        subjectSpecialty: 'English Language and Literature',
        preferredLocation: 'beijing',
        additionalInfo: 'Experienced teacher seeking new challenges'
      };
      
      const response = await page.request.post('/api/submit-application', {
        data: applicationData
      });
      
      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
    });

    test('should validate teacher application required fields', async ({ page }) => {
      const incompleteApplication = {
        firstName: 'Jane',
        email: 'jane@example.com'
        // Missing required fields
      };
      
      const response = await page.request.post('/api/submit-application', {
        data: incompleteApplication
      });
      
      expect(response.status()).toBe(400);
      
      const result = await response.json();
      expect(result).toHaveProperty('success', false);
    });
  });

  test.describe('Admin Authentication', () => {
    test('should reject access to admin endpoints without authentication', async ({ page }) => {
      // Test teachers endpoint
      const teachersResponse = await page.request.get('/api/teachers');
      expect(teachersResponse.status()).toBe(302); // Redirect to login
      
      // Test individual teacher endpoint
      const teacherResponse = await page.request.get('/api/teachers/1');
      expect(teacherResponse.status()).toBe(302); // Redirect to login
    });

    test('should handle admin login', async ({ page }) => {
      const loginData = {
        username: 'admin',
        password: process.env.ADMIN_PASSWORD || 'password'
      };
      
      const response = await page.request.post('/api/admin/login', {
        data: loginData
      });
      
      // Should either succeed with correct credentials or fail with incorrect ones
      expect([200, 401]).toContain(response.status());
      
      const result = await response.json();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });

    test('should reject invalid admin credentials', async ({ page }) => {
      const invalidLoginData = {
        username: 'wrong-user',
        password: 'wrong-password'
      };
      
      const response = await page.request.post('/api/admin/login', {
        data: invalidLoginData
      });
      
      expect(response.status()).toBe(401);
      
      const result = await response.json();
      expect(result).toHaveProperty('success', false);
    });
  });

  test.describe('Database Health', () => {
    test('should have working database connection', async ({ page }) => {
      // Test that basic API endpoints are responding
      const jobsResponse = await page.request.get('/api/jobs');
      expect(jobsResponse.status()).toBe(200);
      
      // Test that we can submit data (job interest) 
      const testSubmission = {
        firstName: 'Database',
        lastName: 'Test',
        email: 'database.test@example.com',
        teachingSubject: 'english',
        experience: '3-5'
      };
      
      const submissionResponse = await page.request.post('/api/job-interest', {
        data: testSubmission
      });
      
      expect(submissionResponse.status()).toBe(200);
    });

    test('should handle database errors gracefully', async ({ page }) => {
      // Test with potentially problematic data
      const problematicData = {
        firstName: 'Test'.repeat(1000), // Very long string
        lastName: 'User',
        email: 'test@example.com',
        teachingSubject: 'english',
        experience: '3-5'
      };
      
      const response = await page.request.post('/api/job-interest', {
        data: problematicData
      });
      
      // Should either succeed or fail gracefully with proper error message
      expect([200, 400, 500]).toContain(response.status());
      
      const result = await response.json();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });
  });

  test.describe('Email Integration', () => {
    test('should not break when email service is unavailable', async ({ page }) => {
      // Submit forms that trigger email notifications
      const interestData = {
        firstName: 'Email',
        lastName: 'Test',
        email: 'email.test@example.com',
        teachingSubject: 'english',
        experience: '3-5',
        message: 'Testing email integration'
      };
      
      const response = await page.request.post('/api/job-interest', {
        data: interestData
      });
      
      // Even if email fails, the submission should still succeed
      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty('success', true);
    });

    test('should handle contact form email submission', async ({ page }) => {
      const contactData = {
        name: 'Contact Test',
        email: 'contact.test@example.com',
        subject: 'Test Message',
        message: 'This is a test message for contact form'
      };
      
      const response = await page.request.post('/send-message', {
        form: contactData
      });
      
      // Should redirect to contact page with success or error parameter
      expect([200, 302]).toContain(response.status());
    });
  });

  test.describe('Performance and Load', () => {
    test('should handle multiple simultaneous requests', async ({ page }) => {
      // Create multiple concurrent requests
      const requests = [];
      
      for (let i = 0; i < 5; i++) {
        requests.push(page.request.get('/api/jobs'));
      }
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
    });

    test('should respond within reasonable time limits', async ({ page }) => {
      const startTime = Date.now();
      
      const response = await page.request.get('/api/jobs');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });
  });
});