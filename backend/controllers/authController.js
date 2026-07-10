const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');

class AuthController {
  async register(req, res, next) {
    try {
      const { username, password, name, phone, role } = req.body;

      if (!username || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Username, password, and supervisor/staff name are required'
        });
      }

      // Check if username already exists
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username is already taken'
        });
      }

      // Check or create Worker registry profile
      let worker = await Worker.findOne({ name });
      if (!worker) {
        worker = await Worker.create({
          name,
          phone: phone || '',
          role: role || 'Supervisor',
          salary: (role || 'Supervisor') === 'Supervisor' ? 28000 : 18000,
          status: 'Active'
        });
      }

      // Hash password using bcryptjs
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create User credential account
      const user = await User.create({
        username: username.toLowerCase(),
        password: hashedPassword,
        role: role || 'Supervisor',
        worker: worker._id
      });

      // Sign JWT token
      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role, workerId: worker._id },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '30d' }
      );

      const userRole = user.role || '';
      const isAuthorized = userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'supervisor';

      res.status(201).json({
        success: true,
        token,
        data: {
          id: user._id,
          username: user.username,
          role: user.role,
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
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Please specify username and password'
        });
      }

      // Find user
      const user = await User.findOne({ username: username.toLowerCase() }).populate('worker');
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password'
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
        // Fallback or legacy account linking
        worker = await Worker.create({
          name: username,
          role: user.role,
          salary: user.role === 'Supervisor' ? 28000 : 18000,
          status: 'Active'
        });
        user.worker = worker._id;
        await user.save();
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
          role: user.role,
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
      // Decode user profile from database
      const user = await User.findById(req.user.id).populate('worker');
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User account not found'
        });
      }

      const userRole = user.role || '';
      const isAuthorized = userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'supervisor';

      res.status(200).json({
        success: true,
        data: {
          id: user._id,
          username: user.username,
          role: user.role,
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
