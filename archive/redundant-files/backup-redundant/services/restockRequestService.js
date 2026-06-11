const RestockRequest = require('../models/RestockRequest');
const inventoryService = require('./inventoryService');
const notificationService = require('./notificationService');

class RestockRequestService {
  /**
   * Get all restock requests
   */
  async getAllRequests() {
    return await RestockRequest.find().sort({ createdAt: -1 });
  }

  /**
   * Create a restock request
   */
  async createRequest(requestData) {
    const { sku, qty, op, supplier } = requestData;
    
    // Find the item details first
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

    // Fire Notification: Restock Request Created
    await notificationService.createNotification({
      title: 'Restock Request Created',
      message: `A restock request for ${qty} units of "${itemName}" (SKU: ${sku}) was submitted by ${req.op}.`,
      type: 'restock_created',
      itemId: item ? item._id : null
    });

    return req;
  }

  /**
   * Approve a restock request
   */
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

    // Update request state
    req.status = 'approved';
    req.resolvedAt = new Date();
    await req.save();

    // Call reorder service to replenish inventory stock
    const item = await inventoryService.reorderItem({
      sku: req.sku,
      qty: req.qty,
      op: opName,
      supplier: req.supplier
    });

    // Fire Notification: Restock Request Approved
    await notificationService.createNotification({
      title: 'Restock Request Approved',
      message: `Restock request for "${req.itemName}" (SKU: ${req.sku}) of ${req.qty} units was approved.`,
      type: 'restock_approved',
      itemId: item._id
    });

    // Fire Notification: Stock Replenished
    await notificationService.createNotification({
      title: 'Stock Replenished',
      message: `Stock level for "${item.name}" has been replenished to ${item.qty} units.`,
      type: 'stock_replenished',
      itemId: item._id
    });

    return req;
  }

  /**
   * Reject a restock request
   */
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

    // Update request state
    req.status = 'rejected';
    req.resolvedAt = new Date();
    await req.save();

    // Find the item details first
    const items = await inventoryService.getAllItems({ q: req.sku });
    const item = items.find(i => i.sku === req.sku);

    // Fire Notification: Restock Request Rejected
    await notificationService.createNotification({
      title: 'Restock Request Rejected',
      message: `Restock request for "${req.itemName}" (SKU: ${req.sku}) of ${req.qty} units was rejected.`,
      type: 'restock_rejected',
      itemId: item ? item._id : null
    });

    return req;
  }
}

module.exports = new RestockRequestService();
