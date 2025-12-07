require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const path = require('path');

// Configuration
const SQLITE_DB_PATH = path.join(__dirname, 'teachers.db');
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

console.log('\n🔄 EduConnect Database Setup & Migration Tool\n');
console.log('============================================\n');

// Check MySQL connection
async function checkMySQLConnection() {
    console.log('📡 Connecting to MySQL...');

    if (MYSQL_CONFIG.uri) {
        console.log(`   Using: MYSQL_PUBLIC_URL\n`);
    } else {
        console.log(`   Host: ${MYSQL_CONFIG.host}`);
        console.log(`   Port: ${MYSQL_CONFIG.port}`);
        console.log(`   Database: ${MYSQL_CONFIG.database}\n`);
    }

    try {
        const connection = await mysql.createConnection(MYSQL_CONFIG);
        console.log('✅ MySQL connection successful!\n');
        return connection;
    } catch (error) {
        console.error('❌ MySQL connection failed:', error.message);
        process.exit(1);
    }
}

// Create MySQL tables
async function createMySQLTables(connection) {
    console.log('🔨 Creating MySQL tables...\n');

    try {
        const createTeachersTable = `
            CREATE TABLE IF NOT EXISTS teachers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                firstName VARCHAR(255) NOT NULL,
                lastName VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(50) NOT NULL,
                nationality VARCHAR(100) NOT NULL,
                yearsExperience VARCHAR(50) NOT NULL,
                education TEXT NOT NULL,
                teachingExperience TEXT NOT NULL,
                subjectSpecialty VARCHAR(255) NOT NULL,
                preferredLocation VARCHAR(255),
                preferred_age_group VARCHAR(255),
                introVideoPath VARCHAR(500),
                additionalInfo TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;

        const createJobsTable = `
            CREATE TABLE IF NOT EXISTS jobs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                company VARCHAR(255) NOT NULL,
                location VARCHAR(255) NOT NULL,
                locationChinese VARCHAR(255),
                salary VARCHAR(255) NOT NULL,
                experience VARCHAR(255) NOT NULL,
                chineseRequired VARCHAR(50) DEFAULT 'No',
                qualification VARCHAR(255) NOT NULL,
                contractType VARCHAR(100) DEFAULT 'Full Time',
                jobFunctions TEXT NOT NULL,
                description TEXT NOT NULL,
                requirements TEXT,
                benefits TEXT,
                isActive TINYINT(1) DEFAULT 1,
                isNew TINYINT(1) DEFAULT 1,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;

        const createJobInterestTable = `
            CREATE TABLE IF NOT EXISTS job_interests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                firstName VARCHAR(255) NOT NULL,
                lastName VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                preferredLocation VARCHAR(255),
                teachingSubject VARCHAR(255) NOT NULL,
                experience VARCHAR(255) NOT NULL,
                message TEXT,
                status VARCHAR(50) DEFAULT 'new',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await connection.query(createTeachersTable);
        console.log('✅ Teachers table created');

        await connection.query(createJobsTable);
        console.log('✅ Jobs table created');

        await connection.query(createJobInterestTable);
        console.log('✅ Job interests table created\n');

        return true;
    } catch (err) {
        console.error('❌ Error creating MySQL tables:', err.message);
        return false;
    }
}

// Get SQLite data counts
async function getSQLiteCounts() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                reject(err);
                return;
            }

            const counts = {};

            db.get('SELECT COUNT(*) as count FROM teachers', (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                counts.teachers = row.count;

                db.get('SELECT COUNT(*) as count FROM jobs', (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    counts.jobs = row.count;

                    db.get('SELECT COUNT(*) as count FROM job_interests', (err, row) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        counts.job_interests = row.count;

                        db.close();
                        resolve(counts);
                    });
                });
            });
        });
    });
}

// Get MySQL data counts
async function getMySQLCounts(connection) {
    const [teachersCount] = await connection.query('SELECT COUNT(*) as count FROM teachers');
    const [jobsCount] = await connection.query('SELECT COUNT(*) as count FROM jobs');
    const [interestsCount] = await connection.query('SELECT COUNT(*) as count FROM job_interests');

    return {
        teachers: teachersCount[0].count,
        jobs: jobsCount[0].count,
        job_interests: interestsCount[0].count
    };
}

// Migrate teachers
async function migrateTeachers(connection) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY);

        db.all('SELECT * FROM teachers', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            console.log(`📦 Migrating ${rows.length} teachers...`);

            try {
                for (const teacher of rows) {
                    const sql = `
                        INSERT INTO teachers (
                            firstName, lastName, email, phone, nationality,
                            yearsExperience, education, teachingExperience,
                            subjectSpecialty, preferredLocation, preferred_age_group,
                            introVideoPath, additionalInfo, status, createdAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const values = [
                        teacher.firstName,
                        teacher.lastName,
                        teacher.email,
                        teacher.phone,
                        teacher.nationality,
                        teacher.yearsExperience,
                        teacher.education,
                        teacher.teachingExperience,
                        teacher.subjectSpecialty,
                        teacher.preferredLocation,
                        teacher.preferred_age_group,
                        teacher.introVideoPath,
                        teacher.additionalInfo,
                        teacher.status || 'pending',
                        teacher.createdAt
                    ];

                    try {
                        await connection.query(sql, values);
                        console.log(`   ✓ ${teacher.firstName} ${teacher.lastName}`);
                    } catch (error) {
                        if (error.code === 'ER_DUP_ENTRY') {
                            console.log(`   ⚠ Skipped (duplicate): ${teacher.email}`);
                        } else {
                            throw error;
                        }
                    }
                }

                db.close();
                console.log('✅ Teachers migration complete!\n');
                resolve();
            } catch (error) {
                db.close();
                reject(error);
            }
        });
    });
}

// Migrate jobs
async function migrateJobs(connection) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY);

        db.all('SELECT * FROM jobs', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            console.log(`📦 Migrating ${rows.length} jobs...`);

            try {
                let migrated = 0;
                for (const job of rows) {
                    const sql = `
                        INSERT INTO jobs (
                            title, company, location, locationChinese, salary, experience,
                            chineseRequired, qualification, contractType, jobFunctions,
                            description, requirements, benefits, isActive, isNew, createdAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const values = [
                        job.title,
                        job.company,
                        job.location,
                        job.locationChinese,
                        job.salary,
                        job.experience,
                        job.chineseRequired || 'No',
                        job.qualification,
                        job.contractType || 'Full Time',
                        job.jobFunctions,
                        job.description,
                        job.requirements,
                        job.benefits,
                        job.isActive !== undefined ? job.isActive : 1,
                        job.isNew !== undefined ? job.isNew : 1,
                        job.createdAt
                    ];

                    await connection.query(sql, values);
                    migrated++;
                    if (migrated % 10 === 0) {
                        console.log(`   ✓ Migrated ${migrated}/${rows.length} jobs...`);
                    }
                }

                db.close();
                console.log(`✅ Jobs migration complete! (${migrated} jobs)\n`);
                resolve();
            } catch (error) {
                db.close();
                reject(error);
            }
        });
    });
}

// Migrate job interests
async function migrateJobInterests(connection) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY);

        db.all('SELECT * FROM job_interests', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            console.log(`📦 Migrating ${rows.length} job interests...`);

            try {
                for (const interest of rows) {
                    // Skip invalid data (firstName too long)
                    if (interest.firstName && interest.firstName.length > 255) {
                        console.log(`   ⚠ Skipped (invalid data): ${interest.email}`);
                        continue;
                    }

                    const sql = `
                        INSERT INTO job_interests (
                            firstName, lastName, email, phone, preferredLocation,
                            teachingSubject, experience, message, status, createdAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const values = [
                        interest.firstName,
                        interest.lastName,
                        interest.email,
                        interest.phone,
                        interest.preferredLocation,
                        interest.teachingSubject,
                        interest.experience,
                        interest.message,
                        interest.status || 'new',
                        interest.createdAt
                    ];

                    await connection.query(sql, values);
                    console.log(`   ✓ ${interest.firstName} ${interest.lastName}`);
                }

                db.close();
                console.log('✅ Job interests migration complete!\n');
                resolve();
            } catch (error) {
                db.close();
                reject(error);
            }
        });
    });
}

// Main migration function
async function setupAndMigrate() {
    try {
        // Step 1: Connect to MySQL
        const connection = await checkMySQLConnection();

        // Step 2: Create tables
        await createMySQLTables(connection);

        // Step 3: Show current counts
        console.log('📊 Current data counts:\n');

        const sqliteCounts = await getSQLiteCounts();
        console.log('SQLite (source):');
        console.log(`   Teachers: ${sqliteCounts.teachers}`);
        console.log(`   Jobs: ${sqliteCounts.jobs}`);
        console.log(`   Job Interests: ${sqliteCounts.job_interests}\n`);

        const mysqlCountsBefore = await getMySQLCounts(connection);
        console.log('MySQL (destination - before):');
        console.log(`   Teachers: ${mysqlCountsBefore.teachers}`);
        console.log(`   Jobs: ${mysqlCountsBefore.jobs}`);
        console.log(`   Job Interests: ${mysqlCountsBefore.job_interests}\n`);

        // Step 4: Migrate data
        console.log('🚀 Starting migration...\n');
        await migrateTeachers(connection);
        await migrateJobs(connection);
        await migrateJobInterests(connection);

        // Step 5: Show final counts
        const mysqlCountsAfter = await getMySQLCounts(connection);
        console.log('📊 Final MySQL data counts:\n');
        console.log(`   Teachers: ${mysqlCountsAfter.teachers}`);
        console.log(`   Jobs: ${mysqlCountsAfter.jobs}`);
        console.log(`   Job Interests: ${mysqlCountsAfter.job_interests}\n`);

        console.log('✅ Setup and migration completed successfully!\n');

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run migration
setupAndMigrate();
