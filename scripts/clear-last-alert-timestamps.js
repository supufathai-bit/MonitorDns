#!/usr/bin/env node

/**
 * Script to clear all last alert timestamps from D1
 * This will make the system send alerts immediately (no interval wait)
 */

const { execSync } = require('child_process');
const path = require('path');

// Change to workers directory
const workersDir = path.join(__dirname, '..', 'workers');

console.log('🧹 Clearing all last alert timestamps...\n');

try {
    // Delete all last alert timestamps
    const sql = `DELETE FROM settings WHERE key LIKE 'last_alert:chat:%';`;

    console.log('📝 SQL to execute:');
    console.log(sql);
    console.log('\n');

    // Execute SQL using wrangler (--remote to update production database)
    console.log('🔄 Executing SQL in D1 database (remote/production)...\n');
    execSync(
        `npx wrangler d1 execute sentinel-dns-db --remote --command "${sql}"`,
        {
            cwd: workersDir,
            encoding: 'utf-8',
            stdio: 'inherit'
        }
    );

    console.log('\n✅ Successfully cleared all last alert timestamps!');
    console.log('📋 System will send alerts immediately on next Cron run.\n');

} catch (error) {
    console.error('\n❌ Error clearing last alert timestamps:');
    console.error(error.message);
    process.exit(1);
}
