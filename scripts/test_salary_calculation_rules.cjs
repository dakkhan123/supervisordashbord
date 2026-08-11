require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const mongoose = require('../backend/node_modules/mongoose');

const Worker = require('../backend/models/Worker');
const Attendance = require('../backend/models/Attendance');
const salaryService = require('../backend/services/salaryService');

async function testSalaryRules() {
  console.log('\n=============================================================');
  console.log('       TESTING FINAL NET SALARY ATTENDANCE SCALE RULES      ');
  console.log('=============================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartops';
  await mongoose.connect(mongoUri);
  console.log('[TEST] Connected to MongoDB.');

  const testMonth = 'August 2026'; // 31 Days

  // Create temporary test worker with ₹50,000 monthly salary
  const testWorker = await Worker.create({
    name: 'Net Salary Test Worker',
    phone: '9999888866',
    role: 'Worker',
    branch: 'Pune Head Office',
    salary: 50000,
    status: 'Active'
  });

  console.log(`[TEST] Created test worker: ${testWorker.name} (Monthly Salary: ₹${testWorker.salary}, Month: ${testMonth})`);

  try {
    // -----------------------------------------------------------------
    // TEST CASE 1: 0 Present Days
    // Expected Final Net Salary: ₹0.00
    // -----------------------------------------------------------------
    console.log('\n--- CASE 1: 0 Present Days ---');
    let calc0 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Present Days: ${calc0.presentDays}`);
    console.log(`Final Net Salary: ₹${calc0.finalSalary} (Expected: 0.00)`);
    if (calc0.finalSalary !== 0) throw new Error(`Case 1 Failed! Expected 0, got ${calc0.finalSalary}`);
    console.log('✅ CASE 1 PASSED: 0 Present = ₹0.00');

    // -----------------------------------------------------------------
    // TEST CASE 2: 1 Present Day
    // Expected Final Net Salary: ₹1,612.90
    // -----------------------------------------------------------------
    console.log('\n--- CASE 2: 1 Present Day ---');
    await Attendance.create({ worker: testWorker._id, date: new Date('2026-08-01T09:00:00Z'), status: 'Present' });
    let calc1 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Present Days: ${calc1.presentDays}`);
    console.log(`Final Net Salary: ₹${calc1.finalSalary} (Expected: 1,612.90)`);
    if (calc1.finalSalary !== 1612.90) throw new Error(`Case 2 Failed! Expected 1612.90, got ${calc1.finalSalary}`);
    console.log('✅ CASE 2 PASSED: 1 Present = ₹1,612.90');

    // -----------------------------------------------------------------
    // TEST CASE 3: 2 Present Days
    // Expected Final Net Salary: ₹3,225.81
    // -----------------------------------------------------------------
    console.log('\n--- CASE 3: 2 Present Days ---');
    await Attendance.create({ worker: testWorker._id, date: new Date('2026-08-02T09:00:00Z'), status: 'Present' });
    let calc2 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Present Days: ${calc2.presentDays}`);
    console.log(`Final Net Salary: ₹${calc2.finalSalary} (Expected: 3,225.81)`);
    if (calc2.finalSalary !== 3225.81) throw new Error(`Case 3 Failed! Expected 3225.81, got ${calc2.finalSalary}`);
    console.log('✅ CASE 3 PASSED: 2 Present = ₹3,225.81');

    // -----------------------------------------------------------------
    // TEST CASE 4: 5 Present Days
    // Expected Final Net Salary: ₹8,064.52
    // -----------------------------------------------------------------
    console.log('\n--- CASE 4: 5 Present Days ---');
    await Attendance.deleteMany({ worker: testWorker._id });
    for (let i = 1; i <= 5; i++) {
      await Attendance.create({ worker: testWorker._id, date: new Date(`2026-08-0${i}T09:00:00Z`), status: 'Present' });
    }
    let calc5 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Present Days: ${calc5.presentDays}`);
    console.log(`Final Net Salary: ₹${calc5.finalSalary} (Expected: 8,064.52)`);
    if (calc5.finalSalary !== 8064.52) throw new Error(`Case 4 Failed! Expected 8064.52, got ${calc5.finalSalary}`);
    console.log('✅ CASE 4 PASSED: 5 Present = ₹8,064.52');

    // -----------------------------------------------------------------
    // TEST CASE 5: 10 Present Days
    // Expected Final Net Salary: ₹16,129.03
    // -----------------------------------------------------------------
    console.log('\n--- CASE 5: 10 Present Days ---');
    await Attendance.deleteMany({ worker: testWorker._id });
    for (let i = 1; i <= 10; i++) {
      await Attendance.create({ worker: testWorker._id, date: new Date(`2026-08-${i < 10 ? '0' + i : i}T09:00:00Z`), status: 'Present' });
    }
    let calc10 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Present Days: ${calc10.presentDays}`);
    console.log(`Final Net Salary: ₹${calc10.finalSalary} (Expected: 16,129.03)`);
    if (calc10.finalSalary !== 16129.03) throw new Error(`Case 5 Failed! Expected 16129.03, got ${calc10.finalSalary}`);
    console.log('✅ CASE 5 PASSED: 10 Present = ₹16,129.03');

    // -----------------------------------------------------------------
    // TEST CASE 6: 31 Present Days (Full Month)
    // Expected Final Net Salary: ₹50,000.00
    // -----------------------------------------------------------------
    console.log('\n--- CASE 6: 31 Present Days (Full Month) ---');
    await Attendance.deleteMany({ worker: testWorker._id });
    for (let i = 1; i <= 31; i++) {
      await Attendance.create({ worker: testWorker._id, date: new Date(`2026-08-${i < 10 ? '0' + i : i}T09:00:00Z`), status: 'Present' });
    }
    let calc31 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Present Days: ${calc31.presentDays}`);
    console.log(`Final Net Salary: ₹${calc31.finalSalary} (Expected: 50,000.00)`);
    if (calc31.finalSalary !== 50000) throw new Error(`Case 6 Failed! Expected 50000, got ${calc31.finalSalary}`);
    console.log('✅ CASE 6 PASSED: 31 Present = ₹50,000.00');

    console.log('\n=============================================================');
    console.log('   ✅ ALL 6 ATTENDANCE SCALE TEST CASES PASSED PERFECTLY!   ');
    console.log('=============================================================\n');

  } finally {
    // Cleanup test data
    await Attendance.deleteMany({ worker: testWorker._id });
    await Worker.findByIdAndDelete(testWorker._id);
    await mongoose.disconnect();
    console.log('[TEST] Cleaned up test worker and disconnected from DB.');
  }
}

testSalaryRules().catch(err => {
  console.error('❌ TEST FAILED:', err);
  mongoose.disconnect();
  process.exit(1);
});
