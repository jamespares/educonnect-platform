const Database = require('./database');

// Additional English teaching positions with competitive salaries
const englishTeachingJobs = [
    {
        title: "Primary English Teacher",
        company: "Shanghai International Primary School",
        location: "Shanghai",
        locationChinese: "上海",
        salary: "25000 - 32000",
        experience: "2+ Years",
        chineseRequired: "No",
        qualification: "Bachelor Degree",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "Primary"]),
        description: "Join our vibrant primary school community in Shanghai's Pudong district. We're seeking an enthusiastic English teacher to inspire young learners in a supportive international environment.",
        requirements: "Bachelor's degree in English/Education, TEFL/TESOL certification, 2+ years primary teaching experience",
        benefits: "Housing allowance, medical insurance, professional development, visa support, paid holidays",
        isActive: 1,
        isNew: 1
    },
    {
        title: "Middle School English Teacher",
        company: "Beijing Global Middle School",
        location: "Beijing",
        locationChinese: "北京",
        salary: "28000 - 35000",
        experience: "3+ Years",
        chineseRequired: "No",
        qualification: "Bachelor Degree",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "Middle School"]),
        description: "Excellent opportunity for an experienced English teacher to join our middle school team. Small class sizes, modern facilities, and collaborative teaching environment.",
        requirements: "English/Literature degree, teaching qualification, middle school experience preferred",
        benefits: "Competitive salary, housing support, annual flight allowance, health insurance, professional development budget",
        isActive: 1,
        isNew: 1
    },
    {
        title: "IB Primary English Teacher",
        company: "Guangzhou IB World School",
        location: "Guangzhou",
        locationChinese: "广州",
        salary: "30000 - 38000",
        experience: "3+ Years",
        chineseRequired: "No",
        qualification: "Bachelor Degree",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "IB Primary"]),
        description: "Join our prestigious IB World School as a Primary English teacher. Work with motivated students and supportive colleagues in a world-class educational environment.",
        requirements: "English degree, IB PYP training preferred, 3+ years primary teaching experience",
        benefits: "IB training provided, housing allowance, medical coverage, annual flights, professional development opportunities",
        isActive: 1,
        isNew: 1
    },
    {
        title: "English Language Arts Teacher",
        company: "Shenzhen International Academy",
        location: "Shenzhen",
        locationChinese: "深圳",
        salary: "26000 - 33000",
        experience: "2+ Years",
        chineseRequired: "No",
        qualification: "Bachelor Degree",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "Language Arts"]),
        description: "Dynamic English Language Arts position at our innovative international school in Shenzhen's tech hub. Focus on creative writing, literature, and communication skills.",
        requirements: "English/Literature degree, TEFL certification, creative writing experience preferred",
        benefits: "Tech-enabled classroom, housing stipend, health insurance, visa assistance, professional growth opportunities",
        isActive: 1,
        isNew: 1
    },
    {
        title: "English Teacher - Secondary",
        company: "Nanjing International High School",
        location: "Nanjing",
        locationChinese: "南京",
        salary: "27000 - 34000",
        experience: "3+ Years",
        chineseRequired: "No",
        qualification: "Bachelor Degree",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "Secondary"]),
        description: "Seeking passionate English teacher for our high school program. Prepare students for international universities with engaging literature and writing curriculum.",
        requirements: "English degree, secondary teaching experience, university preparation experience preferred",
        benefits: "Beautiful campus, housing allowance, medical insurance, annual leave, professional development",
        isActive: 1,
        isNew: 1
    },
    {
        title: "Primary English Specialist",
        company: "Hangzhou Elite Primary School",
        location: "Hangzhou",
        locationChinese: "杭州",
        salary: "26000 - 32000",
        experience: "2+ Years",
        chineseRequired: "No",
        qualification: "Bachelor Degree",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "Primary Specialist"]),
        description: "Specialist English position focusing on literacy development and language acquisition. Work in beautiful Hangzhou with dedicated team of international educators.",
        requirements: "English/Education degree, primary specialization, literacy training preferred",
        benefits: "Scenic location, housing support, health coverage, professional development, visa support",
        isActive: 1,
        isNew: 1
    },
    {
        title: "IB Middle Years English Teacher",
        company: "Suzhou IB International School",
        location: "Suzhou",
        locationChinese: "苏州",
        salary: "29000 - 36000",
        experience: "4+ Years",
        chineseRequired: "No",
        qualification: "Bachelor Degree",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "IB MYP"]),
        description: "Join our IB Middle Years Programme as an English teacher. Develop critical thinking and communication skills in our internationally-minded learning community.",
        requirements: "English degree, IB MYP training preferred, 4+ years middle school experience",
        benefits: "IB professional development, housing allowance, medical insurance, beautiful campus, collaborative environment",
        isActive: 1,
        isNew: 1
    },
    {
        title: "English Teacher - International Curriculum",
        company: "Chengdu World Academy",
        location: "Chengdu",
        locationChinese: "成都",
        salary: "25000 - 31000",
        experience: "2+ Years",
        chineseRequired: "No",
        qualification: "Bachelor Degree",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "English", "International"]),
        description: "Exciting opportunity to teach English in vibrant Chengdu. Join our international curriculum team and make a difference in students' language learning journey.",
        requirements: "English degree, TEFL/TESOL certification, international curriculum experience",
        benefits: "Cultural immersion, housing assistance, health insurance, professional development, visa support",
        isActive: 1,
        isNew: 1
    }
];

async function addEnglishJobs() {
    const db = new Database();
    
    console.log('Adding English teaching positions...');
    
    // Wait for tables to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
        for (const job of englishTeachingJobs) {
            await db.addJob(job);
            console.log(`Added job: ${job.title} at ${job.company} - Salary: ${job.salary} CNY`);
        }
        
        console.log('English teaching jobs added successfully!');
        console.log(`Added ${englishTeachingJobs.length} English teaching positions`);
    } catch (error) {
        console.error('Error adding English jobs:', error);
    } finally {
        db.close();
    }
}

// Run the script
if (require.main === module) {
    addEnglishJobs();
}

module.exports = { addEnglishJobs };