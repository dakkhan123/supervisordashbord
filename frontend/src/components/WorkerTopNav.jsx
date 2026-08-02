import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import UserAvatar from './UserAvatar';

const WorkerTopNav = ({ user, setMobileOpen, onLogout, notificationsCount = 0, showToast, onBellClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTodayStatus = async () => {
    try {
      const res = await api.getTodayAttendance();
      if (res.success) {
        setTodayRecord(res.data);
      }
    } catch (e) {
      console.error('Failed to get today attendance in WorkerTopNav', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTodayStatus();
    }
  }, [user, location.pathname]);

  const handleCheckOut = async () => {
    if (!navigator.geolocation) {
      if (showToast) showToast('Geolocation is not supported by your browser to checkout.', 'error');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await api.checkOut({
            latitude,
            longitude,
            address: 'Pune Head Office (Clocked out from Navbar)',
            ipAddress: '127.0.0.1',
            device: 'Worker Mobile App'
          });
          if (res.success) {
            if (showToast) showToast('Clocked out successfully!', 'success');
            setTodayRecord(res.data);
            window.location.reload();
          } else {
            if (showToast) showToast(res.error || 'Failed to clock out', 'error');
          }
        } catch (err) {
          console.error(err);
          if (showToast) showToast('Connection failed', 'error');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        if (showToast) showToast('GPS coordinates required to clock out.', 'error');
        setLoading(false);
      }
    );
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/worker/tasks':
        return 'Assigned Tasks';
      case '/worker/attendance':
        return 'Attendance Record';
      case '/worker/salary':
        return 'Salary & Earnings';
      case '/worker/profile':
        return 'Worker Profile';
      case '/worker/notifications':
        return 'Notifications & Alerts';
      default:
        return 'Worker Console';
    }
  };

  const title = getPageTitle();
  const workerName = user?.worker?.name || user?.name || user?.username || 'User';
  const designation = user?.worker?.designation || user?.department || 'Staff';

  return (
    <header className="sticky top-0 z-50 h-[64px] bg-surface text-on-surface border-b border-outline-variant flex items-center justify-between px-6 gap-4">
      {/* Mobile Toggle & Header Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors duration-150 lg:hidden"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-on-surface tracking-tight leading-tight">{title}</h1>
          <p className="text-[12px] text-outline">Console / Worker</p>
        </div>
      </div>

      {/* Middle Search Input Bar */}
      <div className="relative flex-1 max-w-[360px] hidden md:block">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
          search
        </span>
        <input
          type="text"
          placeholder="Search tasks, logs..."
          className="w-full h-[38px] pl-10 pr-4 bg-surface-low border border-outline-variant rounded-sm text-[13px] text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
        />
      </div>

      {/* Right User Controls */}
      <div className="flex items-center gap-3">
        {todayRecord?.checkIn && !todayRecord?.checkOut && (
          <button
            onClick={handleCheckOut}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer hover:scale-[1.02] disabled:opacity-50 shrink-0"
            title="Mark Shift Check-Out for Today"
          >
            <span className="material-symbols-outlined text-[15px] leading-none">logout</span>
            {loading ? 'Clocking Out...' : 'Clock Out'}
          </button>
        )}

        {/* Notification Bell */}
        <button
          onClick={onBellClick || (() => navigate('/worker/notifications'))}
          className="relative p-2 rounded-full hover:bg-surface-low text-on-surface-variant transition-colors duration-150 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          {notificationsCount > 0 && (
            <span className="absolute top-1 right-1 bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {notificationsCount > 99 ? '99+' : notificationsCount}
            </span>
          )}
        </button>

        {/* User Profile Pill */}
        <div className="relative">
          <div
            onClick={() => setProfileDropdown(!profileDropdown)}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-on-surface leading-tight">{workerName}</p>
              <span className="text-[10px] text-outline uppercase tracking-wider">{designation}</span>
            </div>
            <UserAvatar
              user={user}
              className="w-9 h-9 rounded-full object-cover border border-outline-variant text-[14px] flex-shrink-0 overflow-hidden"
            />
          </div>

          {profileDropdown && (
            <div className="absolute right-0 mt-2 w-52 bg-surface-lowest text-on-surface rounded-lg shadow-xl border border-outline-variant py-2 z-50 animate-scale-up">
              <div className="px-4 py-2 border-b border-outline-variant/40">
                <p className="text-xs font-bold text-on-surface">{workerName}</p>
                <p className="text-[10px] text-outline">{user?.email || `${user?.username || 'worker'}@factory.com`}</p>
              </div>
              <button
                onClick={() => {
                  setProfileDropdown(false);
                  navigate('/worker/profile');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-low transition-all text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-outline">person</span>
                Profile Settings
              </button>
              <button
                onClick={() => {
                  setProfileDropdown(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-error hover:bg-error/10 transition-all text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-error">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default WorkerTopNav;
