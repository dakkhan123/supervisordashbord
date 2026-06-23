const Report = require('../models/Report');

class ReportService {
  async getAllReports() {
    return await Report.find().sort({ createdAt: -1 });
  }

  async getReportById(id) {
    const report = await Report.findById(id);
    if (!report) {
      const error = new Error('Report not found');
      error.statusCode = 404;
      throw error;
    }
    return report;
  }

  async createReport(reportData) {
    return await Report.create(reportData);
  }

  async deleteReport(id) {
    const report = await Report.findByIdAndDelete(id);
    if (!report) {
      const error = new Error('Report not found');
      error.statusCode = 404;
      throw error;
    }
    return true;
  }
}

module.exports = new ReportService();
