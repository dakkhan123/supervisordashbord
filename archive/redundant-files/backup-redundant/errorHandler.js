/**
 * Global centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error to console for development diagnostics
  console.error('Error Details:', {
    message: err.message,
    name: err.name,
    stack: err.stack,
    code: err.code
  });

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    error.message = `${field.toUpperCase()} "${val}" already exists. Duplicate entries are not allowed.`;
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message).join(', ');
    return res.status(400).json({
      success: false,
      error: message
    });
  }

  // Mongoose Cast Error (invalid ObjectId representation)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid resource identifier format: ${err.value}`
    });
  }

  // Default Fallback Server Error
  res.status(err.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
