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
    
    contactForm.addEventListener('submit', function(e) {
        // Show loading state
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        
        // Form validation
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value.trim();
        
        if (!name || !email || !subject || !message) {
            e.preventDefault();
            showMessage('Please fill in all fields.', 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            return;
        }
        
        if (!isValidEmail(email)) {
            e.preventDefault();
            showMessage('Please enter a valid email address.', 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            return;
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