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

  async logAttendance(attendanceData) {
    const { worker, date, status } = attendanceData;
    const checkDate = date ? new Date(date) : new Date();
    const start = new Date(checkDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(checkDate);
    end.setHours(23, 59, 59, 999);

    let record = await Attendance.findOne({
      worker,
      date: { $gte: start, $lte: end }
    });

    if (record) {
      record.status = status;
      await record.save();
    } else {
      record = await Attendance.create({ worker, date: checkDate, status });
    }

    return record;
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

  async updateAttendance(id, attendanceData) {
    const record = await Attendance.findByIdAndUpdate(id, attendanceData, {
      new: true,
      runValidators: true
    }).populate('worker');
    if (!record) {
      const error = new Error('Attendance record not found');
      error.statusCode = 404;
      throw error;
    }
    return record;
  }

  async deleteAttendance(id) {
    const record = await Attendance.findByIdAndDelete(id);
    if (!record) {
      const error = new Error('Attendance record not found');
      error.statusCode = 404;
      throw error;
    }
    return true;
  }
}

module.exports = new AttendanceService();
