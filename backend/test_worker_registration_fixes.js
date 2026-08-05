require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('./models/User');
const Worker = require('./models/Worker');
const PendingWorker = require('./models/PendingWorker');
const RegistrationOTP = require('./models/RegistrationOTP');
const Notification = require('./models/Notification');

const authController = require('./controllers/authController');
const workerController = require('./controllers/workerController');
const workerService = require('./services/workerService');

async function testWorkerRegistrationFixes() {
  console.log('\n============================================================');
  console.log('   VERIFYING WORKER REGISTRATION APPROVAL & WORKER DIRECTORY');
  console.log('============================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartops';
    console.log(`[TEST] Connecting to MongoDB: ${mongoUri.split('@').pop()}`);
    await mongoose.connect(mongoUri);
    console.log('[TEST] Connected to MongoDB.');

    // Clean up test data
    const testUsernames = ['worker_fix_1', 'worker_fix_2', 'sup_fix_1'];
    const testEmails = ['worker_fix_1@smartops.local', 'worker_fix_2@smartops.local', 'sup_fix_1@smartops.local'];

    await User.deleteMany({ username: { $in: testUsernames } });
    await Worker.deleteMany({ email: { $in: testEmails } });
    await PendingWorker.deleteMany({ email: { $in: testEmails } });
    await RegistrationOTP.deleteMany({ email: { $in: testEmails } });

    // Create Test Supervisor
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('SupPass123!', salt);
    const testSupervisor = await User.create({
      username: 'sup_fix_1',
      email: 'sup_fix_1@smartops.local',
      name: 'Supervisor Fix Tester',
      password: passHash,
      role: 'Supervisor',
      status: 'Active',
      isEmailVerified: true
    });
    console.log(`[TEST] Created Supervisor Account: ${testSupervisor.name} (${testSupervisor._id})`);

    // -------------------------------------------------------------
    // TEST 1: WORKER REGISTRATION & NO IMMEDIATE LOGIN / NO ACTIVE ACCOUNT
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Worker Registration & Pending Request Creation ---');

    let sendOtpRes1 = {};
    await authController.registerWorkerSendOTP(
      {
        body: {
          fullName: 'Worker Fix One',
          username: 'worker_fix_1',
          email: 'worker_fix_1@smartops.local',
          password: 'WorkerPass123!',
          confirmPassword: 'WorkerPass123!',
          mobile: '9876543210',
          department: 'Assembly'
        }
      },
      { status: (code) => ({ json: (data) => { sendOtpRes1 = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[TEST 1A] Send OTP Result -> Status ${sendOtpRes1.statusCode}, Message: "${sendOtpRes1.message}"`);
    if (sendOtpRes1.statusCode !== 200) throw new Error(`Send OTP failed: ${sendOtpRes1.error}`);

    // Set OTP Hash deterministically for testing
    const testOTP = '112233';
    const otpDoc1 = await RegistrationOTP.findOne({ email: 'worker_fix_1@smartops.local' });
    otpDoc1.otpHash = crypto.createHash('sha256').update(testOTP).digest('hex');
    await otpDoc1.save();

    let verifyOtpRes1 = {};
    await authController.registerWorkerVerifyOTP(
      { body: { email: 'worker_fix_1@smartops.local', otp: testOTP } },
      { status: (code) => ({ json: (data) => { verifyOtpRes1 = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[TEST 1B] Verify OTP Result -> Status ${verifyOtpRes1.statusCode}, Message: "${verifyOtpRes1.message}"`);
    if (verifyOtpRes1.statusCode !== 201) throw new Error(`Verify OTP failed: ${verifyOtpRes1.error}`);
    if (verifyOtpRes1.token) throw new Error('SECURITY VIOLATION: JWT token was issued immediately upon registration!');

    // Check that NO active User or Worker document exists
    const checkActiveUser1 = await User.findOne({ username: 'worker_fix_1' });
    const checkActiveWorker1 = await Worker.findOne({ email: 'worker_fix_1@smartops.local' });
    if (checkActiveUser1 || checkActiveWorker1) {
      throw new Error('SECURITY VIOLATION: Active User or Worker record was created immediately upon registration!');
    }

    const pendingDoc1 = await PendingWorker.findOne({ email: 'worker_fix_1@smartops.local' });
    if (!pendingDoc1 || pendingDoc1.status !== 'Pending') {
      throw new Error('PendingWorker document missing or status is not Pending!');
    }

    console.log(`✅ TEST 1 PASSED: Worker registration created PendingWorker ID: ${pendingDoc1._id} (No active User/Worker, No JWT).`);

    // -------------------------------------------------------------
    // TEST 2: SUPERVISOR RECEIVES NOTIFICATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Supervisor Notification Verification ---');

    const supNotification = await Notification.findOne({
      user: testSupervisor._id,
      title: /New Worker Registration Request/i
    });

    if (!supNotification) {
      throw new Error('NOTIFICATION FAILURE: Supervisor did not receive registration request notification!');
    }
    console.log(`✅ TEST 2 PASSED: Supervisor received notification: "${supNotification.title}" - ${supNotification.message}`);

    // -------------------------------------------------------------
    // TEST 3: PENDING WORKER LOGIN IS STRICTLY BLOCKED
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Pending Worker Login Enforcement ---');

    let loginPendingRes = {};
    await authController.login(
      { body: { username: 'worker_fix_1', password: 'WorkerPass123!' } },
      { status: (code) => ({ json: (data) => { loginPendingRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[TEST 3] Pending Login Result -> Status ${loginPendingRes.statusCode}, Error: "${loginPendingRes.error}"`);
    if (loginPendingRes.statusCode !== 403 || !loginPendingRes.error.includes('pending supervisor approval')) {
      throw new Error('LOGIN ENFORCEMENT FAILURE: Pending worker was not blocked with 403 Forbidden!');
    }
    console.log('✅ TEST 3 PASSED: Pending worker login strictly blocked with 403 Forbidden.');

    // -------------------------------------------------------------
    // TEST 4 & 5: SUPERVISOR APPROVAL, SALARY ASSIGNMENT & WORKERS PAGE ENTRY
    // -------------------------------------------------------------
    console.log('\n--- TEST 4 & 5: Supervisor Approval & Workers Directory Update ---');

    let pendingListRes = {};
    await workerController.getPendingRegistrations(
      {},
      { status: (code) => ({ json: (data) => { pendingListRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    if (!pendingListRes.data || pendingListRes.data.length === 0) {
      throw new Error('Pending registrations list returned 0 items for supervisor!');
    }
    console.log(`[TEST 4] Supervisor found ${pendingListRes.data.length} pending registration request(s).`);

    // Approve Worker 1 with Salary = ₹24,500
    let approveRes = {};
    await workerController.approveRegistration(
      { params: { id: pendingDoc1._id.toString() }, body: { salary: 24500 } },
      { status: (code) => ({ json: (data) => { approveRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[TEST 5] Approve Worker Result -> Status ${approveRes.statusCode}, Message: "${approveRes.message}"`);
    if (approveRes.statusCode !== 200) throw new Error(`Approval failed: ${approveRes.error}`);

    // Verify Worker appears in Workers Directory (GET /api/workers)
    const allWorkers = await workerService.getAllWorkers({});
    const approvedWorkerInList = allWorkers.find(w => w.email === 'worker_fix_1@smartops.local');

    if (!approvedWorkerInList || approvedWorkerInList.salary !== 24500 || approvedWorkerInList.status !== 'Active') {
      throw new Error('WORKERS DIRECTORY FAILURE: Approved worker missing from Workers Directory or salary/status incorrect!');
    }

    // Verify Worker Notification
    const activeUser1 = await User.findOne({ username: 'worker_fix_1' });
    const workerNotification = await Notification.findOne({ user: activeUser1._id });
    if (!workerNotification) {
      throw new Error('NOTIFICATION FAILURE: Worker did not receive approval notification!');
    }

    console.log(`✅ TEST 4 & 5 PASSED: Worker approved! Salary: ₹${approvedWorkerInList.salary}. Appears in Workers Directory & received notification.`);

    // -------------------------------------------------------------
    // TEST 6: WORKER LOGIN SUCCEEDS POST-APPROVAL
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Approved Worker Login Verification ---');

    let loginActiveRes = {};
    await authController.login(
      { body: { username: 'worker_fix_1', password: 'WorkerPass123!' } },
      { status: (code) => ({ json: (data) => { loginActiveRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[TEST 6] Login Approved Worker Result -> Status ${loginActiveRes.statusCode}, Token: Present`);
    if (loginActiveRes.statusCode !== 200 || !loginActiveRes.token) {
      throw new Error('Approved worker failed to log in!');
    }
    console.log('✅ TEST 6 PASSED: Approved worker logged in successfully.');

    // -------------------------------------------------------------
    // TEST 7: REJECTION FLOW WITH MANDATORY COMMENT
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Rejection Flow & Mandatory Comment Enforcement ---');

    // Register Worker 2
    await authController.registerWorkerSendOTP(
      {
        body: {
          fullName: 'Worker Fix Two',
          username: 'worker_fix_2',
          email: 'worker_fix_2@smartops.local',
          password: 'WorkerPass123!',
          confirmPassword: 'WorkerPass123!',
          mobile: '9876543211',
          department: 'Packaging'
        }
      },
      { status: () => ({ json: () => {} }) },
      (err) => { if (err) throw err; }
    );

    const otpDoc2 = await RegistrationOTP.findOne({ email: 'worker_fix_2@smartops.local' });
    otpDoc2.otpHash = crypto.createHash('sha256').update(testOTP).digest('hex');
    await otpDoc2.save();

    await authController.registerWorkerVerifyOTP(
      { body: { email: 'worker_fix_2@smartops.local', otp: testOTP } },
      { status: () => ({ json: () => {} }) },
      (err) => { if (err) throw err; }
    );

    const pendingDoc2 = await PendingWorker.findOne({ email: 'worker_fix_2@smartops.local' });

    // Attempt Rejection WITHOUT Comment -> Must Fail with 400
    let rejectNoCommentRes = {};
    await workerController.rejectRegistration(
      { params: { id: pendingDoc2._id.toString() }, body: { rejectionReason: '' } },
      { status: (code) => ({ json: (data) => { rejectNoCommentRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[TEST 7A] Reject No Comment Result -> Status ${rejectNoCommentRes.statusCode}, Error: "${rejectNoCommentRes.message || rejectNoCommentRes.error}"`);
    if (rejectNoCommentRes.statusCode !== 400) {
      throw new Error('VALIDATION FAILURE: Rejection without comment was not blocked with 400!');
    }

    // Rejection WITH Comment
    let rejectWithCommentRes = {};
    await workerController.rejectRegistration(
      { params: { id: pendingDoc2._id.toString() }, body: { rejectionReason: 'Invalid identity documents uploaded.' } },
      { status: (code) => ({ json: (data) => { rejectWithCommentRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[TEST 7B] Reject With Comment Result -> Status ${rejectWithCommentRes.statusCode}, Message: "${rejectWithCommentRes.message}"`);
    if (rejectWithCommentRes.statusCode !== 200) throw new Error('Rejection with comment failed!');

    // Worker 2 Login attempt -> Must fail with 403
    let loginRejectedRes = {};
    await authController.login(
      { body: { username: 'worker_fix_2', password: 'WorkerPass123!' } },
      { status: (code) => ({ json: (data) => { loginRejectedRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[TEST 7C] Login Rejected Worker Result -> Status ${loginRejectedRes.statusCode}, Error: "${loginRejectedRes.error}"`);
    if (loginRejectedRes.statusCode !== 403 || !loginRejectedRes.error.includes('rejected by supervisor')) {
      throw new Error('SECURITY FAILURE: Rejected worker was not blocked from login with 403 Forbidden!');
    }

    console.log('✅ TEST 7 PASSED: Mandatory comment enforced on rejection, rejection processed, login strictly blocked.');

    console.log('\n============================================================');
    console.log('  ✅ ALL WORKER REGISTRATION & WORKERS PAGE TESTS PASSED!   ');
    console.log('============================================================\n');

    // Clean up test records
    await User.deleteMany({ username: { $in: testUsernames } });
    await Worker.deleteMany({ email: { $in: testEmails } });
    await PendingWorker.deleteMany({ email: { $in: testEmails } });
    await RegistrationOTP.deleteMany({ email: { $in: testEmails } });

  } catch (err) {
    console.error('\n❌ WORKER REGISTRATION FIXES TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testWorkerRegistrationFixes();
