const API_URL = '/api';

/**
 * Helper to intercept fetch requests and attach JWT bearer token
 */
const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('smartops_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('smartops_token');
  }
  return res;
};

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
  // Authentication APIs
  login: async (credentials) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return res.json();
  },

  register: async (userData) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  getMe: async () => {
    const res = await authFetch(`${API_URL}/auth/me`);
    return res.json();
  },

  // Inventory APIs
  getInventory: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/inventory${query}`);
    return res.json();
  },

  getItem: async (id) => {
    const res = await authFetch(`${API_URL}/inventory/${id}`);
    return res.json();
  },

  generateQR: async (sku) => {
    const res = await authFetch(`${API_URL}/inventory/generate-qr`, {
      method: 'POST',
      body: JSON.stringify({ sku })
    });
    return res.json();
  },

  getItemBySku: async (sku) => {
    const res = await authFetch(`${API_URL}/inventory/sku/${sku}`);
    return res.json();
  },

  searchInventory: async (q) => {
    const res = await authFetch(`${API_URL}/inventory/search?q=${encodeURIComponent(q)}`);
    return res.json();
  },

  getItemQR: async (id) => {
    const res = await authFetch(`${API_URL}/inventory/${id}/qr`);
    return res.json();
  },

  addItem: async (itemData) => {
    const res = await authFetch(`${API_URL}/inventory`, {
      method: 'POST',
      body: JSON.stringify(itemData)
    });
    return res.json();
  },

  updateItem: async (id, itemData) => {
    const res = await authFetch(`${API_URL}/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData)
    });
    return res.json();
  },

  deleteItem: async (id) => {
    const res = await authFetch(`${API_URL}/inventory/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  reorderItem: async (reorderData) => {
    const res = await authFetch(`${API_URL}/inventory/reorder`, {
      method: 'POST',
      body: JSON.stringify(reorderData)
    });
    return res.json();
  },

  // History APIs
  getHistory: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/history${query}`);
    return res.json();
  },

  // Alert APIs
  getActiveAlerts: async () => {
    const res = await authFetch(`${API_URL}/alerts/active`);
    return res.json();
  },

  getAlertHistory: async () => {
    const res = await authFetch(`${API_URL}/alerts/history`);
    return res.json();
  },

  muteAlert: async (id) => {
    const res = await authFetch(`${API_URL}/alerts/${id}/mute`, {
      method: 'PUT'
    });
    return res.json();
  },

  auditAlerts: async () => {
    const res = await authFetch(`${API_URL}/alerts/audit`, {
      method: 'POST'
    });
    return res.json();
  },

  // Notification APIs
  getNotifications: async () => {
    const res = await authFetch(`${API_URL}/notifications`);
    return res.json();
  },

  markNotificationRead: async (id) => {
    const res = await authFetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PUT'
    });
    return res.json();
  },

  markNotificationUnread: async (id) => {
    const res = await authFetch(`${API_URL}/notifications/${id}/unread`, {
      method: 'PUT'
    });
    return res.json();
  },

  deleteNotification: async (id) => {
    const res = await authFetch(`${API_URL}/notifications/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  clearNotifications: async () => {
    const res = await authFetch(`${API_URL}/notifications/clear`, {
      method: 'DELETE'
    });
    return res.json();
  },

  markAllNotificationsRead: async () => {
    const res = await authFetch(`${API_URL}/notifications/mark-all-read`, {
      method: 'PUT'
    });
    return res.json();
  },

  // Restock Request APIs
  getRestockRequests: async () => {
    const res = await authFetch(`${API_URL}/restock-requests`);
    return res.json();
  },

  createRestockRequest: async (requestData) => {
    const res = await authFetch(`${API_URL}/restock-requests`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
    return res.json();
  },

  approveRestockRequest: async (id) => {
    const res = await authFetch(`${API_URL}/restock-requests/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({})
    });
    return res.json();
  },

  rejectRestockRequest: async (id) => {
    const res = await authFetch(`${API_URL}/restock-requests/${id}/reject`, {
      method: 'PUT'
    });
    return res.json();
  },

  // Performance Report APIs
  getPerformanceKPI: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/performance/kpi${query}`);
    return res.json();
  },

  getWorkerPerformance: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/performance/workers${query}`);
    return res.json();
  },

  getTaskTrend: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/performance/task-trend${query}`);
    return res.json();
  },

  getAttendanceHeatmap: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/performance/attendance-heatmap${query}`);
    return res.json();
  },

  getTaskDistribution: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/performance/task-distribution${query}`);
    return res.json();
  },

  getPerformanceExport: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/performance/export${query}`);
    return res.json();
  },

  // Workers APIs
  getWorkers: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/workers${query}`);
    return res.json();
  },

  createWorker: async (workerData) => {
    const res = await authFetch(`${API_URL}/workers`, {
      method: 'POST',
      body: JSON.stringify(workerData)
    });
    return res.json();
  },

  updateWorker: async (id, workerData) => {
    const res = await authFetch(`${API_URL}/workers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workerData)
    });
    return res.json();
  },

  deleteWorker: async (id) => {
    const res = await authFetch(`${API_URL}/workers/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Tasks APIs
  getTasks: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/tasks${query}`);
    return res.json();
  },

  createTask: async (taskData) => {
    const res = await authFetch(`${API_URL}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
    return res.json();
  },

  updateTask: async (id, taskData) => {
    const res = await authFetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
    return res.json();
  },

  deleteTask: async (id) => {
    const res = await authFetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Attendance APIs
  getAttendance: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/attendance${query}`);
    return res.json();
  },

  logAttendance: async (attendanceData) => {
    const res = await authFetch(`${API_URL}/attendance`, {
      method: 'POST',
      body: JSON.stringify(attendanceData)
    });
    return res.json();
  },

  deleteAttendance: async (id) => {
    const res = await authFetch(`${API_URL}/attendance/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Salary APIs
  getSalaries: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/salary${query}`);
    return res.json();
  },

  calculateSalary: async (workerId, month) => {
    const res = await authFetch(`${API_URL}/salary/calculate?worker=${workerId}&month=${month}`);
    return res.json();
  },

  createSalary: async (salaryData) => {
    const res = await authFetch(`${API_URL}/salary`, {
      method: 'POST',
      body: JSON.stringify(salaryData)
    });
    return res.json();
  },

  updateSalary: async (id, salaryData) => {
    const res = await authFetch(`${API_URL}/salary/${id}`, {
      method: 'PUT',
      body: JSON.stringify(salaryData)
    });
    return res.json();
  },

  deleteSalary: async (id) => {
    const res = await authFetch(`${API_URL}/salary/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Worker Management extensions
  toggleWorkerStatus: async (id, status) => {
    const res = await authFetch(`${API_URL}/workers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  resetWorkerPassword: async (id, newPassword) => {
    const res = await authFetch(`${API_URL}/workers/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
    return res.json();
  },

  // Worker Task extensions
  getMyTasks: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/tasks/my-tasks${query}`);
    return res.json();
  },

  updateChecklistItem: async (taskId, itemId, isCompleted) => {
    const res = await authFetch(`${API_URL}/tasks/${taskId}/checklist/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted })
    });
    return res.json();
  },

  submitCompletionNotes: async (id, notesData) => {
    const res = await authFetch(`${API_URL}/tasks/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(notesData)
    });
    return res.json();
  },

  // Worker Attendance extensions
  getMyAttendance: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/attendance/my-attendance${query}`);
    return res.json();
  },

  // Worker Salary extensions
  getMySalaries: async (params) => {
    const query = buildQueryString(params);
    const res = await authFetch(`${API_URL}/salary/my-salary${query}`);
    return res.json();
  },

  // Escalation APIs
  getEscalations: async () => {
    const res = await authFetch(`${API_URL}/escalations`);
    return res.json();
  },

  createEscalation: async (escalationData) => {
    const res = await authFetch(`${API_URL}/escalations`, {
      method: 'POST',
      body: JSON.stringify(escalationData)
    });
    return res.json();
  },

  updateEscalation: async (id, escalationData) => {
    const res = await authFetch(`${API_URL}/escalations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(escalationData)
    });
    return res.json();
  },

  deleteEscalation: async (id) => {
    const res = await authFetch(`${API_URL}/escalations/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  }
};

