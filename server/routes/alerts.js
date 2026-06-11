const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// GET unresolved active warnings / Trigger catalog-wide check
router.route('/active')
  .get(alertController.getActiveAlerts);

router.route('/audit')
  .post(alertController.auditAllItems);

// GET resolved history logs
router.route('/history')
  .get(alertController.getAlertHistory);

// PUT mute an alert
router.route('/:id/mute')
  .put(alertController.muteAlert);

module.exports = router;
