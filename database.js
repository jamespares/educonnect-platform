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

        this.db.run(createTeachersTable, (err) => {
            if (err) {
                console.error('Error creating teachers table:', err.message);
            } else {
                console.log('Teachers table ready');
            }
        });
    }

    addTeacher(teacherData) {
        return new Promise((resolve, reject) => {
            const {
                firstName, lastName, email, phone, nationality,
                yearsExperience, education, teachingExperience,
                subjectSpecialty, preferredLocation, introVideoPath,
                additionalInfo
            } = teacherData;

            const sql = `
                INSERT INTO teachers (
                    firstName, lastName, email, phone, nationality,
                    yearsExperience, education, teachingExperience,
                    subjectSpecialty, preferredLocation, introVideoPath,
                    additionalInfo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                firstName, lastName, email, phone, nationality,
                yearsExperience, education, teachingExperience,
                subjectSpecialty, preferredLocation, introVideoPath,
                additionalInfo
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