const Alert = require('../models/Alert');
const Inventory = require('../models/Inventory');

class AlertService {
  /**
   * Fetch unresolved active stock warning alerts
   */
  async getActiveAlerts() {
    return Alert.find({ resolved: false, muted: false }).sort({ createdAt: -1 });
  }

  /**
   * Fetch resolved historical alert records
   */
  async getAlertHistory() {
    return Alert.find({ resolved: true }).sort({ resolvedAt: -1 });
  }

  /**
   * Temporary mute an alert trigger
   */
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

  /**
   * Iterate all inventory items and generate active Alert entries for items currently below threshold limits
   */
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
