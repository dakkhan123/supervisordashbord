const path = require('path');
module.paths.push(
  path.join(__dirname, '../backend/node_modules'),
  path.join(__dirname, '../node_modules')
);

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const RegistrationOTP = require('../backend/models/RegistrationOTP');
const PendingWorker = require('../backend/models/PendingWorker');

function hashOTP(otpStr) {
  return crypto.createHash('sha256').update(otpStr).digest('hex');
}

async function testWorkerSelfRegistrationNoDep() {
  console.log('\n============================================================');
  console.log('   TESTING WORKER SELF-REGISTRATION (NO DEPARTMENT PAYLOAD) ');
  console.log('============================================================\n');

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartops';
  await mongoose.connect(MONGO_URI);

  try {
    const testEmail = 'selfreg_nodep@smartops.local';
    const testUsername = 'selfreg_nodep_user';

    // 1. Clean up previous test artifacts
    await RegistrationOTP.deleteMany({ email: testEmail });
    await PendingWorker.deleteMany({ email: testEmail });

    // 2. Simulate step 1: Worker self-registers (department intentionally omitted)
    console.log('--- Step 1: Sending Registration OTP (No Department Payload) ---');
    const rawOtp = '654321';
    const otpHash = hashOTP(rawOtp);

    const otpRecord = await RegistrationOTP.create({
      name: 'Self Reg Worker',
      username: testUsername,
      email: testEmail,
      password: 'WorkerSecretPassword123',
      phone: '9988776655',
      role: 'Worker',
      branch: 'Mumbai Branch',
      dateOfJoining: new Date(),
      otpHash: otpHash
      // Note: department field omitted!
    });

    console.log(`✅ OTP Record Created for: ${otpRecord.email} | Default Dept: ${otpRecord.department}`);

    // 3. Simulate step 2: Worker verifies OTP
    console.log('\n--- Step 2: Verifying OTP & Creating PendingWorker ---');
    const pendingWorker = await PendingWorker.create({
      fullName: otpRecord.name,
      username: otpRecord.username,
      email: otpRecord.email,
      passwordHash: otpRecord.password,
      mobile: otpRecord.phone || '',
      branch: otpRecord.branch || 'Pune Head Office',
      joiningDate: otpRecord.dateOfJoining || new Date(),
      status: 'Pending',
      emailVerified: true
      // Note: department field omitted!
    });

    console.log(`✅ PendingWorker Created: ${pendingWorker.fullName} | ID: ${pendingWorker._id}`);

    // 4. Verification checks
    console.log('\n--- MongoDB Verification Results ---');
    console.log(`- Full Name:       ${pendingWorker.fullName}`);
    console.log(`- Username:        ${pendingWorker.username}`);
    console.log(`- Email:           ${pendingWorker.email}`);
    console.log(`- Branch:          ${pendingWorker.branch}`);
    console.log(`- Department:      ${pendingWorker.department}`);
    console.log(`- Status:          ${pendingWorker.status}`);
    console.log(`- Email Verified:  ${pendingWorker.emailVerified}`);

    if (pendingWorker.department !== 'Operations') {
      throw new Error(`TEST FAILED: Department should default to Operations! Found: ${pendingWorker.department}`);
    }

    console.log('\n✔ TEST PASSED: Worker self-registration succeeded without Department payload!');
    console.log('✔ TEST PASSED: PendingWorker record created cleanly in MongoDB.');
    console.log('✔ TEST PASSED: Department defaulted to "Operations" without throwing schema error.');
    console.log('\n🎉 WORKER SELF-REGISTRATION NO-DEPARTMENT TEST PASSED!\n');

  } catch (err) {
    console.error('❌ Test Execution Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testWorkerSelfRegistrationNoDep();
