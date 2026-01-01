document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    const submitButton = document.querySelector('.contact-submit-btn');
    
    // Check for success/error messages in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
        showMessage('Your message has been sent successfully! We\'ll get back to you within 24 hours.', 'success');
    } else if (urlParams.get('error') === 'true') {
        showMessage('There was an error sending your message. Please try again or email us directly.', 'error');
    }
    
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading state
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        
        // Form validation
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value.trim();
        const honeypot = document.getElementById('website').value.trim();
        
        // Honeypot check - if filled, it's a bot
        if (honeypot) {
            console.warn('Bot detected: honeypot field filled');
            showMessage('Spam detected. Your message was not sent.', 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            return;
        }
        
        if (!name || !email || !subject || !message) {
            showMessage('Please fill in all fields.', 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            return;
        }
        
        if (!isValidEmail(email)) {
            showMessage('Please enter a valid email address.', 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            return;
        }
        
        // Check for URLs in message (common spam pattern)
        if (containsUrl(message)) {
            showMessage('Messages containing URLs are not allowed. Please contact us directly via email if you need to share a link.', 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            return;
        }
        
        try {
            const response = await fetch('/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    subject,
                    message,
                    website: honeypot // Include honeypot field for server-side validation
                })
            });
            
            // Parse JSON response with error handling
            let result;
            try {
                result = await response.json();
            } catch (e) {
                // Handle rate limiting or non-JSON responses
                if (response.status === 429) {
                    showMessage('Too many requests. Please wait a few minutes before trying again.', 'error');
                } else {
                    showMessage('Invalid response from server. Please try again.', 'error');
                }
                return;
            }
            
            if (response.ok && result.success) {
                // Track contact form submission
                if (typeof umami !== 'undefined') {
                    umami.track('contact_form_submitted', {
                        subject: subject
                    });
                }
                showMessage('Message sent successfully! We will get back to you within 24 hours.', 'success');
                contactForm.reset();
            } else {
                showMessage(result.message || 'Failed to send message. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Contact form error:', error);
            showMessage('Network error. Please check your connection and try again.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
        }
    });
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Detect URLs in text (http://, https://, www., or common TLDs)
    function containsUrl(text) {
        if (!text) return false;
        const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
        return urlPattern.test(text);
    }
    
    function showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message-alert');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new message
        const alertDiv = document.createElement('div');
        alertDiv.className = `message-alert message-alert-${type}`;
        alertDiv.textContent = message;
        
        // Insert at the top of the form container
        const formContainer = document.querySelector('.contact-form-container');
        formContainer.insertBefore(alertDiv, formContainer.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
        
        // Scroll to message
        alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});