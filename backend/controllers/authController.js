const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Worker = require('../models/Worker');
const RegistrationOTP = require('../models/RegistrationOTP');
const PendingWorker = require('../models/PendingWorker');
const emailService = require('../utils/emailService');

const hashOTP = (otp) => crypto.createHash('sha256').update(otp.trim()).digest('hex');

class AuthController {
  // Worker Registration Step 1: Send Verification Email OTP
  async registerWorkerSendOTP(req, res, next) {
    try {
      const { fullName, username, email, password, confirmPassword, mobile, dateOfBirth, address, joiningDate, department, branch, photo } = req.body;

      if (!fullName || !username || !email || !password || !mobile) {
        return res.status(400).json({
          success: false,
          error: 'Full Name, Username, Email, Password, and Mobile Number are mandatory.'
        });
      }

      if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Password and Confirm Password do not match.'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid email address format.'
        });
      }

      const cleanMobile = mobile.toString().replace(/\D/g, '');
      if (cleanMobile.length !== 10) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number must be exactly 10 numeric digits.'
        });
      }

      const cleanUsername = username.toLowerCase().trim();
      const cleanEmail = email.toLowerCase().trim();
      const cleanBranch = (branch && branch.trim()) ? branch.trim() : 'Pune Head Office';
      const cleanDepartment = (department && department.trim()) ? department.trim() : 'Operations';

      // 1. Check duplicate username in User collection
      const existingUserByUsername = await User.findOne({ username: cleanUsername });
      if (existingUserByUsername) {
        return res.status(400).json({
          success: false,
          error: `The username '${cleanUsername}' is already taken. Please choose a different username.`
        });
      }

      // 2. Check duplicate email in User collection
      const existingUserByEmail = await User.findOne({ email: cleanEmail });
      if (existingUserByEmail) {
        return res.status(400).json({
          success: false,
          error: `An account with the email '${cleanEmail}' is already registered. Please log in or reset your password.`
        });
      }

      // 3. Check duplicate active email in Worker collection
      const existingWorkerByEmail = await Worker.findOne({ email: cleanEmail, status: 'Active' });
      if (existingWorkerByEmail) {
        return res.status(400).json({
          success: false,
          error: `An active worker account with the email '${cleanEmail}' is already registered. Please log in.`
        });
      }

      // 4. Check duplicate in PendingWorker collection (Pending or Approved)
      const pendingByUsername = await PendingWorker.findOne({
        username: cleanUsername,
        status: { $in: ['Pending', 'Approved'] }
      });
      if (pendingByUsername) {
        return res.status(400).json({
          success: false,
          error: pendingByUsername.status === 'Approved'
            ? `The username '${cleanUsername}' belongs to an approved worker account. Please log in.`
            : `A registration request with username '${cleanUsername}' is currently pending supervisor approval.`
        });
      }

      const pendingByEmail = await PendingWorker.findOne({
        email: cleanEmail,
        status: { $in: ['Pending', 'Approved'] }
      });
      if (pendingByEmail) {
        return res.status(400).json({
          success: false,
          error: pendingByEmail.status === 'Approved'
            ? `An application with the email '${cleanEmail}' is already approved. Please log in.`
            : `A registration request for email '${cleanEmail}' is currently pending supervisor approval.`
        });
      }

      // Hash Password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Generate 6-Digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOTP = hashOTP(otp);

      // Store in RegistrationOTP temp collection
      await RegistrationOTP.deleteMany({ email: cleanEmail });
      await RegistrationOTP.create({
        name: fullName.trim(),
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
        phone: cleanMobile,
        role: 'Worker',
        department: cleanDepartment,
        branch: cleanBranch,
        dateOfJoining: joiningDate ? new Date(joiningDate) : new Date(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        address: address ? address.trim() : '',
        photo: photo || '',
        otpHash: hashedOTP,
        lastSentAt: new Date()
      });

      // Dispatch Email OTP
      await emailService.sendVerificationOTPEmail(cleanEmail, fullName.trim(), otp);

      res.status(200).json({
        success: true,
        email: cleanEmail,
        message: `Verification OTP sent to ${cleanEmail}. Please verify to submit registration.`
      });
    } catch (err) {
      next(err);
    }
  }

  // Worker Registration Step 2: Verify OTP & Create PendingWorker Request
  async registerWorkerVerifyOTP(req, res, next) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          error: 'Email address and 6-digit OTP code are required.'
        });
      }

      const cleanEmail = email.toLowerCase().trim();
      const pendingOTP = await RegistrationOTP.findOne({ email: cleanEmail });

      if (!pendingOTP) {
        return res.status(400).json({
          success: false,
          error: 'OTP Expired or registration session not found. Please register again.'
        });
      }

      const inputHash = hashOTP(otp);
      if (inputHash !== pendingOTP.otpHash) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP code. Please check and try again.'
        });
      }

      // Remove any prior rejected pending records for this email/username
      await PendingWorker.deleteMany({ email: cleanEmail });

      // Create PendingWorker Document (Status = Pending)
      const pendingWorker = await PendingWorker.create({
        fullName: pendingOTP.name,
        username: pendingOTP.username,
        email: pendingOTP.email,
        passwordHash: pendingOTP.password,
        mobile: pendingOTP.phone,
        dateOfBirth: pendingOTP.dateOfBirth,
        address: pendingOTP.address,
        department: pendingOTP.department,
        branch: pendingOTP.branch || 'Pune Head Office',
        joiningDate: pendingOTP.dateOfJoining,
        photo: pendingOTP.photo,
        status: 'Pending',
        emailVerified: true
      });

      // Clear temp OTP record
      await RegistrationOTP.deleteOne({ _id: pendingOTP._id });

      // Send Registration Submitted Notification Email
      try {
        await emailService.sendRegistrationSubmittedEmail(cleanEmail, pendingWorker.fullName);
      } catch (emailErr) {
        console.error('Failed to send registration submitted email:', emailErr);
      }

      // Dispatch Real-Time Notification ONLY to Supervisors of the SAME Branch (or Owners/Admins)
      try {
        const Notification = require('../models/Notification');
        const targetBranch = pendingWorker.branch || 'Pune Head Office';
        const supervisors = await User.find({
          role: { $in: ['Supervisor', 'Owner', 'Manager', 'Admin'] },
          $or: [
            { branch: targetBranch },
            { unit: targetBranch },
            { role: { $in: ['Owner', 'Admin'] } }
          ]
        });
        const notifPromises = supervisors.map(sup =>
          Notification.create({
            user: sup._id,
            title: `✉️ New Worker Registration Request`,
            message: `${pendingWorker.fullName} (@${pendingWorker.username}) from ${pendingWorker.branch || pendingWorker.department} has submitted a registration request.`,
            description: `New worker registration pending supervisor review & salary assignment.`,
            type: 'approval',
            itemId: pendingWorker._id.toString()
          })
        );
        await Promise.all(notifPromises);
      } catch (notifErr) {
        console.error('Failed to send supervisor notification on worker registration:', notifErr);
      }

      res.status(201).json({
        success: true,
        message: 'Your registration has been submitted and is awaiting supervisor approval.',
        data: {
          id: pendingWorker._id,
          fullName: pendingWorker.fullName,
          branch: pendingWorker.branch,
          status: pendingWorker.status
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // Supervisor Registration Request (Sends Email OTP)
  async register(req, res, next) {
    try {
      const { username, email, password, name, phone, role, dateOfJoining, department, branch } = req.body;

      if (!username || !email || !password || !name || !branch) {
        return res.status(400).json({
          success: false,
          error: 'Username, email, password, full name, and Branch / Office are mandatory fields.'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid email address format.'
        });
      }

      if (phone && !/^\d{10}$/.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number must be exactly 10 numeric digits.'
        });
      }

      const cleanUsername = username.toLowerCase().trim();
      const cleanEmail = email.toLowerCase().trim();
      const cleanBranch = branch.trim();

      const existingUserByUsername = await User.findOne({ username: cleanUsername });
      if (existingUserByUsername) {
        return res.status(400).json({
          success: false,
          error: 'Username is already registered. Please choose another username.'
        });
      }

      const existingUserByEmail = await User.findOne({ email: cleanEmail });
      if (existingUserByEmail) {
        return res.status(400).json({
          success: false,
          error: 'Email address is already registered. Please use another email or log in.'
        });
      }

      const normalizedRole = (role && role.toLowerCase() === 'worker') ? 'Worker' : 'Supervisor';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOTP = hashOTP(otp);

      await RegistrationOTP.deleteMany({ email: cleanEmail });
      await RegistrationOTP.create({
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
        phone: phone ? phone.trim() : '',
        role: normalizedRole,
        department: department || 'Operations',
        branch: cleanBranch,
        dateOfJoining: dateOfJoining || new Date(),
        otpHash: hashedOTP,
        lastSentAt: new Date()
      });

      await emailService.sendVerificationOTPEmail(cleanEmail, name.trim(), otp);

      res.status(200).json({
        success: true,
        email: cleanEmail,
        message: `Verification OTP sent to ${cleanEmail}. Please enter the 6-digit code to complete registration.`
      });
    } catch (err) {
      next(err);
    }
  }

  // Step 2: Verify Registration OTP & Create Supervisor Account
  async verifyRegistrationOTP(req, res, next) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          error: 'Email address and 6-digit OTP code are required.'
        });
      }

      const cleanEmail = email.toLowerCase().trim();
      const pending = await RegistrationOTP.findOne({ email: cleanEmail });

      if (!pending) {
        return res.status(400).json({
          success: false,
          error: 'OTP Expired. Please resend.'
        });
      }

      const inputHash = hashOTP(otp);
      if (inputHash !== pending.otpHash) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP'
        });
      }

      const checkUser = await User.findOne({
        $or: [{ username: pending.username }, { email: pending.email }]
      });
      if (checkUser) {
        await RegistrationOTP.deleteOne({ _id: pending._id });
        return res.status(400).json({
          success: false,
          error: 'Account with this email or username already exists. Please log in.'
        });
      }

      const assignedBranch = pending.branch || 'Pune Head Office';

      // If worker role registration, DO NOT create active user or issue JWT! Create PendingWorker request.
      if (pending.role && pending.role.toLowerCase() === 'worker') {
        await PendingWorker.deleteMany({ email: cleanEmail });

        const pendingWorker = await PendingWorker.create({
          fullName: pending.name,
          username: pending.username,
          email: pending.email,
          passwordHash: pending.password,
          mobile: pending.phone || '',
          department: pending.department || 'Operations',
          branch: assignedBranch,
          joiningDate: pending.dateOfJoining || new Date(),
          status: 'Pending',
          emailVerified: true
        });

        await RegistrationOTP.deleteOne({ _id: pending._id });

        try {
          await emailService.sendRegistrationSubmittedEmail(cleanEmail, pendingWorker.fullName);
        } catch (e) {}

        try {
          const Notification = require('../models/Notification');
          const supervisors = await User.find({
            role: { $in: ['Supervisor', 'Owner', 'Manager', 'Admin'] },
            $or: [
              { branch: assignedBranch },
              { unit: assignedBranch },
              { role: { $in: ['Owner', 'Admin'] } }
            ]
          });
          const notifPromises = supervisors.map(sup =>
            Notification.create({
              user: sup._id,
              title: `✉️ New Worker Registration Request`,
              message: `${pendingWorker.fullName} (@${pendingWorker.username}) from ${assignedBranch} has submitted a registration request.`,
              description: `Registration request awaiting supervisor review & salary assignment.`,
              type: 'approval',
              itemId: pendingWorker._id.toString()
            })
          );
          await Promise.all(notifPromises);
        } catch (e) {}

        return res.status(201).json({
          success: true,
          message: 'Your registration has been submitted and is awaiting supervisor approval.'
        });
      }

      let worker = await Worker.findOne({ name: pending.name });
      if (!worker) {
        worker = await Worker.create({
          name: pending.name,
          email: pending.email,
          phone: pending.phone || '',
          role: pending.role,
          department: pending.department || 'Operations',
          branch: assignedBranch,
          assignedSite: assignedBranch,
          salary: pending.role === 'Supervisor' ? 28000 : 18000,
          status: 'Active',
          dateOfJoining: pending.dateOfJoining || new Date()
        });
      } else {
        worker.email = pending.email;
        worker.branch = assignedBranch;
        worker.assignedSite = assignedBranch;
        if (pending.phone) worker.phone = pending.phone;
        await worker.save();
      }

      const user = await User.create({
        username: pending.username,
        email: pending.email,
        password: pending.password,
        role: pending.role,
        department: pending.department || 'Operations',
        branch: assignedBranch,
        unit: assignedBranch,
        phone: pending.phone || '',
        status: 'Active',
        isEmailVerified: true,
        worker: worker._id
      });

      worker.user = user._id;
      await worker.save();
      await RegistrationOTP.deleteOne({ _id: pending._id });

      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role, branch: user.branch || user.unit || assignedBranch, workerId: worker._id },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        token,
        message: 'Email verified successfully! Supervisor account created.',
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          branch: user.branch || user.unit || assignedBranch,
          status: user.status
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // Resend Registration OTP
  async resendRegistrationOTP(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Please specify an email address.' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const pending = await RegistrationOTP.findOne({ email: cleanEmail });

      if (!pending) {
        return res.status(400).json({ success: false, error: 'No pending registration found for this email.' });
      }

      const secondsSinceLastSent = (Date.now() - new Date(pending.lastSentAt).getTime()) / 1000;
      if (secondsSinceLastSent < 30) {
        const remaining = Math.ceil(30 - secondsSinceLastSent);
        return res.status(429).json({ success: false, error: `Please wait ${remaining} seconds before requesting another OTP.` });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      pending.otpHash = hashOTP(otp);
      pending.lastSentAt = new Date();
      await pending.save();

      await emailService.sendVerificationOTPEmail(cleanEmail, pending.name, otp);

      res.status(200).json({ success: true, message: 'A new 6-digit OTP code has been sent to your email.' });
    } catch (err) {
      next(err);
    }
  }

  // Login Controller with Pending Worker & Active User Checks
  async login(req, res, next) {
    try {
      const { username, email, password } = req.body;
      const identifier = (username || email || '').toLowerCase().trim();

      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          error: 'Please enter your username/email and password'
        });
      }

      // Check PendingWorker collection first
      const pendingWorker = await PendingWorker.findOne({
        $or: [{ username: identifier }, { email: identifier }]
      });

      if (pendingWorker) {
        if (pendingWorker.status === 'Pending') {
          return res.status(403).json({
            success: false,
            error: 'Your registration is pending supervisor approval.'
          });
        }
        if (pendingWorker.status === 'Rejected') {
          return res.status(403).json({
            success: false,
            error: 'Your registration request was rejected by supervisor.'
          });
        }
      }

      // Find user in User collection
      const user = await User.findOne({
        $or: [{ username: identifier }, { email: identifier }]
      }).populate('worker');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials. User account not found.'
        });
      }

      if (user.status !== 'Active') {
        return res.status(403).json({
          success: false,
          error: user.status === 'Inactive'
            ? 'Account is deactivated. Please contact administrator.'
            : 'Your registration is pending supervisor approval.'
        });
      }

      if (user.isEmailVerified === false) {
        return res.status(403).json({
          success: false,
          unverified: true,
          email: user.email,
          error: 'Please verify your email first.'
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password. Please check your password and try again.'
        });
      }

      let worker = user.worker;
      if (!worker) {
        worker = await Worker.findOne({ $or: [{ user: user._id }, { email: user.email }] });
      }

      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role, branch: user.branch || user.unit || 'Pune Head Office', workerId: worker ? worker._id : null },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '30d' }
      );

      const userRole = user.role || '';
      const isAuthorized = userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'supervisor';

      res.status(200).json({
        success: true,
        token,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          branch: user.branch || user.unit || 'Pune Head Office',
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          worker: worker ? {
            id: worker._id,
            name: worker.name,
            phone: worker.phone,
            role: worker.role,
            branch: worker.branch || worker.assignedSite || 'Pune Head Office',
            ...(isAuthorized ? { salary: worker.salary } : {}),
            status: worker.status
          } : null
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // Send Forgot Password OTP (For Workers & Supervisors)
  async forgotPasswordSendOTP(req, res, next) {
    try {
      const { email } = req.body;
      if (!email || !email.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Please provide your registered email address.'
        });
      }

      const cleanEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: cleanEmail });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'No registered user account found with this email address.'
        });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetPasswordOTP = hashOTP(otp);
      user.resetPasswordOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes validity
      await user.save();

      // Dispatch Email
      await emailService.sendPasswordResetEmail(cleanEmail, user.name || user.username, otp);

      res.status(200).json({
        success: true,
        email: cleanEmail,
        message: 'Password reset OTP sent to your registered email address.'
      });
    } catch (err) {
      next(err);
    }
  }

  // Reset Password via OTP (For Workers & Supervisors)
  async forgotPasswordReset(req, res, next) {
    try {
      const { email, otp, newPassword, confirmPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Email, OTP code, and new password are required.'
        });
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'New password and confirm password do not match.'
        });
      }

      if (newPassword.trim().length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters long.'
        });
      }

      const cleanEmail = email.toLowerCase().trim();
      const hashedInputOTP = hashOTP(otp);

      const user = await User.findOne({
        email: cleanEmail,
        $or: [{ resetPasswordOTP: hashedInputOTP }, { resetPasswordOTP: otp.trim() }],
        resetPasswordOTPExpire: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'OTP code is invalid or has expired. Please request a new OTP.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword.trim(), salt);

      user.password = hashedPassword;
      user.resetPasswordOTP = undefined;
      user.resetPasswordOTPExpire = undefined;
      await user.save();

      // Update PendingWorker record if present
      await PendingWorker.updateMany({ email: cleanEmail }, { passwordHash: hashedPassword });

      // Dispatch confirmation email
      try {
        await emailService.sendPasswordChangedEmail(cleanEmail, user.name || user.username);
      } catch (emailErr) {
        console.error('Failed to send password changed email:', emailErr);
      }

      res.status(200).json({
        success: true,
        message: 'Password updated successfully! You can now log in with your new password.'
      });
    } catch (err) {
      next(err);
    }
  }

  // Legacy alias helpers
  forgotPassword = (req, res, next) => {
    return this.forgotPasswordSendOTP(req, res, next);
  };

  resetPassword = (req, res, next) => {
    return this.forgotPasswordReset(req, res, next);
  };

  async getMe(req, res, next) {
    try {
      const user = await User.findById(req.user.id).populate('worker');
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User account not found'
        });
      }

      if (user.worker && user.worker.role) {
        const workerRoleLower = user.worker.role.toLowerCase();
        const userRoleLower = (user.role || '').toLowerCase();
        if (workerRoleLower === 'worker' && userRoleLower !== 'worker') {
          user.role = 'Worker';
          await user.save();
        }
      }

      // Ensure employeeId consistency
      let empId = user.employeeId || (user.worker ? user.worker.employeeId : null);
      if (!empId) {
        const workerService = require('../services/workerService');
        empId = await workerService.generateUniqueEmployeeId();
        user.employeeId = empId;
        await user.save();
        if (user.worker) {
          user.worker.employeeId = empId;
          await user.worker.save();
        }
      }

      const userRole = user.role || '';
      const isAuthorized = userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'supervisor';

      const profileName = user.name || (user.worker ? user.worker.name : user.username);
      const profilePhone = user.phone || (user.worker ? user.worker.phone : '');
      const profileDepartment = user.department || (user.worker ? user.worker.department : 'Operations');
      const profileDateOfJoining = user.dateOfJoining || (user.worker ? user.worker.dateOfJoining : user.createdAt);

      res.status(200).json({
        success: true,
        data: {
          id: user._id,
          employeeId: empId,
          name: profileName,
          username: user.username,
          email: user.email,
          phone: profilePhone,
          role: user.role,
          branch: user.branch || user.unit || (user.worker ? user.worker.branch : 'Pune Head Office'),
          department: profileDepartment,
          unit: user.branch || user.unit || 'Pune Head Office',
          address: user.address || (user.worker ? user.worker.address : '') || '',
          dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : (user.worker && user.worker.dateOfBirth ? new Date(user.worker.dateOfBirth).toISOString().split('T')[0] : ''),
          dateOfJoining: profileDateOfJoining ? new Date(profileDateOfJoining).toISOString().split('T')[0] : '',
          photo: user.photo || (user.worker ? user.worker.photo : null) || null,
          status: user.status || 'Active',
          isEmailVerified: user.isEmailVerified,
          settings: user.settings || {},
          worker: user.worker ? {
            id: user.worker._id,
            employeeId: user.worker.employeeId || empId,
            name: user.worker.name,
            phone: user.worker.phone,
            role: user.worker.role,
            department: user.worker.department,
            branch: user.worker.branch || user.worker.assignedSite || 'Pune Head Office',
            ...(isAuthorized ? { salary: user.worker.salary } : {}),
            status: user.worker.status
          } : null
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const requestedId = req.params.id;
      const authenticatedId = req.user.id.toString();

      // Authorization Check: A supervisor can ONLY edit their own profile
      if (requestedId && requestedId.toString() !== authenticatedId) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: You are not authorized to edit another user's profile."
        });
      }

      const user = await User.findById(authenticatedId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User profile not found'
        });
      }

      const isWorker = (user.role || '').toLowerCase() === 'worker';
      const { name, email, phone, dateOfBirth, dateOfJoining, address, unit, photo, department } = req.body;

      if (phone !== undefined) {
        const cleanPhone = phone.toString().replace(/\D/g, '');
        if (cleanPhone && cleanPhone.length !== 10) {
          return res.status(400).json({
            success: false,
            error: 'Mobile number must be exactly 10 numeric digits.'
          });
        }
        user.phone = cleanPhone;
      }

      if (email !== undefined) {
        const cleanEmail = email.toLowerCase().trim();
        const existing = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
        if (existing) {
          return res.status(400).json({
            success: false,
            error: 'Email address is already in use by another account.'
          });
        }
        user.email = cleanEmail;
      }

      if (name !== undefined) user.name = name.trim();
      if (dateOfBirth !== undefined && dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
      if (address !== undefined) user.address = address.trim();
      if (photo !== undefined) user.photo = photo;

      // Protected fields: ONLY non-worker roles can modify department, joining date, unit
      if (!isWorker) {
        if (dateOfJoining !== undefined && dateOfJoining) user.dateOfJoining = new Date(dateOfJoining);
        if (unit !== undefined) user.unit = unit.trim();
        if (department !== undefined) user.department = department.trim();
      }

      await user.save();

      // Keep linked Worker document in sync if present
      if (user.worker) {
        const workerUpdate = {};
        if (name !== undefined) workerUpdate.name = name.trim();
        if (email !== undefined) workerUpdate.email = email.toLowerCase().trim();
        if (phone !== undefined) workerUpdate.phone = user.phone;
        if (!isWorker) {
          if (department !== undefined) workerUpdate.department = department.trim();
          if (dateOfJoining !== undefined && dateOfJoining) workerUpdate.dateOfJoining = new Date(dateOfJoining);
        }
        await Worker.findByIdAndUpdate(user.worker, workerUpdate);
      }

      const profileName = user.name || user.username;
      const profilePhone = user.phone || '';
      const profileDepartment = user.department || 'Operations';
      const empId = user.employeeId || 'EMP-1001';

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully!',
        data: {
          id: user._id,
          employeeId: empId,
          name: profileName,
          username: user.username,
          email: user.email,
          phone: profilePhone,
          role: user.role,
          department: profileDepartment,
          unit: user.unit || user.branch || 'Pune Head Office',
          branch: user.branch || user.unit || 'Pune Head Office',
          address: user.address || '',
          dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : '',
          dateOfJoining: user.dateOfJoining ? user.dateOfJoining.toISOString().split('T')[0] : '',
          photo: user.photo || null,
          status: user.status
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User account not found' });
      }

      const { emailNotifications, taskNotifications, attendanceNotifications, leaveNotifications, pushNotifications, taskAlerts, darkMode } = req.body;

      if (!user.settings) {
        user.settings = {};
      }

      if (emailNotifications !== undefined) user.settings.emailNotifications = Boolean(emailNotifications);
      if (taskNotifications !== undefined) user.settings.taskNotifications = Boolean(taskNotifications);
      if (attendanceNotifications !== undefined) user.settings.attendanceNotifications = Boolean(attendanceNotifications);
      if (leaveNotifications !== undefined) user.settings.leaveNotifications = Boolean(leaveNotifications);
      if (pushNotifications !== undefined) user.settings.pushNotifications = Boolean(pushNotifications);
      if (taskAlerts !== undefined) user.settings.taskAlerts = Boolean(taskAlerts);
      if (darkMode !== undefined) user.settings.darkMode = Boolean(darkMode);

      user.markModified('settings');
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Settings updated successfully!',
        settings: user.settings
      });
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User account not found' });
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required.'
        });
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'New password and confirm password do not match.'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters long.'
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect. Please try again.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword.trim(), salt);
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password updated successfully!'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
