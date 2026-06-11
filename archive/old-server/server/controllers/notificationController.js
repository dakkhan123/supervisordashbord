const notificationService = require('../services/notificationService');

class NotificationController {
  // @desc    Get all notifications
  // @route   GET /api/notifications
  async getAllNotifications(req, res, next) {
    try {
      const notifications = await notificationService.getAllNotifications();
      res.status(200).json({
        success: true,
        count: notifications.length,
        data: notifications
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Mark notification as read
  // @route   PUT /api/notifications/:id/read
  async markAsRead(req, res, next) {
    try {
      const notification = await notificationService.markAsRead(req.params.id);
      res.status(200).json({
        success: true,
        data: notification
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Mark notification as unread
  // @route   PUT /api/notifications/:id/unread
  async markAsUnread(req, res, next) {
    try {
      const notification = await notificationService.markAsUnread(req.params.id);
      res.status(200).json({
        success: true,
        data: notification
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Delete notification
  // @route   DELETE /api/notifications/:id
  async deleteNotification(req, res, next) {
    try {
      await notificationService.deleteNotification(req.params.id);
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Clear all notifications
  // @route   DELETE /api/notifications/clear
  async clearAllNotifications(req, res, next) {
    try {
      await notificationService.clearAllNotifications();
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotificationController();
