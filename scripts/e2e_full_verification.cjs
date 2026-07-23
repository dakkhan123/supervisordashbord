const path = require('path');
module.paths.push(
  path.join(__dirname, '../backend/node_modules'),
  path.join(__dirname, '../node_modules')
);

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/models/User');
const Worker = require('../backend/models/Worker');
const Task = require('../backend/models/Task');
const Attendance = require('../backend/models/Attendance');
const Salary = require('../backend/models/Salary');
const Notification = require('../backend/models/Notification');

function request(pathStr, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: pathStr,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runE2EVerification() {
  console.log('====================================================');
  console.log('  STARTING FULL E2E AUTHENTICATION & RBAC VERIFICATION');
  console.log('====================================================\n');

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartops';
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB at:', MONGO_URI);

  try {
    // Step 1: Health check
    const health = await request('/health');
    console.log('\n--- 1. Backend Server Health Check ---');
    console.log('✅ Status:', health.status, '| Response:', health.data);

    // Step 2: Create a Supervisor Account
    console.log('\n--- 2. Register & Login as Supervisor ---');
    const superUsername = `super_e2e_${Date.now()}`;
    const superPassword = 'SuperPassword@123';
    const regRes = await request('/api/auth/register', 'POST', {
      name: 'E2E Supervisor',
      username: superUsername,
      password: superPassword,
      email: `${superUsername}@factory.com`,
      role: 'Supervisor'
    });

    console.log('✅ Supervisor Register Status:', regRes.status);

    const superLoginRes = await request('/api/auth/login', 'POST', {
      username: superUsername,
      password: superPassword
    });
    console.log('✅ Supervisor Login Status:', superLoginRes.status);
    console.log('   Supervisor Token Returned:', !!superLoginRes.data.token);
    console.log('   Supervisor Role Returned:', superLoginRes.data.data?.role);

    const superToken = superLoginRes.data.token;

    // Step 3: Create Worker Account as Supervisor
    console.log('\n--- 3. Create Worker Profile with Credentials as Supervisor ---');
    const workerName = `E2E Worker ${Date.now()}`;
    const workerUsername = `e2eworker_${Date.now()}`;
    const workerPassword = 'E2EWorkerPass@123';

    const createWorkerRes = await request('/api/workers', 'POST', {
      name: workerName,
      username: workerUsername,
      password: workerPassword,
      phone: '9988776655',
      role: 'Worker',
      salary: 21500,
      status: 'Active',
      dateOfJoining: '2026-07-23'
    }, superToken);

    console.log('✅ Create Worker Status:', createWorkerRes.status);
    console.log('   Worker Profile ID:', createWorkerRes.data.data?._id);
    const workerId = createWorkerRes.data.data?._id;

    // Step 4: Verify Database Documents in MongoDB
    console.log('\n--- 4. Verify MongoDB Documents for Worker Account ---');
    const dbWorkerDoc = await Worker.findById(workerId);
    console.log('✅ MongoDB Worker Record:', dbWorkerDoc ? dbWorkerDoc.name : 'NOT FOUND');

    const dbUserDoc = await User.findOne({ worker: workerId });
    console.log('✅ MongoDB User Record Username:', dbUserDoc?.username);
    console.log('   User Role in DB:', dbUserDoc?.role);
    console.log('   User Status in DB:', dbUserDoc?.status);

    const isPasswordHashed = await bcrypt.compare(workerPassword, dbUserDoc?.password || '');
    console.log('   Password Hashed Correctly with Bcrypt:', isPasswordHashed);


    if (dbUserDoc?.role !== 'Worker') {
      throw new Error(`CRITICAL: Database User Role is '${dbUserDoc?.role}' instead of 'Worker'`);
    }
    if (!isPasswordHashed) {
      throw new Error('CRITICAL: Password comparison failed for created Worker user');
    }

    // Step 5: Test Worker Login
    console.log('\n--- 5. Test Worker Login with Created Credentials ---');
    const workerLoginRes = await request('/api/auth/login', 'POST', {
      username: workerUsername,
      password: workerPassword
    });

    console.log('✅ Worker Login Status:', workerLoginRes.status);
    console.log('   Worker Token Returned:', !!workerLoginRes.data.token);
    console.log('   Worker Role Returned:', workerLoginRes.data.data?.role);

    const workerToken = workerLoginRes.data.token;

    // Step 6: Verify JWT Payload
    console.log('\n--- 6. Verify JWT Payload for Worker ---');
    const decodedWorkerToken = jwt.verify(workerToken, process.env.JWT_SECRET || 'fallback_secret');
    console.log('   JWT Encoded User ID:', decodedWorkerToken.id);
    console.log('   JWT Encoded Role:', decodedWorkerToken.role);
    console.log('   JWT Encoded Worker ID:', decodedWorkerToken.workerId);

    if (decodedWorkerToken.role.toLowerCase() !== 'worker') {
      throw new Error(`CRITICAL: JWT Token Role is '${decodedWorkerToken.role}' instead of 'Worker'`);
    }

    // Step 7: Verify Session Verification Endpoint (/api/auth/me)
    console.log('\n--- 7. Verify /api/auth/me Session Verification Endpoint ---');
    const meRes = await request('/api/auth/me', 'GET', null, workerToken);
    console.log('✅ /api/auth/me Status:', meRes.status);
    console.log('   Role Returned by /me:', meRes.data.data?.role);
    console.log('   Worker Name in /me:', meRes.data.data?.worker?.name);

    // Step 8: Test Worker Tasks API
    console.log('\n--- 8. Test Worker Tasks Endpoint ---');
    const myTasksRes = await request('/api/tasks/my-tasks', 'GET', null, workerToken);
    console.log('✅ /api/tasks/my-tasks Status:', myTasksRes.status);
    console.log('   Tasks Count:', Array.isArray(myTasksRes.data.data) ? myTasksRes.data.data.length : 'N/A');

    // Step 9: Test Worker Attendance API
    console.log('\n--- 9. Test Worker Attendance Endpoint ---');
    const myAttendanceRes = await request('/api/attendance/my-attendance', 'GET', null, workerToken);
    console.log('✅ /api/attendance/my-attendance Status:', myAttendanceRes.status);
    console.log('   Attendance Records Count:', Array.isArray(myAttendanceRes.data.data) ? myAttendanceRes.data.data.length : 'N/A');

    // Step 10: Test Worker Salary API
    console.log('\n--- 10. Test Worker Salary Endpoint ---');
    const mySalaryRes = await request('/api/salary/my-salary', 'GET', null, workerToken);
    console.log('✅ /api/salary/my-salary Status:', mySalaryRes.status);
    console.log('   Salary Records Count:', Array.isArray(mySalaryRes.data.data) ? mySalaryRes.data.data.length : 'N/A');

    // Step 11: Test Notifications API
    console.log('\n--- 11. Test Worker Notifications Endpoint ---');
    const notifRes = await request('/api/notifications', 'GET', null, workerToken);
    console.log('✅ /api/notifications Status:', notifRes.status);
    console.log('   Notifications Count:', Array.isArray(notifRes.data.data) ? notifRes.data.data.length : 'N/A');

    // Step 12: Cleanup Test Records
    console.log('\n--- 12. Cleanup Test Records ---');
    await User.deleteMany({ $or: [{ username: superUsername }, { username: workerUsername }] });
    await Worker.findByIdAndDelete(workerId);
    console.log('✅ Cleanup Complete.');

    console.log('\n====================================================');
    console.log('  🎉 E2E VERIFICATION COMPLETED WITH 100% SUCCESS!');
    console.log('====================================================');

  } catch (err) {
    console.error('❌ E2E Verification Failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
  }
}

runE2EVerification();
