import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const WorkerTopNav = ({ user, setMobileOpen, onLogout, notificationsCount = 0 }) => {
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
    <header className="sticky top-0 z-40 bg-[#101726] text-white border-b border-[#1e2d42] px-4 md:px-8 py-3 flex items-center justify-between gap-4">
      {/* Mobile Toggle & Header Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-md hover:bg-white/10 text-white transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h2 className="text-sm md:text-base font-bold text-white tracking-tight">{title}</h2>
      </div>


      {/* Middle Search Input Bar matching screenshot */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search tasks, logs..."
            className="w-full pl-10 pr-4 py-2 bg-[#141e2e] border border-[#1e2d42] rounded-lg text-xs text-white placeholder-gray-400 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all"
          />
        </div>
      </div>

      {/* Right User Controls matching screenshot */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          onClick={() => navigate('/worker/notifications')}
          className="relative p-2 rounded-lg bg-[#141e2e] border border-[#1e2d42] text-gray-300 hover:text-white transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {notificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-teal-400 rounded-full"></span>
          )}
        </button>

        {/* User Profile Pill matching screenshot */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdown(!profileDropdown)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg bg-[#141e2e] border border-[#1e2d42] hover:border-teal-500/50 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-white line-clamp-1">{workerName}</span>
              <span className="text-[9px] text-teal-400 font-semibold line-clamp-1">{designation}</span>
            </div>
            <span className="material-symbols-outlined text-[16px] text-gray-400">expand_more</span>
          </button>

          {profileDropdown && (
            <div className="absolute right-0 mt-2 w-52 bg-[#141e2e] text-white rounded-lg shadow-xl border border-[#1e2d42] py-2 z-50 animate-scale-up">
              <div className="px-4 py-2 border-b border-[#1e2d42]">
                <p className="text-xs font-bold text-white">{workerName}</p>
                <p className="text-[10px] text-gray-400">{user?.email || `${user?.username || 'worker'}@factory.com`}</p>
              </div>
              <button
                onClick={() => {
                  setProfileDropdown(false);
                  navigate('/worker/profile');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-200 hover:bg-[#1e2d42] transition-all text-left"
              >
                <span className="material-symbols-outlined text-[18px] text-gray-400">person</span>
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

        {/* Logout Action Button matching screenshot [-> */}
        <button
          onClick={onLogout}
          className="p-2 rounded-lg bg-[#141e2e] border border-[#1e2d42] text-gray-300 hover:text-error hover:border-error/30 transition-all cursor-pointer"
          title="Logout"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </header>
  );
};

export default WorkerTopNav;
