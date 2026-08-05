const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Worker = require('../models/Worker');
const RegistrationOTP = require('../models/RegistrationOTP');
const emailService = require('../utils/emailService');

const hashOTP = (otp) => crypto.createHash('sha256').update(otp.trim()).digest('hex');

class AuthController {
  // Step 1: Supervisor Registration Request (Sends Email OTP)
  async register(req, res, next) {
    try {
      const { username, email, password, name, phone, role, dateOfJoining, department } = req.body;

      // 1. Mandatory Fields Validation
      if (!username || !email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Username, email, password, and full name are mandatory fields.'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid email address format (e.g. user@example.com).'
        });
      }

      // 2. Mobile Number 10-Digit Validation
      if (phone && !/^\d{10}$/.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Mobile number must be exactly 10 numeric digits.'
        });
      }

      const cleanUsername = username.toLowerCase().trim();
      const cleanEmail = email.toLowerCase().trim();

      // 3. Duplicate Username / Email Check in User collection
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

      // 4. Hash password with bcrypt
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 5. Generate secure 6-digit OTP & Hash OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOTP = hashOTP(otp);

      // 6. Save or update pending registration request with 10-min expiry
      await RegistrationOTP.deleteMany({ email: cleanEmail });
      await RegistrationOTP.create({
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
        phone: phone ? phone.trim() : '',
        role: normalizedRole,
        department: department || 'Operations',
        dateOfJoining: dateOfJoining || new Date(),
        otpHash: hashedOTP,
        lastSentAt: new Date()
      });

      // 7. Send OTP Email via Nodemailer
      await emailService.sendVerificationOTPEmail(cleanEmail, name.trim(), otp);

      res.status(200).json({
        success: true,
        email: cleanEmail,
        message: `Verification OTP sent to ${cleanEmail}. Please enter the 6-digit code to complete registration.`
      });
    } catch (err) {
      if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        return res.status(400).json({ success: false, error: message });
      }
      next(err);
    }
  }

  // Step 2: Verify Registration OTP & Create Account
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

      // Check if username or email was registered in the meantime
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

      // Create Worker Profile
      let worker = await Worker.findOne({ name: pending.name });
      if (!worker) {
        worker = await Worker.create({
          name: pending.name,
          email: pending.email,
          phone: pending.phone || '',
          role: pending.role,
          department: pending.department || 'Operations',
          salary: pending.role === 'Supervisor' ? 28000 : 18000,
          status: 'Active',
          dateOfJoining: pending.dateOfJoining || new Date()
        });
      } else {
        worker.email = pending.email;
        if (pending.phone) worker.phone = pending.phone;
        await worker.save();
      }

      // Create User Account with isEmailVerified: true
      const user = await User.create({
        username: pending.username,
        email: pending.email,
        password: pending.password,
        role: pending.role,
        department: pending.department || 'Operations',
        phone: pending.phone || '',
        status: 'Active',
        isEmailVerified: true,
        worker: worker._id
      });

      worker.user = user._id;
      await worker.save();

      // Clear pending OTP record
      await RegistrationOTP.deleteOne({ _id: pending._id });

      // Generate JWT Token
      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role, workerId: worker._id },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '30d' }
      );

      const isAuthorized = pending.role === 'Supervisor' || pending.role === 'Owner';

      res.status(201).json({
        success: true,
        token,
        message: 'Email verified successfully! Supervisor account created.',
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          worker: {
            id: worker._id,
            name: worker.name,
            phone: worker.phone,
            role: worker.role,
            ...(isAuthorized ? { salary: worker.salary } : {}),
            status: worker.status
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // Resend Registration OTP with 30s Cooldown
  async resendRegistrationOTP(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Please specify an email address.'
        });
      }

      const cleanEmail = email.toLowerCase().trim();
      const pending = await RegistrationOTP.findOne({ email: cleanEmail });

      if (!pending) {
        return res.status(400).json({
          success: false,
          error: 'No pending registration found for this email. Please register again.'
        });
      }

      // Check 30 seconds cooldown
      const secondsSinceLastSent = (Date.now() - new Date(pending.lastSentAt).getTime()) / 1000;
      if (secondsSinceLastSent < 30) {
        const remaining = Math.ceil(30 - secondsSinceLastSent);
        return res.status(429).json({
          success: false,
          error: `Please wait ${remaining} seconds before requesting another OTP.`
        });
      }

      // Re-generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      pending.otpHash = hashOTP(otp);
      pending.lastSentAt = new Date();
      await pending.save();

      // Send Email
      await emailService.sendVerificationOTPEmail(cleanEmail, pending.name, otp);

      res.status(200).json({
        success: true,
        message: 'A new 6-digit OTP code has been sent to your email.'
      });
    } catch (err) {
      next(err);
    }
  }

  // Login Controller with Email Verification Check
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

      // Find user by username OR email
      const user = await User.findOne({
        $or: [{ username: identifier }, { email: identifier }]
      }).populate('worker');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials. User account not found.'
        });
      }

      if (user.status === 'Inactive') {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated. Please contact administrator.'
        });
      }

      // Enforce Email Verification Check for Supervisors
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
        worker = await Worker.findOne({ $or: [{ user: user._id }, { name: new RegExp('^' + user.username + '$', 'i') }] });
        if (!worker) {
          worker = await Worker.create({
            name: user.username,
            email: user.email,
            role: user.role || 'Supervisor',
            salary: (user.role || 'Supervisor').toLowerCase() === 'supervisor' ? 28000 : 18000,
            status: user.status || 'Active',
            dateOfJoining: new Date(),
            user: user._id
          });
        }
        user.worker = worker._id;
        if (!worker.user) {
          worker.user = user._id;
          await worker.save();
        }
      }

      if (worker && worker.role) {
        const workerRoleLower = worker.role.toLowerCase();
        const userRoleLower = (user.role || '').toLowerCase();
        if (workerRoleLower === 'worker' && userRoleLower !== 'worker') {
          user.role = 'Worker';
          await user.save();
        } else if (workerRoleLower === 'supervisor' && userRoleLower !== 'supervisor' && userRoleLower !== 'owner') {
          user.role = 'Supervisor';
          await user.save();
        }
      }

      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role, workerId: worker ? worker._id : null },
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
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          worker: worker ? {
            id: worker._id,
            name: worker.name,
            phone: worker.phone,
            role: worker.role,
            ...(isAuthorized ? { salary: worker.salary } : {}),
            status: worker.status
          } : null
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // Forgot Password endpoint (ONLY for Supervisors)
  async forgotPassword(req, res, next) {
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

      // Restrict Forgot Password to Supervisor / Owner accounts ONLY
      const userRole = (user.role || '').toLowerCase();
      if (userRole === 'worker') {
        return res.status(403).json({
          success: false,
          error: 'Forgot Password option is restricted to Supervisor accounts. Worker accounts must contact their supervisor for password resets.'
        });
      }

      // Generate 6-digit OTP & Hash it before saving
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetPasswordOTP = hashOTP(otp);
      user.resetPasswordOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes validity
      await user.save();

      // Send Real Password Reset Email via Nodemailer
      await emailService.sendPasswordResetEmail(cleanEmail, user.username, otp);

      res.status(200).json({
        success: true,
        message: 'Password reset OTP sent to your registered email address.'
      });
    } catch (err) {
      next(err);
    }
  }

  // Reset Password endpoint with OTP
  async resetPassword(req, res, next) {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Email, OTP code, and new password are required.'
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

      // Search for matching user with unexpired reset OTP
      const user = await User.findOne({
        email: cleanEmail,
        $or: [{ resetPasswordOTP: hashedInputOTP }, { resetPasswordOTP: otp.trim() }],
        resetPasswordOTPExpire: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'OTP Expired. Please resend.'
        });
      }

      // Hash new password using bcrypt
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword.trim(), salt);
      user.resetPasswordOTP = undefined;
      user.resetPasswordOTPExpire = undefined;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password updated successfully! You can now sign in with your new password.'
      });
    } catch (err) {
      next(err);
    }
  }

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
          name: profileName,
          username: user.username,
          email: user.email,
          phone: profilePhone,
          role: user.role,
          department: profileDepartment,
          unit: user.unit || 'Unit Pune-A12',
          address: user.address || 'Plot No. 42, Hinjewadi Phase 3, Pune, MH - 411057',
          dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : '1990-01-01',
          dateOfJoining: profileDateOfJoining ? new Date(profileDateOfJoining).toISOString().split('T')[0] : '2024-01-15',
          photo: user.photo || null,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          worker: user.worker ? {
            id: user.worker._id,
            name: user.worker.name,
            phone: user.worker.phone,
            role: user.worker.role,
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
          error: "Forbidden: You are not authorized to edit another supervisor's profile."
        });
      }

      const user = await User.findById(authenticatedId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User profile not found'
        });
      }

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
      if (dateOfJoining !== undefined && dateOfJoining) user.dateOfJoining = new Date(dateOfJoining);
      if (address !== undefined) user.address = address.trim();
      if (unit !== undefined) user.unit = unit.trim();
      if (photo !== undefined) user.photo = photo;
      if (department !== undefined) user.department = department.trim();

      await user.save();

      // Keep linked Worker document in sync if present
      if (user.worker) {
        const workerUpdate = {};
        if (name !== undefined) workerUpdate.name = name.trim();
        if (email !== undefined) workerUpdate.email = email.toLowerCase().trim();
        if (phone !== undefined) workerUpdate.phone = user.phone;
        if (department !== undefined) workerUpdate.department = department.trim();
        if (dateOfJoining !== undefined && dateOfJoining) workerUpdate.dateOfJoining = new Date(dateOfJoining);
        await Worker.findByIdAndUpdate(user.worker, workerUpdate);
      }

      const profileName = user.name || user.username;
      const profilePhone = user.phone || '';
      const profileDepartment = user.department || 'Operations';

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully!',
        data: {
          id: user._id,
          name: profileName,
          username: user.username,
          email: user.email,
          phone: profilePhone,
          role: user.role,
          department: profileDepartment,
          unit: user.unit || 'Unit Pune-A12',
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
}

module.exports = new AuthController();
