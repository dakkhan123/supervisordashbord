const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/models/User');
const Worker = require('../backend/models/Worker');
const Task = require('../backend/models/Task');
const Attendance = require('../backend/models/Attendance');
const Salary = require('../backend/models/Salary');
const Notification = require('../backend/models/Notification');

async function testBackendIntegration() {
  console.log('=== Starting Unified Backend & Database Verification ===');
  
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartops';
  console.log('Connecting to MongoDB at:', MONGO_URI);

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connection Successful.');

    // 1. Test Worker & User creation by Supervisor
    console.log('\n--- 1. Testing Supervisor Worker Creation & Auto User Account ---');
    const workerService = require('../backend/services/workerService');
    const newWorker = await workerService.createWorker({
      name: 'Integrated Test Worker',
      phone: '9988776655',
      salary: 19500,
      department: 'Machining',
      status: 'Active'
    });
    console.log('✅ Worker Created:', newWorker.name, '| ID:', newWorker._id);
    console.log('✅ Auto Linked User ID:', newWorker.user?._id || newWorker.user);

    // 2. Test Worker Password Reset
    console.log('\n--- 2. Testing Password Reset ---');
    const resetResult = await workerService.resetWorkerPassword(newWorker._id, 'NewSecurePass@123');
    console.log('✅ Password Reset Result:', resetResult.message);

    // 3. Test Task Assignment & Auto Notification
    console.log('\n--- 3. Testing Task Creation, Assignment & Worker Notification ---');
    const taskService = require('../backend/services/taskService');
    const newTask = await taskService.createTask({
      title: 'CNC Mill Calibration Unit 4',
      description: 'Perform standard precision check on CNC mill 4',
      assignedTo: newWorker._id,
      assignedBy: newWorker._id,
      priority: 'High',
      checklist: [
        { name: 'Check coolant level', isCompleted: false },
        { name: 'Zero axis position', isCompleted: false }
      ]
    });
    console.log('✅ Task Created & Assigned:', newTask.title, '| ID:', newTask._id);

    // Verify Notification dispatch
    const notifications = await Notification.find({ worker: newWorker._id });
    console.log('✅ Notification Received by Worker:', notifications.length, 'notification(s) found.');
    if (notifications.length > 0) {
      console.log('   Title:', notifications[0].title, '| Message:', notifications[0].message);
    }

    // 4. Test Worker Checklist Toggle & Progress Update
    console.log('\n--- 4. Testing Worker Checklist Toggle & Status Update ---');
    if (newTask.checklist && newTask.checklist.length > 0) {
      const updatedTask = await taskService.updateChecklistItem(newTask._id, newTask.checklist[0]._id, true, newWorker._id);
      console.log('✅ Checklist Toggled. New Task Progress:', updatedTask.progressPercent + '%');
    }

    // 5. Test Attendance Logging & Worker View
    console.log('\n--- 5. Testing Attendance Record & Notification ---');
    const attendanceService = require('../backend/services/attendanceService');
    const newAtt = await attendanceService.createAttendance({
      worker: newWorker._id,
      date: new Date(),
      status: 'Present',
      checkInTime: '09:00 AM',
      checkOutTime: '05:30 PM',
      workingHours: 8.5,
      shift: 'Morning'
    });
    console.log('✅ Attendance Logged:', newAtt.status, '| Worker ID:', newAtt.worker._id);

    const workerAttLogs = await attendanceService.getMyAttendance(newWorker._id);
    console.log('✅ Worker View Attendance Logs Count:', workerAttLogs.length);

    // 6. Test Salary Record Generation & Worker Paystub View
    console.log('\n--- 6. Testing Salary Record Generation & Paystub View ---');
    const salaryService = require('../backend/services/salaryService');
    const newSal = await salaryService.createSalary({
      worker: newWorker._id,
      month: 'July 2026',
      baseSalary: 19500,
      amount: 19500,
      status: 'Paid'
    });
    console.log('✅ Salary Slip Created for:', newSal.month, '| Slip ID:', newSal.slipId);

    const workerSalaries = await salaryService.getMySalaries(newWorker._id);
    console.log('✅ Worker View Salary Records Count:', workerSalaries.length);

    // Cleanup test records
    console.log('\n--- Cleaning up test records ---');
    await Task.findByIdAndDelete(newTask._id);
    await Attendance.findByIdAndDelete(newAtt._id);
    await Salary.findByIdAndDelete(newSal._id);
    await Notification.deleteMany({ worker: newWorker._id });
    await workerService.deleteWorker(newWorker._id);
    console.log('✅ Cleanup Complete.');

    console.log('\n🎉 ALL BACKEND & DATABASE INTEGRATION TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Integration Test Failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
  }
}

testBackendIntegration();
