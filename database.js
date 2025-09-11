const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'teachers.db');

class Database {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database');
                this.initTables();
            }
        });
    }

    initTables() {
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

        // Add preferred_age_group column if it doesn't exist (for existing databases)
        this.db.run(`ALTER TABLE teachers ADD COLUMN preferred_age_group TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding preferred_age_group column:', err.message);
            } else if (!err) {
                console.log('preferred_age_group column added to teachers table');
            }
        });
    }

    addTeacher(teacherData) {
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

    // Job management methods
    addJob(jobData) {
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

    // Job interest management methods
    addJobInterest(interestData) {
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
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

module.exports = Database;