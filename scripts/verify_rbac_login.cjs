const path = require('path');
module.paths.push(
  path.join(__dirname, '../backend/node_modules'),
  path.join(__dirname, '../node_modules')
);

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/models/User');
const Worker = require('../backend/models/Worker');
const workerService = require('../backend/services/workerService');
const authController = require('../backend/controllers/authController');

async function testRBACLogin() {
  console.log('=== Starting E2E RBAC & Login Flow Verification ===');
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartops';
  await mongoose.connect(MONGO_URI);

  try {
    // 1. Create a Supervisor Account
    const superUsername = `super_${Date.now()}`;
    const superPassword = 'SuperPassword@123';
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(superPassword, salt);

    const supervisorUser = await User.create({
      username: superUsername,
      password: hash,
      role: 'Supervisor',
      status: 'Active'
    });
    console.log('✅ Created Supervisor Account:', superUsername, '| Role in DB:', supervisorUser.role);

    // 2. Create a Worker Account via Worker Service
    const workerName = `Worker_${Date.now()}`;
    const workerUsername = `worker_${Date.now()}`;
    const workerPassword = 'WorkerPassword@123';

    const workerRecord = await workerService.createWorker({
      name: workerName,
      username: workerUsername,
      password: workerPassword,
      role: 'Worker',
      salary: 17500,
      status: 'Active'
    });
    console.log('✅ Created Worker Account:', workerName, '| Username:', workerUsername);

    // Verify Worker User document in database
    const workerUserDoc = await User.findOne({ username: workerUsername });
    console.log('✅ Verified Worker User Doc in DB | Username:', workerUserDoc.username, '| Role:', workerUserDoc.role);

    if (workerUserDoc.role !== 'Worker') {
      throw new Error(`CRITICAL MISMATH: Worker user document role is '${workerUserDoc.role}' instead of 'Worker'`);
    }

    // 3. Test Mock Login API Response for Supervisor
    const mockResSuper = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.responseData = data; return this; }
    };
    await authController.login({ body: { username: superUsername, password: superPassword } }, mockResSuper, (err) => { throw err; });

    console.log('✅ Supervisor Login Result Status:', mockResSuper.statusCode);
    console.log('   Role returned:', mockResSuper.responseData.data.role);

    const decodedSuperToken = jwt.verify(mockResSuper.responseData.token, process.env.JWT_SECRET || 'fallback_secret');
    console.log('   JWT Encoded Role:', decodedSuperToken.role);

    if (decodedSuperToken.role.toLowerCase() !== 'supervisor') {
      throw new Error(`Supervisor token role mismatch: ${decodedSuperToken.role}`);
    }

    // 4. Test Mock Login API Response for Worker
    const mockResWorker = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.responseData = data; return this; }
    };
    await authController.login({ body: { username: workerUsername, password: workerPassword } }, mockResWorker, (err) => { throw err; });

    console.log('✅ Worker Login Result Status:', mockResWorker.statusCode);
    console.log('   Role returned:', mockResWorker.responseData.data.role);

    const decodedWorkerToken = jwt.verify(mockResWorker.responseData.token, process.env.JWT_SECRET || 'fallback_secret');
    console.log('   JWT Encoded Role:', decodedWorkerToken.role);

    if (decodedWorkerToken.role.toLowerCase() !== 'worker') {
      throw new Error(`Worker token role mismatch: ${decodedWorkerToken.role}`);
    }

    // Cleanup test records
    await User.findByIdAndDelete(supervisorUser._id);
    await workerService.deleteWorker(workerRecord._id);
    console.log('✅ Test Accounts Cleanup Complete.');

    console.log('\n🎉 ALL RBAC AUTHENTICATION & ROLE-BASED LOGIN TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ RBAC Test Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testRBACLogin();
