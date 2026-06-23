const Salary = require('../models/Salary');

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
}

module.exports = new SalaryService();
