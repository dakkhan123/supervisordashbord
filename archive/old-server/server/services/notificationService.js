const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Get all notifications sorted by newest first
   */
  async getAllNotifications() {
    return await Notification.find().sort({ createdAt: -1 });
  }

  /**
   * Create a new notification
   */
  async createNotification(notificationData) {
    const { title, message, type, itemId } = notificationData;
    return await Notification.create({
      title,
      message,
      type,
      itemId
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id) {
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }
    return notification;
  }

  /**
   * Mark a notification as unread
   */
  async markAsUnread(id) {
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: false },
      { new: true }
    );
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }
    return notification;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id) {
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }
    return true;
  }

  /**
   * Clear all notifications from database
   */
  async clearAllNotifications() {
    await Notification.deleteMany({});
    return true;
  }
}

module.exports = new NotificationService();
