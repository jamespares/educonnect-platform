require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const path = require('path');

// Configuration
const SQLITE_DB_PATH = path.join(__dirname, 'teachers.db');

// Use public URL if available, otherwise use individual credentials
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

console.log('\n🔄 EduConnect Database Migration Tool\n');
console.log('================================\n');

// Check MySQL connection
async function checkMySQLConnection() {
    console.log('📡 Checking MySQL connection...');

    if (MYSQL_CONFIG.uri) {
        console.log(`   Using: MYSQL_PUBLIC_URL\n`);
    } else {
        console.log(`   Host: ${MYSQL_CONFIG.host}`);
        console.log(`   Port: ${MYSQL_CONFIG.port}`);
        console.log(`   Database: ${MYSQL_CONFIG.database}`);
        console.log(`   User: ${MYSQL_CONFIG.user}\n`);

        if (!MYSQL_CONFIG.host || !MYSQL_CONFIG.user || !MYSQL_CONFIG.password || !MYSQL_CONFIG.database) {
            console.error('❌ Missing MySQL credentials!');
            console.error('   Please set MYSQL_PUBLIC_URL or individual credentials in your .env file');
            process.exit(1);
        }
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

// Check MySQL tables
async function checkMySQLTables(connection) {
    console.log('🔍 Checking MySQL tables...\n');

    try {
        // Check teachers table
        const [teachersSchema] = await connection.query(`
            DESCRIBE teachers
        `);
        console.log('✅ Teachers table exists with columns:');
        teachersSchema.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type})`);
        });
        console.log();

        // Check jobs table
        const [jobsSchema] = await connection.query(`
            DESCRIBE jobs
        `);
        console.log('✅ Jobs table exists with columns:');
        jobsSchema.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type})`);
        });
        console.log();

        // Check job_interests table
        const [interestsSchema] = await connection.query(`
            DESCRIBE job_interests
        `);
        console.log('✅ Job interests table exists with columns:');
        interestsSchema.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type})`);
        });
        console.log();

        return true;
    } catch (error) {
        console.error('❌ Error checking tables:', error.message);
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
                        console.log(`   ✓ Migrated: ${teacher.firstName} ${teacher.lastName}`);
                    } catch (error) {
                        if (error.code === 'ER_DUP_ENTRY') {
                            console.log(`   ⚠ Skipped duplicate: ${teacher.email}`);
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
                    console.log(`   ✓ Migrated: ${job.title} at ${job.company}`);
                }

                db.close();
                console.log('✅ Jobs migration complete!\n');
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
                    console.log(`   ✓ Migrated: ${interest.firstName} ${interest.lastName}`);
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
async function migrate() {
    try {
        // Step 1: Check MySQL connection
        const connection = await checkMySQLConnection();

        // Step 2: Check MySQL tables
        const tablesExist = await checkMySQLTables(connection);
        if (!tablesExist) {
            console.error('❌ Required tables do not exist in MySQL!');
            console.error('   Please deploy your application first so tables are created.');
            process.exit(1);
        }

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

        // Step 4: Confirm migration
        console.log('⚠️  This will copy all data from SQLite to MySQL.');
        console.log('   Duplicate entries will be skipped.\n');

        // Step 5: Migrate data
        await migrateTeachers(connection);
        await migrateJobs(connection);
        await migrateJobInterests(connection);

        // Step 6: Show final counts
        const mysqlCountsAfter = await getMySQLCounts(connection);
        console.log('📊 Final MySQL data counts:\n');
        console.log(`   Teachers: ${mysqlCountsAfter.teachers}`);
        console.log(`   Jobs: ${mysqlCountsAfter.jobs}`);
        console.log(`   Job Interests: ${mysqlCountsAfter.job_interests}\n`);

        console.log('✅ Migration completed successfully!\n');

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run migration
migrate();
