const Attendance = require('../models/Attendance');

class AttendanceService {
  async getAllAttendance(queryParams) {
    const { worker, date } = queryParams || {};
    let query = {};
    if (worker) query.worker = worker;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    return await Attendance.find(query).populate('worker').sort({ date: -1 });
  }

  async getAttendanceById(id) {
    const record = await Attendance.findById(id).populate('worker');
    if (!record) {
      const error = new Error('Attendance record not found');
      error.statusCode = 404;
      throw error;
    }
    return record;
  }
}

module.exports = new AttendanceService();
