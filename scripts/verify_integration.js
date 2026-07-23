const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Integration Verification Tests ---');

  // Test server health
  try {
    const health = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/health',
      method: 'GET'
    });
    console.log('✅ Server Health:', health.data);
  } catch (err) {
    console.error('❌ Server health check failed:', err.message);
  }
}

runTests();
