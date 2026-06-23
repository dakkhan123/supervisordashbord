const Inventory = require('../models/Inventory');
const StockTransaction = require('../models/StockTransaction');
const Alert = require('../models/Alert');
const Notification = require('../models/Notification');
const QRCode = require('qrcode');

class InventoryService {
  async getAllItems(queryParams) {
    const { q, cat, status, sort } = queryParams || {};
    let query = {};

    if (cat && cat !== 'all') {
      query.cat = cat;
    }

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } }
      ];
    }

    let items = await Inventory.find(query);

    if (status && status !== 'all') {
      items = items.filter(item => item.status === status);
    }

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

  async getItemById(id) {
    const item = await Inventory.findById(id);
    if (!item) {
      const error = new Error('Item not found');
      error.statusCode = 404;
      throw error;
    }
    return item;
  }

  async createItem(itemData) {
    const { name, sku, cat, qty, threshold, val, loc, gst, emoji, supplier, op } = itemData;

    const existing = await Inventory.findOne({ $or: [{ sku }, { skuCode: sku }] });
    if (existing) {
      const error = new Error('SKU code already exists in the catalog');
      error.statusCode = 400;
      throw error;
    }

    const qrCodeImage = await QRCode.toDataURL(sku);

    const item = await Inventory.create({
      name,
      sku,
      cat,
      qty,
      threshold,
      val,
      loc,
      gst,
      emoji,
      supplier,
      skuCode: sku,
      storageLocation: loc,
      qrCodeImage
    });

    if (qty > 0) {
      await StockTransaction.create({
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

    await Notification.create({
      title: 'New Item Added',
      message: `New item "${item.name}" (SKU: ${item.sku}) was added to the catalog at location ${item.loc}.`,
      type: 'item_added',
      itemId: item._id
    });

    return item;
  }

  async updateItem(id, itemData) {
    const oldItem = await Inventory.findById(id);
    if (!oldItem) {
      const error = new Error('Item not found');
      error.statusCode = 404;
      throw error;
    }

    const { qty, op, ...otherFields } = itemData;

    if (qty !== undefined && Number(qty) < 0) {
      const error = new Error('Quantity cannot go below zero');
      error.statusCode = 400;
      throw error;
    }

    const newQty = qty !== undefined ? Number(qty) : oldItem.qty;
    const delta = newQty - oldItem.qty;

    const updateFields = { ...otherFields };
    if (otherFields.sku !== undefined) {
      updateFields.skuCode = otherFields.sku;
      if (otherFields.sku !== oldItem.sku) {
        updateFields.qrCodeImage = await QRCode.toDataURL(otherFields.sku);
      }
    }
    if (otherFields.loc !== undefined) {
      updateFields.storageLocation = otherFields.loc;
    }

    const updatedItem = await Inventory.findByIdAndUpdate(
      id,
      { ...updateFields, qty: newQty },
      { new: true, runValidators: true }
    );

    if (delta !== 0) {
      await StockTransaction.create({
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

    if (delta === 0) {
      await Notification.create({
        title: 'Item Details Updated',
        message: `Catalog details for "${updatedItem.name}" (SKU: ${updatedItem.sku}) were updated by ${op || 'Rajesh Kumar'}.`,
        type: 'item_updated',
        itemId: updatedItem._id
      });
    } else if (delta > 0) {
      await Notification.create({
        title: 'Stock Quantity Increased',
        message: `Stock level for "${updatedItem.name}" (SKU: ${updatedItem.sku}) increased by ${delta} units. New balance: ${updatedItem.qty} units.`,
        type: 'stock_increase',
        itemId: updatedItem._id
      });
    } else {
      await Notification.create({
        title: 'Stock Quantity Decreased',
        message: `Stock level for "${updatedItem.name}" (SKU: ${updatedItem.sku}) decreased by ${Math.abs(delta)} units. New balance: ${updatedItem.qty} units.`,
        type: 'stock_decrease',
        itemId: updatedItem._id
      });
    }

    return updatedItem;
  }

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

    await Alert.deleteMany({ sku, resolved: false });

    await Notification.create({
      title: 'Item Deleted',
      message: `Item "${name}" (SKU: ${sku}) was permanently removed from the catalog.`,
      type: 'item_deleted',
      itemId: null
    });

    return true;
  }

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

    item.qty += orderQty;
    if (supplier) {
      item.supplier = supplier;
    }
    await item.save();

    await StockTransaction.create({
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

    await Notification.create({
      title: 'Stock Replenished',
      message: `Stock level for "${item.name}" (SKU: ${item.sku}) has been replenished by ${orderQty} units. New balance: ${item.qty} units.`,
      type: 'stock_replenished',
      itemId: item._id
    });

    return item;
  }

  async auditStockAlert(item) {
    try {
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

          await Notification.create({
            title: type === 'critical' ? 'Critical Stock Alert' : 'Low Stock Alert',
            message: type === 'critical'
              ? `Item "${item.name}" (SKU: ${item.sku}) is critically low. Only ${item.qty} units remaining.`
              : `Item "${item.name}" (SKU: ${item.sku}) has fallen below its safety threshold. Current level: ${item.qty} units.`,
            type: type === 'critical' ? 'critical_stock' : 'low_stock',
            itemId: item._id
          });
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

  async upgradeExistingItems() {
    try {
      const items = await Inventory.find({
        $or: [
          { skuCode: { $exists: false } },
          { storageLocation: { $exists: false } },
          { qrCodeImage: { $exists: false } },
          { skuCode: null },
          { storageLocation: null },
          { qrCodeImage: null }
        ]
      });

      if (items.length > 0) {
        console.log(`🔄 Upgrading ${items.length} existing inventory items with QR codes & schema extensions...`);
        for (const item of items) {
          let updated = false;
          if (!item.skuCode) {
            item.skuCode = item.sku;
            updated = true;
          }
          if (!item.storageLocation) {
            item.storageLocation = item.loc;
            updated = true;
          }
          if (!item.qrCodeImage) {
            item.qrCodeImage = await QRCode.toDataURL(item.sku);
            updated = true;
          }
          if (updated) {
            await item.save();
          }
        }
        console.log(`✅ Upgrade migration complete for ${items.length} items.`);
      }
    } catch (err) {
      console.error('Failed to run schema upgrade migration:', err);
    }
  }
}

module.exports = new InventoryService();
