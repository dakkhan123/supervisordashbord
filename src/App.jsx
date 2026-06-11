import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import { AddStockModal, ReorderModal } from './components/Modals';
import { ToastContainer } from './components/Toast';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { api } from './services/api';

function AppContent() {
  const location = useLocation();
  const [searchVal, setSearchVal] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [alertCount, setAlertCount] = useState(0);

  const fetchNotifications = async () => {
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
    try {
      const res = await api.getActiveAlerts();
      if (res.success) {
        setAlertCount(res.data.length);
      }
    } catch (err) {
      // silent fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchAlertCount();
  }, [refreshTrigger]);

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

  // Handle Reorder Submit (creates a restock request in MongoDB)
  const handleReorderSubmit = async (reorderData) => {
    try {
      const res = await api.createRestockRequest({
        sku: reorderData.sku,
        qty: reorderData.qty,
        supplier: reorderData.supplier || ''
      });
      if (res.success) {
        showToast(`Restock request for ${reorderData.qty} units submitted for approval`, 'success');
        setReorderModalOpen(false);
        setReorderItem(null);
        triggerRefresh();
      } else {
        showToast(res.error || 'Reorder request failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to submit restock request', 'error');
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
      case '/settings':
        return { title: 'System Settings', breadcrumb: 'Console / Settings' };
      default:
        return { title: 'SmartOps', breadcrumb: 'Console' };
    }
  };

  const { title, breadcrumb } = getPageMeta();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} alertCount={alertCount} />
      
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[260px]">
        <TopNav 
          title={title} 
          breadcrumb={breadcrumb} 
          searchVal={searchVal} 
          setSearchVal={setSearchVal}
          setMobileOpen={setMobileOpen}
          showToast={showToast}
          notifications={notifications}
          onRefreshNotifications={fetchNotifications}
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
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
