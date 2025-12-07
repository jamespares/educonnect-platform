#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPrerequisites() {
  log('🔍 Checking prerequisites...', 'cyan');
  
  // Check if server.js exists
  if (!fs.existsSync('server.js')) {
    log('❌ server.js not found. Make sure you\'re in the project root directory.', 'red');
    process.exit(1);
  }
  
  // Check if .env file exists
  if (!fs.existsSync('.env')) {
    log('⚠️  .env file not found. Creating default .env file...', 'yellow');
    const defaultEnv = `# EduConnect Environment Variables
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
SESSION_SECRET=educonnect-secret-key-change-in-production
EMAIL_USER=team@educonnectchina.com
EMAIL_PASS=your-zoho-password
EMAIL_TO=team@educonnectchina.com
NODE_ENV=development
`;
    fs.writeFileSync('.env', defaultEnv);
    log('✅ Default .env file created. Update it with your actual credentials.', 'green');
  }
  
  // Check if database exists, if not create it
  if (!fs.existsSync('teachers.db')) {
    log('⚠️  Database not found. Creating database...', 'yellow');
    try {
      execSync('node -e "const Database = require(\'./scripts/legacy/database\'); new Database();"', { stdio: 'inherit' });
      log('✅ Database created successfully.', 'green');
    } catch (error) {
      log('❌ Failed to create database. Check database.js file.', 'red');
      process.exit(1);
    }
  }
  
  // Check if tests directory exists
  if (!fs.existsSync('tests')) {
    log('❌ Tests directory not found.', 'red');
    process.exit(1);
  }
  
  log('✅ All prerequisites met.', 'green');
}

function installDependencies() {
  log('📦 Installing dependencies...', 'cyan');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    log('✅ Dependencies installed successfully.', 'green');
  } catch (error) {
    log('❌ Failed to install dependencies.', 'red');
    process.exit(1);
  }
}

function seedDatabase() {
  log('🌱 Seeding database with test data...', 'cyan');
  
  try {
    if (fs.existsSync('scripts/db/seed-jobs.js')) {
      execSync('node scripts/db/seed-jobs.js', { stdio: 'inherit' });
      log('✅ Database seeded successfully.', 'green');
    } else {
      log('⚠️  Seed file not found. Continuing without seeding.', 'yellow');
    }
  } catch (error) {
    log('⚠️  Database seeding failed. Continuing with tests...', 'yellow');
  }
}

function startServer() {
  log('🚀 Starting server...', 'cyan');
  
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['server.js'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    let serverReady = false;
    
    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('running on port') || output.includes('listening on')) {
        if (!serverReady) {
          serverReady = true;
          log('✅ Server started successfully.', 'green');
          resolve(server);
        }
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    server.on('error', (error) => {
      log(`❌ Server failed to start: ${error.message}`, 'red');
      reject(error);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        log('❌ Server failed to start within 30 seconds.', 'red');
        server.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 30000);
  });
}

async function runTests(testType = 'all') {
  log(`🧪 Running ${testType} tests...`, 'cyan');
  
  const testCommands = {
    navigation: 'npx playwright test tests/navigation.test.js --reporter=html',
    forms: 'npx playwright test tests/forms.test.js --reporter=html',
    database: 'npx playwright test tests/database.test.js --reporter=html',
    ui: 'npx playwright test tests/ui.test.js --reporter=html',
    all: 'npx playwright test --reporter=html'
  };
  
  const command = testCommands[testType] || testCommands.all;
  
  try {
    execSync(command, { stdio: 'inherit' });
    log('✅ Tests completed successfully!', 'green');
    return true;
  } catch (error) {
    log('❌ Some tests failed. Check the test report for details.', 'red');
    return false;
  }
}

function generateReport() {
  log('📊 Generating test report...', 'cyan');
  
  const reportPath = path.join('playwright-report', 'index.html');
  
  if (fs.existsSync(reportPath)) {
    log(`✅ Test report generated: ${reportPath}`, 'green');
    log('🌐 Open the report in your browser to view detailed results.', 'cyan');
    
    // Try to open the report automatically
    const platform = process.platform;
    try {
      if (platform === 'darwin') {
        execSync(`open ${reportPath}`);
      } else if (platform === 'win32') {
        execSync(`start ${reportPath}`);
      } else {
        execSync(`xdg-open ${reportPath}`);
      }
      log('🎯 Report opened in your default browser.', 'green');
    } catch (error) {
      log('💡 Manually open the report file to view results.', 'yellow');
    }
  } else {
    log('⚠️  Test report not found.', 'yellow');
  }
}

function showHelp() {
  log('EduConnect Test Runner', 'bright');
  log('====================', 'bright');
  log('');
  log('Usage: node run-tests.js [options]', 'cyan');
  log('');
  log('Options:', 'yellow');
  log('  --type <test-type>  Run specific test type (navigation, forms, database, ui, all)', 'reset');
  log('  --no-seed          Skip database seeding', 'reset');
  log('  --no-install       Skip dependency installation', 'reset');
  log('  --help, -h         Show this help message', 'reset');
  log('');
  log('Examples:', 'yellow');
  log('  node run-tests.js                    # Run all tests', 'reset');
  log('  node run-tests.js --type navigation  # Run only navigation tests', 'reset');
  log('  node run-tests.js --no-seed          # Skip seeding, run all tests', 'reset');
  log('');
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const options = {
    type: 'all',
    seed: true,
    install: true,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--type' && i + 1 < args.length) {
      options.type = args[i + 1];
      i++;
    } else if (arg === '--no-seed') {
      options.seed = false;
    } else if (arg === '--no-install') {
      options.install = false;
    }
  }
  
  if (options.help) {
    showHelp();
    return;
  }
  
  log('🎯 EduConnect End-to-End Test Suite', 'bright');
  log('===================================', 'bright');
  log('');
  
  let server;
  
  try {
    // 1. Check prerequisites
    checkPrerequisites();
    log('');
    
    // 2. Install dependencies
    if (options.install) {
      installDependencies();
      log('');
    }
    
    // 3. Seed database
    if (options.seed) {
      seedDatabase();
      log('');
    }
    
    // 4. Start server
    server = await startServer();
    log('');
    
    // Wait a moment for server to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Run tests
    const testsPassed = await runTests(options.type);
    log('');
    
    // 6. Generate report
    generateReport();
    log('');
    
    // 7. Summary
    if (testsPassed) {
      log('🎉 All tests completed successfully!', 'green');
      log('Your EduConnect application is ready for production.', 'green');
    } else {
      log('⚠️  Some tests failed. Please review the report and fix issues.', 'yellow');
    }
    
  } catch (error) {
    log(`❌ Test execution failed: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    // Clean up: stop server
    if (server) {
      log('🛑 Stopping server...', 'cyan');
      server.kill();
      
      // Wait for server to stop
      await new Promise(resolve => setTimeout(resolve, 1000));
      log('✅ Server stopped.', 'green');
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\\n🛑 Test execution interrupted.', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\\n🛑 Test execution terminated.', 'yellow');
  process.exit(0);
});

// Run the main function
main().catch(error => {
  log(`❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});