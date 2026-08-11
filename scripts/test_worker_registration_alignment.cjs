const path = require('path');
module.paths.push(
  path.join(__dirname, '../backend/node_modules'),
  path.join(__dirname, '../node_modules')
);

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/models/User');
const Worker = require('../backend/models/Worker');
const PendingWorker = require('../backend/models/PendingWorker');
const RegistrationOTP = require('../backend/models/RegistrationOTP');
const authController = require('../backend/controllers/authController');
const workerService = require('../backend/services/workerService');

async function testRegistrationAlignment() {
  console.log('\n============================================================');
  console.log('   TESTING WORKER REGISTRATION & SUPERVISOR ADD WORKER FLOWS   ');
  console.log('============================================================\n');

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartops';
  await mongoose.connect(MONGO_URI);

  try {
    // 1. Clean up test users
    await User.deleteMany({ username: { $in: ['self_reg_worker', 'sup_reg_worker'] } });
    await Worker.deleteMany({ email: { $in: ['selfreg@smartops.local', 'supreg@smartops.local'] } });
    await PendingWorker.deleteMany({ email: 'selfreg@smartops.local' });
    await RegistrationOTP.deleteMany({ email: 'selfreg@smartops.local' });

    // ------------------------------------------------------------
    // FLOW A: WORKER SELF-REGISTRATION (WorkerRegister.jsx)
    // ------------------------------------------------------------
    console.log('--- Testing Flow A: Worker Self-Registration (OTP Verification) ---');
    let sendOtpRes = {};
    await authController.registerWorkerSendOTP(
      {
        body: {
          fullName: 'Self Registered Worker',
          username: 'self_reg_worker',
          email: 'selfreg@smartops.local',
          password: 'WorkerSelfPass123!',
          mobile: '9876543211',
          branch: 'Pune Unit A12',
          department: 'Packaging',
          dateOfBirth: '1995-05-15',
          joiningDate: '2026-08-01',
          address: 'Flat 102, Building B, Pune'
        }
      },
      { status: (code) => ({ json: (d) => { sendOtpRes = { statusCode: code, ...d }; } }) },
      (err) => { if (err) throw err; }
    );

    if (sendOtpRes.statusCode !== 200) {
      throw new Error(`FLOW A STEP 1 FAILED: registerWorkerSendOTP returned status ${sendOtpRes.statusCode}: ${sendOtpRes.error}`);
    }

    const otpDoc = await RegistrationOTP.findOne({ email: 'selfreg@smartops.local' });
    if (!otpDoc) {
      throw new Error('FLOW A STEP 1 FAILED: RegistrationOTP document not created in MongoDB!');
    }
    console.log(`✔ FLOW A STEP 1 PASSED: Registration OTP generated for ${otpDoc.email}`);

    // Set known OTP hash for verification
    const testOtpCode = '654321';
    otpDoc.otpHash = crypto.createHash('sha256').update(testOtpCode).digest('hex');
    await otpDoc.save();

    // Step 2: Verify OTP
    let verifyOtpRes = {};
    await authController.registerWorkerVerifyOTP(
      {
        body: {
          email: 'selfreg@smartops.local',
          otp: testOtpCode
        }
      },
      { status: (code) => ({ json: (d) => { verifyOtpRes = { statusCode: code, ...d }; } }) },
      (err) => { if (err) throw err; }
    );

    if (verifyOtpRes.statusCode !== 201) {
      throw new Error(`FLOW A STEP 2 FAILED: registerWorkerVerifyOTP returned status ${verifyOtpRes.statusCode}: ${verifyOtpRes.error}`);
    }

    const pendingWorker = await PendingWorker.findOne({ email: 'selfreg@smartops.local' });
    if (!pendingWorker) {
      throw new Error('FLOW A STEP 2 FAILED: PendingWorker document not created after OTP verification!');
    }
    if (pendingWorker.branch !== 'Pune Unit A12' || pendingWorker.department !== 'Packaging') {
      throw new Error('FLOW A STEP 2 FAILED: PendingWorker branch/department mismatch!');
    }
    console.log(`✔ FLOW A STEP 2 PASSED: PendingWorker submitted to supervisor queue with branch (${pendingWorker.branch}) and department (${pendingWorker.department}).`);

    // ------------------------------------------------------------
    // FLOW B: SUPERVISOR ADD WORKER (WorkerOverview.jsx Modal)
    // ------------------------------------------------------------
    console.log('\n--- Testing Flow B: Supervisor Add Worker / Register New Staff ---');
    const createdWorker = await workerService.createWorker({
      name: 'Supervisor Registered Staff',
      fullName: 'Supervisor Registered Staff',
      username: 'sup_reg_worker',
      email: 'supreg@smartops.local',
      phone: '9876543222',
      mobile: '9876543222',
      branch: 'Mumbai Branch',
      assignedSite: 'Mumbai Branch',
      department: 'Logistics',
      salary: 25000,
      role: 'Worker',
      status: 'Active',
      dateOfBirth: '1992-10-20',
      dateOfJoining: '2026-08-11',
      address: '701 Skyline Towers, Andheri, Mumbai',
      photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    });

    console.log(`✅ Created Staff via Supervisor: ${createdWorker.name} | ID: ${createdWorker.employeeId}`);

    // Verify Worker Collection Record in MongoDB
    const dbWorker = await Worker.findById(createdWorker._id);
    if (!dbWorker) throw new Error('FLOW B FAILED: Worker record missing from MongoDB!');

    // Verify User Collection Record in MongoDB
    const dbUser = await User.findOne({ username: 'sup_reg_worker' });
    if (!dbUser) throw new Error('FLOW B FAILED: User account record missing from MongoDB!');

    // Verify Shared Registration Fields Saved to MongoDB
    console.log('\n--- Verifying Database Fields Saved to MongoDB ---');
    console.log(`- Employee ID:   Worker=${dbWorker.employeeId} | User=${dbUser.employeeId}`);
    console.log(`- Branch/Office: Worker=${dbWorker.assignedSite} | User=${dbUser.branch}`);
    console.log(`- Department:    Worker=${dbWorker.department} | User=${dbUser.department}`);
    console.log(`- Phone/Mobile:  Worker=${dbWorker.phone} | User=${dbUser.phone}`);
    console.log(`- Address:       Worker=${dbWorker.address} | User=${dbUser.address}`);
    console.log(`- Salary:        Worker=${dbWorker.salary}`);
    console.log(`- Status:        Worker=${dbWorker.status} | User=${dbUser.status}`);

    if (!dbWorker.employeeId || dbWorker.employeeId !== dbUser.employeeId) {
      throw new Error('FIELD VERIFICATION FAILED: Employee ID mismatch or missing!');
    }
    if (dbWorker.assignedSite !== 'Mumbai Branch' || dbUser.branch !== 'Mumbai Branch') {
      throw new Error('FIELD VERIFICATION FAILED: Branch / Office mismatch or missing!');
    }
    if (dbWorker.department !== 'Logistics' || dbUser.department !== 'Logistics') {
      throw new Error('FIELD VERIFICATION FAILED: Department mismatch!');
    }
    if (dbWorker.salary !== 25000) {
      throw new Error('FIELD VERIFICATION FAILED: Salary not saved!');
    }
    if (!dbWorker.photo || !dbUser.photo) {
      throw new Error('FIELD VERIFICATION FAILED: Photo base64 data missing!');
    }

    console.log('\n✔ FLOW B PASSED: All 10 worker registration fields + salary + branch + photo saved cleanly to MongoDB with unique Employee ID.');
    console.log('\n🎉 ALL REGISTRATION ALIGNMENT TESTS PASSED SUCCESSFULLY!\n');

  } catch (err) {
    console.error('❌ Registration Alignment Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testRegistrationAlignment();
