const path = require('path');

// Determine which database to use based on environment
const USE_MYSQL = process.env.MYSQL_HOST ? true : false;

class Database {
    constructor() {
        if (USE_MYSQL) {
            console.log('Initializing MySQL database connection...');
            this.initMySQL();
        } else {
            console.log('Initializing SQLite database connection...');
            this.initSQLite();
        }
    }

    initMySQL() {
        const mysql = require('mysql2/promise');

        this.pool = mysql.createPool({
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT || 3306,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        console.log('MySQL connection pool created');
        this.initMySQLTables();
    }

    initSQLite() {
        const sqlite3 = require('sqlite3').verbose();
        const DB_PATH = path.join(__dirname, 'teachers.db');

        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database');
                this.initSQLiteTables();
            }
        });
    }

    async initMySQLTables() {
        try {
            const connection = await this.pool.getConnection();

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
            console.log('Teachers table ready (MySQL)');

            await connection.query(createJobsTable);
            console.log('Jobs table ready (MySQL)');

            await connection.query(createJobInterestTable);
            console.log('Job interests table ready (MySQL)');

            connection.release();
        } catch (err) {
            console.error('Error creating MySQL tables:', err.message);
        }
    }

    initSQLiteTables() {
        const createTeachersTable = `
            CREATE TABLE IF NOT EXISTS teachers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                firstName TEXT NOT NULL,
                lastName TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                nationality TEXT NOT NULL,
                yearsExperience TEXT NOT NULL,
                education TEXT NOT NULL,
                teachingExperience TEXT NOT NULL,
                subjectSpecialty TEXT NOT NULL,
                preferredLocation TEXT,
                preferred_age_group TEXT,
                introVideoPath TEXT,
                additionalInfo TEXT,
                status TEXT DEFAULT 'pending',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createJobsTable = `
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                location TEXT NOT NULL,
                locationChinese TEXT,
                salary TEXT NOT NULL,
                experience TEXT NOT NULL,
                chineseRequired TEXT DEFAULT 'No',
                qualification TEXT NOT NULL,
                contractType TEXT DEFAULT 'Full Time',
                jobFunctions TEXT NOT NULL,
                description TEXT NOT NULL,
                requirements TEXT,
                benefits TEXT,
                isActive INTEGER DEFAULT 1,
                isNew INTEGER DEFAULT 1,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createJobInterestTable = `
            CREATE TABLE IF NOT EXISTS job_interests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                firstName TEXT NOT NULL,
                lastName TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                preferredLocation TEXT,
                teachingSubject TEXT NOT NULL,
                experience TEXT NOT NULL,
                message TEXT,
                status TEXT DEFAULT 'new',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        this.db.run(createTeachersTable, (err) => {
            if (err) {
                console.error('Error creating teachers table:', err.message);
            } else {
                console.log('Teachers table ready');
            }
        });

        this.db.run(createJobsTable, (err) => {
            if (err) {
                console.error('Error creating jobs table:', err.message);
            } else {
                console.log('Jobs table ready');
            }
        });

        this.db.run(createJobInterestTable, (err) => {
            if (err) {
                console.error('Error creating job interests table:', err.message);
            } else {
                console.log('Job interests table ready');
            }
        });
    }

    // Teacher methods
    addTeacher(teacherData) {
        if (USE_MYSQL) {
            return this.addTeacherMySQL(teacherData);
        } else {
            return this.addTeacherSQLite(teacherData);
        }
    }

    async addTeacherMySQL(teacherData) {
        const {
            firstName, lastName, email, phone, nationality,
            yearsExperience, education, teachingExperience,
            subjectSpecialty, preferredLocation, preferred_age_group,
            introVideoPath, additionalInfo
        } = teacherData;

        const sql = `
            INSERT INTO teachers (
                firstName, lastName, email, phone, nationality,
                yearsExperience, education, teachingExperience,
                subjectSpecialty, preferredLocation, preferred_age_group,
                introVideoPath, additionalInfo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            firstName, lastName, email, phone, nationality,
            yearsExperience, education, teachingExperience,
            subjectSpecialty, preferredLocation, preferred_age_group,
            introVideoPath, additionalInfo
        ];

        const [result] = await this.pool.query(sql, values);
        return { id: result.insertId, ...teacherData };
    }

    addTeacherSQLite(teacherData) {
        return new Promise((resolve, reject) => {
            const {
                firstName, lastName, email, phone, nationality,
                yearsExperience, education, teachingExperience,
                subjectSpecialty, preferredLocation, preferred_age_group,
                introVideoPath, additionalInfo
            } = teacherData;

            const sql = `
                INSERT INTO teachers (
                    firstName, lastName, email, phone, nationality,
                    yearsExperience, education, teachingExperience,
                    subjectSpecialty, preferredLocation, preferred_age_group,
                    introVideoPath, additionalInfo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                firstName, lastName, email, phone, nationality,
                yearsExperience, education, teachingExperience,
                subjectSpecialty, preferredLocation, preferred_age_group,
                introVideoPath, additionalInfo
            ];

            this.db.run(sql, values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...teacherData });
                }
            });
        });
    }

    getAllTeachers() {
        if (USE_MYSQL) {
            return this.getAllTeachersMySQL();
        } else {
            return this.getAllTeachersSQLite();
        }
    }

    async getAllTeachersMySQL() {
        const sql = 'SELECT * FROM teachers ORDER BY createdAt DESC';
        const [rows] = await this.pool.query(sql);
        return rows;
    }

    getAllTeachersSQLite() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM teachers ORDER BY createdAt DESC';
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    getTeacherById(id) {
        if (USE_MYSQL) {
            return this.getTeacherByIdMySQL(id);
        } else {
            return this.getTeacherByIdSQLite(id);
        }
    }

    async getTeacherByIdMySQL(id) {
        const sql = 'SELECT * FROM teachers WHERE id = ?';
        const [rows] = await this.pool.query(sql, [id]);
        return rows[0];
    }

    getTeacherByIdSQLite(id) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM teachers WHERE id = ?';
            this.db.get(sql, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    updateTeacherStatus(id, status) {
        if (USE_MYSQL) {
            return this.updateTeacherStatusMySQL(id, status);
        } else {
            return this.updateTeacherStatusSQLite(id, status);
        }
    }

    async updateTeacherStatusMySQL(id, status) {
        const sql = 'UPDATE teachers SET status = ? WHERE id = ?';
        const [result] = await this.pool.query(sql, [status, id]);
        return { id, status, changes: result.affectedRows };
    }

    updateTeacherStatusSQLite(id, status) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE teachers SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';
            this.db.run(sql, [status, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, status, changes: this.changes });
                }
            });
        });
    }

    deleteTeacher(id) {
        if (USE_MYSQL) {
            return this.deleteTeacherMySQL(id);
        } else {
            return this.deleteTeacherSQLite(id);
        }
    }

    async deleteTeacherMySQL(id) {
        const sql = 'DELETE FROM teachers WHERE id = ?';
        const [result] = await this.pool.query(sql, [id]);
        return { id, changes: result.affectedRows };
    }

    deleteTeacherSQLite(id) {
        return new Promise((resolve, reject) => {
            const sql = 'DELETE FROM teachers WHERE id = ?';
            this.db.run(sql, [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, changes: this.changes });
                }
            });
        });
    }

    // Job methods
    addJob(jobData) {
        if (USE_MYSQL) {
            return this.addJobMySQL(jobData);
        } else {
            return this.addJobSQLite(jobData);
        }
    }

    async addJobMySQL(jobData) {
        const {
            title, company, location, locationChinese, salary, experience,
            chineseRequired, qualification, contractType, jobFunctions,
            description, requirements, benefits
        } = jobData;

        const sql = `
            INSERT INTO jobs (
                title, company, location, locationChinese, salary, experience,
                chineseRequired, qualification, contractType, jobFunctions,
                description, requirements, benefits
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            title, company, location, locationChinese, salary, experience,
            chineseRequired, qualification, contractType, jobFunctions,
            description, requirements, benefits
        ];

        const [result] = await this.pool.query(sql, values);
        return { id: result.insertId, ...jobData };
    }

    addJobSQLite(jobData) {
        return new Promise((resolve, reject) => {
            const {
                title, company, location, locationChinese, salary, experience,
                chineseRequired, qualification, contractType, jobFunctions,
                description, requirements, benefits
            } = jobData;

            const sql = `
                INSERT INTO jobs (
                    title, company, location, locationChinese, salary, experience,
                    chineseRequired, qualification, contractType, jobFunctions,
                    description, requirements, benefits
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                title, company, location, locationChinese, salary, experience,
                chineseRequired, qualification, contractType, jobFunctions,
                description, requirements, benefits
            ];

            this.db.run(sql, values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...jobData });
                }
            });
        });
    }

    getAllJobs(activeOnly = true) {
        if (USE_MYSQL) {
            return this.getAllJobsMySQL(activeOnly);
        } else {
            return this.getAllJobsSQLite(activeOnly);
        }
    }

    async getAllJobsMySQL(activeOnly = true) {
        let sql = 'SELECT * FROM jobs';
        if (activeOnly) {
            sql += ' WHERE isActive = 1';
        }
        sql += ' ORDER BY createdAt DESC';

        const [rows] = await this.pool.query(sql);
        // Parse jobFunctions from JSON string
        const jobs = rows.map(job => ({
            ...job,
            jobFunctions: job.jobFunctions ? JSON.parse(job.jobFunctions) : []
        }));
        return jobs;
    }

    getAllJobsSQLite(activeOnly = true) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT * FROM jobs';
            if (activeOnly) {
                sql += ' WHERE isActive = 1';
            }
            sql += ' ORDER BY createdAt DESC';

            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Parse jobFunctions from JSON string
                    const jobs = rows.map(job => ({
                        ...job,
                        jobFunctions: job.jobFunctions ? JSON.parse(job.jobFunctions) : []
                    }));
                    resolve(jobs);
                }
            });
        });
    }

    getJobById(id) {
        if (USE_MYSQL) {
            return this.getJobByIdMySQL(id);
        } else {
            return this.getJobByIdSQLite(id);
        }
    }

    async getJobByIdMySQL(id) {
        const sql = 'SELECT * FROM jobs WHERE id = ?';
        const [rows] = await this.pool.query(sql, [id]);
        const job = rows[0];
        if (job) {
            job.jobFunctions = job.jobFunctions ? JSON.parse(job.jobFunctions) : [];
        }
        return job;
    }

    getJobByIdSQLite(id) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM jobs WHERE id = ?';
            this.db.get(sql, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    if (row) {
                        row.jobFunctions = row.jobFunctions ? JSON.parse(row.jobFunctions) : [];
                    }
                    resolve(row);
                }
            });
        });
    }

    updateJob(id, jobData) {
        if (USE_MYSQL) {
            return this.updateJobMySQL(id, jobData);
        } else {
            return this.updateJobSQLite(id, jobData);
        }
    }

    async updateJobMySQL(id, jobData) {
        const {
            title, company, location, locationChinese, salary, experience,
            chineseRequired, qualification, contractType, jobFunctions,
            description, requirements, benefits, isActive
        } = jobData;

        const sql = `
            UPDATE jobs SET
                title = ?, company = ?, location = ?, locationChinese = ?,
                salary = ?, experience = ?, chineseRequired = ?, qualification = ?,
                contractType = ?, jobFunctions = ?, description = ?, requirements = ?,
                benefits = ?, isActive = ?
            WHERE id = ?
        `;

        const values = [
            title, company, location, locationChinese, salary, experience,
            chineseRequired, qualification, contractType, jobFunctions,
            description, requirements, benefits, isActive, id
        ];

        const [result] = await this.pool.query(sql, values);
        return { id, changes: result.affectedRows };
    }

    updateJobSQLite(id, jobData) {
        return new Promise((resolve, reject) => {
            const {
                title, company, location, locationChinese, salary, experience,
                chineseRequired, qualification, contractType, jobFunctions,
                description, requirements, benefits, isActive
            } = jobData;

            const sql = `
                UPDATE jobs SET
                    title = ?, company = ?, location = ?, locationChinese = ?,
                    salary = ?, experience = ?, chineseRequired = ?, qualification = ?,
                    contractType = ?, jobFunctions = ?, description = ?, requirements = ?,
                    benefits = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            const values = [
                title, company, location, locationChinese, salary, experience,
                chineseRequired, qualification, contractType, jobFunctions,
                description, requirements, benefits, isActive, id
            ];

            this.db.run(sql, values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, changes: this.changes });
                }
            });
        });
    }

    deleteJob(id) {
        if (USE_MYSQL) {
            return this.deleteJobMySQL(id);
        } else {
            return this.deleteJobSQLite(id);
        }
    }

    async deleteJobMySQL(id) {
        const sql = 'DELETE FROM jobs WHERE id = ?';
        const [result] = await this.pool.query(sql, [id]);
        return { id, changes: result.affectedRows };
    }

    deleteJobSQLite(id) {
        return new Promise((resolve, reject) => {
            const sql = 'DELETE FROM jobs WHERE id = ?';
            this.db.run(sql, [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, changes: this.changes });
                }
            });
        });
    }

    // Job interest methods
    addJobInterest(interestData) {
        if (USE_MYSQL) {
            return this.addJobInterestMySQL(interestData);
        } else {
            return this.addJobInterestSQLite(interestData);
        }
    }

    async addJobInterestMySQL(interestData) {
        const {
            firstName, lastName, email, phone, preferredLocation,
            teachingSubject, experience, message
        } = interestData;

        const sql = `
            INSERT INTO job_interests (
                firstName, lastName, email, phone, preferredLocation,
                teachingSubject, experience, message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            firstName, lastName, email, phone, preferredLocation,
            teachingSubject, experience, message
        ];

        const [result] = await this.pool.query(sql, values);
        return { id: result.insertId, ...interestData };
    }

    addJobInterestSQLite(interestData) {
        return new Promise((resolve, reject) => {
            const {
                firstName, lastName, email, phone, preferredLocation,
                teachingSubject, experience, message
            } = interestData;

            const sql = `
                INSERT INTO job_interests (
                    firstName, lastName, email, phone, preferredLocation,
                    teachingSubject, experience, message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                firstName, lastName, email, phone, preferredLocation,
                teachingSubject, experience, message
            ];

            this.db.run(sql, values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...interestData });
                }
            });
        });
    }

    getAllJobInterests() {
        if (USE_MYSQL) {
            return this.getAllJobInterestsMySQL();
        } else {
            return this.getAllJobInterestsSQLite();
        }
    }

    async getAllJobInterestsMySQL() {
        const sql = 'SELECT * FROM job_interests ORDER BY createdAt DESC';
        const [rows] = await this.pool.query(sql);
        return rows;
    }

    getAllJobInterestsSQLite() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM job_interests ORDER BY createdAt DESC';
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    updateJobInterestStatus(id, status) {
        if (USE_MYSQL) {
            return this.updateJobInterestStatusMySQL(id, status);
        } else {
            return this.updateJobInterestStatusSQLite(id, status);
        }
    }

    async updateJobInterestStatusMySQL(id, status) {
        const sql = 'UPDATE job_interests SET status = ? WHERE id = ?';
        const [result] = await this.pool.query(sql, [status, id]);
        return { id, status, changes: result.affectedRows };
    }

    updateJobInterestStatusSQLite(id, status) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE job_interests SET status = ? WHERE id = ?';
            this.db.run(sql, [status, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, status, changes: this.changes });
                }
            });
        });
    }

    close() {
        if (USE_MYSQL) {
            this.pool.end().then(() => {
                console.log('MySQL connection pool closed');
            }).catch(err => {
                console.error('Error closing MySQL pool:', err.message);
            });
        } else {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

module.exports = Database;
