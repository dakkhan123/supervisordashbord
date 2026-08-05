const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/role');

// All leave endpoints require authenticated JWT session
router.use(authMiddleware);

// Worker Endpoints
router.post('/request', leaveController.createLeaveRequest);
router.get('/my', leaveController.getMyLeaveRequests);
router.delete('/:id', leaveController.cancelLeaveRequest);

// Supervisor Endpoints
router.get('/all', authorize('Supervisor', 'Owner', 'Manager', 'Admin'), leaveController.getAllLeaveRequests);
router.put('/:id/approve', authorize('Supervisor', 'Owner', 'Manager', 'Admin'), leaveController.approveLeaveRequest);
router.put('/:id/reject', authorize('Supervisor', 'Owner', 'Manager', 'Admin'), leaveController.rejectLeaveRequest);

module.exports = router;
