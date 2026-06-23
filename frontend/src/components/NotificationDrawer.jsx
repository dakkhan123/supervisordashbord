import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const formatTimeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

const formatFullDate = (dateStr) =>
  new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true
  });

const TYPE_CONFIG = {
  item_added:        { icon: 'add_circle',      color: 'text-emerald-600', bg: 'bg-emerald-50',    border: 'border-emerald-200', label: 'Item Added',         badge: 'bg-emerald-100 text-emerald-700' },
  item_updated:      { icon: 'edit',             color: 'text-blue-600',    bg: 'bg-blue-50',       border: 'border-blue-200',    label: 'Item Updated',       badge: 'bg-blue-100 text-blue-700' },
  item_deleted:      { icon: 'delete',           color: 'text-red-600',     bg: 'bg-red-50',        border: 'border-red-200',     label: 'Item Deleted',       badge: 'bg-red-100 text-red-700' },
  stock_increase:    { icon: 'trending_up',      color: 'text-teal-600',    bg: 'bg-teal-50',       border: 'border-teal-200',    label: 'Stock Increase',     badge: 'bg-teal-100 text-teal-700' },
  stock_decrease:    { icon: 'trending_down',    color: 'text-orange-600',  bg: 'bg-orange-50',     border: 'border-orange-200',  label: 'Stock Decrease',     badge: 'bg-orange-100 text-orange-700' },
  low_stock:         { icon: 'warning',          color: 'text-amber-600',   bg: 'bg-amber-50',      border: 'border-amber-200',   label: 'Low Stock',          badge: 'bg-amber-100 text-amber-700' },
  critical_stock:    { icon: 'error',            color: 'text-red-700',     bg: 'bg-red-50',        border: 'border-red-300',     label: 'Critical Stock',     badge: 'bg-red-100 text-red-800' },
  stock_replenished: { icon: 'check_circle',     color: 'text-green-600',   bg: 'bg-green-50',      border: 'border-green-200',   label: 'Stock Replenished',  badge: 'bg-green-100 text-green-700' },
  restock_created:   { icon: 'shopping_cart',    color: 'text-indigo-600',  bg: 'bg-indigo-50',     border: 'border-indigo-200',  label: 'Restock Request',    badge: 'bg-indigo-100 text-indigo-700' },
  restock_approved:  { icon: 'task_alt',         color: 'text-emerald-600', bg: 'bg-emerald-50',    border: 'border-emerald-200', label: 'Restock Approved',   badge: 'bg-emerald-100 text-emerald-700' },
  restock_rejected:  { icon: 'cancel',           color: 'text-red-600',     bg: 'bg-red-50',        border: 'border-red-200',     label: 'Restock Rejected',   badge: 'bg-red-100 text-red-700' },
};

const getConfig = (type) => TYPE_CONFIG[type] || {
  icon: 'notifications', color: 'text-gray-600', bg: 'bg-gray-50',
  border: 'border-gray-200', label: 'Notification', badge: 'bg-gray-100 text-gray-700'
};

/* ─────────────────────────────────────────────
   Notification Detail Modal
───────────────────────────────────────────── */
function NotificationDetailModal({ notification, onClose, onDelete, onToggleRead }) {
  const cfg = getConfig(notification.type);
  const navigate = useNavigate();

  const handleNavigate = () => {
    onClose();
    const { type } = notification;
    if (type === 'low_stock' || type === 'critical_stock') navigate('/alerts', { state: { tab: 'dashboards' } });
    else if (type === 'item_added' || type === 'item_updated' || type === 'item_deleted') navigate('/inventory');
    else if (type === 'stock_increase' || type === 'stock_decrease' || type === 'stock_replenished') navigate('/reports');
    else if (type?.startsWith('restock_')) navigate('/alerts', { state: { tab: 'requests' } });
    else navigate('/inventory');
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      style={{ background: 'rgba(11,28,48,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUpFade 0.22s cubic-bezier(.4,0,.2,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header stripe */}
        <div className={`${cfg.bg} ${cfg.border} border-b px-5 py-4 flex items-start gap-3`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
            <span className={`material-symbols-outlined icon-filled ${cfg.color}`} style={{ fontSize: 22 }}>
              {cfg.icon}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.badge}`}>
                {cfg.label}
              </span>
              {!notification.isRead && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Unread
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-on-surface mt-1 leading-snug">{notification.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">Message</p>
            <p className="text-sm text-on-surface leading-relaxed">{notification.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-low rounded-xl p-3">
              <p className="text-[10px] font-semibold text-outline uppercase tracking-wider mb-1">Received</p>
              <p className="text-[12px] font-semibold text-on-surface">{formatTimeAgo(notification.createdAt)}</p>
            </div>
            <div className="bg-surface-low rounded-xl p-3">
              <p className="text-[10px] font-semibold text-outline uppercase tracking-wider mb-1">Status</p>
              <p className={`text-[12px] font-semibold ${notification.isRead ? 'text-outline' : 'text-primary'}`}>
                {notification.isRead ? 'Read' : 'Unread'}
              </p>
            </div>
          </div>

          <div className="bg-surface-low rounded-xl p-3">
            <p className="text-[10px] font-semibold text-outline uppercase tracking-wider mb-1">Timestamp</p>
            <p className="text-[11px] font-mono text-on-surface-variant">{formatFullDate(notification.createdAt)}</p>
          </div>

          {notification.itemId && (
            <div className="bg-surface-low rounded-xl p-3">
              <p className="text-[10px] font-semibold text-outline uppercase tracking-wider mb-1">Item Reference</p>
              <p className="text-[11px] font-mono text-on-surface">{notification.itemId}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={handleNavigate}
            className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-primary text-white rounded-xl text-[12px] font-bold hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
            View Details
          </button>
          <button
            onClick={() => { onToggleRead(notification._id, !notification.isRead); onClose(); }}
            className="h-9 px-3 flex items-center gap-1.5 border border-outline-variant rounded-xl text-[12px] font-semibold text-on-surface-variant hover:bg-surface-low transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {notification.isRead ? 'mark_as_unread' : 'done_all'}
            </span>
            {notification.isRead ? 'Unread' : 'Mark Read'}
          </button>
          <button
            onClick={() => { onDelete(notification._id); onClose(); }}
            className="h-9 px-3 flex items-center gap-1.5 border border-red-200 rounded-xl text-[12px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Notification Item Row
───────────────────────────────────────────── */
function NotificationItem({ n, onToggleRead, onDelete, onOpenDetail, isDeleting, isUpdating }) {
  const cfg = getConfig(n.type);

  return (
    <div
      className={`
        group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer
        border-b border-outline-variant/20 last:border-b-0
        transition-all duration-150
        ${!n.isRead ? 'bg-primary/[0.03]' : 'bg-transparent'}
        hover:bg-surface-low
        ${isDeleting ? 'opacity-40 pointer-events-none' : ''}
      `}
      onClick={() => onOpenDetail(n)}
    >
      {/* Unread dot */}
      {!n.isRead && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
      )}

      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.bg} ${cfg.border} mt-0.5`}>
        <span className={`material-symbols-outlined icon-sm ${cfg.color}`}>{cfg.icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-14">
        <div className="flex items-start justify-between gap-2">
          <h4 className={`text-[12px] font-bold leading-snug ${!n.isRead ? 'text-on-surface' : 'text-on-surface-variant'}`}>
            {n.title}
          </h4>
        </div>
        <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
          <span className="text-[10px] text-outline font-medium">{formatTimeAgo(n.createdAt)}</span>
        </div>
      </div>

      {/* Hover action buttons */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleRead(n._id, !n.isRead); }}
          disabled={isUpdating}
          className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline hover:text-primary transition-colors"
          title={n.isRead ? 'Mark as Unread' : 'Mark as Read'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
            {n.isRead ? 'mark_as_unread' : 'done_all'}
          </span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(n._id); }}
          disabled={isDeleting}
          className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-outline hover:text-red-600 transition-colors"
          title="Delete"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Drawer
───────────────────────────────────────────── */
export function NotificationDrawer({ isOpen, onClose, notifications, onRefresh, showToast }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [detailNotif, setDetailNotif] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const drawerRef = useRef(null);
  const intervalRef = useRef(null);

  // Auto-refresh every 10 seconds while drawer is open
  useEffect(() => {
    if (isOpen) {
      onRefresh();
      setLastRefresh(Date.now());
      intervalRef.current = setInterval(() => {
        onRefresh();
        setLastRefresh(Date.now());
      }, 10000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOpen, onRefresh]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !detailNotif) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, detailNotif]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setConfirmClearAll(false);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const filtered = (notifications || []).filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const unreadCount = (notifications || []).filter(n => !n.isRead).length;

  const handleToggleRead = useCallback(async (id, markRead) => {
    setUpdatingIds(prev => new Set([...prev, id]));
    try {
      const res = markRead
        ? await api.markNotificationRead(id)
        : await api.markNotificationUnread(id);
      if (res.success) onRefresh();
    } catch (err) {
      showToast('Failed to update notification', 'error');
    } finally {
      setUpdatingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [onRefresh, showToast]);

  const handleDelete = useCallback(async (id) => {
    setDeletingIds(prev => new Set([...prev, id]));
    try {
      const res = await api.deleteNotification(id);
      if (res.success) {
        onRefresh();
        showToast('Notification deleted', 'success');
        if (detailNotif?._id === id) setDetailNotif(null);
      }
    } catch (err) {
      showToast('Failed to delete notification', 'error');
    } finally {
      setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [onRefresh, showToast, detailNotif]);

  const handleMarkAllRead = async () => {
    const unread = (notifications || []).filter(n => !n.isRead);
    if (!unread.length) return;
    setIsMarkingAll(true);
    try {
      const res = await api.markAllNotificationsRead();
      if (res.success) {
        onRefresh();
        showToast(`Marked ${unread.length} notification${unread.length > 1 ? 's' : ''} as read`, 'success');
      }
    } catch (err) {
      showToast('Failed to mark all as read', 'error');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await api.clearNotifications();
      if (res.success) {
        onRefresh();
        setConfirmClearAll(false);
        showToast('All notifications cleared', 'success');
      }
    } catch (err) {
      showToast('Failed to clear notifications', 'error');
    }
  };

  const manualRefresh = () => {
    onRefresh();
    setLastRefresh(Date.now());
    showToast('Notifications refreshed', 'success');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[900] bg-black/30"
        style={{ backdropFilter: 'blur(2px)', animation: 'fadeIn 0.2s ease' }}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 bottom-0 z-[950] w-full max-w-[420px] bg-surface-lowest flex flex-col shadow-2xl"
        style={{ animation: 'slideInRight 0.25s cubic-bezier(.4,0,.2,1)' }}
        role="dialog"
        aria-label="Notifications panel"
        aria-modal="true"
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-outline-variant/50 bg-surface-lowest">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined icon-sm text-primary">notifications</span>
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-on-surface">Notifications</h2>
                <p className="text-[10px] text-outline">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Manual Refresh */}
              <button
                onClick={manualRefresh}
                className="w-8 h-8 rounded-xl hover:bg-surface-low flex items-center justify-center text-outline hover:text-primary transition-colors"
                title="Refresh notifications"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl hover:bg-surface-low flex items-center justify-center text-outline transition-colors"
                title="Close panel"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-surface-low rounded-xl p-1 flex-1">
              {(['all', 'unread', 'read']).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`
                    flex-1 h-7 rounded-lg text-[11px] font-bold capitalize transition-all duration-150
                    ${filter === tab
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'}
                  `}
                >
                  {tab}
                  {tab === 'unread' && unreadCount > 0 && (
                    <span className={`ml-1 ${filter === tab ? 'text-white/80' : 'text-primary'}`}>
                      ({unreadCount})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Mark All Read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="h-9 px-2.5 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors flex items-center gap-1 flex-shrink-0 disabled:opacity-50"
                title="Mark all as read"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>done_all</span>
                <span className="hidden sm:inline">All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Notification List ── */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-surface-low flex items-center justify-center">
                <span className="material-symbols-outlined text-outline" style={{ fontSize: 32 }}>
                  {filter === 'unread' ? 'done_all' : 'notifications_off'}
                </span>
              </div>
              <p className="text-sm font-bold text-on-surface-variant text-center">
                {filter === 'unread' ? 'No unread notifications' :
                 filter === 'read' ? 'No read notifications' :
                 'No notifications yet'}
              </p>
              <p className="text-[11px] text-outline text-center">
                {filter === 'all'
                  ? 'System events like stock alerts and item changes will appear here.'
                  : `Switch to "All" to see ${filter === 'unread' ? 'read' : 'unread'} notifications.`}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map(n => (
                <NotificationItem
                  key={n._id}
                  n={n}
                  onToggleRead={handleToggleRead}
                  onDelete={handleDelete}
                  onOpenDetail={setDetailNotif}
                  isDeleting={deletingIds.has(n._id)}
                  isUpdating={updatingIds.has(n._id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 border-t border-outline-variant/50 px-5 py-3 bg-surface-low flex items-center justify-between gap-3">
          <div className="text-[10px] text-outline">
            {(notifications || []).length} total · auto-refreshes every 10s
          </div>
          <div className="flex items-center gap-2">
            {(notifications || []).length > 0 && (
              confirmClearAll ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-on-surface-variant font-medium">Clear all?</span>
                  <button
                    onClick={handleClearAll}
                    className="text-[11px] font-bold text-error hover:underline"
                  >Confirm</button>
                  <button
                    onClick={() => setConfirmClearAll(false)}
                    className="text-[11px] font-bold text-outline hover:underline"
                  >Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="text-[11px] font-bold text-error hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete_sweep</span>
                  Clear All
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal (rendered on top of drawer) */}
      {detailNotif && (
        <NotificationDetailModal
          notification={detailNotif}
          onClose={() => setDetailNotif(null)}
          onDelete={handleDelete}
          onToggleRead={handleToggleRead}
        />
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUpFade {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

/* ─────────────────────────────────────────────
   Bell Button (used in TopNav)
───────────────────────────────────────────── */
export function NotificationBell({ notifications, onClick }) {
  const unreadCount = (notifications || []).filter(n => !n.isRead).length;
  const hasNew = unreadCount > 0;

  return (
    <button
      id="notifications-bell-btn"
      onClick={onClick}
      className="relative w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors duration-150 cursor-pointer active:scale-95"
      title={hasNew ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
      aria-label={hasNew ? `${unreadCount} unread notifications` : 'Notifications'}
    >
      <span className={`material-symbols-outlined transition-all duration-300 ${hasNew ? 'icon-filled text-primary' : ''}`}>
        notifications
      </span>
      {hasNew && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-error rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-surface leading-none"
          style={{ animation: unreadCount > 0 ? 'badgePop 0.3s cubic-bezier(.4,0,.2,1)' : 'none' }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      <style>{`
        @keyframes badgePop {
          0%   { transform: scale(0); }
          70%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </button>
  );
}
