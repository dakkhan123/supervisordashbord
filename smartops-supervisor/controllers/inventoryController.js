const inventoryService = require('../services/inventoryService');

class InventoryController {
  async getAllItems(req, res, next) {
    try {
      const items = await inventoryService.getAllItems(req.query);
      res.status(200).json({ success: true, count: items.length, data: items });
    } catch (err) {
      next(err);
    }
  }

  async getItemById(req, res, next) {
    try {
      const item = await inventoryService.getItemById(req.params.id);
      res.status(200).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  async createItem(req, res, next) {
    try {
      const item = await inventoryService.createItem(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  async updateItem(req, res, next) {
    try {
      const item = await inventoryService.updateItem(req.params.id, req.body);
      res.status(200).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  async deleteItem(req, res, next) {
    try {
      await inventoryService.deleteItem(req.params.id);
      res.status(200).json({ success: true, data: {} });
    } catch (err) {
      next(err);
    }
  }

  async reorderItem(req, res, next) {
    try {
      const item = await inventoryService.reorderItem(req.body);
      res.status(200).json({
        success: true,
        data: item,
        message: `Successfully reordered ${req.body.qty} units of ${item.name}`
      });
    } catch (err) {
      next(err);
    }
  }

  async generateQr(req, res, next) {
    try {
      const { sku } = req.body;
      const QRCode = require('qrcode');
      const qrDataUrl = await QRCode.toDataURL(sku);
      
      const Inventory = require('../models/Inventory');
      const item = await Inventory.findOneAndUpdate(
        { $or: [{ sku }, { skuCode: sku }] },
        { qrCodeImage: qrDataUrl },
        { new: true }
      );
      
      res.status(200).json({ success: true, qrCodeImage: qrDataUrl, data: item });
    } catch (err) {
      next(err);
    }
  }

  async getItemBySku(req, res, next) {
    try {
      const sku = req.params.sku;
      const Inventory = require('../models/Inventory');
      const item = await Inventory.findOne({ $or: [{ sku }, { skuCode: sku }] });
      if (!item) {
        return res.status(404).json({ success: false, error: 'Item not found' });
      }
      res.status(200).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  async searchItems(req, res, next) {
    try {
      const q = req.query.q;
      const items = await inventoryService.getAllItems({ q });
      res.status(200).json({ success: true, count: items.length, data: items });
    } catch (err) {
      next(err);
    }
  }

  async getItemQr(req, res, next) {
    try {
      const id = req.params.id;
      const item = await inventoryService.getItemById(id);
      res.status(200).json({ success: true, qrCodeImage: item.qrCodeImage });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InventoryController();
