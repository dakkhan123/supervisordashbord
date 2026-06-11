const historyService = require('../services/historyService');

class HistoryController {
  async getHistoryLogs(req, res, next) {
    try {
      const logs = await historyService.getHistoryLogs(req.query);
      res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (err) {
      next(err);
    }
  }

  async createLog(req, res, next) {
    try {
      const log = await historyService.createLog(req.body);
      res.status(201).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new HistoryController();
