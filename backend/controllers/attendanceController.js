const attendanceService = require('../services/attendanceService');

class AttendanceController {
  async getAllAttendance(req, res, next) {
    try {
      if (req.user && req.user.role && req.user.role.toLowerCase() === 'worker') {
        const workerId = req.user.workerId;
        const records = await attendanceService.getMyAttendance(workerId, req.query);
        return res.status(200).json({ success: true, count: records.length, data: records });
      }
      const records = await attendanceService.getAllAttendance(req.query);
      res.status(200).json({ success: true, count: records.length, data: records });
    } catch (err) {
      next(err);
    }
  }

  async getMyAttendance(req, res, next) {
    try {
      const workerId = req.user ? req.user.workerId : req.query.workerId;
      const records = await attendanceService.getMyAttendance(workerId, req.query);
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

  async createAttendance(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      const isAuthorized = userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'supervisor';
      if (!isAuthorized) {
        return res.status(403).json({ success: false, error: 'Only Supervisors can record attendance' });
      }
      const record = await attendanceService.createAttendance(req.body);
      res.status(201).json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  }

  async updateAttendance(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      const isAuthorized = userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'supervisor';
      if (!isAuthorized) {
        return res.status(403).json({ success: false, error: 'Only Supervisors can modify attendance' });
      }
      const record = await attendanceService.updateAttendance(req.params.id, req.body);
      res.status(200).json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  }

  async deleteAttendance(req, res, next) {
    try {
      await attendanceService.deleteAttendance(req.params.id);
      res.status(200).json({ success: true, data: {} });
    } catch (err) {
      next(err);
    }
  }

  async checkIn(req, res, next) {
    try {
      const workerId = req.user ? req.user.workerId : null;
      const userId = req.user ? req.user.id : null;
      if (!workerId) {
        return res.status(400).json({ success: false, error: 'No linked worker profile found for this user.' });
      }
      const record = await attendanceService.checkIn(workerId, userId, req.body);
      res.status(200).json({ success: true, data: record });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Server Error' });
    }
  }

  async checkOut(req, res, next) {
    try {
      const workerId = req.user ? req.user.workerId : null;
      const userId = req.user ? req.user.id : null;
      if (!workerId) {
        return res.status(400).json({ success: false, error: 'No linked worker profile found for this user.' });
      }
      const record = await attendanceService.checkOut(workerId, userId, req.body);
      res.status(200).json({ success: true, data: record });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Server Error' });
    }
  }

  async getTodayAttendance(req, res, next) {
    try {
      const workerId = req.user ? req.user.workerId : null;
      if (!workerId) {
        return res.status(200).json({ success: true, data: null });
      }
      const record = await attendanceService.getTodayAttendance(workerId);
      res.status(200).json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  }

  async getAttendanceMonth(req, res, next) {
    try {
      const workerId = req.user ? req.user.workerId : req.query.workerId;
      if (!workerId) {
        return res.status(400).json({ success: false, error: 'Worker ID is required.' });
      }
      const result = await attendanceService.getAttendanceMonth(workerId, req.query.month, req.query.year);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getAttendanceReport(req, res, next) {
    try {
      const records = await attendanceService.getAllAttendance(req.query);
      res.status(200).json({ success: true, count: records.length, data: records });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AttendanceController();

