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

function formatTaskDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

async function testTaskDateFlow() {
  console.log('\n============================================================');
  console.log('   TESTING TASK ASSIGNMENT & WORKER ASSIGNED TASKS DATE FLOW ');
  console.log('============================================================\n');

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartops';
  await mongoose.connect(MONGO_URI);

  try {
    // 1. Get or create test worker
    let worker = await Worker.findOne();
    if (!worker) {
      worker = await Worker.create({
        name: 'Task Test Worker',
        employeeId: 'EMP-9999',
        department: 'Operations',
        assignedSite: 'Pune Head Office',
        salary: 20000,
        status: 'Active'
      });
    }

    // 2. Clean up previous test tasks
    await Task.deleteMany({ title: 'Inventory Quality Check' });

    // 3. Supervisor assigns task with due date 2026-08-25
    console.log('--- Step 1: Supervisor Assigns Task ---');
    const targetDueDate = new Date('2026-08-25T00:00:00.000Z');
    
    const createdTask = await taskService.createTask({
      title: 'Inventory Quality Check',
      description: 'Perform batch quality audit on Rack B-10 inventory items',
      priority: 'High',
      status: 'Pending',
      dueDate: targetDueDate,
      assignedTo: worker._id,
      assignedBy: worker._id
    });

    console.log(`✅ Task Created: "${createdTask.title}" | ID: ${createdTask._id}`);

    // 4. Worker queries assigned tasks via taskService.getMyTasks
    console.log('\n--- Step 2: Worker Fetching Assigned Tasks API ---');
    const workerTasks = await taskService.getMyTasks(worker._id, {});

    const testTask = workerTasks.find(t => t._id.toString() === createdTask._id.toString());
    if (!testTask) throw new Error('TEST FAILED: Task not returned in worker assigned tasks API call!');

    // 5. Verify date fields in API response
    console.log('\n--- Date Verification Results ---');
    console.log(`- Title:          ${testTask.title}`);
    console.log(`- Priority:       ${testTask.priority}`);
    console.log(`- Status:         ${testTask.status}`);
    console.log(`- Progress:       ${testTask.progressPercent}%`);
    console.log(`- Raw assignedDate: ${testTask.assignedDate}`);
    console.log(`- Raw dueDate:      ${testTask.dueDate}`);
    console.log(`- Formatted Assigned Date: "${formatTaskDate(testTask.assignedDate)}"`);
    console.log(`- Formatted Due Date:      "${formatTaskDate(testTask.dueDate)}"`);

    if (!testTask.assignedDate) {
      throw new Error('TEST FAILED: assignedDate is missing or null in task payload!');
    }
    if (!testTask.dueDate) {
      throw new Error('TEST FAILED: dueDate is missing or null in task payload!');
    }
    if (formatTaskDate(testTask.dueDate) !== '25/08/2026') {
      throw new Error(`TEST FAILED: Due date format mismatch! Expected 25/08/2026, got ${formatTaskDate(testTask.dueDate)}`);
    }

    console.log('\n✔ TEST PASSED: Assigned task date and due date are saved cleanly in MongoDB.');
    console.log('✔ TEST PASSED: Backend API response returns non-null assignedDate & dueDate.');
    console.log('✔ TEST PASSED: Dates format accurately as DD/MM/YYYY.');
    console.log('\n🎉 ALL TASK DATE FLOW TESTS PASSED SUCCESSFULLY!\n');

  } catch (err) {
    console.error('❌ Test Execution Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testTaskDateFlow();
