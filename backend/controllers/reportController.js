const reportService = require('../services/reportService');

class ReportController {
  async getAllReports(req, res, next) {
    try {
      const reports = await reportService.getAllReports();
      res.status(200).json({ success: true, count: reports.length, data: reports });
    } catch (err) {
      next(err);
    }
  }

  async getReportById(req, res, next) {
    try {
      const report = await reportService.getReportById(req.params.id);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async createReport(req, res, next) {
    try {
      const report = await reportService.createReport(req.body);
      res.status(201).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async deleteReport(req, res, next) {
    try {
      await reportService.deleteReport(req.params.id);
      res.status(200).json({ success: true, data: {} });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportController();
