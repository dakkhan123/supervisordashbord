const path = require('path');

// 1. Ensure dotenv is loaded BEFORE any email configuration
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  getTransporter() {
    const emailUser = (process.env.EMAIL_USER || '').trim();
    const emailPass = (process.env.EMAIL_PASS || '').trim();

    if (!emailUser || !emailPass) {
      const errMessage = `[EMAIL_SERVICE ERROR] EMAIL_USER or EMAIL_PASS is missing in backend/.env! (EMAIL_USER: "${emailUser || 'NOT SET'}", EMAIL_PASS: "${emailPass ? 'SET' : 'NOT SET'}")`;
      console.error(errMessage);
      throw new Error(errMessage);
    }

    // Gmail SMTP Configuration
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // TLS/SSL
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    return this.transporter;
  }

  async verifyTransporter() {
    console.log('\n====================================================');
    console.log('[EMAIL_SERVICE] Running SMTP Transporter Verification...');
    const emailUser = (process.env.EMAIL_USER || '').trim();
    console.log(`[EMAIL_SERVICE] EMAIL_USER: ${emailUser || 'NOT SET'}`);
    console.log(`[EMAIL_SERVICE] EMAIL_FROM: ${process.env.EMAIL_FROM || emailUser || 'NOT SET'}`);
    console.log('====================================================\n');

    try {
      const transporter = this.getTransporter();
      const result = await transporter.verify();
      console.log('✅ [EMAIL_SERVICE] SMTP Transporter Verification SUCCESS:', result);
      return { success: true, result };
    } catch (err) {
      console.error('❌ [EMAIL_SERVICE] SMTP Transporter Verification FAILED:');
      console.error('   Error Message:', err.message);
      console.error('   Error Code:', err.code);
      console.error('   Error Command:', err.command);
      console.error('   Complete Stack:\n', err.stack);
      return { success: false, error: err };
    }
  }

  async sendVerificationOTPEmail(toEmail, recipientName, otp) {
    console.log('\n====================================================');
    console.log(`[EMAIL_SERVICE] Initiating Registration OTP Email...`);
    console.log(`  EMAIL_USER (Sender): ${process.env.EMAIL_USER || 'NOT SET'}`);
    console.log(`  Recipient Email:     ${toEmail}`);
    console.log(`  OTP Code:            ${otp}`);
    console.log('====================================================\n');

    const transporter = this.getTransporter();

    const fromHeader = process.env.EMAIL_FROM
      ? process.env.EMAIL_FROM.trim()
      : `"SmartOps Security" <${process.env.EMAIL_USER.trim()}>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b1727; margin: 0; padding: 20px; color: #f8fafc; }
          .container { max-width: 550px; margin: 0 auto; background: #17263c; border-radius: 12px; border: 1px solid #2d3f58; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #0f766e, #0d9488); padding: 28px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
          .content { padding: 32px 28px; text-align: center; }
          .greeting { font-size: 16px; color: #cbd5e1; margin-bottom: 20px; text-align: left; }
          .otp-box { background: #0f172a; border: 2px dashed #0d9488; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center; }
          .otp-code { font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; color: #2dd4bf; letter-spacing: 8px; margin: 0; }
          .otp-expiry { font-size: 12px; color: #94a3b8; margin-top: 8px; }
          .footer { background: #0f172a; padding: 18px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SmartOps Email Verification</h1>
          </div>
          <div class="content">
            <div class="greeting">
              Hello <strong>${recipientName || 'Supervisor'}</strong>,
            </div>
            <p style="color: #94a3b8; font-size: 14px; text-align: left; line-height: 1.6;">
              Thank you for registering a Supervisor Console account with SmartOps. Use the 6-digit OTP code below to complete your email verification:
            </p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <div class="otp-expiry">⏱️ Valid for 10 minutes only. Do not share this code with anyone.</div>
            </div>
            <p style="color: #64748b; font-size: 12px; text-align: left; margin-top: 24px;">
              If you did not initiate this registration request, please ignore this email or contact system administration.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} SmartOps Enterprise Operations Portal. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: fromHeader,
      to: toEmail,
      subject: 'SmartOps Email Verification',
      html: htmlContent
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ [EMAIL_SERVICE SUCCESS] Email Verification OTP dispatched to ${toEmail}`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   Response:   ${info.response}`);
      console.log(`   Accepted:   ${JSON.stringify(info.accepted)}\n`);
      return info;
    } catch (err) {
      console.error(`❌ [EMAIL_SERVICE ERROR] Failed to send Verification OTP to ${toEmail}:`);
      console.error(`   Error Message: ${err.message}`);
      console.error(`   Complete Stack:\n`, err.stack);
      throw err; // Re-throw to prevent fake success response
    }
  }

  async sendPasswordResetEmail(toEmail, recipientName, otp) {
    console.log('\n====================================================');
    console.log(`[EMAIL_SERVICE] Initiating Password Reset Email...`);
    console.log(`  EMAIL_USER (Sender): ${process.env.EMAIL_USER || 'NOT SET'}`);
    console.log(`  Recipient Email:     ${toEmail}`);
    console.log(`  Reset OTP Code:      ${otp}`);
    console.log('====================================================\n');

    const transporter = this.getTransporter();

    const fromHeader = process.env.EMAIL_FROM
      ? process.env.EMAIL_FROM.trim()
      : `"SmartOps Security" <${process.env.EMAIL_USER.trim()}>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b1727; margin: 0; padding: 20px; color: #f8fafc; }
          .container { max-width: 550px; margin: 0 auto; background: #17263c; border-radius: 12px; border: 1px solid #2d3f58; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #b91c1c, #dc2626); padding: 28px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
          .content { padding: 32px 28px; text-align: center; }
          .greeting { font-size: 16px; color: #cbd5e1; margin-bottom: 20px; text-align: left; }
          .otp-box { background: #0f172a; border: 2px dashed #f87171; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center; }
          .otp-code { font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; color: #f87171; letter-spacing: 8px; margin: 0; }
          .otp-expiry { font-size: 12px; color: #94a3b8; margin-top: 8px; }
          .footer { background: #0f172a; padding: 18px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SmartOps Password Reset</h1>
          </div>
          <div class="content">
            <div class="greeting">
              Hello <strong>${recipientName || 'Supervisor'}</strong>,
            </div>
            <p style="color: #94a3b8; font-size: 14px; text-align: left; line-height: 1.6;">
              We received a request to reset your password for your SmartOps Supervisor account. Use the 6-digit OTP code below to set your new password:
            </p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <div class="otp-expiry">⏱️ Valid for 10 minutes only.</div>
            </div>
            <p style="color: #64748b; font-size: 12px; text-align: left; margin-top: 24px;">
              If you did not request a password reset, please secure your account immediately.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} SmartOps Enterprise Operations Portal. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: fromHeader,
      to: toEmail,
      subject: 'SmartOps Password Reset',
      html: htmlContent
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ [EMAIL_SERVICE SUCCESS] Password Reset OTP dispatched to ${toEmail}`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   Response:   ${info.response}`);
      console.log(`   Accepted:   ${JSON.stringify(info.accepted)}\n`);
      return info;
    } catch (err) {
      console.error(`❌ [EMAIL_SERVICE ERROR] Failed to send Password Reset OTP to ${toEmail}:`);
      console.error(`   Error Message: ${err.message}`);
      console.error(`   Complete Stack:\n`, err.stack);
      throw err; // Re-throw to prevent fake success response
    }
  }

  async sendRegistrationSubmittedEmail(toEmail, recipientName) {
    const transporter = this.getTransporter();
    const fromHeader = process.env.EMAIL_FROM
      ? process.env.EMAIL_FROM.trim()
      : `"SmartOps System" <${process.env.EMAIL_USER.trim()}>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: sans-serif; background-color: #0b1727; padding: 20px; color: #f8fafc;">
        <div style="max-width: 550px; margin: 0 auto; background: #17263c; border-radius: 12px; padding: 30px; border: 1px solid #2d3f58;">
          <h2 style="color: #0d9488; margin-top: 0;">Registration Submitted Successfully</h2>
          <p>Hello <strong>${recipientName}</strong>,</p>
          <p>Your SmartOps Worker Registration request has been submitted successfully after email verification.</p>
          <p style="background: #0f172a; padding: 15px; border-radius: 8px; border-left: 4px solid #0d9488; color: #cbd5e1;">
            ⏳ <strong>Current Status: Pending Supervisor Approval</strong><br/>
            Your application is undergoing supervisor review. You will receive an email notification as soon as your account is activated.
          </p>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">SmartOps Enterprise Operations Portal</p>
        </div>
      </body>
      </html>
    `;

    return await transporter.sendMail({
      from: fromHeader,
      to: toEmail,
      subject: 'SmartOps — Worker Registration Submitted',
      html: htmlContent
    });
  }

  async sendRegistrationApprovedEmail(toEmail, recipientName, salary) {
    const transporter = this.getTransporter();
    const fromHeader = process.env.EMAIL_FROM
      ? process.env.EMAIL_FROM.trim()
      : `"SmartOps System" <${process.env.EMAIL_USER.trim()}>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: sans-serif; background-color: #0b1727; padding: 20px; color: #f8fafc;">
        <div style="max-width: 550px; margin: 0 auto; background: #17263c; border-radius: 12px; padding: 30px; border: 1px solid #2d3f58;">
          <h2 style="color: #22c55e; margin-top: 0;">🎉 Registration Approved!</h2>
          <p>Hello <strong>${recipientName}</strong>,</p>
          <p>Great news! Your SmartOps Worker Account registration has been approved by your Supervisor.</p>
          <div style="background: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #22c55e; margin: 20px 0;">
            <p style="margin: 0; color: #22c55e; font-weight: bold;">Status: Active</p>
            <p style="margin: 5px 0 0 0; color: #cbd5e1;">Assigned Salary: <strong>₹${salary ? salary.toLocaleString('en-IN') : 'N/A'}/month</strong></p>
          </div>
          <p>You can now log in to the Worker Console using your registered username/email and password.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">SmartOps Enterprise Operations Portal</p>
        </div>
      </body>
      </html>
    `;

    return await transporter.sendMail({
      from: fromHeader,
      to: toEmail,
      subject: 'SmartOps — Worker Registration Approved!',
      html: htmlContent
    });
  }

  async sendRegistrationRejectedEmail(toEmail, recipientName, rejectionReason) {
    const transporter = this.getTransporter();
    const fromHeader = process.env.EMAIL_FROM
      ? process.env.EMAIL_FROM.trim()
      : `"SmartOps System" <${process.env.EMAIL_USER.trim()}>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: sans-serif; background-color: #0b1727; padding: 20px; color: #f8fafc;">
        <div style="max-width: 550px; margin: 0 auto; background: #17263c; border-radius: 12px; padding: 30px; border: 1px solid #2d3f58;">
          <h2 style="color: #ef4444; margin-top: 0;">Registration Request Update</h2>
          <p>Hello <strong>${recipientName}</strong>,</p>
          <p>Your registration request for SmartOps Worker Console was reviewed by the supervisor and was <strong>not approved</strong> at this time.</p>
          ${rejectionReason ? `<div style="background: #0f172a; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; color: #f87171; margin: 15px 0;"><strong>Reason:</strong> ${rejectionReason}</div>` : ''}
          <p style="color: #94a3b8;">Please contact system administration if you believe this was an error.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">SmartOps Enterprise Operations Portal</p>
        </div>
      </body>
      </html>
    `;

    return await transporter.sendMail({
      from: fromHeader,
      to: toEmail,
      subject: 'SmartOps — Worker Registration Request Status',
      html: htmlContent
    });
  }

  async sendPasswordChangedEmail(toEmail, recipientName) {
    const transporter = this.getTransporter();
    const fromHeader = process.env.EMAIL_FROM
      ? process.env.EMAIL_FROM.trim()
      : `"SmartOps Security" <${process.env.EMAIL_USER.trim()}>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: sans-serif; background-color: #0b1727; padding: 20px; color: #f8fafc;">
        <div style="max-width: 550px; margin: 0 auto; background: #17263c; border-radius: 12px; padding: 30px; border: 1px solid #2d3f58;">
          <h2 style="color: #3b82f6; margin-top: 0;">Password Successfully Reset</h2>
          <p>Hello <strong>${recipientName}</strong>,</p>
          <p>Your password for your SmartOps account has been updated successfully via OTP verification.</p>
          <p style="color: #94a3b8;">If you did not make this change, please contact support or reset your password immediately.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">SmartOps Security Team</p>
        </div>
      </body>
      </html>
    `;

    return await transporter.sendMail({
      from: fromHeader,
      to: toEmail,
      subject: 'SmartOps — Password Security Notice',
      html: htmlContent
    });
  }
}

module.exports = new EmailService();
