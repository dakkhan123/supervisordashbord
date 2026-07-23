import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const WorkerNav = ({ user, showToast }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('smartops_token');
    localStorage.removeItem('smartops_user');
    showToast('Logged out successfully', 'info');
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/worker', icon: 'dashboard' },
    { name: 'Assigned Tasks', path: '/worker/tasks', icon: 'assignment' },
    { name: 'Attendance', path: '/worker/attendance', icon: 'calendar_today' },
    { name: 'Salary & Slips', path: '/worker/salary', icon: 'payments' },
    { name: 'Profile', path: '/worker/profile', icon: 'person' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#213145] text-white shadow-md border-b border-outline-variant/20 px-4 md:px-8 py-3">
      <div className="flex items-center justify-between">
        {/* Left Brand / Mobile toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-white/10 text-white transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <Link to="/worker" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-[#5dd9d8] to-primary rounded-lg flex items-center justify-center text-slate-900 font-extrabold shadow-sm">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white leading-tight">SmartOps</h1>
              <p className="text-[10px] text-[#5dd9d8] font-bold uppercase tracking-wider">Worker Portal</p>
            </div>
          </Link>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#5dd9d8]/20 text-[#5dd9d8] shadow-inner'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right User Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#5dd9d8] text-slate-900 font-bold flex items-center justify-center text-xs uppercase shadow-sm">
              {user?.worker?.name ? user.worker.name.charAt(0) : (user?.username ? user.username.charAt(0) : 'W')}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-white line-clamp-1">{user?.worker?.name || user?.username || 'Worker'}</span>
              <span className="text-[10px] text-[#5dd9d8] font-semibold uppercase">{user?.role || 'Worker'}</span>
            </div>
            <span className="material-symbols-outlined text-[16px] text-gray-300">expand_more</span>
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-surface text-on-surface rounded-md shadow-xl border border-outline-variant py-2 z-50 animate-scale-up">
              <div className="px-4 py-2 border-b border-outline-variant/50">
                <p className="text-xs font-extrabold text-on-surface">{user?.worker?.name || user?.username}</p>
                <p className="text-[10px] text-outline">{user?.email || `${user?.username}@factory.com`}</p>
              </div>
              <Link
                to="/worker/profile"
                onClick={() => setProfileDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-all"
              >
                <span className="material-symbols-outlined text-[18px] text-outline">person</span>
                Profile Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-error hover:bg-error/10 transition-all text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-error">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-outline-variant/30 flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#5dd9d8] text-slate-950 font-extrabold'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default WorkerNav;
