import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const WorkerAttendance = ({ showToast }) => {
  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Live timer for check-in session duration
  const [sessionDuration, setSessionDuration] = useState('00:00:00');

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
      const [logsRes, todayRes] = await Promise.all([
        api.getMyAttendance(),
        api.getTodayAttendance()
      ]);

      if (logsRes.success) {
        setAttendance(logsRes.data || []);
      }
      if (todayRes.success) {
        setTodayRecord(todayRes.data);
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to fetch attendance logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  // session duration clock
  useEffect(() => {
    if (!todayRecord || !todayRecord.checkIn || todayRecord.checkOut) {
      setSessionDuration('00:00:00');
      return;
    }
    const updateDuration = () => {
      const diffMs = new Date() - new Date(todayRecord.checkIn);
      const hours = String(Math.floor(diffMs / 3600000)).padStart(2, '0');
      const minutes = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, '0');
      const seconds = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, '0');
      setSessionDuration(`${hours}:${minutes}:${seconds}`);
    };
    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [todayRecord]);

  // Handle manual checkout from page
  const handleCheckOut = async () => {
    if (!navigator.geolocation) {
      return showToast('Geolocation is not supported by your browser to checkout.', 'error');
    }

    try {
      setActionLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const res = await api.checkOut({
            latitude,
            longitude,
            address: 'Pune Office Center Checkout',
            ipAddress: '192.168.1.1',
            device: 'Worker Mobile App'
          });

          if (res.success) {
            showToast('Checked out of shift successfully!', 'success');
            fetchAttendanceLogs();
          } else {
            showToast(res.error || 'Failed to checkout', 'error');
          }
          setActionLoading(false);
        },
        (error) => {
          showToast('GPS coordinates required to check out.', 'error');
          setActionLoading(false);
        }
      );
    } catch (err) {
      console.error(err);
      showToast('API connection error.', 'error');
      setActionLoading(false);
    }
  };

  const presentCount = attendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const lateCount = attendance.filter(a => a.status === 'Late').length;
  const absentCount = attendance.filter(a => a.status === 'Absent').length;
  const leaveCount = attendance.filter(a => a.status === 'Leave' || a.status === 'Half Day').length;

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Present': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Late': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Half Day': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Absent': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'Leave': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      default: return 'bg-slate-800 text-slate-400 border border-slate-700/50';
    }
  };

  return (
    <div className="flex flex-col gap-6 text-white font-sans">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-400">fingerprint</span>
            Shift Attendance Record
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Log your daily shift check-ins, record working hours, and review historical presence statements.
          </p>
        </div>
        <button
          onClick={fetchAttendanceLogs}
          className="btn border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh Logs
        </button>
      </div>

      {/* Today Check-In Details Card */}
      {todayRecord?.checkIn && (
        <div className="bg-[#141e2e] border border-[#1e2d42] rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-bold text-teal-400">
              <span className="material-symbols-outlined text-[22px] animate-pulse">login</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Active Shift Session</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Checked in at <span className="text-teal-400 font-bold">{todayRecord.checkInTime}</span> ({todayRecord.attendanceType})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">ELAPSED TIME</span>
              <span className="text-xl font-black font-mono text-white leading-none">
                {todayRecord.checkOut ? `${todayRecord.workingHours} hrs` : sessionDuration}
              </span>
            </div>

            {!todayRecord.checkOut && (
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="btn bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                {actionLoading ? 'Verifying...' : 'Check-Out'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats summary panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4.5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Days Present</p>
            <h3 className="text-2xl font-black text-teal-400 mt-1">{presentCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4.5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Late Arrivals</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{lateCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">schedule</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4.5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Days Absent</p>
            <h3 className="text-2xl font-black text-rose-400 mt-1">{absentCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">cancel</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4.5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Leaves / Half Days</p>
            <h3 className="text-2xl font-black text-blue-400 mt-1">{leaveCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">event_busy</span>
          </div>
        </div>
      </div>

      {/* Attendance History list */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Historical Shift Logs</h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-semibold">Loading attendance logs...</div>
        ) : attendance.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-semibold">No attendance records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="p-4">Shift Date</th>
                  <th className="p-4">Logged Status</th>
                  <th className="p-4">Timing Details</th>
                  <th className="p-4">Working Hours</th>
                  <th className="p-4">Duty Location</th>
                  <th className="p-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300 font-semibold">
                {attendance.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/20 transition-all">
                    <td className="p-4 font-bold text-white whitespace-nowrap">
                      {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                      In: <span className="text-teal-400 font-bold">{log.checkInTime || '-'}</span> · Out: <span className="text-rose-400 font-bold">{log.checkOutTime || '-'}</span>
                    </td>
                    <td className="p-4 text-slate-300 font-bold">
                      {log.workingHours ? `${log.workingHours} hrs` : '--'}
                      {log.overtimeHours > 0 && <span className="text-[9px] text-emerald-400 font-bold block">OT: +{log.overtimeHours} hrs</span>}
                    </td>
                    <td className="p-4 text-slate-400">{log.site || 'Pune office'}</td>
                    <td className="p-4 text-slate-500 italic max-w-[150px] truncate" title={log.remarks}>{log.remarks || '-'}</td>
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
