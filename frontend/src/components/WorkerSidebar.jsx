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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 w-[240px] h-screen bg-[#101726] text-white flex flex-col justify-between py-4 px-3 z-[100] transition-transform duration-250 ease-in-out border-r border-[#1e2d42] lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          {/* Top Brand Logo matching screenshot */}
          <div className="px-3 py-3 border-b border-[#1e2d42] mb-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 font-black text-xs flex items-center justify-center flex-shrink-0 shadow-md">
              SO
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-black text-white tracking-wider uppercase leading-tight truncate">SmartOps</h1>
              <p className="text-[9px] font-bold text-teal-400 uppercase tracking-widest truncate">MANUFACTURING</p>
            </div>
          </div>

          <div className="px-3 mb-3">
            <p className="text-xs font-bold text-gray-300">Smart Ops Dashboard</p>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path + item.name}
                to={item.path}
                end={item.path === '/worker'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#1d2b3e] text-white font-bold border-l-2 border-emerald-400 shadow-sm'
                      : 'text-gray-400 hover:bg-[#182335] hover:text-gray-200'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Logo Badge */}
        <div className="px-3 pt-3 border-t border-[#1e2d42] flex items-center justify-between">
          <div className="w-7 h-7 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-xs font-black text-white">
            N
          </div>
          <button
            onClick={onLogout}
            className="text-gray-400 hover:text-error transition-all p-1.5 rounded-md hover:bg-white/5"
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
