const inventoryService = require('../services/inventoryService');

/**
 * Controller mapping HTTP requests to Inventory Service operations
 */
class InventoryController {
  // @desc    Get all inventory items
  // @route   GET /api/inventory
  async getAllItems(req, res, next) {
    try {
      const items = await inventoryService.getAllItems(req.query);
      res.status(200).json({
        success: true,
        count: items.length,
        data: items
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Get single inventory item
  // @route   GET /api/inventory/:id
  async getItemById(req, res, next) {
    try {
      const item = await inventoryService.getItemById(req.params.id);
      res.status(200).json({
        success: true,
        data: item
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Create new inventory item
  // @route   POST /api/inventory
  async createItem(req, res, next) {
    try {
      const item = await inventoryService.createItem(req.body);
      res.status(201).json({
        success: true,
        data: item
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Update inventory details or quantity levels
  // @route   PUT /api/inventory/:id
  async updateItem(req, res, next) {
    try {
      const item = await inventoryService.updateItem(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: item
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Delete inventory item from database
  // @route   DELETE /api/inventory/:id
  async deleteItem(req, res, next) {
    try {
      await inventoryService.deleteItem(req.params.id);
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Replenish item stock level (Reorder)
  // @route   POST /api/inventory/reorder
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
}

module.exports = new InventoryController();
