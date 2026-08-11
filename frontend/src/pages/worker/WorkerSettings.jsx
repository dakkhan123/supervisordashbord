import { useState, useEffect } from 'react';
import { api } from '../../services/api';

const WorkerSettings = ({ showToast, user: propUser, onUserUpdate }) => {
  const [user, setUser] = useState(propUser || null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification states
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    taskNotifications: true,
    attendanceNotifications: true,
    leaveNotifications: true,
    pushNotifications: true,
    taskAlerts: true
  });

  // Password change form states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await api.getMe();
        if (res.success && res.data) {
          setUser(res.data);
          if (res.data.settings) {
            setNotifications((prev) => ({
              ...prev,
              ...res.data.settings
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load user settings:', err);
      }
    };
    fetchUserData();
  }, []);

  const handleToggle = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSettingsLoading(true);
      const res = await api.updateSettings(notifications);
      if (res.success) {
        showToast('Notification preferences updated successfully!', 'success');
        if (onUserUpdate) onUserUpdate();
      } else {
        showToast(res.error || 'Failed to update notification settings', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating notification settings', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showToast('Please enter your current password and new password', 'error');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New password and confirm password do not match', 'error');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await api.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      });

      if (res.success) {
        showToast('Password changed successfully!', 'success');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        showToast(res.error || 'Failed to change password', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error while changing password', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto text-on-surface font-sans">
      {/* Page Title */}
      <div className="border-b border-outline-variant/40 pb-4">
        <h2 className="text-2xl font-black tracking-tight text-on-surface">Account & Security Settings</h2>
        <p className="text-xs text-outline font-medium mt-0.5">
          Manage your notification alerts, security credentials, and login session preferences.
        </p>
      </div>

      {/* Section 1: Notification Preferences */}
      <form onSubmit={handleSaveSettings} className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/40 bg-surface-low flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">notifications_active</span>
            <h3 className="text-base font-extrabold text-on-surface">Notification Preferences</h3>
          </div>
          <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Alert Controls</span>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 bg-surface-low border border-outline-variant/50 rounded-md">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline text-[20px] mt-0.5">mail</span>
              <div>
                <span className="font-extrabold text-sm text-on-surface block">Email Notifications</span>
                <p className="text-xs text-outline mt-0.5">Receive shift updates, leave request statuses, and system announcements via email.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={notifications.emailNotifications}
                onChange={() => handleToggle('emailNotifications')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Task Notifications */}
          <div className="flex items-center justify-between p-4 bg-surface-low border border-outline-variant/50 rounded-md">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline text-[20px] mt-0.5">assignment_turned_in</span>
              <div>
                <span className="font-extrabold text-sm text-on-surface block">Task Allocation Alerts</span>
                <p className="text-xs text-outline mt-0.5">Get notified immediately when new tasks or work items are assigned to you by shift supervisor.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={notifications.taskNotifications}
                onChange={() => handleToggle('taskNotifications')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Attendance & Leave Notifications */}
          <div className="flex items-center justify-between p-4 bg-surface-low border border-outline-variant/50 rounded-md">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline text-[20px] mt-0.5">event_available</span>
              <div>
                <span className="font-extrabold text-sm text-on-surface block">Attendance & Leave Updates</span>
                <p className="text-xs text-outline mt-0.5">Receive confirmations when your clock-in, check-out, or leave requests are processed.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={notifications.attendanceNotifications}
                onChange={() => handleToggle('attendanceNotifications')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Push & Drawer Alerts */}
          <div className="flex items-center justify-between p-4 bg-surface-low border border-outline-variant/50 rounded-md">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline text-[20px] mt-0.5">add_alert</span>
              <div>
                <span className="font-extrabold text-sm text-on-surface block">Real-time Push & Sound Alerts</span>
                <p className="text-xs text-outline mt-0.5">Enable audio chimes and top-bar drawer notifications for urgent factory alerts.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={notifications.pushNotifications}
                onChange={() => handleToggle('pushNotifications')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={settingsLoading}
              className="px-5 py-2.5 bg-primary text-white text-xs font-bold uppercase rounded-md hover:bg-primary-container transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              {settingsLoading ? 'Saving...' : 'Save Notification Preferences'}
            </button>
          </div>
        </div>
      </form>

      {/* Section 2: Change Password & Security */}
      <form onSubmit={handleChangePassword} className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/40 bg-surface-low flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">lock_reset</span>
            <h3 className="text-base font-extrabold text-on-surface">Password & Security</h3>
          </div>
          <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Account Credentials</span>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <p className="text-xs text-outline font-medium">
            Update your account password. Use a strong password containing at least 6 characters.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold text-on-surface">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs border border-outline-variant/70 rounded-md bg-surface-low focus:outline-none focus:border-primary text-on-surface pr-9"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showCurrentPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold text-on-surface">New Password</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 text-xs border border-outline-variant/70 rounded-md bg-surface-low focus:outline-none focus:border-primary text-on-surface pr-9"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showNewPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold text-on-surface">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 text-xs border border-outline-variant/70 rounded-md bg-surface-low focus:outline-none focus:border-primary text-on-surface pr-9"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showConfirmPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-5 py-2.5 bg-primary text-white text-xs font-bold uppercase rounded-md hover:bg-primary-container transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">key</span>
              {passwordLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </div>
      </form>

      {/* Section 3: Session Security Info */}
      <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3">
          <span className="material-symbols-outlined text-primary text-[20px]">security</span>
          <h3 className="text-base font-extrabold text-on-surface">Active Session Security</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-surface-low border border-outline-variant/60 rounded-md">
            <span className="text-outline font-bold uppercase text-[10px] tracking-wider block mb-1">Current Session Token</span>
            <p className="font-mono text-emerald-600 font-bold text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Active Session ({user?.employeeId ? `ID: ${user.employeeId}` : `User: @${user?.username || 'Worker'}`})
            </p>
          </div>

          <div className="p-4 bg-surface-low border border-outline-variant/60 rounded-md">
            <span className="text-outline font-bold uppercase text-[10px] tracking-wider block mb-1">Access Device & Browser</span>
            <p className="font-semibold text-on-surface text-xs">
              {navigator.userAgent.includes('Windows') ? 'Windows Device' : 'Standard Web Device'} · Browser Interface
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerSettings;
