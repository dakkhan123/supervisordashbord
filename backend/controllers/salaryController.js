const salaryService = require('../services/salaryService');

class SalaryController {
  async getAllSalaries(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      if (userRole.toLowerCase() !== 'owner' && userRole.toLowerCase() !== 'supervisor') {
        return res.status(403).json({ success: false, message: 'Access denied: Cannot view salaries' });
      }
      const logs = await salaryService.getAllSalaries(req.query);
      res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (err) {
      next(err);
    }
  }

  async calculateSalary(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      if (userRole.toLowerCase() !== 'owner' && userRole.toLowerCase() !== 'supervisor') {
        return res.status(403).json({ success: false, message: 'Access denied: Cannot calculate salary' });
      }
      const { worker, month } = req.query;
      const calc = await salaryService.calculateSalary(worker, month);
      res.status(200).json({ success: true, data: calc });
    } catch (err) {
      next(err);
    }
  }

  async createSalary(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      if (userRole.toLowerCase() !== 'owner' && userRole.toLowerCase() !== 'supervisor') {
        return res.status(403).json({ success: false, message: 'Access denied: Cannot create salary' });
      }
      const log = await salaryService.createSalary(req.body);
      res.status(201).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }

  async getSalaryById(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      if (userRole.toLowerCase() !== 'owner' && userRole.toLowerCase() !== 'supervisor') {
        return res.status(403).json({ success: false, message: 'Access denied: Cannot view salary' });
      }
      const log = await salaryService.getSalaryById(req.params.id);
      res.status(200).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }

  async updateSalary(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      if (userRole.toLowerCase() !== 'owner' && userRole.toLowerCase() !== 'supervisor') {
        return res.status(403).json({ message: 'Access denied: Cannot edit salary' });
      }
      const log = await salaryService.updateSalary(req.params.id, req.body);
      res.status(200).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }

  async deleteSalary(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      if (userRole.toLowerCase() !== 'owner' && userRole.toLowerCase() !== 'supervisor') {
        return res.status(403).json({ success: false, message: 'Access denied: Cannot delete salary' });
      }
      await salaryService.deleteSalary(req.params.id);
      res.status(200).json({ success: true, data: {} });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SalaryController();

