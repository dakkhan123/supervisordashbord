const alertService = require('../services/alertService');

/**
 * Controller mapping HTTP requests to Alert Service operations
 */
class AlertController {
  // @desc    Get unresolved stock alerts
  // @route   GET /api/alerts/active
  async getActiveAlerts(req, res, next) {
    try {
      const alerts = await alertService.getActiveAlerts();
      res.status(200).json({
        success: true,
        count: alerts.length,
        data: alerts
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Get resolved alert history logs
  // @route   GET /api/alerts/history
  async getAlertHistory(req, res, next) {
    try {
      const logs = await alertService.getAlertHistory();
      res.status(200).json({
        success: true,
        count: logs.length,
        data: logs
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Mute an active alert
  // @route   PUT /api/alerts/:id/mute
  async muteAlert(req, res, next) {
    try {
      const alert = await alertService.muteAlert(req.params.id);
      res.status(200).json({
        success: true,
        data: alert
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Trigger catalog check to sync alerts with database
  // @route   POST /api/alerts/audit
  async auditAllItems(req, res, next) {
    try {
      await alertService.auditAllItems();
      res.status(200).json({
        success: true,
        message: 'Successfully audited all catalog items and updated stock alerts'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AlertController();
