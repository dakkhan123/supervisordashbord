const express = require('express');
const reportController = require('../controllers/reportController');
const alertController = require('../controllers/alertController');
const notificationController = require('../controllers/notificationController');

const reportsRouter = express.Router();
reportsRouter.route('/')
  .get(reportController.getAllReports)
  .post(reportController.createReport);
reportsRouter.route('/:id')
  .get(reportController.getReportById)
  .delete(reportController.deleteReport);

const alertsRouter = express.Router();
alertsRouter.route('/active')
  .get(alertController.getActiveAlerts);
alertsRouter.route('/history')
  .get(alertController.getAlertHistory);
alertsRouter.route('/audit')
  .post(alertController.auditAllItems);
alertsRouter.route('/:id/mute')
  .put(alertController.muteAlert);

const notificationsRouter = express.Router();
notificationsRouter.route('/')
  .get(notificationController.getAllNotifications);
notificationsRouter.route('/clear')
  .delete(notificationController.clearAllNotifications);
notificationsRouter.route('/:id/read')
  .put(notificationController.markAsRead);
notificationsRouter.route('/:id/unread')
  .put(notificationController.markAsUnread);
notificationsRouter.route('/:id')
  .delete(notificationController.deleteNotification);

module.exports = {
  router: reportsRouter,
  alertsRouter,
  notificationsRouter
};
