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
                // Convert FormData to JSON for serverless functions
                const data = {};
                for (let [key, value] of formData.entries()) {
                    data[key] = value;
                }
                
                // For GitHub Pages, use Formspree for form handling
                const response = await fetch('https://formspree.io/f/xrbgwodg', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        ...data,
                        _subject: 'New EduConnect Teacher Application',
                        _cc: 'team@educonnectchina.com'
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert('Application submitted successfully! We will contact you within 24-48 hours.');
                    form.reset();
                } else {
                    const result = await response.json();
                    alert('Error: ' + (result.error || 'Failed to submit application'));
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
            
            // Simple client-side authentication for demo purposes
            // In production, use proper server-side authentication
            const ADMIN_USERNAME = 'admin';
            const ADMIN_PASSWORD = 'educonnect2024';
            
            if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
                // Store token and redirect to admin
                localStorage.setItem('adminToken', 'admin-' + Date.now());
                window.location.href = '/admin.html';
            } else {
                alert('Invalid credentials');
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

// Hero image carousel
let currentSlideIndex = 0;
let autoSlideInterval;

function showSlide(index) {
    const heroImages = document.querySelectorAll('.hero-img');
    const dots = document.querySelectorAll('.dot');
    
    if (heroImages.length === 0) return;
    
    // Remove active class from all images and dots
    heroImages.forEach(img => img.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    // Ensure index is within bounds
    if (index >= heroImages.length) currentSlideIndex = 0;
    if (index < 0) currentSlideIndex = heroImages.length - 1;
    
    // Show current image and dot
    heroImages[currentSlideIndex].classList.add('active');
    if (dots[currentSlideIndex]) {
        dots[currentSlideIndex].classList.add('active');
    }
}

function changeSlide(direction) {
    currentSlideIndex += direction;
    showSlide(currentSlideIndex);
    resetAutoSlide();
}

function currentSlide(index) {
    currentSlideIndex = index - 1;
    showSlide(currentSlideIndex);
    resetAutoSlide();
}

function nextSlide() {
    currentSlideIndex++;
    showSlide(currentSlideIndex);
}

function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(nextSlide, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    const heroImages = document.querySelectorAll('.hero-img');
    
    if (heroImages.length > 0) {
        // Start the auto carousel
        autoSlideInterval = setInterval(nextSlide, 4000);
    }
    
    // Smooth scrolling for anchor links
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
    
    // Initialize mobile navigation
    initMobileNav();
});

// Mobile Navigation Functions
function toggleNav() {
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
        navLinks.classList.toggle('active');
    }
}

function closeNav() {
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
        navLinks.classList.remove('active');
    }
}

function initMobileNav() {
    // Close mobile nav when clicking outside
    document.addEventListener('click', function(event) {
        const navLinks = document.getElementById('navLinks');
        const navToggle = document.querySelector('.nav-toggle');
        
        if (navLinks && navToggle) {
            if (!navToggle.contains(event.target) && !navLinks.contains(event.target)) {
                navLinks.classList.remove('active');
            }
        }
    });
    
    // Close mobile nav on window resize if screen gets larger
    window.addEventListener('resize', function() {
        const navLinks = document.getElementById('navLinks');
        if (navLinks && window.innerWidth > 768) {
            navLinks.classList.remove('active');
        }
    });
});