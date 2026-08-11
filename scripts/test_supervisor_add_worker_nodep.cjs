const path = require('path');
module.paths.push(
  path.join(__dirname, '../backend/node_modules'),
  path.join(__dirname, '../node_modules')
);

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/models/User');
const Worker = require('../backend/models/Worker');
const workerService = require('../backend/services/workerService');

async function testSupervisorAddWorkerNoDep() {
  console.log('\n============================================================');
  console.log('   TESTING SUPERVISOR ADD WORKER (NO DEPARTMENT + WORKER ROLE) ');
  console.log('============================================================\n');

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartops';
  await mongoose.connect(MONGO_URI);

  try {
    // 1. Clean up previous test users
    await User.deleteMany({ username: 'nodep_test_worker' });
    await Worker.deleteMany({ email: 'nodepworker@smartops.local' });

    // 2. Supervisor registers worker WITHOUT department field in payload
    console.log('--- Registering Worker via Supervisor (No Department in Payload) ---');
    const newWorker = await workerService.createWorker({
      name: 'No Department Staff',
      fullName: 'No Department Staff',
      username: 'nodep_test_worker',
      email: 'nodepworker@smartops.local',
      phone: '9876543333',
      mobile: '9876543333',
      branch: 'Nashik Branch',
      assignedSite: 'Nashik Branch',
      salary: 21000,
      role: 'Worker',
      status: 'Active',
      dateOfBirth: '1996-03-12',
      dateOfJoining: '2026-08-11',
      address: '404 Industrial Estate, Nashik'
      // Note: department field is intentionally omitted
    });

    console.log(`✅ Created Worker: ${newWorker.name} | ID: ${newWorker.employeeId}`);

    // 3. Verify Worker document in MongoDB
    const dbWorker = await Worker.findById(newWorker._id);
    if (!dbWorker) throw new Error('TEST FAILED: Worker document not created in MongoDB!');

    // 4. Verify User document in MongoDB
    const dbUser = await User.findOne({ username: 'nodep_test_worker' });
    if (!dbUser) throw new Error('TEST FAILED: User document not created in MongoDB!');

    // 5. Verification checks
    console.log('\n--- Field Verification Results ---');
    console.log(`- Employee ID:   Worker=${dbWorker.employeeId} | User=${dbUser.employeeId}`);
    console.log(`- Role:          Worker=${dbWorker.role} | User=${dbUser.role}`);
    console.log(`- Branch/Office: Worker=${dbWorker.assignedSite} | User=${dbUser.branch}`);
    console.log(`- Department:    Worker=${dbWorker.department} | User=${dbUser.department}`);
    console.log(`- Salary:        Worker=${dbWorker.salary}`);
    console.log(`- Phone/Mobile:  Worker=${dbWorker.phone} | User=${dbUser.phone}`);
    console.log(`- Address:       Worker=${dbWorker.address} | User=${dbUser.address}`);

    if (!dbWorker.employeeId || dbWorker.employeeId !== dbUser.employeeId) {
      throw new Error('TEST FAILED: Employee ID mismatch or missing!');
    }
    if (dbWorker.role !== 'Worker' || dbUser.role !== 'Worker') {
      throw new Error(`TEST FAILED: Role must be Worker! Found Worker=${dbWorker.role}, User=${dbUser.role}`);
    }
    if (dbWorker.assignedSite !== 'Nashik Branch' || dbUser.branch !== 'Nashik Branch') {
      throw new Error('TEST FAILED: Branch mismatch!');
    }
    if (dbWorker.salary !== 21000) {
      throw new Error('TEST FAILED: Salary mismatch!');
    }
    if (dbWorker.department !== 'Operations' || dbUser.department !== 'Operations') {
      throw new Error('TEST FAILED: Backend default department should be Operations when omitted!');
    }

    console.log('\n✔ TEST PASSED: Supervisor Add Worker succeeded without Department payload!');
    console.log('✔ TEST PASSED: System Role strictly saved as "Worker".');
    console.log('✔ TEST PASSED: Unique Employee ID assigned cleanly.');
    console.log('\n🎉 ALL NO-DEPARTMENT & WORKER-ROLE TESTS PASSED SUCCESSFULLY!\n');

  } catch (err) {
    console.error('❌ Test Execution Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testSupervisorAddWorkerNoDep();
