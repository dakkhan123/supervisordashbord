import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const WorkerAttendance = ({ showToast }) => {
  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('smartops_user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
    fetchAttendanceLogs();
  }, []);

  const fetchAttendanceLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getMyAttendance();
      if (res.success) {
        setAttendance(res.data || []);
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to fetch attendance logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const presentCount = attendance.filter(a => a.status === 'Present').length;
  const absentCount = attendance.filter(a => a.status === 'Absent').length;
  const leaveCount = attendance.filter(a => a.status === 'Leave' || a.status === 'Half Day').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-on-surface">Attendance Record</h2>
          <p className="text-xs text-outline font-medium mt-0.5">
            Read-only log of your recorded shifts, check-in times, and working hours verified by your supervisor.
          </p>
        </div>
        <button
          onClick={fetchAttendanceLogs}
          className="btn btn-outline border border-outline-variant text-on-surface hover:bg-surface-container font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh Logs
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Days Present</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{presentCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Days Absent</p>
            <h3 className="text-2xl font-black text-error mt-1">{absentCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-error/10 text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">cancel</span>
          </div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Leaves & Half Days</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{leaveCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">event_busy</span>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col gap-4">
        <h3 className="text-base font-extrabold text-on-surface">Shift Logs History</h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-outline font-semibold">Loading attendance logs...</div>
        ) : attendance.length === 0 ? (
          <div className="py-12 text-center text-xs text-outline font-semibold">No attendance records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container text-outline uppercase tracking-wider font-extrabold text-[10px] border-b border-outline-variant/50">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Shift</th>
                  <th className="p-4">Check-In</th>
                  <th className="p-4">Check-Out</th>
                  <th className="p-4">Working Hours</th>
                  <th className="p-4">Verified By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-medium text-on-surface">
                {attendance.map((log) => (
                  <tr key={log._id} className="hover:bg-surface-container/40 transition-all">
                    <td className="p-4 font-bold text-on-surface">
                      {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                        log.status === 'Present'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : log.status === 'Absent'
                          ? 'bg-error/10 text-error'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-outline font-semibold">{log.shift || 'Morning'}</td>
                    <td className="p-4 text-on-surface font-mono">{log.checkInTime || log.checkIn || '--'}</td>
                    <td className="p-4 text-on-surface font-mono">{log.checkOutTime || log.checkOut || '--'}</td>
                    <td className="p-4 text-on-surface font-semibold">{log.workingHours ? `${log.workingHours} hrs` : '--'}</td>
                    <td className="p-4 text-outline">{log.supervisorName || 'Supervisor'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerAttendance;
