const attendanceService = require('../services/attendanceService');

class AttendanceController {
  async getAllAttendance(req, res, next) {
    try {
      const records = await attendanceService.getAllAttendance(req.query);
      res.status(200).json({ success: true, count: records.length, data: records });
    } catch (err) {
      next(err);
    }
  }

  async getAttendanceById(req, res, next) {
    try {
      const record = await attendanceService.getAttendanceById(req.params.id);
      res.status(200).json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AttendanceController();
