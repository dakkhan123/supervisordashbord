const alertService = require('../services/alertService');

class AlertController {
  async getActiveAlerts(req, res, next) {
    try {
      const alerts = await alertService.getActiveAlerts();
      res.status(200).json({ success: true, count: alerts.length, data: alerts });
    } catch (err) {
      next(err);
    }
  }

  async getAlertHistory(req, res, next) {
    try {
      const alerts = await alertService.getAlertHistory();
      res.status(200).json({ success: true, count: alerts.length, data: alerts });
    } catch (err) {
      next(err);
    }
  }

  async muteAlert(req, res, next) {
    try {
      const alert = await alertService.muteAlert(req.params.id);
      res.status(200).json({ success: true, data: alert });
    } catch (err) {
      next(err);
    }
  }

  async auditAllItems(req, res, next) {
    try {
      await alertService.auditAllItems();
      res.status(200).json({ success: true, message: 'Stock audit complete.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AlertController();
