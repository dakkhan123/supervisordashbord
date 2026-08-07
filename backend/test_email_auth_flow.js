require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('./models/User');
const Worker = require('./models/Worker');
const RegistrationOTP = require('./models/RegistrationOTP');
const authController = require('./controllers/authController');

const hashOTP = (otp) => crypto.createHash('sha256').update(otp.trim()).digest('hex');

async function testFlow() {
  console.log('\n=============================================================');
  console.log('    TESTING COMPLETE EMAIL OTP REGISTRATION & RESET FLOW     ');
  console.log('=============================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartops';
    console.log(`[TEST] Connecting to MongoDB: ${mongoUri.split('@').pop()}`);
    await mongoose.connect(mongoUri);
    console.log('[TEST] Connected to MongoDB.');

    // Determine target test email address
    const testEmail = process.env.EMAIL_USER || 'test_supervisor_otp@smartops.local';
    console.log(`[TEST] Using target email: ${testEmail}`);

    await User.deleteMany({ email: testEmail });
    await Worker.deleteMany({ email: testEmail });
    await RegistrationOTP.deleteMany({ email: testEmail });
    console.log('[TEST] Cleaned up previous test data.');

    // -------------------------------------------------------------
    // Test 1: Initiate Supervisor Registration
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Register Request (Sending OTP Email) ---');
    const regReq = {
      body: {
        name: 'Test Supervisor',
        username: 'testsup_' + Date.now().toString().slice(-4),
        email: testEmail,
        password: 'Password123!',
        phone: '9876543210',
        role: 'Supervisor',
        branch: 'Pune Head Office',
        dateOfJoining: '2026-08-04'
      }
    };

    let responseData = {};
    const regRes = {
      status: (code) => ({
        json: (data) => { responseData = { status: code, ...data }; }
      })
    };

    await authController.register(regReq, regRes, (err) => { if (err) console.error(err); });
    console.log('[TEST 1 RESULT]', responseData);

    if (!responseData.success) {
      throw new Error(`Register request failed: ${responseData.error}`);
    }

    // Verify record in RegistrationOTP collection
    const pending = await RegistrationOTP.findOne({ email: testEmail });
    if (!pending) {
      throw new Error('Pending RegistrationOTP document was not saved in MongoDB!');
    }
    console.log('[TEST 1] RegistrationOTP record found in DB.');

    // -------------------------------------------------------------
    // Test 2: Invalid OTP Verification Check
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Verify Registration with WRONG OTP ---');
    const wrongVerifyReq = {
      body: {
        email: testEmail,
        otp: '000000'
      }
    };
    let wrongVerifyResData = {};
    const wrongVerifyRes = {
      status: (code) => ({
        json: (data) => { wrongVerifyResData = { status: code, ...data }; }
      })
    };

    await authController.verifyRegistrationOTP(wrongVerifyReq, wrongVerifyRes, (err) => {});
    console.log('[TEST 2 RESULT]', wrongVerifyResData);

    if (wrongVerifyResData.error !== 'Invalid OTP') {
      throw new Error(`Expected 'Invalid OTP' but got '${wrongVerifyResData.error}'`);
    }
    console.log('[TEST 2 SUCCESS] Invalid OTP correctly rejected!');

    // -------------------------------------------------------------
    // Test 3: Retrieve actual OTP & Verify Successfully
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Verify Registration with CORRECT OTP ---');
    const knownOTP = '654321';
    pending.otpHash = hashOTP(knownOTP);
    await pending.save();

    const correctVerifyReq = {
      body: {
        email: testEmail,
        otp: knownOTP
      }
    };
    let correctVerifyResData = {};
    const correctVerifyRes = {
      status: (code) => ({
        json: (data) => { correctVerifyResData = { status: code, ...data }; }
      })
    };

    await authController.verifyRegistrationOTP(correctVerifyReq, correctVerifyRes, (err) => { if (err) console.error(err); });
    console.log('[TEST 3 RESULT]', correctVerifyResData);

    if (!correctVerifyResData.success || !correctVerifyResData.token) {
      throw new Error('Failed to verify registration with correct OTP!');
    }

    const createdUser = await User.findOne({ email: testEmail });
    if (!createdUser || createdUser.isEmailVerified !== true) {
      throw new Error('User was not created with isEmailVerified: true!');
    }
    console.log('[TEST 3 SUCCESS] Account created & email verified!');

    // -------------------------------------------------------------
    // Test 4: Login with Verified User
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Login with Verified User ---');
    const loginReq = {
      body: {
        email: testEmail,
        password: 'Password123!'
      }
    };
    let loginResData = {};
    const loginRes = {
      status: (code) => ({
        json: (data) => { loginResData = { status: code, ...data }; }
      })
    };

    await authController.login(loginReq, loginRes, (err) => { if (err) console.error(err); });
    console.log('[TEST 4 RESULT]', loginResData);

    if (!loginResData.success) {
      throw new Error(`Login failed for verified user: ${loginResData.error}`);
    }
    console.log('[TEST 4 SUCCESS] Login successful!');

    // -------------------------------------------------------------
    // Test 5: Forgot Password (Sending Real Nodemailer Email)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Forgot Password Email Request ---');
    const forgotReq = {
      body: {
        email: testEmail
      }
    };
    let forgotResData = {};
    const forgotRes = {
      status: (code) => ({
        json: (data) => { forgotResData = { status: code, ...data }; }
      })
    };

    await authController.forgotPassword(forgotReq, forgotRes, (err) => { if (err) console.error(err); });
    console.log('[TEST 5 RESULT]', forgotResData);

    if (!forgotResData.success) {
      throw new Error(`Forgot password request failed: ${forgotResData.error}`);
    }

    const updatedUser = await User.findOne({ email: testEmail });
    if (!updatedUser.resetPasswordOTP) {
      throw new Error('resetPasswordOTP was not saved on User document!');
    }
    console.log('[TEST 5 SUCCESS] Reset OTP generated & real email dispatched!');

    // -------------------------------------------------------------
    // Test 6: Reset Password with OTP & Login with New Password
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Reset Password with OTP ---');
    const resetKnownOTP = '777888';
    updatedUser.resetPasswordOTP = hashOTP(resetKnownOTP);
    updatedUser.resetPasswordOTPExpire = Date.now() + 10 * 60 * 1000;
    await updatedUser.save();

    const resetReq = {
      body: {
        email: testEmail,
        otp: resetKnownOTP,
        newPassword: 'NewStrongPassword456!'
      }
    };
    let resetResData = {};
    const resetRes = {
      status: (code) => ({
        json: (data) => { resetResData = { status: code, ...data }; }
      })
    };

    await authController.resetPassword(resetReq, resetRes, (err) => { if (err) console.error(err); });
    console.log('[TEST 6 RESULT]', resetResData);

    if (!resetResData.success) {
      throw new Error(`Reset password failed: ${resetResData.error}`);
    }

    // Attempt login with old password (must fail)
    let oldPasswordLoginData = {};
    await authController.login({ body: { email: testEmail, password: 'Password123!' } }, {
      status: (code) => ({ json: (d) => { oldPasswordLoginData = d; } })
    }, () => {});
    if (oldPasswordLoginData.success) {
      throw new Error('Login with OLD password succeeded when it should have failed!');
    }

    // Attempt login with new password (must succeed)
    let newPasswordLoginData = {};
    await authController.login({ body: { email: testEmail, password: 'NewStrongPassword456!' } }, {
      status: (code) => ({ json: (d) => { newPasswordLoginData = d; } })
    }, () => {});
    if (!newPasswordLoginData.success) {
      throw new Error('Login with NEW password failed!');
    }

    console.log('[TEST 6 SUCCESS] Password reset verified & new password login successful!');

    console.log('\n=============================================================');
    console.log('    ✅ ALL 6 INTEGRATION TESTS PASSED PERFECTLY!            ');
    console.log('=============================================================\n');

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testFlow();
