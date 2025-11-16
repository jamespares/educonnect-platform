// Admin page functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication via session
    try {
        const response = await fetch('/api/admin/check-auth', {
            credentials: 'include' // Include cookies for session
        });
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/login.html';
            return;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
        return;
    }
    
    // Sample data for demonstration (in production, fetch from API)
    const sampleTeachers = [
        {
            id: 1,
            firstName: 'Sarah',
            lastName: 'Johnson',
            email: 'sarah.johnson@email.com',
            nationality: 'British',
            yearsExperience: '5-7 years',
            subjectSpecialty: 'Mathematics',
            status: 'pending',
            submittedAt: '2024-09-06T10:30:00Z'
        },
        {
            id: 2,
            firstName: 'Michael',
            lastName: 'Chen',
            email: 'michael.chen@email.com',
            nationality: 'Canadian',
            yearsExperience: '8-10 years',
            subjectSpecialty: 'Science',
            status: 'approved',
            submittedAt: '2024-09-05T14:15:00Z'
        },
        {
            id: 3,
            firstName: 'Emma',
            lastName: 'Thompson',
            email: 'emma.thompson@email.com',
            nationality: 'Australian',
            yearsExperience: '3-5 years',
            subjectSpecialty: 'English',
            status: 'pending',
            submittedAt: '2024-09-04T09:45:00Z'
        }
    ];
    
    // Update stats
    updateStats(sampleTeachers);
    
    // Load teachers table
    loadTeachersTable(sampleTeachers);
    
    // Setup logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                try {
                    await fetch('/api/admin/logout', {
                        method: 'POST',
                        credentials: 'include'
                    });
                } catch (error) {
                    console.error('Logout error:', error);
                }
                window.location.href = '/login.html';
            }
        });
    }
});

function updateStats(teachers) {
    const totalApplications = teachers.length;
    const pendingApplications = teachers.filter(t => t.status === 'pending').length;
    const approvedApplications = teachers.filter(t => t.status === 'approved').length;
    const rejectedApplications = teachers.filter(t => t.status === 'rejected').length;
    
    document.getElementById('totalApplications').textContent = totalApplications;
    document.getElementById('pendingApplications').textContent = pendingApplications;
    document.getElementById('approvedApplications').textContent = approvedApplications;
    document.getElementById('rejectedApplications').textContent = rejectedApplications;
}

function loadTeachersTable(teachers) {
    const tbody = document.getElementById('teachersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    teachers.forEach(teacher => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${teacher.firstName} ${teacher.lastName}</div>
                <div class="text-sm text-gray-500">${teacher.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${teacher.nationality}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${teacher.yearsExperience}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${teacher.subjectSpecialty}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="status-badge status-${teacher.status}">${teacher.status}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatDate(teacher.submittedAt)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button onclick="viewTeacher(${teacher.id})" class="btn-view">View</button>
                    <button onclick="approveTeacher(${teacher.id})" class="btn-approve">Approve</button>
                    <button onclick="rejectTeacher(${teacher.id})" class="btn-reject">Reject</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function viewTeacher(id) {
    alert(`Viewing teacher details for ID: ${id}`);
    // In production, open a modal or navigate to detail page
}

function approveTeacher(id) {
    if (confirm('Approve this teacher application?')) {
        updateTeacherStatus(id, 'approved');
    }
}

function rejectTeacher(id) {
    if (confirm('Reject this teacher application?')) {
        updateTeacherStatus(id, 'rejected');
    }
}

function updateTeacherStatus(id, status) {
    // In production, make API call to update status
    alert(`Teacher ${id} status updated to: ${status}`);
    
    // Simulate update by reloading (in production, update the table dynamically)
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// Search functionality
function searchTeachers() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.toLowerCase();
    const rows = document.querySelectorAll('#teachersTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Filter by status
function filterByStatus(status) {
    const rows = document.querySelectorAll('#teachersTableBody tr');
    
    rows.forEach(row => {
        if (status === 'all') {
            row.style.display = '';
        } else {
            const statusElement = row.querySelector('.status-badge');
            if (statusElement && statusElement.textContent.trim() === status) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}