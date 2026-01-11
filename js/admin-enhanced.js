// Enhanced Admin Dashboard JavaScript

let teachers = [];
let schools = [];
let jobs = [];
let matches = [];
let jobMatches = [];
let staff = [];
let currentUser = null;
let currentSort = { column: null, direction: 'asc' };

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check user role and show/hide staff tab
    await checkUserRole();
    
    loadTeachers();
    loadSchools();
    loadJobs();
    loadJobMatches();
    
    // Setup modal close handlers
    setupModals();
    
    // Setup form handlers
    document.getElementById('schoolForm').addEventListener('submit', handleSchoolSubmit);
    document.getElementById('staffForm').addEventListener('submit', handleStaffSubmit);
    document.getElementById('jobForm').addEventListener('submit', handleJobSubmit);
});

// Check user role and show staff management tab if master admin
async function checkUserRole() {
    try {
        const response = await fetch('/api/admin/me');
        const result = await response.json();
        
        console.log('User role check result:', result);
        
        if (result.success) {
            currentUser = result.data;
            console.log('Current user:', currentUser);
            
            // Show staff management tab only for master_admin
            if (currentUser.role === 'master_admin') {
                console.log('User is master_admin, showing staff tab');
                const staffTabButton = document.getElementById('staffTabButton');
                if (staffTabButton) {
                    staffTabButton.style.display = 'block';
                }
                loadStaff();
            } else {
                console.log('User role is:', currentUser.role, '- Staff tab will be hidden');
            }
        } else {
            console.error('Failed to get user info:', result);
        }
    } catch (error) {
        console.error('Error checking user role:', error);
    }
}

// Tab switching
function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    // Handle tab content ID (staff tab content is 'staffTab', button is 'staffTabButton')
    const tabContentId = tabName === 'staff' ? 'staffTab' : tabName + 'Tab';
    const tabContent = document.getElementById(tabContentId);
    if (tabContent) {
        tabContent.classList.add('active');
    } else {
        console.error('Tab content not found:', tabContentId);
    }
    
    // Load data for the tab
    if (tabName === 'teachers') {
        loadTeachers();
    } else if (tabName === 'schools') {
        loadSchools();
    } else if (tabName === 'jobs') {
        loadJobs();
    } else if (tabName === 'jobMatches') {
        loadJobMatches();
    } else if (tabName === 'staff') {
        console.log('Loading staff tab...');
        loadStaff();
    }
}

// Modal setup
function setupModals() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');
    
    closeButtons.forEach(btn => {
        btn.onclick = function() {
            modals.forEach(modal => modal.style.display = 'none');
        };
    });
    
    window.onclick = function(event) {
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };
}

// ========== TEACHERS ==========

async function loadTeachers() {
    try {
        const response = await fetch('/api/teachers');
        const result = await response.json();
        
        if (result.success) {
            teachers = result.data;
            // Debug: Log CV data
            console.log('Teachers loaded:', teachers.length);
            const teachersWithCV = teachers.filter(t => t.cvPath);
            console.log('Teachers with CV:', teachersWithCV.length);
            if (teachersWithCV.length > 0) {
                console.log('Sample teacher with CV:', teachersWithCV[0]);
            }
            renderTeachersTable(teachers);
            updateTeacherStats(teachers);
        } else {
            document.getElementById('teachersTableContent').innerHTML = 
                '<div class="empty-state">Error loading teachers: ' + result.message + '</div>';
        }
    } catch (error) {
        console.error('Error loading teachers:', error);
        document.getElementById('teachersTableContent').innerHTML = 
            '<div class="empty-state">Error loading teachers. Please try again.</div>';
    }
}

function updateTeacherStats(teachers) {
    const total = teachers.length;
    const pending = teachers.filter(t => t.status === 'pending').length;
    const matched = teachers.filter(t => t.is_matched).length;
    const employed = teachers.filter(t => t.status === 'employed').length;
    
    document.getElementById('totalTeachers').textContent = total;
    document.getElementById('pendingTeachers').textContent = pending;
    document.getElementById('matchedTeachers').textContent = matched;
    document.getElementById('employedTeachers').textContent = employed;
}

function renderTeachersTable(teachersToRender) {
    if (teachersToRender.length === 0) {
        document.getElementById('teachersTableContent').innerHTML = 
            '<div class="empty-state"><h3>No teachers found</h3></div>';
        return;
    }
    
    const table = document.createElement('table');
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th onclick="sortTable('firstName')">Name</th>
            <th onclick="sortTable('email')">Email</th>
            <th onclick="sortTable('nationality')">Nationality</th>
            <th onclick="sortTable('yearsExperience')">Experience</th>
            <th onclick="sortTable('subjectSpecialty')">Subject</th>
            <th onclick="sortTable('preferredLocation')">Location</th>
            <th onclick="sortTable('preferred_age_group')">Age Group</th>
            <th onclick="sortTable('status')">Status</th>
            <th onclick="sortTable('createdAt')">Applied</th>
            <th>CV</th>
            <th>Actions</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    teachersToRender.forEach(teacher => {
        const row = document.createElement('tr');
        // Check for CV path - handle both camelCase and snake_case
        const cvPath = teacher.cvPath || teacher.cv_path || null;
        // Debug log for first teacher
        if (teachersToRender.indexOf(teacher) === 0) {
            console.log('First teacher CV data:', { cvPath, teacher });
        }
        row.innerHTML = `
            <td>${escapeHtml(teacher.firstName)} ${escapeHtml(teacher.lastName)}</td>
            <td>${escapeHtml(teacher.email)}</td>
            <td>${escapeHtml(teacher.nationality)}</td>
            <td>${escapeHtml(teacher.yearsExperience)}</td>
            <td>${escapeHtml(teacher.subjectSpecialty)}</td>
            <td>${escapeHtml(teacher.preferredLocation || 'No preference')}</td>
            <td>${escapeHtml(teacher.preferred_age_group || 'Not specified')}</td>
            <td><span class="status-badge status-${teacher.status}">${teacher.status}</span></td>
            <td>${new Date(teacher.createdAt).toLocaleDateString()}</td>
            <td>
                ${cvPath ? 
                    `<button class="btn-small btn-primary" onclick="viewCV(${teacher.id})" title="View CV">📄 View CV</button>` : 
                    '<span style="color: #9ca3af;">No CV</span>'
                }
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-primary" onclick="viewTeacher(${teacher.id})">View</button>
                    <button class="btn-small btn-success" onclick="viewMatches(${teacher.id})">Matches</button>
                    <button class="btn-small btn-secondary" onclick="changeStatus(${teacher.id})">Status</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.appendChild(table);
    
    document.getElementById('teachersTableContent').innerHTML = '';
    document.getElementById('teachersTableContent').appendChild(wrapper);
    
    updateSortIndicators();
}

function sortTable(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    teachers.sort((a, b) => {
        let aVal = a[column] || '';
        let bVal = b[column] || '';
        
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (currentSort.direction === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });
    
    renderTeachersTable(teachers);
}

function updateSortIndicators() {
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    if (currentSort.column) {
        const header = Array.from(document.querySelectorAll('th')).find(th => 
            th.textContent.trim().toLowerCase().includes(currentSort.column.toLowerCase().replace(/([A-Z])/g, ' $1').trim())
        );
        if (header) {
            header.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }
}

function filterTeachers() {
    const searchTerm = document.getElementById('teacherSearch').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = teachers.filter(teacher => {
        const matchesSearch = !searchTerm || 
            `${teacher.firstName} ${teacher.lastName} ${teacher.email} ${teacher.nationality} ${teacher.subjectSpecialty} ${teacher.preferredLocation}`.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusFilter || teacher.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    
    renderTeachersTable(filtered);
}

async function viewTeacher(id) {
    try {
        const response = await fetch(`/api/teachers/${id}`);
        const result = await response.json();
        
        if (result.success) {
            const teacher = result.data;
            const modalBody = document.getElementById('teacherModalBody');
            
            // Check for CV path - handle both camelCase and snake_case
            const cvPath = teacher.cvPath || teacher.cv_path || null;
            console.log('Teacher CV data in modal:', { cvPath, teacher });
            
            // CV section - prominent at the top
            const cvSection = cvPath ? 
                `<div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; text-align: center;">
                    <h3 style="margin: 0 0 1rem 0; color: #1e40af; font-size: 1.25rem;">📄 CV Available</h3>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="viewCV(${teacher.id})" style="font-size: 1rem; padding: 0.75rem 1.5rem;">
                            👁️ View CV
                        </button>
                        <button class="btn btn-success" onclick="downloadCV(${teacher.id})" style="font-size: 1rem; padding: 0.75rem 1.5rem;">
                            ⬇️ Download CV
                        </button>
                    </div>
                </div>` :
                `<div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 1rem; margin-bottom: 2rem; text-align: center; color: #92400e;">
                    ⚠️ No CV uploaded for this teacher
                </div>`;
            
            modalBody.innerHTML = cvSection + `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;">
                    <div><strong>First Name:</strong> ${escapeHtml(teacher.firstName)}</div>
                    <div><strong>Last Name:</strong> ${escapeHtml(teacher.lastName)}</div>
                    <div><strong>Email:</strong> ${escapeHtml(teacher.email)}</div>
                    <div><strong>Phone:</strong> ${escapeHtml(teacher.phone)}</div>
                    <div><strong>Nationality:</strong> ${escapeHtml(teacher.nationality)}</div>
                    <div><strong>Experience:</strong> ${escapeHtml(teacher.yearsExperience)}</div>
                    <div><strong>Subject:</strong> ${escapeHtml(teacher.subjectSpecialty)}</div>
                    <div><strong>Location:</strong> ${escapeHtml(teacher.preferredLocation || 'No preference')}</div>
                    <div><strong>Age Group:</strong> ${escapeHtml(teacher.preferred_age_group || 'Not specified')}</div>
                    <div><strong>Status:</strong> <span class="status-badge status-${teacher.status}">${teacher.status}</span></div>
                    <div style="grid-column: span 2;"><strong>Education:</strong><br>${escapeHtml(teacher.education)}</div>
                    <div style="grid-column: span 2;"><strong>Teaching Experience:</strong><br>${escapeHtml(teacher.teachingExperience)}</div>
                    ${teacher.additionalInfo ? `<div style="grid-column: span 2;"><strong>Additional Info:</strong><br>${escapeHtml(teacher.additionalInfo)}</div>` : ''}
                </div>
            `;
            
            document.getElementById('teacherModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading teacher:', error);
        alert('Error loading teacher details');
    }
}

// View CV in new tab
async function viewCV(teacherId) {
    try {
        const response = await fetch(`/api/teachers/${teacherId}/cv`);
        const result = await response.json();
        
        if (result.success && result.data.url) {
            window.open(result.data.url, '_blank');
        } else {
            alert('Error loading CV: ' + (result.message || 'CV not found'));
        }
    } catch (error) {
        console.error('Error loading CV:', error);
        alert('Error loading CV');
    }
}

// Download CV
async function downloadCV(teacherId) {
    try {
        const response = await fetch(`/api/teachers/${teacherId}/cv`);
        const result = await response.json();
        
        if (result.success && result.data.url) {
            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = result.data.url;
            link.download = `CV_${teacherId}.pdf`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert('Error loading CV: ' + (result.message || 'CV not found'));
        }
    } catch (error) {
        console.error('Error downloading CV:', error);
        alert('Error downloading CV');
    }
}

async function viewMatches(teacherId) {
    try {
        // First try job matches
        const response = await fetch(`/api/job-matching/teacher/${teacherId}`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            const matches = result.data;
            let matchesHtml = 'Matching Jobs:\n\n';
            matches.slice(0, 10).forEach((match, idx) => {
                matchesHtml += `${idx + 1}. ${match.job.title} at ${match.job.company} - Score: ${match.score}%\n`;
                matchesHtml += `   Location: ${match.job.location}\n`;
                matchesHtml += `   Reasons: ${match.reasons.join(', ')}\n\n`;
            });
            if (matches.length > 10) {
                matchesHtml += `... and ${matches.length - 10} more matches`;
            }
            alert(matchesHtml);
        } else {
            alert('No job matches found for this teacher. Try running Job Matching from the Jobs tab first.');
        }
    } catch (error) {
        console.error('Error loading matches:', error);
        alert('Error loading matches');
    }
}

async function changeStatus(id) {
    const newStatus = prompt('Enter new status (pending, interviewing, employed, inactive):');
    if (newStatus && ['pending', 'interviewing', 'employed', 'inactive'].includes(newStatus)) {
        try {
            const response = await fetch(`/api/teachers/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            
            const result = await response.json();
            if (result.success) {
                loadTeachers();
                alert('Status updated successfully');
            } else {
                alert('Error updating status: ' + result.message);
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error updating status');
        }
    }
}

async function runMatching() {
    if (!confirm('This will run job matching for all teachers. This may take a while. Continue?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/job-matching/run-for-all', {
            method: 'POST'
        });
        
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            loadTeachers();
            loadJobMatches();
        } else {
            alert('Error running job matching: ' + result.message);
        }
    } catch (error) {
        console.error('Error running job matching:', error);
        alert('Error running job matching');
    }
}

// ========== SCHOOLS ==========

async function loadSchools() {
    try {
        const response = await fetch('/api/schools');
        const result = await response.json();
        
        if (result.success) {
            schools = result.data;
            renderSchoolsTable(schools);
        } else {
            document.getElementById('schoolsTableContent').innerHTML = 
                '<div class="empty-state">Error loading schools: ' + result.message + '</div>';
        }
    } catch (error) {
        console.error('Error loading schools:', error);
        document.getElementById('schoolsTableContent').innerHTML = 
            '<div class="empty-state">Error loading schools. Please try again.</div>';
    }
}

function renderSchoolsTable(schoolsToRender) {
    if (schoolsToRender.length === 0) {
        document.getElementById('schoolsTableContent').innerHTML = 
            '<div class="empty-state"><h3>No schools found</h3><p>Click "Add School" to add a new school.</p></div>';
        return;
    }
    
    const table = document.createElement('table');
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Name</th>
            <th>Location</th>
            <th>City</th>
            <th>Type</th>
            <th>Recruiter Contact</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    schoolsToRender.forEach(school => {
        const recruiterInfo = [];
        if (school.recruiterEmail) recruiterInfo.push(`📧 ${escapeHtml(school.recruiterEmail)}`);
        if (school.hrEmail) recruiterInfo.push(`📧 HR: ${escapeHtml(school.hrEmail)}`);
        if (school.recruiterWechatId) recruiterInfo.push(`💬 WeChat: ${escapeHtml(school.recruiterWechatId)}`);
        
        const recruiterDisplay = recruiterInfo.length > 0 
            ? `<div style="font-size: 0.875rem;">${recruiterInfo.join('<br>')}</div>`
            : '<span style="color: #9ca3af; font-size: 0.875rem;">No recruiter info</span>';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(school.name)}</td>
            <td>${escapeHtml(school.location)}</td>
            <td>${escapeHtml(school.city || '')}</td>
            <td>${escapeHtml(school.schoolType || '')}</td>
            <td>${recruiterDisplay}</td>
            <td><span class="status-badge ${school.isActive ? 'status-employed' : 'status-inactive'}">${school.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-primary" onclick="editSchool(${school.id})">Edit</button>
                    <button class="btn-small btn-danger" onclick="deleteSchool(${school.id})">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.appendChild(table);
    
    document.getElementById('schoolsTableContent').innerHTML = '';
    document.getElementById('schoolsTableContent').appendChild(wrapper);
}

function showAddSchoolModal() {
    document.getElementById('schoolId').value = '';
    document.getElementById('schoolForm').reset();
    document.getElementById('schoolModalTitle').textContent = 'Add School';
    document.getElementById('schoolModal').style.display = 'block';
}

function editSchool(id) {
    const school = schools.find(s => s.id === id);
    if (!school) return;
    
    document.getElementById('schoolId').value = school.id;
    document.getElementById('schoolName').value = school.name || '';
    document.getElementById('schoolNameChinese').value = school.nameChinese || '';
    document.getElementById('schoolLocation').value = school.location || '';
    document.getElementById('schoolCity').value = school.city || '';
    document.getElementById('schoolProvince').value = school.province || '';
    document.getElementById('schoolType').value = school.schoolType || '';
    document.getElementById('schoolAgeGroups').value = (school.ageGroups || []).join(', ');
    document.getElementById('schoolSubjects').value = (school.subjectsNeeded || []).join(', ');
    document.getElementById('schoolExperience').value = school.experienceRequired || '';
    document.getElementById('schoolChineseRequired').checked = school.chineseRequired || false;
    document.getElementById('schoolSalary').value = school.salaryRange || '';
    document.getElementById('schoolContractType').value = school.contractType || '';
    document.getElementById('schoolBenefits').value = school.benefits || '';
    document.getElementById('schoolDescription').value = school.description || '';
    document.getElementById('schoolContactName').value = school.contactName || '';
    document.getElementById('schoolContactEmail').value = school.contactEmail || '';
    document.getElementById('schoolContactPhone').value = school.contactPhone || '';
    document.getElementById('schoolHrEmail').value = school.hrEmail || '';
    document.getElementById('schoolRecruiterEmail').value = school.recruiterEmail || '';
    document.getElementById('schoolRecruiterWechatId').value = school.recruiterWechatId || '';
    document.getElementById('schoolIsActive').checked = school.isActive !== false;
    
    document.getElementById('schoolModalTitle').textContent = 'Edit School';
    document.getElementById('schoolModal').style.display = 'block';
}

function closeSchoolModal() {
    document.getElementById('schoolModal').style.display = 'none';
}

async function handleSchoolSubmit(e) {
    e.preventDefault();
    
    const schoolId = document.getElementById('schoolId').value;
    const schoolData = {
        name: document.getElementById('schoolName').value.trim(),
        nameChinese: document.getElementById('schoolNameChinese').value.trim(),
        location: document.getElementById('schoolLocation').value.trim(),
        city: document.getElementById('schoolCity').value.trim(),
        province: document.getElementById('schoolProvince').value.trim(),
        schoolType: document.getElementById('schoolType').value.trim(),
        ageGroups: document.getElementById('schoolAgeGroups').value.split(',').map(s => s.trim()).filter(s => s),
        subjectsNeeded: document.getElementById('schoolSubjects').value.split(',').map(s => s.trim()).filter(s => s),
        experienceRequired: document.getElementById('schoolExperience').value.trim(),
        chineseRequired: document.getElementById('schoolChineseRequired').checked,
        salaryRange: document.getElementById('schoolSalary').value.trim(),
        contractType: document.getElementById('schoolContractType').value.trim(),
        benefits: document.getElementById('schoolBenefits').value.trim(),
        description: document.getElementById('schoolDescription').value.trim(),
        contactName: document.getElementById('schoolContactName').value.trim(),
        contactEmail: document.getElementById('schoolContactEmail').value.trim(),
        contactPhone: document.getElementById('schoolContactPhone').value.trim(),
        hrEmail: document.getElementById('schoolHrEmail').value.trim(),
        recruiterEmail: document.getElementById('schoolRecruiterEmail').value.trim(),
        recruiterWechatId: document.getElementById('schoolRecruiterWechatId').value.trim(),
        isActive: document.getElementById('schoolIsActive').checked
    };
    
    try {
        const url = schoolId ? `/api/schools/${schoolId}` : '/api/schools';
        const method = schoolId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schoolData)
        });
        
        const result = await response.json();
        if (result.success) {
            alert('School saved successfully');
            closeSchoolModal();
            loadSchools();
        } else {
            alert('Error saving school: ' + result.message);
        }
    } catch (error) {
        console.error('Error saving school:', error);
        alert('Error saving school');
    }
}

async function deleteSchool(id) {
    if (!confirm('Are you sure you want to delete this school?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/schools/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            alert('School deleted successfully');
            loadSchools();
        } else {
            alert('Error deleting school: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting school:', error);
        alert('Error deleting school');
    }
}

// ========== JOBS ==========

async function loadJobs() {
    try {
        const response = await fetch('/api/admin/jobs'); // Use admin endpoint to get all jobs
        const result = await response.json();
        
        if (result.success) {
            jobs = result.data;
            renderJobsTable(jobs);
            updateJobStats(jobs);
        } else {
            document.getElementById('jobsTableContent').innerHTML = 
                '<div class="empty-state">Error loading jobs: ' + result.message + '</div>';
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        document.getElementById('jobsTableContent').innerHTML = 
            '<div class="empty-state">Error loading jobs. Please try again.</div>';
    }
}

function updateJobStats(jobs) {
    const total = jobs.length;
    const active = jobs.filter(j => j.isActive).length;
    const inactive = jobs.filter(j => !j.isActive).length;
    
    document.getElementById('totalJobs').textContent = total;
    document.getElementById('activeJobs').textContent = active;
    document.getElementById('inactiveJobs').textContent = inactive;
}

function renderJobsTable(jobsToRender) {
    if (jobsToRender.length === 0) {
        document.getElementById('jobsTableContent').innerHTML = 
            '<div class="empty-state"><h3>No jobs found</h3><p>Click "Add Job" to create a new job listing.</p></div>';
        return;
    }
    
    const table = document.createElement('table');
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Title</th>
            <th>Company</th>
            <th>Location</th>
            <th>Age Groups</th>
            <th>Subjects</th>
            <th>Salary</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    jobsToRender.forEach(job => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(job.title)}</td>
            <td>${escapeHtml(job.company)}</td>
            <td>${escapeHtml(job.location)}${job.city ? ' (' + escapeHtml(job.city) + ')' : ''}</td>
            <td>${(job.ageGroups || []).join(', ') || 'Not specified'}</td>
            <td>${(job.subjects || []).join(', ') || 'Not specified'}</td>
            <td>${escapeHtml(job.salary)}</td>
            <td><span class="status-badge ${job.isActive ? 'status-employed' : 'status-inactive'}">${job.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-primary" onclick="editJob(${job.id})">Edit</button>
                    <button class="btn-small btn-success" onclick="viewJobMatches(${job.id})">Matches</button>
                    <button class="btn-small btn-danger" onclick="deleteJob(${job.id})">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.appendChild(table);
    
    document.getElementById('jobsTableContent').innerHTML = '';
    document.getElementById('jobsTableContent').appendChild(wrapper);
}

async function showAddJobModal() {
    document.getElementById('jobId').value = '';
    document.getElementById('jobForm').reset();
    document.getElementById('jobIsActive').checked = true;
    document.getElementById('jobModalTitle').textContent = 'Add Job';
    
    // Load schools for the dropdown
    await loadSchoolsForJobForm();
    
    document.getElementById('jobModal').style.display = 'block';
}

let schoolsForJobForm = []; // Store schools for auto-fill

async function loadSchoolsForJobForm() {
    try {
        const response = await fetch('/api/schools');
        const result = await response.json();
        
        if (result.success) {
            schoolsForJobForm = result.data;
            const schoolSelect = document.getElementById('jobSchoolId');
            schoolSelect.innerHTML = '<option value="">-- Select a school from database --</option>';
            
            result.data.forEach(school => {
                const option = document.createElement('option');
                option.value = school.id;
                option.textContent = `${school.name}${school.city ? ' - ' + school.city : ''}`;
                schoolSelect.appendChild(option);
            });
            
            // Add event listener to auto-fill fields when school is selected
            schoolSelect.addEventListener('change', function() {
                const selectedSchoolId = this.value;
                if (selectedSchoolId) {
                    const selectedSchool = schoolsForJobForm.find(s => s.id == selectedSchoolId);
                    if (selectedSchool) {
                        // Auto-fill company name if empty
                        if (!document.getElementById('jobCompany').value.trim()) {
                            document.getElementById('jobCompany').value = selectedSchool.name;
                        }
                        // Auto-fill location if empty
                        if (!document.getElementById('jobLocation').value.trim()) {
                            document.getElementById('jobLocation').value = selectedSchool.location;
                        }
                        // Auto-fill city if empty
                        if (!document.getElementById('jobCity').value.trim() && selectedSchool.city) {
                            document.getElementById('jobCity').value = selectedSchool.city;
                        }
                        // Auto-fill province if empty
                        if (!document.getElementById('jobProvince').value.trim() && selectedSchool.province) {
                            document.getElementById('jobProvince').value = selectedSchool.province;
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading schools for job form:', error);
    }
}

async function editJob(id) {
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    
    // Load schools for the dropdown
    await loadSchoolsForJobForm();
    
    document.getElementById('jobId').value = job.id;
    document.getElementById('jobSchoolId').value = job.schoolId || '';
    document.getElementById('jobTitle').value = job.title || '';
    document.getElementById('jobCompany').value = job.company || '';
    document.getElementById('jobLocation').value = job.location || '';
    document.getElementById('jobCity').value = job.city || '';
    document.getElementById('jobProvince').value = job.province || '';
    document.getElementById('jobSalary').value = job.salary || '';
    document.getElementById('jobExperience').value = job.experience || '';
    document.getElementById('jobQualification').value = job.qualification || '';
    document.getElementById('jobAgeGroups').value = (job.ageGroups || []).join(', ');
    document.getElementById('jobSubjects').value = (job.subjects || []).join(', ');
    document.getElementById('jobContractType').value = job.contractType || 'Full Time';
    document.getElementById('jobChineseRequired').value = job.chineseRequired || 'No';
    document.getElementById('jobDescription').value = job.description || '';
    document.getElementById('jobRequirements').value = job.requirements || '';
    document.getElementById('jobBenefits').value = job.benefits || '';
    document.getElementById('jobIsActive').checked = job.isActive !== false;
    
    document.getElementById('jobModalTitle').textContent = 'Edit Job';
    document.getElementById('jobModal').style.display = 'block';
}

function closeJobModal() {
    document.getElementById('jobModal').style.display = 'none';
}

async function handleJobSubmit(e) {
    e.preventDefault();
    
    const jobId = document.getElementById('jobId').value;
    const schoolId = document.getElementById('jobSchoolId').value;
    
    // If a school is selected, optionally auto-fill company name
    let companyName = document.getElementById('jobCompany').value.trim();
    if (schoolId && !companyName) {
        // Try to get school name from dropdown
        const schoolSelect = document.getElementById('jobSchoolId');
        const selectedOption = schoolSelect.options[schoolSelect.selectedIndex];
        if (selectedOption && selectedOption.textContent) {
            // Extract school name (before the dash if present)
            companyName = selectedOption.textContent.split(' - ')[0];
        }
    }
    
    const jobData = {
        title: document.getElementById('jobTitle').value.trim(),
        company: companyName,
        location: document.getElementById('jobLocation').value.trim(),
        city: document.getElementById('jobCity').value.trim(),
        province: document.getElementById('jobProvince').value.trim(),
        salary: document.getElementById('jobSalary').value.trim(),
        experience: document.getElementById('jobExperience').value.trim(),
        qualification: document.getElementById('jobQualification').value.trim(),
        ageGroups: document.getElementById('jobAgeGroups').value.split(',').map(s => s.trim()).filter(s => s),
        subjects: document.getElementById('jobSubjects').value.split(',').map(s => s.trim()).filter(s => s),
        contractType: document.getElementById('jobContractType').value.trim(),
        chineseRequired: document.getElementById('jobChineseRequired').value.trim(),
        description: document.getElementById('jobDescription').value.trim(),
        requirements: document.getElementById('jobRequirements').value.trim(),
        benefits: document.getElementById('jobBenefits').value.trim(),
        isActive: document.getElementById('jobIsActive').checked,
        jobFunctions: document.getElementById('jobSubjects').value.trim(), // Use subjects as job functions for compatibility
        schoolId: schoolId || null // Add school_id to link job to school
    };
    
    try {
        const url = jobId ? `/api/admin/jobs/${jobId}` : '/api/admin/jobs';
        const method = jobId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobData)
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Job saved successfully');
            closeJobModal();
            loadJobs();
        } else {
            alert('Error saving job: ' + result.message);
        }
    } catch (error) {
        console.error('Error saving job:', error);
        alert('Error saving job');
    }
}

async function deleteJob(id) {
    if (!confirm('Are you sure you want to delete this job?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/jobs/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Job deleted successfully');
            loadJobs();
        } else {
            alert('Error deleting job: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting job:', error);
        alert('Error deleting job');
    }
}

async function viewJobMatches(jobId) {
    try {
        const response = await fetch(`/api/job-matching/job/${jobId}`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            const matches = result.data;
            let matchesHtml = 'Matching Teachers:\n\n';
            matches.slice(0, 10).forEach((match, idx) => {
                matchesHtml += `${idx + 1}. ${match.teacher.firstName} ${match.teacher.lastName} - Score: ${match.score}%\n`;
                matchesHtml += `   Reasons: ${match.reasons.join(', ')}\n\n`;
            });
            if (matches.length > 10) {
                matchesHtml += `... and ${matches.length - 10} more matches`;
            }
            alert(matchesHtml);
        } else {
            alert('No matches found for this job. Try running Job Matching first.');
        }
    } catch (error) {
        console.error('Error loading job matches:', error);
        alert('Error loading job matches');
    }
}

async function runJobMatching() {
    if (!confirm('This will run matching for all active jobs and teachers. Continue?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/job-matching/run-for-all', {
            method: 'POST'
        });
        
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            loadJobs();
            loadJobMatches();
        } else {
            alert('Error running job matching: ' + result.message);
        }
    } catch (error) {
        console.error('Error running job matching:', error);
        alert('Error running job matching');
    }
}

// ========== JOB MATCHES ==========

async function loadJobMatches() {
    try {
        const statusFilter = document.getElementById('jobMatchStatusFilter')?.value || '';
        const url = statusFilter ? `/api/job-matching?status=${statusFilter}` : '/api/job-matching';
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            jobMatches = result.data;
            renderJobMatchesTable(jobMatches);
        } else {
            document.getElementById('jobMatchesTableContent').innerHTML = 
                '<div class="empty-state">Error loading job matches: ' + result.message + '</div>';
        }
    } catch (error) {
        console.error('Error loading job matches:', error);
        document.getElementById('jobMatchesTableContent').innerHTML = 
            '<div class="empty-state">Error loading job matches. Please try again.</div>';
    }
}

function renderJobMatchesTable(matchesToRender) {
    if (matchesToRender.length === 0) {
        document.getElementById('jobMatchesTableContent').innerHTML = 
            '<div class="empty-state"><h3>No job matches found</h3><p>Click "Run Job Matching" from the Jobs tab to generate matches.</p></div>';
        return;
    }
    
    const table = document.createElement('table');
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Teacher</th>
            <th>Job</th>
            <th>Location</th>
            <th>Match Score</th>
            <th>Match Reasons</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    matchesToRender.forEach(match => {
        const teacher = match.teacher;
        const job = match.job;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${teacher ? `${escapeHtml(teacher.firstName)} ${escapeHtml(teacher.lastName)}<br><small>${escapeHtml(teacher.email)}</small>` : 'N/A'}</td>
            <td>${job ? `${escapeHtml(job.title)}<br><small>${escapeHtml(job.company)}</small>` : 'N/A'}</td>
            <td>${job ? escapeHtml(job.location) : 'N/A'}</td>
            <td><span class="match-score">${match.matchScore || 0}%</span></td>
            <td>
                <div class="match-reasons">
                    <ul>
                        ${(match.matchReasons || []).map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                    </ul>
                </div>
            </td>
            <td><span class="status-badge status-${match.status}">${match.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-primary" onclick="updateJobMatchStatus(${match.id})">Update Status</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.appendChild(table);
    
    document.getElementById('jobMatchesTableContent').innerHTML = '';
    document.getElementById('jobMatchesTableContent').appendChild(wrapper);
}

async function updateJobMatchStatus(matchId) {
    const newStatus = prompt('Enter new status (pending, contacted, interviewed, placed, rejected):');
    if (newStatus && ['pending', 'contacted', 'interviewed', 'placed', 'rejected'].includes(newStatus)) {
        try {
            const response = await fetch(`/api/job-matching/${matchId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            
            const result = await response.json();
            if (result.success) {
                loadJobMatches();
                alert('Job match status updated successfully');
            } else {
                alert('Error updating job match status: ' + result.message);
            }
        } catch (error) {
            console.error('Error updating job match status:', error);
            alert('Error updating job match status');
        }
    }
}

// ========== MATCHES ========== (legacy school matches)

async function loadMatches() {
    try {
        const statusFilter = document.getElementById('matchStatusFilter')?.value || '';
        const url = statusFilter ? `/api/matching?status=${statusFilter}` : '/api/matching';
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            matches = result.data;
            renderMatchesTable(matches);
        } else {
            document.getElementById('matchesTableContent').innerHTML = 
                '<div class="empty-state">Error loading matches: ' + result.message + '</div>';
        }
    } catch (error) {
        console.error('Error loading matches:', error);
        document.getElementById('matchesTableContent').innerHTML = 
            '<div class="empty-state">Error loading matches. Please try again.</div>';
    }
}

function renderMatchesTable(matchesToRender) {
    if (matchesToRender.length === 0) {
        document.getElementById('matchesTableContent').innerHTML = 
            '<div class="empty-state"><h3>No matches found</h3><p>Run matching from the Teachers tab to generate matches.</p></div>';
        return;
    }
    
    const table = document.createElement('table');
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Teacher</th>
            <th>School</th>
            <th>Location</th>
            <th>Match Score</th>
            <th>Match Reasons</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    matchesToRender.forEach(match => {
        const teacher = match.teacher;
        const school = match.school;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${teacher ? `${escapeHtml(teacher.firstName)} ${escapeHtml(teacher.lastName)}<br><small>${escapeHtml(teacher.email)}</small>` : 'N/A'}</td>
            <td>${school ? escapeHtml(school.name) : 'N/A'}</td>
            <td>${school ? escapeHtml(school.location) : 'N/A'}</td>
            <td><span class="match-score">${match.matchScore || 0}%</span></td>
            <td>
                <div class="match-reasons">
                    <ul>
                        ${(match.matchReasons || []).map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                    </ul>
                </div>
            </td>
            <td><span class="status-badge status-${match.status}">${match.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-primary" onclick="updateMatchStatus(${match.id})">Update Status</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.appendChild(table);
    
    document.getElementById('matchesTableContent').innerHTML = '';
    document.getElementById('matchesTableContent').appendChild(wrapper);
}

async function updateMatchStatus(matchId) {
    const newStatus = prompt('Enter new status (pending, contacted, interviewed, placed, rejected):');
    if (newStatus && ['pending', 'contacted', 'interviewed', 'placed', 'rejected'].includes(newStatus)) {
        try {
            const response = await fetch(`/api/matching/${matchId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            
            const result = await response.json();
            if (result.success) {
                loadMatches();
                alert('Match status updated successfully');
            } else {
                alert('Error updating match status: ' + result.message);
            }
        } catch (error) {
            console.error('Error updating match status:', error);
            alert('Error updating match status');
        }
    }
}

// ========== STAFF MANAGEMENT ==========

async function loadStaff() {
    console.log('Loading staff...');
    try {
        const response = await fetch('/api/admin/staff');
        console.log('Staff API response status:', response.status);
        const result = await response.json();
        console.log('Staff API result:', result);
        
        if (result.success) {
            staff = result.data;
            console.log('Staff data loaded:', staff);
            renderStaffTable(staff);
        } else {
            console.error('Error loading staff:', result);
            let errorMessage = result.message || 'Unknown error';
            if (response.status === 403) {
                errorMessage = 'Access denied. You need to log out and log back in to refresh your permissions.';
            }
            document.getElementById('staffTableContent').innerHTML = 
                '<div class="empty-state"><h3>Error loading staff</h3><p>' + escapeHtml(errorMessage) + '</p><p>Check browser console (F12) for details.</p></div>';
        }
    } catch (error) {
        console.error('Error loading staff:', error);
        document.getElementById('staffTableContent').innerHTML = 
            '<div class="empty-state"><h3>Error loading staff</h3><p>Please check the browser console (F12) for details and try again.</p></div>';
    }
}

function renderStaffTable(staffToRender) {
    if (staffToRender.length === 0) {
        document.getElementById('staffTableContent').innerHTML = 
            '<div class="empty-state"><h3>No staff members found</h3><p>Click "Add Staff Member" to add a new staff member.</p></div>';
        return;
    }
    
    const table = document.createElement('table');
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Username</th>
            <th>Full Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    staffToRender.forEach(member => {
        const row = document.createElement('tr');
        const isCurrentUser = currentUser && currentUser.staffId === member.id;
        row.innerHTML = `
            <td>${escapeHtml(member.username)}${isCurrentUser ? ' <small>(You)</small>' : ''}</td>
            <td>${escapeHtml(member.fullName || 'N/A')}</td>
            <td><span class="status-badge ${member.role === 'master_admin' ? 'status-matched' : 'status-interviewing'}">${member.role === 'master_admin' ? 'Master Admin' : 'Staff'}</span></td>
            <td><span class="status-badge ${member.isActive ? 'status-employed' : 'status-inactive'}">${member.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>${new Date(member.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-primary" onclick="editStaff(${member.id})">Edit</button>
                    ${!isCurrentUser ? `<button class="btn-small btn-danger" onclick="deleteStaff(${member.id})">Delete</button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.appendChild(table);
    
    document.getElementById('staffTableContent').innerHTML = '';
    document.getElementById('staffTableContent').appendChild(wrapper);
}

function showAddStaffModal() {
    document.getElementById('staffId').value = '';
    document.getElementById('staffForm').reset();
    document.getElementById('staffUsername').disabled = false;
    document.getElementById('staffPassword').required = true;
    document.getElementById('staffPasswordLabel').textContent = 'Password *';
    document.getElementById('staffPasswordHint').style.display = 'none';
    document.getElementById('staffModalTitle').textContent = 'Add Staff Member';
    document.getElementById('staffModal').style.display = 'block';
}

function editStaff(id) {
    const member = staff.find(s => s.id === id);
    if (!member) return;
    
    document.getElementById('staffId').value = member.id;
    document.getElementById('staffUsername').value = member.username;
    document.getElementById('staffUsername').disabled = true; // Can't change username
    document.getElementById('staffPassword').value = '';
    document.getElementById('staffPassword').required = false; // Optional when editing
    document.getElementById('staffPasswordLabel').textContent = 'Password (leave blank to keep current)';
    document.getElementById('staffPasswordHint').style.display = 'block';
    document.getElementById('staffFullName').value = member.fullName || '';
    document.getElementById('staffIsActive').checked = member.isActive !== false;
    
    document.getElementById('staffModalTitle').textContent = 'Edit Staff Member';
    document.getElementById('staffModal').style.display = 'block';
}

function closeStaffModal() {
    document.getElementById('staffModal').style.display = 'none';
    document.getElementById('staffUsername').disabled = false;
    document.getElementById('staffPassword').required = true;
    document.getElementById('staffPasswordLabel').textContent = 'Password *';
    document.getElementById('staffPasswordHint').style.display = 'none';
}

async function handleStaffSubmit(e) {
    e.preventDefault();
    
    const staffId = document.getElementById('staffId').value;
    const username = document.getElementById('staffUsername').value.trim();
    const password = document.getElementById('staffPassword').value;
    const fullName = document.getElementById('staffFullName').value.trim();
    const isActive = document.getElementById('staffIsActive').checked;
    
    if (!username) {
        alert('Username is required');
        return;
    }
    
    if (!staffId && !password) {
        alert('Password is required when creating a new staff member');
        return;
    }
    
    try {
        if (staffId) {
            // Update existing staff
            const updateData = {
                fullName: fullName || null,
                isActive: isActive
            };
            
            if (password) {
                updateData.password = password;
            }
            
            const response = await fetch(`/api/admin/staff/${staffId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            
            const result = await response.json();
            if (result.success) {
                alert('Staff member updated successfully');
                closeStaffModal();
                loadStaff();
            } else {
                alert('Error updating staff: ' + result.message);
            }
        } else {
            // Add new staff
            const response = await fetch('/api/admin/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    fullName: fullName || null
                })
            });
            
            const result = await response.json();
            if (result.success) {
                // Show credentials to admin so they can share with the new staff member
                const credentialsMessage = `Staff member added successfully!\n\n` +
                    `Username: ${username}\n` +
                    `Password: ${password}\n\n` +
                    `Please save these credentials and share them with the new staff member.`;
                alert(credentialsMessage);
                closeStaffModal();
                loadStaff();
            } else {
                alert('Error adding staff: ' + result.message);
            }
        }
    } catch (error) {
        console.error('Error saving staff:', error);
        alert('Error saving staff member');
    }
}

async function deleteStaff(id) {
    // Prevent deleting yourself
    if (currentUser && currentUser.staffId === id) {
        alert('You cannot delete your own account');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/staff/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Staff member deleted successfully');
            loadStaff();
        } else {
            alert('Error deleting staff: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting staff:', error);
        alert('Error deleting staff member');
    }
}

// ========== UTILITY ==========

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function logout() {
    try {
        const response = await fetch('/api/admin/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            alert('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login';
    }
}

