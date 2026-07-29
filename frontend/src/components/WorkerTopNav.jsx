import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const WorkerTopNav = ({ user, setMobileOpen, onLogout, notificationsCount = 0, onBellClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdown, setProfileDropdown] = useState(false);

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
        return 'Smart Ops Dashboard';
    }
  };

  const title = getPageTitle();
  const workerName = user?.worker?.name || user?.name || user?.username || 'Suresh Kumar';
  const designation = user?.worker?.designation || user?.department || 'Senior CNC Machinist';
  const initials = workerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'US';

  return (
    <header className="sticky top-0 z-40 bg-surface text-on-surface border-b border-outline-variant/40 px-4 md:px-8 py-3 flex items-center justify-between gap-4 shadow-sm">
      {/* Mobile Toggle & Header Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-md hover:bg-surface-container text-on-surface transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h2 className="text-sm md:text-base font-bold text-on-surface tracking-tight">{title}</h2>
      </div>


      {/* Middle Search Input Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search tasks, logs..."
            className="w-full pl-10 pr-4 py-2 bg-surface-low border border-outline-variant rounded-lg text-xs text-on-surface placeholder-outline outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Right User Controls */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          onClick={onBellClick || (() => navigate('/worker/notifications'))}
          className="relative p-2 rounded-lg bg-surface-low border border-outline-variant text-outline hover:text-on-surface hover:border-primary transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {notificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
          )}
        </button>

        {/* User Profile Pill */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdown(!profileDropdown)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg bg-surface-low border border-outline-variant hover:border-primary transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-on-surface line-clamp-1">{workerName}</span>
              <span className="text-[9px] text-primary font-semibold line-clamp-1">{designation}</span>
            </div>
            <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
          </button>

          {profileDropdown && (
            <div className="absolute right-0 mt-2 w-52 bg-surface text-on-surface rounded-lg shadow-xl border border-outline-variant py-2 z-50 animate-scale-up">
              <div className="px-4 py-2 border-b border-outline-variant/40">
                <p className="text-xs font-bold text-on-surface">{workerName}</p>
                <p className="text-[10px] text-outline">{user?.email || `${user?.username || 'worker'}@factory.com`}</p>
              </div>
              <button
                onClick={() => {
                  setProfileDropdown(false);
                  navigate('/worker/profile');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-on-surface hover:bg-surface-container transition-all text-left"
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

        {/* Logout Action Button */}
        <button
          onClick={onLogout}
          className="p-2 rounded-lg bg-surface-low border border-outline-variant text-outline hover:text-error hover:border-error/40 transition-all cursor-pointer"
          title="Logout"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </header>
  );
};

export default WorkerTopNav;
