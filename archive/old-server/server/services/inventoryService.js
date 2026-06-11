const Inventory = require('../models/Inventory');
const InventoryHistory = require('../models/InventoryHistory');
const notificationService = require('./notificationService');

class InventoryService {
  /**
   * Get filtered and sorted list of inventory items
   */
  async getAllItems(queryParams) {
    const { q, cat, status, sort } = queryParams || {};
    let query = {};

    // Filter by Category
    if (cat && cat !== 'all') {
      query.cat = cat;
    }

    // Search query (matches name or SKU case-insensitively)
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } }
      ];
    }

    // Retrieve database records
    let items = await Inventory.find(query);

    // Filter by Real-time Status Virtual property
    if (status && status !== 'all') {
      items = items.filter(item => item.status === status);
    }

    // Sort matching results
    if (sort) {
      if (sort === 'name') {
        items.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sort === 'stock-asc') {
        items.sort((a, b) => a.qty - b.qty);
      } else if (sort === 'stock-desc') {
        items.sort((a, b) => b.qty - a.qty);
      } else if (sort === 'value') {
        items.sort((a, b) => (b.qty * b.val) - (a.qty * a.val));
      }
    }

    return items;
  }

  /**
   * Fetch single inventory item by MongoDB ID
   */
  async getItemById(id) {
    const item = await Inventory.findById(id);
    if (!item) {
      const error = new Error('Item not found');
      error.statusCode = 404;
      throw error;
    }
    return item;
  }

  /**
   * Add new item to inventory & log initial transaction
   */
  async createItem(itemData) {
    const { name, sku, cat, qty, threshold, val, loc, gst, emoji, supplier, op } = itemData;

    // Validate SKU uniqueness
    const existing = await Inventory.findOne({ sku });
    if (existing) {
      const error = new Error('SKU code already exists in the catalog');
      error.statusCode = 400;
      throw error;
    }

    const item = await Inventory.create({
      name, sku, cat, qty, threshold, val, loc, gst, emoji, supplier
    });

    // Automatically record an "in" transaction history log if initial stock exists
    if (qty > 0) {
      await InventoryHistory.create({
        item: name,
        sku,
        type: 'in',
        qty,
        gst,
        op: op || 'Rajesh Kumar',
        loc,
        val: qty * val
      });
    }

    await this.auditStockAlert(item);

    // Fire Notification: New Item Added
    await notificationService.createNotification({
      title: 'New Item Added',
      message: `New item "${item.name}" (SKU: ${item.sku}) was added to the catalog at location ${item.loc}.`,
      type: 'item_added',
      itemId: item._id
    });

    return item;
  }

  /**
   * Modify item details & quantity levels. Automatically logs transaction history on quantity changes.
   */
  async updateItem(id, itemData) {
    const oldItem = await Inventory.findById(id);
    if (!oldItem) {
      const error = new Error('Item not found');
      error.statusCode = 404;
      throw error;
    }

    const { qty, op, ...otherFields } = itemData;

    // Check quantity level cannot fall below 0
    if (qty !== undefined && Number(qty) < 0) {
      const error = new Error('Quantity cannot go below zero');
      error.statusCode = 400;
      throw error;
    }

    // Calculate delta changes
    const newQty = qty !== undefined ? Number(qty) : oldItem.qty;
    const delta = newQty - oldItem.qty;

    const updatedItem = await Inventory.findByIdAndUpdate(
      id,
      { ...otherFields, qty: newQty },
      { new: true, runValidators: true }
    );

    // Record stock movements (inflow or outflow) to transaction log
    if (delta !== 0) {
      await InventoryHistory.create({
        item: updatedItem.name,
        sku: updatedItem.sku,
        type: delta > 0 ? 'in' : 'out',
        qty: Math.abs(delta),
        gst: updatedItem.gst,
        op: op || 'Rajesh Kumar',
        loc: updatedItem.loc,
        val: Math.abs(delta) * updatedItem.val
      });
    }

    await this.auditStockAlert(updatedItem);

    // Fire Notifications: Stock Changes or Details Updated
    if (delta === 0) {
      await notificationService.createNotification({
        title: 'Item Details Updated',
        message: `Catalog details for "${updatedItem.name}" (SKU: ${updatedItem.sku}) were updated by ${op || 'Rajesh Kumar'}.`,
        type: 'item_updated',
        itemId: updatedItem._id
      });
    } else if (delta > 0) {
      await notificationService.createNotification({
        title: 'Stock Quantity Increased',
        message: `Stock level for "${updatedItem.name}" (SKU: ${updatedItem.sku}) increased by ${delta} units. New balance: ${updatedItem.qty} units.`,
        type: 'stock_increase',
        itemId: updatedItem._id
      });
    } else {
      await notificationService.createNotification({
        title: 'Stock Quantity Decreased',
        message: `Stock level for "${updatedItem.name}" (SKU: ${updatedItem.sku}) decreased by ${Math.abs(delta)} units. New balance: ${updatedItem.qty} units.`,
        type: 'stock_decrease',
        itemId: updatedItem._id
      });
    }

    return updatedItem;
  }

  /**
   * Delete an item from catalog
   */
  async deleteItem(id) {
    const item = await Inventory.findById(id);
    if (!item) {
      const error = new Error('Item not found');
      error.statusCode = 404;
      throw error;
    }
    const sku = item.sku;
    const name = item.name;
    await item.deleteOne();

    // Clean up unresolved active alerts for this deleted item's SKU
    const Alert = require('../models/Alert');
    await Alert.deleteMany({ sku, resolved: false });

    // Fire Notification: Item Deleted
    await notificationService.createNotification({
      title: 'Item Deleted',
      message: `Item "${name}" (SKU: ${sku}) was permanently removed from the catalog.`,
      type: 'item_deleted',
      itemId: null
    });

    return true;
  }

  /**
   * Perform manual replenishment (Reorder)
   */
  async reorderItem(reorderParams) {
    const { sku, qty, op, supplier } = reorderParams;
    const item = await Inventory.findOne({ sku });
    if (!item) {
      const error = new Error('Inventory SKU item not found');
      error.statusCode = 404;
      throw error;
    }

    const orderQty = Number(qty);
    if (!orderQty || orderQty <= 0) {
      const error = new Error('Reorder quantity must be greater than zero');
      error.statusCode = 400;
      throw error;
    }

    // Update quantity
    item.qty += orderQty;
    if (supplier) {
      item.supplier = supplier;
    }
    await item.save();

    // Log the incoming stock transaction in history
    await InventoryHistory.create({
      item: item.name,
      sku: item.sku,
      type: 'in',
      qty: orderQty,
      gst: item.gst,
      op: op || 'Auto-Reorder',
      loc: item.loc,
      val: orderQty * item.val
    });

    await this.auditStockAlert(item);

    // Fire Notification: Stock Replenished
    await notificationService.createNotification({
      title: 'Stock Replenished',
      message: `Stock level for "${item.name}" (SKU: ${item.sku}) has been replenished by ${orderQty} units. New balance: ${item.qty} units.`,
      type: 'stock_replenished',
      itemId: item._id
    });

    return item;
  }

  /**
   * Helper to inspect stock boundaries and trigger/resolve Alert documents in DB
   */
  async auditStockAlert(item) {
    try {
      const Alert = require('../models/Alert');
      const isBelow = item.qty <= item.threshold;

      if (isBelow) {
        let type = 'low';
        if (item.qty === 0 || (item.qty / item.threshold) < 0.5) {
          type = 'critical';
        }

        const existing = await Alert.findOne({ sku: item.sku, resolved: false });
        if (existing) {
          existing.qty = item.qty;
          existing.type = type;
          await existing.save();
        } else {
          await Alert.create({
            item: item.name,
            sku: item.sku,
            type: type,
            qty: item.qty,
            threshold: item.threshold
          });

          // Fire Notification: Low or Critical Stock Alert!
          if (type === 'critical') {
            await notificationService.createNotification({
              title: 'Critical Stock Alert',
              message: `Item "${item.name}" (SKU: ${item.sku}) is critically low. Only ${item.qty} units remaining.`,
              type: 'critical_stock',
              itemId: item._id
            });
          } else {
            await notificationService.createNotification({
              title: 'Low Stock Alert',
              message: `Item "${item.name}" (SKU: ${item.sku}) has fallen below its safety threshold. Current level: ${item.qty} units.`,
              type: 'low_stock',
              itemId: item._id
            });
          }
        }
      } else {
        await Alert.updateMany(
          { sku: item.sku, resolved: false },
          { $set: { resolved: true, resolvedAt: new Date() } }
        );
      }
    } catch (err) {
      console.error('Failed to audit stock alerts:', err.message);
    }
  }
}

module.exports = new InventoryService();
