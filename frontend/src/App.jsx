import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import { AddStockModal, ReorderModal } from './components/Modals';
import { ToastContainer } from './components/Toast';
import { NotificationDrawer } from './components/NotificationDrawer';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import PerformanceReports from './pages/PerformanceReports';
import Settings from './pages/Settings';
import ScanItemQR from './pages/ScanItemQR';
import Login from './pages/Login';
import Register from './pages/Register';
import Tasks from './pages/Tasks';
import Attendance from './pages/Attendance';
import WorkerOverview from './pages/WorkerOverview';
import ProtectedRoute from './components/ProtectedRoute';
import { api } from './services/api';
import { io as socketIO } from 'socket.io-client';

function AppContent() {
  const location = useLocation();
  const [searchVal, setSearchVal] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);

  // Authentication states
  const [user, setUser] = useState(null);
  const [appLoading, setAppLoading] = useState(true);

  const checkUserSession = async () => {
    const token = localStorage.getItem('smartops_token');
    if (!token) {
      setAppLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.success) {
        setUser(res.data);
      } else {
        localStorage.removeItem('smartops_token');
      }
    } catch (err) {
      console.error('Failed to verify session', err);
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('smartops_token');
    if (!token && user) {
      setUser(null);
    }
  }, [location.pathname, user]);

  const fetchNotifications = async () => {
    if (!localStorage.getItem('smartops_token')) return;
    try {
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchAlertCount = async () => {
    if (!localStorage.getItem('smartops_token')) return;
    try {
      const res = await api.getActiveAlerts();
      if (res.success) {
        setAlertCount(res.data.length);
      }
    } catch {
      // silent fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchAlertCount();
  }, [refreshTrigger, user]);

  // Silent background poll every 15 seconds — only updates sidebar badge & notifications
  // Does NOT call triggerRefresh() to avoid causing child page loading skeleton flicker
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
      fetchAlertCount();
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Real-time Socket.io connection for instant notification updates
  useEffect(() => {
    if (!user) return;
    const socket = socketIO({ path: '/socket.io', transports: ['websocket', 'polling'] });
    socket.on('notification:new', () => {
      fetchNotifications();
    });
    return () => socket.disconnect();
  }, [user]);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderItem, setReorderItem] = useState(null);

  // Toast helpers
  const showToast = (msg, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, msg, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Handle Add/Edit Submit
  const handleAddEditSubmit = async (formData) => {
    try {
      let res;
      if (editItem) {
        res = await api.updateItem(editItem._id, formData);
      } else {
        res = await api.addItem(formData);
      }

      if (res.success) {
        showToast(editItem ? 'Item updated successfully' : 'New item added successfully', 'success');
        setAddModalOpen(false);
        setEditItem(null);
        triggerRefresh();
      } else {
        showToast(res.error || 'Operation failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to server', 'error');
    }
  };

  // Handle Reorder Submit (directly replenishes the stock in MongoDB for immediate synchronization)
  const handleReorderSubmit = async (reorderData) => {
    try {
      const res = await api.reorderItem({
        sku: reorderData.sku,
        qty: reorderData.qty,
        supplier: reorderData.supplier || '',
        priority: reorderData.priority || 'Standard (5–7 Business Days)'
      });
      if (res.success) {
        showToast(`Successfully reordered ${reorderData.qty} units. Stock replenished.`, 'success');
        setReorderModalOpen(false);
        setReorderItem(null);
        triggerRefresh();
      } else {
        showToast(res.error || 'Reorder request failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to replenish stock', 'error');
    }
  };

  // Open Modals callbacks
  const openAddModal = () => {
    setEditItem(null);
    setAddModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditItem(item);
    setAddModalOpen(true);
  };

  const openReorderModal = (item) => {
    setReorderItem(item);
    setReorderModalOpen(true);
  };

  // Determine Page details based on route
  const getPageMeta = () => {
    switch (location.pathname) {
      case '/':
        return { title: 'Inventory Dashboard', breadcrumb: 'Console / Dashboard' };
      case '/inventory':
        return { title: 'Inventory Management', breadcrumb: 'Console / Inventory List' };
      case '/alerts':
        return { title: 'Low Stock Alerts', breadcrumb: 'Console / Stock Alerts' };
      case '/reports':
        return { title: 'Reports & Analytics', breadcrumb: 'Console / Reports' };
      case '/performance':
        return { title: 'Performance Reports', breadcrumb: 'Console / Performance' };
      case '/settings':
        return { title: 'System Settings', breadcrumb: 'Console / Settings' };
      case '/scan':
        return { title: 'Scan Item QR', breadcrumb: 'Console / Scan Item' };
      case '/tasks':
        return { title: 'Task Allocation', breadcrumb: 'Console / Tasks' };
      case '/attendance':
        return { title: 'Attendance Registry', breadcrumb: 'Console / Attendance' };
      case '/workers':
        return { title: 'Staff Directory & Profile', breadcrumb: 'Console / Staff' };
      default:
        return { title: 'SmartOps', breadcrumb: 'Console' };
    }
  };

  const { title, breadcrumb } = getPageMeta();

  if (appLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-xs text-outline font-bold uppercase tracking-wider">Verifying Session...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login showToast={showToast} onLoginSuccess={(u) => setUser(u)} />} />
      <Route path="/register" element={<Register showToast={showToast} />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="flex min-h-screen bg-background">
              <Sidebar 
                mobileOpen={mobileOpen} 
                setMobileOpen={setMobileOpen} 
                alertCount={alertCount} 
                user={user}
                onLogout={() => {
                  localStorage.removeItem('smartops_token');
                  setUser(null);
                  showToast('Logged out successfully', 'success');
                }}
              />
              
              <div className="flex-1 flex flex-col min-w-0 lg:pl-[260px]">
                <TopNav 
                  title={title} 
                  breadcrumb={breadcrumb} 
                  searchVal={searchVal} 
                  setSearchVal={setSearchVal}
                  setMobileOpen={setMobileOpen}
                  showToast={showToast}
                  notifications={notifications}
                  onBellClick={() => setNotificationDrawerOpen(true)}
                  user={user}
                />

                <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1600px] mx-auto w-full">
                  <Routes>
                    <Route 
                      path="/" 
                      element={
                        <Dashboard 
                          searchVal={searchVal} 
                          showToast={showToast} 
                          onReorderClick={openReorderModal}
                          refreshTrigger={refreshTrigger}
                        />
                      } 
                    />
                    <Route 
                      path="/inventory" 
                      element={
                        <Inventory 
                          searchVal={searchVal} 
                          showToast={showToast} 
                          onAddClick={openAddModal}
                          onEditClick={openEditModal}
                          onReorderClick={openReorderModal}
                          refreshTrigger={refreshTrigger}
                          triggerRefresh={triggerRefresh}
                        />
                      } 
                    />
                    <Route 
                      path="/scan" 
                      element={
                        <ScanItemQR 
                          showToast={showToast} 
                          refreshTrigger={refreshTrigger}
                          triggerRefresh={triggerRefresh}
                          onReorderClick={openReorderModal}
                        />
                      } 
                    />
                    <Route 
                      path="/alerts" 
                      element={
                        <Alerts 
                          searchVal={searchVal} 
                          showToast={showToast} 
                          onReorderClick={openReorderModal}
                          refreshTrigger={refreshTrigger}
                          triggerRefresh={triggerRefresh}
                        />
                      } 
                    />
                    <Route 
                      path="/reports" 
                      element={
                        <Reports 
                          searchVal={searchVal} 
                          showToast={showToast}
                          refreshTrigger={refreshTrigger}
                          triggerRefresh={triggerRefresh}
                        />
                      } 
                    />
                    <Route 
                      path="/performance" 
                      element={
                        <PerformanceReports 
                          searchVal={searchVal} 
                          showToast={showToast}
                          refreshTrigger={refreshTrigger}
                        />
                      } 
                    />
                    <Route 
                      path="/settings" 
                      element={
                        <Settings 
                          showToast={showToast} 
                          notifications={notifications}
                          onRefreshNotifications={fetchNotifications}
                          user={user}
                        />
                      } 
                    />
                    <Route 
                      path="/tasks" 
                      element={
                        <Tasks 
                          showToast={showToast} 
                        />
                      } 
                    />
                    <Route 
                      path="/attendance" 
                      element={
                        <Attendance 
                          showToast={showToast} 
                        />
                      } 
                    />
                    <Route 
                      path="/workers" 
                      element={
                        <WorkerOverview 
                          searchVal={searchVal}
                          showToast={showToast} 
                        />
                      } 
                    />
                  </Routes>
                </main>
              </div>

              {/* Modal Overlay Components */}
              <AddStockModal 
                isOpen={addModalOpen} 
                onClose={() => setAddModalOpen(false)} 
                onSubmit={handleAddEditSubmit}
                editItem={editItem}
              />

              <ReorderModal
                isOpen={reorderModalOpen}
                onClose={() => setReorderModalOpen(false)}
                onSubmit={handleReorderSubmit}
                item={reorderItem}
              />

              <ToastContainer toasts={toasts} removeToast={removeToast} />

              {/* Global Notification Drawer */}
              <NotificationDrawer
                isOpen={notificationDrawerOpen}
                onClose={() => setNotificationDrawerOpen(false)}
                notifications={notifications}
                onRefresh={fetchNotifications}
                showToast={showToast}
              />
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
