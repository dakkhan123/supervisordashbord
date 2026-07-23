const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const Worker = require('../models/Worker');

class AttendanceService {
  async getAllAttendance(queryParams) {
    const { worker, date, status } = queryParams || {};
    let query = {};
    if (worker) query.worker = worker;
    if (status) query.status = status;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    return await Attendance.find(query).populate('worker').sort({ date: -1 });
  }

  async getMyAttendance(workerId, queryParams) {
    const { month, year } = queryParams || {};
    let query = { worker: workerId };
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

  async createAttendance(data) {
    const record = await Attendance.create(data);
    const populated = await Attendance.findById(record._id).populate('worker');

    if (record.worker) {
      const workerObj = await Worker.findById(record.worker);
      await Notification.create({
        worker: record.worker,
        user: workerObj ? workerObj.user : null,
        title: 'Attendance Updated',
        message: `Attendance for ${new Date(record.date).toLocaleDateString()} marked as ${record.status}`,
        description: `Status: ${record.status}, Check-in: ${record.checkInTime || '-'}`,
        type: 'attendance'
      });
    }
    return populated;
  }

  async updateAttendance(id, data) {
    const record = await Attendance.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    }).populate('worker');

    if (!record) {
      const error = new Error('Attendance record not found');
      error.statusCode = 404;
      throw error;
    }

    if (record.worker) {
      const workerObj = await Worker.findById(record.worker);
      await Notification.create({
        worker: record.worker,
        user: workerObj ? workerObj.user : null,
        title: 'Attendance Updated',
        message: `Attendance log modified: ${record.status}`,
        type: 'attendance'
      });
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

