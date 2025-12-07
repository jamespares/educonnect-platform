const Database = require('../legacy/database');

// High-salary sample job data for attracting users
const sampleJobs = [
    {
        title: "High School English Teacher",
        company: "Shanghai American School",
        location: "Shanghai",
        locationChinese: "上海",
        salary: "25000 - 35000",
        experience: "2+ Years",
        chineseRequired: "No",
        qualification: "Bachelor's Degree Required",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "Literature"]),
        description: "Join our vibrant English department teaching high school students. We offer excellent support for professional growth and development.",
        requirements: "English/Literature degree, teaching qualification, experience with international curricula preferred",
        benefits: "Housing allowance, medical insurance, annual flights, professional development budget",
        isActive: 1,
        isNew: 1
    },
    {
        title: "Middle School English Teacher",
        company: "Yew Chung International School",
        location: "Shanghai", 
        locationChinese: "上海",
        salary: "25000 - 33000",
        experience: "1+ Years",
        chineseRequired: "No",
        qualification: "Bachelor's Degree Required",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "Writing"]),
        description: "Teach engaging English classes to motivated middle school students in our supportive international environment.",
        requirements: "English degree, teaching qualification, experience with adolescent learners",
        benefits: "Competitive salary, housing support, health coverage, annual flights",
        isActive: 1,
        isNew: 1
    },
    {
        title: "Primary English Teacher",
        company: "Concordia International School",
        location: "Shanghai",
        locationChinese: "上海",
        salary: "25000 - 33000",
        experience: "1+ Years",
        chineseRequired: "No",
        qualification: "Bachelor's Degree Required",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "Primary"]),
        description: "Nurture young learners' love for English language and literature in our caring primary school environment.",
        requirements: "Elementary education degree, ESL certification preferred, experience with young learners",
        benefits: "Professional development, housing assistance, medical coverage, supportive community",
        isActive: 1,
        isNew: 1
    },
    {
        title: "ESL Teacher",
        company: "Beijing BISS International School",
        location: "Beijing",
        locationChinese: "北京",
        salary: "25000 - 33000",
        experience: "1+ Years",
        chineseRequired: "No",
        qualification: "Bachelor's Degree Required",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "ESL", "Language"]),
        description: "Support English language learners across all grade levels with dedicated ESL instruction and curriculum support.",
        requirements: "Education degree, TESOL/TEFL certification, experience with diverse learners",
        benefits: "Housing allowance, visa support, medical insurance, professional development",
        isActive: 1,
        isNew: 1
    },
    {
        title: "English Literature Teacher",
        company: "Western Academy Beijing",
        location: "Beijing",
        locationChinese: "北京",
        salary: "25000 - 33000",
        experience: "2+ Years",
        chineseRequired: "No",
        qualification: "Bachelor's Degree Required",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "Literature", "English"]),
        description: "Inspire students with classic and contemporary literature in our well-established international school.",
        requirements: "English Literature degree, teaching qualification, AP or IB experience preferred",
        benefits: "Competitive package, housing support, annual flights, book allowance",
        isActive: 1,
        isNew: 1
    },
    {
        title: "English Teacher",
        company: "Shenzhen College of International Education",
        location: "Shenzhen",
        locationChinese: "深圳",
        salary: "25000 - 33000",
        experience: "1+ Years",
        chineseRequired: "No",
        qualification: "Bachelor's Degree Required",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "Communication"]),
        description: "Join our dynamic team teaching English to motivated high school students preparing for international universities.",
        requirements: "English degree, teaching qualification, experience with exam preparation helpful",
        benefits: "Housing allowance, medical coverage, annual flights, modern facilities",
        isActive: 1,
        isNew: 1
    },
    {
        title: "English Teacher (IB Programme)",
        company: "Guangzhou American International School",
        location: "Guangzhou",
        locationChinese: "广州",
        salary: "25000 - 33000",
        experience: "2+ Years",
        chineseRequired: "No",
        qualification: "Bachelor's Degree Required",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "IB"]),
        description: "Teach IB English Language and Literature to motivated students. Join our collaborative international faculty.",
        requirements: "English degree, teaching qualification, IB experience preferred but training provided",
        benefits: "Housing allowance, medical insurance, annual flights, IB training",
        isActive: 1,
        isNew: 1
    },
    {
        title: "English Writing Teacher",
        company: "QSI International School Shenzhen",
        location: "Shenzhen",
        locationChinese: "深圳",
        salary: "25000 - 33000",
        experience: "1+ Years",
        chineseRequired: "No",
        qualification: "Bachelor's Degree Required",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "Writing"]),
        description: "Focus on developing students' writing skills across all grades. Small classes and individualized attention.",
        requirements: "English/Journalism degree, writing experience, teaching qualification",
        benefits: "Small class sizes, housing support, health coverage, professional development",
        isActive: 1,
        isNew: 1
    },
    {
        title: "English Teacher (AP Programme)",
        company: "Nanjing International School",
        location: "Nanjing",
        locationChinese: "南京",
        salary: "25000 - 33000",
        experience: "2+ Years",
        chineseRequired: "No",
        qualification: "Bachelor's Degree Required",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "AP"]),
        description: "Teach AP English Language and Literature courses. Prepare students for college-level academic success.",
        requirements: "English degree, teaching qualification, AP experience or willingness to train",
        benefits: "AP training provided, housing allowance, annual flights, collegial environment",
        isActive: 1,
        isNew: 1
    },
    {
        title: "Primary English Teacher",
        company: "Hangzhou International School",
        location: "Hangzhou",
        locationChinese: "杭州",
        salary: "25000 - 33000",
        experience: "1+ Years",
        chineseRequired: "No",
        qualification: "Bachelor's Degree Required",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "Primary"]),
        description: "Create engaging English lessons for young learners in beautiful Hangzhou. Small class sizes and supportive environment.",
        requirements: "Elementary education degree, experience with young learners, creativity and enthusiasm",
        benefits: "Beautiful location, housing support, medical coverage, professional development",
        isActive: 1,
        isNew: 1
    },
    {
        title: "English Language Coordinator",
        company: "Suzhou Singapore International School",
        location: "Suzhou",
        locationChinese: "苏州",
        salary: "26000 - 34000",
        experience: "3+ Years",
        chineseRequired: "No",
        qualification: "Bachelor's Degree Required",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "Coordination"]),
        description: "Lead English language development across the school. Support both native and non-native English speakers.",
        requirements: "English/Linguistics degree, ESL experience, leadership skills",
        benefits: "Leadership allowance, housing assistance, annual flights, training opportunities",
        isActive: 1,
        isNew: 1
    },
    {
        title: "High School English Teacher",
        company: "Qingdao MTI International School",
        location: "Qingdao",
        locationChinese: "青岛",
        salary: "25000 - 33000",
        experience: "1+ Years",
        chineseRequired: "No",
        qualification: "Bachelor's Degree Required",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "Literature"]),
        description: "Teach high school English in our coastal campus. Focus on university preparation and critical thinking skills.",
        requirements: "English degree, teaching qualification, experience with university preparation",
        benefits: "Coastal location, housing support, health insurance, small class sizes",
        isActive: 1,
        isNew: 1
    }
];

async function seedJobs() {
    const db = new Database();
    
    console.log('Seeding job data...');
    
    // Wait for tables to be created
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
        for (const job of sampleJobs) {
            await db.addJob(job);
            console.log(`Added job: ${job.title} at ${job.company} - Salary: ${job.salary} CNY`);
        }
        
        console.log('Job seeding completed successfully!');
        console.log(`Added ${sampleJobs.length} high-salary positions (all 25K+ monthly)`);
    } catch (error) {
        console.error('Error seeding jobs:', error);
    } finally {
        db.close();
    }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
    seedJobs();
}

module.exports = { seedJobs };