const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const workerController = require('../controllers/workerController');

const attendanceRouter = express.Router();
attendanceRouter.route('/')
  .get(attendanceController.getAllAttendance)
  .post(attendanceController.logAttendance);
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

module.exports = {
  router: attendanceRouter,
  workersRouter
};
