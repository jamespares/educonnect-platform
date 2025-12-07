const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const cleanedSchoolsPath = path.join(__dirname, 'schools_cleaned.csv');
const verifiedOutputPath = path.join(__dirname, 'schools_verified.csv');

/**
 * Read CSV file
 */
function readCsv(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  });
}

/**
 * Write CSV file
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
 * Check if a URL is accessible (simple HEAD request)
 */
function checkUrl(url, timeout = 5000) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) {
      resolve({ exists: false, status: 'Invalid URL' });
      return;
    }

    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD',
      timeout: timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SchoolVerifier/1.0)'
      }
    };

    const req = client.request(options, (res) => {
      resolve({
        exists: res.statusCode >= 200 && res.statusCode < 400,
        status: res.statusCode,
        redirected: res.statusCode >= 300 && res.statusCode < 400
      });
      res.destroy();
    });

    req.on('error', (error) => {
      resolve({
        exists: false,
        status: error.code || 'Error',
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        exists: false,
        status: 'Timeout'
      });
    });

    req.end();
  });
}

/**
 * Verify schools by checking their websites
 * Note: This is a basic check - a 200 response doesn't guarantee the school exists
 */
async function verifySchools(sampleSize = 50) {
  console.log('Reading cleaned schools data...');
  const schools = readCsv(cleanedSchoolsPath);
  
  console.log(`Total schools: ${schools.length}`);
  console.log(`Verifying first ${sampleSize} schools with websites...\n`);
  
  // Get schools with websites
  const schoolsWithWebsites = schools.filter(s => s['Website'] && s['Website Type'] === 'School Website');
  
  if (schoolsWithWebsites.length === 0) {
    console.log('No schools with direct website URLs found.');
    return;
  }
  
  // Sample for verification (to avoid overwhelming servers)
  const sample = schoolsWithWebsites.slice(0, sampleSize);
  
  console.log(`Checking ${sample.length} school websites...\n`);
  
  const verifiedSchools = [];
  let checked = 0;
  
  for (const school of sample) {
    checked++;
    process.stdout.write(`[${checked}/${sample.length}] Checking ${school['School Name']}... `);
    
    const result = await checkUrl(school['Website']);
    
    school['Website Verified'] = result.exists ? 'Yes' : 'No';
    school['Website Status'] = result.status;
    school['Verification Date'] = new Date().toISOString().split('T')[0];
    
    if (result.exists) {
      console.log(`✓ Accessible (${result.status})`);
    } else {
      console.log(`✗ Not accessible (${result.status})`);
    }
    
    verifiedSchools.push(school);
    
    // Be polite - wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Add remaining schools without verification
  const remainingSchools = schools.filter(s => 
    !sample.some(sampled => sampled['School Name'] === s['School Name'] && sampled['City'] === s['City'])
  );
  
  // Add verification columns to remaining schools
  remainingSchools.forEach(school => {
    school['Website Verified'] = '';
    school['Website Status'] = '';
    school['Verification Date'] = '';
  });
  
  const allSchools = [...verifiedSchools, ...remainingSchools];
  
  // Sort by verification status, then by data quality
  allSchools.sort((a, b) => {
    const aVerified = a['Website Verified'] === 'Yes' ? 1 : 0;
    const bVerified = b['Website Verified'] === 'Yes' ? 1 : 0;
    if (aVerified !== bVerified) return bVerified - aVerified;
    
    const qualityOrder = { 'Excellent': 0, 'Good': 1, 'Fair': 2, 'Poor': 3 };
    const aQuality = qualityOrder[a['Data Quality']] || 99;
    const bQuality = qualityOrder[b['Data Quality']] || 99;
    return aQuality - bQuality;
  });
  
  console.log('\n=== VERIFICATION SUMMARY ===');
  const verifiedCount = verifiedSchools.filter(s => s['Website Verified'] === 'Yes').length;
  console.log(`Verified accessible: ${verifiedCount}/${sample.length} (${Math.round(verifiedCount/sample.length*100)}%)`);
  
  console.log(`\nWriting verified data to ${verifiedOutputPath}...`);
  writeCsv(allSchools, verifiedOutputPath);
  console.log('Done!');
  
  return allSchools;
}

// Run verification
if (require.main === module) {
  const sampleSize = process.argv[2] ? parseInt(process.argv[2]) : 50;
  
  verifySchools(sampleSize)
    .then(() => {
      console.log('\nNote: Website verification is a basic check. A 200 response doesn\'t guarantee the school exists.');
      console.log('For marketing purposes, you should manually verify high-priority schools.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error verifying schools:', error);
      process.exit(1);
    });
}

module.exports = { verifySchools, checkUrl };
