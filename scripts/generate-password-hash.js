// Simple script to generate a bcrypt hash for admin password
// Usage: node generate-password-hash.js <password>
// Or: ADMIN_PASSWORD=yourpassword node generate-password-hash.js

const bcrypt = require('bcryptjs');

const password = process.argv[2] || process.env.ADMIN_PASSWORD || 'password';

const hash = bcrypt.hashSync(password, 10);

console.log('\n=== Admin Password Hash Generator ===\n');
console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nAdd this to your Railway environment variables:');
console.log('ADMIN_PASSWORD_HASH=' + hash);
console.log('\nOr set ADMIN_PASSWORD in env and the server will hash it automatically.\n');

