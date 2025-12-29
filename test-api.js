/**
 * Test script for DNS Check API
 * Usage: node test-api.js [hostname] [backendUrl]
 * Example: node test-api.js google.com
 * 
 * PORT can be set via environment variable:
 * PORT=5555 node test-api.js google.com
 */

const hostname = process.argv[2] || 'google.com';
const backendUrl = process.argv[3] || `http://localhost:${process.env.PORT || 5555}`;

async function testAPI() {
    console.log('🧪 Testing DNS Check API...\n');
    console.log(`Hostname: ${hostname}`);
    console.log(`Backend URL: ${backendUrl}\n`);

    const apiUrl = `${backendUrl}/api/check`;

    try {
        console.log(`📡 Sending request to: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                hostname: hostname,
                isp_name: 'Global (Google)'
            })
        });

        console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Error Response:`, errorText);
            process.exit(1);
        }

        const data = await response.json();

        console.log('\n✅ API Response:');
        console.log(JSON.stringify(data, null, 2));

        if (data.status === 'ACTIVE') {
            console.log(`\n✅ SUCCESS: Domain ${hostname} is ACTIVE`);
            console.log(`   IP Address: ${data.ip || 'N/A'}`);
        } else if (data.status === 'BLOCKED') {
            console.log(`\n⚠️  WARNING: Domain ${hostname} is BLOCKED`);
        } else {
            console.log(`\n❌ ERROR: Unexpected status - ${data.status}`);
        }

    } catch (error) {
        console.error('\n❌ Test Failed:');
        console.error(error.message);

        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Tip: Make sure your Next.js server is running:');
            console.error('   npm run dev');
        }

        process.exit(1);
    }
}

testAPI();


