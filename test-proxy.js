// Quick test script to verify proxy works
const axios = require('axios');

async function testProxy() {
  console.log('Testing proxy health...');

  try {
    // Test 1: Health check
    const health = await axios.get('http://localhost:3001/health', { timeout: 3000 });
    console.log('✅ Health check OK:', health.data);
  } catch (err) {
    console.error('❌ Health check failed:', err.message);
    return;
  }

  console.log('\nTesting auth endpoint...');

  try {
    // Test 2: Auth endpoint with test credentials
    const formData = new URLSearchParams({
      grant_type: 'password',
      username: 'testuser',
      password: 'TestPass123!',
      client_id: 'AppClientV1',
    });

    const startTime = Date.now();
    const response = await axios.post(
      'http://localhost:3001/api/auth/accounts/token',
      formData.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
        validateStatus: () => true, // Accept any status
      }
    );
    const duration = Date.now() - startTime;

    console.log(`✅ Auth endpoint responded in ${duration}ms`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', response.data);
  } catch (err) {
    console.error('❌ Auth endpoint failed:', err.message);
    if (err.code) console.error('Error code:', err.code);
  }
}

testProxy();
