/**
 * School Crawler for Major Chinese Cities
 * 
 * This script uses Firecrawl MCP/API to crawl the web and extract school information
 * from major Chinese cities, then outputs the data to a CSV file.
 * 
 * Usage:
 *   1. Set FIRECRAWL_API_KEY in your .env file (get one from https://firecrawl.dev)
 *   2. Run: npm run crawl-schools
 *   3. Output files: chinese-schools.csv and chinese-schools.json
 * 
 * The script crawls Wikipedia pages, school directories, and other sources
 * to find schools in 20 major Chinese cities.
 * 
 * This version uses Firecrawl API directly (compatible with Firecrawl MCP tools)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Major cities in China
const MAJOR_CITIES = [
  'Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu',
  'Wuhan', 'Nanjing', 'Hangzhou', 'Xi\'an', 'Tianjin',
  'Qingdao', 'Dalian', 'Suzhou', 'Chongqing', 'Xiamen',
  'Kunming', 'Changsha', 'Zhengzhou', 'Harbin', 'Foshan'
];

// Initialize Firecrawl API (MCP-compatible)
const apiKey = process.env.FIRECRAWL_API_KEY;
if (!apiKey) {
  console.error('Error: FIRECRAWL_API_KEY not found in environment variables.');
  console.error('Please set FIRECRAWL_API_KEY in your .env file or export it.');
  console.error('You can get an API key from https://firecrawl.dev');
  process.exit(1);
}

const FIRECRAWL_API_BASE = 'https://api.firecrawl.dev/v1';

/**
 * Make HTTP request to Firecrawl API (MCP-compatible)
 */
function firecrawlRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${FIRECRAWL_API_BASE}${endpoint}`);
    const postData = JSON.stringify(options.body || {});
    
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: options.method || 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Firecrawl API error: ${parsed.error || data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// CSV header
const CSV_HEADER = 'School Name,City,Type,Address,Website,Phone,Email,Description\n';

/**
 * Crawl a URL and extract school information using Firecrawl API (MCP-compatible)
 */
async function crawlURL(url, city) {
  try {
    console.log(`  📄 Crawling: ${url}`);
    
    // Use Firecrawl API to scrape the page (same as MCP tools)
    const result = await firecrawlRequest('/scrape', {
      method: 'POST',
      body: {
        url: url,
        formats: ['markdown', 'html'],
        onlyMainContent: true
      }
    });

    if (!result) {
      return [];
    }

    // Handle different response structures (MCP tools may return different formats)
    let data = result.data || result.content || result;
    
    // Extract school data from the content
    const schools = extractSchoolData(data, city, url);
    return schools;
    
  } catch (error) {
    // Skip 404s and other non-critical errors silently
    if (error.message && (error.message.includes('404') || error.message.includes('not found'))) {
      return [];
    }
    console.error(`  ❌ Error crawling ${url}:`, error.message);
    return [];
  }
}

/**
 * Search for schools in a specific city using Firecrawl search API (MCP-compatible)
 */
async function searchForSchoolDirectories(city) {
  const cityLower = city.toLowerCase();
  const searchQueries = [
    `international schools ${cityLower} china list directory`,
    `private schools ${cityLower} china directory`,
    `bilingual schools ${cityLower} china list`
  ];

  const foundUrls = new Set();
  
  for (const query of searchQueries) {
    try {
      console.log(`  🔎 Searching: ${query}`);
      // Use Firecrawl search API (same as MCP tools)
      // Note: If search endpoint is not available, this will gracefully fail
      const searchResults = await firecrawlRequest('/search', {
        method: 'POST',
        body: {
          query: query,
          limit: 5
        }
      });
      
      // Handle different response structures
      const results = searchResults?.data || searchResults?.results || searchResults || [];
      const resultsArray = Array.isArray(results) ? results : [results];
      
      for (const result of resultsArray) {
        if (!result) continue;
        const url = result.url || result.link || result.href;
        if (url && isValidSchoolDirectory(url)) {
          foundUrls.add(url);
        }
      }
    } catch (error) {
      // Search endpoint might not be available - skip silently for 404s
      if (error.message && !error.message.includes('404') && !error.message.includes('not found')) {
        console.error(`  ⚠️  Search error: ${error.message}`);
      }
    }
  }
  
  return Array.from(foundUrls);
}

/**
 * Check if URL looks like a school directory
 */
function isValidSchoolDirectory(url) {
  if (!url) return false;
  
  const urlLower = url.toLowerCase();
  const validDomains = [
    'internationalschoolsreview.com',
    'scholaro.com',
    'chinaeducenter.com',
    'international-schools-database.com',
    'expatarrivals.com',
    'whichschooladvisor.com',
    'schoolsinshanghai.com',
    'schoolsinbeijing.com',
    'schools.xdf.cn', // New Oriental
    'xdf.cn', // New Oriental
    'dmoz-odp.org' // Open Directory Project
  ];
  
  // Check if it's a known school directory domain
  if (validDomains.some(domain => urlLower.includes(domain))) {
    return true;
  }
  
  // Check if URL contains school-related keywords
  const schoolKeywords = ['school', 'education', 'academy', 'institute'];
  if (schoolKeywords.some(keyword => urlLower.includes(keyword))) {
    // But exclude Wikipedia general pages
    if (!urlLower.includes('wikipedia.org/wiki/') || 
        urlLower.includes('List_of') || 
        urlLower.includes('International_schools')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Search for schools in a specific city using Firecrawl
 */
async function crawlSchoolsForCity(city) {
  console.log(`\n🔍 Crawling schools in ${city}...`);
  const schools = [];
  
  const cityLower = city.toLowerCase();
  const cityPinyin = getCityPinyin(city);
  
  // First, search for school directory URLs
  const directoryUrls = await searchForSchoolDirectories(city);
  
  // Add known reliable sources
  const knownUrls = [
    // International Schools Review
    `https://www.internationalschoolsreview.com/schools/${cityLower}-china`,
    // International Schools Database
    `https://www.international-schools-database.com/in/china/${cityLower}`,
    // Which School Advisor
    `https://www.whichschooladvisor.com/china/schools/${cityLower}`,
    // New Oriental Online International School Selector (1100+ schools database)
    `https://schools.xdf.cn/international-schools?city=${cityPinyin}`,
    `https://schools.xdf.cn/international-schools?location=${cityLower}`,
    // China International Education Information Net (5000+ schools database)
    `https://www.chinaeducenter.com/en/studyabroad/schools.php?city=${cityLower}`,
    `https://www.chinaeducenter.com/en/studyabroad/schools.php?location=${cityLower}`,
    // Open Directory Project (manually curated lists)
    `https://www.dmoz-odp.org/Regional/Asia/China/${city.replace(/\s+/g, '')}/Education/Schools/`
  ];
  
  const urlsToCrawl = [...knownUrls, ...directoryUrls];
  
  // Only crawl Wikipedia pages specifically for international schools lists
  const wikipediaUrls = [
    `https://en.wikipedia.org/wiki/List_of_international_schools_in_${cityLower}`,
    `https://en.wikipedia.org/wiki/International_schools_in_${cityLower}`
  ];
  
  // Crawl directory URLs first
  for (const url of urlsToCrawl) {
    const foundSchools = await crawlURL(url, city);
    schools.push(...foundSchools);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Then crawl Wikipedia lists (more structured)
  for (const url of wikipediaUrls) {
    const foundSchools = await crawlURL(url, city);
    schools.push(...foundSchools);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Filter and clean schools
  const cleanedSchools = filterValidSchools(schools, city);
  
  // Remove duplicates
  const uniqueSchools = [];
  const seenNames = new Set();
  
  for (const school of cleanedSchools) {
    const key = school.name?.toLowerCase().trim();
    if (key && !seenNames.has(key)) {
      seenNames.add(key);
      uniqueSchools.push(school);
    }
  }

  return uniqueSchools;
}

/**
 * Filter out junk results and validate schools
 */
function filterValidSchools(schools, city) {
  const junkPatterns = [
    /^(Search|Read|Write|Click|View|See|More|Less|Next|Previous|Home|About|Contact|Menu|Navigation|Footer|Header)/i,
    /^(The|A|An|This|That|These|Those|Some|Many|Few|All|Each|Every)\s/i,
    /(Review|Reviewer|Reviewing|Reviewed|Write a review|Read reviews|Newest reviews)/i,
    /(According to|According|Said|States|Reports|According to Wang|According to the)/i,
    /(Woman|Man|Person|People|Student|Teacher|Staff|Faculty)\s+(writing|reading|reviewing|saying)/i,
    /(Times Higher Education|World University Rankings|Best Global University|News & World Report)/i,
    /(Double First Class|First Class|Class University|University Rankings)/i,
    /(Wikipedia|Wikimedia|Edit|Cite|Reference|External links|See also|Categories)/i,
    /(Search\s+Search|Search\s+Education|Search\s+Schools)/i,
    /(^[A-Z][a-z]+\s+(on|in|at|for|with|from|to|by|of)\s+[A-Z])/, // Sentence fragments
    /(University of the Chinese Academy|Chinese Academy of|Academy of Sciences|Academy of Engineering)/i,
    /(^[A-Z][a-z]+\s+University$)/, // Single word + University (likely incomplete)
    /(Institute$|Academy$|College$|University$)/i // Ends with just the type (likely incomplete)
  ];
  
  const validSchoolPatterns = [
    /International School/i,
    /Bilingual School/i,
    /Private School/i,
    /Foreign School/i,
    /(School|Academy|College|University|Institute).*China/i
  ];
  
  // Add city-specific pattern
  const cityPattern = new RegExp(`(School|Academy|College|University|Institute).*${city}`, 'i');
  validSchoolPatterns.push(cityPattern);
  
  return schools.filter(school => {
    const name = school.name?.trim();
    if (!name || name.length < 5 || name.length > 100) {
      return false;
    }
    
    // Must contain school-related keywords
    if (!/(School|Academy|College|University|Institute|Education|Kindergarten|Preschool)/i.test(name)) {
      return false;
    }
    
    // Filter out junk patterns
    for (const pattern of junkPatterns) {
      if (pattern.test(name)) {
        return false;
      }
    }
    
    // Prefer schools with valid patterns
    const hasValidPattern = validSchoolPatterns.some(pattern => pattern.test(name));
    
    // Must be a complete school name (not a fragment)
    // Should start with capital letter and have at least 2 words
    const words = name.split(/\s+/);
    if (words.length < 2) {
      return false;
    }
    
    // Should not be just "City + School" unless it's a known pattern
    if (words.length === 2 && words[1].match(/^(School|Academy|College|University|Institute)$/i)) {
      // Allow if first word is a proper name (capitalized)
      if (!/^[A-Z]/.test(words[0])) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Extract school data from crawled content using regex and text parsing
 */
function extractSchoolData(data, city, sourceUrl) {
  const schools = [];
  
  if (!data) return schools;

  // Get text content (from markdown or HTML)
  let textContent = '';
  if (typeof data === 'string') {
    textContent = data;
  } else if (data.markdown) {
    textContent = data.markdown;
  } else if (data.html) {
    // Basic HTML to text conversion (remove tags)
    textContent = data.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  } else if (data.content) {
    textContent = data.content;
  }

  // Improved patterns to identify school names
  // Focus on structured lists and actual school names
  const schoolPatterns = [
    // Pattern 1: "School Name" or "Name School" (most common)
    /\b([A-Z][a-zA-Z\s&'-]{2,}(?:International|Bilingual|Private|Foreign)?\s+(?:School|Academy|College|University|Institute|Kindergarten|Preschool))\b/g,
    // Pattern 2: "Name of City School" or "City Name School"
    /\b([A-Z][a-zA-Z\s&'-]{2,}(?:of\s+[A-Z][a-zA-Z]+)?\s+(?:School|Academy|College|University|Institute))\b/g,
    // Pattern 3: List items (bullet points, numbered lists)
    /(?:^|\n)[\s\-\*\•\d+\.]+\s*([A-Z][a-zA-Z\s&'-]{3,}(?:School|Academy|College|University|Institute|International School|Bilingual School))/gm,
    // Pattern 4: Table rows or structured data
    /\|\s*([A-Z][a-zA-Z\s&'-]{3,}(?:School|Academy|College|University|Institute))\s*\|/g,
    // Pattern 5: Links to school pages
    /\[([A-Z][a-zA-Z\s&'-]{3,}(?:School|Academy|College|University|Institute))\]/g
  ];

  const foundSchools = new Set();
  
  for (const pattern of schoolPatterns) {
    const matches = textContent.matchAll(pattern);
    for (const match of matches) {
      let schoolName = match[1]?.trim();
      if (!schoolName) continue;
      
      // Clean up the name
      schoolName = schoolName
        .replace(/^[\s\-\*\•\d+\.]+/, '') // Remove list markers
        .replace(/\[|\]|\(|\)/g, '') // Remove brackets
        .replace(/\|/g, '') // Remove table separators
        .trim();
      
      // Basic validation
      if (schoolName.length >= 5 && schoolName.length <= 100) {
        // Must start with capital letter
        if (/^[A-Z]/.test(schoolName)) {
          // Must contain school-related word
          if (/(School|Academy|College|University|Institute|Kindergarten|Preschool|Education)/i.test(schoolName)) {
            foundSchools.add(schoolName);
          }
        }
      }
    }
  }

  // Extract additional information (addresses, websites, etc.)
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const websitePattern = /(https?:\/\/[^\s\)]+)/g;
  const phonePattern = /(\+?86[\s-]?1[3-9]\d{9}|\+?86[\s-]?\d{2,4}[\s-]?\d{7,8})/g;

  // Create school objects
  for (const schoolName of foundSchools) {
    const school = {
      name: schoolName,
      city: city,
      type: determineSchoolType(schoolName),
      address: '',
      website: '',
      phone: '',
      email: '',
      description: ''
    };

    // Try to find associated information near the school name
    const nameIndex = textContent.indexOf(schoolName);
    if (nameIndex !== -1) {
      const context = textContent.substring(
        Math.max(0, nameIndex - 200),
        Math.min(textContent.length, nameIndex + 500)
      );

      // Extract email
      const emailMatch = context.match(emailPattern);
      if (emailMatch) {
        school.email = emailMatch[0];
      }

      // Extract website
      const websiteMatch = context.match(websitePattern);
      if (websiteMatch) {
        school.website = websiteMatch[0].replace(/[.,;:!?]+$/, '');
      }

      // Extract phone
      const phoneMatch = context.match(phonePattern);
      if (phoneMatch) {
        school.phone = phoneMatch[0];
      }
    }

    schools.push(school);
  }

  return schools;
}

/**
 * Get Pinyin name for city (for some Chinese websites)
 */
function getCityPinyin(city) {
  const pinyinMap = {
    'Beijing': 'beijing',
    'Shanghai': 'shanghai',
    'Guangzhou': 'guangzhou',
    'Shenzhen': 'shenzhen',
    'Chengdu': 'chengdu',
    'Wuhan': 'wuhan',
    'Nanjing': 'nanjing',
    'Hangzhou': 'hangzhou',
    'Xi\'an': 'xian',
    'Tianjin': 'tianjin',
    'Qingdao': 'qingdao',
    'Dalian': 'dalian',
    'Suzhou': 'suzhou',
    'Chongqing': 'chongqing',
    'Xiamen': 'xiamen',
    'Kunming': 'kunming',
    'Changsha': 'changsha',
    'Zhengzhou': 'zhengzhou',
    'Harbin': 'harbin',
    'Foshan': 'foshan'
  };
  return pinyinMap[city] || city.toLowerCase();
}

/**
 * Determine school type based on name
 */
function determineSchoolType(name) {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('international')) return 'International School';
  if (nameLower.includes('bilingual')) return 'Bilingual School';
  if (nameLower.includes('private')) return 'Private School';
  if (nameLower.includes('university') || nameLower.includes('college')) return 'Higher Education';
  if (nameLower.includes('kindergarten') || nameLower.includes('preschool')) return 'Kindergarten';
  return 'School';
}

/**
 * Convert school data to CSV row
 */
function schoolToCSVRow(school) {
  const escapeCSV = (str) => {
    if (!str) return '';
    return `"${String(str).replace(/"/g, '""')}"`;
  };

  return [
    escapeCSV(school.name),
    escapeCSV(school.city),
    escapeCSV(school.type),
    escapeCSV(school.address),
    escapeCSV(school.website),
    escapeCSV(school.phone),
    escapeCSV(school.email),
    escapeCSV(school.description)
  ].join(',') + '\n';
}

/**
 * Main function to crawl all cities and generate CSV
 */
async function main() {
  console.log('🚀 Starting school crawl for major Chinese cities...');
  console.log(`📋 Cities to crawl: ${MAJOR_CITIES.length}`);
  
  const allSchools = [];
  const outputFile = path.join(__dirname, 'chinese-schools.csv');
  
  // Create CSV file with header
  fs.writeFileSync(outputFile, CSV_HEADER, 'utf8');
  
  // Crawl each city
  for (const city of MAJOR_CITIES) {
    try {
      const schools = await crawlSchoolsForCity(city);
      
      // Add city to each school if not already set
      schools.forEach(school => {
        if (!school.city) {
          school.city = city;
        }
      });
      
      allSchools.push(...schools);
      
      // Append to CSV file incrementally
      const csvRows = schools.map(schoolToCSVRow).join('');
      fs.appendFileSync(outputFile, csvRows, 'utf8');
      
      console.log(`  ✅ Found ${schools.length} schools in ${city}`);
      
      // Rate limiting - wait between cities
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Error processing ${city}:`, error.message);
    }
  }
  
  console.log(`\n✨ Crawl complete!`);
  console.log(`📊 Total schools found: ${allSchools.length}`);
  console.log(`💾 CSV file saved to: ${outputFile}`);
  
  // Also create a JSON backup
  const jsonFile = path.join(__dirname, 'chinese-schools.json');
  fs.writeFileSync(jsonFile, JSON.stringify(allSchools, null, 2), 'utf8');
  console.log(`💾 JSON backup saved to: ${jsonFile}`);
}

// Run the crawler
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

