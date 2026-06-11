const Notification = require('../models/Notification');

class NotificationService {
  async getAllNotifications() {
    return await Notification.find().sort({ createdAt: -1 });
  }

  async createNotification(notificationData) {
    const { title, message, type, itemId } = notificationData;
    return await Notification.create({ title, message, type, itemId });
  }

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

  async deleteNotification(id) {
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }
    return true;
  }

  async clearAllNotifications() {
    await Notification.deleteMany({});
    return true;
  }
}

module.exports = new NotificationService();
