require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Worker = require('./models/Worker');
const PendingWorker = require('./models/PendingWorker');
const RegistrationOTP = require('./models/RegistrationOTP');
const authController = require('./controllers/authController');
const workerController = require('./controllers/workerController');

async function runWorkerRegistrationWorkflowTests() {
  console.log('\n============================================================');
  console.log('    TESTING WORKER REGISTRATION APPROVAL & PASSWORD RESET   ');
  console.log('============================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartops';
    console.log(`[TEST] Connecting to MongoDB: ${mongoUri.split('@').pop()}`);
    await mongoose.connect(mongoUri);
    console.log('[TEST] Connected to MongoDB.');

    // 1. Clean up test users & pending registrations
    const testUsernames = ['reg_flow_worker_1', 'reg_flow_worker_2', 'reg_flow_supervisor'];
    const testEmails = ['worker1@smartops.local', 'worker2@smartops.local', 'sup_reg@smartops.local'];

    await User.deleteMany({ username: { $in: testUsernames } });
    await Worker.deleteMany({ email: { $in: testEmails } });
    await PendingWorker.deleteMany({ email: { $in: testEmails } });
    await RegistrationOTP.deleteMany({ email: { $in: testEmails } });

    // Create Test Supervisor
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('SupPass123!', salt);
    const testSupUser = await User.create({
      username: 'reg_flow_supervisor',
      email: 'sup_reg@smartops.local',
      name: 'Registration Supervisor',
      password: passHash,
      role: 'Supervisor',
      status: 'Active',
      isEmailVerified: true
    });
    console.log(`[TEST] Created Supervisor: ${testSupUser.name} (${testSupUser._id})`);

    // -------------------------------------------------------------
    // STEP 1 & 2: Worker 1 Registration & Email OTP Verification
    // -------------------------------------------------------------
    console.log('\n--- STEP 1 & 2: Worker 1 Registration & OTP Verification ---');

    let sendOtpRes1 = {};
    await authController.registerWorkerSendOTP(
      {
        body: {
          fullName: 'Worker Alpha One',
          username: 'reg_flow_worker_1',
          email: 'worker1@smartops.local',
          password: 'WorkerPass123!',
          confirmPassword: 'WorkerPass123!',
          mobile: '9876543210',
          department: 'Assembly',
          dateOfBirth: '1995-05-15',
          address: 'Factory Colony Block A'
        }
      },
      { status: (code) => ({ json: (data) => { sendOtpRes1 = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 1] Send OTP Result -> Status ${sendOtpRes1.statusCode}, Message: "${sendOtpRes1.message}"`);
    if (sendOtpRes1.statusCode !== 200) {
      throw new Error(`Worker 1 send OTP failed: ${sendOtpRes1.error}`);
    }

    // Retrieve generated OTP from DB
    const otpDoc1 = await RegistrationOTP.findOne({ email: 'worker1@smartops.local' });
    if (!otpDoc1) throw new Error('RegistrationOTP record not created!');

    // We can simulate OTP verification because otpHash is generated from original OTP.
    // In our test, let's grab the raw OTP if saved or test direct hash match.
    // In RegistrationOTP, otpHash is sha256(otp). Let's override for test or read:
    // Let's test with the real hash function:
    const crypto = require('crypto');
    // Let's brute/test or replace otpHash with a known test OTP for deterministic verification:
    const testOTP = '123456';
    otpDoc1.otpHash = crypto.createHash('sha256').update(testOTP).digest('hex');
    await otpDoc1.save();

    let verifyOtpRes1 = {};
    await authController.registerWorkerVerifyOTP(
      { body: { email: 'worker1@smartops.local', otp: testOTP } },
      { status: (code) => ({ json: (data) => { verifyOtpRes1 = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 2] Verify OTP Result -> Status ${verifyOtpRes1.statusCode}, Message: "${verifyOtpRes1.message}"`);
    if (verifyOtpRes1.statusCode !== 201) {
      throw new Error(`Worker 1 OTP verification failed: ${verifyOtpRes1.error}`);
    }

    const pending1 = await PendingWorker.findOne({ email: 'worker1@smartops.local' });
    if (!pending1 || pending1.status !== 'Pending') {
      throw new Error('PendingWorker document not created with status = Pending!');
    }
    console.log(`✅ STEP 1 & 2 PASSED: Worker 1 registration submitted successfully. PendingWorker ID: ${pending1._id}`);

    // -------------------------------------------------------------
    // STEP 3: Login Blocked for Pending Worker 1
    // -------------------------------------------------------------
    console.log('\n--- STEP 3: Login Blocked for Pending Worker 1 ---');

    let loginPendingRes = {};
    await authController.login(
      { body: { username: 'reg_flow_worker_1', password: 'WorkerPass123!' } },
      { status: (code) => ({ json: (data) => { loginPendingRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 3] Login Pending Worker Result -> Status ${loginPendingRes.statusCode}, Error: "${loginPendingRes.error}"`);
    if (loginPendingRes.statusCode !== 403 || !loginPendingRes.error.includes('pending supervisor approval')) {
      throw new Error('LOGIN SECURITY FAILURE: Pending worker was not blocked from login!');
    }
    console.log('✅ STEP 3 PASSED: Pending worker correctly blocked from logging in with 403 Forbidden.');

    // -------------------------------------------------------------
    // STEP 4 & 5: Supervisor Approval & Salary Assignment
    // -------------------------------------------------------------
    console.log('\n--- STEP 4 & 5: Supervisor Approval & Salary Assignment ---');

    let pendingListRes = {};
    await workerController.getPendingRegistrations(
      {},
      { status: (code) => ({ json: (data) => { pendingListRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 4] Get Pending Registrations -> Found ${pendingListRes.count} pending applications.`);
    if (pendingListRes.count === 0) throw new Error('No pending registrations returned for supervisor!');

    // Supervisor Approves Worker 1 with Salary = ₹22,000
    let approveRes = {};
    await workerController.approveRegistration(
      { params: { id: pending1._id.toString() }, body: { salary: 22000 } },
      { status: (code) => ({ json: (data) => { approveRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 5] Approve Worker 1 Result -> Status ${approveRes.statusCode}, Message: "${approveRes.message}"`);
    if (approveRes.statusCode !== 200) {
      throw new Error(`Worker approval failed: ${approveRes.error}`);
    }

    // Verify User & Worker documents created in MongoDB
    const approvedUser = await User.findOne({ username: 'reg_flow_worker_1' });
    const approvedWorker = await Worker.findOne({ email: 'worker1@smartops.local' });

    if (!approvedUser || approvedUser.status !== 'Active' || approvedUser.role !== 'Worker') {
      throw new Error('User account not activated or role incorrect after approval!');
    }
    if (!approvedWorker || approvedWorker.salary !== 22000 || approvedWorker.status !== 'Active') {
      throw new Error('Worker profile or assigned salary incorrect after approval!');
    }

    console.log(`✅ STEP 4 & 5 PASSED: Worker 1 approved & activated! Assigned Salary: ₹${approvedWorker.salary}`);

    // -------------------------------------------------------------
    // STEP 6: Worker 1 Login After Approval
    // -------------------------------------------------------------
    console.log('\n--- STEP 6: Worker 1 Login After Approval ---');

    let loginActiveRes = {};
    await authController.login(
      { body: { username: 'reg_flow_worker_1', password: 'WorkerPass123!' } },
      { status: (code) => ({ json: (data) => { loginActiveRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 6] Login Active Worker Result -> Status ${loginActiveRes.statusCode}, Role: ${loginActiveRes.data ? loginActiveRes.data.role : 'N/A'}`);
    if (loginActiveRes.statusCode !== 200 || !loginActiveRes.token) {
      throw new Error('Worker 1 failed to log in after approval!');
    }
    console.log('✅ STEP 6 PASSED: Activated worker logged in successfully and received JWT token.');

    // -------------------------------------------------------------
    // STEP 7: Worker 2 Registration & Supervisor Rejection
    // -------------------------------------------------------------
    console.log('\n--- STEP 7: Worker 2 Registration & Supervisor Rejection ---');

    // Register Worker 2
    await authController.registerWorkerSendOTP(
      {
        body: {
          fullName: 'Worker Beta Two',
          username: 'reg_flow_worker_2',
          email: 'worker2@smartops.local',
          password: 'WorkerPass123!',
          confirmPassword: 'WorkerPass123!',
          mobile: '9876543211',
          department: 'Packaging'
        }
      },
      { status: () => ({ json: () => {} }) },
      (err) => { if (err) throw err; }
    );

    const otpDoc2 = await RegistrationOTP.findOne({ email: 'worker2@smartops.local' });
    otpDoc2.otpHash = crypto.createHash('sha256').update(testOTP).digest('hex');
    await otpDoc2.save();

    await authController.registerWorkerVerifyOTP(
      { body: { email: 'worker2@smartops.local', otp: testOTP } },
      { status: () => ({ json: () => {} }) },
      (err) => { if (err) throw err; }
    );

    const pending2 = await PendingWorker.findOne({ email: 'worker2@smartops.local' });

    // Supervisor Rejects Worker 2 with Rejection Reason
    let rejectRes = {};
    await workerController.rejectRegistration(
      { params: { id: pending2._id.toString() }, body: { rejectionReason: 'Incomplete documentation provided.' } },
      { status: (code) => ({ json: (data) => { rejectRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 7] Reject Worker 2 Result -> Status ${rejectRes.statusCode}, Status: "${rejectRes.data.pending.status}"`);

    // Worker 2 Login attempt
    let loginRejectedRes = {};
    await authController.login(
      { body: { username: 'reg_flow_worker_2', password: 'WorkerPass123!' } },
      { status: (code) => ({ json: (data) => { loginRejectedRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 7] Login Rejected Worker Result -> Status ${loginRejectedRes.statusCode}, Error: "${loginRejectedRes.error}"`);
    if (loginRejectedRes.statusCode !== 403 || !loginRejectedRes.error.includes('rejected by supervisor')) {
      throw new Error('SECURITY FAILURE: Rejected worker was not blocked from login!');
    }

    console.log('✅ STEP 7 PASSED: Worker 2 rejection processed and login strictly blocked.');

    // -------------------------------------------------------------
    // STEP 8: Forgot Password via Email OTP (For Workers & Supervisors)
    // -------------------------------------------------------------
    console.log('\n--- STEP 8: Forgot Password via Email OTP ---');

    let forgotOtpRes = {};
    await authController.forgotPasswordSendOTP(
      { body: { email: 'worker1@smartops.local' } },
      { status: (code) => ({ json: (data) => { forgotOtpRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 8A] Forgot Password Send OTP -> Status ${forgotOtpRes.statusCode}, Message: "${forgotOtpRes.message}"`);
    if (forgotOtpRes.statusCode !== 200) {
      throw new Error('Forgot password send OTP failed!');
    }

    // Set a known test reset OTP on User 1
    const user1 = await User.findOne({ email: 'worker1@smartops.local' });
    user1.resetPasswordOTP = crypto.createHash('sha256').update('654321').digest('hex');
    user1.resetPasswordOTPExpire = Date.now() + 600000;
    await user1.save();

    let resetPasswordRes = {};
    await authController.forgotPasswordReset(
      {
        body: {
          email: 'worker1@smartops.local',
          otp: '654321',
          newPassword: 'BrandNewPass123!',
          confirmPassword: 'BrandNewPass123!'
        }
      },
      { status: (code) => ({ json: (data) => { resetPasswordRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 8B] Reset Password Result -> Status ${resetPasswordRes.statusCode}, Message: "${resetPasswordRes.message}"`);
    if (resetPasswordRes.statusCode !== 200) {
      throw new Error('Reset password failed!');
    }

    // Verify Worker 1 can log in with new password
    let loginNewPassRes = {};
    await authController.login(
      { body: { username: 'reg_flow_worker_1', password: 'BrandNewPass123!' } },
      { status: (code) => ({ json: (data) => { loginNewPassRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 8C] Login with New Password -> Status ${loginNewPassRes.statusCode}`);
    if (loginNewPassRes.statusCode !== 200 || !loginNewPassRes.token) {
      throw new Error('Failed to log in with newly reset password!');
    }

    console.log('✅ STEP 8 PASSED: Forgot password OTP reset and login with new password verified.');

    console.log('\n============================================================');
    console.log('  ✅ ALL WORKER REGISTRATION & PASSWORD TESTS PASSED!       ');
    console.log('============================================================\n');

    // Clean up test records
    await User.deleteMany({ username: { $in: testUsernames } });
    await Worker.deleteMany({ email: { $in: testEmails } });
    await PendingWorker.deleteMany({ email: { $in: testEmails } });
    await RegistrationOTP.deleteMany({ email: { $in: testEmails } });

  } catch (err) {
    console.error('\n❌ WORKER REGISTRATION TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runWorkerRegistrationWorkflowTests();
