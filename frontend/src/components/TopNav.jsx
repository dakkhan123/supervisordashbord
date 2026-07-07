import { useNavigate, useLocation } from 'react-router-dom';
import { NotificationBell } from './NotificationDrawer';
import UserAvatar from './UserAvatar';

const TopNav = ({ title, breadcrumb, searchVal, setSearchVal, setMobileOpen, showToast, notifications, onBellClick, user }) => {
  const navigate = useNavigate();
  const location = useLocation();

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

        <div 
          className={`flex items-center gap-2.5 ${location.pathname === '/settings' ? 'cursor-default' : 'cursor-pointer'}`} 
          onClick={() => {
            if (location.pathname !== '/settings') navigate('/settings');
          }}
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-on-surface leading-tight">{user?.worker?.name || user?.username || 'User'}</p>
            <span className="text-[10px] text-outline uppercase tracking-wider">{user?.role === 'Worker' ? 'Staff' : 'Unit Pune-A12'}</span>
          </div>
          <UserAvatar 
            user={user} 
            className="w-9 h-9 rounded-full object-cover border border-outline-variant text-[14px] flex-shrink-0 overflow-hidden" 
          />
        </div>
      </div>
    </header>
  );
};

export default TopNav;
