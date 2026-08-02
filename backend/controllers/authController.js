const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');

class AuthController {
  async register(req, res, next) {
    try {
      const { username, email, password, name, phone, role, dateOfJoining, department } = req.body;

      // 1. Mandatory Email & Required Fields Validation
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

      // 3. Duplicate Username / Email Check
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

      // 4. Create or update Worker profile
      let worker = await Worker.findOne({ name: name.trim() });
      if (!worker) {
        worker = await Worker.create({
          name: name.trim(),
          email: cleanEmail,
          phone: phone ? phone.trim() : '',
          role: normalizedRole,
          department: department || 'Operations',
          salary: normalizedRole === 'Supervisor' ? 28000 : 18000,
          status: 'Active',
          dateOfJoining: dateOfJoining || new Date()
        });
      } else {
        worker.email = cleanEmail;
        if (phone) worker.phone = phone.trim();
        await worker.save();
      }

      // 5. Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 6. Create User account
      const user = await User.create({
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
        role: normalizedRole,
        department: department || 'Operations',
        phone: phone ? phone.trim() : '',
        status: 'Active',
        worker: worker._id
      });

      worker.user = user._id;
      await worker.save();

      // 7. Generate Token
      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role, workerId: worker._id },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '30d' }
      );

      const isAuthorized = normalizedRole === 'Supervisor' || normalizedRole === 'Owner';

      res.status(201).json({
        success: true,
        token,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
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
      if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        return res.status(400).json({ success: false, error: message });
      }
      next(err);
    }
  }

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
        { id: user._id, username: user.username, role: user.role, workerId: worker._id },
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

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetPasswordOTP = otp;
      user.resetPasswordOTPExpire = Date.now() + 15 * 60 * 1000; // 15 minutes validity
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password reset OTP generated and sent to your registered email.',
        otp // Returned for frontend display / verification testing
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

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters long.'
        });
      }

      const cleanEmail = email.toLowerCase().trim();
      const user = await User.findOne({
        email: cleanEmail,
        resetPasswordOTP: otp.trim(),
        resetPasswordOTPExpire: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired OTP reset code. Please request a new OTP.'
        });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
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

      res.status(200).json({
        success: true,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
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
}

module.exports = new AuthController();
