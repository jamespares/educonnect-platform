const Database = require('./database');

// Sample job data based on your screenshot
const sampleJobs = [
    {
        title: "IB PYP Curriculum Coordinator",
        company: "China Global Connections",
        location: "Nanjing",
        locationChinese: "南京",
        salary: "30000 - 35000",
        experience: "3 Years",
        chineseRequired: "No",
        qualification: "Bachelor Degree",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "Management", "Teaching"]),
        description: "We are looking for an IB PYP Curriculum Coordinator for an international kindergarten based in Nanjing starting from the upcoming 2025-2026 academic year.",
        requirements: "Bachelor's degree in Education or related field, 3+ years teaching experience, IB certification preferred",
        benefits: "Competitive salary, housing allowance, health insurance, professional development opportunities",
        isActive: 1,
        isNew: 1
    },
    {
        title: "IB Art Teacher",
        company: "International Education Group",
        location: "Qingdao",
        locationChinese: "青岛",
        salary: "25000 - 30000",
        experience: "2+ Years",
        chineseRequired: "No",
        qualification: "Bachelor Degree",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "Teaching", "Art"]),
        description: "International school in Qingdao seeking an experienced Art Teacher for IB Primary Years Programme. Must have experience with international curriculum.",
        requirements: "Bachelor's degree in Art/Fine Arts, teaching qualification, experience with IB curriculum",
        benefits: "Housing assistance, annual flight allowance, medical coverage",
        isActive: 1,
        isNew: 0
    },
    {
        title: "IB MYP Mathematics Teacher",
        company: "China Global Connections",
        location: "Ningbo",
        locationChinese: "宁波",
        salary: "28000 - 32000",
        experience: "3+ Years",
        chineseRequired: "Preferred",
        qualification: "Bachelor Degree",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "Mathematics", "Teaching"]),
        description: "Seeking a qualified Mathematics teacher for MYP program. Candidates with Chinese language skills preferred but not essential.",
        requirements: "Mathematics degree, teaching qualification, IB MYP experience preferred",
        benefits: "Competitive salary, professional development, relocation support",
        isActive: 1,
        isNew: 0
    },
    {
        title: "IBDP Coordinator",
        company: "China Global Connections",
        location: "Ningbo",
        locationChinese: "宁波",
        salary: "32000 - 38000",
        experience: "5+ Years",
        chineseRequired: "No",
        qualification: "Master's Degree Preferred",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "Management", "Teaching"]),
        description: "Leading international school seeks experienced IBDP Coordinator to oversee diploma programme implementation and student guidance.",
        requirements: "Master's degree, 5+ years educational experience, IBDP coordinator certification",
        benefits: "Leadership package, housing allowance, annual leave, professional development budget",
        isActive: 1,
        isNew: 0
    },
    {
        title: "Science Teacher - Physics",
        company: "Shanghai International Academy",
        location: "Shanghai",
        locationChinese: "上海",
        salary: "28000 - 35000",
        experience: "3+ Years",
        chineseRequired: "No",
        qualification: "Bachelor Degree",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "Science", "Teaching"]),
        description: "Modern international school seeks passionate Physics teacher for high school program. State-of-the-art laboratory facilities available.",
        requirements: "Physics degree, teaching qualification, experience with international curricula",
        benefits: "Modern facilities, competitive salary, housing support, health insurance",
        isActive: 1,
        isNew: 1
    },
    {
        title: "Physical Education Teacher",
        company: "Guangzhou International School",
        location: "Guangzhou",
        locationChinese: "广州",
        salary: "24000 - 29000",
        experience: "2+ Years",
        chineseRequired: "No",
        qualification: "Bachelor Degree",
        contractType: "Full Time",
        jobFunctions: JSON.stringify(["Education", "Physical Education", "Teaching"]),
        description: "Dynamic PE teacher needed for primary and secondary students. Excellent sports facilities and enthusiastic student body.",
        requirements: "Sports Science or Physical Education degree, teaching qualification, sports coaching experience preferred",
        benefits: "Sports facilities access, health insurance, housing assistance, professional development",
        isActive: 1,
        isNew: 0
    }
];

async function seedJobs() {
    const db = new Database();
    
    console.log('Seeding job data...');
    
    try {
        for (const job of sampleJobs) {
            await db.addJob(job);
            console.log(`Added job: ${job.title} at ${job.company}`);
        }
        
        console.log('Job seeding completed successfully!');
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