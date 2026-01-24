#!/usr/bin/env node

/**
 * Script to clear all custom Telegram chat IDs from domains in D1
 * This will make all domains send alerts only to the default chat
 */

const { execSync } = require('child_process');
const path = require('path');

// Change to workers directory
const workersDir = path.join(__dirname, '..', 'workers');

console.log('🧹 Clearing all custom Telegram chat IDs from domains...\n');

try {
    // Update all domains to set telegram_chat_id to NULL
    const sql = `UPDATE domains SET telegram_chat_id = NULL WHERE telegram_chat_id IS NOT NULL;`;

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

    console.log('\n✅ Successfully cleared all custom Telegram chat IDs!');
    console.log('📋 All domains will now send alerts only to the default chat.\n');

} catch (error) {
    console.error('\n❌ Error clearing custom chat IDs:');
    console.error(error.message);
    process.exit(1);
}
