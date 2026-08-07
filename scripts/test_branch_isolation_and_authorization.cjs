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
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function runTest() {
  console.log('\n=============================================================');
  console.log('   BRANCH ISOLATION & ATTENDANCE AUTHORIZATION INTEGRATION TEST ');
  console.log('=============================================================\n');

  try {
    const timestamp = Date.now().toString().slice(-5);

    // 1. Create Supervisor 1 for Pune Head Office
    console.log('--- TEST 1: Register Supervisor in Pune Head Office ---');
    const supPuneEmail = `sup_pune_${timestamp}@test.com`;
    const regSup1 = await send('/auth/register', 'POST', {
      name: 'Supervisor Pune',
      username: `sup_pune_${timestamp}`,
      email: supPuneEmail,
      password: 'Password123!',
      phone: '9876500001',
      role: 'Supervisor',
      branch: 'Pune Head Office'
    });
    console.log('[SUP PUNE REG]', regSup1.status, regSup1.body.message || regSup1.body.error);

    // Verify OTP for Supervisor 1
    const mongoose = require('../backend/node_modules/mongoose');
    require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartops';
    await mongoose.connect(mongoUri);

    const RegistrationOTP = require('../backend/models/RegistrationOTP');
    let otpRec1 = await RegistrationOTP.findOne({ email: supPuneEmail });
    
    // Set known hash for test
    const crypto = require('crypto');
    const hashOTP = (otp) => crypto.createHash('sha256').update(otp.trim()).digest('hex');
    otpRec1.otpHash = hashOTP('111111');
    await otpRec1.save();

    const verifySup1 = await send('/auth/verify-otp', 'POST', {
      email: supPuneEmail,
      otp: '111111'
    });
    const sup1Token = verifySup1.body.token;
    console.log('[SUP PUNE VERIFY]', verifySup1.status, 'Token Issued:', !!sup1Token, 'Branch:', verifySup1.body.data?.branch);

    // 2. Create Supervisor 2 for Mumbai Branch
    console.log('\n--- TEST 2: Register Supervisor in Mumbai Branch ---');
    const supMumbaiEmail = `sup_mumbai_${timestamp}@test.com`;
    await send('/auth/register', 'POST', {
      name: 'Supervisor Mumbai',
      username: `sup_mumbai_${timestamp}`,
      email: supMumbaiEmail,
      password: 'Password123!',
      phone: '9876500002',
      role: 'Supervisor',
      branch: 'Mumbai Branch'
    });

    let otpRec2 = await RegistrationOTP.findOne({ email: supMumbaiEmail });
    otpRec2.otpHash = hashOTP('222222');
    await otpRec2.save();

    const verifySup2 = await send('/auth/verify-otp', 'POST', {
      email: supMumbaiEmail,
      otp: '222222'
    });
    const sup2Token = verifySup2.body.token;
    console.log('[SUP MUMBAI VERIFY]', verifySup2.status, 'Token Issued:', !!sup2Token, 'Branch:', verifySup2.body.data?.branch);

    // 3. Register Worker 1 for Pune Head Office
    console.log('\n--- TEST 3: Register Worker for Pune Head Office ---');
    const wrkPuneEmail = `wrk_pune_${timestamp}@test.com`;
    await send('/auth/register-worker/send-otp', 'POST', {
      fullName: 'Worker Pune',
      username: `wrk_pune_${timestamp}`,
      email: wrkPuneEmail,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      mobile: '9876511111',
      department: 'Assembly',
      branch: 'Pune Head Office'
    });

    let otpWorker1 = await RegistrationOTP.findOne({ email: wrkPuneEmail });
    otpWorker1.otpHash = hashOTP('333333');
    await otpWorker1.save();

    const verifyWrk1 = await send('/auth/register-worker/verify', 'POST', {
      email: wrkPuneEmail,
      otp: '333333'
    });
    console.log('[WRK PUNE VERIFY]', verifyWrk1.status, verifyWrk1.body.message);

    // 4. Register Worker 2 for Mumbai Branch
    console.log('\n--- TEST 4: Register Worker for Mumbai Branch ---');
    const wrkMumbaiEmail = `wrk_mumbai_${timestamp}@test.com`;
    await send('/auth/register-worker/send-otp', 'POST', {
      fullName: 'Worker Mumbai',
      username: `wrk_mumbai_${timestamp}`,
      email: wrkMumbaiEmail,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      mobile: '9876522222',
      department: 'Logistics',
      branch: 'Mumbai Branch'
    });

    let otpWorker2 = await RegistrationOTP.findOne({ email: wrkMumbaiEmail });
    otpWorker2.otpHash = hashOTP('444444');
    await otpWorker2.save();

    const verifyWrk2 = await send('/auth/register-worker/verify', 'POST', {
      email: wrkMumbaiEmail,
      otp: '444444'
    });
    console.log('[WRK MUMBAI VERIFY]', verifyWrk2.status, verifyWrk2.body.message);

    // 5. Test Branch-wise Pending Registrations
    console.log('\n--- TEST 5: Verify Pending Registrations Branch Filtering ---');
    const pendingSup1 = await send('/workers/pending-registrations', 'GET', null, sup1Token);
    const pendingSup2 = await send('/workers/pending-registrations', 'GET', null, sup2Token);

    console.log(`[PUNE SUP PENDING] Found ${pendingSup1.body.count} pending items (Must contain Pune worker, NOT Mumbai)`);
    console.log(`[MUMBAI SUP PENDING] Found ${pendingSup2.body.count} pending items (Must contain Mumbai worker, NOT Pune)`);

    const punePendingItem = pendingSup1.body.data.find(p => p.email === wrkPuneEmail);
    const mumbaiPendingItem = pendingSup2.body.data.find(p => p.email === wrkMumbaiEmail);

    if (!punePendingItem) throw new Error('Pune Supervisor cannot see Pune worker registration request!');
    if (!mumbaiPendingItem) throw new Error('Mumbai Supervisor cannot see Mumbai worker registration request!');

    // 6. Test Cross-Branch Approval Prevention (HTTP 403)
    console.log('\n--- TEST 6: Test Cross-Branch Registration Approval Prevention (HTTP 403) ---');
    const illegalApprove = await send(`/workers/pending-registrations/${mumbaiPendingItem._id}/approve`, 'PUT', { salary: 20000 }, sup1Token);
    console.log('[ILLEGAL APPROVE RESPONSE]', illegalApprove.status, illegalApprove.body.error || illegalApprove.body.message);
    if (illegalApprove.status !== 403) {
      throw new Error(`Expected HTTP 403 for cross-branch approval, but got HTTP ${illegalApprove.status}`);
    }
    console.log('✅ [SUCCESS] Cross-branch approval correctly rejected with HTTP 403 Forbidden!');

    // 7. Approve Same-Branch Workers
    console.log('\n--- TEST 7: Approve Same-Branch Workers ---');
    const approvePune = await send(`/workers/pending-registrations/${punePendingItem._id}/approve`, 'PUT', { salary: 22000 }, sup1Token);
    console.log('[PUNE APPROVE]', approvePune.status, approvePune.body.message);

    const approveMumbai = await send(`/workers/pending-registrations/${mumbaiPendingItem._id}/approve`, 'PUT', { salary: 24000 }, sup2Token);
    console.log('[MUMBAI APPROVE]', approveMumbai.status, approveMumbai.body.message);

    const puneWorkerId = approvePune.body.data.worker._id;
    const mumbaiWorkerId = approveMumbai.body.data.worker._id;

    // 8. Test Branch Isolation in Workers List
    console.log('\n--- TEST 8: Verify Workers Directory Branch Isolation ---');
    const workersSup1 = await send('/workers', 'GET', null, sup1Token);
    const workersSup2 = await send('/workers', 'GET', null, sup2Token);

    const sup1HasPune = workersSup1.body.data.some(w => w._id === puneWorkerId);
    const sup1HasMumbai = workersSup1.body.data.some(w => w._id === mumbaiWorkerId);
    console.log(`[PUNE SUP WORKER LIST] Has Pune Worker: ${sup1HasPune}, Has Mumbai Worker: ${sup1HasMumbai}`);

    if (!sup1HasPune || sup1HasMumbai) {
      throw new Error('Branch isolation failed in Workers directory list!');
    }
    console.log('✅ [SUCCESS] Workers directory strictly isolated by branch!');

    // 9. Test Attendance Authorization & HTTP 403 Enforcement
    console.log('\n--- TEST 9: Attendance Authorization & Supervisor Read-Only Enforcement ---');

    // Pune Supervisor creates attendance for Pune Worker (Allowed)
    const attPuneWrk = await send('/attendance', 'POST', {
      worker: puneWorkerId,
      date: new Date().toISOString(),
      status: 'Present',
      checkInTime: '09:00 AM',
      checkOutTime: '06:00 PM'
    }, sup1Token);
    console.log('[PUNE WORKER ATTENDANCE CREATE]', attPuneWrk.status, attPuneWrk.body.success ? 'Success' : attPuneWrk.body.error);
    if (attPuneWrk.status !== 201) throw new Error('Pune Supervisor failed to record attendance for Pune Worker');

    // Pune Supervisor attempts to record attendance for Mumbai Worker (Forbidden -> 403)
    const attCrossBranch = await send('/attendance', 'POST', {
      worker: mumbaiWorkerId,
      date: new Date().toISOString(),
      status: 'Present'
    }, sup1Token);
    console.log('[CROSS-BRANCH ATTENDANCE CREATE]', attCrossBranch.status, attCrossBranch.body.error);
    if (attCrossBranch.status !== 403) {
      throw new Error(`Expected HTTP 403 for cross-branch attendance create, got ${attCrossBranch.status}`);
    }

    // Pune Supervisor attempts to edit own attendance or another supervisor's attendance (Forbidden -> 403)
    const WorkerModel = require('../backend/models/Worker');
    const supWorker = await WorkerModel.findOne({ email: supPuneEmail });
    const sup1WorkerId = supWorker._id;
    const attSupSelf = await send('/attendance', 'POST', {
      worker: sup1WorkerId,
      date: new Date().toISOString(),
      status: 'Present'
    }, sup1Token);
    console.log('[SUPERVISOR SELF ATTENDANCE EDIT]', attSupSelf.status, attSupSelf.body.error);
    if (attSupSelf.status !== 403) {
      throw new Error(`Expected HTTP 403 for Supervisor editing supervisor attendance, got ${attSupSelf.status}`);
    }

    console.log('\n=============================================================');
    console.log('   ✅ ALL BRANCH ISOLATION & AUTHORIZATION TESTS PASSED!     ');
    console.log('=============================================================\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTest();
