/**
 * Test script for Telegram Bot
 * Usage: node test-telegram.js [botToken] [chatId]
 * Example: node test-telegram.js 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ -1001234567890
 */

const botToken = process.argv[2];
const chatId = process.argv[3];

if (!botToken || !chatId) {
    console.error('❌ Missing required parameters!\n');
    console.log('Usage: node test-telegram.js <botToken> <chatId>');
    console.log('\nExample:');
    console.log('  node test-telegram.js 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ -1001234567890');
    console.log('\n💡 How to get:');
    console.log('  1. Bot Token: Create bot with @BotFather on Telegram');
    console.log('  2. Chat ID: Send message to your bot, then visit:');
    console.log('     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates');
    process.exit(1);
}

async function testTelegram() {
    console.log('🧪 Testing Telegram Bot...\n');
    console.log(`Bot Token: ${botToken.substring(0, 10)}...`);
    console.log(`Chat ID: ${chatId}\n`);

    const testMessage = `
🚨 <b>TEST ALERT</b> 🚨

<b>Domain:</b> test.example.com
<b>Status:</b> BLOCKED / UNREACHABLE
<b>Detected on:</b>
• AIS
• True

<i>This is a test message from Sentinel DNS Monitor.</i>
`;

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        console.log(`📡 Sending test message...`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: testMessage,
                parse_mode: 'HTML',
            }),
        });

        const data = await response.json();

        if (data.ok) {
            console.log('\n✅ SUCCESS! Telegram message sent successfully!');
            console.log(`   Message ID: ${data.result.message_id}`);
            console.log(`   Chat: ${data.result.chat.title || data.result.chat.first_name || 'Private'}`);
            console.log('\n💡 Check your Telegram to see the test message!');
        } else {
            console.error('\n❌ Failed to send message:');
            console.error(`   Error Code: ${data.error_code}`);
            console.error(`   Description: ${data.description}`);

            if (data.error_code === 401) {
                console.error('\n💡 Tip: Check your Bot Token - it might be invalid');
            } else if (data.error_code === 400) {
                console.error('\n💡 Tip: Check your Chat ID - make sure you sent a message to the bot first');
            }
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Test Failed:');
        console.error(error.message);
        process.exit(1);
    }
}

testTelegram();

 * Test script for Telegram Bot
 * Usage: node test-telegram.js [botToken] [chatId]
 * Example: node test-telegram.js 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ -1001234567890
 */

const botToken = process.argv[2];
const chatId = process.argv[3];

if (!botToken || !chatId) {
    console.error('❌ Missing required parameters!\n');
    console.log('Usage: node test-telegram.js <botToken> <chatId>');
    console.log('\nExample:');
    console.log('  node test-telegram.js 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ -1001234567890');
    console.log('\n💡 How to get:');
    console.log('  1. Bot Token: Create bot with @BotFather on Telegram');
    console.log('  2. Chat ID: Send message to your bot, then visit:');
    console.log('     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates');
    process.exit(1);
}

async function testTelegram() {
    console.log('🧪 Testing Telegram Bot...\n');
    console.log(`Bot Token: ${botToken.substring(0, 10)}...`);
    console.log(`Chat ID: ${chatId}\n`);

    const testMessage = `
🚨 <b>TEST ALERT</b> 🚨

<b>Domain:</b> test.example.com
<b>Status:</b> BLOCKED / UNREACHABLE
<b>Detected on:</b>
• AIS
• True

<i>This is a test message from Sentinel DNS Monitor.</i>
`;

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        console.log(`📡 Sending test message...`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: testMessage,
                parse_mode: 'HTML',
            }),
        });

        const data = await response.json();

        if (data.ok) {
            console.log('\n✅ SUCCESS! Telegram message sent successfully!');
            console.log(`   Message ID: ${data.result.message_id}`);
            console.log(`   Chat: ${data.result.chat.title || data.result.chat.first_name || 'Private'}`);
            console.log('\n💡 Check your Telegram to see the test message!');
        } else {
            console.error('\n❌ Failed to send message:');
            console.error(`   Error Code: ${data.error_code}`);
            console.error(`   Description: ${data.description}`);

            if (data.error_code === 401) {
                console.error('\n💡 Tip: Check your Bot Token - it might be invalid');
            } else if (data.error_code === 400) {
                console.error('\n💡 Tip: Check your Chat ID - make sure you sent a message to the bot first');
            }
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Test Failed:');
        console.error(error.message);
        process.exit(1);
    }
}

testTelegram();

 * Test script for Telegram Bot
 * Usage: node test-telegram.js [botToken] [chatId]
 * Example: node test-telegram.js 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ -1001234567890
 */

const botToken = process.argv[2];
const chatId = process.argv[3];

if (!botToken || !chatId) {
    console.error('❌ Missing required parameters!\n');
    console.log('Usage: node test-telegram.js <botToken> <chatId>');
    console.log('\nExample:');
    console.log('  node test-telegram.js 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ -1001234567890');
    console.log('\n💡 How to get:');
    console.log('  1. Bot Token: Create bot with @BotFather on Telegram');
    console.log('  2. Chat ID: Send message to your bot, then visit:');
    console.log('     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates');
    process.exit(1);
}

async function testTelegram() {
    console.log('🧪 Testing Telegram Bot...\n');
    console.log(`Bot Token: ${botToken.substring(0, 10)}...`);
    console.log(`Chat ID: ${chatId}\n`);

    const testMessage = `
🚨 <b>TEST ALERT</b> 🚨

<b>Domain:</b> test.example.com
<b>Status:</b> BLOCKED / UNREACHABLE
<b>Detected on:</b>
• AIS
• True

<i>This is a test message from Sentinel DNS Monitor.</i>
`;

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        console.log(`📡 Sending test message...`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: testMessage,
                parse_mode: 'HTML',
            }),
        });

        const data = await response.json();

        if (data.ok) {
            console.log('\n✅ SUCCESS! Telegram message sent successfully!');
            console.log(`   Message ID: ${data.result.message_id}`);
            console.log(`   Chat: ${data.result.chat.title || data.result.chat.first_name || 'Private'}`);
            console.log('\n💡 Check your Telegram to see the test message!');
        } else {
            console.error('\n❌ Failed to send message:');
            console.error(`   Error Code: ${data.error_code}`);
            console.error(`   Description: ${data.description}`);

            if (data.error_code === 401) {
                console.error('\n💡 Tip: Check your Bot Token - it might be invalid');
            } else if (data.error_code === 400) {
                console.error('\n💡 Tip: Check your Chat ID - make sure you sent a message to the bot first');
            }
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Test Failed:');
        console.error(error.message);
        process.exit(1);
    }
}

testTelegram();

