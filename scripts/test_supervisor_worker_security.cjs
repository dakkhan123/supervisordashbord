const path = require('path');
module.paths.push(
  path.join(__dirname, '../backend/node_modules'),
  path.join(__dirname, '../node_modules')
);

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/models/User');
const Worker = require('../backend/models/Worker');
const RegistrationOTP = require('../backend/models/RegistrationOTP');
const workerController = require('../backend/controllers/workerController');
const workerService = require('../backend/services/workerService');

async function testSupervisorWorkerSecurity() {
  console.log('\n============================================================');
  console.log('    TESTING SUPERVISOR DASHBOARD WORKER MANAGEMENT SECURITY   ');
  console.log('============================================================\n');

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartops';
  await mongoose.connect(MONGO_URI);

  try {
    // 1. Clean up test users
    await User.deleteMany({ username: 'sec_test_worker' });
    await Worker.deleteMany({ email: 'secworker@smartops.local' });

    // 2. Create test worker
    const workerObj = await workerService.createWorker({
      name: 'Security Test Worker',
      email: 'secworker@smartops.local',
      username: 'sec_test_worker',
      password: 'OriginalPass123!',
      phone: '9876543299',
      department: 'Assembly',
      branch: 'Pune Head Office',
      salary: 22000,
      role: 'Worker'
    });

    const userObj = await User.findOne({ username: 'sec_test_worker' });
    console.log(`✅ Created Test Worker: ${workerObj.name} | Employee ID: ${workerObj.employeeId || userObj.employeeId}`);

    // TEST 1: Worker List contains valid Employee ID
    const workersList = await workerService.getAllWorkers({});
    const fetchedWorker = workersList.find(w => w.email === 'secworker@smartops.local');
    if (!fetchedWorker) {
      throw new Error('TEST FAILED: Created worker not returned in staff list!');
    }
    if (!fetchedWorker.employeeId && !fetchedWorker.user?.employeeId) {
      throw new Error('TEST FAILED: Staff directory worker record is missing Employee ID!');
    }
    console.log(`✔ TEST 1 PASSED: Worker record in staff directory contains valid Employee ID (${fetchedWorker.employeeId})`);

    // TEST 2: Supervisor Password Reset Endpoint returns 403 Forbidden
    let resetRes = {};
    await workerController.resetWorkerPassword(
      { params: { id: workerObj._id }, body: { newPassword: 'AttemptedReset123!' } },
      { status: (code) => ({ json: (d) => { resetRes = { statusCode: code, ...d }; } }) },
      (err) => { resetRes = { statusCode: err.statusCode || 500, error: err.message }; }
    );

    if (resetRes.statusCode !== 403) {
      throw new Error(`SECURITY TEST FAILED: resetWorkerPassword endpoint returned status ${resetRes.statusCode} instead of 403 Forbidden!`);
    }
    console.log('✔ TEST 2 PASSED: Supervisor resetWorkerPassword endpoint strictly returns 403 Forbidden.');

    // TEST 3: Supervisor updateWorker payload with password field fails to alter password hash
    await workerService.updateWorker(workerObj._id, {
      name: 'Security Test Worker Updated',
      password: 'HackedPassword99!' // Supervisor payload attempt
    });

    const reloadedUser = await User.findById(userObj._id);
    const passMatchesOriginal = await bcrypt.compare('OriginalPass123!', reloadedUser.password);
    const passMatchesHacked = await bcrypt.compare('HackedPassword99!', reloadedUser.password);

    if (!passMatchesOriginal || passMatchesHacked) {
      throw new Error('SECURITY TEST FAILED: Supervisor updateWorker was able to modify worker password!');
    }
    console.log('✔ TEST 3 PASSED: Supervisor updateWorker payload cannot alter worker password hash.');

    // TEST 4: Worker self-service Forgot Password OTP flow remains functional
    const crypto = require('crypto');
    const authController = require('../backend/controllers/authController');

    // Step 4A: Send OTP
    let sendOtpRes = {};
    await authController.forgotPasswordSendOTP(
      { body: { email: 'secworker@smartops.local' } },
      { status: (code) => ({ json: (d) => { sendOtpRes = { statusCode: code, ...d }; } }) },
      (err) => { if (err) throw err; }
    );

    if (sendOtpRes.statusCode !== 200) {
      throw new Error(`Worker forgot password send OTP failed: ${sendOtpRes.error}`);
    }

    // Step 4B: Reset Password using OTP
    const testOTP = '654321';
    reloadedUser.resetPasswordOTP = crypto.createHash('sha256').update(testOTP).digest('hex');
    reloadedUser.resetPasswordOTPExpire = new Date(Date.now() + 10 * 60 * 1000);
    await reloadedUser.save();

    let resetOtpRes = {};
    await authController.forgotPasswordReset(
      {
        body: {
          email: 'secworker@smartops.local',
          otp: testOTP,
          newPassword: 'SelfResetWorkerPass123!'
        }
      },
      { status: (code) => ({ json: (d) => { resetOtpRes = { statusCode: code, ...d }; } }) },
      (err) => { if (err) throw err; }
    );

    if (resetOtpRes.statusCode !== 200) {
      throw new Error(`Worker self-service password reset failed: ${resetOtpRes.error}`);
    }

    const selfResetUser = await User.findById(userObj._id);
    const selfResetMatches = await bcrypt.compare('SelfResetWorkerPass123!', selfResetUser.password);
    if (!selfResetMatches) {
      throw new Error('TEST FAILED: Worker self-service password reset did not update password hash properly!');
    }
    console.log('✔ TEST 4 PASSED: Worker self-service Forgot Password OTP flow is 100% operational.');

    console.log('\n🎉 ALL SUPERVISOR WORKER MANAGEMENT SECURITY & EMPLOYEE ID TESTS PASSED!\n');
  } catch (err) {
    console.error('❌ Security Verification Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testSupervisorWorkerSecurity();
