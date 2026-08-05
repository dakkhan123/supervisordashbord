const Worker = require('../models/Worker');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

class WorkerService {
  async checkNotSupervisor(id) {
    let worker = await Worker.findById(id);
    if (!worker) {
      // Check if id is actually a User ID belonging to a Supervisor
      const user = await User.findById(id);
      if (user && user.role && user.role.toLowerCase() === 'supervisor') {
        const error = new Error('Access denied: Cannot modify a supervisor account.');
        error.statusCode = 403;
        throw error;
      }
      const error = new Error('Worker not found');
      error.statusCode = 404;
      throw error;
    }

    if (worker.role && worker.role.toLowerCase() === 'supervisor') {
      const error = new Error('Access denied: Cannot modify a supervisor account.');
      error.statusCode = 403;
      throw error;
    }

    if (worker.user) {
      const user = await User.findById(worker.user);
      if (user && user.role && user.role.toLowerCase() === 'supervisor') {
        const error = new Error('Access denied: Cannot modify a supervisor account.');
        error.statusCode = 403;
        throw error;
      }
    }
    return worker;
  }

  async getAllWorkers(queryParams) {
    const { status } = queryParams || {};
    // Strict Filter: Workers API MUST ONLY return records with role = 'Worker'
    // Exclude all Supervisor, Admin, Owner, and Manager accounts
    let query = {
      role: { $nin: ['Supervisor', 'Admin', 'Owner', 'Manager'] }
    };
    if (status && status !== 'All') {
      query.status = status;
    }
    const workers = await Worker.find(query).populate('user', 'username email status role').sort({ createdAt: -1 });

    // Secondary Filter: Ensure linked user accounts are also not Supervisors
    return workers.filter(w => {
      const isWorkerRole = !w.role || w.role.toLowerCase() === 'worker';
      const isUserNotSupervisor = !w.user || !w.user.role || w.user.role.toLowerCase() === 'worker';
      return isWorkerRole && isUserNotSupervisor;
    });
  }

  async getWorkerById(id) {
    const worker = await this.checkNotSupervisor(id);
    return await Worker.findById(worker._id).populate('user', 'username email status role');
  }

  async createWorker(workerData) {
    // If workerData attempts to set role to Supervisor, prevent privilege escalation
    if (workerData.role && workerData.role.toLowerCase() === 'supervisor') {
      const error = new Error('Access denied: Cannot create supervisor accounts via worker endpoints.');
      error.statusCode = 403;
      throw error;
    }

    const worker = await Worker.create(workerData);

    // Generate User account if username or password provided, or auto-generate based on name
    const username = (workerData.username || workerData.name.toLowerCase().replace(/\s+/g, '')).toLowerCase().trim();
    const rawPassword = workerData.password || 'Worker@123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({
        username,
        email: workerData.email || `${username}@factory.com`,
        employeeId: workerData.employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        password: hashedPassword,
        role: 'Worker',
        department: workerData.department || 'Operations',
        phone: workerData.phone || '',
        status: workerData.status || 'Active',
        worker: worker._id
      });
    } else {
      user.worker = worker._id;
      user.role = 'Worker';
      user.status = workerData.status || 'Active';
      if (workerData.password && workerData.password.trim()) {
        user.password = hashedPassword;
      }
      await user.save();
    }

    worker.user = user._id;
    if (!worker.employeeId && user.employeeId) worker.employeeId = user.employeeId;
    if (!worker.email && user.email) worker.email = user.email;
    await worker.save();

    return await Worker.findById(worker._id).populate('user', 'username email status');
  }

  async updateWorker(id, workerData) {
    const worker = await this.checkNotSupervisor(id);

    Object.assign(worker, workerData);
    await worker.save();

    let user;
    if (worker.user) {
      user = await User.findById(worker.user);
    }
    if (!user) {
      const username = (workerData.username || worker.name.toLowerCase().replace(/\s+/g, '')).toLowerCase().trim();
      user = await User.findOne({ $or: [{ username }, { worker: worker._id }] });
    }

    if (!user) {
      const username = (workerData.username || worker.name.toLowerCase().replace(/\s+/g, '')).toLowerCase().trim();
      const rawPassword = workerData.password || 'Worker@123';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(rawPassword, salt);
      user = await User.create({
        username,
        email: worker.email || `${username}@factory.com`,
        password: hashedPassword,
        role: 'Worker',
        status: worker.status || 'Active',
        worker: worker._id
      });
      worker.user = user._id;
      await worker.save();
    } else {
      if (workerData.username && workerData.username.trim()) {
        user.username = workerData.username.toLowerCase().trim();
      }
      if (workerData.password && workerData.password.trim()) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(workerData.password.trim(), salt);
      }
      if (workerData.status) user.status = workerData.status;
      if (workerData.phone) user.phone = workerData.phone;
      if (workerData.email) user.email = workerData.email;
      if (workerData.department) user.department = workerData.department;
      user.role = 'Worker';
      user.worker = worker._id;
      await user.save();
      if (!worker.user) {
        worker.user = user._id;
        await worker.save();
      }
    }

    return await Worker.findById(worker._id).populate('user', 'username email status');
  }

  async toggleWorkerStatus(id, status) {
    const worker = await this.checkNotSupervisor(id);

    worker.status = status;
    await worker.save();

    if (worker.user) {
      await User.findByIdAndUpdate(worker.user, { status });
    } else {
      await User.updateMany({ worker: worker._id }, { status });
    }
    return worker;
  }

  async resetWorkerPassword(id, newPassword) {
    const worker = await this.checkNotSupervisor(id);

    const passToUse = (newPassword && newPassword.trim()) ? newPassword.trim() : 'Worker@123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passToUse, salt);

    let user;
    if (worker.user) {
      user = await User.findById(worker.user);
    }
    if (!user) {
      const username = worker.name.toLowerCase().replace(/\s+/g, '');
      user = await User.findOne({ $or: [{ username }, { worker: worker._id }] });
    }

    if (!user) {
      const username = worker.name.toLowerCase().replace(/\s+/g, '');
      user = await User.create({
        username,
        email: worker.email || `${username}@factory.com`,
        password: hashedPassword,
        role: 'Worker',
        status: worker.status || 'Active',
        worker: worker._id
      });
      worker.user = user._id;
      await worker.save();
    } else {
      user.password = hashedPassword;
      user.role = 'Worker';
      user.status = worker.status || 'Active';
      await user.save();
      if (!worker.user) {
        worker.user = user._id;
        await worker.save();
      }
    }

    return { message: `Password for ${worker.name} reset successfully` };
  }

  async deleteWorker(id) {
    const worker = await this.checkNotSupervisor(id);
    await Worker.findByIdAndDelete(worker._id);
    await User.deleteMany({ $or: [{ _id: worker.user }, { worker: worker._id }] });
    return true;
  }
}

module.exports = new WorkerService();
