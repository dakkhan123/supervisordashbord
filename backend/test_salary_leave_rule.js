const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const salaryService = require('./services/salaryService');
const Worker = require('./models/Worker');
const Attendance = require('./models/Attendance');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/supervisordashboard';

async function runTests() {
  console.log('=============================================================');
  console.log('    TESTING COMPANY 3-LEAVE EXEMPTION SALARY CALCULATIONS   ');
  console.log('=============================================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('[TEST] Connected to MongoDB.');

    // 1. Setup Test Worker with ₹30,000 monthly salary
    const testWorkerName = 'Salary Test Worker';
    await Worker.deleteMany({ name: testWorkerName });

    const worker = await Worker.create({
      name: testWorkerName,
      employeeId: 'EMP-SAL-TEST',
      phone: '9999900000',
      role: 'Worker',
      branch: 'Pune Head Office',
      salary: 30000,
      status: 'Active'
    });

    console.log(`[TEST] Created test worker: ${worker.name} (Monthly Salary: ₹30,000)`);

    const monthStr = 'April 2026'; // April has 30 days -> Per Day Salary = 30000 / 30 = ₹1,000/day
    const year = 2026;
    const monthIndex = 3; // April (0-indexed 3)

    const testCases = [
      { leaveDays: 0, expectedExempted: 0, expectedDeductible: 0, expectedDeduction: 0, expectedNet: 30000 },
      { leaveDays: 1, expectedExempted: 1, expectedDeductible: 0, expectedDeduction: 0, expectedNet: 30000 },
      { leaveDays: 2, expectedExempted: 2, expectedDeductible: 0, expectedDeduction: 0, expectedNet: 30000 },
      { leaveDays: 3, expectedExempted: 3, expectedDeductible: 0, expectedDeduction: 0, expectedNet: 30000 },
      { leaveDays: 4, expectedExempted: 3, expectedDeductible: 1, expectedDeduction: 1000, expectedNet: 29000 },
      { leaveDays: 5, expectedExempted: 3, expectedDeductible: 2, expectedDeduction: 2000, expectedNet: 28000 },
      { leaveDays: 7, expectedExempted: 3, expectedDeductible: 4, expectedDeduction: 4000, expectedNet: 26000 },
    ];

    let passedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      console.log(`\n--- TEST CASE ${i + 1}: ${tc.leaveDays} LEAVE DAYS ---`);

      // Clear attendance records
      await Attendance.deleteMany({ worker: worker._id });

      // Create tc.leaveDays leave/absent records
      for (let day = 1; day <= tc.leaveDays; day++) {
        const date = new Date(year, monthIndex, day, 10, 0, 0);
        await Attendance.create({
          worker: worker._id,
          date,
          status: day % 2 === 0 ? 'Leave' : 'Absent',
          markedBy: worker._id,
          markedByRole: 'Supervisor'
        });
      }

      // Fill rest of the month with Present records
      for (let day = tc.leaveDays + 1; day <= 30; day++) {
        const date = new Date(year, monthIndex, day, 10, 0, 0);
        await Attendance.create({
          worker: worker._id,
          date,
          status: 'Present',
          markedBy: worker._id,
          markedByRole: 'Supervisor'
        });
      }

      // Calculate salary via salaryService
      const calc = await salaryService.calculateSalary(worker._id, monthStr);

      console.log(`  Monthly Base Salary: ₹${calc.monthlySalary}`);
      console.log(`  Total Days in Month: ${calc.totalDays}`);
      console.log(`  Per Day Salary:      ₹${calc.perDaySalary}`);
      console.log(`  Total Leave Days:    ${calc.totalLeaveDays}`);
      console.log(`  Exempted Leaves:     ${calc.exemptedLeaveDays} (Expected: ${tc.expectedExempted})`);
      console.log(`  Deductible Leaves:   ${calc.deductibleLeaveDays} (Expected: ${tc.expectedDeductible})`);
      console.log(`  Leave Deduction:     ₹${calc.leaveDeduction} (Expected: ₹${tc.expectedDeduction})`);
      console.log(`  Final Net Salary:    ₹${calc.finalSalary} (Expected: ₹${tc.expectedNet})`);

      if (
        calc.exemptedLeaveDays === tc.expectedExempted &&
        calc.deductibleLeaveDays === tc.expectedDeductible &&
        calc.leaveDeduction === tc.expectedDeduction &&
        calc.finalSalary === tc.expectedNet
      ) {
        console.log(`  ✅ TEST CASE ${i + 1} PASSED PERFECTLY!`);
        passedCount++;
      } else {
        console.error(`  ❌ TEST CASE ${i + 1} FAILED!`);
        process.exit(1);
      }
    }

    // Cleanup
    await Worker.deleteMany({ _id: worker._id });
    await Attendance.deleteMany({ worker: worker._id });

    console.log('\n=============================================================');
    console.log(`    ✅ ALL ${passedCount} / ${testCases.length} TEST CASES PASSED PERFECTLY!`);
    console.log('=============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test suite failed with error:', err);
    process.exit(1);
  }
}

runTests();
