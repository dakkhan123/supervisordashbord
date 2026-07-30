import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { NotificationDetailModal } from '../../components/NotificationDrawer';

const WorkerNotifications = ({ showToast }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedNotif, setSelectedNotif] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.data || []);
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to fetch notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRead = async (id, markRead) => {
    try {
      const res = markRead
        ? await api.markNotificationRead(id)
        : await api.markNotificationUnread(id);
      if (res.success) {
        fetchNotifications();
        if (showToast) showToast(markRead ? 'Marked as read' : 'Marked as unread', 'success');
      }
    } catch (err) {
      if (showToast) showToast('Operation failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.deleteNotification(id);
      if (res.success) {
        fetchNotifications();
        if (selectedNotif?._id === id) setSelectedNotif(null);
        if (showToast) showToast('Notification deleted', 'success');
      }
    } catch (err) {
      if (showToast) showToast('Failed to delete notification', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await api.markAllNotificationsRead();
      if (res.success) {
        fetchNotifications();
        if (showToast) showToast('All notifications marked as read', 'success');
      }
    } catch (err) {
      if (showToast) showToast('Failed to mark all as read', 'error');
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-on-surface">Notifications & Alerts</h2>
          <p className="text-xs text-outline font-medium mt-0.5">
            System notices, task updates, attendance logs, and shift announcements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn btn-outline border border-outline-variant text-primary hover:bg-primary/10 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              Mark All Read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="btn btn-outline border border-outline-variant text-on-surface hover:bg-surface-container font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
        {['all', 'unread', 'read'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-extrabold capitalize transition-all cursor-pointer ${
              filter === tab
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface border border-outline-variant text-outline hover:text-on-surface'
            }`}
          >
            {tab} {tab === 'unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-surface border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col gap-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-outline font-semibold">Loading notifications...</div>
        ) : filteredNotifs.length === 0 ? (
          <div className="py-12 text-center text-xs text-outline font-semibold">No notifications found in this view.</div>
        ) : (
          filteredNotifs.map((n) => (
            <div
              key={n._id}
              onClick={() => setSelectedNotif(n)}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer ${
                !n.isRead
                  ? 'bg-primary/[0.04] border-primary/40 shadow-xs'
                  : 'bg-surface-low border-outline-variant/40 hover:border-primary/40'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.isRead ? 'bg-primary/10 text-primary' : 'bg-surface-container text-outline'}`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {n.type === 'attendance' ? 'fingerprint' : n.type === 'salary' ? 'payments' : 'notifications'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {n.type || 'Notice'}
                    </span>
                    {!n.isRead && (
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-error bg-error/10 px-2 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-extrabold text-on-surface mt-1">{n.title}</h3>
                  <p className="text-xs text-outline mt-0.5 line-clamp-2">{n.message || n.description || 'Click to view full notification details.'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNotif(n);
                  }}
                  className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container transition-all cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">visibility</span>
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notification Detail Modal */}
      {selectedNotif && (
        <NotificationDetailModal
          notification={selectedNotif}
          onClose={() => setSelectedNotif(null)}
          onDelete={handleDelete}
          onToggleRead={handleToggleRead}
        />
      )}
    </div>
  );
};

export default WorkerNotifications;
