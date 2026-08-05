require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Worker = require('./models/Worker');
const LeaveRequest = require('./models/LeaveRequest');
const Attendance = require('./models/Attendance');
const Notification = require('./models/Notification');
const leaveController = require('./controllers/leaveController');

async function runLeaveSystemTests() {
  console.log('\n============================================================');
  console.log('       TESTING LEAVE & HALF-DAY MANAGEMENT SYSTEM          ');
  console.log('============================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartops';
    console.log(`[TEST] Connecting to MongoDB: ${mongoUri.split('@').pop()}`);
    await mongoose.connect(mongoUri);
    console.log('[TEST] Connected to MongoDB.');

    // 1. Clean up test users & leave requests
    await User.deleteMany({ username: { $in: ['test_leave_worker', 'test_leave_supervisor'] } });
    await Worker.deleteMany({ email: { $in: ['leave_worker@smartops.local', 'leave_supervisor@smartops.local'] } });

    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('Pass123!', salt);

    // Create Test Worker
    const testWorkerDoc = await Worker.create({
      name: 'Leave Test Worker',
      email: 'leave_worker@smartops.local',
      role: 'Worker',
      salary: 16500,
      department: 'Assembly'
    });

    const testWorkerUser = await User.create({
      username: 'test_leave_worker',
      email: 'leave_worker@smartops.local',
      name: 'Leave Test Worker',
      password: passHash,
      role: 'Worker',
      worker: testWorkerDoc._id,
      isEmailVerified: true
    });
    testWorkerDoc.user = testWorkerUser._id;
    await testWorkerDoc.save();

    // Create Test Supervisor
    const testSupUser = await User.create({
      username: 'test_leave_supervisor',
      email: 'leave_supervisor@smartops.local',
      name: 'Leave Test Supervisor',
      password: passHash,
      role: 'Supervisor',
      isEmailVerified: true
    });

    console.log(`[TEST] Created Worker:     ${testWorkerDoc.name} (User ID: ${testWorkerUser._id})`);
    console.log(`[TEST] Created Supervisor: ${testSupUser.name} (User ID: ${testSupUser._id})`);

    // Clean up existing leave requests & notifications for test worker
    await LeaveRequest.deleteMany({ workerId: testWorkerDoc._id });
    await Notification.deleteMany({ user: { $in: [testWorkerUser._id, testSupUser._id] } });

    // -------------------------------------------------------------
    // STEP 1: Worker Submits Full Day Leave Request
    // -------------------------------------------------------------
    console.log('\n--- STEP 1: Worker Submits Full Day Leave Request ---');
    const fromDate1 = new Date();
    const toDate1 = new Date(Date.now() + 86400000 * 2);

    let createRes1 = {};
    const req1 = {
      body: {
        leaveType: 'Full Day Leave',
        reason: 'Family function in hometown',
        fromDate: fromDate1.toISOString().split('T')[0],
        toDate: toDate1.toISOString().split('T')[0]
      },
      user: { id: testWorkerUser._id, worker: testWorkerDoc._id }
    };
    const res1 = {
      status: (code) => ({ json: (data) => { createRes1 = { statusCode: code, ...data }; } })
    };

    await leaveController.createLeaveRequest(req1, res1, (err) => { if (err) throw err; });
    console.log(`[STEP 1] Submit Full Day Leave Result: Status ${createRes1.statusCode}, Message: "${createRes1.message}"`);

    if (createRes1.statusCode !== 201 || !createRes1.data) {
      throw new Error(`Full Day Leave creation failed: ${createRes1.error}`);
    }

    const leaveReq1Id = createRes1.data._id;

    // Check Supervisor notification created
    const supNotif1 = await Notification.findOne({ user: testSupUser._id, type: 'leave_request' });
    if (!supNotif1) {
      throw new Error('Supervisor did not receive leave_request notification!');
    }
    console.log(`[STEP 1 SUCCESS] Supervisor Notification Verified: "${supNotif1.title}"`);

    // -------------------------------------------------------------
    // STEP 2: Supervisor Approves Full Day Leave & Attendance Integration
    // -------------------------------------------------------------
    console.log('\n--- STEP 2: Supervisor Approves Full Day Leave & Syncs Attendance ---');
    let approveRes1 = {};
    const reqApprove1 = {
      params: { id: leaveReq1Id.toString() },
      body: { comment: 'Approved. Enjoy your leave!' },
      user: { id: testSupUser._id, role: 'Supervisor' }
    };
    const resApprove1 = {
      status: (code) => ({ json: (data) => { approveRes1 = { statusCode: code, ...data }; } })
    };

    await leaveController.approveLeaveRequest(reqApprove1, resApprove1, (err) => { if (err) throw err; });
    console.log(`[STEP 2] Approve Result: Status ${approveRes1.statusCode}, Message: "${approveRes1.message}"`);

    if (approveRes1.statusCode !== 200 || approveRes1.data.status !== 'Approved') {
      throw new Error('Leave approval failed!');
    }

    // Verify Attendance Records updated to status: 'Leave'
    const dayStart = new Date(fromDate1);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(fromDate1);
    dayEnd.setHours(23, 59, 59, 999);

    const attRecord1 = await Attendance.findOne({
      worker: testWorkerDoc._id,
      date: { $gte: dayStart, $lte: dayEnd }
    });

    if (!attRecord1 || attRecord1.status !== 'Leave') {
      throw new Error(`ATTENDANCE SYNC FAILURE: Expected status 'Leave', got '${attRecord1 ? attRecord1.status : 'None'}'`);
    }
    console.log(`[STEP 2 SUCCESS] Attendance Record Auto-Updated -> Date: ${attRecord1.date.toLocaleDateString()}, Status: "${attRecord1.status}", Remarks: "${attRecord1.remarks}"`);

    // Verify Worker notification created
    const workerNotif1 = await Notification.findOne({ user: testWorkerUser._id, type: 'leave_approved' });
    if (!workerNotif1) {
      throw new Error('Worker did not receive leave_approved notification!');
    }
    console.log(`[STEP 2 SUCCESS] Worker Approval Notification Verified: "${workerNotif1.title}"`);

    // -------------------------------------------------------------
    // STEP 3: Worker Submits Half Day Leave Request
    // -------------------------------------------------------------
    console.log('\n--- STEP 3: Worker Submits Half Day Leave Request ---');
    const halfDayDate = new Date(Date.now() + 86400000 * 5);
    let createRes2 = {};
    const req2 = {
      body: {
        leaveType: 'Half Day Leave',
        reason: 'Doctor appointment in afternoon',
        fromDate: halfDayDate.toISOString().split('T')[0],
        toDate: halfDayDate.toISOString().split('T')[0],
        halfDaySession: 'Second Half'
      },
      user: { id: testWorkerUser._id, worker: testWorkerDoc._id }
    };
    const res2 = {
      status: (code) => ({ json: (data) => { createRes2 = { statusCode: code, ...data }; } })
    };

    await leaveController.createLeaveRequest(req2, res2, (err) => { if (err) throw err; });
    console.log(`[STEP 3] Submit Half Day Leave Result: Status ${createRes2.statusCode}`);

    if (createRes2.statusCode !== 201) {
      throw new Error(`Half Day Leave creation failed: ${createRes2.error}`);
    }

    const leaveReq2Id = createRes2.data._id;

    // -------------------------------------------------------------
    // STEP 4 & 5: Supervisor Rejection Validation & Mandatory Comment
    // -------------------------------------------------------------
    console.log('\n--- STEP 4 & 5: Supervisor Rejects Request (Mandatory Comment Validation) ---');

    // Attempt rejection without comment (must fail with 400)
    let rejectResFail = {};
    await leaveController.rejectLeaveRequest(
      { params: { id: leaveReq2Id.toString() }, body: { comment: '' }, user: { id: testSupUser._id } },
      { status: (code) => ({ json: (data) => { rejectResFail = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 4] Rejection Without Comment -> Status ${rejectResFail.statusCode}, Error: "${rejectResFail.error}"`);
    if (rejectResFail.statusCode !== 400) {
      throw new Error('Mandatory comment validation failed on rejection!');
    }

    // Reject with valid comment
    let rejectResSuccess = {};
    await leaveController.rejectLeaveRequest(
      { params: { id: leaveReq2Id.toString() }, body: { comment: 'Urgent production batch scheduled; leave rejected.' }, user: { id: testSupUser._id } },
      { status: (code) => ({ json: (data) => { rejectResSuccess = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 5] Rejection With Comment -> Status ${rejectResSuccess.statusCode}, Status: "${rejectResSuccess.data.status}"`);
    if (rejectResSuccess.statusCode !== 200 || rejectResSuccess.data.status !== 'Rejected') {
      throw new Error('Leave rejection failed!');
    }

    // Verify Worker rejection notification
    const workerNotif2 = await Notification.findOne({ user: testWorkerUser._id, type: 'leave_rejected' });
    if (!workerNotif2) {
      throw new Error('Worker did not receive leave_rejected notification!');
    }
    console.log(`[STEP 5 SUCCESS] Worker Rejection Notification Verified: "${workerNotif2.title}"`);

    // -------------------------------------------------------------
    // STEP 6: Worker Cancels Pending Leave Request
    // -------------------------------------------------------------
    console.log('\n--- STEP 6: Worker Cancels Pending Leave Request ---');

    // Submit a 3rd test request
    let createRes3 = {};
    await leaveController.createLeaveRequest(
      {
        body: {
          leaveType: 'Full Day Leave',
          reason: 'Personal errand',
          fromDate: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
          toDate: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0]
        },
        user: { id: testWorkerUser._id, worker: testWorkerDoc._id }
      },
      { status: (code) => ({ json: (data) => { createRes3 = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    const leaveReq3Id = createRes3.data._id;

    // Worker cancels pending request
    let cancelRes = {};
    await leaveController.cancelLeaveRequest(
      { params: { id: leaveReq3Id.toString() }, user: { id: testWorkerUser._id, worker: testWorkerDoc._id } },
      { status: (code) => ({ json: (data) => { cancelRes = { statusCode: code, ...data }; } }) },
      (err) => { if (err) throw err; }
    );

    console.log(`[STEP 6] Cancel Request Result -> Status ${cancelRes.statusCode}, Message: "${cancelRes.message}"`);
    if (cancelRes.statusCode !== 200) {
      throw new Error('Cancelling pending leave request failed!');
    }

    console.log('\n============================================================');
    console.log('   ✅ LEAVE & HALF-DAY MANAGEMENT SYSTEM TEST PASSED!      ');
    console.log('============================================================\n');

    // Clean up test records
    await LeaveRequest.deleteMany({ workerId: testWorkerDoc._id });
    await Attendance.deleteMany({ worker: testWorkerDoc._id });
    await Notification.deleteMany({ user: { $in: [testWorkerUser._id, testSupUser._id] } });
    await User.deleteMany({ username: { $in: ['test_leave_worker', 'test_leave_supervisor'] } });
    await Worker.deleteMany({ email: { $in: ['leave_worker@smartops.local', 'leave_supervisor@smartops.local'] } });

  } catch (err) {
    console.error('\n❌ LEAVE SYSTEM TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runLeaveSystemTests();
