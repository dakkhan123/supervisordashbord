const API_URL = '/api';

/**
 * Helper to construct query strings for API requests
 */
const buildQueryString = (params) => {
  if (!params) return '';
  const parts = [];
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
};

export const api = {
  // Inventory APIs
  getInventory: async (params) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_URL}/inventory${query}`);
    return res.json();
  },

  getItem: async (id) => {
    const res = await fetch(`${API_URL}/inventory/${id}`);
    return res.json();
  },

  addItem: async (itemData) => {
    const res = await fetch(`${API_URL}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...itemData, op: 'Rajesh Kumar' })
    });
    return res.json();
  },

  updateItem: async (id, itemData) => {
    const res = await fetch(`${API_URL}/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...itemData, op: 'Rajesh Kumar' })
    });
    return res.json();
  },

  deleteItem: async (id) => {
    const res = await fetch(`${API_URL}/inventory/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  reorderItem: async (reorderData) => {
    const res = await fetch(`${API_URL}/inventory/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...reorderData, op: 'Rajesh Kumar' })
    });
    return res.json();
  },

  // History APIs
  getHistory: async (params) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_URL}/history${query}`);
    return res.json();
  },

  // Alert APIs
  getActiveAlerts: async () => {
    const res = await fetch(`${API_URL}/alerts/active`);
    return res.json();
  },

  getAlertHistory: async () => {
    const res = await fetch(`${API_URL}/alerts/history`);
    return res.json();
  },

  muteAlert: async (id) => {
    const res = await fetch(`${API_URL}/alerts/${id}/mute`, {
      method: 'PUT'
    });
    return res.json();
  },

  auditAlerts: async () => {
    const res = await fetch(`${API_URL}/alerts/audit`, {
      method: 'POST'
    });
    return res.json();
  },

  // Notification APIs
  getNotifications: async () => {
    const res = await fetch(`${API_URL}/notifications`);
    return res.json();
  },

  markNotificationRead: async (id) => {
    const res = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PUT'
    });
    return res.json();
  },

  markNotificationUnread: async (id) => {
    const res = await fetch(`${API_URL}/notifications/${id}/unread`, {
      method: 'PUT'
    });
    return res.json();
  },

  deleteNotification: async (id) => {
    const res = await fetch(`${API_URL}/notifications/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  clearNotifications: async () => {
    const res = await fetch(`${API_URL}/notifications/clear`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Restock Request APIs
  getRestockRequests: async () => {
    const res = await fetch(`${API_URL}/restock-requests`);
    return res.json();
  },

  createRestockRequest: async (requestData) => {
    const res = await fetch(`${API_URL}/restock-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestData, op: 'Rajesh Kumar' })
    });
    return res.json();
  },

  approveRestockRequest: async (id) => {
    const res = await fetch(`${API_URL}/restock-requests/${id}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'Rajesh Kumar' })
    });
    return res.json();
  },

  rejectRestockRequest: async (id) => {
    const res = await fetch(`${API_URL}/restock-requests/${id}/reject`, {
      method: 'PUT'
    });
    return res.json();
  }
};
