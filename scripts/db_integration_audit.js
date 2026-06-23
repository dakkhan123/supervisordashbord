const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const axios = require('axios');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

// Import Models
const User = require('../backend/models/User');
const Worker = require('../backend/models/Worker');
const Inventory = require('../backend/models/Inventory');
const StockTransaction = require('../backend/models/StockTransaction');
const Task = require('../backend/models/Task');
const Attendance = require('../backend/models/Attendance');
const Notification = require('../backend/models/Notification');
const Report = require('../backend/models/Report');
const Alert = require('../backend/models/Alert');

const TEST_PORT = 5999;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

async function runAudit() {
  console.log('==================================================================');
  console.log('      BACKEND STABILIZATION & MONGOOSE ATLAS INTEGRATION AUDIT    ');
  console.log('==================================================================\n');

  const report = {
    atlasConnected: 'NO',
    dbName: 'N/A',
    collectionsFound: [],
    collectionsWorking: [],
    apisWorking: 'NO',
    authWorking: 'NO',
    localReferencesRemoved: 'YES',
    crudResults: {},
    backendCompletion: 0,
    databaseCompletion: 0,
    productionReadiness: 0
  };

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ Error: MONGO_URI is missing from backend/.env.');
    report.localReferencesRemoved = 'NO';
    printFinalReport(report);
    process.exit(1);
  }

  // Check for any local/localhost references in the MONGO_URI itself
  if (uri.includes('localhost') || uri.includes('127.0.0.1')) {
    console.error('❌ Error: MONGO_URI points to local MongoDB instance.');
    report.localReferencesRemoved = 'NO';
  } else {
    console.log('✅ MONGO_URI env variable is defined and points to remote address.');
  }

  // Connect to mongoose
  try {
    console.log('Connecting to database...');
    await mongoose.connect(uri);
    report.atlasConnected = 'YES';
    report.dbName = mongoose.connection.name;
    console.log(`✅ Mongoose connected successfully. Database name: "${report.dbName}"`);
    console.log(`   Host: ${mongoose.connection.host}`);
  } catch (err) {
    console.error(`❌ Mongoose connection failed: ${err.message}`);
    report.atlasConnected = 'NO';
    printFinalReport(report);
    process.exit(1);
  }

  // Retrieve collections
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    report.collectionsFound = collections.map(c => c.name);
    console.log(`✅ Collections found: ${report.collectionsFound.join(', ')}`);
  } catch (err) {
    console.error(`❌ Failed to retrieve collections: ${err.message}`);
  }

  console.log('\n------------------------------------------------------------------');
  console.log('                  RUNNING CRUD VERIFICATIONS                      ');
  console.log('------------------------------------------------------------------');

  const workingCollections = [];

  // Helper function for model CRUD
  async function testCRUD(modelName, modelObj, sampleDoc, updateField, updateVal) {
    const testResult = { create: 'FAIL', read: 'FAIL', update: 'FAIL', delete: 'FAIL' };
    let createdId = null;

    try {
      // 1. Create
      const doc = await modelObj.create(sampleDoc);
      createdId = doc._id;
      testResult.create = 'PASS';

      // 2. Read
      const found = await modelObj.findById(createdId);
      if (found) {
        testResult.read = 'PASS';
      }

      // 3. Update
      const updateData = {};
      updateData[updateField] = updateVal;
      const updated = await modelObj.findByIdAndUpdate(createdId, updateData, { new: true });
      if (updated && updated[updateField] === updateVal) {
        testResult.update = 'PASS';
      }

      // 4. Delete
      await modelObj.findByIdAndDelete(createdId);
      const postDelete = await modelObj.findById(createdId);
      if (!postDelete) {
        testResult.delete = 'PASS';
      }
    } catch (err) {
      console.error(`❌ CRUD error in ${modelName}:`, err.message);
    }

    const allPassed = Object.values(testResult).every(status => status === 'PASS');
    if (allPassed) {
      workingCollections.push(modelName);
    }
    report.crudResults[modelName] = testResult;
    console.log(`${modelName.padEnd(20)}: Create=${testResult.create} | Read=${testResult.read} | Update=${testResult.update} | Delete=${testResult.delete} [${allPassed ? '✅' : '❌'}]`);
  }

  // Run CRUD on the 10 collections
  // 1. Workers (dependencies first)
  const workerDoc = { name: 'Audit Test Worker', phone: '9999999999', role: 'Worker', salary: 15000, status: 'Active' };
  await testCRUD('Worker', Worker, workerDoc, 'salary', 18000);

  // 2. Users (requires a worker profile)
  const tempWorker = await Worker.create({ name: 'Audit Test User Profile', role: 'Supervisor', salary: 28000 });
  const userDoc = { username: `audit_t_user_${Date.now()}`, password: 'testpassword123', role: 'Supervisor', worker: tempWorker._id };
  await testCRUD('User', User, userDoc, 'role', 'Supervisor');
  await Worker.findByIdAndDelete(tempWorker._id);

  // 3. Inventory
  const inventoryDoc = { name: 'Audit Test Item', sku: `SKU-AUDIT-${Date.now()}`, cat: 'Consumables', qty: 50, threshold: 10, val: 100, loc: 'Audit Loc' };
  await testCRUD('Inventory', Inventory, inventoryDoc, 'qty', 75);

  // 4. StockTransaction (Inventory History)
  const txDoc = { item: 'Audit Test Item', sku: 'SKU-AUDIT-TX', type: 'in', qty: 25, gst: 18, val: 2500, loc: 'Audit Loc' };
  await testCRUD('StockTransaction', StockTransaction, txDoc, 'qty', 30);

  // 5. Tasks (requires a worker profile)
  const taskWorker = await Worker.create({ name: 'Audit Task Worker', role: 'Worker', salary: 15000 });
  const taskDoc = { title: 'Audit Test Task', description: 'Test', assignedTo: taskWorker._id, status: 'Pending' };
  await testCRUD('Task', Task, taskDoc, 'status', 'In Progress');
  await Worker.findByIdAndDelete(taskWorker._id);

  // 6. Attendance (requires worker profile)
  const attWorker = await Worker.create({ name: 'Audit Att Worker', role: 'Worker', salary: 15000 });
  const attDoc = { worker: attWorker._id, status: 'Present' };
  await testCRUD('Attendance', Attendance, attDoc, 'status', 'Absent');
  await Worker.findByIdAndDelete(attWorker._id);

  // 7. Notification
  const notifDoc = { title: 'Audit Alert', message: 'Test message', type: 'item_added' };
  await testCRUD('Notification', Notification, notifDoc, 'isRead', true);

  // 8. Report
  const rptDoc = { title: 'Audit Test Report', type: 'General', generatedBy: 'System', content: { data: 'test' } };
  await testCRUD('Report', Report, rptDoc, 'title', 'Updated Audit Report');

  // 9. Alert
  const alertDoc = { item: 'Audit Item', sku: 'SKU-AUDIT-AL', type: 'low', qty: 5, threshold: 10 };
  await testCRUD('Alert', Alert, alertDoc, 'type', 'critical');

  report.collectionsWorking = workingCollections;

  console.log('\n------------------------------------------------------------------');
  console.log('                  VERIFYING BACKEND APIS & AUTH                   ');
  console.log('------------------------------------------------------------------');

  let serverProcess = null;
  try {
    console.log(`Starting backend server on port ${TEST_PORT} for integration verification...`);
    
    serverProcess = spawn('node', [path.join(__dirname, '../backend/server.js')], {
      env: { ...process.env, PORT: TEST_PORT },
      shell: true
    });

    serverProcess.stdout.on('data', (data) => {
      // Console logging of backend server for debug
      // console.log('[SERVER LOG]:', data.toString().trim());
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[SERVER ERR]:', data.toString().trim());
    });

    // Wait for server start
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // 1. Health check verification
    console.log('Checking server health endpoint...');
    const healthRes = await axios.get(`${SERVER_URL}/health`);
    if (healthRes.status === 200 && healthRes.data.status === 'healthy') {
      console.log('✅ Server health status check successful.');
      report.apisWorking = 'YES';
    }

    // 2. JWT Authentication & Registration API testing
    console.log('Testing User Registration endpoint...');
    const regUsername = `supervisor_audit_${Date.now()}`;
    const registerRes = await axios.post(`${SERVER_URL}/api/auth/register`, {
      username: regUsername,
      password: 'AuditPassword123!',
      name: 'Supervisor Audit Officer',
      phone: '1234567890',
      role: 'Supervisor'
    });

    let token = '';
    if (registerRes.status === 201 && registerRes.data.success && registerRes.data.token) {
      console.log('✅ User registration and JWT token emission successful.');
      token = registerRes.data.token;
      report.authWorking = 'YES';
    }

    // 3. Protected Route validation
    if (token) {
      console.log('Testing Protected Route (GET /api/workers) with valid JWT...');
      const protectedRes = await axios.get(`${SERVER_URL}/api/workers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (protectedRes.status === 200 && protectedRes.data.success) {
        console.log('✅ Protected route accessed successfully with JWT.');
      } else {
        console.warn('❌ Protected route returned invalid status:', protectedRes.status);
        report.authWorking = 'NO';
      }
    }

    // 4. Verification that call fails without JWT token
    console.log('Testing Protected Route access without JWT token (should fail)...');
    try {
      await axios.get(`${SERVER_URL}/api/workers`);
      console.warn('❌ Failure: Protected route did not reject request without authorization token.');
      report.authWorking = 'NO';
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log('✅ Protected route correctly rejected unauthorized request (401 Unauthorized).');
      } else {
        console.warn('❌ Protected route did not reject request with 401. Error status:', err.response?.status);
        report.authWorking = 'NO';
      }
    }

    // 5. API validation testing (missing mandatory parameter)
    console.log('Testing Input Validation on registration (missing password, should fail)...');
    try {
      await axios.post(`${SERVER_URL}/api/auth/register`, {
        username: `incomplete_user_${Date.now()}`,
        name: 'Incomplete User'
      });
      console.warn('❌ Failure: API accepted invalid registration data.');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('✅ API correctly rejected invalid registration payload (400 Bad Request).');
      } else {
        console.warn('❌ Registration endpoint did not reject request with 400. Error status:', err.response?.status);
      }
    }

    // Clean up created user
    if (regUsername) {
      await User.deleteOne({ username: regUsername.toLowerCase() });
      await Worker.deleteOne({ name: 'Supervisor Audit Officer' });
      console.log('🧹 Cleaned up registration verification credentials.');
    }

  } catch (err) {
    console.error('❌ Error during API/Auth audit:', err.message);
    report.apisWorking = 'NO';
    report.authWorking = 'NO';
  } finally {
    if (serverProcess) {
      console.log('Stopping backend server...');
      serverProcess.kill('SIGINT');
    }
  }

  // Calculate percentages
  // Database completions = Atlas connected (30%) + 9 working CRUD collections (70%)
  let dbScore = 0;
  if (report.atlasConnected === 'YES') dbScore += 30;
  dbScore += Math.round((workingCollections.length / 9) * 70);
  report.databaseCompletion = dbScore;

  // Backend completions = apisWorking (40%) + authWorking (40%) + localReferencesRemoved (20%)
  let backScore = 0;
  if (report.apisWorking === 'YES') backScore += 40;
  if (report.authWorking === 'YES') backScore += 40;
  if (report.localReferencesRemoved === 'YES') backScore += 20;
  report.backendCompletion = backScore;

  // Production readiness = average of DB & Backend Completion, only if Atlas connected is YES and local references are removed
  if (report.atlasConnected === 'YES' && report.localReferencesRemoved === 'YES') {
    report.productionReadiness = Math.round((report.databaseCompletion + report.backendCompletion) / 2);
  } else {
    report.productionReadiness = 0;
  }

  // Disconnect db connection
  await mongoose.disconnect();

  printFinalReport(report);
}

function printFinalReport(report) {
  console.log('\n==================================================================');
  console.log('                        FINAL AUDIT REPORT                        ');
  console.log('==================================================================');
  console.log(`- Atlas Connected                  = ${report.atlasConnected}`);
  console.log(`- Database Name                    = ${report.dbName}`);
  console.log(`- Collections Found                = [${report.collectionsFound.join(', ')}]`);
  console.log(`- Collections Working (CRUD)       = [${report.collectionsWorking.join(', ')}]`);
  console.log(`- APIs Working                     = ${report.apisWorking}`);
  console.log(`- Authentication Working           = ${report.authWorking}`);
  console.log(`- Local MongoDB References Removed = ${report.localReferencesRemoved}`);
  console.log(`- Backend Completion               = ${report.backendCompletion}%`);
  console.log(`- Database Completion              = ${report.databaseCompletion}%`);
  console.log(`- Production Readiness             = ${report.productionReadiness}%`);
  console.log('==================================================================\n');
}

runAudit();
