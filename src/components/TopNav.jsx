import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const TopNav = ({ title, breadcrumb, searchVal, setSearchVal, setMobileOpen, showToast, notifications, onRefreshNotifications }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setConfirmClear(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      showToast(`Searching for "${searchVal}"...`, 'success');
    }
  };

  const unreadCount = (notifications || []).filter(n => !n.isRead).length;

  const handleMarkRead = async (e, id, readState) => {
    e.stopPropagation();
    try {
      const res = readState ? await api.markNotificationRead(id) : await api.markNotificationUnread(id);
      if (res.success) {
        onRefreshNotifications();
      }
    } catch (err) {
      console.error('Failed to change notification status:', err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await api.deleteNotification(id);
      if (res.success) {
        onRefreshNotifications();
        showToast('Notification deleted', 'success');
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await api.clearNotifications();
      if (res.success) {
        onRefreshNotifications();
        setConfirmClear(false);
        setDropdownOpen(false);
        showToast('All notifications cleared', 'success');
      }
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const handleNotificationClick = async (n) => {
    // Mark as read
    if (!n.isRead) {
      try {
        await api.markNotificationRead(n._id);
        onRefreshNotifications();
      } catch (err) {
        console.error(err);
      }
    }
    setDropdownOpen(false);

    // Route navigation
    if (n.type === 'low_stock' || n.type === 'critical_stock') {
      navigate('/alerts', { state: { tab: 'dashboards' } });
    } else if (n.type === 'item_added' || n.type === 'item_updated' || n.type === 'item_deleted') {
      navigate('/inventory');
    } else if (n.type === 'stock_increase' || n.type === 'stock_decrease' || n.type === 'stock_replenished') {
      navigate('/reports');
    } else if (n.type.startsWith('restock_')) {
      navigate('/alerts', { state: { tab: 'requests' } });
    } else {
      navigate('/inventory');
    }
  };

  const formatTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getNotificationStyles = (type) => {
    switch (type) {
      case 'item_added':
      case 'stock_increase':
      case 'stock_replenished':
      case 'restock_approved':
        return { icon: 'check_circle', bg: 'bg-primary/10 text-primary' };
      case 'critical_stock':
      case 'item_deleted':
      case 'restock_rejected':
        return { icon: 'error', bg: 'bg-error/10 text-error' };
      case 'low_stock':
        return { icon: 'warning', bg: 'bg-tertiary/10 text-tertiary' };
      case 'item_updated':
      case 'restock_created':
        return { icon: 'info', bg: 'bg-secondary/10 text-secondary' };
      default:
        return { icon: 'notifications', bg: 'bg-surface-container-high text-on-surface-variant' };
    }
  };

  return (
    <header className="sticky top-0 z-50 h-[64px] bg-surface border-b border-outline-variant flex items-center justify-between px-6 gap-4">
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button 
          className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors duration-150 lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div>
          <div className="text-xl font-extrabold text-on-surface tracking-tight leading-tight">{title}</div>
          <div className="text-[12px] text-outline">{breadcrumb}</div>
        </div>
      </div>

      <div className="relative flex-1 max-w-[360px] hidden md:block">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
          search
        </span>
        <input 
          type="text" 
          placeholder="Search SKU, batch, or item..."
          value={searchVal || ''}
          onChange={(e) => setSearchVal(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full h-[38px] pl-10 pr-4 bg-surface-low border border-outline-variant rounded-sm text-[13px] text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
          autoComplete="off"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications Bell Button & Dropdown */}
        <div className="relative flex items-center" ref={dropdownRef}>
          <button 
            id="notifications-bell-btn"
            className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors duration-150 relative cursor-pointer active:scale-95"
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setConfirmClear(false);
            }}
            title="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 bg-error rounded-full text-white text-[9px] font-bold flex items-center justify-center border border-surface leading-none animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div 
              id="notifications-dropdown-panel"
              className="absolute right-0 top-[45px] w-[320px] sm:w-[380px] bg-surface-lowest border border-outline-variant shadow-xl rounded-md overflow-hidden z-[999] animate-scale-up"
            >
              {/* Dropdown Header */}
              <div className="px-4 py-3 bg-surface-low border-b border-outline-variant flex items-center justify-between text-xs font-bold text-on-surface">
                <span>System Notifications ({unreadCount} unread)</span>
                {notifications && notifications.length > 0 && (
                  confirmClear ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleClearAll}
                        className="text-error hover:underline text-[10px]"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => setConfirmClear(false)}
                        className="text-outline hover:underline text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmClear(true)}
                      className="text-primary hover:underline text-[10px]"
                    >
                      Clear All
                    </button>
                  )
                )}
              </div>

              {/* Scrollable Notifications List */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-outline-variant/30">
                {notifications && notifications.length > 0 ? (
                  notifications.map((n) => {
                    const style = getNotificationStyles(n.type);
                    return (
                      <div 
                        key={n._id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 flex items-start gap-3.5 hover:bg-surface-low cursor-pointer transition-colors relative group ${!n.isRead ? 'bg-primary/[0.03]' : ''}`}
                      >
                        {/* Status Unread Dot Indicator */}
                        {!n.isRead && (
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full"></span>
                        )}

                        {/* Type Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                          <span className="material-symbols-outlined icon-sm">{style.icon}</span>
                        </div>

                        {/* Detail Content */}
                        <div className="flex-1 min-w-0 pr-6">
                          <h4 className="text-[12px] font-bold text-on-surface leading-snug">{n.title}</h4>
                          <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-outline mt-1 block font-semibold">{formatTimeAgo(n.createdAt)}</span>
                        </div>

                        {/* Actions Overlay */}
                        <div className="absolute right-2.5 top-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-surface-lowest sm:bg-transparent rounded px-1">
                          <button
                            onClick={(e) => handleMarkRead(e, n._id, !n.isRead)}
                            className="w-6 h-6 rounded hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface"
                            title={n.isRead ? 'Mark as Unread' : 'Mark as Read'}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {n.isRead ? 'mark_as_unread' : 'check'}
                            </span>
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, n._id)}
                            className="w-6 h-6 rounded hover:bg-surface-container flex items-center justify-center text-error hover:brightness-95"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-outline text-xs">
                    No new system notifications logged.
                  </div>
                )}
              </div>

              {/* View History Footer */}
              <div className="px-4 py-2 border-t border-outline-variant bg-surface-low text-center">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  Manage Notification History →
                </button>
              </div>
            </div>
          )}
        </div>

        <button 
          className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors duration-150"
          onClick={() => navigate('/settings')}
        >
          <span className="material-symbols-outlined">settings_suggest</span>
        </button>

        <div className="w-[1px] h-6 bg-outline-variant opacity-40 mx-1"></div>

        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/settings')}>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-on-surface leading-tight">Rajesh Kumar</p>
            <span className="text-[10px] text-outline uppercase tracking-wider">Unit Pune-A12</span>
          </div>
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAU-lK8Rt-Mqj93-xCpACNwQ-w7_va6xnQRFKMlPLvp5sHzwBCrsDMpFCUVAjyc0KQo7-gZU2n-alm2et-5XWaa1E2mivdJp8gSVecU00X_NVBlohuHDna54ecaKYZsEAKMFPL-Y2ZOZCECQlwF-48OeQBfg5Sp3qCKSUk_0UsUzZxDXq7ZFTPdrhwngLgXfLRCSMGyv2AYWO-y_TbPMGktVfguTkGaNsesahlCDRLkdOC-kSZNXRWnUX9jV8sGEoQnUAbnSSrWAU0" 
            className="w-9 h-9 rounded-full object-cover border border-outline-variant"
            alt="User avatar"
          />
        </div>
      </div>
    </header>
  );
};

export default TopNav;
