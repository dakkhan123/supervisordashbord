require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const mongoose = require('../backend/node_modules/mongoose');

const Worker = require('../backend/models/Worker');
const Attendance = require('../backend/models/Attendance');
const salaryService = require('../backend/services/salaryService');

async function testSalaryCalculatorCases() {
  console.log('\n=============================================================');
  console.log('   TESTING SALARY CALCULATOR & BREAKDOWN TEST CASES          ');
  console.log('=============================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartops';
  console.log(`[TEST] Connecting to MongoDB: ${mongoUri.split('@').pop()}`);
  await mongoose.connect(mongoUri);
  console.log('[TEST] Connected to MongoDB.\n');

  // Create a temporary dummy test worker with ₹50,000 monthly salary
  let testWorker = await Worker.findOne({ employeeId: 'TEST-SALARY-CALC' });
  if (!testWorker) {
    testWorker = await Worker.create({
      name: 'Test Calculator Worker',
      employeeId: 'TEST-SALARY-CALC',
      role: 'Worker',
      salary: 50000,
      branch: 'Pune Head Office',
      status: 'Active'
    });
  } else {
    testWorker.salary = 50000;
    await testWorker.save();
  }

  const testMonth = 'August 2026'; // 31 days month
  const targetYear = 2026;
  const targetMonthIndex = 7; // August (0-indexed)

  try {
    // -----------------------------------------------------------------
    // CASE 1: 0 Present Days / No Attendance -> Final salary ₹0.00
    // -----------------------------------------------------------------
    console.log('--- CASE 1: 0 Present Days (No Attendance) ---');
    await Attendance.deleteMany({ worker: testWorker._id });

    const calc1 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Monthly Salary: ₹${calc1.monthlySalary}`);
    console.log(`Total Days: ${calc1.totalDays}`);
    console.log(`Per Day Salary: ₹${calc1.perDaySalary}`);
    console.log(`Present Days: ${calc1.presentDays}`);
    console.log(`Final Net Salary: ₹${calc1.finalSalary}`);

    if (calc1.perDaySalary !== 1612.90) {
      throw new Error(`Expected Per Day Salary 1612.90, got ${calc1.perDaySalary}`);
    }
    if (calc1.finalSalary !== 0) {
      throw new Error(`Expected Final Salary 0.00 for 0 present days, got ${calc1.finalSalary}`);
    }
    console.log('✅ CASE 1 PASSED: 0 Present -> Final salary ₹0.00\n');

    // -----------------------------------------------------------------
    // CASE 2: 1 Present Day -> Final salary = 1 × Per Day Salary (₹1,612.90)
    // -----------------------------------------------------------------
    console.log('--- CASE 2: 1 Present Day ---');
    await Attendance.deleteMany({ worker: testWorker._id });
    await Attendance.create({
      worker: testWorker._id,
      date: new Date(targetYear, targetMonthIndex, 1),
      status: 'Present'
    });

    const calc2 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Present Days: ${calc2.presentDays}`);
    console.log(`Final Net Salary: ₹${calc2.finalSalary}`);

    if (calc2.finalSalary !== 1612.90) {
      throw new Error(`Expected Final Salary 1612.90 for 1 present day, got ${calc2.finalSalary}`);
    }
    console.log('✅ CASE 2 PASSED: 1 Present -> Final salary ₹1,612.90\n');

    // -----------------------------------------------------------------
    // CASE 3: 2 Present Days -> Final salary = 2 × Per Day Salary (₹3,225.80)
    // -----------------------------------------------------------------
    console.log('--- CASE 3: 2 Present Days ---');
    await Attendance.create({
      worker: testWorker._id,
      date: new Date(targetYear, targetMonthIndex, 2),
      status: 'Present'
    });

    const calc3 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Present Days: ${calc3.presentDays}`);
    console.log(`Final Net Salary: ₹${calc3.finalSalary}`);

    if (calc3.finalSalary !== 3225.80) {
      throw new Error(`Expected Final Salary 3225.80 for 2 present days, got ${calc3.finalSalary}`);
    }
    console.log('✅ CASE 3 PASSED: 2 Present -> Final salary ₹3,225.80\n');

    // -----------------------------------------------------------------
    // CASE 4: Leave Rule (5 Leaves: 3 Exempted, 2 Chargeable)
    // -----------------------------------------------------------------
    console.log('--- CASE 4: Leave Rule (5 Leaves -> 3 Exempted, 2 Chargeable) ---');
    await Attendance.deleteMany({ worker: testWorker._id });
    // Add 10 Present days
    for (let day = 1; day <= 10; day++) {
      await Attendance.create({
        worker: testWorker._id,
        date: new Date(targetYear, targetMonthIndex, day),
        status: 'Present'
      });
    }
    // Add 5 Leave days
    for (let day = 11; day <= 15; day++) {
      await Attendance.create({
        worker: testWorker._id,
        date: new Date(targetYear, targetMonthIndex, day),
        status: 'Leave'
      });
    }

    const calc4 = await salaryService.calculateSalary(testWorker._id, testMonth);
    console.log(`Present Days: ${calc4.presentDays}`);
    console.log(`Leave Days: ${calc4.leaveDays}`);
    console.log(`Exempted Leaves: ${calc4.exemptedLeaveDays}`);
    console.log(`Chargeable Leaves: ${calc4.chargeableLeaveDays}`);
    console.log(`Leave Deduction: ₹${calc4.leaveDeduction}`);
    console.log(`Final Net Salary: ₹${calc4.finalSalary}`);

    if (calc4.exemptedLeaveDays !== 3 || calc4.chargeableLeaveDays !== 2) {
      throw new Error(`Expected 3 exempted and 2 chargeable leaves, got ${calc4.exemptedLeaveDays} and ${calc4.chargeableLeaveDays}`);
    }
    // 10 Present + 3 Exempted Leave = 13 payable days -> 13 * 1612.90 = 20967.70
    if (calc4.finalSalary !== 20967.70) {
      throw new Error(`Expected Final Salary 20967.70 for 10 Present + 3 Exempted Leaves, got ${calc4.finalSalary}`);
    }
    console.log('✅ CASE 4 PASSED: 5 Leaves correctly split into 3 Exempted & 2 Chargeable\n');

    // -----------------------------------------------------------------
    // CASE 5: All Zero Values Returned & Displayed
    // -----------------------------------------------------------------
    console.log('--- CASE 5: All Metrics Returned Even When Zero ---');
    await Attendance.deleteMany({ worker: testWorker._id });
    const calc5 = await salaryService.calculateSalary(testWorker._id, testMonth);

    const requiredFields = [
      'monthlySalary', 'totalDays', 'perDaySalary',
      'presentDays', 'absentDays', 'leaveDays', 'exemptedLeaveDays', 'chargeableLeaveDays',
      'halfDays', 'lateCount', 'excusedLateCount', 'chargeableLateCount',
      'overtimeDays', 'overtimePay', 'leaveDeduction', 'halfDayDeduction', 'lateDeduction', 'otherDeduction', 'finalSalary'
    ];

    for (const field of requiredFields) {
      if (calc5[field] === undefined || calc5[field] === null) {
        throw new Error(`Field '${field}' missing from calculateSalary result!`);
      }
      console.log(`  • ${field}: ${calc5[field]}`);
    }
    console.log('✅ CASE 5 PASSED: All 19 salary & attendance metrics returned explicitly!\n');

    console.log('=============================================================');
    console.log('   ✅ ALL 5 SALARY CALCULATOR TEST CASES PASSED 100%!       ');
    console.log('=============================================================\n');

  } finally {
    // Cleanup test data
    await Attendance.deleteMany({ worker: testWorker._id });
    await Worker.deleteOne({ _id: testWorker._id });
    await mongoose.disconnect();
  }
}

testSalaryCalculatorCases().catch(err => {
  console.error('❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
