const notificationService = require('../services/notificationService');

class NotificationController {
  async getAllNotifications(req, res, next) {
    try {
      const notifications = await notificationService.getAllNotifications();
      res.status(200).json({ success: true, count: notifications.length, data: notifications });
    } catch (err) {
      next(err);
    }
  }

  async createNotification(req, res, next) {
    try {
      const notification = await notificationService.createNotification(req.body);
      res.status(201).json({ success: true, data: notification });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const notification = await notificationService.markAsRead(req.params.id);
      res.status(200).json({ success: true, data: notification });
    } catch (err) {
      next(err);
    }
  }

  async markAsUnread(req, res, next) {
    try {
      const notification = await notificationService.markAsUnread(req.params.id);
      res.status(200).json({ success: true, data: notification });
    } catch (err) {
      next(err);
    }
  }

  async deleteNotification(req, res, next) {
    try {
      await notificationService.deleteNotification(req.params.id);
      res.status(200).json({ success: true, data: {} });
    } catch (err) {
      next(err);
    }
  }

  async clearAllNotifications(req, res, next) {
    try {
      await notificationService.clearAllNotifications();
      res.status(200).json({ success: true, message: 'Notifications cleared.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotificationController();
