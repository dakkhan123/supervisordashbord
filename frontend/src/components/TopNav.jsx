import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationDrawer';

const TopNav = ({ title, breadcrumb, searchVal, setSearchVal, setMobileOpen, showToast, notifications, onBellClick }) => {
  const navigate = useNavigate();

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchVal?.trim()) {
      showToast(`Searching for "${searchVal}"...`, 'success');
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
        {/* Notification Bell — opens Drawer */}
        <NotificationBell
          notifications={notifications}
          onClick={onBellClick}
        />

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
