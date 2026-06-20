import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ mobileOpen, setMobileOpen, alertCount = 0, user, onLogout }) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-[99] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 w-[260px] h-screen bg-[#213145] flex flex-col py-5 z-100 transition-transform duration-250 ease-in-out overflow-y-auto overflow-x-hidden z-[100] lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 pb-6 flex items-center gap-2.5 border-b border-white/8 mb-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-container to-tertiary-container rounded-[10px] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined icon-filled text-[20px] text-white">inventory_2</span>
          </div>
          <div className="logo-text">
            <h1 className="text-lg font-extrabold text-primary-fixed tracking-tight">SmartOps</h1>
            <p className="text-[10px] text-secondary-fixed-dim/70 tracking-wider uppercase">Inventory Management</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col px-3 py-1">
          <span className="text-[10px] font-bold text-secondary-fixed-dim/50 tracking-widest uppercase px-3 py-3 pb-1.5">
            Main
          </span>
          <NavLink 
            to="/" 
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-[11px] rounded-lg text-secondary-fixed-dim text-[13px] font-medium transition-colors duration-150 relative mb-0.5 hover:bg-white/8 hover:text-white ${isActive ? 'bg-[#5dd9d8]/12 text-primary-fixed font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:height-[60%] before:bg-primary-container before:rounded-r' : ''}`
            }
          >
            <span className="material-symbols-outlined icon-sm">dashboard</span>Dashboard
          </NavLink>

          <NavLink 
            to="/inventory" 
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-[11px] rounded-lg text-secondary-fixed-dim text-[13px] font-medium transition-colors duration-150 relative mb-0.5 hover:bg-white/8 hover:text-white ${isActive ? 'bg-[#5dd9d8]/12 text-primary-fixed font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:height-[60%] before:bg-primary-container before:rounded-r' : ''}`
            }
          >
            <span className="material-symbols-outlined icon-sm">inventory_2</span>Inventory List
          </NavLink>

          <NavLink 
            to="/scan" 
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-[11px] rounded-lg text-secondary-fixed-dim text-[13px] font-medium transition-colors duration-150 relative mb-0.5 hover:bg-white/8 hover:text-white ${isActive ? 'bg-[#5dd9d8]/12 text-primary-fixed font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:height-[60%] before:bg-primary-container before:rounded-r' : ''}`
            }
          >
            <span className="material-symbols-outlined icon-sm">qr_code_scanner</span>Scan Item QR
          </NavLink>

          <NavLink 
            to="/alerts" 
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-[11px] rounded-lg text-secondary-fixed-dim text-[13px] font-medium transition-colors duration-150 relative mb-0.5 hover:bg-white/8 hover:text-white ${isActive ? 'bg-[#5dd9d8]/12 text-primary-fixed font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:height-[60%] before:bg-primary-container before:rounded-r' : ''}`
            }
          >
            <span className="material-symbols-outlined icon-sm">notification_important</span>Low Stock Alerts
            {alertCount > 0 && (
              <span className="ml-auto bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </NavLink>

          <span className="text-[10px] font-bold text-secondary-fixed-dim/50 tracking-widest uppercase px-3 py-3 pb-1.5 mt-2">
            Management
          </span>
          <NavLink 
            to="/tasks" 
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-[11px] rounded-lg text-secondary-fixed-dim text-[13px] font-medium transition-colors duration-150 relative mb-0.5 hover:bg-white/8 hover:text-white ${isActive ? 'bg-[#5dd9d8]/12 text-primary-fixed font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:height-[60%] before:bg-primary-container before:rounded-r' : ''}`
            }
          >
            <span className="material-symbols-outlined icon-sm">task_alt</span>Tasks
          </NavLink>

          <NavLink 
            to="/attendance" 
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-[11px] rounded-lg text-secondary-fixed-dim text-[13px] font-medium transition-colors duration-150 relative mb-0.5 hover:bg-white/8 hover:text-white ${isActive ? 'bg-[#5dd9d8]/12 text-primary-fixed font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:height-[60%] before:bg-primary-container before:rounded-r' : ''}`
            }
          >
            <span className="material-symbols-outlined icon-sm">co_present</span>Attendance
          </NavLink>

          <NavLink 
            to="/workers" 
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-[11px] rounded-lg text-secondary-fixed-dim text-[13px] font-medium transition-colors duration-150 relative mb-0.5 hover:bg-white/8 hover:text-white ${isActive ? 'bg-[#5dd9d8]/12 text-primary-fixed font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:height-[60%] before:bg-primary-container before:rounded-r' : ''}`
            }
          >
            <span className="material-symbols-outlined icon-sm">badge</span>Workers
          </NavLink>

          <span className="text-[10px] font-bold text-secondary-fixed-dim/50 tracking-widest uppercase px-3 py-3 pb-1.5 mt-2">
            Analytics
          </span>
          <NavLink 
            to="/reports" 
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-[11px] rounded-lg text-secondary-fixed-dim text-[13px] font-medium transition-colors duration-150 relative mb-0.5 hover:bg-white/8 hover:text-white ${isActive ? 'bg-[#5dd9d8]/12 text-primary-fixed font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:height-[60%] before:bg-primary-container before:rounded-r' : ''}`
            }
          >
            <span className="material-symbols-outlined icon-sm">bar_chart</span>Reports
          </NavLink>

          <NavLink 
            to="/performance" 
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-[11px] rounded-lg text-secondary-fixed-dim text-[13px] font-medium transition-colors duration-150 relative mb-0.5 hover:bg-white/8 hover:text-white ${isActive ? 'bg-[#5dd9d8]/12 text-primary-fixed font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:height-[60%] before:bg-primary-container before:rounded-r' : ''}`
            }
          >
            <span className="material-symbols-outlined icon-sm">assessment</span>Performance
          </NavLink>

          <span className="text-[10px] font-bold text-secondary-fixed-dim/50 tracking-widest uppercase px-3 py-3 pb-1.5 mt-2">
            System
          </span>
          <NavLink 
            to="/settings" 
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-[11px] rounded-lg text-secondary-fixed-dim text-[13px] font-medium transition-colors duration-150 relative mb-0.5 hover:bg-white/8 hover:text-white ${isActive ? 'bg-[#5dd9d8]/12 text-primary-fixed font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:height-[60%] before:bg-primary-container before:rounded-r' : ''}`
            }
          >
            <span className="material-symbols-outlined icon-sm">settings</span>Settings
          </NavLink>
        </nav>

        <div className="relative p-3 border-t border-white/8 mt-auto">
          {profileMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#213145] border border-white/8 rounded-lg p-1 shadow-lg animate-scale-up z-[110]">
              <button 
                onClick={() => {
                  setProfileMenuOpen(false);
                  if (onLogout) onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-error hover:bg-white/8 rounded transition-colors text-left"
              >
                <span className="material-symbols-outlined icon-xs">logout</span>
                Sign Out
              </button>
            </div>
          )}
          <div 
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-white/8 cursor-pointer transition-colors duration-150"
          >
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAU-lK8Rt-Mqj93-xCpACNwQ-w7_va6xnQRFKMlPLvp5sHzwBCrsDMpFCUVAjyc0KQo7-gZU2n-alm2et-5XWaa1E2mivdJp8gSVecU00X_NVBlohuHDna54ecaKYZsEAKMFPL-Y2ZOZCECQlwF-48OeQBfg5Sp3qCKSUk_0UsUzZxDXq7ZFTPdrhwngLgXfLRCSMGyv2AYWO-y_TbPMGktVfguTkGaNsesahlCDRLkdOC-kSZNXRWnUX9jV8sGEoQnUAbnSSrWAU0" 
              className="w-8 h-8 rounded-full object-cover border-2 border-primary-container"
              alt={`Supervisor ${user?.worker?.name || 'Rajesh Kumar'}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary-fixed truncate">{user?.worker?.name || 'Rajesh Kumar'}</p>
              <span className="text-[10px] text-secondary-fixed-dim/70 opacity-70 block truncate">
                {user?.role || 'Supervisor'} · Pune-A12
              </span>
            </div>
            <span className="material-symbols-outlined icon-xs text-secondary-fixed-dim/50 flex-shrink-0">more_vert</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
