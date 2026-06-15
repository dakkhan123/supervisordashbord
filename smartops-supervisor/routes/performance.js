const express = require('express');
const performanceController = require('../controllers/performanceController');

const router = express.Router();

// GET /api/performance/kpi?from=&to=
router.get('/kpi', performanceController.getKPISummary);

// GET /api/performance/workers?from=&to=
router.get('/workers', performanceController.getWorkerPerformance);

// GET /api/performance/task-trend?from=&to=&granularity=daily|weekly|monthly
router.get('/task-trend', performanceController.getTaskTrend);

// GET /api/performance/attendance-heatmap?from=&to=
router.get('/attendance-heatmap', performanceController.getAttendanceHeatmap);

// GET /api/performance/task-distribution?from=&to=
router.get('/task-distribution', performanceController.getTaskDistribution);

// GET /api/performance/export?from=&to=
router.get('/export', performanceController.getExportData);

module.exports = router;
