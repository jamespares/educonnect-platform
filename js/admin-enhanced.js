// Enhanced Admin Dashboard JavaScript

let teachers = [];
let schools = [];
let matches = [];
let staff = [];
let currentUser = null;
let currentSort = { column: null, direction: 'asc' };

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check user role and show/hide staff tab
    await checkUserRole();
    
    loadTeachers();
    loadSchools();
    loadMatches();
    
    // Setup modal close handlers
    setupModals();
    
    // Setup form handlers
    document.getElementById('schoolForm').addEventListener('submit', handleSchoolSubmit);
    document.getElementById('staffForm').addEventListener('submit', handleStaffSubmit);
});

// Check user role and show staff management tab if master admin
async function checkUserRole() {
    try {
        const response = await fetch('/api/admin/me');
        const result = await response.json();
        
        if (result.success) {
            currentUser = result.data;
            
            // Show staff management tab only for master_admin
            if (currentUser.role === 'master_admin') {
                document.getElementById('staffTab').style.display = 'block';
                loadStaff();
            }
        }
    } catch (error) {
        console.error('Error checking user role:', error);
    }
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Load data for the tab
    if (tabName === 'teachers') {
        loadTeachers();
    } else if (tabName === 'schools') {
        loadSchools();
    } else if (tabName === 'matches') {
        loadMatches();
    } else if (tabName === 'staff') {
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
            <th>Actions</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    teachersToRender.forEach(teacher => {
        const row = document.createElement('tr');
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
            
            modalBody.innerHTML = `
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

async function viewMatches(teacherId) {
    try {
        const response = await fetch(`/api/matching/teacher/${teacherId}`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            const matches = result.data;
            let matchesHtml = '<h3>Matching Schools:</h3><ul>';
            matches.forEach(match => {
                matchesHtml += `<li><strong>${escapeHtml(match.school.name)}</strong> - Score: ${match.score}%<br>`;
                matchesHtml += `<small>${match.reasons.join(', ')}</small></li>`;
            });
            matchesHtml += '</ul>';
            alert(matchesHtml.replace(/<[^>]*>/g, '')); // Simple alert, could be improved with modal
        } else {
            alert('No matches found for this teacher');
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
    if (!confirm('This will run matching for all teachers. This may take a while. Continue?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/matching/run-for-all', {
            method: 'POST'
        });
        
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            loadTeachers();
            loadMatches();
        } else {
            alert('Error running matching: ' + result.message);
        }
    } catch (error) {
        console.error('Error running matching:', error);
        alert('Error running matching');
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
            <th>Age Groups</th>
            <th>Subjects</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    schoolsToRender.forEach(school => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(school.name)}</td>
            <td>${escapeHtml(school.location)}</td>
            <td>${escapeHtml(school.city || '')}</td>
            <td>${escapeHtml(school.schoolType || '')}</td>
            <td>${(school.ageGroups || []).join(', ')}</td>
            <td>${(school.subjectsNeeded || []).join(', ')}</td>
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

// ========== MATCHES ==========

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
    try {
        const response = await fetch('/api/admin/staff');
        const result = await response.json();
        
        if (result.success) {
            staff = result.data;
            renderStaffTable(staff);
        } else {
            document.getElementById('staffTableContent').innerHTML = 
                '<div class="empty-state">Error loading staff: ' + result.message + '</div>';
        }
    } catch (error) {
        console.error('Error loading staff:', error);
        document.getElementById('staffTableContent').innerHTML = 
            '<div class="empty-state">Error loading staff. Please try again.</div>';
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
                alert('Staff member added successfully');
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

