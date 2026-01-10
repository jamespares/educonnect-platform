const { createClient } = require('@supabase/supabase-js');

class SupabaseDatabase {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for server-side operations
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
        // Default buckets for different file types
        this.storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'intro-videos'; // For videos/photos
        this.cvBucket = process.env.SUPABASE_CV_BUCKET || 'cvs'; // For CV/resume uploads
        
        console.log('✅ Supabase client initialized');
        console.log('   - Storage bucket (videos/photos):', this.storageBucket);
        console.log('   - CV bucket:', this.cvBucket);
    }

    // Teacher methods
    async addTeacher(teacherData) {
        const { data, error } = await this.supabase
            .from('teachers')
            .insert({
                first_name: teacherData.firstName,
                last_name: teacherData.lastName,
                email: teacherData.email,
                phone: teacherData.phone,
                nationality: teacherData.nationality,
                years_experience: teacherData.yearsExperience,
                education: teacherData.education,
                teaching_experience: teacherData.teachingExperience,
                subject_specialty: teacherData.subjectSpecialty,
                preferred_location: teacherData.preferredLocation,
                preferred_age_group: teacherData.preferred_age_group,
                intro_video_path: teacherData.introVideoPath,
                headshot_photo_path: teacherData.headshotPhotoPath,
                linkedin: teacherData.linkedin,
                instagram: teacherData.instagram,
                wechat_id: teacherData.wechatId,
                professional_experience: teacherData.professionalExperience,
                additional_info: teacherData.additionalInfo,
                cv_path: teacherData.cvPath || null
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to add teacher: ${error.message}`);
        }

        // Map back to camelCase for consistency
        return this.mapTeacherToCamelCase(data);
    }

    async getAllTeachers() {
        const { data, error } = await this.supabase
            .from('teachers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to get teachers: ${error.message}`);
        }

        return data.map(teacher => this.mapTeacherToCamelCase(teacher));
    }

    async getTeacherById(id) {
        const { data, error } = await this.supabase
            .from('teachers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error(`Failed to get teacher: ${error.message}`);
        }

        return this.mapTeacherToCamelCase(data);
    }

    async updateTeacherStatus(id, status) {
        const { data, error } = await this.supabase
            .from('teachers')
            .update({ status: status })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update teacher status: ${error.message}`);
        }

        return { id, status, changes: 1 };
    }

    async deleteTeacher(id) {
        // First get the teacher to check for video file
        const teacher = await this.getTeacherById(id);
        
        // Delete video from storage if exists
        if (teacher && teacher.introVideoPath) {
            try {
                const fileName = teacher.introVideoPath.split('/').pop();
                await this.supabase.storage
                    .from(this.storageBucket)
                    .remove([fileName]);
            } catch (error) {
                console.error('Error deleting video file:', error);
                // Continue with database deletion even if file deletion fails
            }
        }

        const { error } = await this.supabase
            .from('teachers')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete teacher: ${error.message}`);
        }

        return { id, changes: 1 };
    }

    // Job methods
    async addJob(jobData) {
        const { data, error } = await this.supabase
            .from('jobs')
            .insert({
                title: jobData.title,
                company: jobData.company,
                location: jobData.location,
                location_chinese: jobData.locationChinese,
                city: jobData.city,
                province: jobData.province,
                salary: jobData.salary,
                experience: jobData.experience,
                chinese_required: jobData.chineseRequired,
                qualification: jobData.qualification,
                contract_type: jobData.contractType,
                job_functions: typeof jobData.jobFunctions === 'string' 
                    ? jobData.jobFunctions 
                    : JSON.stringify(jobData.jobFunctions),
                age_groups: jobData.ageGroups || [],
                subjects: jobData.subjects || [],
                school_id: jobData.schoolId || null,
                description: jobData.description,
                requirements: jobData.requirements,
                benefits: jobData.benefits
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to add job: ${error.message}`);
        }

        return this.mapJobToCamelCase(data);
    }

    async getAllJobs(activeOnly = true) {
        let query = this.supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to get jobs: ${error.message}`);
        }

        return data.map(job => this.mapJobToCamelCase(job));
    }

    async getJobById(id) {
        const { data, error } = await this.supabase
            .from('jobs')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error(`Failed to get job: ${error.message}`);
        }

        return this.mapJobToCamelCase(data);
    }

    async updateJob(id, jobData) {
        const updateData = {
            title: jobData.title,
            company: jobData.company,
            location: jobData.location,
            location_chinese: jobData.locationChinese,
            city: jobData.city,
            province: jobData.province,
            salary: jobData.salary,
            experience: jobData.experience,
            chinese_required: jobData.chineseRequired,
            qualification: jobData.qualification,
            contract_type: jobData.contractType,
            job_functions: typeof jobData.jobFunctions === 'string' 
                ? jobData.jobFunctions 
                : JSON.stringify(jobData.jobFunctions),
            age_groups: jobData.ageGroups || [],
            subjects: jobData.subjects || [],
            school_id: jobData.schoolId || null,
            description: jobData.description,
            requirements: jobData.requirements,
            benefits: jobData.benefits,
            is_active: jobData.isActive
        };

        const { error } = await this.supabase
            .from('jobs')
            .update(updateData)
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to update job: ${error.message}`);
        }

        return { id, changes: 1 };
    }

    async deleteJob(id) {
        const { error } = await this.supabase
            .from('jobs')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete job: ${error.message}`);
        }

        return { id, changes: 1 };
    }

    // Job interest methods
    async addJobInterest(interestData) {
        const { data, error } = await this.supabase
            .from('job_interests')
            .insert({
                first_name: interestData.firstName,
                last_name: interestData.lastName,
                email: interestData.email,
                phone: interestData.phone,
                preferred_location: interestData.preferredLocation,
                teaching_subject: interestData.teachingSubject,
                experience: interestData.experience,
                message: interestData.message
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to add job interest: ${error.message}`);
        }

        return { id: data.id, ...interestData };
    }

    async getAllJobInterests() {
        const { data, error } = await this.supabase
            .from('job_interests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to get job interests: ${error.message}`);
        }

        return data;
    }

    async updateJobInterestStatus(id, status) {
        const { error } = await this.supabase
            .from('job_interests')
            .update({ status: status })
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to update job interest status: ${error.message}`);
        }

        return { id, status, changes: 1 };
    }

    // Storage methods for video uploads
    async uploadVideo(file, fileName) {
        try {
            // file is a multer file object with buffer property
            const fileBuffer = file.buffer || file;
            const contentType = file.mimetype || 'video/mp4';
            const fileSize = fileBuffer.length || file.size || 0;
            
            console.log(`📤 Uploading video to Supabase Storage: ${fileName}`);
            console.log(`   - Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   - Content type: ${contentType}`);
            console.log(`   - Bucket: ${this.storageBucket}`);

            const { data, error } = await this.supabase.storage
                .from(this.storageBucket)
                .upload(fileName, fileBuffer, {
                    contentType: contentType,
                    upsert: false,
                    cacheControl: '3600'
                });

            if (error) {
                console.error('❌ Supabase storage upload error:', error);
                throw new Error(`Failed to upload video to Supabase: ${error.message} (Code: ${error.statusCode || 'unknown'})`);
            }

            console.log(`✅ Video uploaded successfully: ${data.path}`);

            // Get public URL
            const { data: urlData } = this.supabase.storage
                .from(this.storageBucket)
                .getPublicUrl(data.path);

            return {
                path: data.path,
                url: urlData.publicUrl
            };
        } catch (error) {
            console.error('❌ Error in uploadVideo:', error);
            throw error;
        }
    }

    // Storage methods for photo uploads
    async uploadPhoto(file, fileName) {
        try {
            // file is a multer file object with buffer property
            const fileBuffer = file.buffer || file;
            const contentType = file.mimetype || 'image/jpeg';
            const fileSize = fileBuffer.length || file.size || 0;
            
            console.log(`📤 Uploading photo to Supabase Storage: ${fileName}`);
            console.log(`   - Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   - Content type: ${contentType}`);
            console.log(`   - Bucket: ${this.storageBucket}`);

            const { data, error } = await this.supabase.storage
                .from(this.storageBucket)
                .upload(fileName, fileBuffer, {
                    contentType: contentType,
                    upsert: false,
                    cacheControl: '3600'
                });

            if (error) {
                console.error('❌ Supabase storage upload error:', error);
                throw new Error(`Failed to upload photo to Supabase: ${error.message} (Code: ${error.statusCode || 'unknown'})`);
            }

            console.log(`✅ Photo uploaded successfully: ${data.path}`);

            // Get public URL
            const { data: urlData } = this.supabase.storage
                .from(this.storageBucket)
                .getPublicUrl(data.path);

            return {
                path: data.path,
                url: urlData.publicUrl
            };
        } catch (error) {
            console.error('❌ Error in uploadPhoto:', error);
            throw error;
        }
    }

    // Upload CV/resume file
    async uploadCV(file, fileName) {
        try {
            const fileBuffer = file.buffer || file;
            const contentType = file.mimetype || 'application/pdf';
            const fileSize = fileBuffer.length || file.size || 0;
            
            console.log(`📤 Uploading CV to Supabase Storage: ${fileName}`);
            console.log(`   - Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   - Content type: ${contentType}`);
            console.log(`   - Bucket: ${this.cvBucket}`);

            const { data, error } = await this.supabase.storage
                .from(this.cvBucket)
                .upload(fileName, fileBuffer, {
                    contentType: contentType,
                    upsert: false,
                    cacheControl: '3600'
                });

            if (error) {
                console.error('❌ Supabase storage upload error:', error);
                throw new Error(`Failed to upload CV to Supabase: ${error.message} (Code: ${error.statusCode || 'unknown'})`);
            }

            console.log(`✅ CV uploaded successfully: ${data.path}`);

            // Get signed URL (CVs should be private, not public)
            // Note: Signed URLs work for both public and private buckets
            // For private buckets, signed URLs are required for access
            const { data: urlData, error: urlError } = await this.supabase.storage
                .from(this.cvBucket)
                .createSignedUrl(data.path, 31536000); // 1 year expiry

            if (urlError) {
                console.warn('⚠️ Could not create signed URL for CV:', urlError);
                // If signed URL fails, we can still store the path and generate URL when needed
            }

            return {
                path: data.path,
                url: urlData?.signedUrl || null // Use signed URL for secure access
            };
        } catch (error) {
            console.error('❌ Error in uploadCV:', error);
            throw error;
        }
    }

    async getVideoUrl(filePath) {
        const { data } = this.supabase.storage
            .from(this.storageBucket)
            .getPublicUrl(filePath);

        return data.publicUrl;
    }

    async getPhotoUrl(filePath) {
        const { data } = this.supabase.storage
            .from(this.storageBucket)
            .getPublicUrl(filePath);

        return data.publicUrl;
    }

    // Get signed URL for CV file (CVs are stored in private bucket)
    async getCVUrl(cvPath) {
        if (!cvPath) {
            return null;
        }
        
        try {
            const { data, error } = await this.supabase.storage
                .from(this.cvBucket)
                .createSignedUrl(cvPath, 3600); // 1 hour expiry for security
            
            if (error) {
                console.error('Error creating signed URL for CV:', error);
                return null;
            }
            
            return data.signedUrl;
        } catch (error) {
            console.error('Error getting CV URL:', error);
            return null;
        }
    }

    // Helper methods to map between snake_case (Supabase) and camelCase (application)
    mapTeacherToCamelCase(teacher) {
        return {
            id: teacher.id,
            firstName: teacher.first_name,
            lastName: teacher.last_name,
            email: teacher.email,
            phone: teacher.phone,
            nationality: teacher.nationality,
            yearsExperience: teacher.years_experience,
            education: teacher.education,
            teachingExperience: teacher.teaching_experience,
            subjectSpecialty: teacher.subject_specialty,
            preferredLocation: teacher.preferred_location,
            preferred_age_group: teacher.preferred_age_group,
            introVideoPath: teacher.intro_video_path,
            headshotPhotoPath: teacher.headshot_photo_path,
            linkedin: teacher.linkedin,
            instagram: teacher.instagram,
            wechatId: teacher.wechat_id,
            professionalExperience: teacher.professional_experience,
            additionalInfo: teacher.additional_info,
            cvPath: teacher.cv_path,
            status: teacher.status,
            createdAt: teacher.created_at,
            updatedAt: teacher.updated_at
        };
    }

    mapJobToCamelCase(job) {
        // Helper function to safely parse array fields
        const parseArrayField = (value) => {
            if (!value) return [];
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
                // Try parsing as JSON first
                try {
                    const parsed = JSON.parse(value);
                    return Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                    // If not JSON, try splitting by comma
                    if (value.includes(',')) {
                        return value.split(',').map(s => s.trim()).filter(s => s);
                    }
                    // Single value, return as array
                    return value.trim() ? [value.trim()] : [];
                }
            }
            return [];
        };

        return {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            locationChinese: job.location_chinese,
            city: job.city,
            province: job.province,
            salary: job.salary,
            experience: job.experience,
            chineseRequired: job.chinese_required,
            qualification: job.qualification,
            contractType: job.contract_type,
            jobFunctions: parseArrayField(job.job_functions),
            ageGroups: parseArrayField(job.age_groups),
            subjects: parseArrayField(job.subjects),
            schoolId: job.school_id,
            description: job.description,
            requirements: job.requirements,
            benefits: job.benefits,
            isActive: job.is_active,
            isNew: job.is_new,
            createdAt: job.created_at,
            updatedAt: job.updated_at
        };
    }

    // Staff authentication methods
    async getStaffByUsername(username) {
        const { data, error } = await this.supabase
            .from('staff')
            .select('*')
            .eq('username', username)
            .eq('is_active', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error(`Failed to get staff: ${error.message}`);
        }

        return {
            id: data.id,
            username: data.username,
            passwordHash: data.password_hash,
            fullName: data.full_name,
            role: data.role,
            isActive: data.is_active,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    async getAllStaff() {
        const { data, error } = await this.supabase
            .from('staff')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to get staff: ${error.message}`);
        }

        return data.map(staff => ({
            id: staff.id,
            username: staff.username,
            fullName: staff.full_name,
            role: staff.role,
            isActive: staff.is_active,
            createdAt: staff.created_at,
            updatedAt: staff.updated_at
        }));
    }

    async addStaff(staffData) {
        const { data, error } = await this.supabase
            .from('staff')
            .insert({
                username: staffData.username,
                password_hash: staffData.passwordHash,
                full_name: staffData.fullName,
                role: staffData.role || 'staff',
                is_active: staffData.isActive !== undefined ? staffData.isActive : true
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to add staff: ${error.message}`);
        }

        return {
            id: data.id,
            username: data.username,
            fullName: data.full_name,
            role: data.role,
            isActive: data.is_active,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    async updateStaff(id, updateData) {
        const updateFields = {};
        
        if (updateData.passwordHash) {
            updateFields.password_hash = updateData.passwordHash;
        }
        if (updateData.fullName !== undefined) {
            updateFields.full_name = updateData.fullName;
        }
        if (updateData.isActive !== undefined) {
            updateFields.is_active = updateData.isActive;
        }

        const { error } = await this.supabase
            .from('staff')
            .update(updateFields)
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to update staff: ${error.message}`);
        }

        return { id, changes: 1 };
    }

    async deleteStaff(id) {
        const { error } = await this.supabase
            .from('staff')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete staff: ${error.message}`);
        }

        return { id, changes: 1 };
    }

    // School methods
    async addSchool(schoolData) {
        const { data, error } = await this.supabase
            .from('schools')
            .insert({
                name: schoolData.name,
                name_chinese: schoolData.nameChinese,
                location: schoolData.location,
                location_chinese: schoolData.locationChinese,
                city: schoolData.city,
                province: schoolData.province,
                school_type: schoolData.schoolType,
                age_groups: schoolData.ageGroups || [],
                subjects_needed: schoolData.subjectsNeeded || [],
                experience_required: schoolData.experienceRequired,
                chinese_required: schoolData.chineseRequired || false,
                salary_range: schoolData.salaryRange,
                contract_type: schoolData.contractType,
                benefits: schoolData.benefits,
                description: schoolData.description,
                contact_name: schoolData.contactName,
                contact_email: schoolData.contactEmail,
                contact_phone: schoolData.contactPhone,
                is_active: schoolData.isActive !== undefined ? schoolData.isActive : true
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to add school: ${error.message}`);
        }

        return this.mapSchoolToCamelCase(data);
    }

    async getAllSchools(activeOnly = false) {
        let query = this.supabase
            .from('schools')
            .select('*')
            .order('created_at', { ascending: false });

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to get schools: ${error.message}`);
        }

        return data.map(school => this.mapSchoolToCamelCase(school));
    }

    async getSchoolById(id) {
        const { data, error } = await this.supabase
            .from('schools')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error(`Failed to get school: ${error.message}`);
        }

        return this.mapSchoolToCamelCase(data);
    }

    async updateSchool(id, schoolData) {
        const updateData = {
            name: schoolData.name,
            name_chinese: schoolData.nameChinese,
            location: schoolData.location,
            location_chinese: schoolData.locationChinese,
            city: schoolData.city,
            province: schoolData.province,
            school_type: schoolData.schoolType,
            age_groups: schoolData.ageGroups || [],
            subjects_needed: schoolData.subjectsNeeded || [],
            experience_required: schoolData.experienceRequired,
            chinese_required: schoolData.chineseRequired,
            salary_range: schoolData.salaryRange,
            contract_type: schoolData.contractType,
            benefits: schoolData.benefits,
            description: schoolData.description,
            contact_name: schoolData.contactName,
            contact_email: schoolData.contactEmail,
            contact_phone: schoolData.contactPhone,
            is_active: schoolData.isActive
        };

        const { error } = await this.supabase
            .from('schools')
            .update(updateData)
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to update school: ${error.message}`);
        }

        return { id, changes: 1 };
    }

    async deleteSchool(id) {
        const { error } = await this.supabase
            .from('schools')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete school: ${error.message}`);
        }

        return { id, changes: 1 };
    }

    // Matching methods
    async findMatchesForTeacher(teacherId) {
        // Get teacher data
        const teacher = await this.getTeacherById(teacherId);
        if (!teacher) {
            throw new Error('Teacher not found');
        }

        // Get all active schools
        const schools = await this.getAllSchools(true);

        // Calculate matches
        const matches = [];
        for (const school of schools) {
            const matchResult = this.calculateMatchScore(teacher, school);
            if (matchResult.score > 0) {
                matches.push({
                    schoolId: school.id,
                    school: school,
                    score: matchResult.score,
                    reasons: matchResult.reasons
                });
            }
        }

        // Sort by score descending
        matches.sort((a, b) => b.score - a.score);

        return matches;
    }

    async findMatchesForSchool(schoolId) {
        // Get school data
        const school = await this.getSchoolById(schoolId);
        if (!school) {
            throw new Error('School not found');
        }

        // Get all teachers
        const teachers = await this.getAllTeachers();

        // Calculate matches
        const matches = [];
        for (const teacher of teachers) {
            const matchResult = this.calculateMatchScore(teacher, school);
            if (matchResult.score > 0) {
                matches.push({
                    teacherId: teacher.id,
                    teacher: teacher,
                    score: matchResult.score,
                    reasons: matchResult.reasons
                });
            }
        }

        // Sort by score descending
        matches.sort((a, b) => b.score - a.score);

        return matches;
    }

    calculateMatchScore(teacher, school) {
        let score = 0;
        const reasons = [];

        // Location matching (40 points)
        if (teacher.preferredLocation && school.location) {
            const teacherLoc = teacher.preferredLocation.toLowerCase();
            const schoolLoc = school.location.toLowerCase();
            const schoolCity = school.city ? school.city.toLowerCase() : '';
            
            if (teacherLoc === schoolLoc || teacherLoc === schoolCity) {
                score += 40;
                reasons.push('Location preference matches');
            } else if (schoolCity && teacherLoc.includes(schoolCity)) {
                score += 30;
                reasons.push('Location preference partially matches');
            } else if (teacherLoc === 'no preference' || !teacherLoc) {
                score += 20;
                reasons.push('No location preference');
            }
        } else {
            score += 20; // No preference
        }

        // Age group matching (25 points)
        if (teacher.preferred_age_group && school.ageGroups && school.ageGroups.length > 0) {
            const teacherAgeGroup = teacher.preferred_age_group.toLowerCase();
            const schoolAgeGroups = school.ageGroups.map(ag => ag.toLowerCase());
            
            if (schoolAgeGroups.some(ag => ag.includes(teacherAgeGroup) || teacherAgeGroup.includes(ag))) {
                score += 25;
                reasons.push('Age group preference matches');
            } else {
                score += 10;
                reasons.push('Age group preference differs');
            }
        } else {
            score += 15; // Partial match
        }

        // Subject matching (25 points)
        if (teacher.subjectSpecialty && school.subjectsNeeded && school.subjectsNeeded.length > 0) {
            const teacherSubject = teacher.subjectSpecialty.toLowerCase();
            const schoolSubjects = school.subjectsNeeded.map(s => s.toLowerCase());
            
            if (schoolSubjects.some(s => s.includes(teacherSubject) || teacherSubject.includes(s))) {
                score += 25;
                reasons.push('Subject specialty matches');
            } else {
                score += 5;
                reasons.push('Subject specialty differs');
            }
        } else {
            score += 10; // Partial match
        }

        // Experience matching (10 points)
        if (teacher.yearsExperience && school.experienceRequired) {
            const teacherExp = teacher.yearsExperience.toLowerCase();
            const schoolExp = school.experienceRequired.toLowerCase();
            
            // Simple matching logic - can be improved
            if (teacherExp.includes(schoolExp) || schoolExp.includes(teacherExp)) {
                score += 10;
                reasons.push('Experience level matches');
            } else {
                score += 5;
            }
        } else {
            score += 5;
        }

        return { score: Math.min(score, 100), reasons };
    }

    async saveMatch(teacherId, schoolId, matchScore, matchReasons, status = 'pending') {
        const { data, error } = await this.supabase
            .from('teacher_school_matches')
            .insert({
                teacher_id: teacherId,
                school_id: schoolId,
                match_score: matchScore,
                match_reasons: matchReasons,
                status: status
            })
            .select()
            .single();

        if (error) {
            // If match already exists, update it
            if (error.code === '23505') { // Unique violation
                const { data: updateData, error: updateError } = await this.supabase
                    .from('teacher_school_matches')
                    .update({
                        match_score: matchScore,
                        match_reasons: matchReasons,
                        status: status,
                        updated_at: new Date().toISOString()
                    })
                    .eq('teacher_id', teacherId)
                    .eq('school_id', schoolId)
                    .select()
                    .single();

                if (updateError) {
                    throw new Error(`Failed to update match: ${updateError.message}`);
                }
                return this.mapMatchToCamelCase(updateData);
            }
            throw new Error(`Failed to save match: ${error.message}`);
        }

        // Update teacher's is_matched status
        await this.supabase
            .from('teachers')
            .update({ is_matched: true })
            .eq('id', teacherId);

        return this.mapMatchToCamelCase(data);
    }

    async getAllMatches(teacherId = null, schoolId = null, status = null) {
        // First get the matches
        let query = this.supabase
            .from('teacher_school_matches')
            .select('*')
            .order('match_score', { ascending: false });

        if (teacherId) {
            query = query.eq('teacher_id', teacherId);
        }
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const { data: matches, error } = await query;

        if (error) {
            throw new Error(`Failed to get matches: ${error.message}`);
        }

        // Then fetch related teachers and schools
        const result = [];
        for (const match of matches) {
            let teacher = null;
            let school = null;
            
            try {
                teacher = await this.getTeacherById(match.teacher_id);
            } catch (err) {
                console.error(`Error fetching teacher ${match.teacher_id}:`, err);
            }
            
            try {
                school = await this.getSchoolById(match.school_id);
            } catch (err) {
                console.error(`Error fetching school ${match.school_id}:`, err);
            }
            
            result.push({
                ...this.mapMatchToCamelCase(match),
                teacher: teacher,
                school: school
            });
        }

        return result;
    }

    async updateMatchStatus(matchId, status, notes = null) {
        const updateData = { status };
        if (notes !== null) {
            updateData.notes = notes;
        }

        const { error } = await this.supabase
            .from('teacher_school_matches')
            .update(updateData)
            .eq('id', matchId);

        if (error) {
            throw new Error(`Failed to update match status: ${error.message}`);
        }

        return { id: matchId, status, changes: 1 };
    }

    async runMatchingForAllTeachers() {
        const teachers = await this.getAllTeachers();
        let matchesCreated = 0;

        for (const teacher of teachers) {
            const matches = await this.findMatchesForTeacher(teacher.id);
            
            for (const match of matches) {
                if (match.score >= 50) { // Only save matches with score >= 50
                    try {
                        await this.saveMatch(
                            teacher.id,
                            match.schoolId,
                            match.score,
                            match.reasons
                        );
                        matchesCreated++;
                    } catch (error) {
                        console.error(`Error saving match for teacher ${teacher.id} and school ${match.schoolId}:`, error);
                    }
                }
            }
        }

        return { matchesCreated, teachersProcessed: teachers.length };
    }

    // ========== TEACHER-JOB MATCHING METHODS ==========

    // Find job matches for a teacher based on location, age group, and subject preferences
    async findJobMatchesForTeacher(teacherId) {
        const teacher = await this.getTeacherById(teacherId);
        if (!teacher) {
            throw new Error('Teacher not found');
        }

        // Get all active jobs
        const jobs = await this.getAllJobs(true);

        // Calculate matches
        const matches = [];
        for (const job of jobs) {
            const matchResult = this.calculateJobMatchScore(teacher, job);
            if (matchResult.score > 0) {
                matches.push({
                    jobId: job.id,
                    job: job,
                    score: matchResult.score,
                    reasons: matchResult.reasons
                });
            }
        }

        // Sort by score descending
        matches.sort((a, b) => b.score - a.score);

        return matches;
    }

    // Find teacher matches for a job
    async findTeacherMatchesForJob(jobId) {
        const job = await this.getJobById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        // Get all teachers (could filter by status if needed)
        const teachers = await this.getAllTeachers();

        // Calculate matches
        const matches = [];
        for (const teacher of teachers) {
            if (teacher.status === 'inactive') continue; // Skip inactive teachers
            
            const matchResult = this.calculateJobMatchScore(teacher, job);
            if (matchResult.score > 0) {
                matches.push({
                    teacherId: teacher.id,
                    teacher: teacher,
                    score: matchResult.score,
                    reasons: matchResult.reasons
                });
            }
        }

        // Sort by score descending
        matches.sort((a, b) => b.score - a.score);

        return matches;
    }

    // Calculate match score between a teacher and a job
    calculateJobMatchScore(teacher, job) {
        let score = 0;
        const reasons = [];

        // Location matching (40 points)
        if (teacher.preferredLocation && job.location) {
            const teacherLocs = teacher.preferredLocation.toLowerCase().split(',').map(l => l.trim());
            const jobLoc = job.location.toLowerCase();
            const jobCity = job.city ? job.city.toLowerCase() : '';
            
            const hasLocationMatch = teacherLocs.some(loc => 
                loc === jobLoc || 
                loc === jobCity ||
                jobLoc.includes(loc) ||
                loc.includes(jobCity) ||
                loc === 'any' ||
                loc === 'no preference'
            );
            
            if (hasLocationMatch) {
                if (teacherLocs.some(loc => loc === 'any' || loc === 'no preference')) {
                    score += 20;
                    reasons.push('Open to any location');
                } else {
                    score += 40;
                    reasons.push('Location preference matches');
                }
            }
        } else {
            score += 20; // No preference specified
            reasons.push('No location preference specified');
        }

        // Age group matching (30 points)
        if (teacher.preferred_age_group && job.ageGroups && job.ageGroups.length > 0) {
            const teacherAgeGroup = teacher.preferred_age_group.toLowerCase();
            const jobAgeGroups = job.ageGroups.map(ag => ag.toLowerCase());
            
            const hasAgeGroupMatch = jobAgeGroups.some(ag => 
                ag.includes(teacherAgeGroup) || 
                teacherAgeGroup.includes(ag) ||
                teacherAgeGroup === 'any' ||
                teacherAgeGroup.includes('flexible')
            );
            
            if (hasAgeGroupMatch) {
                if (teacherAgeGroup === 'any' || teacherAgeGroup.includes('flexible')) {
                    score += 20;
                    reasons.push('Flexible on age groups');
                } else {
                    score += 30;
                    reasons.push('Age group preference matches');
                }
            } else {
                score += 10;
                reasons.push('Age group preference differs');
            }
        } else {
            score += 15; // Partial match if not specified
        }

        // Subject matching (30 points)
        // Check both job.subjects array and job.jobFunctions
        const jobSubjects = [];
        if (job.subjects && job.subjects.length > 0) {
            jobSubjects.push(...job.subjects.map(s => s.toLowerCase()));
        }
        if (job.jobFunctions) {
            // jobFunctions might be a string or array
            const funcs = typeof job.jobFunctions === 'string' 
                ? job.jobFunctions.toLowerCase() 
                : job.jobFunctions.map(f => f.toLowerCase()).join(' ');
            jobSubjects.push(funcs);
        }
        
        if (teacher.subjectSpecialty && jobSubjects.length > 0) {
            const teacherSubject = teacher.subjectSpecialty.toLowerCase();
            
            const hasSubjectMatch = jobSubjects.some(s => 
                s.includes(teacherSubject) || 
                teacherSubject.includes(s)
            );
            
            if (hasSubjectMatch) {
                score += 30;
                reasons.push('Subject specialty matches');
            } else {
                score += 5;
                reasons.push('Subject specialty differs');
            }
        } else {
            score += 10; // Partial match if not specified
        }

        return { score: Math.min(score, 100), reasons };
    }

    // Save a teacher-job match
    async saveJobMatch(teacherId, jobId, matchScore, matchReasons, status = 'pending') {
        const { data, error } = await this.supabase
            .from('teacher_job_matches')
            .insert({
                teacher_id: teacherId,
                job_id: jobId,
                match_score: matchScore,
                match_reasons: matchReasons,
                status: status
            })
            .select()
            .single();

        if (error) {
            // If match already exists, update it
            if (error.code === '23505') { // Unique violation
                const { data: updateData, error: updateError } = await this.supabase
                    .from('teacher_job_matches')
                    .update({
                        match_score: matchScore,
                        match_reasons: matchReasons,
                        status: status,
                        updated_at: new Date().toISOString()
                    })
                    .eq('teacher_id', teacherId)
                    .eq('job_id', jobId)
                    .select()
                    .single();

                if (updateError) {
                    throw new Error(`Failed to update job match: ${updateError.message}`);
                }
                return this.mapJobMatchToCamelCase(updateData);
            }
            throw new Error(`Failed to save job match: ${error.message}`);
        }

        return this.mapJobMatchToCamelCase(data);
    }

    // Get all teacher-job matches with optional filters
    async getAllJobMatches(teacherId = null, jobId = null, status = null) {
        let query = this.supabase
            .from('teacher_job_matches')
            .select('*')
            .order('match_score', { ascending: false });

        if (teacherId) {
            query = query.eq('teacher_id', teacherId);
        }
        if (jobId) {
            query = query.eq('job_id', jobId);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const { data: matches, error } = await query;

        if (error) {
            throw new Error(`Failed to get job matches: ${error.message}`);
        }

        // Fetch related teachers and jobs
        const result = [];
        for (const match of matches) {
            let teacher = null;
            let job = null;
            
            try {
                teacher = await this.getTeacherById(match.teacher_id);
            } catch (err) {
                console.error(`Error fetching teacher ${match.teacher_id}:`, err);
            }
            
            try {
                job = await this.getJobById(match.job_id);
            } catch (err) {
                console.error(`Error fetching job ${match.job_id}:`, err);
            }
            
            result.push({
                ...this.mapJobMatchToCamelCase(match),
                teacher: teacher,
                job: job
            });
        }

        return result;
    }

    // Update job match status
    async updateJobMatchStatus(matchId, status, notes = null) {
        const updateData = { status };
        if (notes !== null) {
            updateData.notes = notes;
        }

        const { error } = await this.supabase
            .from('teacher_job_matches')
            .update(updateData)
            .eq('id', matchId);

        if (error) {
            throw new Error(`Failed to update job match status: ${error.message}`);
        }

        return { id: matchId, status, changes: 1 };
    }

    // Run job matching for all teachers
    async runJobMatchingForAllTeachers() {
        const teachers = await this.getAllTeachers();
        let matchesCreated = 0;

        for (const teacher of teachers) {
            if (teacher.status === 'inactive') continue; // Skip inactive teachers
            
            const matches = await this.findJobMatchesForTeacher(teacher.id);
            
            for (const match of matches) {
                if (match.score >= 40) { // Save matches with score >= 40
                    try {
                        await this.saveJobMatch(
                            teacher.id,
                            match.jobId,
                            match.score,
                            match.reasons
                        );
                        matchesCreated++;
                    } catch (error) {
                        console.error(`Error saving job match for teacher ${teacher.id} and job ${match.jobId}:`, error);
                    }
                }
            }
        }

        return { matchesCreated, teachersProcessed: teachers.length };
    }

    // Map job match to camelCase
    mapJobMatchToCamelCase(match) {
        return {
            id: match.id,
            teacherId: match.teacher_id,
            jobId: match.job_id,
            matchScore: match.match_score,
            matchReasons: match.match_reasons || [],
            status: match.status,
            notes: match.notes,
            matchedAt: match.matched_at,
            createdAt: match.created_at,
            updatedAt: match.updated_at
        };
    }

    // Helper methods for mapping
    mapSchoolToCamelCase(school) {
        // Helper function to safely parse array fields
        const parseArrayField = (value) => {
            if (!value) return [];
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
                // Try parsing as JSON first
                try {
                    const parsed = JSON.parse(value);
                    return Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                    // If not JSON, try splitting by comma
                    if (value.includes(',')) {
                        return value.split(',').map(s => s.trim()).filter(s => s);
                    }
                    // Single value, return as array
                    return value.trim() ? [value.trim()] : [];
                }
            }
            return [];
        };

        return {
            id: school.id,
            name: school.name,
            nameChinese: school.name_chinese,
            location: school.location,
            locationChinese: school.location_chinese,
            city: school.city,
            province: school.province,
            schoolType: school.school_type,
            ageGroups: parseArrayField(school.age_groups),
            subjectsNeeded: parseArrayField(school.subjects_needed),
            experienceRequired: school.experience_required,
            chineseRequired: school.chinese_required,
            salaryRange: school.salary_range,
            contractType: school.contract_type,
            benefits: school.benefits,
            description: school.description,
            contactName: school.contact_name,
            contactEmail: school.contact_email,
            contactPhone: school.contact_phone,
            isActive: school.is_active,
            createdAt: school.created_at,
            updatedAt: school.updated_at
        };
    }

    mapMatchToCamelCase(match) {
        return {
            id: match.id,
            teacherId: match.teacher_id,
            schoolId: match.school_id,
            matchScore: match.match_score,
            matchReasons: match.match_reasons || [],
            status: match.status,
            notes: match.notes,
            matchedAt: match.matched_at,
            createdAt: match.created_at,
            updatedAt: match.updated_at
        };
    }

    // Close method for compatibility (Supabase doesn't need explicit closing)
    close() {
        console.log('Supabase connection closed (no-op)');
    }
}

module.exports = SupabaseDatabase;

