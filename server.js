require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Hash admin password on startup if needed
let adminPasswordHash;
if (process.env.ADMIN_PASSWORD) {
    adminPasswordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
} else {
    adminPasswordHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // 'password'
}

// Initialize database
const db = new Database();

// Admin credentials
const ADMIN_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: adminPasswordHash
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
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
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
            introVideoPath: req.file ? req.file.filename : null,
            additionalInfo: req.body.additionalInfo ? req.body.additionalInfo.trim() : null
        };

        const result = await db.addTeacher(teacherData);
        
        // Send email notification for new application
        try {
            const transporter = nodemailer.createTransporter({
                host: 'smtp.zoho.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER || 'team@educonnectchina.com',
                    pass: process.env.EMAIL_PASS || 'your-zoho-password'
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER || 'team@educonnectchina.com',
                to: process.env.EMAIL_TO || 'team@educonnectchina.com',
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
                    
                    <h3>Education Background:</h3>
                    <p>${teacherData.education}</p>
                    
                    <h3>Teaching Experience:</h3>
                    <p>${teacherData.teachingExperience}</p>
                    
                    ${teacherData.additionalInfo ? `<h3>Additional Information:</h3><p>${teacherData.additionalInfo}</p>` : ''}
                    
                    <p><strong>Video:</strong> ${teacherData.introVideoPath ? 'Uploaded' : 'Not provided'}</p>
                    
                    <p><em>View full details in the admin dashboard.</em></p>
                `
            };

            await transporter.sendMail(mailOptions);
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
        
        // Check credentials
        if (username === ADMIN_CREDENTIALS.username && 
            await bcrypt.compare(password, ADMIN_CREDENTIALS.password)) {
            
            req.session.authenticated = true;
            req.session.username = username;
            
            res.json({
                success: true,
                message: 'Login successful'
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
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
        
        // Create transporter (using Zoho Mail)
        const transporter = nodemailer.createTransporter({
            host: 'smtp.zoho.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER || 'team@educonnectchina.com',
                pass: process.env.EMAIL_PASS || 'your-zoho-password'
            }
        });
        
        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER || 'team@educonnectchina.com',
            to: process.env.EMAIL_TO || 'team@educonnectchina.com',
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
        };
        
        // Send email
        await transporter.sendMail(mailOptions);
        
        res.redirect('/contact.html?success=true');
    } catch (error) {
        console.error('Error sending email:', error);
        res.redirect('/contact.html?error=true');
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