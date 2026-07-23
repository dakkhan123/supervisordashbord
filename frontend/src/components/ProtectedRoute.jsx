import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('smartops_token');
  const userStr = localStorage.getItem('smartops_user');
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    user = null;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && user) {
    const userRole = (user.role || '').toLowerCase();
    const isAllowed = allowedRoles.some(r => r.toLowerCase() === userRole);

    if (!isAllowed) {
      if (userRole === 'worker') {
        return <Navigate to="/worker" replace />;
      } else {
        return <Navigate to="/" replace />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;

