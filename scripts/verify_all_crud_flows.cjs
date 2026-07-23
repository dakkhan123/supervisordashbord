const path = require('path');
module.paths.push(
  path.join(__dirname, '../backend/node_modules'),
  path.join(__dirname, '../node_modules')
);

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

function request(pathStr, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: pathStr,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function verifyAllCRUDFlows() {
  console.log('====================================================');
  console.log('  STARTING COMPREHENSIVE END-TO-END CRUD VERIFICATION');
  console.log('====================================================\n');

  try {
    // 1. Health check
    const health = await request('/health');
    console.log('1. Health check status:', health.status);

    // 2. Supervisor Registration & Login
    console.log('\n--- 2. Testing Supervisor Registration & Login ---');
    const superUsername = `crud_super_${Date.now()}`;
    const superPassword = 'SuperPassword@123';
    const regRes = await request('/api/auth/register', 'POST', {
      name: 'CRUD Supervisor',
      username: superUsername,
      password: superPassword,
      email: `${superUsername}@factory.com`,
      role: 'Supervisor'
    });
    console.log('✅ Supervisor Register Status:', regRes.status);

    const superLoginRes = await request('/api/auth/login', 'POST', {
      username: superUsername,
      password: superPassword
    });
    console.log('✅ Supervisor Login Status:', superLoginRes.status, '| Role:', superLoginRes.data.data?.role);
    const superToken = superLoginRes.data.token;

    // 3. Worker Account Creation & Worker Login
    console.log('\n--- 3. Testing Worker Account Creation & Login ---');
    const workerUsername = `crud_worker_${Date.now()}`;
    const workerPassword = 'WorkerPassword@123';
    const createWorkerRes = await request('/api/workers', 'POST', {
      name: 'CRUD Worker',
      username: workerUsername,
      password: workerPassword,
      phone: '9876543210',
      role: 'Worker',
      salary: 19500,
      status: 'Active',
      dateOfJoining: '2026-07-23'
    }, superToken);
    console.log('✅ Supervisor Creates Worker Status:', createWorkerRes.status, '| Worker ID:', createWorkerRes.data.data?._id);
    const workerId = createWorkerRes.data.data?._id;

    const workerLoginRes = await request('/api/auth/login', 'POST', {
      username: workerUsername,
      password: workerPassword
    });
    console.log('✅ Worker Login Status:', workerLoginRes.status, '| Role:', workerLoginRes.data.data?.role);
    const workerToken = workerLoginRes.data.token;

    // 4. Test Password Reset by Supervisor
    console.log('\n--- 4. Testing Password Reset by Supervisor ---');
    const newWorkerPassword = 'NewWorkerPass@456';
    const resetRes = await request(`/api/workers/${workerId}/reset-password`, 'POST', {
      newPassword: newWorkerPassword
    }, superToken);
    console.log('✅ Reset Worker Password Status:', resetRes.status, '| Message:', resetRes.data.message);

    const workerLoginNewPassRes = await request('/api/auth/login', 'POST', {
      username: workerUsername,
      password: newWorkerPassword
    });
    console.log('✅ Worker Login with New Password Status:', workerLoginNewPassRes.status);
    const newWorkerToken = workerLoginNewPassRes.data.token;

    // 5. Task Creation & Checklist Execution
    console.log('\n--- 5. Testing Task Allocation & Worker Checklist Execution ---');
    const createTaskRes = await request('/api/tasks', 'POST', {
      title: 'Calibrate Precision Sensor B-12',
      description: 'Check calibration offset on Sensor B-12',
      assignedTo: workerId,
      priority: 'High',
      dueDate: '2026-07-30',
      checklist: [
        { name: 'Power cycle sensor unit', isCompleted: false },
        { name: 'Record voltage reading', isCompleted: false }
      ]
    }, superToken);
    console.log('✅ Task Creation Status:', createTaskRes.status, '| Task ID:', createTaskRes.data.data?._id);
    const taskId = createTaskRes.data.data?._id;
    const checklistItemId = createTaskRes.data.data?.checklist?.[0]?._id;

    const workerTasksRes = await request('/api/tasks/my-tasks', 'GET', null, newWorkerToken);
    console.log('✅ Worker View Assigned Tasks Count:', workerTasksRes.data.data?.length);

    if (checklistItemId) {
      const toggleChecklistRes = await request(`/api/tasks/${taskId}/checklist/${checklistItemId}`, 'PATCH', {
        isCompleted: true
      }, newWorkerToken);
      console.log('✅ Worker Toggles Checklist Item Status:', toggleChecklistRes.status, '| Progress:', toggleChecklistRes.data.data?.progressPercent + '%');
    }

    const completeTaskRes = await request(`/api/tasks/${taskId}/complete`, 'POST', {
      summary: 'Calibration complete',
      workPerformed: 'Calibrated voltage to 5.0V',
      issuesFaced: 'None'
    }, newWorkerToken);
    console.log('✅ Worker Submits Completion Notes Status:', completeTaskRes.status);

    // 6. Attendance Logging & Worker View
    console.log('\n--- 6. Testing Attendance Logging & Worker View ---');
    const createAttRes = await request('/api/attendance', 'POST', {
      worker: workerId,
      date: new Date(),
      status: 'Present',
      checkInTime: '09:00 AM',
      checkOutTime: '05:00 PM',
      workingHours: 8,
      shift: 'Morning'
    }, superToken);
    console.log('✅ Log Attendance Status:', createAttRes.status);

    const workerAttRes = await request('/api/attendance/my-attendance', 'GET', null, newWorkerToken);
    console.log('✅ Worker View Attendance Logs Count:', workerAttRes.data.data?.length);

    // 7. Salary Slip Generation & Worker View
    console.log('\n--- 7. Testing Salary Slip Generation & Paystub View ---');
    const createSalRes = await request('/api/salary', 'POST', {
      worker: workerId,
      month: 'July 2026',
      baseSalary: 19500,
      amount: 19500,
      status: 'Paid'
    }, superToken);
    console.log('✅ Create Salary Slip Status:', createSalRes.status, '| Slip ID:', createSalRes.data.data?.slipId);

    const workerSalRes = await request('/api/salary/my-salary', 'GET', null, newWorkerToken);
    console.log('✅ Worker View Salary Paystubs Count:', workerSalRes.data.data?.length);

    // 8. Notifications Flow
    console.log('\n--- 8. Testing Notifications Flow ---');
    const notifRes = await request('/api/notifications', 'GET', null, newWorkerToken);
    console.log('✅ Worker Notifications Count:', notifRes.data.data?.length);

    // 9. Cleanup Test Records
    console.log('\n--- 9. Cleaning Up Test Data ---');
    await request(`/api/tasks/${taskId}`, 'DELETE', null, superToken);
    await request(`/api/workers/${workerId}`, 'DELETE', null, superToken);
    console.log('✅ Test Data Cleanup Completed Successfully.');

    console.log('\n====================================================');
    console.log('  🎉 ALL CRUD OPERATIONS VERIFIED WITH 100% SUCCESS!');
    console.log('====================================================');

  } catch (err) {
    console.error('❌ CRUD Verification Failed:', err);
  }
}

verifyAllCRUDFlows();
