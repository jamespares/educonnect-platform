let currentJobs = [];
let allJobs = [];
let savedJobs = JSON.parse(localStorage.getItem('savedJobs')) || [];

// Initialize the jobs page
document.addEventListener('DOMContentLoaded', function() {
    loadJobsFromAPI();
    setupEventListeners();
});

// Load jobs from API
async function loadJobsFromAPI() {
    try {
        const response = await fetch('/api/jobs');
        const data = await response.json();
        
        if (data.success) {
            allJobs = data.data.map(job => ({
                ...job,
                postedDate: formatPostedDate(job.createdAt),
                isNew: job.isNew === 1
            }));
            currentJobs = [...allJobs];
            renderJobs(currentJobs);
        } else {
            showError('Failed to load job listings');
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        showError('Unable to load job listings. Please try again later.');
    }
}

// Format posted date
function formatPostedDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'Today';
    } else if (diffDays === 2) {
        return 'Yesterday';
    } else {
        return `${diffDays - 1} days ago`;
    }
}

// Show error message
function showError(message) {
    const jobsGrid = document.getElementById('jobsGrid');
    jobsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <h3 style="color: #ef4444; margin-bottom: 1rem;">Error Loading Jobs</h3>
            <p style="color: #6b7280;">${message}</p>
            <button onclick="loadJobsFromAPI()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: rgb(230, 74, 74); color: white; border: none; border-radius: 8px; cursor: pointer;">
                Try Again
            </button>
        </div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.getElementById('jobSearch');
    const locationFilter = document.getElementById('locationFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    const interestForm = document.getElementById('jobInterestForm');

    // Search functionality
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Filter functionality
    locationFilter.addEventListener('change', performSearch);
    subjectFilter.addEventListener('change', performSearch);

    // Interest form submission
    if (interestForm) {
        interestForm.addEventListener('submit', handleInterestFormSubmit);
    }
}

// Perform search and filter
function performSearch() {
    const searchTerm = document.getElementById('jobSearch').value.toLowerCase();
    const locationFilter = document.getElementById('locationFilter').value.toLowerCase();
    const subjectFilter = document.getElementById('subjectFilter').value.toLowerCase();

    let filteredJobs = allJobs.filter(job => {
        const matchesSearch = !searchTerm || 
            job.title.toLowerCase().includes(searchTerm) ||
            job.company.toLowerCase().includes(searchTerm) ||
            job.location.toLowerCase().includes(searchTerm) ||
            job.jobFunctions.some(func => func.toLowerCase().includes(searchTerm));

        const matchesLocation = !locationFilter || 
            job.location.toLowerCase().includes(locationFilter);

        const matchesSubject = !subjectFilter ||
            job.jobFunctions.some(func => func.toLowerCase().includes(subjectFilter)) ||
            job.title.toLowerCase().includes(subjectFilter);

        return matchesSearch && matchesLocation && matchesSubject;
    });

    currentJobs = filteredJobs;
    renderJobs(currentJobs);
}

// Render jobs to the page
function renderJobs(jobs) {
    const jobsGrid = document.getElementById('jobsGrid');
    const noResults = document.getElementById('noResults');

    if (jobs.length === 0) {
        jobsGrid.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }

    jobsGrid.style.display = 'grid';
    noResults.style.display = 'none';

    jobsGrid.innerHTML = jobs.map(job => createJobCard(job)).join('');

    // Add event listeners to save buttons
    document.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', toggleSaveJob);
    });
}

// Create individual job card HTML
function createJobCard(job) {
    const isSaved = savedJobs.includes(job.id);
    const companyInitial = job.company.charAt(0).toUpperCase();
    
    return `
        <div class="job-card" data-job-id="${job.id}">
            <div class="job-header">
                <div class="job-posted ${job.isNew ? 'new' : ''}">${job.isNew ? 'NEW' : job.postedDate}</div>
                <div class="job-company">
                    <div class="company-logo">${companyInitial}</div>
                    <div class="company-info">
                        <h3>${job.company}</h3>
                        <p class="company-location">${job.location}(${job.locationChinese})</p>
                    </div>
                </div>
                <h2 class="job-title">${job.title}</h2>
            </div>
            
            <div class="job-details">
                <div class="job-info-grid">
                    <div class="job-info-item">
                        <span class="job-info-icon">📍</span>
                        <div>
                            <div class="job-info-label">Work Location</div>
                            <div class="job-info-value">${job.location}(${job.locationChinese})</div>
                        </div>
                    </div>
                    <div class="job-info-item">
                        <span class="job-info-icon">🇨🇳</span>
                        <div>
                            <div class="job-info-label">Chinese Required</div>
                            <div class="job-info-value">${job.chineseRequired}</div>
                        </div>
                    </div>
                    <div class="job-info-item">
                        <span class="job-info-icon">🎓</span>
                        <div>
                            <div class="job-info-label">Qualification</div>
                            <div class="job-info-value">${job.qualification}</div>
                        </div>
                    </div>
                    <div class="job-info-item">
                        <span class="job-info-icon">💰</span>
                        <div>
                            <div class="job-info-label">Salary (Monthly CNY)</div>
                            <div class="job-info-value">${job.salary}</div>
                        </div>
                    </div>
                    <div class="job-info-item">
                        <span class="job-info-icon">⏰</span>
                        <div>
                            <div class="job-info-label">Experience Required</div>
                            <div class="job-info-value">${job.experience}</div>
                        </div>
                    </div>
                    <div class="job-info-item">
                        <span class="job-info-icon">💼</span>
                        <div>
                            <div class="job-info-label">Contract Type</div>
                            <div class="job-info-value">${job.contractType}</div>
                        </div>
                    </div>
                </div>
                
                <p class="job-description">${job.description}</p>
                
                <div class="job-tags">
                    ${job.jobFunctions.map(func => `<span class="job-tag">${func}</span>`).join('')}
                </div>
            </div>
            
            <div class="job-actions">
                <button class="btn-apply" onclick="applyToJob(${job.id})">APPLY NOW</button>
                <button class="btn-save ${isSaved ? 'saved' : ''}" data-job-id="${job.id}">
                    ${isSaved ? 'SAVED ❤️' : 'SAVE ♡'}
                </button>
            </div>
        </div>
    `;
}

// Toggle save job
function toggleSaveJob(event) {
    const btn = event.target;
    const jobId = parseInt(btn.getAttribute('data-job-id'));
    
    if (savedJobs.includes(jobId)) {
        savedJobs = savedJobs.filter(id => id !== jobId);
        btn.classList.remove('saved');
        btn.textContent = 'SAVE ♡';
    } else {
        savedJobs.push(jobId);
        btn.classList.add('saved');
        btn.textContent = 'SAVED ❤️';
    }
    
    localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
}

// Apply to job function
function applyToJob(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    if (job) {
        // Scroll to interest form
        document.getElementById('interest-form').scrollIntoView({ behavior: 'smooth' });
        
        // Pre-fill form if possible
        const subjectSelect = document.getElementById('teachingSubject');
        const locationSelect = document.getElementById('preferredLocation');
        const messageTextarea = document.getElementById('message');
        
        // Try to match subject
        if (job.title.toLowerCase().includes('art')) {
            subjectSelect.value = 'art';
        } else if (job.title.toLowerCase().includes('math')) {
            subjectSelect.value = 'mathematics';
        } else if (job.title.toLowerCase().includes('english')) {
            subjectSelect.value = 'english';
        } else if (job.title.toLowerCase().includes('science')) {
            subjectSelect.value = 'science';
        } else if (job.title.toLowerCase().includes('pe') || job.title.toLowerCase().includes('physical')) {
            subjectSelect.value = 'pe';
        }
        
        // Set location
        const locationMap = {
            'shanghai': 'shanghai',
            'beijing': 'beijing',
            'shenzhen': 'shenzhen',
            'guangzhou': 'guangzhou',
            'nanjing': 'nanjing'
        };
        
        const jobLocation = job.location.toLowerCase();
        for (const [key, value] of Object.entries(locationMap)) {
            if (jobLocation.includes(key)) {
                locationSelect.value = value;
                break;
            }
        }
        
        // Pre-fill message
        messageTextarea.value = `I am interested in the ${job.title} position at ${job.company} in ${job.location}. Please consider my application for this role.`;
    }
}

// Handle interest form submission
async function handleInterestFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    
    // Disable submit button and show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Submitting...';
    
    try {
        const formData = new FormData(form);
        const interestData = Object.fromEntries(formData.entries());
        
        const response = await fetch('/api/job-interest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(interestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showFormSuccessMessage();
            form.reset();
        } else {
            showFormErrorMessage(result.message || 'Failed to submit interest');
        }
        
    } catch (error) {
        console.error('Error submitting job interest:', error);
        showFormErrorMessage('Unable to submit interest. Please try again later.');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// Show form success message
function showFormSuccessMessage() {
    const form = document.getElementById('jobInterestForm');
    const successMessage = document.createElement('div');
    successMessage.className = 'message-alert message-alert-success';
    successMessage.innerHTML = `
        <strong>Thank you for your interest!</strong> We've received your information and will contact you when suitable positions become available.
    `;
    
    form.parentNode.insertBefore(successMessage, form);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        successMessage.remove();
    }, 5000);
    
    // Scroll to success message
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Show form error message
function showFormErrorMessage(message) {
    const form = document.getElementById('jobInterestForm');
    const errorMessage = document.createElement('div');
    errorMessage.className = 'message-alert message-alert-error';
    errorMessage.innerHTML = `
        <strong>Error:</strong> ${message}
    `;
    
    form.parentNode.insertBefore(errorMessage, form);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        errorMessage.remove();
    }, 5000);
    
    // Scroll to error message
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Export functions for global access
window.applyToJob = applyToJob;
window.loadJobsFromAPI = loadJobsFromAPI;