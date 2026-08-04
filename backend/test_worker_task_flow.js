require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Worker = require('./models/Worker');
const Task = require('./models/Task');
const taskController = require('./controllers/taskController');

async function runWorkerTaskTest() {
  console.log('\n============================================================');
  console.log('       TESTING WORKER CONSOLE THREE-PAGE TASK SYNC FLOW      ');
  console.log('============================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartops';
    console.log(`[TEST] Connecting to MongoDB: ${mongoUri.split('@').pop()}`);
    await mongoose.connect(mongoUri);
    console.log('[TEST] Connected to MongoDB.');

    // 1. Find or create a test worker
    let worker = await Worker.findOne({ role: 'Worker' });
    if (!worker) {
      worker = await Worker.create({
        name: 'Automated Test Worker',
        email: 'testworker@smartops.local',
        role: 'Worker',
        department: 'Operations',
        salary: 18000,
        status: 'Active',
        dateOfJoining: new Date()
      });
    }

    let workerUser = await User.findOne({ worker: worker._id });
    if (!workerUser) {
      workerUser = await User.create({
        username: 'testworker_' + Date.now().toString().slice(-4),
        email: worker.email,
        password: 'HashedPassword123!',
        role: 'Worker',
        status: 'Active',
        isEmailVerified: true,
        worker: worker._id
      });
    }

    console.log(`[TEST] Worker Profile: ${worker.name} (ID: ${worker._id})`);

    // 2. Create a test Task assigned to worker
    const testTask = await Task.create({
      title: 'Audit Machinery Unit B' + Date.now().toString().slice(-4),
      name: 'Audit Machinery Unit B',
      description: 'Perform safety inspection and oil check for conveyor line B.',
      priority: 'High',
      status: 'Pending',
      progressPercent: 0,
      progress: 0,
      assignedTo: worker._id,
      assignedWorkerName: worker.name,
      dueDate: new Date(Date.now() + 86400000 * 3),
      checklist: [
        { name: 'Check oil level', isCompleted: false },
        { name: 'Inspect belt tension', isCompleted: false }
      ]
    });

    console.log(`[TEST] Created Task: "${testTask.title}" (ID: ${testTask._id})`);

    // -------------------------------------------------------------
    // Test Step A: Fetch My Tasks (Assigned Tasks Page)
    // -------------------------------------------------------------
    console.log('\n--- STEP A: Fetch Assigned Tasks (/worker/tasks) ---');
    const reqA = { user: { id: workerUser._id, workerId: worker._id } };
    let resDataA = {};
    const resA = {
      status: (c) => ({ json: (d) => { resDataA = { status: c, ...d }; } })
    };

    await taskController.getMyTasks(reqA, resA, (err) => { if (err) console.error(err); });
    console.log(`[STEP A] Retrieved ${resDataA.data ? resDataA.data.length : 0} tasks for worker.`);

    const foundTaskA = (resDataA.data || []).find(t => t._id.toString() === testTask._id.toString());
    if (!foundTaskA) {
      throw new Error('Created task was not returned by getMyTasks()!');
    }
    console.log(`[STEP A SUCCESS] Task verified on Assigned Tasks page. Status: "${foundTaskA.status}"`);

    // -------------------------------------------------------------
    // Test Step B: Update Progress (Task Progress Page)
    // -------------------------------------------------------------
    console.log('\n--- STEP B: Update Progress to 75% (/worker/progress) ---');
    const reqB = {
      params: { id: testTask._id.toString() },
      body: {
        progressPercent: 75,
        progress: 75,
        status: 'In Progress'
      },
      user: { id: workerUser._id, workerId: worker._id }
    };
    let resDataB = {};
    const resB = {
      status: (c) => ({ json: (d) => { resDataB = { status: c, ...d }; } })
    };

    await taskController.updateTask(reqB, resB, (err) => { if (err) console.error(err); });
    console.log(`[STEP B] Progress Update Result:`, resDataB.success ? 'SUCCESS' : resDataB.error);

    const taskInDB_B = await Task.findById(testTask._id);
    if (taskInDB_B.progressPercent !== 75 || taskInDB_B.status !== 'In Progress') {
      throw new Error(`MongoDB progress update mismatch! Progress: ${taskInDB_B.progressPercent}, Status: ${taskInDB_B.status}`);
    }
    console.log(`[STEP B SUCCESS] MongoDB updated: Progress = ${taskInDB_B.progressPercent}%, Status = "${taskInDB_B.status}"`);

    // -------------------------------------------------------------
    // Test Step C: Submit Completion Notes (Completion Notes Page)
    // -------------------------------------------------------------
    console.log('\n--- STEP C: Submit Completion Notes (/worker/completion) ---');
    const reqC = {
      params: { id: testTask._id.toString() },
      body: {
        summary: 'Completed conveyor safety audit & oil top-up',
        workPerformed: 'Checked belt tension, lubricated rollers, and verified sensor alignment.',
        issuesFaced: 'None',
        attachmentUrl: 'https://smartops.local/audit_report_b.pdf'
      },
      user: { id: workerUser._id, workerId: worker._id }
    };
    let resDataC = {};
    const resC = {
      status: (c) => ({ json: (d) => { resDataC = { status: c, ...d }; } })
    };

    await taskController.submitCompletionNotes(reqC, resC, (err) => { if (err) console.error(err); });
    console.log(`[STEP C] Completion Notes Result:`, resDataC.success ? 'SUCCESS' : resDataC.error);

    const taskInDB_C = await Task.findById(testTask._id);
    if (!taskInDB_C.completionNotes || taskInDB_C.completionNotes.summary !== reqC.body.summary) {
      throw new Error('Completion notes were not persisted in MongoDB!');
    }
    console.log(`[STEP C SUCCESS] Task completion notes saved in MongoDB. Status: "${taskInDB_C.status}"`);
    console.log(`  Notes Summary: "${taskInDB_C.completionNotes.summary}"`);
    console.log(`  Work Log:       "${taskInDB_C.completionNotes.workPerformed}"`);

    console.log('\n============================================================');
    console.log('    ✅ WORKER CONSOLE THREE-PAGE SYNC TEST PASSED!          ');
    console.log('============================================================\n');

    // Cleanup test task
    await Task.deleteOne({ _id: testTask._id });

  } catch (err) {
    console.error('\n❌ WORKER TASK TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runWorkerTaskTest();
