const RestockRequest = require('../models/RestockRequest');
const inventoryService = require('./inventoryService');
const Notification = require('../models/Notification');

class RestockRequestService {
  async getAllRequests() {
    return await RestockRequest.find().sort({ createdAt: -1 });
  }

  async createRequest(requestData) {
    const { sku, qty, op, supplier } = requestData;
    
    const items = await inventoryService.getAllItems({ q: sku });
    const item = items.find(i => i.sku === sku);
    const itemName = item ? item.name : 'Unknown Item';

    const req = await RestockRequest.create({
      sku,
      itemName,
      qty,
      supplier,
      op: op || 'Rajesh Kumar'
    });

    await Notification.create({
      title: 'Restock Request Created',
      message: `A restock request for ${qty} units of "${itemName}" (SKU: ${sku}) was submitted by ${req.op}.`,
      type: 'restock_created',
      itemId: item ? item._id : null
    });

    return req;
  }

  async approveRequest(id, opName = 'Rajesh Kumar') {
    const req = await RestockRequest.findById(id);
    if (!req) {
      const error = new Error('Restock request not found');
      error.statusCode = 404;
      throw error;
    }

    if (req.status !== 'pending') {
      const error = new Error('Restock request has already been processed');
      error.statusCode = 400;
      throw error;
    }

    req.status = 'approved';
    req.resolvedAt = new Date();
    await req.save();

    const item = await inventoryService.reorderItem({
      sku: req.sku,
      qty: req.qty,
      op: opName,
      supplier: req.supplier
    });

    await Notification.create({
      title: 'Restock Request Approved',
      message: `Restock request for "${req.itemName}" (SKU: ${req.sku}) of ${req.qty} units was approved.`,
      type: 'restock_approved',
      itemId: item._id
    });

    await Notification.create({
      title: 'Stock Replenished',
      message: `Stock level for "${item.name}" has been replenished to ${item.qty} units.`,
      type: 'stock_replenished',
      itemId: item._id
    });

    return req;
  }

  async rejectRequest(id) {
    const req = await RestockRequest.findById(id);
    if (!req) {
      const error = new Error('Restock request not found');
      error.statusCode = 404;
      throw error;
    }

    if (req.status !== 'pending') {
      const error = new Error('Restock request has already been processed');
      error.statusCode = 400;
      throw error;
    }

    req.status = 'rejected';
    req.resolvedAt = new Date();
    await req.save();

    const items = await inventoryService.getAllItems({ q: req.sku });
    const item = items.find(i => i.sku === req.sku);

    await Notification.create({
      title: 'Restock Request Rejected',
      message: `Restock request for "${req.itemName}" (SKU: ${req.sku}) of ${req.qty} units was rejected.`,
      type: 'restock_rejected',
      itemId: item ? item._id : null
    });

    return req;
  }
}

module.exports = new RestockRequestService();
