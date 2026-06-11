const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

// GET all history logs / POST manual log
router.route('/')
  .get(historyController.getHistoryLogs)
  .post(historyController.createLog);

module.exports = router;
