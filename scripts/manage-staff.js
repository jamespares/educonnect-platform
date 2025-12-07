#!/usr/bin/env node

/**
 * Staff Management Script
 * 
 * This script helps you manage staff accounts in the database.
 * 
 * Usage:
 *   node manage-staff.js list                    - List all staff members
 *   node manage-staff.js add <username> <password> [fullname] - Add a new staff member
 *   node manage-staff.js update-password <username> <newpassword> - Update a staff member's password
 *   node manage-staff.js delete <username>       - Delete a staff member
 *   node manage-staff.js deactivate <username>   - Deactivate a staff member
 *   node manage-staff.js activate <username>     - Activate a staff member
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to hash password
async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

// List all staff members
async function listStaff() {
    try {
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        if (data.length === 0) {
            console.log('📋 No staff members found.');
            return;
        }

        console.log('\n📋 Staff Members:\n');
        console.log('─'.repeat(80));
        console.log(`${'Username'.padEnd(20)} ${'Full Name'.padEnd(25)} ${'Role'.padEnd(15)} ${'Status'.padEnd(10)} ${'Created'}`);
        console.log('─'.repeat(80));

        data.forEach(staff => {
            const username = (staff.username || '').padEnd(20);
            const fullName = (staff.full_name || 'N/A').padEnd(25);
            const role = (staff.role || 'staff').padEnd(15);
            const status = (staff.is_active ? 'Active' : 'Inactive').padEnd(10);
            const created = new Date(staff.created_at).toLocaleDateString();
            
            console.log(`${username} ${fullName} ${role} ${status} ${created}`);
        });

        console.log('─'.repeat(80));
        console.log(`\nTotal: ${data.length} staff member(s)\n`);
    } catch (error) {
        console.error('❌ Error listing staff:', error.message);
        process.exit(1);
    }
}

// Add a new staff member
async function addStaff(username, password, fullName = null) {
    try {
        // Check if username already exists
        const { data: existing } = await supabase
            .from('staff')
            .select('username')
            .eq('username', username)
            .single();

        if (existing) {
            console.error(`❌ Error: Username "${username}" already exists`);
            process.exit(1);
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Insert new staff member
        const { data, error } = await supabase
            .from('staff')
            .insert({
                username: username,
                password_hash: passwordHash,
                full_name: fullName || null,
                role: 'staff',
                is_active: true
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        console.log(`✅ Staff member "${username}" added successfully!`);
        console.log(`   Full Name: ${fullName || 'Not set'}`);
        console.log(`   Role: ${data.role}`);
        console.log(`   Status: ${data.is_active ? 'Active' : 'Inactive'}\n`);
    } catch (error) {
        console.error('❌ Error adding staff:', error.message);
        process.exit(1);
    }
}

// Update staff password
async function updatePassword(username, newPassword) {
    try {
        // Check if staff exists
        const { data: staff } = await supabase
            .from('staff')
            .select('id, username')
            .eq('username', username)
            .single();

        if (!staff) {
            console.error(`❌ Error: Staff member "${username}" not found`);
            process.exit(1);
        }

        // Hash new password
        const passwordHash = await hashPassword(newPassword);

        // Update password
        const { error } = await supabase
            .from('staff')
            .update({ password_hash: passwordHash })
            .eq('id', staff.id);

        if (error) {
            throw error;
        }

        console.log(`✅ Password updated successfully for "${username}"!\n`);
    } catch (error) {
        console.error('❌ Error updating password:', error.message);
        process.exit(1);
    }
}

// Delete a staff member
async function deleteStaff(username) {
    try {
        // Check if staff exists
        const { data: staff } = await supabase
            .from('staff')
            .select('id, username')
            .eq('username', username)
            .single();

        if (!staff) {
            console.error(`❌ Error: Staff member "${username}" not found`);
            process.exit(1);
        }

        // Delete staff member
        const { error } = await supabase
            .from('staff')
            .delete()
            .eq('id', staff.id);

        if (error) {
            throw error;
        }

        console.log(`✅ Staff member "${username}" deleted successfully!\n`);
    } catch (error) {
        console.error('❌ Error deleting staff:', error.message);
        process.exit(1);
    }
}

// Deactivate a staff member
async function deactivateStaff(username) {
    try {
        const { data: staff } = await supabase
            .from('staff')
            .select('id, username')
            .eq('username', username)
            .single();

        if (!staff) {
            console.error(`❌ Error: Staff member "${username}" not found`);
            process.exit(1);
        }

        const { error } = await supabase
            .from('staff')
            .update({ is_active: false })
            .eq('id', staff.id);

        if (error) {
            throw error;
        }

        console.log(`✅ Staff member "${username}" deactivated successfully!\n`);
    } catch (error) {
        console.error('❌ Error deactivating staff:', error.message);
        process.exit(1);
    }
}

// Activate a staff member
async function activateStaff(username) {
    try {
        const { data: staff } = await supabase
            .from('staff')
            .select('id, username')
            .eq('username', username)
            .single();

        if (!staff) {
            console.error(`❌ Error: Staff member "${username}" not found`);
            process.exit(1);
        }

        const { error } = await supabase
            .from('staff')
            .update({ is_active: true })
            .eq('id', staff.id);

        if (error) {
            throw error;
        }

        console.log(`✅ Staff member "${username}" activated successfully!\n`);
    } catch (error) {
        console.error('❌ Error activating staff:', error.message);
        process.exit(1);
    }
}

// Main function
async function main() {
    const command = process.argv[2];
    const args = process.argv.slice(3);

    switch (command) {
        case 'list':
            await listStaff();
            break;

        case 'add':
            if (args.length < 2) {
                console.error('❌ Usage: node manage-staff.js add <username> <password> [fullname]');
                process.exit(1);
            }
            await addStaff(args[0], args[1], args[2] || null);
            break;

        case 'update-password':
            if (args.length < 2) {
                console.error('❌ Usage: node manage-staff.js update-password <username> <newpassword>');
                process.exit(1);
            }
            await updatePassword(args[0], args[1]);
            break;

        case 'delete':
            if (args.length < 1) {
                console.error('❌ Usage: node manage-staff.js delete <username>');
                process.exit(1);
            }
            await deleteStaff(args[0]);
            break;

        case 'deactivate':
            if (args.length < 1) {
                console.error('❌ Usage: node manage-staff.js deactivate <username>');
                process.exit(1);
            }
            await deactivateStaff(args[0]);
            break;

        case 'activate':
            if (args.length < 1) {
                console.error('❌ Usage: node manage-staff.js activate <username>');
                process.exit(1);
            }
            await activateStaff(args[0]);
            break;

        default:
            console.log(`
📋 Staff Management Script

Usage:
  node manage-staff.js list                              - List all staff members
  node manage-staff.js add <username> <password> [name]  - Add a new staff member
  node manage-staff.js update-password <username> <pass>  - Update a staff member's password
  node manage-staff.js delete <username>                 - Delete a staff member
  node manage-staff.js deactivate <username>             - Deactivate a staff member
  node manage-staff.js activate <username>               - Activate a staff member

Examples:
  node manage-staff.js list
  node manage-staff.js add john "securePassword123" "John Doe"
  node manage-staff.js update-password john "newPassword456"
  node manage-staff.js deactivate john
            `);
            process.exit(1);
    }
}

// Run the script
main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});

