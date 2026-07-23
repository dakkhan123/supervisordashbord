const http = require('http');

function send(path, method, body, token) {
  return new Promise((resolve) => {
    const dataStr = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, raw: b });
        }
      });
    });
    req.on('error', (err) => resolve({ status: 500, error: err.message }));
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function diagnose() {
  console.log('=== DIAGNOSING AUTHENTICATION ENDPOINTS ===\n');

  // Test Health
  const health = await send('/health', 'GET');
  console.log('1. Health check:', health);

  // Test Register
  const testUsername = `diag_super_${Date.now()}`;
  const testPassword = 'DiagPassword123';
  const regRes = await send('/api/auth/register', 'POST', {
    name: 'Diagnostic Supervisor',
    username: testUsername,
    password: testPassword,
    email: `${testUsername}@test.com`,
    role: 'Supervisor'
  });
  console.log('\n2. Register Supervisor Result:', regRes);

  // Test Supervisor Login
  const loginSuperRes = await send('/api/auth/login', 'POST', {
    username: testUsername,
    password: testPassword
  });
  console.log('\n3. Supervisor Login Result:', loginSuperRes);

  const superToken = loginSuperRes.data?.token;

  // Test Worker Creation
  const workerUsername = `diag_worker_${Date.now()}`;
  const workerPassword = 'DiagWorkerPassword123';
  const createWorkerRes = await send('/api/workers', 'POST', {
    name: 'Diagnostic Worker',
    username: workerUsername,
    password: workerPassword,
    role: 'Worker',
    salary: 19000,
    status: 'Active'
  }, superToken);
  console.log('\n4. Create Worker Result:', createWorkerRes);

  // Test Worker Login
  const workerLoginRes = await send('/api/auth/login', 'POST', {
    username: workerUsername,
    password: workerPassword
  });
  console.log('\n5. Worker Login Result:', workerLoginRes);
}

diagnose();
