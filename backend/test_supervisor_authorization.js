require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Worker = require('./models/Worker');
const authController = require('./controllers/authController');
const workerService = require('./services/workerService');

async function runAuthorizationTests() {
  console.log('\n============================================================');
  console.log('   TESTING SUPERVISOR PROFILE ISOLATION & AUTHORIZATION     ');
  console.log('============================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartops';
    console.log(`[TEST] Connecting to MongoDB: ${mongoUri.split('@').pop()}`);
    await mongoose.connect(mongoUri);
    console.log('[TEST] Connected to MongoDB.');

    // 1. Clean up existing test accounts
    await User.deleteMany({ username: { $in: ['test_sup_alpha', 'test_sup_beta', 'test_worker_gamma'] } });
    await Worker.deleteMany({ email: { $in: ['sup_alpha@smartops.local', 'sup_beta@smartops.local', 'worker_gamma@smartops.local'] } });

    // 2. Create Supervisor A
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('Supervisor@123', salt);

    const supA = await User.create({
      username: 'test_sup_alpha',
      email: 'sup_alpha@smartops.local',
      name: 'Supervisor Alpha',
      phone: '9876543210',
      password: passHash,
      role: 'Supervisor',
      department: 'Assembly',
      unit: 'Unit Alpha',
      address: 'Industrial Zone A, Pune',
      isEmailVerified: true
    });

    // 3. Create Supervisor B
    const supB = await User.create({
      username: 'test_sup_beta',
      email: 'sup_beta@smartops.local',
      name: 'Supervisor Beta',
      phone: '9123456789',
      password: passHash,
      role: 'Supervisor',
      department: 'Logistics',
      unit: 'Unit Beta',
      address: 'Logistics Park, Mumbai',
      isEmailVerified: true
    });

    console.log(`[TEST] Created Supervisor A: ${supA.name} (ID: ${supA._id})`);
    console.log(`[TEST] Created Supervisor B: ${supB.name} (ID: ${supB._id})`);

    // -------------------------------------------------------------
    // Test 1: Supervisor Profile Isolation (Requirement 1 & 5)
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Supervisor Profile Isolation ---');

    let resAData = {};
    await authController.getMe(
      { user: { id: supA._id } },
      { status: (code) => ({ json: (data) => { resAData = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    let resBData = {};
    await authController.getMe(
      { user: { id: supB._id } },
      { status: (code) => ({ json: (data) => { resBData = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[TEST 1A] Supervisor A Profile Fetched -> Name: "${resAData.data.name}", Email: "${resAData.data.email}"`);
    console.log(`[TEST 1B] Supervisor B Profile Fetched -> Name: "${resBData.data.name}", Email: "${resBData.data.email}"`);

    if (resAData.data.name !== 'Supervisor Alpha' || resAData.data.email !== 'sup_alpha@smartops.local') {
      throw new Error('Supervisor A profile data does not match expected MongoDB record!');
    }

    if (resBData.data.name !== 'Supervisor Beta' || resBData.data.email !== 'sup_beta@smartops.local') {
      throw new Error('Supervisor B profile data does not match expected MongoDB record!');
    }

    if (resAData.data.name === resBData.data.name) {
      throw new Error('PROFILE ISOLATION FAILURE: Supervisor A and B returned identical profiles!');
    }

    console.log('✅ TEST 1 PASSED: Supervisor profiles are 100% isolated and dynamic.');

    // -------------------------------------------------------------
    // Test 2: Cross-Account Editing Security (Requirement 2 & 6)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Cross-Account Editing Security (403 Enforcement) ---');

    // Supervisor A attempts to edit Supervisor B's profile ID
    let crossEditRes = {};
    await authController.updateProfile(
      {
        user: { id: supA._id },
        params: { id: supB._id.toString() },
        body: { name: 'Hacked Name By A' }
      },
      { status: (code) => ({ json: (data) => { crossEditRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[TEST 2A] Supervisor A trying to edit Supervisor B -> Status: ${crossEditRes.statusCode}, Error: "${crossEditRes.error}"`);

    if (crossEditRes.statusCode !== 403) {
      throw new Error(`SECURITY FAILURE: Expected status 403 Forbidden when editing another supervisor, got ${crossEditRes.statusCode}!`);
    }

    // Supervisor A updates own profile
    let ownEditRes = {};
    await authController.updateProfile(
      {
        user: { id: supA._id },
        params: { id: supA._id.toString() },
        body: { name: 'Supervisor Alpha (Updated)' }
      },
      { status: (code) => ({ json: (data) => { ownEditRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[TEST 2B] Supervisor A updating own profile -> Status: ${ownEditRes.statusCode}, New Name: "${ownEditRes.data.name}"`);

    if (ownEditRes.statusCode !== 200 || ownEditRes.data.name !== 'Supervisor Alpha (Updated)') {
      throw new Error('Self profile update failed!');
    }

    console.log('✅ TEST 2 PASSED: 403 Forbidden correctly enforced on cross-account edits.');

    // -------------------------------------------------------------
    // Test 3: Worker Management Bounds (Requirement 3)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Worker Management & Supervisor Account Protection ---');

    // Create a worker
    const createdWorker = await workerService.createWorker({
      name: 'Worker Gamma',
      email: 'worker_gamma@smartops.local',
      username: 'test_worker_gamma',
      phone: '9000011111',
      role: 'Worker',
      salary: 15000,
      department: 'Operations'
    });

    console.log(`[TEST 3A] Created Worker: "${createdWorker.name}" (ID: ${createdWorker._id})`);

    // Reset worker password
    const resetRes = await workerService.resetWorkerPassword(createdWorker._id, 'NewPass@123');
    console.log(`[TEST 3B] Reset Worker Password -> ${resetRes.message}`);

    // Attempt to reset Supervisor B's password using worker endpoint
    let supervisorResetFailed = false;
    try {
      await workerService.resetWorkerPassword(supB._id);
    } catch (err) {
      console.log(`[TEST 3C] Attempting to reset Supervisor B via worker API -> Error ${err.statusCode}: "${err.message}"`);
      if (err.statusCode === 403) {
        supervisorResetFailed = true;
      }
    }

    if (!supervisorResetFailed) {
      throw new Error('SECURITY FAILURE: Worker password reset endpoint allowed modifying a Supervisor account!');
    }

    // Attempt to delete Supervisor B using worker endpoint
    let supervisorDeleteFailed = false;
    try {
      await workerService.deleteWorker(supB._id);
    } catch (err) {
      console.log(`[TEST 3D] Attempting to delete Supervisor B via worker API -> Error ${err.statusCode}: "${err.message}"`);
      if (err.statusCode === 403) {
        supervisorDeleteFailed = true;
      }
    }

    if (!supervisorDeleteFailed) {
      throw new Error('SECURITY FAILURE: Worker delete endpoint allowed deleting a Supervisor account!');
    }

    // Delete the actual worker
    await workerService.deleteWorker(createdWorker._id);
    console.log('[TEST 3E] Worker deleted successfully.');

    console.log('✅ TEST 3 PASSED: Supervisors can manage workers but cannot modify supervisor accounts.');

    console.log('\n============================================================');
    console.log('  ✅ ALL SUPERVISOR PROFILE & AUTHORIZATION TESTS PASSED!   ');
    console.log('============================================================\n');

    // Clean up test records
    await User.deleteMany({ username: { $in: ['test_sup_alpha', 'test_sup_beta', 'test_worker_gamma'] } });
    await Worker.deleteMany({ email: { $in: ['sup_alpha@smartops.local', 'sup_beta@smartops.local', 'worker_gamma@smartops.local'] } });

  } catch (err) {
    console.error('\n❌ AUTHORIZATION TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runAuthorizationTests();
