const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');

class AuthController {
  async register(req, res, next) {
    try {
      const { username, email, password, name, phone, role, dateOfJoining, department } = req.body;

      if ((!username && !email) || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Username/Email, password, and profile name are required'
        });
      }

      const loginId = (username || email).toLowerCase();

      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [{ username: loginId }, { email: loginId }] 
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username or email is already registered'
        });
      }

      // Format role name
      const normalizedRole = (role && role.toLowerCase() === 'worker') ? 'Worker' : 'Supervisor';

      // Check or create Worker registry profile
      let worker = await Worker.findOne({ name });
      if (!worker) {
        worker = await Worker.create({
          name,
          email: email || `${loginId}@factory.com`,
          phone: phone || '',
          role: normalizedRole,
          department: department || 'Operations',
          salary: normalizedRole === 'Supervisor' ? 28000 : 18000,
          status: 'Active',
          dateOfJoining: dateOfJoining || new Date()
        });
      }

      // Hash password using bcryptjs
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create User credential account
      const user = await User.create({
        username: loginId,
        email: email || `${loginId}@factory.com`,
        password: hashedPassword,
        role: normalizedRole,
        department: department || 'Operations',
        phone: phone || '',
        status: 'Active',
        worker: worker._id
      });

      worker.user = user._id;
      await worker.save();

      // Sign JWT token
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
          error: 'Please specify username/email and password'
        });
      }

      // Find user by username or email
      const user = await User.findOne({
        $or: [{ username: identifier }, { email: identifier }]
      }).populate('worker');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password'
        });
      }

      // Check account status
      if (user.status === 'Inactive') {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated. Please contact your supervisor.'
        });
      }

      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password'
        });
      }

      // Check if worker profile exists
      let worker = user.worker;
      if (!worker) {
        worker = await Worker.findOne({ $or: [{ user: user._id }, { name: new RegExp('^' + user.username + '$', 'i') }] });
        if (!worker) {
          worker = await Worker.create({
            name: user.username,
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

      // Synchronize roles strictly
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

      if (worker.status === 'Inactive') {
        return res.status(403).json({
          success: false,
          error: 'Worker profile is deactivated. Please contact your supervisor.'
        });
      }

      // Sign JWT token
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

