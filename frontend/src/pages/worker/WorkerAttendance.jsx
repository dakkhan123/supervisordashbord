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
      case 'Present': return 'bg-primary/10 text-primary border border-primary/20';
      case 'Late': return 'bg-amber-500/10 text-amber-700 border border-amber-500/20';
      case 'Half Day': return 'bg-orange-500/10 text-orange-700 border border-orange-500/20';
      case 'Absent': return 'bg-error/10 text-error border border-error/20';
      case 'Leave': return 'bg-blue-500/10 text-blue-700 border border-blue-500/20';
      default: return 'bg-surface-low text-outline border border-outline-variant';
    }
  };

  return (
    <div className="flex flex-col gap-6 text-on-surface font-sans">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/40 pb-5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">fingerprint</span>
            Shift Attendance Record
          </h2>
          <p className="text-xs text-outline font-medium mt-0.5">
            Log your daily shift check-ins, record working hours, and review historical presence statements.
          </p>
        </div>
        <button
          onClick={fetchAttendanceLogs}
          className="btn border border-outline-variant hover:bg-surface-low text-on-surface-variant font-bold px-4 py-2.5 rounded-sm text-xs flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh Logs
        </button>
      </div>

      {/* Today Check-In Details Card */}
      {todayRecord?.checkIn && (
        <div className="bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
              <span className="material-symbols-outlined text-[22px] animate-pulse">login</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">Active Shift Session</h3>
              <p className="text-[11px] text-outline mt-0.5">
                Checked in at <span className="text-primary font-bold">{todayRecord.checkInTime}</span> ({todayRecord.attendanceType})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-outline uppercase tracking-wider">ELAPSED TIME</span>
              <span className="text-xl font-black font-mono text-on-surface leading-none">
                {todayRecord.checkOut ? `${todayRecord.workingHours} hrs` : sessionDuration}
              </span>
            </div>

            {!todayRecord.checkOut && (
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="btn bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-sm text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm"
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
        <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Days Present</p>
            <h3 className="text-2xl font-black text-primary mt-1">{presentCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Late Arrivals</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{lateCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">schedule</span>
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Days Absent</p>
            <h3 className="text-2xl font-black text-error mt-1">{absentCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-error/10 border border-error/20 text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">cancel</span>
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Leaves / Half Days</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">{leaveCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">event_busy</span>
          </div>
        </div>
      </div>

      {/* Attendance History list */}
      <div className="bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm flex flex-col gap-4">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Historical Shift Logs</h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-outline font-semibold">Loading attendance logs...</div>
        ) : attendance.length === 0 ? (
          <div className="py-12 text-center text-xs text-outline font-semibold">No attendance records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-low border-b border-outline-variant text-[11px] font-bold text-outline uppercase tracking-wider">
                  <th className="p-3.5">Shift Date</th>
                  <th className="p-3.5">Logged Status</th>
                  <th className="p-3.5">Timing Details</th>
                  <th className="p-3.5">Working Hours</th>
                  <th className="p-3.5">Duty Location</th>
                  <th className="p-3.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-on-surface font-semibold">
                {attendance.map((log) => (
                  <tr key={log._id} className="hover:bg-surface-low transition-colors duration-150">
                    <td className="p-3.5 font-bold text-on-surface whitespace-nowrap">
                      {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-on-surface-variant font-mono text-[11px] whitespace-nowrap">
                      In: <span className="text-primary font-bold">{log.checkInTime || '-'}</span> · Out: <span className="text-error font-bold">{log.checkOutTime || '-'}</span>
                    </td>
                    <td className="p-3.5 text-on-surface font-bold">
                      {log.workingHours ? `${log.workingHours} hrs` : '--'}
                      {log.overtimeHours > 0 && <span className="text-[10px] text-primary font-bold block">OT: +{log.overtimeHours} hrs</span>}
                    </td>
                    <td className="p-3.5 text-outline">{log.site || 'Pune office'}</td>
                    <td className="p-3.5 text-outline italic max-w-[150px] truncate" title={log.remarks}>{log.remarks || '-'}</td>
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
