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

  async checkIn(workerId, userId, details) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Find worker
    const workerObj = await Worker.findById(workerId);
    if (!workerObj) {
      const error = new Error('Worker profile not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if check-in already exists for today
    const existing = await Attendance.findOne({
      worker: workerId,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (existing) {
      const error = new Error('You have already checked in today.');
      error.statusCode = 400;
      throw error;
    }

    // Determine shift start time and late status
    const shift = details.shift || workerObj.shiftTiming || '9:00 AM - 6:00 PM';
    let isLate = false;
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Default shift start time: 9:00 AM
    let shiftStartHour = 9;
    let shiftStartMinute = 0;

    // Try parsing shift timing (e.g. "9:00 AM - 6:00 PM")
    try {
      const startTimeStr = shift.split('-')[0].trim(); // "9:00 AM"
      const parts = startTimeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (parts) {
        let h = parseInt(parts[1], 10);
        const m = parseInt(parts[2], 10);
        const ampm = parts[3].toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        shiftStartHour = h;
        shiftStartMinute = m;
      }
    } catch (e) {
      console.error('Failed to parse shift start time', e);
    }

    // Grace period of 15 minutes
    const graceTimeMinutes = shiftStartHour * 60 + shiftStartMinute + 15;
    const currentTimeMinutes = currentHours * 60 + currentMinutes;

    if (currentTimeMinutes > graceTimeMinutes) {
      isLate = true;
    }

    const attendanceType = isLate ? 'Late' : 'Present';
    const status = isLate ? 'Late' : 'Present';

    // Format current time as hh:mm AM/PM
    const formatTimeStr = (date) => {
      let hours = date.getHours();
      let minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      minutes = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${minutes} ${ampm}`;
    };

    const checkInTimeStr = formatTimeStr(now);

    const record = await Attendance.create({
      worker: workerId,
      user: userId,
      date: now,
      checkIn: now,
      checkInTime: checkInTimeStr,
      status,
      attendanceType,
      shift,
      supervisorName: 'Auto System',
      remarks: details.remarks || '',
      employeeId: workerObj.employeeId || '',
      employeeName: workerObj.name || '',
      role: workerObj.role || 'Worker',
      department: workerObj.department || 'Operations',
      site: details.site || workerObj.assignedSite || 'Pune Head Office',
      latitude: details.latitude,
      longitude: details.longitude,
      address: details.address || '',
      ipAddress: details.ipAddress || '',
      device: details.device || 'Desktop',
      checkInDetails: {
        time: now,
        location: details.address ? `${details.latitude},${details.longitude} (${details.address})` : `${details.latitude},${details.longitude}`,
        geofenceStatus: details.isWithinRange ? 'Within Range' : 'Out of Range',
        deviceId: details.device || 'Desktop',
        ipAddress: details.ipAddress || '',
        authMethod: 'Face ID'
      }
    });

    // Create Notification
    await Notification.create({
      worker: workerId,
      user: userId,
      title: 'Shift Checked In',
      message: `Checked in at ${checkInTimeStr} (${attendanceType})`,
      description: `GPS: ${details.latitude}, ${details.longitude} - Address: ${details.address || 'N/A'}`,
      type: 'attendance'
    });

    return await Attendance.findById(record._id).populate('worker');
  }

  async checkOut(workerId, userId, details) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Find today's attendance record
    const record = await Attendance.findOne({
      worker: workerId,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (!record) {
      const error = new Error('No check-in record found for today. Please check in first.');
      error.statusCode = 400;
      throw error;
    }

    if (record.checkOut) {
      const error = new Error('You have already checked out today.');
      error.statusCode = 400;
      throw error;
    }

    const now = new Date();
    const formatTimeStr = (date) => {
      let hours = date.getHours();
      let minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${minutes} ${ampm}`;
    };

    const checkOutTimeStr = formatTimeStr(now);
    record.checkOut = now;
    record.checkOutTime = checkOutTimeStr;

    // Calculate working hours
    const diffMs = now - record.checkIn;
    const workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // round to 2 decimals
    record.workingHours = workingHours;
    record.totalWorkedHours = workingHours;

    // If working hours < 4, attendance status becomes Half Day
    if (workingHours < 4) {
      record.status = 'Half Day';
      record.attendanceType = 'Half Day';
    }

    // Overtime
    if (workingHours > 8) {
      record.overtimeHours = Math.round((workingHours - 8) * 100) / 100;
    }

    record.checkOutDetails = {
      time: now,
      location: details.address ? `${details.latitude},${details.longitude} (${details.address})` : `${details.latitude},${details.longitude}`,
      geofenceStatus: details.isWithinRange ? 'Within Range' : 'Out of Range',
      deviceId: details.device || 'Desktop',
      ipAddress: details.ipAddress || '',
      authMethod: 'Face ID'
    };

    if (details.latitude) record.latitude = details.latitude;
    if (details.longitude) record.longitude = details.longitude;
    if (details.address) record.address = details.address;
    if (details.ipAddress) record.ipAddress = details.ipAddress;
    if (details.device) record.device = details.device;

    await record.save();

    // Create Notification
    await Notification.create({
      worker: workerId,
      user: userId,
      title: 'Shift Checked Out',
      message: `Checked out at ${checkOutTimeStr}. Total hours: ${workingHours} hrs.`,
      description: `Worked hours: ${workingHours} hrs. Overtime: ${record.overtimeHours} hrs.`,
      type: 'attendance'
    });

    return await Attendance.findById(record._id).populate('worker');
  }

  async getTodayAttendance(workerId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return await Attendance.findOne({
      worker: workerId,
      date: { $gte: todayStart, $lte: todayEnd }
    }).populate('worker');
  }

  async getAttendanceMonth(workerId, month, year) {
    const targetMonth = month ? parseInt(month, 10) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const records = await Attendance.find({
      worker: workerId,
      date: { $gte: start, $lte: end }
    });

    const presentCount = records.filter(r => r.status === 'Present').length;
    const lateCount = records.filter(r => r.status === 'Late').length;
    const halfDayCount = records.filter(r => r.status === 'Half Day').length;
    const leaveCount = records.filter(r => r.status === 'Leave').length;
    const absentCount = records.filter(r => r.status === 'Absent').length;

    const totalDaysMarked = presentCount + lateCount + halfDayCount + absentCount;
    const attendancePercentage = totalDaysMarked > 0 
      ? Math.round(((presentCount + lateCount + halfDayCount * 0.5) / totalDaysMarked) * 100) 
      : 0;

    let totalWorkingHours = 0;
    let totalOvertimeHours = 0;
    records.forEach(r => {
      totalWorkingHours += r.workingHours || 0;
      totalOvertimeHours += r.overtimeHours || 0;
    });

    const lastRecord = records.sort((a, b) => b.date - a.date)[0] || null;

    return {
      records,
      stats: {
        presentCount,
        lateCount,
        halfDayCount,
        leaveCount,
        absentCount,
        attendancePercentage,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        lastCheckIn: lastRecord ? lastRecord.checkInTime : '-',
        lastCheckOut: lastRecord ? lastRecord.checkOutTime : '-'
      }
    };
  }
}

module.exports = new AttendanceService();

