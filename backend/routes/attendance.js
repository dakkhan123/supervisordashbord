const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const workerController = require('../controllers/workerController');

const attendanceRouter = express.Router();
attendanceRouter.get('/my-attendance', attendanceController.getMyAttendance);
attendanceRouter.post('/checkin', attendanceController.checkIn);
attendanceRouter.post('/checkout', attendanceController.checkOut);
attendanceRouter.get('/today', attendanceController.getTodayAttendance);
attendanceRouter.get('/history', attendanceController.getAllAttendance);
attendanceRouter.get('/month', attendanceController.getAttendanceMonth);
attendanceRouter.get('/report', attendanceController.getAttendanceReport);
attendanceRouter.put('/update', attendanceController.updateAttendance);
attendanceRouter.delete('/delete/:id', attendanceController.deleteAttendance);

attendanceRouter.route('/')
  .get(attendanceController.getAllAttendance)
  .post(attendanceController.createAttendance);

attendanceRouter.route('/:id')
  .get(attendanceController.getAttendanceById)
  .put(attendanceController.updateAttendance)
  .delete(attendanceController.deleteAttendance);


const workersRouter = express.Router();
workersRouter.route('/')
  .get(workerController.getAllWorkers)
  .post(workerController.createWorker);
workersRouter.route('/:id')
  .get(workerController.getWorkerById)
  .put(workerController.updateWorker)
  .delete(workerController.deleteWorker);
workersRouter.route('/:id/status')
  .patch(workerController.toggleWorkerStatus);
workersRouter.route('/:id/reset-password')
  .post(workerController.resetWorkerPassword);

module.exports = {
  router: attendanceRouter,
  workersRouter
};

