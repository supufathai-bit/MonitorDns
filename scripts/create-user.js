// Script to create a user in D1 database
// Usage: node scripts/create-user.js <username> <password>

const crypto = require('crypto');

async function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function createUser(username, password) {
    const hashedPassword = await hashPassword(password);
    const passwordHash = JSON.stringify({ hash: hashedPassword });

    console.log('User creation SQL:');
    console.log(`INSERT INTO users (username, password_hash, created_at, updated_at) VALUES ('${username}', '${passwordHash}', ${Date.now()}, ${Date.now()});`);
    console.log('\nOr use D1 Studio to run:');
    console.log(`INSERT INTO users (username, password_hash, created_at, updated_at) VALUES ('${username}', '${JSON.stringify({ hash: hashedPassword })}', ${Date.now()}, ${Date.now()});`);
}

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
    console.error('Usage: node scripts/create-user.js <username> <password>');
    process.exit(1);
}

createUser(username, password).catch(console.error);

