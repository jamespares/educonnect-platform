require('dotenv').config();
const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');

console.log('\n🔄 EduConnect MySQL → Supabase Migration Tool\n');
console.log('============================================\n');

// MySQL Configuration
const MYSQL_PUBLIC_URL = process.env.MYSQL_PUBLIC_URL;
const MYSQL_CONFIG = MYSQL_PUBLIC_URL
    ? { uri: MYSQL_PUBLIC_URL }
    : {
        host: process.env.MYSQL_HOST || process.env.MYSQLHOST,
        port: process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306,
        user: process.env.MYSQL_USER || process.env.MYSQLUSER,
        password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD,
        database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE
    };

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials!');
    console.error('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Check MySQL connection
async function checkMySQLConnection() {
    console.log('📡 Checking MySQL connection...');
    
    if (MYSQL_CONFIG.uri) {
        console.log(`   Using: MYSQL_PUBLIC_URL\n`);
    } else {
        console.log(`   Host: ${MYSQL_CONFIG.host}`);
        console.log(`   Database: ${MYSQL_CONFIG.database}\n`);
        
        if (!MYSQL_CONFIG.host || !MYSQL_CONFIG.user || !MYSQL_CONFIG.password || !MYSQL_CONFIG.database) {
            console.error('❌ Missing MySQL credentials!');
            process.exit(1);
        }
    }

    try {
        // mysql2/promise accepts URL string directly, not wrapped in object
        const connection = MYSQL_CONFIG.uri 
            ? await mysql.createConnection(MYSQL_CONFIG.uri)
            : await mysql.createConnection(MYSQL_CONFIG);
        console.log('✅ MySQL connection successful!\n');
        return connection;
    } catch (error) {
        console.error('❌ MySQL connection failed:', error.message);
        process.exit(1);
    }
}

// Check Supabase connection
async function checkSupabaseConnection() {
    console.log('📡 Checking Supabase connection...');
    console.log(`   URL: ${SUPABASE_URL}\n`);

    try {
        const { data, error } = await supabase.from('teachers').select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        console.log('✅ Supabase connection successful!\n');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection failed:', error.message);
        console.error('   Make sure tables are created (run supabase-migration.sql)');
        process.exit(1);
    }
}

// Get MySQL data counts
async function getMySQLCounts(connection) {
    console.log('📊 Counting records in MySQL...\n');
    
    try {
        const [teachers] = await connection.query('SELECT COUNT(*) as count FROM teachers');
        const [jobs] = await connection.query('SELECT COUNT(*) as count FROM jobs');
        const [interests] = await connection.query('SELECT COUNT(*) as count FROM job_interests');
        
        const counts = {
            teachers: teachers[0].count,
            jobs: jobs[0].count,
            interests: interests[0].count
        };
        
        console.log(`   Teachers: ${counts.teachers}`);
        console.log(`   Jobs: ${counts.jobs}`);
        console.log(`   Job Interests: ${counts.interests}\n`);
        
        return counts;
    } catch (error) {
        console.error('❌ Error counting records:', error.message);
        return { teachers: 0, jobs: 0, interests: 0 };
    }
}

// Migrate teachers
async function migrateTeachers(connection) {
    console.log('👥 Migrating teachers...');
    
    try {
        const [teachers] = await connection.query('SELECT * FROM teachers ORDER BY id');
        
        if (teachers.length === 0) {
            console.log('   No teachers to migrate.\n');
            return 0;
        }
        
        let migrated = 0;
        let skipped = 0;
        
        for (const teacher of teachers) {
            try {
                // Check if teacher already exists (by email)
                const { data: existing } = await supabase
                    .from('teachers')
                    .select('id')
                    .eq('email', teacher.email)
                    .single();
                
                if (existing) {
                    console.log(`   ⏭️  Skipping ${teacher.firstName} ${teacher.lastName} (already exists)`);
                    skipped++;
                    continue;
                }
                
                // Map MySQL columns to Supabase columns
                const { error } = await supabase
                    .from('teachers')
                    .insert({
                        first_name: teacher.firstName,
                        last_name: teacher.lastName,
                        email: teacher.email,
                        phone: teacher.phone,
                        nationality: teacher.nationality,
                        years_experience: teacher.yearsExperience,
                        education: teacher.education,
                        teaching_experience: teacher.teachingExperience,
                        subject_specialty: teacher.subjectSpecialty,
                        preferred_location: teacher.preferredLocation,
                        preferred_age_group: teacher.preferred_age_group,
                        intro_video_path: teacher.introVideoPath, // Note: video files won't be migrated automatically
                        additional_info: teacher.additionalInfo,
                        status: teacher.status || 'pending',
                        created_at: teacher.createdAt || new Date().toISOString(),
                        updated_at: teacher.updatedAt || new Date().toISOString()
                    });
                
                if (error) {
                    console.error(`   ❌ Error migrating ${teacher.firstName} ${teacher.lastName}:`, error.message);
                } else {
                    migrated++;
                    if (migrated % 10 === 0) {
                        console.log(`   ✅ Migrated ${migrated} teachers...`);
                    }
                }
            } catch (error) {
                console.error(`   ❌ Error migrating teacher ${teacher.id}:`, error.message);
            }
        }
        
        console.log(`   ✅ Migrated ${migrated} teachers, skipped ${skipped}\n`);
        return migrated;
    } catch (error) {
        console.error('❌ Error migrating teachers:', error.message);
        return 0;
    }
}

// Migrate jobs
async function migrateJobs(connection) {
    console.log('💼 Migrating jobs...');
    
    try {
        const [jobs] = await connection.query('SELECT * FROM jobs ORDER BY id');
        
        if (jobs.length === 0) {
            console.log('   No jobs to migrate.\n');
            return 0;
        }
        
        let migrated = 0;
        let skipped = 0;
        
        for (const job of jobs) {
            try {
                // Check if job already exists (by title + company)
                const { data: existing } = await supabase
                    .from('jobs')
                    .select('id')
                    .eq('title', job.title)
                    .eq('company', job.company)
                    .single();
                
                if (existing) {
                    console.log(`   ⏭️  Skipping ${job.title} at ${job.company} (already exists)`);
                    skipped++;
                    continue;
                }
                
                // Parse jobFunctions if it's a string
                let jobFunctions = job.jobFunctions;
                if (typeof jobFunctions === 'string') {
                    try {
                        jobFunctions = JSON.parse(jobFunctions);
                    } catch (e) {
                        // If parsing fails, keep as string
                    }
                }
                
                const { error } = await supabase
                    .from('jobs')
                    .insert({
                        title: job.title,
                        company: job.company,
                        location: job.location,
                        location_chinese: job.locationChinese,
                        salary: job.salary,
                        experience: job.experience,
                        chinese_required: job.chineseRequired || 'No',
                        qualification: job.qualification,
                        contract_type: job.contractType || 'Full Time',
                        job_functions: typeof jobFunctions === 'string' ? jobFunctions : JSON.stringify(jobFunctions),
                        description: job.description,
                        requirements: job.requirements,
                        benefits: job.benefits,
                        is_active: job.isActive !== undefined ? Boolean(job.isActive) : true,
                        is_new: job.isNew !== undefined ? Boolean(job.isNew) : true,
                        created_at: job.createdAt || new Date().toISOString(),
                        updated_at: job.updatedAt || new Date().toISOString()
                    });
                
                if (error) {
                    console.error(`   ❌ Error migrating ${job.title}:`, error.message);
                } else {
                    migrated++;
                }
            } catch (error) {
                console.error(`   ❌ Error migrating job ${job.id}:`, error.message);
            }
        }
        
        console.log(`   ✅ Migrated ${migrated} jobs, skipped ${skipped}\n`);
        return migrated;
    } catch (error) {
        console.error('❌ Error migrating jobs:', error.message);
        return 0;
    }
}

// Migrate job interests
async function migrateJobInterests(connection) {
    console.log('📝 Migrating job interests...');
    
    try {
        const [interests] = await connection.query('SELECT * FROM job_interests ORDER BY id');
        
        if (interests.length === 0) {
            console.log('   No job interests to migrate.\n');
            return 0;
        }
        
        let migrated = 0;
        let skipped = 0;
        
        for (const interest of interests) {
            try {
                // Check if already exists (by email + teachingSubject + createdAt)
                const { data: existing } = await supabase
                    .from('job_interests')
                    .select('id')
                    .eq('email', interest.email)
                    .eq('teaching_subject', interest.teachingSubject)
                    .eq('created_at', interest.createdAt)
                    .single();
                
                if (existing) {
                    skipped++;
                    continue;
                }
                
                const { error } = await supabase
                    .from('job_interests')
                    .insert({
                        first_name: interest.firstName,
                        last_name: interest.lastName,
                        email: interest.email,
                        phone: interest.phone,
                        preferred_location: interest.preferredLocation,
                        teaching_subject: interest.teachingSubject,
                        experience: interest.experience,
                        message: interest.message,
                        status: interest.status || 'new',
                        created_at: interest.createdAt || new Date().toISOString()
                    });
                
                if (error) {
                    console.error(`   ❌ Error migrating interest from ${interest.email}:`, error.message);
                } else {
                    migrated++;
                }
            } catch (error) {
                console.error(`   ❌ Error migrating job interest ${interest.id}:`, error.message);
            }
        }
        
        console.log(`   ✅ Migrated ${migrated} job interests, skipped ${skipped}\n`);
        return migrated;
    } catch (error) {
        console.error('❌ Error migrating job interests:', error.message);
        return 0;
    }
}

// Main migration function
async function migrate() {
    let connection;
    
    try {
        // Check connections
        connection = await checkMySQLConnection();
        await checkSupabaseConnection();
        
        // Get counts
        const counts = await getMySQLCounts(connection);
        
        if (counts.teachers === 0 && counts.jobs === 0 && counts.interests === 0) {
            console.log('ℹ️  No data to migrate. MySQL database is empty.\n');
            return;
        }
        
        // Confirm migration
        console.log('⚠️  This will migrate data from MySQL to Supabase.');
        console.log('   Existing Supabase records with matching emails/titles will be skipped.\n');
        
        // In a real scenario, you might want to add a confirmation prompt here
        // For now, we'll proceed automatically
        
        // Migrate data
        const teachersMigrated = await migrateTeachers(connection);
        const jobsMigrated = await migrateJobs(connection);
        const interestsMigrated = await migrateJobInterests(connection);
        
        // Summary
        console.log('📊 Migration Summary:');
        console.log(`   Teachers: ${teachersMigrated} migrated`);
        console.log(`   Jobs: ${jobsMigrated} migrated`);
        console.log(`   Job Interests: ${interestsMigrated} migrated\n`);
        
        console.log('✅ Migration completed!\n');
        console.log('⚠️  Note: Video files are not automatically migrated.');
        console.log('   If you have video files stored locally, you\'ll need to upload them manually to Supabase Storage.\n');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run migration
migrate();

