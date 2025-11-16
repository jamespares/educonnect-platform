const { createClient } = require('@supabase/supabase-js');

class SupabaseDatabase {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for server-side operations
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'intro-videos';
        
        console.log('✅ Supabase client initialized');
        console.log('   - Storage bucket:', this.storageBucket);
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
                additional_info: teacherData.additionalInfo
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
                salary: jobData.salary,
                experience: jobData.experience,
                chinese_required: jobData.chineseRequired,
                qualification: jobData.qualification,
                contract_type: jobData.contractType,
                job_functions: typeof jobData.jobFunctions === 'string' 
                    ? jobData.jobFunctions 
                    : JSON.stringify(jobData.jobFunctions),
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
            salary: jobData.salary,
            experience: jobData.experience,
            chinese_required: jobData.chineseRequired,
            qualification: jobData.qualification,
            contract_type: jobData.contractType,
            job_functions: typeof jobData.jobFunctions === 'string' 
                ? jobData.jobFunctions 
                : JSON.stringify(jobData.jobFunctions),
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
            status: teacher.status,
            createdAt: teacher.created_at,
            updatedAt: teacher.updated_at
        };
    }

    mapJobToCamelCase(job) {
        return {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            locationChinese: job.location_chinese,
            salary: job.salary,
            experience: job.experience,
            chineseRequired: job.chinese_required,
            qualification: job.qualification,
            contractType: job.contract_type,
            jobFunctions: typeof job.job_functions === 'string' 
                ? JSON.parse(job.job_functions) 
                : job.job_functions,
            description: job.description,
            requirements: job.requirements,
            benefits: job.benefits,
            isActive: job.is_active,
            isNew: job.is_new,
            createdAt: job.created_at,
            updatedAt: job.updated_at
        };
    }

    // Close method for compatibility (Supabase doesn't need explicit closing)
    close() {
        console.log('Supabase connection closed (no-op)');
    }
}

module.exports = SupabaseDatabase;

