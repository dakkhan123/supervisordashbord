const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { validateItemBody, validateReorderBody } = require('../middleware/validation');

// GET all items / POST new item
router.route('/')
  .get(inventoryController.getAllItems)
  .post(validateItemBody, inventoryController.createItem);

// Reorder an item
router.route('/reorder')
  .post(validateReorderBody, inventoryController.reorderItem);

// GET / PUT / DELETE single item
router.route('/:id')
  .get(inventoryController.getItemById)
  .put(validateItemBody, inventoryController.updateItem)
  .delete(inventoryController.deleteItem);

module.exports = router;
