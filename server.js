require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');
const Database = require('./database');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database();

// Log database configuration
const mysqlConfigured = process.env.MYSQL_HOST || process.env.MYSQLHOST;
console.log('🔍 Database Configuration:');
console.log('  - MYSQL_HOST:', mysqlConfigured ? '✓ Set' : '✗ Not set (using SQLite)');
console.log('  - Database Type:', mysqlConfigured ? 'MySQL' : 'SQLite');
if (mysqlConfigured) {
    console.log('  - MySQL Database:', process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'not specified');
    console.log('  - MySQL Host:', process.env.MYSQL_HOST || process.env.MYSQLHOST);
}

// Admin credentials - store plain password for comparison
const ADMIN_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'password'
};

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

// Use Railway volume if available, otherwise use local uploads directory
const uploadsDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
    : path.join(__dirname, 'uploads');

console.log('📁 Uploads directory:', uploadsDir);

app.use('/uploads', express.static(uploadsDir));

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed!'), false);
        }
    }
});

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

// API Routes
app.post('/api/submit-application', upload.single('introVideo'), async (req, res) => {
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
            introVideoPath: req.file ? req.file.filename : null,
            additionalInfo: req.body.additionalInfo ? req.body.additionalInfo.trim() : null
        };

        const result = await db.addTeacher(teacherData);

        // Send email notification for new application
        try {
            await resend.emails.send({
                from: 'EduConnect <team@educonnectchina.com>',
                to: [process.env.EMAIL_TO || 'team@educonnectchina.com'],
                subject: `New Teacher Application: ${teacherData.firstName} ${teacherData.lastName}`,
                html: `
                    <h2>New Teacher Application Received</h2>
                    <p><strong>Name:</strong> ${teacherData.firstName} ${teacherData.lastName}</p>
                    <p><strong>Email:</strong> ${teacherData.email}</p>
                    <p><strong>Phone:</strong> ${teacherData.phone}</p>
                    <p><strong>Nationality:</strong> ${teacherData.nationality}</p>
                    <p><strong>Experience:</strong> ${teacherData.yearsExperience}</p>
                    <p><strong>Subject:</strong> ${teacherData.subjectSpecialty}</p>
                    <p><strong>Preferred Location:</strong> ${teacherData.preferredLocation || 'No preference'}</p>
                    <p><strong>Preferred Age Group:</strong> ${teacherData.preferred_age_group || 'Not specified'}</p>

                    <h3>Education Background:</h3>
                    <p>${teacherData.education}</p>

                    <h3>Teaching Experience:</h3>
                    <p>${teacherData.teachingExperience}</p>

                    ${teacherData.additionalInfo ? `<h3>Additional Information:</h3><p>${teacherData.additionalInfo}</p>` : ''}

                    <p><strong>Video:</strong> ${teacherData.introVideoPath ? 'Uploaded' : 'Not provided'}</p>

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
app.post('/api/admin/login', (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('Login attempt:', { username, password, expected: ADMIN_CREDENTIALS });

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Check credentials
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            req.session.authenticated = true;
            req.session.username = username;

            console.log('Login successful for:', username);

            res.json({
                success: true,
                message: 'Login successful'
            });
        } else {
            console.log('Login failed for:', username, 'with password:', password);

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
            subject: `EduConnect Contact: ${subject}`,
            html: `
                <h2>New Contact Form Message</h2>
                <p><strong>From:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <p><small>This message was sent via the EduConnect contact form.</small></p>
            `
        });

        res.redirect('/contact.html?success=true');
    } catch (error) {
        console.error('Error sending email:', error);
        res.redirect('/contact.html?error=true');
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
                subject: `New Job Interest: ${interestData.firstName} ${interestData.lastName}`,
                html: `
                    <h2>New Job Interest Received</h2>
                    <p><strong>Name:</strong> ${interestData.firstName} ${interestData.lastName}</p>
                    <p><strong>Email:</strong> ${interestData.email}</p>
                    <p><strong>Phone:</strong> ${interestData.phone || 'Not provided'}</p>
                    <p><strong>Teaching Subject:</strong> ${interestData.teachingSubject}</p>
                    <p><strong>Experience:</strong> ${interestData.experience}</p>
                    <p><strong>Preferred Location:</strong> ${interestData.preferredLocation || 'No preference'}</p>

                    ${interestData.message ? `<h3>Message:</h3><p>${interestData.message}</p>` : ''}

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

// Diagnostic endpoint to check environment and database status
app.get('/api/debug/status', requireAuth, async (req, res) => {
    try {
        const status = {
            environment: process.env.NODE_ENV || 'development',
            database: {
                type: process.env.MYSQL_HOST ? 'MySQL' : 'SQLite',
                mysqlConfigured: !!process.env.MYSQL_HOST,
                mysqlHost: process.env.MYSQL_HOST ? '***configured***' : 'not set',
            },
            uploads: {
                directory: process.env.RAILWAY_VOLUME_MOUNT_PATH
                    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
                    : path.join(__dirname, 'uploads'),
                volumeMountPath: process.env.RAILWAY_VOLUME_MOUNT_PATH || 'not set',
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

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 100MB.'
            });
        }
    }
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`EduConnect server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the website`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    db.close();
    process.exit(0);
});