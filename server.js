require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { Resend } = require('resend');
const SupabaseDatabase = require('./supabase-database');
const CVParser = require('./cv-parser');

// Initialize Resend (non-blocking, will fail gracefully if no key)
let resend;
try {
    resend = new Resend(process.env.RESEND_API_KEY);
} catch (error) {
    console.warn('⚠️  Resend not initialized:', error.message);
    // Create a dummy resend object to prevent crashes
    resend = {
        emails: {
            send: async () => {
                console.warn('⚠️  Email sending skipped - RESEND_API_KEY not configured');
                return { id: 'skipped' };
            }
        }
    };
}

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (needed for Cloudflare and Railway to correctly detect HTTPS)
app.set('trust proxy', true);

// Health check endpoint - MUST be first, absolutely minimal, no dependencies
// Railway healthchecks need instant response
app.get('/health', (req, res) => {
    res.status(200).send('ok');
});

// Initialize Supabase database (async, non-blocking)
// Don't exit on failure - let server start and handle errors gracefully
let db;
let dbInitialized = false;

// Initialize database asynchronously so it doesn't block server startup
setImmediate(() => {
    try {
        db = new SupabaseDatabase();
        dbInitialized = true;
        console.log('🔍 Database Configuration:');
        console.log('  - Database Type: Supabase');
        console.log('  - Supabase URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Not set');
    } catch (error) {
        console.error('⚠️  Failed to initialize Supabase:', error.message);
        console.error('   Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in environment variables');
        console.error('   Server will start but database operations will fail');
        // Don't exit - let server start for healthchecks
    }
});

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

// Helper function to detect URLs in text
function containsUrl(text) {
    if (!text) return false;
    // Match http://, https://, www., or domain patterns
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
    return urlPattern.test(text);
}

// Helper function for rate limiter IP detection with IPv6 support
function getClientIP(req) {
    // Get the IP address from request
    let ip = req.ip;
    
    // Check for forwarded IP in case behind proxy
    const forwarded = req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    if (forwarded) {
        ip = forwarded;
    }
    
    // Use ipKeyGenerator helper to properly handle IPv6 addresses
    // Apply /56 subnet mask to IPv6 addresses to prevent bypassing limits
    return ipKeyGenerator(ip, 56);
}

// Rate limiting for contact form - 5 requests per 15 minutes per IP
const contactFormLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIP
});

// Rate limiting for signup form - 3 submissions per hour per IP
const signupFormLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 submissions per hour
    message: {
        success: false,
        message: 'Too many applications submitted. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIP
});

// Rate limiting for login - 5 attempts per 15 minutes per IP (prevent brute force)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per 15 minutes
    message: {
        success: false,
        message: 'Too many login attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIP,
    skipSuccessfulRequests: true // Don't count successful logins
});

// Admin credentials - password will be hashed
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
// Use a pre-generated hash for the default password 'password' to ensure consistency
// Hash: $2b$10$DXo5gdo52QXVkfKOV6jVpunbvxWXcx8Og.RB7qVkUqGPFjnn8903S
// In production, set ADMIN_PASSWORD_HASH in environment variables
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || 
    (process.env.ADMIN_PASSWORD ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10) : '$2b$10$DXo5gdo52QXVkfKOV6jVpunbvxWXcx8Og.RB7qVkUqGPFjnn8903S');

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

// Configure multer for CV uploads (simplified signup)
const uploadCV = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for CVs
    },
    fileFilter: (req, file, cb) => {
        // Allow PDF, Word docs, text files, and images
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/jpg'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Please upload PDF, Word document, or image.`), false);
        }
    }
}).single('cvFile');

// Initialize CV Parser
const cvParser = new CVParser();

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

// Middleware to require master admin role
function requireMasterAdmin(req, res, next) {
    if (req.session && req.session.authenticated && req.session.role === 'master_admin') {
        next();
    } else {
        console.log('Access denied to master admin endpoint. Session role:', req.session?.role);
        res.status(403).json({
            success: false,
            message: 'Access denied. Master admin privileges required. Please log out and log back in to refresh your session.'
        });
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
    res.sendFile(path.join(__dirname, 'admin-enhanced.html'));
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

// Simplified signup API route with CV parsing
app.post('/api/submit-application-simple', signupFormLimiter, uploadCV, handleMulterError, async (req, res) => {
    // Check if database is initialized
    if (!db || !dbInitialized) {
        return res.status(503).json({
            success: false,
            message: 'Database is not available. Please try again later.'
        });
    }
    
    try {
        const name = req.body.name?.trim();
        const email = req.body.email?.trim();
        const linkedin = req.body.linkedin?.trim();
        const preferredCities = req.body.preferredCities ? JSON.parse(req.body.preferredCities) : [];
        const preferredAgeGroup = req.body.preferredAgeGroup?.trim();
        const subjectSpecialty = req.body.subjectSpecialty?.trim();
        const cvFile = req.file;

        // Validation
        if (!name || name.length < 2) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter your full name' 
            });
        }

        if (!email || !email.includes('@')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Valid email is required' 
            });
        }

        if (!cvFile) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please upload your CV' 
            });
        }

        if (!preferredCities || preferredCities.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please select at least one preferred city' 
            });
        }

        if (!preferredAgeGroup) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please select your preferred age group' 
            });
        }

        if (!subjectSpecialty) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please select the subject you teach' 
            });
        }

        // Split name into first and last name
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || name;
        const lastName = nameParts.slice(1).join(' ') || '';

        // Prepare teacher data object
        let teacherData = {
            firstName: firstName,
            lastName: lastName || firstName, // Use firstName if no last name provided
            email: email.toLowerCase(),
            preferredLocation: preferredCities.join(', '), // Store as comma-separated string
            preferred_age_group: preferredAgeGroup,
            subjectSpecialty: subjectSpecialty,
            linkedin: linkedin || null
        };

        // Parse CV if uploaded
        let cvPath = null;
        let parsedData = null;
        
        if (cvFile) {
            try {
                // Upload CV to storage first
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const fileName = `cv-${uniqueSuffix}${path.extname(cvFile.originalname)}`;
                
                const uploadResult = await db.uploadCV(cvFile, fileName);
                cvPath = uploadResult.path;
                console.log('✅ CV uploaded to Supabase Storage:', uploadResult.path);

                // Parse CV with AI
                console.log('🤖 Parsing CV with AI...');
                parsedData = await cvParser.parseCV(cvFile.buffer, cvFile.mimetype);
                
                console.log('✅ CV parsed successfully. Extracted:', {
                    firstName: parsedData.firstName,
                    lastName: parsedData.lastName,
                    email: parsedData.email,
                    phone: parsedData.phone,
                    nationality: parsedData.nationality,
                    yearsExperience: parsedData.yearsExperience
                });
            } catch (parseError) {
                console.error('Error parsing CV:', parseError);
                // Continue with just the CV file uploaded, but log the error
                parsedData = null;
            }
        }
        
        // Store CV path
        teacherData.cvPath = cvPath;

        // Merge parsed data, but prioritize user-provided fields
        // User-provided fields take precedence over AI-extracted ones
        if (parsedData) {
            // Only use parsed data for fields not provided by user
            // Note: These will get defaults later if still empty
            teacherData.phone = teacherData.phone || parsedData.phone;
            teacherData.nationality = teacherData.nationality || parsedData.nationality;
            teacherData.yearsExperience = teacherData.yearsExperience || parsedData.yearsExperience;
            teacherData.education = teacherData.education || parsedData.education;
            teacherData.teachingExperience = teacherData.teachingExperience || parsedData.teachingExperience;
            teacherData.professionalExperience = teacherData.professionalExperience || parsedData.professionalExperience;
            
            // Additional info from CV parsing
            if (parsedData.additionalInfo) {
                teacherData.additionalInfo = (teacherData.additionalInfo || '') + '\n\n' + parsedData.additionalInfo;
            }
        }

        // Set defaults for any missing fields (database has NOT NULL constraints)
        // Use empty strings or "Not provided" instead of null to satisfy NOT NULL constraints
        teacherData.phone = teacherData.phone || 'Not provided';
        teacherData.nationality = teacherData.nationality || 'Not provided';
        teacherData.yearsExperience = teacherData.yearsExperience || 'Not provided';
        teacherData.education = teacherData.education || 'Not provided';
        teacherData.teachingExperience = teacherData.teachingExperience || 'Not provided';
        teacherData.professionalExperience = teacherData.professionalExperience || null; // This one is nullable
        teacherData.additionalInfo = teacherData.additionalInfo || null; // This one is nullable

        // Save to database
        console.log('💾 Saving teacher data to database...');
        const result = await db.addTeacher(teacherData);
        console.log('✅ Teacher data saved successfully, ID:', result.id);

        // Send email notification
        try {
            await resend.emails.send({
                from: 'EduConnect <team@educonnectchina.com>',
                to: [process.env.EMAIL_TO || 'team@educonnectchina.com'],
                subject: `New Teacher Application: ${sanitizeHtml(teacherData.firstName)} ${sanitizeHtml(teacherData.lastName)}`,
                html: `
                    <h2>New Teacher Application Received (Simplified Form)</h2>
                    <p><strong>Name:</strong> ${sanitizeHtml(teacherData.firstName)} ${sanitizeHtml(teacherData.lastName)}</p>
                    <p><strong>Email:</strong> ${sanitizeHtml(teacherData.email)}</p>
                    <p><strong>Phone:</strong> ${teacherData.phone ? sanitizeHtml(teacherData.phone) : 'Not provided'}</p>
                    <p><strong>Nationality:</strong> ${teacherData.nationality ? sanitizeHtml(teacherData.nationality) : 'Not provided'}</p>
                    <p><strong>Experience:</strong> ${teacherData.yearsExperience ? sanitizeHtml(teacherData.yearsExperience) : 'Not provided'}</p>
                    <p><strong>Subject:</strong> ${teacherData.subjectSpecialty ? sanitizeHtml(teacherData.subjectSpecialty) : 'Not provided'}</p>
                    <p><strong>Preferred Cities:</strong> ${sanitizeHtml(teacherData.preferredLocation)}</p>
                    <p><strong>Preferred Age Group:</strong> ${teacherData.preferred_age_group ? sanitizeHtml(teacherData.preferred_age_group) : 'Not provided'}</p>
                    <p><strong>Preferred Age Group:</strong> ${teacherData.preferred_age_group ? sanitizeHtml(teacherData.preferred_age_group) : 'Not provided'}</p>
                    <p><strong>Subject Specialty:</strong> ${teacherData.subjectSpecialty ? sanitizeHtml(teacherData.subjectSpecialty) : 'Not provided'}</p>

                    ${teacherData.education ? `<h3>Education Background:</h3><p>${sanitizeHtml(teacherData.education)}</p>` : ''}
                    ${teacherData.teachingExperience ? `<h3>Teaching Experience:</h3><p>${sanitizeHtml(teacherData.teachingExperience)}</p>` : ''}
                    ${teacherData.professionalExperience ? `<h3>Professional Experience:</h3><p>${sanitizeHtml(teacherData.professionalExperience)}</p>` : ''}
                    ${teacherData.additionalInfo ? `<h3>Additional Information:</h3><p>${sanitizeHtml(teacherData.additionalInfo)}</p>` : ''}

                    <h3>Media & Profiles:</h3>
                    <p><strong>CV:</strong> ${teacherData.cvPath ? 'Uploaded' : 'Not provided'}</p>
                    <p><strong>LinkedIn:</strong> ${teacherData.linkedin ? `<a href="${sanitizeHtml(teacherData.linkedin)}">${sanitizeHtml(teacherData.linkedin)}</a>` : 'Not provided'}</p>

                    <p><em>View full details in the admin dashboard.</em></p>
                    <p><em>Note: This application was submitted via the simplified form with AI CV parsing.</em></p>
                `
            });
        } catch (emailError) {
            console.error('Error sending application notification email:', emailError);
            // Don't fail the application if email fails
        }
        
        console.log('✅ Simplified application submitted successfully');
        res.json({
            success: true,
            message: 'Application submitted successfully!',
            data: result
        });
    } catch (error) {
        console.error('❌ Error submitting simplified application:', error);
        console.error('   Error stack:', error.stack);
        
        const errorMessage = process.env.NODE_ENV === 'production' 
            ? 'An error occurred while submitting your application. Please try again or contact support.'
            : error.message;
            
        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

// API Routes
app.post('/api/submit-application', signupFormLimiter, upload, handleMulterError, async (req, res) => {
    // Check if database is initialized
    if (!db || !dbInitialized) {
        return res.status(503).json({
            success: false,
            message: 'Database is not available. Please try again later.'
        });
    }
    
    // Set a longer timeout for file uploads (5 minutes)
    req.setTimeout(300000);
    
    try {
        // Log submission (sanitize sensitive data in production)
        if (process.env.NODE_ENV !== 'production') {
            console.log('📝 New application submission received');
            console.log('   - Has video:', !!(req.files && req.files['introVideo']));
            console.log('   - Has photo:', !!(req.files && req.files['headshotPhoto']));
        } else {
            console.log('📝 New application submission received');
        }
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

        if (process.env.NODE_ENV !== 'production') {
            console.log('💾 Saving teacher data to database...');
        }
        const result = await db.addTeacher(teacherData);
        if (process.env.NODE_ENV !== 'production') {
            console.log('✅ Teacher data saved successfully, ID:', result.id);
        }

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
        
        console.log('✅ Application submitted successfully');
        res.json({
            success: true,
            message: 'Application submitted successfully!',
            data: result
        });
    } catch (error) {
        console.error('❌ Error submitting application:', error);
        console.error('   Error stack:', error.stack);
        
        // Don't expose internal error details in production
        const errorMessage = process.env.NODE_ENV === 'production' 
            ? 'An error occurred while submitting your application. Please try again or contact support.'
            : error.message;
            
        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

// Authentication API routes
app.post('/api/admin/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Try staff login first (from database)
        if (db && dbInitialized) {
            try {
                const staff = await db.getStaffByUsername(username);
                if (staff) {
                    const passwordMatch = await bcrypt.compare(password, staff.passwordHash);
                    if (passwordMatch) {
                        req.session.authenticated = true;
                        req.session.username = username;
                        req.session.role = staff.role;
                        req.session.staffId = staff.id;

                        // Log successful login (without sensitive data)
                        if (process.env.NODE_ENV !== 'production') {
                            console.log('✅ Staff login successful');
                        }

                        return res.json({
                            success: true,
                            message: 'Login successful',
                            role: staff.role
                        });
                    }
                    // Don't log failed attempts in production to prevent username enumeration
                }
            } catch (dbError) {
                console.error('Database login error:', dbError.message);
                // Fall through to legacy admin login
            }
        }

        // Legacy admin login (fallback)
        const usernameMatch = username === ADMIN_USERNAME;
        const passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

        if (usernameMatch && passwordMatch) {
            req.session.authenticated = true;
            req.session.username = username;
            req.session.role = 'admin';

            if (process.env.NODE_ENV !== 'production') {
                console.log('✅ Legacy admin login successful');
            }

            res.json({
                success: true,
                message: 'Login successful',
                role: 'admin'
            });
        } else {
            // Generic error message to prevent username enumeration
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

// Contact form route with rate limiting and bot protection
app.post('/send-message', contactFormLimiter, async (req, res) => {
    try {
        const { name, email, subject, message, website } = req.body;

        // Honeypot check - if website field is filled, it's a bot
        if (website && website.trim()) {
            // Log bot detection without sensitive data
            const clientIP = getClientIP(req);
            console.warn('Bot detected: honeypot field filled', { ip: clientIP });
            return res.status(400).json({
                success: false,
                message: 'Invalid request'
            });
        }

        // Basic validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check for URLs in message, name, or subject (common spam pattern)
        const fieldsToCheck = [message, name, subject].join(' ');
        if (containsUrl(fieldsToCheck)) {
            const clientIP = getClientIP(req);
            console.warn('Bot detected: URL found in message', { ip: clientIP });
            return res.status(400).json({
                success: false,
                message: 'Messages containing URLs are not allowed. Please contact us directly via email if you need to share a link.'
            });
        }

        // Additional spam detection: check for suspicious patterns
        const suspiciousPatterns = [
            /click here/i,
            /visit (our )?website/i,
            /check out/i,
            /bit\.ly|tinyurl|short\.link|t\.co/i, // Common URL shorteners
        ];
        
        if (suspiciousPatterns.some(pattern => pattern.test(fieldsToCheck))) {
            const clientIP = getClientIP(req);
            console.warn('Bot detected: suspicious pattern found', { ip: clientIP });
            return res.status(400).json({
                success: false,
                message: 'Your message contains suspicious content. Please contact us directly via email.'
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
        // Debug: Log CV data
        const teachersWithCV = teachers.filter(t => t.cvPath);
        console.log(`[API] Loaded ${teachers.length} teachers, ${teachersWithCV.length} with CVs`);
        if (teachersWithCV.length > 0) {
            console.log('[API] Sample teacher with CV:', {
                id: teachersWithCV[0].id,
                name: `${teachersWithCV[0].firstName} ${teachersWithCV[0].lastName}`,
                cvPath: teachersWithCV[0].cvPath
            });
        }
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

// Get CV URL for a teacher
app.get('/api/teachers/:id/cv', requireAuth, async (req, res) => {
    try {
        const teacher = await db.getTeacherById(req.params.id);
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }
        
        console.log(`[CV API] Teacher ${req.params.id} CV data:`, {
            cvPath: teacher.cvPath,
            cv_path: teacher.cv_path,
            hasCV: !!(teacher.cvPath || teacher.cv_path)
        });
        
        const cvPath = teacher.cvPath || teacher.cv_path;
        if (!cvPath) {
            return res.status(404).json({
                success: false,
                message: 'No CV found for this teacher'
            });
        }
        
        console.log(`[CV API] Generating signed URL for path: "${cvPath}"`);
        const cvUrl = await db.getCVUrl(cvPath);
        if (cvUrl) {
            console.log(`[CV API] Successfully generated CV URL`);
            res.json({
                success: true,
                data: { url: cvUrl }
            });
        } else {
            console.error(`[CV API] Failed to generate CV URL for path: "${cvPath}"`);
            res.status(500).json({
                success: false,
                message: 'Error generating CV URL. Check server logs for details.'
            });
        }
    } catch (error) {
        console.error('[CV API] Error fetching CV URL:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching CV URL: ' + error.message
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

// School management API routes
app.get('/api/schools', requireAuth, async (req, res) => {
    try {
        const activeOnly = req.query.activeOnly === 'true';
        const schools = await db.getAllSchools(activeOnly);
        res.json({
            success: true,
            data: schools
        });
    } catch (error) {
        console.error('Error fetching schools:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching schools: ' + error.message
        });
    }
});

app.get('/api/schools/:id', requireAuth, async (req, res) => {
    try {
        const school = await db.getSchoolById(req.params.id);
        if (school) {
            res.json({
                success: true,
                data: school
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'School not found'
            });
        }
    } catch (error) {
        console.error('Error fetching school:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching school: ' + error.message
        });
    }
});

app.post('/api/schools', requireAuth, async (req, res) => {
    try {
        const schoolData = {
            name: req.body.name?.trim(),
            nameChinese: req.body.nameChinese?.trim(),
            location: req.body.location?.trim(),
            locationChinese: req.body.locationChinese?.trim(),
            city: req.body.city?.trim(),
            province: req.body.province?.trim(),
            schoolType: req.body.schoolType?.trim(),
            ageGroups: Array.isArray(req.body.ageGroups) ? req.body.ageGroups : [],
            subjectsNeeded: Array.isArray(req.body.subjectsNeeded) ? req.body.subjectsNeeded : [],
            experienceRequired: req.body.experienceRequired?.trim(),
            chineseRequired: req.body.chineseRequired === true || req.body.chineseRequired === 'true',
            salaryRange: req.body.salaryRange?.trim(),
            contractType: req.body.contractType?.trim(),
            benefits: req.body.benefits?.trim(),
            description: req.body.description?.trim(),
            contactName: req.body.contactName?.trim(),
            contactEmail: req.body.contactEmail?.trim(),
            contactPhone: req.body.contactPhone?.trim(),
            isActive: req.body.isActive !== undefined ? req.body.isActive : true
        };

        // Basic validation
        if (!schoolData.name || !schoolData.location) {
            return res.status(400).json({
                success: false,
                message: 'School name and location are required'
            });
        }

        const result = await db.addSchool(schoolData);
        res.json({
            success: true,
            message: 'School added successfully',
            data: result
        });
    } catch (error) {
        console.error('Error adding school:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding school: ' + error.message
        });
    }
});

app.put('/api/schools/:id', requireAuth, async (req, res) => {
    try {
        const schoolData = {
            name: req.body.name?.trim(),
            nameChinese: req.body.nameChinese?.trim(),
            location: req.body.location?.trim(),
            locationChinese: req.body.locationChinese?.trim(),
            city: req.body.city?.trim(),
            province: req.body.province?.trim(),
            schoolType: req.body.schoolType?.trim(),
            ageGroups: Array.isArray(req.body.ageGroups) ? req.body.ageGroups : [],
            subjectsNeeded: Array.isArray(req.body.subjectsNeeded) ? req.body.subjectsNeeded : [],
            experienceRequired: req.body.experienceRequired?.trim(),
            chineseRequired: req.body.chineseRequired === true || req.body.chineseRequired === 'true',
            salaryRange: req.body.salaryRange?.trim(),
            contractType: req.body.contractType?.trim(),
            benefits: req.body.benefits?.trim(),
            description: req.body.description?.trim(),
            contactName: req.body.contactName?.trim(),
            contactEmail: req.body.contactEmail?.trim(),
            contactPhone: req.body.contactPhone?.trim(),
            isActive: req.body.isActive !== undefined ? req.body.isActive : true
        };

        const result = await db.updateSchool(req.params.id, schoolData);
        res.json({
            success: true,
            message: 'School updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating school:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating school: ' + error.message
        });
    }
});

app.delete('/api/schools/:id', requireAuth, async (req, res) => {
    try {
        const result = await db.deleteSchool(req.params.id);
        res.json({
            success: true,
            message: 'School deleted successfully',
            data: result
        });
    } catch (error) {
        console.error('Error deleting school:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting school: ' + error.message
        });
    }
});

// Admin Jobs API routes (protected, for admin panel)
app.get('/api/admin/jobs', requireAuth, async (req, res) => {
    try {
        const jobs = await db.getAllJobs(false); // Get ALL jobs (including inactive)
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

app.post('/api/admin/jobs', requireAuth, async (req, res) => {
    try {
        const jobData = {
            title: req.body.title?.trim(),
            company: req.body.company?.trim(),
            location: req.body.location?.trim(),
            locationChinese: req.body.locationChinese?.trim(),
            city: req.body.city?.trim(),
            province: req.body.province?.trim(),
            salary: req.body.salary?.trim(),
            experience: req.body.experience?.trim(),
            chineseRequired: req.body.chineseRequired || 'No',
            qualification: req.body.qualification?.trim(),
            contractType: req.body.contractType || 'Full Time',
            jobFunctions: req.body.jobFunctions || req.body.subjects?.join(', ') || '',
            ageGroups: Array.isArray(req.body.ageGroups) ? req.body.ageGroups : [],
            subjects: Array.isArray(req.body.subjects) ? req.body.subjects : [],
            schoolId: req.body.schoolId || null,
            description: req.body.description?.trim(),
            requirements: req.body.requirements?.trim(),
            benefits: req.body.benefits?.trim(),
            isActive: req.body.isActive !== undefined ? req.body.isActive : true
        };

        // Basic validation
        if (!jobData.title || !jobData.company || !jobData.location) {
            return res.status(400).json({
                success: false,
                message: 'Job title, company, and location are required'
            });
        }

        const result = await db.addJob(jobData);
        res.json({
            success: true,
            message: 'Job added successfully',
            data: result
        });
    } catch (error) {
        console.error('Error adding job:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding job: ' + error.message
        });
    }
});

app.put('/api/admin/jobs/:id', requireAuth, async (req, res) => {
    try {
        const jobData = {
            title: req.body.title?.trim(),
            company: req.body.company?.trim(),
            location: req.body.location?.trim(),
            locationChinese: req.body.locationChinese?.trim(),
            city: req.body.city?.trim(),
            province: req.body.province?.trim(),
            salary: req.body.salary?.trim(),
            experience: req.body.experience?.trim(),
            chineseRequired: req.body.chineseRequired || 'No',
            qualification: req.body.qualification?.trim(),
            contractType: req.body.contractType || 'Full Time',
            jobFunctions: req.body.jobFunctions || req.body.subjects?.join(', ') || '',
            ageGroups: Array.isArray(req.body.ageGroups) ? req.body.ageGroups : [],
            subjects: Array.isArray(req.body.subjects) ? req.body.subjects : [],
            schoolId: req.body.schoolId || null,
            description: req.body.description?.trim(),
            requirements: req.body.requirements?.trim(),
            benefits: req.body.benefits?.trim(),
            isActive: req.body.isActive !== undefined ? req.body.isActive : true
        };

        const result = await db.updateJob(req.params.id, jobData);
        res.json({
            success: true,
            message: 'Job updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating job: ' + error.message
        });
    }
});

app.delete('/api/admin/jobs/:id', requireAuth, async (req, res) => {
    try {
        const result = await db.deleteJob(req.params.id);
        res.json({
            success: true,
            message: 'Job deleted successfully',
            data: result
        });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting job: ' + error.message
        });
    }
});

// Job Matching API routes
app.post('/api/job-matching/run-for-all', requireAuth, async (req, res) => {
    try {
        const result = await db.runJobMatchingForAllTeachers();
        res.json({
            success: true,
            message: `Job matching completed. ${result.matchesCreated} matches created for ${result.teachersProcessed} teachers.`,
            data: result
        });
    } catch (error) {
        console.error('Error running job matching:', error);
        res.status(500).json({
            success: false,
            message: 'Error running job matching: ' + error.message
        });
    }
});

app.get('/api/job-matching/teacher/:teacherId', requireAuth, async (req, res) => {
    try {
        const matches = await db.findJobMatchesForTeacher(req.params.teacherId);
        res.json({
            success: true,
            data: matches
        });
    } catch (error) {
        console.error('Error finding job matches for teacher:', error);
        res.status(500).json({
            success: false,
            message: 'Error finding job matches: ' + error.message
        });
    }
});

app.get('/api/job-matching/job/:jobId', requireAuth, async (req, res) => {
    try {
        const matches = await db.findTeacherMatchesForJob(req.params.jobId);
        res.json({
            success: true,
            data: matches
        });
    } catch (error) {
        console.error('Error finding teacher matches for job:', error);
        res.status(500).json({
            success: false,
            message: 'Error finding teacher matches: ' + error.message
        });
    }
});

app.get('/api/job-matching', requireAuth, async (req, res) => {
    try {
        const teacherId = req.query.teacherId || null;
        const jobId = req.query.jobId || null;
        const status = req.query.status || null;
        
        const matches = await db.getAllJobMatches(teacherId, jobId, status);
        res.json({
            success: true,
            data: matches
        });
    } catch (error) {
        console.error('Error fetching job matches:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching job matches: ' + error.message
        });
    }
});

app.put('/api/job-matching/:id/status', requireAuth, async (req, res) => {
    try {
        const { status, notes } = req.body;
        const result = await db.updateJobMatchStatus(req.params.id, status, notes);
        res.json({
            success: true,
            message: 'Job match status updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating job match status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating job match status: ' + error.message
        });
    }
});

// School-based Matching API routes (legacy)
app.post('/api/matching/run-for-all', requireAuth, async (req, res) => {
    try {
        const result = await db.runMatchingForAllTeachers();
        res.json({
            success: true,
            message: `Matching completed. ${result.matchesCreated} matches created for ${result.teachersProcessed} teachers.`,
            data: result
        });
    } catch (error) {
        console.error('Error running matching:', error);
        res.status(500).json({
            success: false,
            message: 'Error running matching: ' + error.message
        });
    }
});

app.get('/api/matching/teacher/:teacherId', requireAuth, async (req, res) => {
    try {
        const matches = await db.findMatchesForTeacher(req.params.teacherId);
        res.json({
            success: true,
            data: matches
        });
    } catch (error) {
        console.error('Error finding matches for teacher:', error);
        res.status(500).json({
            success: false,
            message: 'Error finding matches: ' + error.message
        });
    }
});

app.get('/api/matching/school/:schoolId', requireAuth, async (req, res) => {
    try {
        const matches = await db.findMatchesForSchool(req.params.schoolId);
        res.json({
            success: true,
            data: matches
        });
    } catch (error) {
        console.error('Error finding matches for school:', error);
        res.status(500).json({
            success: false,
            message: 'Error finding matches: ' + error.message
        });
    }
});

app.get('/api/matching', requireAuth, async (req, res) => {
    try {
        const teacherId = req.query.teacherId || null;
        const schoolId = req.query.schoolId || null;
        const status = req.query.status || null;
        
        const matches = await db.getAllMatches(teacherId, schoolId, status);
        res.json({
            success: true,
            data: matches
        });
    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching matches: ' + error.message
        });
    }
});

app.put('/api/matching/:id/status', requireAuth, async (req, res) => {
    try {
        const { status, notes } = req.body;
        const result = await db.updateMatchStatus(req.params.id, status, notes);
        res.json({
            success: true,
            message: 'Match status updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating match status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating match status: ' + error.message
        });
    }
});

// Staff management API routes (master admin only)
app.get('/api/admin/staff', requireAuth, requireMasterAdmin, async (req, res) => {
    try {
        const staffList = await db.getAllStaff();
        res.json({
            success: true,
            data: staffList
        });
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching staff: ' + error.message
        });
    }
});

app.post('/api/admin/staff', requireAuth, requireMasterAdmin, async (req, res) => {
    try {
        const { username, password, fullName, role } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        const staffData = {
            username: username.trim(),
            passwordHash: passwordHash,
            fullName: fullName ? fullName.trim() : null,
            role: role === 'master_admin' ? 'master_admin' : 'staff' // Prevent creating master_admin via API
        };

        const result = await db.addStaff(staffData);
        res.json({
            success: true,
            message: 'Staff member added successfully',
            data: result
        });
    } catch (error) {
        console.error('Error adding staff:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding staff: ' + error.message
        });
    }
});

app.put('/api/admin/staff/:id', requireAuth, requireMasterAdmin, async (req, res) => {
    try {
        const { password, fullName, isActive } = req.body;
        const updateData = {};

        if (password) {
            updateData.passwordHash = await bcrypt.hash(password, 10);
        }
        if (fullName !== undefined) {
            updateData.fullName = fullName ? fullName.trim() : null;
        }
        if (isActive !== undefined) {
            updateData.isActive = isActive;
        }

        const result = await db.updateStaff(req.params.id, updateData);
        res.json({
            success: true,
            message: 'Staff member updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating staff: ' + error.message
        });
    }
});

app.delete('/api/admin/staff/:id', requireAuth, requireMasterAdmin, async (req, res) => {
    try {
        // Prevent deleting yourself
        if (req.session.staffId && parseInt(req.params.id) === req.session.staffId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        const result = await db.deleteStaff(req.params.id);
        res.json({
            success: true,
            message: 'Staff member deleted successfully',
            data: result
        });
    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting staff: ' + error.message
        });
    }
});

// Get current user info
app.get('/api/admin/me', requireAuth, async (req, res) => {
    res.json({
        success: true,
        data: {
            username: req.session.username,
            role: req.session.role,
            staffId: req.session.staffId
        }
    });
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

// Start server - this MUST happen even if database fails
try {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ EduConnect server running on port ${PORT}`);
        console.log(`   Health check available at: http://0.0.0.0:${PORT}/health`);
        console.log(`   Database initialized: ${dbInitialized ? 'Yes' : 'No'}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        if (!dbInitialized) {
            console.warn('⚠️  Warning: Database not initialized. Some features will not work.');
        }
    }).on('error', (err) => {
        console.error('❌ Failed to start server:', err);
        console.error('   Error details:', err.message);
        console.error('   Port:', PORT);
        process.exit(1);
    });
} catch (error) {
    console.error('❌ Critical error starting server:', error);
    console.error('   Stack:', error.stack);
    process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    if (db && db.close) {
        db.close();
    }
    process.exit(0);
});