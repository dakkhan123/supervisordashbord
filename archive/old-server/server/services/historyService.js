const InventoryHistory = require('../models/InventoryHistory');

class HistoryService {
  /**
   * Fetch transaction logs based on query filters
   */
  async getHistoryLogs(queryParams) {
    const { q, type, from, to } = queryParams || {};
    let query = {};

    // Filter by type ('in' or 'out')
    if (type && type !== 'all') {
      query.type = type;
    }

    // Filter by Date Range (DD/MM/YYYY boundaries mapped to ISO format query)
    if (from || to) {
      query.date = {};
      if (from) {
        query.date.$gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.date.$lte = toDate;
      }
    }

    // Search query matches SKU, item name, or Operator case-insensitively
    if (q) {
      query.$or = [
        { item: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { op: { $regex: q, $options: 'i' } }
      ];
    }

    // Retrieve database history logs sorted in descending date order (most recent first)
    const logs = await InventoryHistory.find(query).sort({ date: -1 });
    return logs;
  }

  /**
   * Manually create a transaction history entry
   */
  async createLog(logData) {
    const { item, sku, type, qty, gst, op, loc, val } = logData;
    
    const log = await InventoryHistory.create({
      item, sku, type, qty, gst, op, loc, val
    });

    return log;
  }
}

module.exports = new HistoryService();
