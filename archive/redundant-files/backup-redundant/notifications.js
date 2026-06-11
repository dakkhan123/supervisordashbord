const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// GET all notifications
router.get('/', notificationController.getAllNotifications);

// DELETE clear all notifications
router.delete('/clear', notificationController.clearAllNotifications);

// PUT mark as read
router.put('/:id/read', notificationController.markAsRead);

// PUT mark as unread
router.put('/:id/unread', notificationController.markAsUnread);

// DELETE notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
