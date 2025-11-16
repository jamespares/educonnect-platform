require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');
const SupabaseDatabase = require('./supabase-database');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (needed for Cloudflare and Railway to correctly detect HTTPS)
app.set('trust proxy', true);

// Health check endpoint (must be first, before any middleware)
// This allows Railway/deployment healthchecks to work even if other parts fail
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: process.env.SUPABASE_URL ? 'configured' : 'not configured'
    });
});

// Initialize Supabase database
let db;
try {
    db = new SupabaseDatabase();
    console.log('🔍 Database Configuration:');
    console.log('  - Database Type: Supabase');
    console.log('  - Supabase URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Not set');
} catch (error) {
    console.error('❌ Failed to initialize Supabase:', error.message);
    console.error('   Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in environment variables');
    process.exit(1);
}

// Helper function to sanitize HTML input
function sanitizeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// Admin credentials - password will be hashed
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
// Hash the default password if no env var is set (for development only)
// In production, set ADMIN_PASSWORD_HASH in environment variables
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'password', 10);

// Redirect www to non-www (or vice versa)
// This middleware handles Cloudflare proxy headers correctly
// With 'trust proxy' enabled, Express automatically reads X-Forwarded-* headers
app.use((req, res, next) => {
    // Get host from forwarded header (Cloudflare) or direct host header
    // With trust proxy enabled, req.get('host') already reads from X-Forwarded-Host
    const host = req.get('host') || req.get('x-forwarded-host');
    
    // Check if host starts with www. and redirect to non-www version
    if (host && host.startsWith('www.')) {
        const nonWwwHost = host.replace(/^www\./, '');
        // Force HTTPS in production (Cloudflare always uses HTTPS)
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
        const redirectUrl = `${protocol}://${nonWwwHost}${req.originalUrl}`;
        
        return res.redirect(301, redirectUrl);
    }
    next();
});

// Security middleware
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'educonnect-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax'
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Configure multer for in-memory file uploads (we'll upload to Supabase Storage)
// Handle both video and image files
const upload = multer({
    storage: multer.memoryStorage(), // Store in memory temporarily
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit (max for videos, photos will be validated separately)
    },
    fileFilter: (req, file, cb) => {
        // Allow video files for introVideo
        if (file.fieldname === 'introVideo' && file.mimetype.startsWith('video/')) {
            cb(null, true);
        }
        // Allow image files for headshotPhoto
        else if (file.fieldname === 'headshotPhoto' && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type for ${file.fieldname}. Videos allowed for introVideo, images for headshotPhoto.`), false);
        }
    }
}).fields([
    { name: 'introVideo', maxCount: 1 },
    { name: 'headshotPhoto', maxCount: 1 }
]);

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 100MB for videos and 10MB for photos.'
            });
        }
        return res.status(400).json({
            success: false,
            message: 'File upload error: ' + err.message
        });
    }
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload error'
        });
    }
    next();
};

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Check authentication status API endpoint
app.get('/api/admin/check-auth', (req, res) => {
    res.json({
        authenticated: !!(req.session && req.session.authenticated)
    });
});

// Debug endpoint to check headers and host detection (admin only for security)
app.get('/api/debug/headers', requireAuth, (req, res) => {
    res.json({
        host: req.get('host'),
        xForwardedHost: req.get('x-forwarded-host'),
        xForwardedProto: req.get('x-forwarded-proto'),
        protocol: req.protocol,
        originalUrl: req.originalUrl,
        url: req.url,
        headers: {
            host: req.headers.host,
            'x-forwarded-host': req.headers['x-forwarded-host'],
            'x-forwarded-proto': req.headers['x-forwarded-proto'],
            'cf-ray': req.headers['cf-ray'],
            'cf-visitor': req.headers['cf-visitor'],
            'x-forwarded-for': req.headers['x-forwarded-for']
        },
        isWww: req.get('host')?.startsWith('www.') || req.get('x-forwarded-host')?.startsWith('www.')
    });
});

// API Routes
app.post('/api/submit-application', upload, handleMulterError, async (req, res) => {
    try {
        // Basic validation
        if (!req.body.firstName || req.body.firstName.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'First name must be at least 2 characters' });
        }
        if (!req.body.lastName || req.body.lastName.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Last name must be at least 2 characters' });
        }
        if (!req.body.email || !req.body.email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Valid email is required' });
        }
        if (!req.body.preferredAgeGroup || req.body.preferredAgeGroup.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Preferred age group is required' });
        }

        // Validate media requirement: must have video OR photo OR LinkedIn OR Instagram
        const videoFile = req.files && req.files['introVideo'] ? req.files['introVideo'][0] : null;
        const photoFile = req.files && req.files['headshotPhoto'] ? req.files['headshotPhoto'][0] : null;
        const linkedin = req.body.linkedin ? req.body.linkedin.trim() : '';
        const instagram = req.body.instagram ? req.body.instagram.trim() : '';
        
        const hasMedia = videoFile || photoFile || linkedin || instagram;
        if (!hasMedia) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide at least one of the following: Introduction Video, Headshot Photo, LinkedIn Profile, or Instagram Username.' 
            });
        }

        // Upload video to Supabase Storage if provided
        let videoPath = null;
        if (videoFile) {
            try {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const fileName = `introVideo-${uniqueSuffix}${path.extname(videoFile.originalname)}`;
                
                const uploadResult = await db.uploadVideo(videoFile, fileName);
                videoPath = uploadResult.path; // Store the path, not the full URL
                console.log('✅ Video uploaded to Supabase Storage:', uploadResult.path);
            } catch (uploadError) {
                console.error('Error uploading video to Supabase:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading video: ' + uploadError.message
                });
            }
        }

        // Upload photo to Supabase Storage if provided
        let photoPath = null;
        if (photoFile) {
            // Validate photo file size (10MB limit for photos)
            const maxPhotoSize = 10 * 1024 * 1024; // 10MB
            if (photoFile.size > maxPhotoSize) {
                return res.status(400).json({
                    success: false,
                    message: 'Photo file is too large. Maximum size is 10MB.'
                });
            }
            
            try {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const fileName = `headshot-${uniqueSuffix}${path.extname(photoFile.originalname)}`;
                
                const uploadResult = await db.uploadPhoto(photoFile, fileName);
                photoPath = uploadResult.path; // Store the path, not the full URL
                console.log('✅ Photo uploaded to Supabase Storage:', uploadResult.path);
            } catch (uploadError) {
                console.error('Error uploading photo to Supabase:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading photo: ' + uploadError.message
                });
            }
        }

        const teacherData = {
            firstName: req.body.firstName.trim(),
            lastName: req.body.lastName.trim(),
            email: req.body.email.trim().toLowerCase(),
            phone: req.body.phone.trim(),
            nationality: req.body.nationality,
            yearsExperience: req.body.yearsExperience,
            education: req.body.education.trim(),
            teachingExperience: req.body.teachingExperience.trim(),
            subjectSpecialty: req.body.subjectSpecialty.trim(),
            preferredLocation: req.body.preferredLocation ? req.body.preferredLocation.trim() : null,
            preferred_age_group: req.body.preferredAgeGroup ? req.body.preferredAgeGroup.trim() : null,
            introVideoPath: videoPath,
            headshotPhotoPath: photoPath,
            linkedin: linkedin || null,
            instagram: instagram || null,
            wechatId: req.body.wechatId ? req.body.wechatId.trim() : null,
            professionalExperience: req.body.professionalExperience ? req.body.professionalExperience.trim() : null,
            additionalInfo: req.body.additionalInfo ? req.body.additionalInfo.trim() : null
        };

        const result = await db.addTeacher(teacherData);

        // Send email notification for new application
        try {
            await resend.emails.send({
                from: 'EduConnect <team@educonnectchina.com>',
                to: [process.env.EMAIL_TO || 'team@educonnectchina.com'],
                subject: `New Teacher Application: ${sanitizeHtml(teacherData.firstName)} ${sanitizeHtml(teacherData.lastName)}`,
                html: `
                    <h2>New Teacher Application Received</h2>
                    <p><strong>Name:</strong> ${sanitizeHtml(teacherData.firstName)} ${sanitizeHtml(teacherData.lastName)}</p>
                    <p><strong>Email:</strong> ${sanitizeHtml(teacherData.email)}</p>
                    <p><strong>Phone:</strong> ${sanitizeHtml(teacherData.phone)}</p>
                    <p><strong>Nationality:</strong> ${sanitizeHtml(teacherData.nationality)}</p>
                    <p><strong>Experience:</strong> ${sanitizeHtml(teacherData.yearsExperience)}</p>
                    <p><strong>Subject:</strong> ${sanitizeHtml(teacherData.subjectSpecialty)}</p>
                    <p><strong>Preferred Location:</strong> ${teacherData.preferredLocation ? sanitizeHtml(teacherData.preferredLocation) : 'No preference'}</p>
                    <p><strong>Preferred Age Group:</strong> ${teacherData.preferred_age_group ? sanitizeHtml(teacherData.preferred_age_group) : 'Not specified'}</p>

                    <h3>Education Background:</h3>
                    <p>${sanitizeHtml(teacherData.education)}</p>

                    <h3>Teaching Experience:</h3>
                    <p>${sanitizeHtml(teacherData.teachingExperience)}</p>

                    ${teacherData.professionalExperience ? `<h3>Professional Experience & Fit:</h3><p>${sanitizeHtml(teacherData.professionalExperience)}</p>` : ''}

                    ${teacherData.additionalInfo ? `<h3>Additional Information:</h3><p>${sanitizeHtml(teacherData.additionalInfo)}</p>` : ''}

                    <h3>Media & Social Profiles:</h3>
                    <p><strong>Video:</strong> ${teacherData.introVideoPath ? 'Uploaded' : 'Not provided'}</p>
                    <p><strong>Headshot Photo:</strong> ${teacherData.headshotPhotoPath ? 'Uploaded' : 'Not provided'}</p>
                    <p><strong>LinkedIn:</strong> ${teacherData.linkedin ? `<a href="${sanitizeHtml(teacherData.linkedin)}">${sanitizeHtml(teacherData.linkedin)}</a>` : 'Not provided'}</p>
                    <p><strong>Instagram:</strong> ${teacherData.instagram ? sanitizeHtml(teacherData.instagram) : 'Not provided'}</p>
                    <p><strong>WeChat ID:</strong> ${teacherData.wechatId ? sanitizeHtml(teacherData.wechatId) : 'Not provided'}</p>

                    <p><em>View full details in the admin dashboard.</em></p>
                `
            });
        } catch (emailError) {
            console.error('Error sending application notification email:', emailError);
            // Don't fail the application if email fails
        }
        
        res.json({
            success: true,
            message: 'Application submitted successfully!',
            data: result
        });
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting application: ' + error.message
        });
    }
});

// Authentication API routes
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Check username and compare hashed password
        const usernameMatch = username === ADMIN_USERNAME;
        const passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

        if (usernameMatch && passwordMatch) {
            req.session.authenticated = true;
            req.session.username = username;

            console.log('Login successful for:', username);

            res.json({
                success: true,
                message: 'Login successful'
            });
        } else {
            console.log('Login failed for username:', username);

            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed: ' + error.message
        });
    }
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        } else {
            res.json({
                success: true,
                message: 'Logout successful'
            });
        }
    });
});

// Contact form route
app.post('/send-message', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Basic validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Send email
        await resend.emails.send({
            from: 'EduConnect <team@educonnectchina.com>',
            to: [process.env.EMAIL_TO || 'team@educonnectchina.com'],
            replyTo: email,
            subject: `EduConnect Contact: ${sanitizeHtml(subject)}`,
            html: `
                <h2>New Contact Form Message</h2>
                <p><strong>From:</strong> ${sanitizeHtml(name)}</p>
                <p><strong>Email:</strong> ${sanitizeHtml(email)}</p>
                <p><strong>Subject:</strong> ${sanitizeHtml(subject)}</p>
                <p><strong>Message:</strong></p>
                <p>${sanitizeHtml(message).replace(/\n/g, '<br>')}</p>
                <hr>
                <p><small>This message was sent via the EduConnect contact form.</small></p>
            `
        });

        // Return JSON response instead of redirect for AJAX requests
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            res.json({ success: true, message: 'Message sent successfully' });
        } else {
            res.redirect('/contact.html?success=true');
        }
    } catch (error) {
        console.error('Error sending email:', error);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            res.status(500).json({ success: false, message: 'Failed to send message' });
        } else {
            res.redirect('/contact.html?error=true');
        }
    }
});

// Job listings API (public)
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await db.getAllJobs(true); // Only active jobs
        res.json({
            success: true,
            data: jobs
        });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching jobs: ' + error.message
        });
    }
});

// Get specific job (public)
app.get('/api/jobs/:id', async (req, res) => {
    try {
        const job = await db.getJobById(req.params.id);
        if (job && job.isActive) {
            res.json({
                success: true,
                data: job
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Job not found or inactive'
            });
        }
    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching job: ' + error.message
        });
    }
});

// Submit job interest
app.post('/api/job-interest', async (req, res) => {
    try {
        const interestData = {
            firstName: req.body.firstName?.trim(),
            lastName: req.body.lastName?.trim(),
            email: req.body.email?.trim(),
            phone: req.body.phone?.trim(),
            preferredLocation: req.body.preferredLocation?.trim(),
            teachingSubject: req.body.teachingSubject?.trim(),
            experience: req.body.experience?.trim(),
            message: req.body.message?.trim()
        };

        // Basic validation
        if (!interestData.firstName || !interestData.lastName || !interestData.email || 
            !interestData.teachingSubject || !interestData.experience) {
            return res.status(400).json({
                success: false,
                message: 'Required fields are missing'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(interestData.email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        const result = await db.addJobInterest(interestData);

        // Send email notification
        try {
            await resend.emails.send({
                from: 'EduConnect <team@educonnectchina.com>',
                to: [process.env.EMAIL_TO || 'team@educonnectchina.com'],
                subject: `New Job Interest: ${sanitizeHtml(interestData.firstName)} ${sanitizeHtml(interestData.lastName)}`,
                html: `
                    <h2>New Job Interest Received</h2>
                    <p><strong>Name:</strong> ${sanitizeHtml(interestData.firstName)} ${sanitizeHtml(interestData.lastName)}</p>
                    <p><strong>Email:</strong> ${sanitizeHtml(interestData.email)}</p>
                    <p><strong>Phone:</strong> ${interestData.phone ? sanitizeHtml(interestData.phone) : 'Not provided'}</p>
                    <p><strong>Teaching Subject:</strong> ${sanitizeHtml(interestData.teachingSubject)}</p>
                    <p><strong>Experience:</strong> ${sanitizeHtml(interestData.experience)}</p>
                    <p><strong>Preferred Location:</strong> ${interestData.preferredLocation ? sanitizeHtml(interestData.preferredLocation) : 'No preference'}</p>

                    ${interestData.message ? `<h3>Message:</h3><p>${sanitizeHtml(interestData.message)}</p>` : ''}

                    <p><em>View full details in the admin dashboard.</em></p>
                `
            });
        } catch (emailError) {
            console.error('Error sending job interest notification email:', emailError);
        }
        
        res.json({
            success: true,
            message: 'Interest submitted successfully'
        });
        
    } catch (error) {
        console.error('Error submitting job interest:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting interest: ' + error.message
        });
    }
});

app.get('/api/teachers', requireAuth, async (req, res) => {
    try {
        const teachers = await db.getAllTeachers();
        res.json({
            success: true,
            data: teachers
        });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching teachers: ' + error.message
        });
    }
});

app.get('/api/teachers/:id', requireAuth, async (req, res) => {
    try {
        const teacher = await db.getTeacherById(req.params.id);
        if (teacher) {
            res.json({
                success: true,
                data: teacher
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }
    } catch (error) {
        console.error('Error fetching teacher:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching teacher: ' + error.message
        });
    }
});

app.put('/api/teachers/:id/status', requireAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const result = await db.updateTeacherStatus(req.params.id, status);
        res.json({
            success: true,
            message: 'Teacher status updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating teacher status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating teacher status: ' + error.message
        });
    }
});

app.delete('/api/teachers/:id', requireAuth, async (req, res) => {
    try {
        const result = await db.deleteTeacher(req.params.id);
        res.json({
            success: true,
            message: 'Teacher deleted successfully',
            data: result
        });
    } catch (error) {
        console.error('Error deleting teacher:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting teacher: ' + error.message
        });
    }
});

// Serve video files from Supabase Storage
app.get('/api/videos/:path(*)', async (req, res) => {
    try {
        const videoPath = req.params.path;
        const videoUrl = await db.getVideoUrl(videoPath);
        res.redirect(videoUrl);
    } catch (error) {
        console.error('Error getting video URL:', error);
        res.status(404).json({
            success: false,
            message: 'Video not found'
        });
    }
});

// Serve photo files from Supabase Storage
app.get('/api/photos/:path(*)', async (req, res) => {
    try {
        const photoPath = req.params.path;
        const photoUrl = await db.getPhotoUrl(photoPath);
        res.redirect(photoUrl);
    } catch (error) {
        console.error('Error getting photo URL:', error);
        res.status(404).json({
            success: false,
            message: 'Photo not found'
        });
    }
});
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
read_file

// Diagnostic endpoint to check environment and database status
app.get('/api/debug/status', requireAuth, async (req, res) => {
    try {
        const status = {
            environment: process.env.NODE_ENV || 'development',
            database: {
                type: 'Supabase',
                supabaseUrl: process.env.SUPABASE_URL ? '***configured***' : 'not set',
                storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'intro-videos',
            },
            timestamp: new Date().toISOString()
        };

        // Try to get teacher count
        try {
            const teachers = await db.getAllTeachers();
            status.database.teacherCount = teachers.length;
            status.database.connectionStatus = 'connected';
        } catch (dbError) {
            status.database.connectionStatus = 'error';
            status.database.error = dbError.message;
        }

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting status: ' + error.message
        });
    }
});

// Error handling middleware (catches any unhandled errors)
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 100MB for videos and 10MB for photos.'
            });
        }
        return res.status(400).json({
            success: false,
            message: 'File upload error: ' + error.message
        });
    }
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ EduConnect server running on port ${PORT}`);
    console.log(`   Health check available at: http://localhost:${PORT}/health`);
    console.log(`   Visit http://localhost:${PORT} to view the website`);
}).on('error', (err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    db.close();
    process.exit(0);
});