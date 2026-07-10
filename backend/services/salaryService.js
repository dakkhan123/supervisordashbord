const Salary = require('../models/Salary');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');

class SalaryService {
  async getAllSalaries(queryParams) {
    const { worker, month } = queryParams || {};
    let query = {};
    if (worker) query.worker = worker;
    if (month) query.month = month;
    return await Salary.find(query).populate('worker').sort({ createdAt: -1 });
  }

  async createSalary(salaryData) {
    return await Salary.create(salaryData);
  }

  async getSalaryById(id) {
    const log = await Salary.findById(id).populate('worker');
    if (!log) {
      const error = new Error('Salary record not found');
      error.statusCode = 404;
      throw error;
    }
    return log;
  }

  async updateSalary(id, salaryData) {
    const log = await Salary.findByIdAndUpdate(id, salaryData, {
      new: true,
      runValidators: true
    }).populate('worker');
    if (!log) {
      const error = new Error('Salary record not found');
      error.statusCode = 404;
      throw error;
    }
    return log;
  }

  async deleteSalary(id) {
    const log = await Salary.findByIdAndDelete(id);
    if (!log) {
      const error = new Error('Salary record not found');
      error.statusCode = 404;
      throw error;
    }
    return true;
  }

  async calculateSalary(workerId, monthStr) {
    if (!workerId || !monthStr) {
      const error = new Error('Worker ID and Month are required');
      error.statusCode = 400;
      throw error;
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      const error = new Error('Worker not found');
      error.statusCode = 404;
      throw error;
    }

    // Parse monthStr (e.g. "June 2026" or "2026-06") to range
    let start, end;
    if (monthStr.match(/^\d{4}-\d{2}$/)) {
      const [y, m] = monthStr.split('-');
      const year = parseInt(y);
      const monthIndex = parseInt(m) - 1;
      start = new Date(year, monthIndex, 1);
      end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    } else {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const parts = monthStr.split(' ');
      const monthName = parts[0];
      const year = parseInt(parts[1]) || new Date().getFullYear();
      let monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
      if (monthIndex === -1) {
        monthIndex = new Date().getMonth();
      }
      start = new Date(year, monthIndex, 1);
      end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    }

    // Fetch Attendance
    const attendanceRecords = await Attendance.find({
      worker: workerId,
      date: { $gte: start, $lte: end }
    });

    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;

    attendanceRecords.forEach(record => {
      if (record.status === 'Present') presentDays++;
      else if (record.status === 'Absent') absentDays++;
      else if (record.status === 'Leave') leaveDays++;
    });

    // Fetch Completed Tasks in this month range
    const completedTasks = await Task.find({
      assignedTo: workerId,
      status: 'Completed',
      updatedAt: { $gte: start, $lte: end }
    });
    const tasksCount = completedTasks.length;

    // Default calculations
    const baseSalary = worker.salary || 0;
    const tasksCompleted = tasksCount;
    const tasksIncentive = tasksCompleted * 100; // default ₹100 per completed task
    const overtimeHours = 0;
    const overtimeRate = 150; // default ₹150/hour
    const deductions = absentDays * 100; // default ₹100 per absent day
    const advances = 0;
    const amount = Math.max(0, baseSalary + tasksIncentive + (overtimeHours * overtimeRate) - deductions - advances);

    return {
      worker: {
        _id: worker._id,
        name: worker.name,
        role: worker.role,
        salary: worker.salary
      },
      month: monthStr,
      attendance: {
        present: presentDays,
        absent: absentDays,
        leave: leaveDays,
        totalLogged: attendanceRecords.length
      },
      calculations: {
        baseSalary,
        tasksCompleted,
        tasksIncentive,
        overtimeHours,
        overtimeRate,
        deductions,
        advances,
        amount
      }
    };
  }
}

module.exports = new SalaryService();

