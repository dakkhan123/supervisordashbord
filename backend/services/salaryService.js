const Salary = require('../models/Salary');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const Overtime = require('../models/Overtime');
const SalaryHistory = require('../models/SalaryHistory');
const Notification = require('../models/Notification');

function parseMonth(monthStr) {
  let year, monthIndex;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (monthStr && monthStr.match(/^\d{4}-\d{2}$/)) {
    const [y, m] = monthStr.split('-');
    year = parseInt(y, 10);
    monthIndex = parseInt(m, 10) - 1;
  } else if (monthStr && monthStr.includes(' ')) {
    const parts = monthStr.split(' ');
    const monthName = parts[0];
    year = parseInt(parts[1], 10) || new Date().getFullYear();
    monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    if (monthIndex === -1) monthIndex = new Date().getMonth();
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthIndex = now.getMonth();
  }

  const start = new Date(year, monthIndex, 1);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  const formattedMonth = `${monthNames[monthIndex]} ${year}`;

  return { start, end, totalDays, year, monthIndex, formattedMonth };
}

class SalaryService {
  async getAllSalaries(queryParams) {
    const { worker, month } = queryParams || {};
    let query = {};
    if (worker) query.worker = worker;
    if (month) query.month = month;
    return await Salary.find(query).populate('worker').sort({ createdAt: -1 });
  }

  async getMySalaries(workerId, queryParams) {
    const { month } = queryParams || {};
    let query = { worker: workerId };
    if (month) query.month = month;

    // Recalculate current month's salary automatically to ensure fresh state
    try {
      const targetMonth = month || `${new Date().toLocaleString('en-US', { month: 'long' })} ${new Date().getFullYear()}`;
      await this.recalculateAndSaveSalary(workerId, targetMonth, 'Auto_Worker_View');
    } catch (e) {
      console.error('Failed to auto-recalculate on getMySalaries', e);
    }

    return await Salary.find(query).populate('worker').sort({ createdAt: -1 });
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

  async setMonthlySalary(workerId, newSalary, monthStr = null) {
    const worker = await Worker.findById(workerId);
    if (!worker) {
      const error = new Error('Worker not found');
      error.statusCode = 404;
      throw error;
    }

    worker.salary = Number(newSalary);
    await worker.save();

    const targetMonth = monthStr || `${new Date().toLocaleString('en-US', { month: 'long' })} ${new Date().getFullYear()}`;
    return await this.recalculateAndSaveSalary(workerId, targetMonth, 'Supervisor_Set_Salary');
  }

  async calculateSalary(workerId, monthStr) {
    if (!workerId) {
      const error = new Error('Worker ID is required');
      error.statusCode = 400;
      throw error;
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      const error = new Error('Worker not found');
      error.statusCode = 404;
      throw error;
    }

    const { start, end, totalDays, formattedMonth } = parseMonth(monthStr);

    // 1. Monthly Salary & Per Day Salary
    const monthlySalary = worker.salary || 0;
    const perDaySalary = totalDays > 0 ? Number((monthlySalary / totalDays).toFixed(2)) : 0;

    // 2. Fetch Attendance Records for target month
    const attendanceRecords = await Attendance.find({
      worker: workerId,
      date: { $gte: start, $lte: end }
    });

    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let halfDays = 0;
    let lateCount = 0;
    let overtimeAttendanceCount = 0;

    attendanceRecords.forEach(rec => {
      if (rec.status === 'Present') {
        presentDays++;
      } else if (rec.status === 'Absent') {
        absentDays++;
      } else if (rec.status === 'Leave') {
        leaveDays++;
      } else if (rec.status === 'Half Day') {
        halfDays++;
      } else if (rec.status === 'Late') {
        presentDays++;
        lateCount++;
      } else if (rec.status === 'Overtime') {
        presentDays++;
        overtimeAttendanceCount++;
      }
    });

    // 3. Fetch Overtime collection records for month
    const approvedOvertimes = await Overtime.find({
      worker: workerId,
      date: { $gte: start, $lte: end },
      status: 'Approved'
    });

    let approvedOvertimeDays = 0;
    approvedOvertimes.forEach(ot => {
      approvedOvertimeDays += (ot.overtimeDays || 1);
    });

    const totalOvertimeDays = overtimeAttendanceCount + approvedOvertimeDays;

    // 4. Leave Policy:
    // Company rule: First 3 leave days in the month are exempted/free (0 deduction).
    // From 4th Leave onward: deduct 1 Full Per Day Salary for every additional Leave day.
    const exemptedLeaveDays = Math.min(leaveDays, 3);
    const chargeableLeaveDays = Math.max(0, leaveDays - 3);
    const leaveDeduction = Number((chargeableLeaveDays * perDaySalary).toFixed(2));

    // Absent Policy:
    // Absent days are unexcused (deducted at 1 full per day salary per absent day).
    const absentDeduction = Number((absentDays * perDaySalary).toFixed(2));

    // 5. Late Policy:
    // First 3 Late entries are fully excused.
    // From 4th Late onward: each Late = Half Day deduction (0.5 * perDaySalary).
    const excusedLateCount = Math.min(lateCount, 3);
    const chargeableLateCount = Math.max(0, lateCount - 3);
    const lateDeduction = Number((chargeableLateCount * 0.5 * perDaySalary).toFixed(2));

    // Half Day Deduction
    const halfDayDeduction = Number((halfDays * 0.5 * perDaySalary).toFixed(2));

    // 6. Overtime Policy:
    // Every Overtime Day earns Half of the Per Day Salary (perDaySalary / 2).
    const overtimePay = Number((totalOvertimeDays * (perDaySalary / 2)).toFixed(2));

    // 7. Payable Days & Final Net Salary:
    const payableDays = presentDays + (halfDays * 0.5) + exemptedLeaveDays;
    const baseEarnedSalary = Number((payableDays * perDaySalary).toFixed(2));
    const totalDeductions = Number((leaveDeduction + halfDayDeduction + lateDeduction + absentDeduction).toFixed(2));
    const finalSalary = Math.max(0, Number((baseEarnedSalary - lateDeduction + overtimePay).toFixed(2)));

    return {
      worker: {
        _id: worker._id,
        name: worker.name,
        employeeId: worker.employeeId,
        role: worker.role,
        department: worker.department,
        salary: worker.salary
      },
      month: formattedMonth,
      monthlySalary,
      totalDays,
      totalDaysInMonth: totalDays,
      perDaySalary,
      presentDays,
      absentDays,
      leaveDays,
      exemptedLeaveDays,
      chargeableLeaveDays,
      leaveDeduction,
      halfDays,
      halfDayDeduction,
      lateCount,
      excusedLateCount,
      chargeableLateCount,
      lateDeduction,
      overtimeDays: totalOvertimeDays,
      overtimePay,
      absentDeduction,
      deductions: totalDeductions,
      otherDeduction: 0,
      payableDays,
      baseEarnedSalary,
      finalSalary,
      amount: finalSalary,
      netSalary: finalSalary
    };
  }

  async recalculateAndSaveSalary(workerId, monthStr, updatedBy = 'System') {
    const calc = await this.calculateSalary(workerId, monthStr);
    const { formattedMonth } = parseMonth(monthStr);

    let salaryRecord = await Salary.findOne({ worker: workerId, month: formattedMonth });

    const updateData = {
      worker: workerId,
      month: formattedMonth,
      monthlySalary: calc.monthlySalary,
      baseSalary: calc.monthlySalary,
      basicSalary: calc.monthlySalary,
      totalDays: calc.totalDays,
      totalDaysInMonth: calc.totalDays,
      perDaySalary: calc.perDaySalary,
      presentDays: calc.presentDays,
      absentDays: calc.absentDays,
      leaveDays: calc.leaveDays,
      exemptedLeaveDays: calc.exemptedLeaveDays,
      chargeableLeaveDays: calc.chargeableLeaveDays,
      leaveDeduction: calc.leaveDeduction,
      halfDays: calc.halfDays,
      halfDayDeduction: calc.halfDayDeduction,
      otherDeduction: 0,
      payableDays: calc.payableDays,
      baseEarnedSalary: calc.baseEarnedSalary,
      excusedAbsentDays: calc.absentDays,
      chargeableAbsentDays: calc.absentDays,
      absentDeduction: calc.absentDeduction,
      lateCount: calc.lateCount,
      excusedLateCount: calc.excusedLateCount,
      chargeableLateCount: calc.chargeableLateCount,
      lateDeduction: calc.lateDeduction,
      overtimeDays: calc.overtimeDays,
      overtimePay: calc.overtimePay,
      deductions: calc.deductions,
      finalSalary: calc.finalSalary,
      amount: calc.finalSalary,
      netSalary: calc.finalSalary,
      status: salaryRecord ? salaryRecord.status : 'Pending',
      paymentStatus: salaryRecord ? salaryRecord.paymentStatus : 'Pending'
    };

    if (salaryRecord) {
      salaryRecord = await Salary.findByIdAndUpdate(salaryRecord._id, updateData, { new: true }).populate('worker');
    } else {
      salaryRecord = await Salary.create(updateData);
      salaryRecord = await Salary.findById(salaryRecord._id).populate('worker');
    }

    // Create audit history entry
    await SalaryHistory.create({
      worker: workerId,
      month: formattedMonth,
      monthlySalary: calc.monthlySalary,
      perDaySalary: calc.perDaySalary,
      totalDays: calc.totalDays,
      presentDays: calc.presentDays,
      absentDays: calc.absentDays,
      excusedAbsentDays: calc.excusedAbsentDays,
      chargeableAbsentDays: calc.chargeableAbsentDays,
      absentDeduction: calc.absentDeduction,
      lateCount: calc.lateCount,
      excusedLateCount: calc.excusedLateCount,
      chargeableLateCount: calc.chargeableLateCount,
      lateDeduction: calc.lateDeduction,
      overtimeDays: calc.overtimeDays,
      overtimePay: calc.overtimePay,
      finalSalary: calc.finalSalary,
      action: 'Recalculated',
      updatedBy
    });

    return salaryRecord;
  }

  async createSalary(salaryData) {
    const { worker, month } = salaryData;
    if (worker && month) {
      return await this.recalculateAndSaveSalary(worker, month, 'Supervisor_Manual_Create');
    }
    const log = await Salary.create(salaryData);
    return await Salary.findById(log._id).populate('worker');
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

    if (log.worker) {
      const workerObj = await Worker.findById(log.worker);
      await Notification.create({
        worker: log.worker,
        user: workerObj ? workerObj.user : null,
        title: 'Salary Record Updated',
        message: `Salary for ${log.month} is updated to ${log.status || log.paymentStatus}`,
        type: 'salary'
      });
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

  // Overtime Management Methods
  async approveOvertime(data) {
    const { worker, date, hours, overtimeDays, remarks, approvedBy } = data;
    const otRecord = await Overtime.create({
      worker,
      date: date ? new Date(date) : new Date(),
      hours: hours || 8,
      overtimeDays: overtimeDays || 1,
      status: 'Approved',
      approvedBy: approvedBy || 'Supervisor',
      remarks: remarks || 'Overtime approved by supervisor'
    });

    // Auto recalculate salary for the overtime month
    const targetMonth = date 
      ? `${new Date(date).toLocaleString('en-US', { month: 'long' })} ${new Date(date).getFullYear()}`
      : `${new Date().toLocaleString('en-US', { month: 'long' })} ${new Date().getFullYear()}`;

    await this.recalculateAndSaveSalary(worker, targetMonth, 'Overtime_Approved');
    return otRecord;
  }

  async getOvertimeHistory(workerId) {
    let query = {};
    if (workerId) query.worker = workerId;
    return await Overtime.find(query).populate('worker').sort({ date: -1 });
  }

  async getSalaryHistory(workerId) {
    let query = {};
    if (workerId) query.worker = workerId;
    return await SalaryHistory.find(query).populate('worker').sort({ createdAt: -1 });
  }
}

module.exports = new SalaryService();
