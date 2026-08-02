import React from 'react';
import { NavLink } from 'react-router-dom';

const WorkerSidebar = ({ mobileOpen, setMobileOpen, user, onLogout }) => {
  const menuItems = [
    { name: 'Dashboard', path: '/worker', icon: 'dashboard' },
    { name: 'Notifications', path: '/worker/notifications', icon: 'notifications' },
    { name: 'Assigned Tasks', path: '/worker/tasks', icon: 'assignment' },
    { name: 'Task Progress', path: '/worker/tasks', icon: 'trending_up' },
    { name: 'Completion Notes', path: '/worker/tasks', icon: 'note_alt' },
    { name: 'Attendance', path: '/worker/attendance', icon: 'calendar_today' },
    { name: 'Salary & Earnings', path: '/worker/salary', icon: 'payments' },
    { name: 'Profile', path: '/worker/profile', icon: 'person' },
    { name: 'Settings', path: '/worker/settings', icon: 'settings' },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-[99] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 w-[240px] h-screen bg-[#213145] text-white flex flex-col justify-between py-5 px-3 z-[100] transition-transform duration-250 ease-in-out border-r border-white/8 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          {/* Top Brand Logo */}
          <div className="px-3 pb-5 border-b border-white/8 mb-3 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-container to-tertiary-container rounded-[10px] flex items-center justify-center flex-shrink-0 shadow-sm text-white">
              <span className="material-symbols-outlined icon-filled text-[20px] text-white">badge</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-primary-fixed tracking-tight truncate leading-tight">SmartOps</h1>
              <p className="text-[10px] text-secondary-fixed-dim/70 tracking-wider uppercase truncate">Worker Console</p>
            </div>
          </div>

          <span className="text-[10px] font-bold text-secondary-fixed-dim/50 tracking-widest uppercase px-3 py-3 pb-1.5 block">
            Navigation
          </span>

          {/* Navigation Links */}
          <nav className="flex flex-col">
            {menuItems.map((item) => (
              <NavLink
                key={item.path + item.name}
                to={item.path}
                end={item.path === '/worker'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-[11px] rounded-lg text-secondary-fixed-dim text-[13px] font-medium transition-colors duration-150 relative mb-0.5 hover:bg-white/8 hover:text-white ${
                    isActive
                      ? 'bg-[#5dd9d8]/12 text-primary-fixed font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[60%] before:bg-primary-container before:rounded-r'
                      : ''
                  }`
                }
              >
                <span className="material-symbols-outlined icon-sm">{item.icon}</span>
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Logo Badge */}
        <div className="px-3 pt-3 border-t border-white/8 flex items-center justify-between">
          <div className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-xs font-black text-primary-fixed">
            W
          </div>
          <button
            onClick={onLogout}
            className="text-secondary-fixed-dim hover:text-error hover:bg-white/8 transition-all p-1.5 rounded-md cursor-pointer"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default WorkerSidebar;
