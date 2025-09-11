let currentJobs = [];
let allJobs = [];
let savedJobs = JSON.parse(localStorage.getItem('savedJobs')) || [];
let displayedJobsCount = 6; // Number of jobs to show initially
let jobsPerPage = 3; // Number of additional jobs to load when "Show More" is clicked

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
        hideShowMoreButton();
        return;
    }

    jobsGrid.style.display = 'grid';
    noResults.style.display = 'none';

    // Reset display count when new search/filter is applied
    displayedJobsCount = 6;
    
    renderJobsWithPagination(jobs);
}

// Render jobs with pagination
function renderJobsWithPagination(jobs) {
    const jobsGrid = document.getElementById('jobsGrid');
    const jobsToShow = jobs.slice(0, displayedJobsCount);
    
    jobsGrid.innerHTML = jobsToShow.map(job => createJobCard(job)).join('');

    // Add event listeners to save buttons
    document.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', toggleSaveJob);
    });

    // Show/hide "Show More" button based on remaining jobs
    if (displayedJobsCount < jobs.length) {
        showShowMoreButton(jobs);
    } else {
        hideShowMoreButton();
    }
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
    // Redirect to signup page for complete application
    window.location.href = 'signup.html';
}


// Toggle job details visibility
function toggleJobDetails(jobCard) {
    const details = jobCard.querySelector('.job-details');
    const isExpanded = details.style.display !== 'none';
    
    if (isExpanded) {
        details.style.display = 'none';
        jobCard.classList.remove('expanded');
    } else {
        details.style.display = 'block';
        jobCard.classList.add('expanded');
    }
}

// Show More button functions
function showShowMoreButton(jobs) {
    let showMoreBtn = document.getElementById('showMoreBtn');
    if (!showMoreBtn) {
        // Create the button if it doesn't exist
        const jobsSection = document.querySelector('.jobs-listing .container');
        const showMoreContainer = document.createElement('div');
        showMoreContainer.className = 'show-more-container';
        showMoreContainer.innerHTML = `
            <button id="showMoreBtn" class="btn-show-more">
                Show More Roles
                <span class="remaining-count">(${jobs.length - displayedJobsCount} more)</span>
            </button>
        `;
        jobsSection.appendChild(showMoreContainer);
        showMoreBtn = document.getElementById('showMoreBtn');
        
        showMoreBtn.addEventListener('click', function() {
            displayedJobsCount += jobsPerPage;
            renderJobsWithPagination(currentJobs);
        });
    } else {
        showMoreBtn.style.display = 'block';
        const remainingCount = showMoreBtn.querySelector('.remaining-count');
        if (remainingCount) {
            remainingCount.textContent = `(${jobs.length - displayedJobsCount} more)`;
        }
    }
}

function hideShowMoreButton() {
    const showMoreBtn = document.getElementById('showMoreBtn');
    if (showMoreBtn) {
        showMoreBtn.style.display = 'none';
    }
}

// Export functions for global access
window.applyToJob = applyToJob;
window.loadJobsFromAPI = loadJobsFromAPI;
window.toggleJobDetails = toggleJobDetails;