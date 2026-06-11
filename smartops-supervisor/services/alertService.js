const Alert = require('../models/Alert');
const Inventory = require('../models/Inventory');

class AlertService {
  async getActiveAlerts() {
    return await Alert.find({ resolved: false, muted: false }).sort({ createdAt: -1 });
  }

  async getAlertHistory() {
    return await Alert.find({ resolved: true }).sort({ resolvedAt: -1 });
  }

  async muteAlert(id) {
    const alert = await Alert.findById(id);
    if (!alert) {
      const error = new Error('Alert warning not found');
      error.statusCode = 404;
      throw error;
    }
    
    alert.muted = true;
    await alert.save();
    return alert;
  }

  async auditAllItems() {
    const inventoryService = require('./inventoryService');
    const items = await Inventory.find();
    
    for (const item of items) {
      await inventoryService.auditStockAlert(item);
    }
    
    return true;
  }
}

module.exports = new AlertService();
