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

  async getBranchForUser(requestingUser) {
    if (!requestingUser) return 'Pune Head Office';
    if (requestingUser.branch) return requestingUser.branch;
    if (requestingUser.unit) return requestingUser.unit;
    if (requestingUser.id || requestingUser._id) {
      const u = await User.findById(requestingUser.id || requestingUser._id);
      if (u && (u.branch || u.unit)) return u.branch || u.unit;
    }
    return 'Pune Head Office';
  }

  async getAllWorkers(queryParams, requestingUser) {
    const { status } = queryParams || {};
    // Strict Filter: Workers API MUST ONLY return records with role = 'Worker'
    // Exclude all Supervisor, Admin, Owner, and Manager accounts
    let query = {
      role: { $nin: ['Supervisor', 'Admin', 'Owner', 'Manager'] }
    };

    if (requestingUser) {
      const roleLower = (requestingUser.role || '').toLowerCase();
      if (roleLower === 'supervisor' || roleLower === 'manager') {
        const userBranch = await this.getBranchForUser(requestingUser);
        query.$or = [{ branch: userBranch }, { assignedSite: userBranch }];
      }
    }

    if (status && status !== 'All') {
      query.status = status;
    }
    const workers = await Worker.find(query).populate('user', 'username email status role branch unit').sort({ createdAt: -1 });

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

  async generateUniqueEmployeeId(preferredId = null) {
    if (preferredId && preferredId.trim()) {
      const cleanId = preferredId.trim();
      const existingUser = await User.findOne({ employeeId: cleanId });
      const existingWorker = await Worker.findOne({ employeeId: cleanId });
      if (!existingUser && !existingWorker) {
        return cleanId;
      }
    }

    const users = await User.find({ employeeId: { $regex: /^EMP-\d+$/i } }, 'employeeId');
    const workers = await Worker.find({ employeeId: { $regex: /^EMP-\d+$/i } }, 'employeeId');

    let maxNum = 1000;
    const allDocs = [...users, ...workers];
    for (const doc of allDocs) {
      if (doc.employeeId) {
        const match = doc.employeeId.match(/^EMP-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    let nextId = `EMP-${maxNum + 1}`;
    while (
      (await User.findOne({ employeeId: nextId })) ||
      (await Worker.findOne({ employeeId: nextId }))
    ) {
      maxNum++;
      nextId = `EMP-${maxNum + 1}`;
    }

    return nextId;
  }

  async createWorker(workerData) {
    // If workerData attempts to set role to Supervisor, prevent privilege escalation
    if (workerData.role && workerData.role.toLowerCase() === 'supervisor') {
      const error = new Error('Access denied: Cannot create supervisor accounts via worker endpoints.');
      error.statusCode = 403;
      throw error;
    }

    const uniqueEmpId = await this.generateUniqueEmployeeId(workerData.employeeId);
    workerData.employeeId = uniqueEmpId;
    if (!workerData.department || !workerData.department.trim()) {
      workerData.department = 'Operations';
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
        name: workerData.name || workerData.fullName || '',
        username,
        email: workerData.email || `${username}@factory.com`,
        employeeId: uniqueEmpId,
        password: hashedPassword,
        role: 'Worker',
        department: workerData.department || 'Operations',
        branch: workerData.branch || workerData.assignedSite || 'Pune Head Office',
        unit: workerData.branch || workerData.assignedSite || 'Pune Head Office',
        phone: workerData.phone || workerData.mobile || '',
        address: workerData.address || '',
        dateOfBirth: workerData.dateOfBirth ? new Date(workerData.dateOfBirth) : undefined,
        dateOfJoining: (workerData.dateOfJoining || workerData.joiningDate) ? new Date(workerData.dateOfJoining || workerData.joiningDate) : new Date(),
        photo: workerData.photo || '',
        status: workerData.status || 'Active',
        worker: worker._id
      });
    } else {
      user.worker = worker._id;
      user.role = 'Worker';
      user.status = workerData.status || 'Active';
      if (!user.employeeId) user.employeeId = uniqueEmpId;
      if (workerData.name || workerData.fullName) user.name = (workerData.name || workerData.fullName).trim();
      if (workerData.branch || workerData.assignedSite) {
        user.branch = workerData.branch || workerData.assignedSite;
        user.unit = workerData.branch || workerData.assignedSite;
      }
      if (workerData.address) user.address = workerData.address;
      if (workerData.photo) user.photo = workerData.photo;
      if (workerData.dateOfBirth) user.dateOfBirth = new Date(workerData.dateOfBirth);
      if (workerData.dateOfJoining || workerData.joiningDate) user.dateOfJoining = new Date(workerData.dateOfJoining || workerData.joiningDate);
      if (workerData.password && workerData.password.trim()) {
        user.password = hashedPassword;
      }
      await user.save();
    }

    worker.user = user._id;
    if (!worker.employeeId) worker.employeeId = user.employeeId || uniqueEmpId;
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
      if (workerData.name || workerData.fullName) user.name = (workerData.name || workerData.fullName).trim();
      if (workerData.status) user.status = workerData.status;
      if (workerData.phone || workerData.mobile) user.phone = workerData.phone || workerData.mobile;
      if (workerData.email) user.email = workerData.email;
      if (workerData.department) user.department = workerData.department;
      if (workerData.branch || workerData.assignedSite) {
        user.branch = workerData.branch || workerData.assignedSite;
        user.unit = workerData.branch || workerData.assignedSite;
      }
      if (workerData.address) user.address = workerData.address;
      if (workerData.photo) user.photo = workerData.photo;
      if (workerData.dateOfBirth) user.dateOfBirth = new Date(workerData.dateOfBirth);
      if (workerData.dateOfJoining || workerData.joiningDate) user.dateOfJoining = new Date(workerData.dateOfJoining || workerData.joiningDate);
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
    const error = new Error('Access Denied: Supervisors are not authorized to reset worker passwords directly.');
    error.statusCode = 403;
    throw error;
  }

  async deleteWorker(id) {
    const worker = await this.checkNotSupervisor(id);
    await Worker.findByIdAndDelete(worker._id);
    if (worker.user) {
      await User.findByIdAndDelete(worker.user);
    }
    return { message: 'Worker deleted successfully' };
  }

  // Pending Worker Registration Methods
  async getPendingRegistrations(requestingUser) {
    const PendingWorker = require('../models/PendingWorker');
    let query = { status: 'Pending' };

    if (requestingUser) {
      const roleLower = (requestingUser.role || '').toLowerCase();
      if (roleLower === 'supervisor' || roleLower === 'manager') {
        const userBranch = await this.getBranchForUser(requestingUser);
        query.branch = userBranch;
      }
    }

    return await PendingWorker.find(query).sort({ createdAt: -1 });
  }

  async approveRegistration(pendingId, salary, requestingUser) {
    const PendingWorker = require('../models/PendingWorker');
    const emailService = require('../utils/emailService');

    const numSalary = Number(salary);
    if (isNaN(numSalary) || numSalary <= 0) {
      const error = new Error('Monthly Salary is required and must be a positive number.');
      error.statusCode = 400;
      throw error;
    }

    const pending = await PendingWorker.findById(pendingId);
    if (!pending) {
      const error = new Error('Pending worker registration request not found.');
      error.statusCode = 404;
      throw error;
    }

    if (requestingUser) {
      const roleLower = (requestingUser.role || '').toLowerCase();
      if (roleLower === 'supervisor' || roleLower === 'manager') {
        const userBranch = await this.getBranchForUser(requestingUser);
        const pendingBranch = pending.branch || 'Pune Head Office';
        if (userBranch !== pendingBranch) {
          const error = new Error('Access Denied: You can only approve worker registration requests for your assigned branch.');
          error.statusCode = 403;
          throw error;
        }
      }
    }

    if (pending.status !== 'Pending') {
      const error = new Error(`Registration request is already ${pending.status}.`);
      error.statusCode = 400;
      throw error;
    }

    const targetBranch = pending.branch || 'Pune Head Office';
    const approvedEmpId = await this.generateUniqueEmployeeId();

    // Check if user already exists
    let user = await User.findOne({
      $or: [{ username: pending.username }, { email: pending.email }]
    });

    if (!user) {
      user = await User.create({
        username: pending.username,
        email: pending.email,
        employeeId: approvedEmpId,
        password: pending.passwordHash,
        phone: pending.mobile,
        department: pending.department,
        branch: targetBranch,
        unit: targetBranch,
        role: 'Worker',
        status: 'Active',
        isEmailVerified: true
      });
    } else {
      user.status = 'Active';
      user.role = 'Worker';
      if (!user.employeeId) user.employeeId = approvedEmpId;
      user.branch = targetBranch;
      user.unit = targetBranch;
      user.isEmailVerified = true;
      user.password = pending.passwordHash;
      await user.save();
    }

    // Create Worker Profile
    let worker = await Worker.findOne({ $or: [{ user: user._id }, { email: pending.email }] });
    if (!worker) {
      worker = await Worker.create({
        name: pending.fullName,
        email: pending.email,
        username: pending.username,
        employeeId: user.employeeId || approvedEmpId,
        phone: pending.mobile,
        salary: numSalary,
        department: pending.department,
        branch: targetBranch,
        assignedSite: targetBranch,
        dateOfJoining: pending.joiningDate || new Date(),
        dateOfBirth: pending.dateOfBirth,
        address: pending.address || '',
        photo: pending.photo || '',
        status: 'Active',
        user: user._id,
        role: 'Worker'
      });
    } else {
      worker.name = pending.fullName;
      worker.salary = numSalary;
      if (!worker.employeeId) worker.employeeId = user.employeeId || approvedEmpId;
      worker.department = pending.department;
      worker.branch = targetBranch;
      worker.assignedSite = targetBranch;
      worker.status = 'Active';
      worker.user = user._id;
      await worker.save();
    }

    user.worker = worker._id;
    await user.save();

    // Update PendingWorker Document
    pending.status = 'Approved';
    pending.salary = numSalary;
    await pending.save();

    // Dispatch Approval Email & Notification
    try {
      await emailService.sendRegistrationApprovedEmail(pending.email, pending.fullName, numSalary);
    } catch (emailErr) {
      console.error('Failed to send approval email:', emailErr);
    }

    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        user: user._id,
        worker: worker._id,
        title: '🎉 Worker Registration Approved!',
        message: `Your registration request has been approved by your Supervisor. Assigned Monthly Salary: ₹${numSalary.toLocaleString('en-IN')}.`,
        description: `Account Activated. You can now log in to the Worker Console.`,
        type: 'approval',
        itemId: worker._id.toString()
      });
    } catch (notifErr) {
      console.error('Failed to create worker approval notification:', notifErr);
    }

    return {
      message: 'Worker registration approved and activated successfully!',
      user,
      worker
    };
  }

  async rejectRegistration(pendingId, rejectionReason, requestingUser) {
    const PendingWorker = require('../models/PendingWorker');
    const emailService = require('../utils/emailService');

    if (!rejectionReason || !rejectionReason.trim()) {
      const error = new Error('Supervisor comment/reason is mandatory when rejecting a worker registration request.');
      error.statusCode = 400;
      throw error;
    }

    const pending = await PendingWorker.findById(pendingId);
    if (!pending) {
      const error = new Error('Pending worker registration request not found.');
      error.statusCode = 404;
      throw error;
    }

    if (requestingUser) {
      const roleLower = (requestingUser.role || '').toLowerCase();
      if (roleLower === 'supervisor' || roleLower === 'manager') {
        const userBranch = await this.getBranchForUser(requestingUser);
        const pendingBranch = pending.branch || 'Pune Head Office';
        if (userBranch !== pendingBranch) {
          const error = new Error('Access Denied: You can only reject worker registration requests for your assigned branch.');
          error.statusCode = 403;
          throw error;
        }
      }
    }

    if (pending.status !== 'Pending') {
      const error = new Error(`Registration request is already ${pending.status}.`);
      error.statusCode = 400;
      throw error;
    }

    pending.status = 'Rejected';
    pending.rejectionReason = rejectionReason.trim();
    await pending.save();

    // Dispatch Rejection Email
    try {
      await emailService.sendRegistrationRejectedEmail(pending.email, pending.fullName, pending.rejectionReason);
    } catch (emailErr) {
      console.error('Failed to send rejection email:', emailErr);
    }

    return {
      message: 'Worker registration request rejected.',
      pending
    };
  }
}

module.exports = new WorkerService();
