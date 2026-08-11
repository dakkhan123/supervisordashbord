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
const authController = require('../backend/controllers/authController');
const workerService = require('../backend/services/workerService');

async function testWorkerProfileAndSettings() {
  console.log('\n============================================================');
  console.log('    TESTING WORKER PROFILE, SETTINGS & SECURITY STRUCTURE   ');
  console.log('============================================================\n');

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartops';
  await mongoose.connect(MONGO_URI);

  try {
    // 1. Clean up test users
    await User.deleteMany({ username: { $in: ['test_worker_a', 'test_worker_b'] } });
    await Worker.deleteMany({ email: { $in: ['workera@smartops.local', 'workerb@smartops.local'] } });

    // 2. Create Worker A
    const salt = await bcrypt.genSalt(10);
    const passHashA = await bcrypt.hash('WorkerAPass123!', salt);
    const workerA = await workerService.createWorker({
      name: 'Worker Alpha',
      email: 'workera@smartops.local',
      username: 'test_worker_a',
      password: 'WorkerAPass123!',
      phone: '9876543210',
      department: 'Assembly',
      branch: 'Pune Head Office',
      salary: 25000,
      role: 'Worker'
    });

    // 3. Create Worker B
    const passHashB = await bcrypt.hash('WorkerBPass123!', salt);
    const workerB = await workerService.createWorker({
      name: 'Worker Beta',
      email: 'workerb@smartops.local',
      username: 'test_worker_b',
      password: 'WorkerBPass123!',
      phone: '9876543211',
      department: 'Packaging',
      branch: 'Mumbai Branch',
      salary: 28000,
      role: 'Worker'
    });

    const userA = await User.findOne({ username: 'test_worker_a' }).populate('worker');
    const userB = await User.findOne({ username: 'test_worker_b' }).populate('worker');

    console.log(`✅ Created Worker A: ${userA.name} | Employee ID: ${userA.employeeId}`);
    console.log(`✅ Created Worker B: ${userB.name} | Employee ID: ${userB.employeeId}`);

    // TEST 1: Unique Employee IDs
    if (userA.employeeId === userB.employeeId) {
      throw new Error(`TEST FAILED: Employee IDs are duplicated! Both are ${userA.employeeId}`);
    }
    console.log('✔ TEST 1 PASSED: Worker A & Worker B have distinct and unique Employee IDs.');

    // TEST 2: getMe Endpoint Data for Worker A vs Worker B
    let getMeResA = {};
    await authController.getMe(
      { user: { id: userA._id } },
      { status: (code) => ({ json: (d) => { getMeResA = { statusCode: code, ...d }; } }) },
      (err) => { if (err) throw err; }
    );

    let getMeResB = {};
    await authController.getMe(
      { user: { id: userB._id } },
      { status: (code) => ({ json: (d) => { getMeResB = { statusCode: code, ...d }; } }) },
      (err) => { if (err) throw err; }
    );

    if (getMeResA.data.employeeId !== userA.employeeId) {
      throw new Error(`TEST FAILED: getMe for Worker A returned incorrect employeeId (${getMeResA.data.employeeId})`);
    }
    if (getMeResB.data.employeeId !== userB.employeeId) {
      throw new Error(`TEST FAILED: getMe for Worker B returned incorrect employeeId (${getMeResB.data.employeeId})`);
    }
    console.log('✔ TEST 2 PASSED: getMe correctly returns authenticated worker profile data with Employee ID.');

    // TEST 3: Security - Worker cannot modify protected fields (Role, Department, Branch, Joining Date, Status)
    let updateProfRes = {};
    await authController.updateProfile(
      {
        params: { id: userA._id },
        user: { id: userA._id },
        body: {
          phone: '9999988888',
          department: 'Executive Board', // Protected! Should be ignored for Workers
          role: 'Supervisor' // Protected! Should be ignored
        }
      },
      { status: (code) => ({ json: (d) => { updateProfRes = { statusCode: code, ...d }; } }) },
      (err) => { if (err) throw err; }
    );

    const reloadedUserA = await User.findById(userA._id);
    if (reloadedUserA.role !== 'Worker') {
      throw new Error('SECURITY TEST FAILED: Worker was able to modify protected field Role!');
    }
    if (reloadedUserA.department !== 'Assembly') {
      throw new Error('SECURITY TEST FAILED: Worker was able to modify protected field Department!');
    }
    if (reloadedUserA.phone !== '9999988888') {
      throw new Error('TEST FAILED: Worker allowed field update (phone) was not updated!');
    }
    console.log('✔ TEST 3 PASSED: Protected fields (Role, Department) are secured and cannot be modified by Worker.');

    // TEST 4: Worker Settings Update
    let updateSettingsRes = {};
    await authController.updateSettings(
      {
        user: { id: userA._id },
        body: {
          emailNotifications: false,
          taskNotifications: true,
          attendanceNotifications: false,
          pushNotifications: true
        }
      },
      { status: (code) => ({ json: (d) => { updateSettingsRes = { statusCode: code, ...d }; } }) },
      (err) => { if (err) throw err; }
    );

    const userASettings = (await User.findById(userA._id)).settings;
    if (userASettings.emailNotifications !== false || userASettings.attendanceNotifications !== false) {
      throw new Error('TEST FAILED: Worker notification settings were not updated properly.');
    }
    console.log('✔ TEST 4 PASSED: Worker notification settings updated and persisted successfully.');

    // TEST 5: Password Change
    let changePassRes = {};
    await authController.changePassword(
      {
        user: { id: userA._id },
        body: {
          currentPassword: 'WorkerAPass123!',
          newPassword: 'NewWorkerPass99!',
          confirmPassword: 'NewWorkerPass99!'
        }
      },
      { status: (code) => ({ json: (d) => { changePassRes = { statusCode: code, ...d }; } }) },
      (err) => { if (err) throw err; }
    );

    const updatedUserA = await User.findById(userA._id);
    const passMatches = await bcrypt.compare('NewWorkerPass99!', updatedUserA.password);
    if (!passMatches) {
      throw new Error('TEST FAILED: Password change failed to update bcrypt hash!');
    }
    console.log('✔ TEST 5 PASSED: Worker password change executed and verified cleanly.');

    console.log('\n🎉 ALL WORKER PROFILE & SETTINGS VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Verification Test Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testWorkerProfileAndSettings();
