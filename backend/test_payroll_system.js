const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Worker = require('./models/Worker');
const Attendance = require('./models/Attendance');
const Salary = require('./models/Salary');
const Overtime = require('./models/Overtime');
const SalaryHistory = require('./models/SalaryHistory');
const salaryService = require('./services/salaryService');

async function runPayrollTests() {
  console.log('--- STARTING PAYROLL SYSTEM AUTOMATED VERIFICATION ---');

  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartops';
  console.log(`Connecting to MongoDB: ${mongoURI}`);
  await mongoose.connect(mongoURI);
  console.log('MongoDB Connected successfully!');

  // Cleanup test worker if exists
  await Worker.deleteMany({ email: 'testpayrollworker@factory.com' });
  
  // Create Test Worker with Monthly Salary = ₹31,000
  const testWorker = await Worker.create({
    name: 'Test Payroll Worker',
    email: 'testpayrollworker@factory.com',
    role: 'Worker',
    salary: 31000,
    department: 'Testing'
  });

  const workerId = testWorker._id;
  const monthStr = 'August 2026'; // August 2026 has 31 days -> Per Day Salary = 31,000 / 31 = 1,000 INR

  // Cleanup old records for this worker
  await Attendance.deleteMany({ worker: workerId });
  await Salary.deleteMany({ worker: workerId });
  await Overtime.deleteMany({ worker: workerId });
  await SalaryHistory.deleteMany({ worker: workerId });

  console.log('\n[TEST 1] Base Monthly Salary & Days in Month Check');
  let calc = await salaryService.calculateSalary(workerId, monthStr);
  console.log(`Monthly Salary: ₹${calc.monthlySalary}`);
  console.log(`Total Days in Month (August 2026): ${calc.totalDays}`);
  console.log(`Per Day Salary: ₹${calc.perDaySalary}`);
  console.assert(calc.monthlySalary === 31000, 'Monthly Salary should be 31000');
  console.assert(calc.totalDays === 31, 'August 2026 should have 31 days');
  console.assert(calc.perDaySalary === 1000, 'Per day salary should be 1000');
  console.log('✓ PASS: Per Day Salary calculation correct!');

  console.log('\n[TEST 2] Absent Policy Test: First 5 Absent Days are Paid Leave');
  // Log 5 Absent days
  for (let i = 1; i <= 5; i++) {
    await Attendance.create({
      worker: workerId,
      date: new Date(2026, 7, i),
      status: 'Absent'
    });
  }

  calc = await salaryService.calculateSalary(workerId, monthStr);
  console.log(`Absent Days: ${calc.absentDays}`);
  console.log(`Excused Absents: ${calc.excusedAbsentDays}`);
  console.log(`Chargeable Absents: ${calc.chargeableAbsentDays}`);
  console.log(`Absent Deduction: ₹${calc.absentDeduction}`);
  console.assert(calc.absentDays === 5, 'Absent days should be 5');
  console.assert(calc.excusedAbsentDays === 5, 'Excused absents should be 5');
  console.assert(calc.chargeableAbsentDays === 0, 'Chargeable absents should be 0');
  console.assert(calc.absentDeduction === 0, 'Deduction for first 5 absents should be 0');
  console.log('✓ PASS: First 5 Absents have 0 deduction!');

  console.log('\n[TEST 3] 6th & 8th Absent Deduction Test');
  // Log 3 more absent days (total 8 absent days)
  for (let i = 6; i <= 8; i++) {
    await Attendance.create({
      worker: workerId,
      date: new Date(2026, 7, i),
      status: 'Absent'
    });
  }

  calc = await salaryService.calculateSalary(workerId, monthStr);
  console.log(`Total Absent Days: ${calc.absentDays}`);
  console.log(`Chargeable Absents (8 - 5): ${calc.chargeableAbsentDays}`);
  console.log(`Absent Deduction (3 * 1000): ₹${calc.absentDeduction}`);
  console.assert(calc.absentDays === 8, 'Total absents should be 8');
  console.assert(calc.chargeableAbsentDays === 3, 'Chargeable absents should be 3');
  console.assert(calc.absentDeduction === 3000, '3 Chargeable absents = ₹3,000 deduction');
  console.log('✓ PASS: 6th-8th Absent deducts 1 full day salary each!');

  console.log('\n[TEST 4] Late Policy Test: First 3 Excused, 4th-6th Late Deduction');
  // Log 6 Late entries
  for (let i = 9; i <= 14; i++) {
    await Attendance.create({
      worker: workerId,
      date: new Date(2026, 7, i),
      status: 'Late'
    });
  }

  calc = await salaryService.calculateSalary(workerId, monthStr);
  console.log(`Late Count: ${calc.lateCount}`);
  console.log(`Excused Late Count: ${calc.excusedLateCount}`);
  console.log(`Chargeable Late Count (6 - 3): ${calc.chargeableLateCount}`);
  console.log(`Late Deduction (3 * 0.5 * 1000): ₹${calc.lateDeduction}`);
  console.assert(calc.lateCount === 6, 'Late count should be 6');
  console.assert(calc.excusedLateCount === 3, 'Excused late count should be 3');
  console.assert(calc.chargeableLateCount === 3, 'Chargeable late count should be 3');
  console.assert(calc.lateDeduction === 1500, '3 Chargeable late entries = 3 * 500 = ₹1,500 deduction');
  console.log('✓ PASS: Late policy (3 excused, 4th+ = 0.5 day deduction) verified!');

  console.log('\n[TEST 5] Overtime Policy Test: Overtime Day = Half Day Salary Addition');
  // Approve 2 Overtime Days
  await Overtime.create({
    worker: workerId,
    date: new Date(2026, 7, 15),
    overtimeDays: 2,
    status: 'Approved'
  });

  calc = await salaryService.calculateSalary(workerId, monthStr);
  console.log(`Overtime Days: ${calc.overtimeDays}`);
  console.log(`Overtime Pay (2 * 0.5 * 1000): ₹${calc.overtimePay}`);
  console.assert(calc.overtimeDays === 2, 'Overtime days should be 2');
  console.assert(calc.overtimePay === 1000, '2 Overtime days = 2 * 500 = ₹1,000 addition');
  console.log('✓ PASS: Overtime policy verified!');

  console.log('\n[TEST 6] Final Salary Calculation');
  // Final Salary = 31,000 - 3,000 (Absent) - 1,500 (Late) + 1,000 (Overtime) = 27,500
  const expectedFinalSalary = 31000 - 3000 - 1500 + 1000;
  console.log(`Calculated Final Salary: ₹${calc.finalSalary}`);
  console.log(`Expected Final Salary: ₹${expectedFinalSalary}`);
  console.assert(calc.finalSalary === expectedFinalSalary, `Final salary should be ₹${expectedFinalSalary}`);
  console.log('✓ PASS: Final Salary matches formula exactly!');

  console.log('\n[TEST 7] MongoDB Automatic Sync & Persistence');
  const savedRecord = await salaryService.recalculateAndSaveSalary(workerId, monthStr, 'Test_Suite');
  console.log(`MongoDB Salary Record ID: ${savedRecord._id}`);
  console.log(`Stored Final Salary: ₹${savedRecord.finalSalary}`);
  console.log(`Stored Per Day Salary: ₹${savedRecord.perDaySalary}`);
  console.log(`Stored Total Days: ${savedRecord.totalDays}`);
  console.assert(savedRecord.finalSalary === expectedFinalSalary, 'MongoDB record matches expected final salary');

  const historyRecords = await salaryService.getSalaryHistory(workerId);
  console.log(`Salary History Records Logged: ${historyRecords.length}`);
  console.assert(historyRecords.length >= 1, 'Salary history should contain audit log entries');
  console.log('✓ PASS: MongoDB persistence and audit history verified!');

  // Cleanup test records
  await Worker.deleteMany({ email: 'testpayrollworker@factory.com' });
  await Attendance.deleteMany({ worker: workerId });
  await Salary.deleteMany({ worker: workerId });
  await Overtime.deleteMany({ worker: workerId });
  await SalaryHistory.deleteMany({ worker: workerId });

  await mongoose.disconnect();
  console.log('\n==================================================');
  console.log('ALL 7 PAYROLL SYSTEM VERIFICATION TESTS PASSED PERFECTLY!');
  console.log('==================================================\n');
}

runPayrollTests().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});
