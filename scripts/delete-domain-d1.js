#!/usr/bin/env node

/**
 * Script to delete domains from D1 database using Wrangler CLI
 * 
 * Usage:
 *   node scripts/delete-domain-d1.js <hostname1> [hostname2] ...
 * 
 * Example:
 *   node scripts/delete-domain-d1.js ufathai.bet www.ufathai.bet
 * 
 * This will delete the domain and all related results from D1
 */

const { execSync } = require('child_process');
const path = require('path');

const DB_NAME = 'sentinel-dns-db';
const DB_ID = '1a3833e0-a84f-45c8-b933-95e467f6c57f';

// Normalize hostname function (same as in workers/src/index.ts)
function normalizeHostname(hostname) {
    return hostname.toLowerCase().replace(/^www\./, '');
}

// Get hostnames from command line arguments
const hostnamesToDelete = process.argv.slice(2);

if (hostnamesToDelete.length === 0) {
    console.error('❌ Error: Please provide at least one hostname to delete');
    console.log('\nUsage:');
    console.log('  node scripts/delete-domain-d1.js <hostname1> [hostname2] ...');
    console.log('\nExample:');
    console.log('  node scripts/delete-domain-d1.js ufathai.bet www.ufathai.bet');
    process.exit(1);
}

console.log('🗑️  Deleting domains from D1 database...\n');

// Change to workers directory
const workersDir = path.join(__dirname, '..', 'workers');

try {
    // Normalize all hostnames to delete
    const normalizedToDelete = hostnamesToDelete.map(normalizeHostname);

    // First, get all domains from D1 to find matches
    console.log('📋 Fetching all domains from D1...');
    const getDomainsOutput = execSync(
        `wrangler d1 execute ${DB_NAME} --command "SELECT hostname FROM domains"`,
        {
            cwd: workersDir,
            encoding: 'utf-8',
            env: { ...process.env }
        }
    );

    // Parse the output (Wrangler outputs JSON in some format, but let's try to extract hostnames)
    // Actually, let's use a simpler approach - delete by exact hostname match first, then try variations
    console.log('\n🗑️  Deleting domains and results...\n');

    for (const hostnameToDelete of hostnamesToDelete) {
        const normalized = normalizeHostname(hostnameToDelete);
        console.log(`\n📝 Processing: ${hostnameToDelete} (normalized: ${normalized})`);

        // Delete all matching domains (with variations)
        // We'll use a SQL query that matches normalized hostnames
        // First, let's try to find all matching hostnames
        const findMatchingSQL = `SELECT hostname FROM domains WHERE LOWER(hostname) LIKE '%${normalized.replace(/[%_]/g, (c) => '\\' + c)}%'`;

        try {
            // Get all matching hostnames
            const findOutput = execSync(
                `wrangler d1 execute ${DB_NAME} --command "${findMatchingSQL}"`,
                {
                    cwd: workersDir,
                    encoding: 'utf-8',
                    env: { ...process.env }
                }
            );

            // For simplicity, let's delete by checking each possible variation
            const variations = [
                normalized,
                `www.${normalized}`,
                normalized.replace(/^www\./, ''),
                hostnameToDelete,
                hostnameToDelete.toLowerCase(),
                hostnameToDelete.toLowerCase().replace(/^www\./, ''),
                `www.${hostnameToDelete.toLowerCase().replace(/^www\./, '')}`
            ];

            const uniqueVariations = [...new Set(variations)];

            for (const variation of uniqueVariations) {
                try {
                    // Delete domain
                    const deleteDomainSQL = `DELETE FROM domains WHERE hostname = '${variation.replace(/'/g, "''")}'`;
                    execSync(
                        `wrangler d1 execute ${DB_NAME} --command "${deleteDomainSQL}"`,
                        {
                            cwd: workersDir,
                            stdio: 'pipe',
                            encoding: 'utf-8',
                            env: { ...process.env }
                        }
                    );

                    // Delete results
                    const deleteResultsSQL = `DELETE FROM results WHERE hostname = '${variation.replace(/'/g, "''")}'`;
                    execSync(
                        `wrangler d1 execute ${DB_NAME} --command "${deleteResultsSQL}"`,
                        {
                            cwd: workersDir,
                            stdio: 'pipe',
                            encoding: 'utf-8',
                            env: { ...process.env }
                        }
                    );
                } catch (error) {
                    // Ignore errors (domain might not exist with this variation)
                }
            }

            // Also try case-insensitive delete using a more complex query
            // Delete all domains that normalize to the same value
            const deleteNormalizedDomainsSQL = `
                DELETE FROM domains 
                WHERE LOWER(REPLACE(REPLACE(hostname, 'www.', ''), 'WWW.', '')) = '${normalized.replace(/'/g, "''")}'
            `.trim().replace(/\s+/g, ' ');

            const deleteNormalizedResultsSQL = `
                DELETE FROM results 
                WHERE LOWER(REPLACE(REPLACE(hostname, 'www.', ''), 'WWW.', '')) = '${normalized.replace(/'/g, "''")}'
            `.trim().replace(/\s+/g, ' ');

            try {
                execSync(
                    `wrangler d1 execute ${DB_NAME} --command "${deleteNormalizedDomainsSQL}"`,
                    {
                        cwd: workersDir,
                        stdio: 'pipe',
                        encoding: 'utf-8',
                        env: { ...process.env }
                    }
                );

                execSync(
                    `wrangler d1 execute ${DB_NAME} --command "${deleteNormalizedResultsSQL}"`,
                    {
                        cwd: workersDir,
                        stdio: 'pipe',
                        encoding: 'utf-8',
                        env: { ...process.env }
                    }
                );
            } catch (error) {
                // Ignore if SQL REPLACE doesn't work
            }

            console.log(`  ✅ Processed: ${hostnameToDelete}`);
        } catch (error) {
            console.error(`  ❌ Error processing ${hostnameToDelete}:`, error.message);
        }
    }

    console.log('\n✅ Done! All domains have been processed.');
    console.log('\n💡 Tip: After deleting, you can verify by running:');
    console.log(`   cd workers && wrangler d1 execute ${DB_NAME} --command "SELECT hostname FROM domains ORDER BY hostname"`);

} catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📝 Note: Make sure you have wrangler installed and authenticated:');
    console.log('   npm install -g wrangler');
    console.log('   wrangler login');
    process.exit(1);
}
