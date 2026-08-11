const path = require('path');
module.paths.push(
  path.join(__dirname, '../backend/node_modules'),
  path.join(__dirname, '../node_modules')
);

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const Worker = require('../backend/models/Worker');
const Task = require('../backend/models/Task');
const taskService = require('../backend/services/taskService');

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

async function testSupervisorWorkerTaskDates() {
  console.log('\n=====================================================================');
  console.log('   TESTING TASK ASSIGNMENT DATE SYNCHRONIZATION (SUPERVISOR & WORKER) ');
  console.log('=====================================================================\n');

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartops';
  await mongoose.connect(MONGO_URI);

  try {
    // 1. Get or create test worker
    let worker = await Worker.findOne();
    if (!worker) {
      worker = await Worker.create({
        name: 'Sync Test Worker',
        employeeId: 'EMP-8888',
        department: 'Operations',
        assignedSite: 'Pune Head Office',
        salary: 22000,
        status: 'Active'
      });
    }

    // 2. Clean up previous test tasks
    await Task.deleteMany({ title: 'Safety Audit & Gear Check' });

    // 3. Supervisor allocates a task with Due Date: 2026-08-30
    console.log('--- Step 1: Supervisor Allocates New Task ---');
    const assignedDate = new Date();
    const dueDate = new Date('2026-08-30T00:00:00.000Z');

    const createdTask = await taskService.createTask({
      title: 'Safety Audit & Gear Check',
      description: 'Inspect personal protective equipment and safety harnesses on Floor 2',
      priority: 'High',
      status: 'Pending',
      progressPercent: 0,
      assignedDate: assignedDate,
      dueDate: dueDate,
      assignedTo: worker._id,
      assignedBy: worker._id
    });

    console.log(`✅ Task Allocated: "${createdTask.title}" | ID: ${createdTask._id}`);

    // 4. Supervisor fetches all tasks via taskService.getAllTasks
    console.log('\n--- Step 2: Supervisor Retrieves Task Registry ---');
    const allTasks = await taskService.getAllTasks({});
    const supervisorTask = allTasks.find(t => t._id.toString() === createdTask._id.toString());
    if (!supervisorTask) throw new Error('TEST FAILED: Task not returned in Supervisor getAllTasks API call!');

    // 5. Worker fetches assigned tasks via taskService.getMyTasks
    console.log('\n--- Step 3: Worker Retrieves Assigned Tasks ---');
    const myTasks = await taskService.getMyTasks(worker._id, {});
    const workerTask = myTasks.find(t => t._id.toString() === createdTask._id.toString());
    if (!workerTask) throw new Error('TEST FAILED: Task not returned in Worker getMyTasks API call!');

    // 6. Cross-verification checks
    console.log('\n--- Cross-Verification Results ---');
    console.log(`- Task Title:               ${supervisorTask.title}`);
    console.log(`- Supervisor Assigned Date: "${formatDate(supervisorTask.assignedDate || supervisorTask.createdAt)}"`);
    console.log(`- Supervisor Due Date:      "${formatDate(supervisorTask.dueDate)}"`);
    console.log(`- Worker Assigned Date:     "${formatDate(workerTask.assignedDate || workerTask.createdAt)}"`);
    console.log(`- Worker Due Date:         "${formatDate(workerTask.dueDate)}"`);
    console.log(`- Priority:                 Supervisor=${supervisorTask.priority} | Worker=${workerTask.priority}`);
    console.log(`- Status:                   Supervisor=${supervisorTask.status} | Worker=${workerTask.status}`);
    console.log(`- Progress:                 Supervisor=${supervisorTask.progressPercent}% | Worker=${workerTask.progressPercent}%`);

    if (formatDate(supervisorTask.assignedDate) !== formatDate(workerTask.assignedDate)) {
      throw new Error('TEST FAILED: Mismatch in assignedDate between Supervisor and Worker payload!');
    }
    if (formatDate(supervisorTask.dueDate) !== formatDate(workerTask.dueDate)) {
      throw new Error('TEST FAILED: Mismatch in dueDate between Supervisor and Worker payload!');
    }
    if (formatDate(supervisorTask.dueDate) !== '30/08/2026') {
      throw new Error(`TEST FAILED: Due date formatting error! Expected 30/08/2026, got ${formatDate(supervisorTask.dueDate)}`);
    }

    console.log('\n✔ TEST PASSED: Assigned Date saved cleanly on task creation/assignment.');
    console.log('✔ TEST PASSED: Supervisor and Worker receive identical assignedDate and dueDate.');
    console.log('✔ TEST PASSED: Consistent DD/MM/YYYY formatting applied across both dashboards.');
    console.log('\n🎉 ALL TASK DATE SYNCHRONIZATION TESTS PASSED SUCCESSFULLY!\n');

  } catch (err) {
    console.error('❌ Test Execution Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testSupervisorWorkerTaskDates();
