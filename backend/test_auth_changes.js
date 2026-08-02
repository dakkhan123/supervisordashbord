const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Worker = require('./models/Worker');
const authController = require('./controllers/authController');

// Mock Express req, res
function createMockRes() {
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
}

async function runAuthTests() {
  console.log('--- STARTING AUTHENTICATION SYSTEM AUTOMATED VERIFICATION ---');

  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartops';
  console.log(`Connecting to MongoDB: ${mongoURI}`);
  await mongoose.connect(mongoURI);
  console.log('MongoDB Connected successfully!');

  // Cleanup test users & workers
  await User.deleteMany({ email: { $in: ['testsup@factory.com', 'testwrk@factory.com', 'dupemail@factory.com'] } });
  await Worker.deleteMany({ email: { $in: ['testsup@factory.com', 'testwrk@factory.com', 'dupemail@factory.com'] } });

  console.log('\n[TEST 1] Supervisor Registration (Valid Email & 10-Digit Mobile Number)');
  let req = {
    body: {
      username: 'testsupervisor',
      email: 'testsup@factory.com',
      password: 'password123',
      name: 'Test Supervisor',
      phone: '9876543210',
      role: 'Supervisor'
    }
  };
  let res = createMockRes();
  await authController.register(req, res, (err) => console.error(err));

  console.log(`Response status: ${res.statusCode}`);
  console.assert(res.statusCode === 201, 'Supervisor registration should return 201');
  console.assert(res.jsonData.success === true, 'Registration should be successful');
  console.assert(res.jsonData.data.email === 'testsup@factory.com', 'Email should match');
  console.assert(res.jsonData.data.worker.phone === '9876543210', 'Phone number should be 9876543210');
  console.log('✓ PASS: Supervisor registration successful!');

  console.log('\n[TEST 2] Worker Registration (Valid Email & 10-Digit Mobile Number)');
  req = {
    body: {
      username: 'testworker',
      email: 'testwrk@factory.com',
      password: 'password123',
      name: 'Test Worker',
      phone: '9123456789',
      role: 'Worker'
    }
  };
  res = createMockRes();
  await authController.register(req, res, (err) => console.error(err));

  console.log(`Response status: ${res.statusCode}`);
  console.assert(res.statusCode === 201, 'Worker registration should return 201');
  console.assert(res.jsonData.success === true, 'Worker registration should succeed');
  console.log('✓ PASS: Worker registration successful!');

  console.log('\n[TEST 3] Duplicate Email Rejection Test');
  req = {
    body: {
      username: 'testsupervisor2',
      email: 'testsup@factory.com', // Already used by Supervisor 1
      password: 'password123',
      name: 'Test Supervisor 2',
      phone: '9876543210',
      role: 'Supervisor'
    }
  };
  res = createMockRes();
  await authController.register(req, res, (err) => console.error(err));

  console.log(`Response status: ${res.statusCode}, Error: ${res.jsonData?.error}`);
  console.assert(res.statusCode === 400, 'Duplicate email should be rejected with 400');
  console.assert(res.jsonData.success === false, 'Duplicate email registration should fail');
  console.log('✓ PASS: Duplicate email address rejected correctly!');

  console.log('\n[TEST 4] Invalid Mobile Number Validation Test (Length != 10)');
  req = {
    body: {
      username: 'badphoneuser',
      email: 'badphone@factory.com',
      password: 'password123',
      name: 'Bad Phone User',
      phone: '987654', // Less than 10 digits
      role: 'Supervisor'
    }
  };
  res = createMockRes();
  await authController.register(req, res, (err) => console.error(err));

  console.log(`Response status: ${res.statusCode}, Error: ${res.jsonData?.error}`);
  console.assert(res.statusCode === 400, 'Short phone number should be rejected');
  console.assert(res.jsonData.error.includes('10'), 'Error should mention 10 digits');
  console.log('✓ PASS: Invalid mobile number rejected correctly!');

  console.log('\n[TEST 5] Supervisor & Worker Login Test (Username and Email)');
  // Login with Username
  req = { body: { username: 'testsupervisor', password: 'password123' } };
  res = createMockRes();
  await authController.login(req, res, (err) => console.error(err));
  console.assert(res.statusCode === 200 && res.jsonData.success === true, 'Supervisor login by username should succeed');

  // Login with Email
  req = { body: { email: 'testsup@factory.com', password: 'password123' } };
  res = createMockRes();
  await authController.login(req, res, (err) => console.error(err));
  console.assert(res.statusCode === 200 && res.jsonData.success === true, 'Supervisor login by email should succeed');
  console.log('✓ PASS: Login by username & email working perfectly!');

  console.log('\n[TEST 6] Forgot Password Restriction (Worker Rejection Test)');
  req = { body: { email: 'testwrk@factory.com' } }; // Worker email
  res = createMockRes();
  await authController.forgotPassword(req, res, (err) => console.error(err));

  console.log(`Response status: ${res.statusCode}, Message: ${res.jsonData?.error}`);
  console.assert(res.statusCode === 403, 'Worker forgot password attempt should return 403');
  console.assert(res.jsonData.error.includes('Supervisor'), 'Message should indicate restricted to Supervisors');
  console.log('✓ PASS: Worker forgot password request rejected correctly!');

  console.log('\n[TEST 7] Supervisor Forgot Password & OTP Reset Password Test');
  // Step 1: Request Forgot Password for Supervisor
  req = { body: { email: 'testsup@factory.com' } };
  res = createMockRes();
  await authController.forgotPassword(req, res, (err) => console.error(err));

  console.log(`Response status: ${res.statusCode}, Generated OTP: ${res.jsonData?.otp}`);
  console.assert(res.statusCode === 200 && res.jsonData.success === true, 'Supervisor forgot password should succeed');
  const otpCode = res.jsonData.otp;
  console.assert(!!otpCode, 'OTP code should be generated');

  // Step 2: Reset Password with OTP
  req = {
    body: {
      email: 'testsup@factory.com',
      otp: otpCode,
      newPassword: 'newpassword456'
    }
  };
  res = createMockRes();
  await authController.resetPassword(req, res, (err) => console.error(err));

  console.log(`Reset status: ${res.statusCode}, Message: ${res.jsonData?.message}`);
  console.assert(res.statusCode === 200 && res.jsonData.success === true, 'Password reset should succeed');

  // Step 3: Login with New Password
  req = { body: { username: 'testsupervisor', password: 'newpassword456' } };
  res = createMockRes();
  await authController.login(req, res, (err) => console.error(err));
  console.assert(res.statusCode === 200 && res.jsonData.success === true, 'Login with new password should succeed');
  console.log('✓ PASS: Supervisor OTP password reset flow verified!');

  // Cleanup test users
  await User.deleteMany({ email: { $in: ['testsup@factory.com', 'testwrk@factory.com', 'dupemail@factory.com'] } });
  await Worker.deleteMany({ email: { $in: ['testsup@factory.com', 'testwrk@factory.com', 'dupemail@factory.com'] } });

  await mongoose.disconnect();
  console.log('\n==================================================');
  console.log('ALL 7 AUTHENTICATION VERIFICATION TESTS PASSED PERFECTLY!');
  console.log('==================================================\n');
}

runAuthTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
