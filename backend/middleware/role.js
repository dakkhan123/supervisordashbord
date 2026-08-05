module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: User role not found'
      });
    }

    const userRole = req.user.role.toLowerCase();
    const isAllowed = allowedRoles.some(role => role.toLowerCase() === userRole);

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: `Access denied: Role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};
