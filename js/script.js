// Simple form handling and UI interactions

// Handle application form submission
if (window.location.pathname.includes('signup')) {
    const form = document.querySelector('#applicationForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            
            // Show loading state
            submitButton.textContent = 'Submitting...';
            submitButton.disabled = true;
            
            try {
                const formData = new FormData(form);
                const response = await fetch('/api/submit-application', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Application submitted successfully! We will contact you soon.');
                    form.reset();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Network error. Please try again.');
            } finally {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
    }
}

// Handle admin login
if (window.location.pathname.includes('login')) {
    const loginForm = document.querySelector('#loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.querySelector('#username').value;
            const password = document.querySelector('#password').value;
            
            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    window.location.href = '/admin';
                } else {
                    alert('Invalid credentials');
                }
            } catch (error) {
                alert('Network error. Please try again.');
            }
        });
    }
}

// Handle email newsletter signup
const emailForm = document.querySelector('.cta-form');
if (emailForm) {
    emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailForm.querySelector('.email-input').value;
        if (email) {
            alert('Thank you for subscribing! We will send updates to ' + email);
            emailForm.querySelector('.email-input').value = '';
        }
    });
}

// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});