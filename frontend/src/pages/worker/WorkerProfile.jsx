import { useState, useEffect } from 'react';
import { api } from '../../services/api';

const WorkerProfile = ({ showToast, user: propUser }) => {
  const [user, setUser] = useState(propUser || null);
  const [loading, setLoading] = useState(!propUser);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.getMe();
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem('smartops_user', JSON.stringify(res.data));
      }
    } catch (err) {
      console.error('Failed to fetch worker profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading && !user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3 text-on-surface">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-xs text-outline font-semibold uppercase tracking-wider">Loading Profile Information...</p>
      </div>
    );
  }

  const fullName = user?.name || user?.worker?.name || user?.username || 'Worker User';
  const employeeId = user?.employeeId || user?.worker?.employeeId || 'EMP-1001';
  const username = user?.username || 'N/A';
  const email = user?.email || 'N/A';
  const phone = user?.phone || user?.worker?.phone || 'Not specified';
  const role = user?.role || user?.worker?.role || 'Worker';
  const department = user?.department || user?.worker?.department || 'Operations';
  const branch = user?.branch || user?.unit || user?.worker?.branch || 'Pune Head Office';
  const status = user?.status || user?.worker?.status || 'Active';
  const photo = user?.photo || user?.worker?.photo || null;

  const rawJoiningDate = user?.dateOfJoining || user?.worker?.dateOfJoining;
  const joiningDateFormatted = rawJoiningDate
    ? new Date(rawJoiningDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'N/A';

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto text-on-surface font-sans">
      {/* Page Header */}
      <div className="border-b border-outline-variant/40 pb-4 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-on-surface">Worker Profile</h2>
          <p className="text-xs text-outline font-medium mt-0.5">
            Verified employee identity and official assignment record.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-xs font-black rounded-full font-mono uppercase tracking-wider">
            ID: {employeeId}
          </span>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="bg-surface-lowest border border-outline-variant rounded-md p-6 shadow-sm flex flex-col gap-6">
        {/* Header Banner & Avatar */}
        <div className="flex items-center gap-5 border-b border-outline-variant/40 pb-6 flex-wrap sm:flex-nowrap">
          <div className="relative flex-shrink-0">
            {photo ? (
              <img
                src={photo}
                alt={fullName}
                className="w-20 h-20 rounded-full object-cover border-2 border-primary/30 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#213145] text-primary-fixed font-black text-2xl flex items-center justify-center uppercase shadow-sm border border-white/10">
                {initials || 'W'}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-surface-lowest ${
                status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
              title={`Status: ${status}`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-2xl font-extrabold text-on-surface tracking-tight">{fullName}</h3>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[11px] font-black rounded-full uppercase tracking-wider">
                {status}
              </span>
            </div>
            <p className="text-xs text-outline font-semibold mt-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-outline">mail</span>
              {email}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs font-bold text-on-surface-variant flex-wrap">
              <span className="inline-flex items-center gap-1 bg-surface-low px-2.5 py-1 rounded border border-outline-variant/50">
                <span className="material-symbols-outlined text-[15px] text-primary">badge</span>
                {role}
              </span>
              <span className="inline-flex items-center gap-1 bg-surface-low px-2.5 py-1 rounded border border-outline-variant/50">
                <span className="material-symbols-outlined text-[15px] text-primary">domain</span>
                {department}
              </span>
              <span className="inline-flex items-center gap-1 bg-surface-low px-2.5 py-1 rounded border border-outline-variant/50">
                <span className="material-symbols-outlined text-[15px] text-primary">location_city</span>
                {branch}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Employee ID */}
          <div className="p-4 bg-surface-low border border-outline-variant/70 rounded-md flex flex-col gap-1">
            <div className="flex items-center justify-between text-outline font-bold uppercase text-[10px] tracking-wider">
              <span>Employee ID</span>
              <span className="material-symbols-outlined text-[14px] text-primary">lock</span>
            </div>
            <p className="font-mono font-black text-on-surface text-base text-primary">{employeeId}</p>
          </div>

          {/* Full Name */}
          <div className="p-4 bg-surface-low border border-outline-variant/70 rounded-md flex flex-col gap-1">
            <span className="text-outline font-bold uppercase text-[10px] tracking-wider">Full Name</span>
            <p className="font-extrabold text-on-surface text-sm truncate">{fullName}</p>
          </div>

          {/* Username */}
          <div className="p-4 bg-surface-low border border-outline-variant/70 rounded-md flex flex-col gap-1">
            <span className="text-outline font-bold uppercase text-[10px] tracking-wider">Username</span>
            <p className="font-mono font-bold text-on-surface text-sm truncate">@{username}</p>
          </div>

          {/* Email Address */}
          <div className="p-4 bg-surface-low border border-outline-variant/70 rounded-md flex flex-col gap-1">
            <span className="text-outline font-bold uppercase text-[10px] tracking-wider">Email Address</span>
            <p className="font-bold text-on-surface text-sm truncate">{email}</p>
          </div>

          {/* Contact Phone */}
          <div className="p-4 bg-surface-low border border-outline-variant/70 rounded-md flex flex-col gap-1">
            <span className="text-outline font-bold uppercase text-[10px] tracking-wider">Contact Phone</span>
            <p className="font-bold text-on-surface text-sm truncate">{phone}</p>
          </div>

          {/* System Role */}
          <div className="p-4 bg-surface-low border border-outline-variant/70 rounded-md flex flex-col gap-1">
            <div className="flex items-center justify-between text-outline font-bold uppercase text-[10px] tracking-wider">
              <span>System Role</span>
              <span className="material-symbols-outlined text-[14px] text-primary">lock</span>
            </div>
            <p className="font-bold text-on-surface text-sm">{role}</p>
          </div>

          {/* Department */}
          <div className="p-4 bg-surface-low border border-outline-variant/70 rounded-md flex flex-col gap-1">
            <div className="flex items-center justify-between text-outline font-bold uppercase text-[10px] tracking-wider">
              <span>Department</span>
              <span className="material-symbols-outlined text-[14px] text-primary">lock</span>
            </div>
            <p className="font-bold text-on-surface text-sm">{department}</p>
          </div>

          {/* Branch / Office */}
          <div className="p-4 bg-surface-low border border-outline-variant/70 rounded-md flex flex-col gap-1">
            <div className="flex items-center justify-between text-outline font-bold uppercase text-[10px] tracking-wider">
              <span>Branch / Office</span>
              <span className="material-symbols-outlined text-[14px] text-primary">lock</span>
            </div>
            <p className="font-bold text-on-surface text-sm">{branch}</p>
          </div>

          {/* Joining Date */}
          <div className="p-4 bg-surface-low border border-outline-variant/70 rounded-md flex flex-col gap-1">
            <div className="flex items-center justify-between text-outline font-bold uppercase text-[10px] tracking-wider">
              <span>Joining Date</span>
              <span className="material-symbols-outlined text-[14px] text-primary">lock</span>
            </div>
            <p className="font-bold text-on-surface text-sm">{joiningDateFormatted}</p>
          </div>

          {/* Account Status */}
          <div className="p-4 bg-surface-low border border-outline-variant/70 rounded-md flex flex-col gap-1">
            <div className="flex items-center justify-between text-outline font-bold uppercase text-[10px] tracking-wider">
              <span>Account Status</span>
              <span className="material-symbols-outlined text-[14px] text-primary">lock</span>
            </div>
            <p className="font-extrabold text-emerald-600 text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {status}
            </p>
          </div>
        </div>

        {/* Protected Info Supervisor Notice Banner */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/25 rounded-md text-xs text-blue-800 font-medium flex items-start gap-3">
          <span className="material-symbols-outlined text-[20px] text-blue-600 flex-shrink-0 mt-0.5">verified_user</span>
          <div>
            <h4 className="font-bold text-blue-900 mb-0.5">Protected Employee Data Notice</h4>
            <p className="text-blue-800/90 leading-relaxed">
              Official records including Employee ID, Role, Department, Branch/Office, Joining Date, and Account Status are managed strictly by authorized Supervisors and HR. To request official record updates, please contact your shift supervisor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerProfile;
