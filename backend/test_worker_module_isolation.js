require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Worker = require('./models/Worker');
const workerService = require('./services/workerService');

async function runWorkerModuleIsolationTests() {
  console.log('\n============================================================');
  console.log('       TESTING WORKERS MODULE STRICT WORKER ISOLATION       ');
  console.log('============================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartops';
    console.log(`[TEST] Connecting to MongoDB: ${mongoUri.split('@').pop()}`);
    await mongoose.connect(mongoUri);
    console.log('[TEST] Connected to MongoDB.');

    // 1. Clean up existing test records
    await User.deleteMany({ username: { $in: ['iso_sup_1', 'iso_sup_2', 'iso_worker_1', 'iso_worker_2'] } });
    await Worker.deleteMany({ email: { $in: ['iso_sup_1@smartops.local', 'iso_sup_2@smartops.local', 'iso_worker_1@smartops.local', 'iso_worker_2@smartops.local'] } });

    // 2. Create Supervisors
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('Pass123!', salt);

    const sup1 = await User.create({
      username: 'iso_sup_1',
      email: 'iso_sup_1@smartops.local',
      name: 'Supervisor Iso One',
      password: passHash,
      role: 'Supervisor',
      isEmailVerified: true
    });

    const sup2 = await User.create({
      username: 'iso_sup_2',
      email: 'iso_sup_2@smartops.local',
      name: 'Supervisor Iso Two',
      password: passHash,
      role: 'Supervisor',
      isEmailVerified: true
    });

    // 3. Create Workers
    const worker1 = await workerService.createWorker({
      name: 'Worker Iso Alpha',
      email: 'iso_worker_1@smartops.local',
      username: 'iso_worker_1',
      role: 'Worker',
      salary: 16000,
      department: 'Assembly'
    });

    const worker2 = await workerService.createWorker({
      name: 'Worker Iso Beta',
      email: 'iso_worker_2@smartops.local',
      username: 'iso_worker_2',
      role: 'Worker',
      salary: 17000,
      department: 'Packaging'
    });

    console.log(`[TEST] Created Supervisors: ${sup1.name} (${sup1._id}), ${sup2.name} (${sup2._id})`);
    console.log(`[TEST] Created Workers:     ${worker1.name} (${worker1._id}), ${worker2.name} (${worker2._id})`);

    // -------------------------------------------------------------
    // Test 1: getAllWorkers returns ONLY Workers (Requirement 1 & 4)
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Workers Directory Filtering ---');
    const allWorkers = await workerService.getAllWorkers();
    console.log(`[TEST 1] getAllWorkers() returned ${allWorkers.length} items.`);

    const foundSupervisorInList = allWorkers.find(w => 
      w.role === 'Supervisor' || 
      (w.user && w.user.role === 'Supervisor') ||
      w._id.toString() === sup1._id.toString() ||
      w._id.toString() === sup2._id.toString()
    );

    if (foundSupervisorInList) {
      throw new Error(`ISOLATION FAILURE: Supervisor account "${foundSupervisorInList.name || foundSupervisorInList.email}" was returned in Workers directory!`);
    }

    const testWorkerIds = [worker1._id.toString(), worker2._id.toString()];
    const createdWorkersFound = allWorkers.filter(w => testWorkerIds.includes(w._id.toString()));

    if (createdWorkersFound.length !== 2) {
      throw new Error('Created test workers were not returned by getAllWorkers()!');
    }

    console.log('✅ TEST 1 PASSED: Workers directory lists ONLY Workers. Zero Supervisor accounts returned.');

    // -------------------------------------------------------------
    // Test 2: Backend 403 Enforcement on Supervisor IDs (Requirement 3 & 4)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Backend 403 Security on Supervisor IDs ---');

    // Attempt getWorkerById on Supervisor ID
    let getSupFailed = false;
    try {
      await workerService.getWorkerById(sup1._id);
    } catch (err) {
      console.log(`[TEST 2A] getWorkerById(supervisor_id) -> Status ${err.statusCode}: "${err.message}"`);
      if (err.statusCode === 403) getSupFailed = true;
    }
    if (!getSupFailed) throw new Error('SECURITY FAILURE: getWorkerById allowed accessing a Supervisor account!');

    // Attempt updateWorker on Supervisor ID
    let updateSupFailed = false;
    try {
      await workerService.updateWorker(sup1._id, { salary: 99999 });
    } catch (err) {
      console.log(`[TEST 2B] updateWorker(supervisor_id) -> Status ${err.statusCode}: "${err.message}"`);
      if (err.statusCode === 403) updateSupFailed = true;
    }
    if (!updateSupFailed) throw new Error('SECURITY FAILURE: updateWorker allowed modifying a Supervisor account!');

    // Attempt toggleWorkerStatus on Supervisor ID
    let toggleSupFailed = false;
    try {
      await workerService.toggleWorkerStatus(sup1._id, 'Inactive');
    } catch (err) {
      console.log(`[TEST 2C] toggleWorkerStatus(supervisor_id) -> Status ${err.statusCode}: "${err.message}"`);
      if (err.statusCode === 403) toggleSupFailed = true;
    }
    if (!toggleSupFailed) throw new Error('SECURITY FAILURE: toggleWorkerStatus allowed deactivating a Supervisor account!');

    // Attempt resetWorkerPassword on Supervisor ID
    let resetSupFailed = false;
    try {
      await workerService.resetWorkerPassword(sup1._id, 'HackedPass@123');
    } catch (err) {
      console.log(`[TEST 2D] resetWorkerPassword(supervisor_id) -> Status ${err.statusCode}: "${err.message}"`);
      if (err.statusCode === 403) resetSupFailed = true;
    }
    if (!resetSupFailed) throw new Error('SECURITY FAILURE: resetWorkerPassword allowed resetting a Supervisor password!');

    // Attempt deleteWorker on Supervisor ID
    let deleteSupFailed = false;
    try {
      await workerService.deleteWorker(sup1._id);
    } catch (err) {
      console.log(`[TEST 2E] deleteWorker(supervisor_id) -> Status ${err.statusCode}: "${err.message}"`);
      if (err.statusCode === 403) deleteSupFailed = true;
    }
    if (!deleteSupFailed) throw new Error('SECURITY FAILURE: deleteWorker allowed deleting a Supervisor account!');

    console.log('✅ TEST 2 PASSED: 403 Forbidden strictly enforced for all Supervisor modification attempts.');

    // -------------------------------------------------------------
    // Test 3: Valid Worker CRUD Operations (Requirement 3)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Valid Worker CRUD Operations ---');

    // Update Worker 1
    const updatedW1 = await workerService.updateWorker(worker1._id, { name: 'Worker Iso Alpha (Updated)', salary: 18500 });
    console.log(`[TEST 3A] Updated Worker 1 -> Name: "${updatedW1.name}", Salary: ₹${updatedW1.salary}`);

    // Reset Worker 1 password
    const resetRes = await workerService.resetWorkerPassword(worker1._id, 'ValidPass@123');
    console.log(`[TEST 3B] Reset Worker 1 Password -> ${resetRes.message}`);

    // Delete Workers
    await workerService.deleteWorker(worker1._id);
    await workerService.deleteWorker(worker2._id);
    console.log('[TEST 3C] Worker 1 and Worker 2 deleted successfully.');

    console.log('✅ TEST 3 PASSED: Worker CRUD operations work flawlessly for worker accounts.');

    console.log('\n============================================================');
    console.log('   ✅ WORKERS MODULE ISOLATION & SECURITY TESTS PASSED!     ');
    console.log('============================================================\n');

    // Clean up supervisor test accounts
    await User.deleteMany({ username: { $in: ['iso_sup_1', 'iso_sup_2', 'iso_worker_1', 'iso_worker_2'] } });
    await Worker.deleteMany({ email: { $in: ['iso_sup_1@smartops.local', 'iso_sup_2@smartops.local', 'iso_worker_1@smartops.local', 'iso_worker_2@smartops.local'] } });

  } catch (err) {
    console.error('\n❌ WORKER MODULE TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runWorkerModuleIsolationTests();
