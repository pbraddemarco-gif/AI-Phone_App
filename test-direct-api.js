// Test upstream API directly (no proxy)
const axios = require('axios');

async function testDirectAPI() {
  console.log('Testing upstream API directly (no proxy)...\n');

  const formData = new URLSearchParams({
    grant_type: 'password',
    username: 'testuser',
    password: 'TestPass123!',
    client_id: 'AppClientV1',
  });

  try {
    const startTime = Date.now();
    const response = await axios.post(
      'https://app.automationintellect.com/api/accounts/token',
      formData.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
        validateStatus: () => true,
      }
    );
    const duration = Date.now() - startTime;

    console.log(`✅ Direct API responded in ${duration}ms`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', response.data);
  } catch (err) {
    console.error('❌ Direct API failed:', err.message);
  }
}

testDirectAPI();
