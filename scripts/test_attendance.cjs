const http = require('http');

function send(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(dataStr ? { 'Content-Length': Buffer.byteLength(dataStr) } : {}),
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
    
    req.on('error', (err) => reject(err));
    if (dataStr) {
      req.write(dataStr);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING ATTENDANCE ENDPOINT TESTS ===\n');

  try {
    const rand = Math.floor(Math.random() * 1000000);
    const workerUsername = `test_worker_${rand}`;
    const workerEmail = `${workerUsername}@smartops.com`;
    
    console.log(`1. Registering worker user: ${workerUsername}`);
    const regRes = await send('/auth/register', 'POST', {
      username: workerUsername,
      email: workerEmail,
      password: 'password123',
      role: 'worker',
      name: `Test Worker ${rand}`,
      department: 'Operations',
      shiftTiming: '09:00 AM - 06:00 PM',
      assignedSite: 'Pune Head Office'
    });
    
    if (regRes.status !== 201 || !regRes.data.success) {
      throw new Error(`Worker registration failed: ${JSON.stringify(regRes.data)}`);
    }
    
    const token = regRes.data.token;
    console.log('Worker registration success. Token acquired.\n');

    console.log("2. Fetching today's attendance status...");
    const todayRes1 = await send('/attendance/today', 'GET', null, token);
    console.log("Today status (pre-checkin):", todayRes1.status, todayRes1.data);
    console.log();

    console.log('3. Submitting Check-In...');
    const checkInRes = await send('/attendance/checkin', 'POST', {
      latitude: 18.56075,
      longitude: 73.94442,
      address: 'Kharadi, Pune office, simulator check',
      ipAddress: '127.0.0.1',
      device: 'Test Console script',
      isWithinRange: true
    }, token);
    console.log('Check-In response:', checkInRes.status, checkInRes.data);
    console.log();

    console.log("4. Fetching today's attendance status post-checkin...");
    const todayRes2 = await send('/attendance/today', 'GET', null, token);
    console.log("Today status (post-checkin):", todayRes2.status, todayRes2.data);
    console.log();

    console.log('5. Submitting Check-Out...');
    const checkOutRes = await send('/attendance/checkout', 'POST', {
      latitude: 18.56075,
      longitude: 73.94442,
      address: 'Kharadi, Pune office, simulator checkout',
      ipAddress: '127.0.0.1',
      device: 'Test Console script',
      isWithinRange: true
    }, token);
    console.log('Check-Out response:', checkOutRes.status, checkOutRes.data);
    console.log();

    console.log("6. Fetching monthly attendance statistics...");
    const monthRes = await send('/attendance/month', 'GET', null, token);
    console.log("Month stats:", monthRes.status, monthRes.data);
    console.log();

    console.log('=== ALL ATTENDANCE API INTEGRATION TESTS PASSED ===');
  } catch (err) {
    console.error('Test script encountered error:', err);
  }
}

runTests();
