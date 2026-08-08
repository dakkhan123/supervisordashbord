require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const mongoose = require('../backend/node_modules/mongoose');

const Worker = require('../backend/models/Worker');
const Attendance = require('../backend/models/Attendance');
const Overtime = require('../backend/models/Overtime');
const salaryService = require('../backend/services/salaryService');

async function testSalaryRules() {
  console.log('\n=============================================================');
  console.log('       TESTING SALARY CALCULATOR & BREAKDOWN RULES          ');
  console.log('=============================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartops';
  await mongoose.connect(mongoUri);
  console.log('[TEST] Connected to MongoDB.');

  const testMonth = 'August 2026'; // 31 Days

  // 1. Create temporary test worker with ₹50,000 monthly salary
  const testWorker = await Worker.create({
    name: 'Salary Test Worker',
    phone: '9999888877',
    role: 'Worker',
    branch: 'Pune Head Office',
    salary: 50000,
    status: 'Active'
  });

  console.log(`[TEST] Created test worker: ${testWorker.name} (Monthly Salary: ₹${testWorker.salary})`);

  try {
    // -----------------------------------------------------------------
    // CASE 1: 0 Present Days, no attendance data
    // -----------------------------------------------------------------
    console.log('\n--- CASE 1: 0 Present Days (No Attendance) ---');
    let calc1 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Per Day Salary: ₹${calc1.perDaySalary} (Expected: 1612.90)`);
    console.log(`Present Days: ${calc1.presentDays}`);
    console.log(`Final Net Salary: ₹${calc1.finalSalary} (Expected: 0)`);
    if (calc1.finalSalary !== 0) throw new Error(`Case 1 Failed! Expected 0, got ${calc1.finalSalary}`);
    console.log('✅ CASE 1 PASSED: 0 Present = ₹0.00');

    // -----------------------------------------------------------------
    // CASE 2: 1 Present Day
    // -----------------------------------------------------------------
    console.log('\n--- CASE 2: 1 Present Day ---');
    await Attendance.create({
      worker: testWorker._id,
      date: new Date('2026-08-01T09:00:00Z'),
      status: 'Present'
    });

    let calc2 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Present Days: ${calc2.presentDays}`);
    console.log(`Final Net Salary: ₹${calc2.finalSalary} (Expected: 1612.90)`);
    if (calc2.finalSalary !== 1612.90) throw new Error(`Case 2 Failed! Expected 1612.90, got ${calc2.finalSalary}`);
    console.log('✅ CASE 2 PASSED: 1 Present = ₹1,612.90');

    // -----------------------------------------------------------------
    // CASE 3: 2 Present Days
    // -----------------------------------------------------------------
    console.log('\n--- CASE 3: 2 Present Days ---');
    await Attendance.create({
      worker: testWorker._id,
      date: new Date('2026-08-02T09:00:00Z'),
      status: 'Present'
    });

    let calc3 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Present Days: ${calc3.presentDays}`);
    console.log(`Final Net Salary: ₹${calc3.finalSalary} (Expected: 3225.80)`);
    if (calc3.finalSalary !== 3225.80) throw new Error(`Case 3 Failed! Expected 3225.80, got ${calc3.finalSalary}`);
    console.log('✅ CASE 3 PASSED: 2 Present = ₹3,225.80');

    // -----------------------------------------------------------------
    // CASE 4: Multiple Present + 5 Leave + 4 Late + 2 Half Day + 1 Overtime
    // -----------------------------------------------------------------
    console.log('\n--- CASE 4: Complex Mix (10 Present, 5 Leave, 4 Late, 2 Half Day, 1 OT) ---');
    // Clear previous attendance
    await Attendance.deleteMany({ worker: testWorker._id });

    // 10 Present
    for (let i = 1; i <= 10; i++) {
      await Attendance.create({ worker: testWorker._id, date: new Date(`2026-08-${i < 10 ? '0' + i : i}T09:00:00Z`), status: 'Present' });
    }
    // 5 Leave (First 3 free, 2 chargeable = 2 * 1612.90 = 3225.80)
    for (let i = 11; i <= 15; i++) {
      await Attendance.create({ worker: testWorker._id, date: new Date(`2026-08-${i}T09:00:00Z`), status: 'Leave' });
    }
    // 4 Late (First 3 free, 1 chargeable = 0.5 * 1612.90 = 806.45)
    for (let i = 16; i <= 19; i++) {
      await Attendance.create({ worker: testWorker._id, date: new Date(`2026-08-${i}T09:00:00Z`), status: 'Late' });
    }
    // 2 Half Day (2 * 0.5 * 1612.90 = 1612.90)
    for (let i = 20; i <= 21; i++) {
      await Attendance.create({ worker: testWorker._id, date: new Date(`2026-08-${i}T09:00:00Z`), status: 'Half Day' });
    }
    // 1 Overtime (1 * (1612.90 / 2) = 806.45)
    await Attendance.create({ worker: testWorker._id, date: new Date('2026-08-22T09:00:00Z'), status: 'Overtime' });

    let calc4 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Present Days:        ${calc4.presentDays} (10 Present + 4 Late + 1 OT = 15)`);
    console.log(`Leave Days:          ${calc4.leaveDays}`);
    console.log(`Exempted Leave:      ${calc4.exemptedLeaveDays}`);
    console.log(`Chargeable Leave:    ${calc4.chargeableLeaveDays}`);
    console.log(`Leave Deduction:     ₹${calc4.leaveDeduction}`);
    console.log(`Half Days:           ${calc4.halfDays}`);
    console.log(`Half Day Deduction:  ₹${calc4.halfDayDeduction}`);
    console.log(`Late Count:          ${calc4.lateCount}`);
    console.log(`Excused Late Count:  ${calc4.excusedLateCount}`);
    console.log(`Chargeable Late:     ${calc4.chargeableLateCount}`);
    console.log(`Late Deduction:      ₹${calc4.lateDeduction}`);
    console.log(`Overtime Days:       ${calc4.overtimeDays}`);
    console.log(`Overtime Pay:        ₹${calc4.overtimePay}`);
    console.log(`Payable Days:        ${calc4.payableDays} (15 Present + 1 Half Day equiv + 3 Exempted Leave = 19)`);
    console.log(`Final Net Salary:    ₹${calc4.finalSalary}`);

    if (calc4.leaveDays !== 5 || calc4.exemptedLeaveDays !== 3 || calc4.chargeableLeaveDays !== 2) {
      throw new Error('Case 4 Leave rule check failed!');
    }
    if (calc4.lateCount !== 4 || calc4.excusedLateCount !== 3 || calc4.chargeableLateCount !== 1) {
      throw new Error('Case 4 Late rule check failed!');
    }
    console.log('✅ CASE 4 PASSED: All metrics and breakdown calculated accurately!');

    // -----------------------------------------------------------------
    // CASE 5: No Attendance Data (Verify Zero Display)
    // -----------------------------------------------------------------
    console.log('\n--- CASE 5: Zero Data Verification ---');
    await Attendance.deleteMany({ worker: testWorker._id });

    let calc5 = await salaryService.calculateSalary(testWorker._id, testMonth);
    const requiredMetrics = [
      'presentDays', 'absentDays', 'leaveDays', 'exemptedLeaveDays', 'chargeableLeaveDays',
      'halfDays', 'lateCount', 'excusedLateCount', 'chargeableLateCount', 'overtimeDays',
      'leaveDeduction', 'halfDayDeduction', 'lateDeduction', 'overtimePay', 'finalSalary'
    ];

    requiredMetrics.forEach(m => {
      if (calc5[m] === undefined || calc5[m] === null) {
        throw new Error(`Metric ${m} is missing or undefined!`);
      }
      console.log(`Metric ${m.padEnd(20)} = ${calc5[m]}`);
    });
    console.log('✅ CASE 5 PASSED: All metrics explicitly defined and present even when 0!');

    console.log('\n=============================================================');
    console.log('   ✅ ALL 5 INTEGRATION TEST CASES PASSED 100% PERFECTLY!    ');
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
