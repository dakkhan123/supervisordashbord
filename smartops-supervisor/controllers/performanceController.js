const performanceService = require('../services/performanceService');

class PerformanceController {
  async getKPISummary(req, res, next) {
    try {
      const { from, to } = req.query;
      const data = await performanceService.getKPISummary(from, to);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getWorkerPerformance(req, res, next) {
    try {
      const { from, to } = req.query;
      const data = await performanceService.getWorkerPerformance(from, to);
      res.status(200).json({ success: true, count: data.length, data });
    } catch (err) {
      next(err);
    }
  }

  async getTaskTrend(req, res, next) {
    try {
      const { from, to, granularity } = req.query;
      const data = await performanceService.getTaskTrend(from, to, granularity);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getAttendanceHeatmap(req, res, next) {
    try {
      const { from, to } = req.query;
      const data = await performanceService.getAttendanceHeatmap(from, to);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getTaskDistribution(req, res, next) {
    try {
      const { from, to } = req.query;
      const data = await performanceService.getTaskDistribution(from, to);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getExportData(req, res, next) {
    try {
      const { from, to } = req.query;
      const data = await performanceService.getExportData(from, to);
      res.status(200).json({ success: true, count: data.length, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PerformanceController();
