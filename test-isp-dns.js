/**
 * Test script for ISP DNS checking
 * Usage: node test-isp-dns.js [hostname] [isp]
 * Example: node test-isp-dns.js ufathai.win AIS
 */

const hostname = process.argv[2] || 'ufathai.win';
const isp = process.argv[3] || 'AIS';
const backendUrl = `http://localhost:${process.env.PORT || 5555}`;

async function testISPDNS() {
  console.log('🧪 Testing ISP DNS Check...\n');
  console.log(`Hostname: ${hostname}`);
  console.log(`ISP: ${isp}`);
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
        isp_name: isp
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
    
    console.log(`\n📋 Summary:`);
    console.log(`   ISP: ${data.isp}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   IP: ${data.ip || 'N/A'}`);
    console.log(`   DNS Server: ${data.dns_server || 'N/A'}`);
    console.log(`   Source: ${data.source || 'N/A'}`);
    console.log(`   Details: ${data.details || 'N/A'}`);
    
    if (data.source === 'doh') {
      console.log(`\n⚠️  WARNING: Using Google DoH fallback (UDP failed)`);
      console.log(`   This means UDP query to ${isp} DNS failed`);
    } else if (data.source === 'udp') {
      console.log(`\n✅ SUCCESS: Using UDP query to ${isp} DNS directly`);
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

testISPDNS();

 * Test script for ISP DNS checking
 * Usage: node test-isp-dns.js [hostname] [isp]
 * Example: node test-isp-dns.js ufathai.win AIS
 */

const hostname = process.argv[2] || 'ufathai.win';
const isp = process.argv[3] || 'AIS';
const backendUrl = `http://localhost:${process.env.PORT || 5555}`;

async function testISPDNS() {
  console.log('🧪 Testing ISP DNS Check...\n');
  console.log(`Hostname: ${hostname}`);
  console.log(`ISP: ${isp}`);
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
        isp_name: isp
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
    
    console.log(`\n📋 Summary:`);
    console.log(`   ISP: ${data.isp}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   IP: ${data.ip || 'N/A'}`);
    console.log(`   DNS Server: ${data.dns_server || 'N/A'}`);
    console.log(`   Source: ${data.source || 'N/A'}`);
    console.log(`   Details: ${data.details || 'N/A'}`);
    
    if (data.source === 'doh') {
      console.log(`\n⚠️  WARNING: Using Google DoH fallback (UDP failed)`);
      console.log(`   This means UDP query to ${isp} DNS failed`);
    } else if (data.source === 'udp') {
      console.log(`\n✅ SUCCESS: Using UDP query to ${isp} DNS directly`);
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

testISPDNS();

 * Test script for ISP DNS checking
 * Usage: node test-isp-dns.js [hostname] [isp]
 * Example: node test-isp-dns.js ufathai.win AIS
 */

const hostname = process.argv[2] || 'ufathai.win';
const isp = process.argv[3] || 'AIS';
const backendUrl = `http://localhost:${process.env.PORT || 5555}`;

async function testISPDNS() {
  console.log('🧪 Testing ISP DNS Check...\n');
  console.log(`Hostname: ${hostname}`);
  console.log(`ISP: ${isp}`);
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
        isp_name: isp
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
    
    console.log(`\n📋 Summary:`);
    console.log(`   ISP: ${data.isp}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   IP: ${data.ip || 'N/A'}`);
    console.log(`   DNS Server: ${data.dns_server || 'N/A'}`);
    console.log(`   Source: ${data.source || 'N/A'}`);
    console.log(`   Details: ${data.details || 'N/A'}`);
    
    if (data.source === 'doh') {
      console.log(`\n⚠️  WARNING: Using Google DoH fallback (UDP failed)`);
      console.log(`   This means UDP query to ${isp} DNS failed`);
    } else if (data.source === 'udp') {
      console.log(`\n✅ SUCCESS: Using UDP query to ${isp} DNS directly`);
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

testISPDNS();

