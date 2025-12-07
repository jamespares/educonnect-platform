#!/usr/bin/env node

/**
 * Generate secure credentials for production deployment
 * Usage: node generate-credentials.js [password]
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function generateSessionSecret() {
    return crypto.randomBytes(32).toString('hex');
}

async function generatePasswordHash(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

async function main() {
    const args = process.argv.slice(2);
    const password = args[0] || crypto.randomBytes(16).toString('base64').slice(0, 16);
    
    console.log('\n🔐 Generating Production Credentials\n');
    console.log('=' .repeat(50));
    
    // Generate session secret
    const sessionSecret = generateSessionSecret();
    console.log('\n📋 SESSION_SECRET:');
    console.log(sessionSecret);
    
    // Generate password hash
    const passwordHash = await generatePasswordHash(password);
    console.log('\n📋 ADMIN_PASSWORD_HASH:');
    console.log(passwordHash);
    
    console.log('\n📋 ADMIN_PASSWORD (for reference):');
    console.log(password);
    
    console.log('\n' + '='.repeat(50));
    console.log('\n✅ Copy these values to your production environment variables:\n');
    console.log(`SESSION_SECRET=${sessionSecret}`);
    console.log(`ADMIN_PASSWORD_HASH=${passwordHash}`);
    console.log(`ADMIN_USERNAME=<your-secure-username>`);
    console.log('\n⚠️  Keep these credentials secure and never commit them to git!\n');
}

main().catch(console.error);

