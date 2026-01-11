// Signup Modal Functionality
// Handles opening/closing the signup modal and form submission

let signupModal = null;
let signupForm = null;

// Initialize modal when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    signupModal = document.getElementById('signupModal');
    signupForm = document.getElementById('signupModalForm');
    
    if (!signupModal || !signupForm) return;
    
    // Close modal handlers
    const closeBtn = signupModal.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSignupModal);
    }
    
    // Close on overlay click
    signupModal.addEventListener('click', function(e) {
        if (e.target === signupModal) {
            closeSignupModal();
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && signupModal.classList.contains('active')) {
            closeSignupModal();
        }
    });
    
    // File upload handlers
    const cvFileInput = signupForm.querySelector('#modalCvFile');
    const cvUploadArea = signupForm.querySelector('#modalCvUploadArea');
    const cvUploadText = signupForm.querySelector('#modalCvUploadText');
    
    if (cvFileInput && cvUploadArea && cvUploadText) {
        cvFileInput.addEventListener('change', function(e) {
            handleFileSelect(e.target.files[0], cvUploadText);
        });
        
        // Drag and drop handlers
        cvUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            cvUploadArea.classList.add('dragover');
        });
        
        cvUploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            cvUploadArea.classList.remove('dragover');
        });
        
        cvUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            cvUploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                cvFileInput.files = files;
                handleFileSelect(files[0], cvUploadText);
            }
        });
        
        cvUploadArea.addEventListener('click', function() {
            cvFileInput.click();
        });
    }
    
    // Form validation
    const formInputs = signupForm.querySelectorAll('input, select');
    formInputs.forEach(input => {
        input.addEventListener('input', validateModalForm);
        input.addEventListener('change', validateModalForm);
    });
    
    // Form submission
    signupForm.addEventListener('submit', handleModalFormSubmit);
    
    // Initial validation
    validateModalForm();
});

// Open signup modal
function openSignupModal() {
    if (!signupModal) {
        signupModal = document.getElementById('signupModal');
    }
    if (signupModal) {
        signupModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        // Focus first input
        const firstInput = signupModal.querySelector('input[type="text"], input[type="email"]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

// Close signup modal
function closeSignupModal() {
    if (!signupModal) {
        signupModal = document.getElementById('signupModal');
    }
    if (signupModal) {
        signupModal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Handle file selection
function handleFileSelect(file, uploadText) {
    if (!file || !uploadText) return;
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        alert('File is too large. Please upload a file smaller than 10MB.');
        uploadText.innerHTML = `
            <strong>📄 Drop your CV here or click to browse</strong>
            <span>We'll extract all the details automatically</span><br>
            <small>PDF, Word, or Image (JPG, PNG) - Max 10MB</small>
        `;
        return;
    }
    uploadText.innerHTML = `<span class="modal-file-selected">✓ ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</span>`;
    validateModalForm();
}

// Validate modal form
function validateModalForm() {
    if (!signupForm) return;
    
    const name = signupForm.querySelector('#modalName')?.value.trim();
    const email = signupForm.querySelector('#modalEmail')?.value.trim();
    const cvFile = signupForm.querySelector('#modalCvFile')?.files.length > 0;
    const cities = signupForm.querySelector('#modalPreferredCities')?.selectedOptions.length > 0;
    const ageGroup = signupForm.querySelector('#modalPreferredAgeGroup')?.value;
    const subject = signupForm.querySelector('#modalSubjectSpecialty')?.value;
    
    const submitButton = signupForm.querySelector('.modal-submit-button');
    if (submitButton) {
        submitButton.disabled = !(name && email && cvFile && cities && ageGroup && subject);
    }
}

// Handle modal form submission
async function handleModalFormSubmit(e) {
    e.preventDefault();
    
    if (!signupForm) return;
    
    const name = signupForm.querySelector('#modalName')?.value.trim();
    const email = signupForm.querySelector('#modalEmail')?.value.trim();
    const linkedin = signupForm.querySelector('#modalLinkedin')?.value.trim();
    const cvFile = signupForm.querySelector('#modalCvFile')?.files[0];
    const preferredCities = Array.from(signupForm.querySelector('#modalPreferredCities')?.selectedOptions || [])
        .map(option => option.value);
    const preferredAgeGroup = signupForm.querySelector('#modalPreferredAgeGroup')?.value;
    const subjectSpecialty = signupForm.querySelector('#modalSubjectSpecialty')?.value;
    
    // Validation
    if (!name || name.length < 2) {
        alert('Please enter your full name');
        return;
    }
    
    if (!email) {
        alert('Please enter your email address');
        return;
    }
    
    if (!cvFile) {
        alert('Please upload your CV');
        return;
    }
    
    if (preferredCities.length === 0) {
        alert('Please select at least one preferred city');
        return;
    }
    
    if (!preferredAgeGroup) {
        alert('Please select your preferred age group');
        return;
    }
    
    if (!subjectSpecialty) {
        alert('Please select the subject you teach');
        return;
    }
    
    // Show loading state
    const submitButton = signupForm.querySelector('.modal-submit-button');
    const originalText = submitButton?.textContent;
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
    }
    
    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('preferredCities', JSON.stringify(preferredCities));
        formData.append('preferredAgeGroup', preferredAgeGroup);
        formData.append('subjectSpecialty', subjectSpecialty);
        formData.append('cvFile', cvFile);
        
        if (linkedin) {
            formData.append('linkedin', linkedin);
        }
        
        const response = await fetch('/api/submit-application-simple', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Track successful application submission
            if (typeof umami !== 'undefined') {
                umami.track('application_submitted', {
                    subject: subjectSpecialty,
                    ageGroup: preferredAgeGroup,
                    location: preferredCities.join(',')
                });
            }
            
            // Show success message
            alert(`Thank you ${name}! We've received your application and will review it soon. We'll contact you at ${email} with exciting opportunities!`);
            
            // Reset form and close modal
            signupForm.reset();
            const cvUploadText = signupForm.querySelector('#modalCvUploadText');
            if (cvUploadText) {
                cvUploadText.innerHTML = `
                    <strong>📄 Drop your CV here or click to browse</strong>
                    <span>We'll extract all the details automatically</span><br>
                    <small>PDF, Word, or Image (JPG, PNG) - Max 10MB</small>
                `;
            }
            closeSignupModal();
            validateModalForm();
        } else {
            throw new Error(result.message || 'Failed to submit application');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Oops! Something went wrong: ' + error.message + '\n\nPlease try again or contact us if the problem persists.');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalText || 'Submit Application';
        }
        validateModalForm();
    }
}
