const salaryService = require('../services/salaryService');

class SalaryController {
  async getAllSalaries(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      if (userRole.toLowerCase() === 'worker') {
        const workerId = req.user.workerId;
        const logs = await salaryService.getMySalaries(workerId, req.query);
        return res.status(200).json({ success: true, count: logs.length, data: logs });
      }
      const logs = await salaryService.getAllSalaries(req.query);
      res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (err) {
      next(err);
    }
  }

  async getMySalaries(req, res, next) {
    try {
      const workerId = req.user ? req.user.workerId : req.query.workerId;
      const logs = await salaryService.getMySalaries(workerId, req.query);
      res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (err) {
      next(err);
    }
  }

  async calculateSalary(req, res, next) {
    try {
      const { worker, month } = req.query;
      const calc = await salaryService.calculateSalary(worker, month);
      res.status(200).json({ success: true, data: calc });
    } catch (err) {
      next(err);
    }
  }

  async setMonthlySalary(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      if (userRole.toLowerCase() === 'worker') {
        return res.status(403).json({ success: false, message: 'Access denied: Workers cannot edit salary' });
      }
      const { workerId, salary, month } = req.body;
      const log = await salaryService.setMonthlySalary(workerId, salary, month);
      res.status(200).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }

  async createSalary(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      if (userRole.toLowerCase() === 'worker') {
        return res.status(403).json({ success: false, message: 'Access denied: Workers cannot edit salary' });
      }
      const log = await salaryService.createSalary(req.body);
      res.status(201).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }

  async getSalaryById(req, res, next) {
    try {
      const log = await salaryService.getSalaryById(req.params.id);
      res.status(200).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }

  async updateSalary(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      if (userRole.toLowerCase() === 'worker') {
        return res.status(403).json({ success: false, message: 'Access denied: Workers cannot edit salary' });
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
      if (userRole.toLowerCase() === 'worker') {
        return res.status(403).json({ success: false, message: 'Access denied: Workers cannot delete salary' });
      }
      await salaryService.deleteSalary(req.params.id);
      res.status(200).json({ success: true, data: {} });
    } catch (err) {
      next(err);
    }
  }

  async approveOvertime(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      if (userRole.toLowerCase() === 'worker') {
        return res.status(403).json({ success: false, message: 'Access denied: Workers cannot approve overtime' });
      }
      const ot = await salaryService.approveOvertime(req.body);
      res.status(200).json({ success: true, data: ot });
    } catch (err) {
      next(err);
    }
  }

  async getOvertimeHistory(req, res, next) {
    try {
      const workerId = req.query.worker || (req.user ? req.user.workerId : null);
      const history = await salaryService.getOvertimeHistory(workerId);
      res.status(200).json({ success: true, count: history.length, data: history });
    } catch (err) {
      next(err);
    }
  }

  async getSalaryHistory(req, res, next) {
    try {
      const workerId = req.query.worker || (req.user ? req.user.workerId : null);
      const history = await salaryService.getSalaryHistory(workerId);
      res.status(200).json({ success: true, count: history.length, data: history });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SalaryController();
