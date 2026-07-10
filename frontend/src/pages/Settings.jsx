import { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import UserAvatar, { getInitials } from '../components/UserAvatar';
import { useProfilePhoto } from '../hooks/useProfilePhoto';

// ─── NotificationTab sub-component ────────────────────────────────────────────
// Extracted from IIFE pattern to prevent component re-mounting on every parent render
const NotificationTab = ({ notifications, showToast, onRefreshNotifications }) => {
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const handleMarkRead = async (id, readState) => {
    try {
      const res = readState ? await api.markNotificationRead(id) : await api.markNotificationUnread(id);
      if (res.success) {
        onRefreshNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.deleteNotification(id);
      if (res.success) {
        onRefreshNotifications();
        showToast('Notification deleted successfully', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearHistoryConfirm = async () => {
    try {
      const res = await api.clearNotifications();
      if (res.success) {
        onRefreshNotifications();
        setConfirmClearHistory(false);
        showToast('All notification history logs cleared', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredHistory = (notifications || []).filter(n => {
    if (historyFilter === 'unread') return !n.isRead;
    if (historyFilter === 'read') return n.isRead;
    return true;
  });

  const HISTORY_PAGE_SIZE = 10;
  const historyTotalPages = Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE);
  const historyStartIdx = (historyPage - 1) * HISTORY_PAGE_SIZE;
  const paginatedHistory = filteredHistory.slice(historyStartIdx, historyStartIdx + HISTORY_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden animate-scale-up">
        <div className="px-5 py-4 border-b border-outline-variant bg-surface-low">
          <h2 className="text-base font-bold text-on-surface">Notification Alert Triggers</h2>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <div className="pt-2 border-t border-outline-variant/30 flex justify-end">
            <button
              onClick={() => showToast('Alert rules saved successfully', 'success')}
              className="btn btn-primary bg-primary text-white font-semibold rounded-sm px-4 py-2 hover:bg-primary-container transition-colors flex items-center gap-1.5 text-xs uppercase"
            >
              <span className="material-symbols-outlined icon-xs text-white">save</span>Save Alert Rules
            </button>
          </div>
        </div>
      </div>

      <div className="h-[1px] bg-outline-variant/60 my-2"></div>

      <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-on-surface">Notification History Logs</h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Audit and manage all database-logged system notification events.</p>
          </div>
          {notifications && notifications.length > 0 && (
            <button
              onClick={() => setConfirmClearHistory(true)}
              className="btn btn-outline border-error/20 hover:bg-error/5 text-error text-[11px] font-bold px-3 py-1.5 rounded-sm uppercase"
            >
              Clear All Logs
            </button>
          )}
        </div>

        {confirmClearHistory && (
          <div className="bg-error-container/20 border border-error/25 p-4 rounded-md flex items-center justify-between animate-scale-up">
            <span className="text-xs text-error font-semibold">Are you sure you want to permanently delete all notification logs from the database?</span>
            <div className="flex gap-2">
              <button onClick={handleClearHistoryConfirm} className="btn btn-error btn-sm bg-error text-white font-bold px-3 py-1 rounded-sm text-xs uppercase">Confirm</button>
              <button onClick={() => setConfirmClearHistory(false)} className="btn btn-outline btn-sm px-3 py-1 rounded-sm text-xs uppercase">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs mb-1">
          <span className="font-bold text-outline uppercase tracking-wider mr-1">Filter:</span>
          {['all', 'unread', 'read'].map(f => (
            <span
              key={f}
              onClick={() => { setHistoryFilter(f); setHistoryPage(1); }}
              className={`cursor-pointer px-2.5 py-1 border border-outline-variant text-[11px] font-bold rounded-full uppercase transition-all ${historyFilter === f ? 'bg-primary/10 text-primary border-primary' : 'bg-surface-lowest text-on-surface-variant hover:border-primary'}`}
            >
              {f}
            </span>
          ))}
        </div>

        <div className="border border-outline-variant/40 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-low border-b border-outline-variant">
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Type</th>
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Title</th>
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Log Message</th>
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Date & Time</th>
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Status</th>
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.map(n => {
                  const badgeClass = n.type.includes('alert') || n.type.includes('deleted') || n.type.includes('rejected')
                    ? 'bg-error-container text-error'
                    : n.type.includes('replenished') || n.type.includes('approved') || n.type.includes('added') || n.type.includes('increase')
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary-container text-secondary';
                  return (
                    <tr key={n._id} className="border-b border-outline-variant/20 hover:bg-surface-low transition-colors">
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${badgeClass}`}>
                          {n.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-on-surface whitespace-nowrap">{n.title}</td>
                      <td className="p-3 text-on-surface-variant max-w-[280px] truncate" title={n.message}>{n.message}</td>
                      <td className="p-3 text-outline whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleString('en-IN', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleMarkRead(n._id, !n.isRead)}
                          className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase whitespace-nowrap transition-colors ${n.isRead ? 'bg-surface-container text-outline hover:text-on-surface' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                        >
                          {n.isRead ? 'Read' : 'Unread'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDelete(n._id)}
                          className="w-7 h-7 hover:bg-surface-container rounded flex items-center justify-center text-error ml-auto transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {paginatedHistory.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-outline">No matching notification logs found in database.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {historyTotalPages > 1 && (
            <div className="px-5 py-3 border-t border-outline-variant flex items-center justify-between text-xs text-outline font-semibold">
              <span>Showing {historyStartIdx + 1}–{Math.min(historyStartIdx + HISTORY_PAGE_SIZE, filteredHistory.length)} of {filteredHistory.length} logs</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setHistoryPage(p => Math.max(p - 1, 1))}
                  disabled={historyPage === 1}
                  className="w-8 h-8 rounded border border-outline-variant/30 flex items-center justify-center hover:bg-surface-low disabled:opacity-50"
                >‹</button>
                {Array.from({ length: historyTotalPages }, (_, i) => i + 1)
                  .filter(page => Math.abs(page - historyPage) <= 2)
                  .map(page => (
                    <button
                      key={page}
                      onClick={() => setHistoryPage(page)}
                      className={`w-8 h-8 rounded border flex items-center justify-center transition-colors ${historyPage === page ? 'bg-primary border-primary text-white font-bold' : 'border-outline-variant/30 hover:bg-surface-low'}`}
                    >{page}</button>
                  ))}
                <button
                  onClick={() => setHistoryPage(p => Math.min(p + 1, historyTotalPages))}
                  disabled={historyPage === historyTotalPages}
                  className="w-8 h-8 rounded border border-outline-variant/30 flex items-center justify-center hover:bg-surface-low disabled:opacity-50"
                >›</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
// ──────────────────────────────────────────────────────────────────────────────


const Settings = ({ showToast, notifications, onRefreshNotifications, user, onLogout }) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    if (location.state && location.state.tab) {
      return location.state.tab;
    }
    return 'profile';
  });

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editProfileData, setEditProfileData] = useState({});
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Load from localStorage or defaults
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('smartops_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@smartops.co.in',
      phone: '+91 98765 43210',
      role: 'Supervisor',
      unit: 'Unit Pune-A12',
      address: 'Plot No. 42, Hinjewadi Phase 3, Pune, MH - 411057',
      dateOfBirth: '1990-01-01'
    };
  });

  const [thresholds, setThresholds] = useState(() => {
    const saved = localStorage.getItem('smartops_thresholds');
    return saved ? JSON.parse(saved) : {
      safetyPct: 20,
      autoTrigger: true,
      defaultMultiplier: 2,
      primarySupplier: 'Tata Electronics Supply Co., Mumbai (Primary)'
    };
  });


  const [gstConfig, setGstConfig] = useState(() => {
    const saved = localStorage.getItem('smartops_gst');
    return saved ? JSON.parse(saved) : {
      gstin: '27AAAAA1111A1Z1',
      defaultGstRate: 18,
      lutEnabled: false
    };
  });

  const fileInputRef = useRef(null);
  const { photo, updatePhoto } = useProfilePhoto(user?.id);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditProfileData(prev => ({...prev, photoPreview: event.target.result, photoChanged: true}));
      };
      reader.readAsDataURL(file);
    }
  };


  const handleProfileChange = (e) => {
    const { id, value } = e.target;
    setProfile(prev => ({ ...prev, [id]: value }));
  };

  const handleThresholdChange = (e) => {
    const { id, value, type, checked } = e.target;
    setThresholds(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };



  const handleGstChange = (e) => {
    const { id, value, type, checked } = e.target;
    setGstConfig(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  const saveSettings = (section, data) => {
    localStorage.setItem(`smartops_${section}`, JSON.stringify(data));
    showToast(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully`, 'success');
  };

  const tabs = [
    { id: 'profile', label: 'User Profile', icon: 'person' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications_active' },
    { id: 'gst', label: 'GST & Compliance', icon: 'gavel' }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">System Settings</h1>
          <p className="text-on-surface-variant text-sm">
            Manage system configurations, alert policies, GST settings, and supervisor credentials.
          </p>
        </div>
        <div 
          className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-outline-variant cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 shadow-sm"
          onClick={() => setIsPhotoModalOpen(true)}
        >
          <UserAvatar 
            user={user} 
            className="w-full h-full object-cover text-2xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm p-2 flex flex-col gap-1 lg:col-span-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-sm transition-all text-left ${
                  isActive
                    ? 'bg-primary text-white font-extrabold'
                    : 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined icon-sm ${isActive ? 'text-white' : 'text-outline'}`}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
          <div className="mt-4 pt-4 border-t border-outline-variant">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-sm transition-all text-left text-error hover:bg-error/10"
            >
              <span className="material-symbols-outlined icon-sm text-error">logout</span>
              Sign Out
            </button>
          </div>
        </div>

        {/* Configuration Body */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden animate-scale-up">
              <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-low">
                <h2 className="text-base font-bold text-on-surface">Supervisor Profile Details</h2>
                <button
                  onClick={() => {
                    setEditProfileData({ ...profile, photoPreview: photo, photoChanged: false });
                    setIsEditProfileOpen(true);
                  }}
                  className="btn btn-outline border-outline-variant hover:bg-surface-low text-xs font-bold px-3 py-1.5 rounded-sm uppercase flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined icon-xs">edit</span> Edit Profile
                </button>
              </div>
              <div className="p-6 flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Supervisor Name</label>
                    <div className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface-variant font-semibold">
                      {profile.name}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Email Address</label>
                    <div className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface-variant font-semibold">
                      {profile.email}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Mobile Number (+91)</label>
                    <div className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface-variant font-semibold">
                      {profile.phone}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Assigned Role</label>
                    <div className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface-variant font-semibold">
                      {profile.role}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Date of Birth</label>
                    <div className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface-variant font-semibold">
                      {profile.dateOfBirth}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Assigned Unit / Warehouse</label>
                    <div className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface-variant font-semibold">
                      {profile.unit}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Unit Mailing Address</label>
                  <div className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface-variant font-semibold min-h-[52px]">
                    {profile.address}
                  </div>
                </div>
              </div>
            </div>
          )}



          {activeTab === 'notifications' && (
            <NotificationTab
              notifications={notifications}
              showToast={showToast}
              onRefreshNotifications={onRefreshNotifications}
            />
          )}




          {activeTab === 'gst' && (
            <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden animate-scale-up">
              <div className="px-5 py-4 border-b border-outline-variant bg-surface-low">
                <h2 className="text-base font-bold text-on-surface">GSTIN & Compliance Settings</h2>
              </div>
              <div className="p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Unit GSTIN No.</label>
                  <input
                    type="text"
                    id="gstin"
                    value={gstConfig.gstin}
                    onChange={handleGstChange}
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-mono"
                  />
                  <span className="text-[10px] text-outline">State Code 27 (Maharashtra) for Unit Pune. Must be a valid 15-character ID.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Default CGST + SGST Rate (%)</label>
                    <select
                      id="defaultGstRate"
                      value={gstConfig.defaultGstRate}
                      onChange={handleGstChange}
                      className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    >
                      <option value="5">5% GST (Essential Materials)</option>
                      <option value="12">12% GST (Consumables & Logistics)</option>
                      <option value="18">18% GST (Electronics & Machinery)</option>
                      <option value="28">28% GST (Specialized Spares)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 justify-end">
                    <div className="flex items-center justify-between p-2.5 bg-surface-low border border-outline-variant rounded-sm h-[38px]">
                      <span className="text-xs font-bold text-on-surface">LUT Filing Enabled</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="lutEnabled"
                          checked={gstConfig.lutEnabled}
                          onChange={handleGstChange}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-outline-variant rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-outline-variant/30 flex justify-end">
                  <button
                    onClick={() => saveSettings('gst', gstConfig)}
                    className="btn btn-primary bg-primary text-white font-semibold rounded-sm px-4 py-2 hover:bg-primary-container transition-colors flex items-center gap-1.5 text-xs uppercase"
                  >
                    <span className="material-symbols-outlined icon-xs text-white">save</span>Save Compliance
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-[#0b1c30]/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 transition-all duration-300">
          <div className="bg-surface-lowest rounded-lg shadow-2xl border border-outline-variant w-full max-w-lg animate-scale-up overflow-hidden">
            <div className="px-6 py-4.5 border-b border-outline-variant flex items-center justify-between bg-surface-low">
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary">edit</span> Edit Profile
              </h2>
              <button 
                className="w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors" 
                onClick={() => setIsEditProfileOpen(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Photo Editor */}
              <div className="flex flex-col items-center gap-4 mb-2">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-outline-variant shadow-sm flex-shrink-0 bg-surface-variant flex items-center justify-center text-on-surface-variant font-bold text-3xl">
                  {editProfileData.photoPreview ? (
                    <img src={editProfileData.photoPreview} alt="Profile Preview" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(user?.worker?.name || user?.username || 'User')
                  )}
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-outline border-primary/20 hover:bg-primary/5 text-primary text-[10px] font-bold py-1.5 px-3 rounded-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined icon-xs">upload</span> Change
                  </button>
                  <button 
                    onClick={() => setEditProfileData(prev => ({...prev, photoPreview: null, photoChanged: true}))}
                    className="btn btn-outline border-error/20 hover:bg-error/5 text-error text-[10px] font-bold py-1.5 px-3 rounded-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined icon-xs">delete</span> Remove
                  </button>
                </div>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                className="hidden" 
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Supervisor Name</label>
                <input
                  type="text"
                  value={editProfileData.name}
                  onChange={(e) => setEditProfileData({...editProfileData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={editProfileData.email}
                  onChange={(e) => setEditProfileData({...editProfileData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Mobile Number</label>
                <input
                  type="text"
                  value={editProfileData.phone}
                  onChange={(e) => setEditProfileData({...editProfileData, phone: e.target.value})}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Date of Birth</label>
                <input
                  type="date"
                  value={editProfileData.dateOfBirth || ''}
                  onChange={(e) => setEditProfileData({...editProfileData, dateOfBirth: e.target.value})}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Mailing Address</label>
                <textarea
                  value={editProfileData.address}
                  onChange={(e) => setEditProfileData({...editProfileData, address: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
                ></textarea>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant bg-surface-lowest flex justify-end gap-2.5">
              <button 
                className="btn btn-ghost text-xs px-4 py-2 font-semibold border border-outline-variant rounded-sm hover:bg-surface-low" 
                onClick={() => setIsEditProfileOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-sm hover:bg-primary-container flex items-center gap-1.5 shadow"
                onClick={() => {
                  const { photoPreview, photoChanged, ...profileData } = editProfileData;
                  
                  // Phone number validation: must be > 9 digits
                  const numericPhone = profileData.phone ? profileData.phone.replace(/\D/g, '') : '';
                  if (numericPhone.length <= 9) {
                    showToast('Phone number must have more than 9 digits', 'error');
                    return;
                  }

                  // Date validation: valid date and not in the future
                  if (profileData.dateOfBirth) {
                    const dob = new Date(profileData.dateOfBirth);
                    if (isNaN(dob.getTime())) {
                      showToast('Invalid date format', 'error');
                      return;
                    }
                    if (dob > new Date()) {
                      showToast('Date of Birth cannot be in the future', 'error');
                      return;
                    }
                  } else {
                    showToast('Date of Birth is required', 'error');
                    return;
                  }

                  setProfile(profileData);
                  saveSettings('profile', profileData);
                  if (photoChanged) {
                    updatePhoto(photoPreview);
                    if (!photoPreview) {
                      showToast('Profile photo removed', 'success');
                    } else {
                      showToast('Profile photo updated', 'success');
                    }
                  }
                  setIsEditProfileOpen(false);
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo View Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-[#0b1c30]/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 transition-all duration-300" onClick={() => setIsPhotoModalOpen(false)}>
          <div className="bg-surface-lowest rounded-lg shadow-2xl border border-outline-variant w-full max-w-sm animate-scale-up overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4.5 border-b border-outline-variant flex items-center justify-between bg-surface-low">
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Profile Photo</h2>
              <button 
                className="w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors" 
                onClick={() => setIsPhotoModalOpen(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 flex flex-col items-center gap-6 bg-surface">
              <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-outline-variant shadow-lg flex-shrink-0">
                <UserAvatar 
                  user={user} 
                  className="w-full h-full object-cover text-5xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
