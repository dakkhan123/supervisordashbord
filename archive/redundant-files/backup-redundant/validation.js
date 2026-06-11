/**
 * Input request validation middleware schemas
 */

// Custom validator function helper
const validateItemBody = (req, res, next) => {
  const { name, sku, cat, qty, threshold, val, loc, gst } = req.body;
  const errors = [];

  // Validation rules for item creation / update
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    errors.push('Item Name is required and must be a valid string');
  }
  if (sku !== undefined && (typeof sku !== 'string' || !sku.trim())) {
    errors.push('SKU Code is required and must be a valid string');
  }
  if (cat !== undefined) {
    const validCategories = ['Electronics', 'Mechanical', 'Consumables', 'Raw Materials', 'Packaging'];
    if (!validCategories.includes(cat)) {
      errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }
  }
  if (qty !== undefined && (typeof qty !== 'number' || qty < 0)) {
    errors.push('Quantity (Units) must be a non-negative number');
  }
  if (threshold !== undefined && (typeof threshold !== 'number' || threshold < 0)) {
    errors.push('Min safety threshold must be a non-negative number');
  }
  if (val !== undefined && (typeof val !== 'number' || val < 0)) {
    errors.push('Unit Price must be a non-negative value');
  }
  if (loc !== undefined && (typeof loc !== 'string' || !loc.trim())) {
    errors.push('Storage location is required and must be a valid string');
  }
  if (gst !== undefined) {
    const validGstRates = [5, 12, 18, 28];
    if (!validGstRates.includes(Number(gst))) {
      errors.push(`GST rate must be one of: ${validGstRates.join(', ')}%`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors.join('. ')
    });
  }

  next();
};

const validateReorderBody = (req, res, next) => {
  const { sku, qty } = req.body;
  const errors = [];

  if (!sku || typeof sku !== 'string' || !sku.trim()) {
    errors.push('SKU Code is required for reordering');
  }
  if (qty === undefined || typeof qty !== 'number' || qty <= 0) {
    errors.push('Reorder quantity must be a positive number greater than zero');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors.join('. ')
    });
  }

  next();
};

module.exports = {
  validateItemBody,
  validateReorderBody
};
