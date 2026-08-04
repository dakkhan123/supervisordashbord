const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const emailService = require('./utils/emailService');

async function runEmailAudit() {
  console.log('\n============================================================');
  console.log('       EMAIL SYSTEM ROOT-CAUSE & VERIFICATION DIAGNOSTIC     ');
  console.log('============================================================\n');

  // 1. Check .env variables
  console.log('--- STEP 1: Inspecting backend/.env file ---');
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailFrom = process.env.EMAIL_FROM;

  console.log(`  EMAIL_USER: ${emailUser ? emailUser : '❌ MISSING'}`);
  console.log(`  EMAIL_PASS: ${emailPass ? '✅ PRESENT (App Password)' : '❌ MISSING'}`);
  console.log(`  EMAIL_FROM: ${emailFrom ? emailFrom : '⚠️ NOT SET (Defaults to EMAIL_USER)'}`);

  if (!emailUser || !emailPass) {
    console.error('\n❌ DIAGNOSTIC RESULT: EMAIL_USER or EMAIL_PASS is missing in backend/.env!');
    console.error('   Root Cause: Nodemailer cannot connect to Gmail SMTP without valid EMAIL_USER & EMAIL_PASS.');
    console.error('   Please add valid credentials to backend/.env file.\n');
    process.exit(1);
  }

  // 2. Run transporter.verify()
  console.log('\n--- STEP 2: Running Nodemailer transporter.verify() ---');
  const verifyStatus = await emailService.verifyTransporter();

  if (!verifyStatus.success) {
    console.error('\n❌ DIAGNOSTIC RESULT: Nodemailer SMTP Verification Failed!');
    console.error('   Error Message:', verifyStatus.error.message);
    console.error('   Error Code:', verifyStatus.error.code);
    console.error('   Error Stack:\n', verifyStatus.error.stack);
    process.exit(1);
  }

  // 3. Test sending real verification OTP email
  console.log('\n--- STEP 3: Dispatching Test Real Email via Nodemailer ---');
  const testRecipient = emailUser;
  console.log(`  Recipient Email: ${testRecipient}`);

  try {
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const sendResult = await emailService.sendVerificationOTPEmail(testRecipient, 'Diagnostic User', testOTP);

    console.log('\n============================================================');
    console.log('  ✅ SMTP TEST DISPATCH COMPLETED SUCCESSFULLY!');
    console.log(`  - Sender (EMAIL_USER): ${emailUser}`);
    console.log(`  - Recipient:           ${testRecipient}`);
    console.log(`  - Message ID:          ${sendResult.messageId}`);
    console.log(`  - SMTP Server Response:${sendResult.response}`);
    console.log(`  - Accepted:            ${JSON.stringify(sendResult.accepted)}`);
    console.log('============================================================\n');
  } catch (sendErr) {
    console.error('\n❌ DIAGNOSTIC RESULT: sendMail failed!');
    console.error('   Error Message:', sendErr.message);
    console.error('   Full Stack:\n', sendErr.stack);
    process.exit(1);
  }
}

runEmailAudit();
