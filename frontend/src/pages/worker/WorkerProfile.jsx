import React, { useState, useEffect } from 'react';

const WorkerProfile = ({ showToast }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('smartops_user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="border-b border-outline-variant/40 pb-4">
        <h2 className="text-2xl font-black tracking-tight text-on-surface">Worker Profile</h2>
        <p className="text-xs text-outline font-medium mt-0.5">
          View your verified employee details, assigned department, role, and account status.
        </p>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col gap-6">
        <div className="flex items-center gap-4 border-b border-outline-variant/40 pb-6">
          <div className="w-16 h-16 rounded-full bg-[#213145] text-[#5dd9d8] font-black text-2xl flex items-center justify-center uppercase shadow-md">
            {user?.worker?.name ? user.worker.name.charAt(0) : (user?.username ? user.username.charAt(0) : 'W')}
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-on-surface">{user?.worker?.name || user?.username}</h3>
            <p className="text-xs text-outline font-semibold">{user?.email || `${user?.username}@factory.com`}</p>
            <span className="inline-block mt-2 px-3 py-0.5 bg-emerald-500/10 text-emerald-600 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
              Status: {user?.status || 'Active'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-surface-container/30 border border-outline-variant/30 rounded-lg">
            <span className="text-outline font-bold uppercase text-[10px] tracking-wider block mb-1">Username / ID</span>
            <p className="font-extrabold text-on-surface text-sm">{user?.username}</p>
          </div>

          <div className="p-4 bg-surface-container/30 border border-outline-variant/30 rounded-lg">
            <span className="text-outline font-bold uppercase text-[10px] tracking-wider block mb-1">System Role</span>
            <p className="font-extrabold text-on-surface text-sm">{user?.role || 'Worker'}</p>
          </div>

          <div className="p-4 bg-surface-container/30 border border-outline-variant/30 rounded-lg">
            <span className="text-outline font-bold uppercase text-[10px] tracking-wider block mb-1">Contact Phone</span>
            <p className="font-extrabold text-on-surface text-sm">{user?.worker?.phone || user?.phone || 'Not specified'}</p>
          </div>

          <div className="p-4 bg-surface-container/30 border border-outline-variant/30 rounded-lg">
            <span className="text-outline font-bold uppercase text-[10px] tracking-wider block mb-1">Department</span>
            <p className="font-extrabold text-on-surface text-sm">{user?.department || 'Operations'}</p>
          </div>
        </div>

        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 font-medium">
          <div className="flex items-center gap-2 font-bold mb-1">
            <span className="material-symbols-outlined text-[18px]">info</span>
            Account Security Notice
          </div>
          Worker profile information and login credentials are created and managed by your Supervisor. To request updates to your profile or password, please contact your shift supervisor.
        </div>
      </div>
    </div>
  );
};


export default WorkerProfile;
