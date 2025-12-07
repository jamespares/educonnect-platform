const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const schoolsPath = path.join(__dirname, 'schools.csv');
const chineseSchoolsPath = path.join(__dirname, 'chinese-schools.csv');
const outputPath = path.join(__dirname, 'schools_cleaned.csv');

/**
 * Read CSV file and parse it
 */
function readCsv(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  });
}

/**
 * Write cleaned data to CSV
 */
function writeCsv(data, filePath) {
  const output = stringify(data, {
    header: true,
    quoted: true,
    quoted_empty: false
  });
  fs.writeFileSync(filePath, output, 'utf8');
}

/**
 * Check if a school name is generic/invalid
 */
function isInvalidSchoolName(name, city) {
  if (!name || name.trim().length < 3) return true;
  
  const normalized = name.trim().toLowerCase();
  const cityLower = (city || '').trim().toLowerCase();
  
  // Generic names that aren't real schools
  const genericNames = [
    'international school',
    'junior school',
    'senior school',
    'ib world school',
    'private school',
    'higher education',
    'related school',
    'school',
    'at the international montessori school', // Incomplete name
    'advanced placement', // This is a program, not a school
    'affiliated school', // Too generic
    '- school', // Parsing artifact
    'school life', // Not a school name
    'sports teams available', // Not a school name
    'bilingual school', // Too generic
    'chinese high school', // Too generic
  ];
  
  // Check for names that start with special characters or are clearly not school names
  if (normalized.startsWith('-') || normalized.startsWith('_') || normalized.startsWith('.')) {
    return true;
  }
  
  // Check for names that are clearly not school names (contain phrases like "available", "teams", etc.)
  const invalidPhrases = [
    'available', 'teams', 'sports teams', 'school life', 'life at',
    'exterior of', 'aerial view of', 'getting started', 'independently funded',
    'annual tuition fees at', 'navigating the season', 'back gate of',
    'photo image of', 'multicultural & affordable', 'our china international schools',
    'day school', 'city campus', 'college school' // Too generic without more context
  ];
  if (invalidPhrases.some(phrase => normalized.includes(phrase) && normalized.length < 50)) {
    return true;
  }
  
  // Check for names that are just descriptions, not school names
  if (normalized.match(/^(cheap|expensive|good|best|top|new|old)\s+/i)) {
    return true;
  }
  
  // Filter out very generic names that are likely not specific schools
  const veryGenericNames = ['day school', 'city campus', 'college school', 'high school', 'middle school', 'primary school'];
  if (veryGenericNames.includes(normalized) && normalized.length < 20) {
    return true;
  }
  
  // Check if name exactly matches a generic name
  if (genericNames.includes(normalized)) return true;
  
  // Check if name is just a city name (common data quality issue)
  if (normalized === cityLower && cityLower.length > 0) return true;
  
  // Check if name is just a type description
  if (normalized.match(/^(international|private|public|chinese|british|american|german|french|japanese|korean)\s*school$/i)) {
    return true;
  }
  
  // Check if name is too short or just numbers
  if (normalized.length < 3 || /^\d+$/.test(normalized)) return true;
  
  return false;
}

/**
 * Check if URL is invalid/bad
 */
function isInvalidUrl(url) {
  if (!url || url.trim().length === 0) return false; // Empty URLs are OK
  
  const normalized = url.toLowerCase();
  
  // Bad URL patterns
  const badPatterns = [
    '/account/guest/new',
    '/login',
    '/signin',
    'search-articles',
    'school-news',
    'author/',
    '/account/',
    'expatexchange.com/data',
    'expatexchange.com/countries',
    'whichschooladvisor.com/uae/search-articles',
    'whichschooladvisor.com/uae/school-news',
    'internationalschoolsreview.com/author',
    'oss-accelerate.aliyuncs.com/wordpress/wp-content/uploads', // Image URLs
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', // Image files
    '/articles/', // Article pages
    '/wp-content/', // WordPress media files
    '/static/assets/icons/', // Icon files
    'youtube.com/channel', // YouTube channels
    '/2020/', '/2021/', '/2022/', '/2023/', '/2024/', '/2025/', // Blog post URLs with years
    'fitzgabrielsschools.com', // Appears to be a blog, not individual school sites
  ];
  
  return badPatterns.some(pattern => normalized.includes(pattern));
}

/**
 * Check if URL is a directory/listing site (not the actual school website)
 */
function isDirectoryUrl(url) {
  if (!url || url.trim().length === 0) return false;
  
  const normalized = url.toLowerCase();
  
  // Known directory/listing sites
  const directoryDomains = [
    'searchassociates.com',
    'whichschooladvisor.com',
    'international-schools-database.com',
    'internationalschoolsreview.com',
    'expatexchange.com',
    'echinacities.com',
    'echinacities.net',
    'openapply.com',
    'scholaro.com',
    'chinaeducenter.com',
    'expatarrivals.com',
    'schoolsinshanghai.com',
    'schoolsinbeijing.com',
    'teacherhorizons.com',
    'toptutorjob.com',
    'nessic.org',
    'chengdu-expat.com',
    'ischooladvisor.com',
    'educationdestinationasia.com',
    'world-schools.com',
    'google.com/maps', // Google Maps URLs are not school websites
  ];
  
  // Also check for directory-like URL patterns
  if (normalized.includes('/school-comparison/') || 
      normalized.includes('/schools/') && (normalized.includes('world-schools') || normalized.includes('educationdestination'))) {
    return true;
  }
  
  return directoryDomains.some(domain => normalized.includes(domain));
}

/**
 * Clean and normalize a URL
 */
function cleanUrl(url) {
  if (!url || url.trim().length === 0) return '';
  
  let cleaned = url.trim();
  
  // Remove common URL fragments
  cleaned = cleaned.replace(/#.*$/, '');
  cleaned = cleaned.replace(/\?.*$/, '');
  
  // Ensure it starts with http:// or https://
  if (!cleaned.match(/^https?:\/\//i)) {
    cleaned = 'https://' + cleaned;
  }
  
  return cleaned;
}

/**
 * Clean and normalize phone number
 */
function cleanPhone(phone) {
  if (!phone || phone.trim().length === 0) return '';
  
  // Remove common non-digit characters but keep + and spaces
  let cleaned = phone.trim();
  
  // Basic validation - should have at least 7 digits
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 7) return '';
  
  return cleaned;
}

/**
 * Clean and normalize email
 */
function cleanEmail(email) {
  if (!email || email.trim().length === 0) return '';
  
  const cleaned = email.trim().toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) return '';
  
  return cleaned;
}

/**
 * Split entries that contain multiple schools (separated by newlines)
 */
function splitMultiSchoolEntries(schools) {
  const splitSchools = [];
  
  for (const school of schools) {
    const name = school['School Name']?.trim() || '';
    
    // Check if name contains newlines (multiple schools)
    if (name.includes('\n')) {
      const names = name.split('\n').map(n => n.trim()).filter(n => n.length > 0);
      
      // Create separate entry for each school name
      for (const singleName of names) {
        splitSchools.push({
          ...school,
          'School Name': singleName
        });
      }
    } else {
      splitSchools.push(school);
    }
  }
  
  return splitSchools;
}

/**
 * Clean a single school record
 */
function cleanSchoolRecord(school) {
  const cleaned = {
    'School Name': (school['School Name'] || '').trim(),
    'City': (school['City'] || '').trim(),
    'Type': (school['Type'] || '').trim(),
    'Address': (school['Address'] || '').trim(),
    'Website': cleanUrl(school['Website'] || ''),
    'Phone': cleanPhone(school['Phone'] || ''),
    'Email': cleanEmail(school['Email'] || ''),
    'Description': (school['Description'] || '').trim(),
    'Website Type': '', // Will be set below
    'Data Quality': 'Good' // Will be set below
  };
  
  // Categorize website type
  if (cleaned['Website']) {
    if (isInvalidUrl(cleaned['Website'])) {
      cleaned['Website'] = '';
      cleaned['Website Type'] = '';
    } else if (isDirectoryUrl(cleaned['Website'])) {
      cleaned['Website Type'] = 'Directory/Listing';
    } else {
      cleaned['Website Type'] = 'School Website';
    }
  }
  
  // Assess data quality
  const qualityFlags = [];
  if (!cleaned['Website']) qualityFlags.push('No Website');
  if (!cleaned['Phone']) qualityFlags.push('No Phone');
  if (!cleaned['Email']) qualityFlags.push('No Email');
  if (!cleaned['Address']) qualityFlags.push('No Address');
  if (cleaned['Website Type'] === 'Directory/Listing') qualityFlags.push('Directory URL Only');
  
  if (qualityFlags.length === 0) {
    cleaned['Data Quality'] = 'Excellent';
  } else if (qualityFlags.length <= 2) {
    cleaned['Data Quality'] = 'Good';
  } else if (qualityFlags.length <= 3) {
    cleaned['Data Quality'] = 'Fair';
  } else {
    cleaned['Data Quality'] = 'Poor';
  }
  
  return cleaned;
}

/**
 * Create a unique key for deduplication
 */
function createSchoolKey(school) {
  const name = (school['School Name'] || '').trim().toLowerCase();
  const city = (school['City'] || '').trim().toLowerCase();
  return `${name}|${city}`;
}

/**
 * Merge two school records, preferring non-empty fields
 */
function mergeSchoolRecords(existing, newRecord) {
  const merged = { ...existing };
  
  // Prefer non-empty fields from newRecord
  for (const key of Object.keys(newRecord)) {
    if (newRecord[key] && !existing[key]) {
      merged[key] = newRecord[key];
    }
  }
  
  return merged;
}

/**
 * Main cleaning function
 */
function cleanSchoolsData() {
  console.log('Reading CSV files...');
  const schools = readCsv(schoolsPath);
  const chineseSchools = readCsv(chineseSchoolsPath);
  
  console.log(`Loaded ${schools.length} schools from schools.csv`);
  console.log(`Loaded ${chineseSchools.length} schools from chinese-schools.csv`);
  
  // Combine all schools
  let allSchools = [...schools, ...chineseSchools];
  console.log(`Total schools before processing: ${allSchools.length}`);
  
  // Split multi-school entries
  console.log('Splitting multi-school entries...');
  allSchools = splitMultiSchoolEntries(allSchools);
  console.log(`After splitting: ${allSchools.length} schools`);
  
  // Clean each record
  console.log('Cleaning school records...');
  const cleanedSchools = allSchools.map(cleanSchoolRecord);
  
  // Filter out invalid school names
  console.log('Filtering invalid school names...');
  const validSchools = cleanedSchools.filter(school => {
    return !isInvalidSchoolName(school['School Name'], school['City']);
  });
  console.log(`After filtering invalid names: ${validSchools.length} schools`);
  
  // Deduplicate by name + city
  console.log('Deduplicating schools...');
  const uniqueSchools = new Map();
  
  for (const school of validSchools) {
    const key = createSchoolKey(school);
    
    if (!uniqueSchools.has(key)) {
      uniqueSchools.set(key, school);
    } else {
      // Merge with existing record
      const existing = uniqueSchools.get(key);
      uniqueSchools.set(key, mergeSchoolRecords(existing, school));
    }
  }
  
  const finalSchools = Array.from(uniqueSchools.values());
  console.log(`After deduplication: ${finalSchools.length} unique schools`);
  
  // Sort by city, then by school name
  finalSchools.sort((a, b) => {
    const cityCompare = (a['City'] || '').localeCompare(b['City'] || '');
    if (cityCompare !== 0) return cityCompare;
    return (a['School Name'] || '').localeCompare(b['School Name'] || '');
  });
  
  // Generate statistics
  const stats = {
    total: finalSchools.length,
    withWebsite: finalSchools.filter(s => s['Website']).length,
    withSchoolWebsite: finalSchools.filter(s => s['Website Type'] === 'School Website').length,
    withDirectoryUrl: finalSchools.filter(s => s['Website Type'] === 'Directory/Listing').length,
    withPhone: finalSchools.filter(s => s['Phone']).length,
    withEmail: finalSchools.filter(s => s['Email']).length,
    withAddress: finalSchools.filter(s => s['Address']).length,
    withAllContact: finalSchools.filter(s => s['Website'] && s['Phone'] && s['Email']).length,
    cities: new Set(finalSchools.map(s => s['City'])).size,
    types: {},
    quality: {}
  };
  
  finalSchools.forEach(school => {
    const type = school['Type'] || 'Unknown';
    stats.types[type] = (stats.types[type] || 0) + 1;
    
    const quality = school['Data Quality'] || 'Unknown';
    stats.quality[quality] = (stats.quality[quality] || 0) + 1;
  });
  
  console.log('\n=== CLEANING STATISTICS ===');
  console.log(`Total schools: ${stats.total}`);
  console.log(`Schools with website: ${stats.withWebsite} (${Math.round(stats.withWebsite/stats.total*100)}%)`);
  console.log(`  - School websites: ${stats.withSchoolWebsite} (${Math.round(stats.withSchoolWebsite/stats.total*100)}%)`);
  console.log(`  - Directory/listing URLs: ${stats.withDirectoryUrl} (${Math.round(stats.withDirectoryUrl/stats.total*100)}%)`);
  console.log(`Schools with phone: ${stats.withPhone} (${Math.round(stats.withPhone/stats.total*100)}%)`);
  console.log(`Schools with email: ${stats.withEmail} (${Math.round(stats.withEmail/stats.total*100)}%)`);
  console.log(`Schools with address: ${stats.withAddress} (${Math.round(stats.withAddress/stats.total*100)}%)`);
  console.log(`Schools with all contact info: ${stats.withAllContact} (${Math.round(stats.withAllContact/stats.total*100)}%)`);
  console.log(`Unique cities: ${stats.cities}`);
  console.log('\nSchool types:');
  Object.entries(stats.types)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  console.log('\nData quality distribution:');
  Object.entries(stats.quality)
    .sort((a, b) => {
      const order = { 'Excellent': 0, 'Good': 1, 'Fair': 2, 'Poor': 3 };
      return (order[a[0]] || 99) - (order[b[0]] || 99);
    })
    .forEach(([quality, count]) => {
      console.log(`  ${quality}: ${count} (${Math.round(count/stats.total*100)}%)`);
    });
  
  // Write cleaned data
  console.log(`\nWriting cleaned data to ${outputPath}...`);
  writeCsv(finalSchools, outputPath);
  console.log('Done!');
  
  return finalSchools;
}

// Run the cleaning process
if (require.main === module) {
  try {
    cleanSchoolsData();
  } catch (error) {
    console.error('Error cleaning schools data:', error);
    process.exit(1);
  }
}

module.exports = { cleanSchoolsData };
