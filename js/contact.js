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
        
        try {
            const response = await fetch('https://formspree.io/f/mzzbglgv', {
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
                    _subject: `EduConnect Contact: ${subject}`,
                    _cc: 'team@educonnectchina.com'
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showMessage('Message sent successfully! We will get back to you within 24 hours.', 'success');
                contactForm.reset();
            } else {
                const result = await response.json();
                showMessage(result.error || 'Failed to send message. Please try again.', 'error');
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