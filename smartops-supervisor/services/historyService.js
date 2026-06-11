const StockTransaction = require('../models/StockTransaction');

class HistoryService {
  async getHistoryLogs(queryParams) {
    const { q, type, from, to } = queryParams || {};
    let query = {};

    if (type && type !== 'all') {
      query.type = type;
    }

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

    if (q) {
      query.$or = [
        { item: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { op: { $regex: q, $options: 'i' } }
      ];
    }

    return await StockTransaction.find(query).sort({ date: -1 });
  }

  async createLog(logData) {
    const { item, sku, type, qty, gst, op, loc, val } = logData;
    return await StockTransaction.create({ item, sku, type, qty, gst, op, loc, val });
  }
}

module.exports = new HistoryService();
