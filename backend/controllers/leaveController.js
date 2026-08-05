const LeaveRequest = require('../models/LeaveRequest');
const Worker = require('../models/Worker');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');

class LeaveController {
  // Worker: Submit new leave request
  async createLeaveRequest(req, res, next) {
    try {
      const { leaveType, reason, fromDate, toDate, halfDaySession, attachment } = req.body;

      if (!leaveType || !reason || !fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'Leave Type, Reason, From Date, and To Date are mandatory fields.'
        });
      }

      if (leaveType === 'Half Day Leave' && (!halfDaySession || halfDaySession === 'N/A')) {
        return res.status(400).json({
          success: false,
          error: 'Half Day Session (First Half / Second Half) must be selected for Half Day Leave.'
        });
      }

      // Identify Worker profile
      let workerId = req.user.worker;
      if (!workerId) {
        const workerDoc = await Worker.findOne({ user: req.user.id });
        if (workerDoc) workerId = workerDoc._id;
      }

      if (!workerId) {
        return res.status(400).json({
          success: false,
          error: 'No active Worker profile associated with this account.'
        });
      }

      const worker = await Worker.findById(workerId);
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);

      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          error: 'From Date cannot be later than To Date.'
        });
      }

      const leaveReq = await LeaveRequest.create({
        workerId: worker._id,
        leaveType,
        reason: reason.trim(),
        fromDate: startDate,
        toDate: endDate,
        halfDaySession: leaveType === 'Half Day Leave' ? halfDaySession : 'N/A',
        attachment: attachment ? attachment.trim() : '',
        status: 'Pending'
      });

      // Dispatch Notification to Supervisors
      try {
        const supervisors = await User.find({ role: { $in: ['Supervisor', 'Owner', 'Manager', 'Admin'] } });
        const notifPromises = supervisors.map(sup => 
          Notification.create({
            user: sup._id,
            title: `✉️ New Leave Request from ${worker ? worker.name : 'Worker'}`,
            message: `${leaveType} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}): "${reason.trim()}"`,
            description: `${leaveType} requested by ${worker ? worker.name : 'Worker'}`,
            type: 'leave_request',
            itemId: leaveReq._id.toString()
          })
        );
        await Promise.all(notifPromises);
      } catch (notifErr) {
        console.error('Error dispatching leave request notification:', notifErr);
      }

      const populatedReq = await LeaveRequest.findById(leaveReq._id).populate('workerId', 'name employeeId department phone');

      res.status(201).json({
        success: true,
        message: 'Leave request submitted successfully!',
        data: populatedReq
      });
    } catch (err) {
      next(err);
    }
  }

  // Worker: Get own leave requests
  async getMyLeaveRequests(req, res, next) {
    try {
      let workerId = req.user.worker;
      if (!workerId) {
        const workerDoc = await Worker.findOne({ user: req.user.id });
        if (workerDoc) workerId = workerDoc._id;
      }

      if (!workerId) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }

      const requests = await LeaveRequest.find({ workerId })
        .populate('workerId', 'name employeeId department phone')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: requests.length,
        data: requests
      });
    } catch (err) {
      next(err);
    }
  }

  // Supervisor: Get all worker leave requests
  async getAllLeaveRequests(req, res, next) {
    try {
      const requests = await LeaveRequest.find()
        .populate('workerId', 'name employeeId department phone email role')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: requests.length,
        data: requests
      });
    } catch (err) {
      next(err);
    }
  }

  // Supervisor: Approve Leave Request
  async approveLeaveRequest(req, res, next) {
    try {
      const { comment } = req.body;
      const leaveReq = await LeaveRequest.findById(req.params.id).populate('workerId');

      if (!leaveReq) {
        return res.status(404).json({
          success: false,
          error: 'Leave request not found.'
        });
      }

      if (leaveReq.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          error: `Cannot approve request that is already ${leaveReq.status}.`
        });
      }

      leaveReq.status = 'Approved';
      leaveReq.supervisorComment = comment ? comment.trim() : 'Approved by supervisor.';
      await leaveReq.save();

      // ATTENDANCE INTEGRATION: Update Attendance records for each day in range
      const curr = new Date(leaveReq.fromDate);
      const end = new Date(leaveReq.toDate);
      const attendanceStatus = leaveReq.leaveType === 'Half Day Leave' ? 'Half Day' : 'Leave';
      const remarkText = leaveReq.leaveType === 'Half Day Leave'
        ? `Approved Half Day Leave (${leaveReq.halfDaySession})`
        : 'Approved Full Day Leave';

      while (curr <= end) {
        const dayStart = new Date(curr);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(curr);
        dayEnd.setHours(23, 59, 59, 999);

        let att = await Attendance.findOne({
          worker: leaveReq.workerId._id,
          date: { $gte: dayStart, $lte: dayEnd }
        });

        if (!att) {
          att = new Attendance({
            worker: leaveReq.workerId._id,
            user: leaveReq.workerId.user || undefined,
            date: new Date(curr),
            status: attendanceStatus,
            attendanceType: attendanceStatus,
            remarks: remarkText,
            employeeName: leaveReq.workerId.name || '',
            department: leaveReq.workerId.department || 'Operations'
          });
        } else {
          att.status = attendanceStatus;
          att.attendanceType = attendanceStatus;
          att.remarks = remarkText;
        }

        await att.save();
        curr.setDate(curr.getDate() + 1);
      }

      // NOTIFICATION TO WORKER
      try {
        if (leaveReq.workerId.user) {
          await Notification.create({
            user: leaveReq.workerId.user,
            worker: leaveReq.workerId._id,
            title: '✅ Leave Request Approved',
            message: `Your ${leaveReq.leaveType} request (${new Date(leaveReq.fromDate).toLocaleDateString()} - ${new Date(leaveReq.toDate).toLocaleDateString()}) has been APPROVED.`,
            description: `Supervisor comment: ${leaveReq.supervisorComment}`,
            type: 'leave_approved',
            itemId: leaveReq._id.toString()
          });
        }
      } catch (notifErr) {
        console.error('Error dispatching approval notification to worker:', notifErr);
      }

      const updatedReq = await LeaveRequest.findById(leaveReq._id).populate('workerId', 'name employeeId department phone');

      res.status(200).json({
        success: true,
        message: 'Leave request approved and attendance updated automatically.',
        data: updatedReq
      });
    } catch (err) {
      next(err);
    }
  }

  // Supervisor: Reject Leave Request
  async rejectLeaveRequest(req, res, next) {
    try {
      const comment = req.body.comment || req.body.supervisorComment;

      if (!comment || !comment.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Supervisor comment is mandatory when rejecting a leave request.'
        });
      }

      const leaveReq = await LeaveRequest.findById(req.params.id).populate('workerId');

      if (!leaveReq) {
        return res.status(404).json({
          success: false,
          error: 'Leave request not found.'
        });
      }

      if (leaveReq.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          error: `Cannot reject request that is already ${leaveReq.status}.`
        });
      }

      leaveReq.status = 'Rejected';
      leaveReq.supervisorComment = comment.trim();
      await leaveReq.save();

      // NOTIFICATION TO WORKER
      try {
        if (leaveReq.workerId.user) {
          await Notification.create({
            user: leaveReq.workerId.user,
            worker: leaveReq.workerId._id,
            title: '❌ Leave Request Rejected',
            message: `Your ${leaveReq.leaveType} request (${new Date(leaveReq.fromDate).toLocaleDateString()}) was REJECTED.`,
            description: `Reason: ${comment.trim()}`,
            type: 'leave_rejected',
            itemId: leaveReq._id.toString()
          });
        }
      } catch (notifErr) {
        console.error('Error dispatching rejection notification to worker:', notifErr);
      }

      const updatedReq = await LeaveRequest.findById(leaveReq._id).populate('workerId', 'name employeeId department phone');

      res.status(200).json({
        success: true,
        message: 'Leave request rejected.',
        data: updatedReq
      });
    } catch (err) {
      next(err);
    }
  }

  // Worker: Cancel pending leave request
  async cancelLeaveRequest(req, res, next) {
    try {
      const leaveReq = await LeaveRequest.findById(req.params.id);

      if (!leaveReq) {
        return res.status(404).json({
          success: false,
          error: 'Leave request not found.'
        });
      }

      if (leaveReq.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          error: 'Only pending leave requests can be cancelled.'
        });
      }

      await LeaveRequest.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Leave request cancelled successfully.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LeaveController();
