const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const schoolsPath = path.join(__dirname, 'schools.csv');
const chineseSchoolsPath = path.join(__dirname, 'chinese-schools.csv');

function readCsv(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  });
}

const schools = readCsv(schoolsPath);
const chineseSchools = readCsv(chineseSchoolsPath);

console.log(`schools.csv count: ${schools.length}`);
console.log(`chinese-schools.csv count: ${chineseSchools.length}`);

// Combine and Deduplicate
const allSchools = [...schools, ...chineseSchools];
const uniqueSchools = new Map();

allSchools.forEach(school => {
  const name = school['School Name']?.trim();
  const city = school['City']?.trim();
  
  if (!name || !city) return;
  
  const key = `${name.toLowerCase()}|${city.toLowerCase()}`;
  
  // Logic to prefer better data? For now, just take the first one or override if more info?
  // Let's just keep the first one encountered for now, or maybe check for non-empty fields.
  if (!uniqueSchools.has(key)) {
    uniqueSchools.set(key, school);
  } else {
    // optional: merge data if one has email/phone and other doesn't
  }
});

console.log(`Total unique schools by Name+City: ${uniqueSchools.size}`);

// Quality Check
const badKeywords = ['International School', 'School', 'Junior School', 'Senior School', 'IB World School', 'Private School', 'Higher Education'];
const badUrlPatterns = ['search-articles', 'school-news', 'author/', '/account/guest/new', 'login', 'signin'];

let cleanCount = 0;
const cleanedSchools = [];

for (const school of uniqueSchools.values()) {
  const name = school['School Name'];
  const url = school['Website'];
  
  // Filter out generic names if they strictly match the bad keywords list (case insensitive)
  if (badKeywords.some(k => k.toLowerCase() === name.toLowerCase())) {
    continue;
  }
  
  // Filter out bad URLs
  if (url && badUrlPatterns.some(p => url.includes(p))) {
    // Maybe we keep the school but remove the URL? Or is the entry likely garbage?
    // Given the examples (Gordonstoun pointing to an article), the entry itself might be ghost/bad.
    // But "Nord Anglia" had a bad URL but is a real school.
    // Strategy: Clear the URL if it looks bad, but keep the school if the name looks specific enough.
    // However, if the name is questionable AND the URL is bad, maybe drop it.
    
    // For now, let's mark URL as empty if bad
    school['Website'] = '';
  }
  
  cleanedSchools.push(school);
}

console.log(`Count after cleaning names and URLs: ${cleanedSchools.length}`);
