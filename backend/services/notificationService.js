const Notification = require('../models/Notification');

class NotificationService {
  async getAllNotifications(filterParams) {
    const { workerId, userId } = filterParams || {};
    let query = {};
    if (workerId || userId) {
      query = {
        $or: [
          { worker: workerId },
          { user: userId },
          { worker: { $exists: false } },
          { worker: null }
        ]
      };
    }
    return await Notification.find(query).sort({ createdAt: -1 });
  }


  async createNotification(notificationData) {
    const { title, message, type, itemId } = notificationData;
    const notification = await Notification.create({ title, message, type, itemId });

    // Broadcast to all connected clients for real-time updates
    try {
      const socketManager = require('../socket/escalationSocket');
      const io = socketManager.getIO();
      if (io) {
        io.emit('notification:new', { notification });
      }
    } catch (e) {
      // Socket not available — silent fail, polling will catch it
    }

    return notification;
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
  async markAllAsRead() {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    return true;
  }
}

module.exports = new NotificationService();
