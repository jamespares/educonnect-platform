// Simple form handling and UI interactions

// Note: Application form submission is handled inline in signup.html
// to properly support file uploads via FormData

// Handle admin login
if (window.location.pathname.includes('login')) {
    const loginForm = document.querySelector('#loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.querySelector('#username').value;
            const password = document.querySelector('#password').value;
            
            // Send credentials to server for authentication
            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });

                if (response.ok) {
                    let result;
                    try {
                        result = await response.json();
                    } catch (e) {
                        alert('Invalid response from server. Please try again.');
                        return;
                    }
                    if (result.success) {
                        window.location.href = '/admin';
                    } else {
                        alert(result.message || 'Invalid credentials');
                    }
                } else {
                    let result;
                    try {
                        result = await response.json();
                    } catch (e) {
                        alert('Login failed. Please try again.');
                        return;
                    }
                    alert(result.message || 'Invalid credentials');
                }
            } catch (error) {
                alert('Login failed. Please try again.');
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

    // Update current index and ensure it's within bounds
    currentSlideIndex = index;
    if (currentSlideIndex >= heroImages.length) currentSlideIndex = 0;
    if (currentSlideIndex < 0) currentSlideIndex = heroImages.length - 1;

    // Remove active class from all images and dots
    heroImages.forEach(img => img.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

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
    showSlide(index);
    resetAutoSlide();
}

// Remove global window assignments - we'll use event listeners instead

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
        // Initialize the carousel state
        currentSlideIndex = 0;
        showSlide(0);

        // Start the auto carousel
        autoSlideInterval = setInterval(nextSlide, 4000);

        // Add event listeners for carousel controls
        const prevBtn = document.querySelector('.carousel-prev');
        const nextBtn = document.querySelector('.carousel-next');
        const dots = document.querySelectorAll('.dot');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => changeSlide(-1));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => changeSlide(1));
        }

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => currentSlide(index));
        });
    }
    
    // Smooth scrolling for anchor links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            // Skip if href is just "#" (used for JavaScript-only links)
            if (!href || href === '#' || href === '#!') {
                return; // Don't prevent default, let the onclick handler work
            }
            e.preventDefault();
            const target = document.querySelector(href);
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
}