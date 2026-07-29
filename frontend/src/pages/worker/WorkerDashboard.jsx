import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

const WorkerDashboard = ({ showToast }) => {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [notifications, setNotifications] = useState([]);
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
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [taskRes, attRes, salRes, notifRes] = await Promise.all([
        api.getMyTasks(),
        api.getMyAttendance(),
        api.getMySalaries(),
        api.getNotifications()
      ]);

      if (taskRes.success) setTasks(taskRes.data || []);
      if (attRes.success) setAttendance(attRes.data || []);
      if (salRes.success) setSalaries(salRes.data || []);
      if (notifRes.success) setNotifications(notifRes.data || []);
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress' || t.status === 'Started');
  const completedTasks = tasks.filter(t => t.status === 'Completed' || t.status === 'Submitted for Verification');
  const presentDays = attendance.filter(a => a.status === 'Present').length;
  const lateDays = attendance.filter(a => a.status === 'Late' || a.status === 'Half Day').length;
  const absentDays = attendance.filter(a => a.status === 'Absent' || a.status === 'Leave').length;

  const workerName = user?.worker?.name || user?.name || user?.username || 'Suresh Kumar';
  const designation = user?.worker?.designation || 'Senior CNC Machinist';
  const department = user?.worker?.department || user?.department || 'Precision Machining Department';
  const empId = user?.worker?.employeeId || user?.employeeId || 'EMP-2026-8842';

  return (
    <div className="flex flex-col gap-6 text-on-surface font-sans">
      {/* 1. Shift Dashboard Hero Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-teal-500/20 text-white">
        <div className="z-10 flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/20 backdrop-blur-md rounded-full text-teal-200 text-[10px] font-extrabold uppercase tracking-widest w-fit border border-white/10">
            SHIFT DASHBOARD
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Welcome back, {workerName}
          </h1>
          <p className="text-xs md:text-sm text-teal-100/90 font-medium">
            {designation} • {department}
          </p>
        </div>

        <div className="z-10 text-left md:text-right flex flex-col gap-1 border-t md:border-t-0 border-white/10 pt-4 md:pt-0 w-full md:w-auto">
          <p className="text-xs font-bold text-teal-100 flex items-center gap-1.5 justify-start md:justify-end">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            Thursday, July 23, 2026
          </p>
          <p className="text-[11px] font-semibold text-teal-200/80">
            Employee ID: <span className="font-mono">{empId}</span>
          </p>
        </div>
      </div>

      {/* 2. Row 1 Grid: Today's Attendance, Monthly Summary, Attendance Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Today's Attendance */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Today's Attendance</h3>
              <p className="text-[11px] text-outline font-medium mt-0.5">Real-time biometric shift status</p>
            </div>
            <span className="px-2.5 py-1 bg-surface-container text-outline text-[10px] font-bold rounded-full border border-outline-variant/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
              Not Clocked In
            </span>
          </div>

          <div className="relative my-2">
            {/* Background Watermark */}
            <span className="material-symbols-outlined absolute right-2 bottom-0 text-[90px] text-on-surface/5 select-none pointer-events-none">
              fingerprint
            </span>
            <p className="text-[10px] font-bold text-outline uppercase tracking-widest">LIVE WORKING SESSION</p>
            <h2 className="text-3xl font-black font-mono text-on-surface mt-1">00:00:00</h2>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-outline-variant/40 pt-3 text-[11px]">
            <div>
              <p className="text-[10px] text-outline font-semibold">Check-In</p>
              <p className="font-bold text-on-surface mt-0.5">--</p>
            </div>
            <div>
              <p className="text-[10px] text-outline font-semibold">Check-Out</p>
              <p className="font-bold text-on-surface mt-0.5">--</p>
            </div>
            <div>
              <p className="text-[10px] text-outline font-semibold">Expected Out</p>
              <p className="font-bold text-on-surface mt-0.5">04:30 PM</p>
            </div>
          </div>

          <Link
            to="/worker/attendance"
            className="w-full py-2.5 px-4 rounded-xl border border-outline-variant hover:border-primary bg-surface-low hover:bg-surface-container text-xs font-bold text-on-surface transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            <span className="material-symbols-outlined text-[18px]">fingerprint</span>
            Biometric Console
          </Link>
        </div>

        {/* Card 2: Monthly Attendance Summary */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Monthly Attendance Summary</h3>
            <p className="text-[11px] text-outline font-medium mt-0.5">Logs distribution for July 2026</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-surface-low border border-outline-variant rounded-xl p-3">
              <p className="text-[10px] font-bold text-outline uppercase">Present</p>
              <p className="text-xl font-black text-emerald-600 mt-1">{presentDays || 7}</p>
            </div>
            <div className="bg-surface-low border border-outline-variant rounded-xl p-3">
              <p className="text-[10px] font-bold text-outline uppercase">Late / Half</p>
              <p className="text-xl font-black text-amber-600 mt-1">{lateDays || '1/1'}</p>
            </div>
            <div className="bg-surface-low border border-outline-variant rounded-xl p-3">
              <p className="text-[10px] font-bold text-outline uppercase">Absent / Leave</p>
              <p className="text-xl font-black text-rose-600 mt-1">{absentDays || '0/1'}</p>
            </div>
          </div>

          <div className="border-t border-outline-variant/40 pt-3 flex flex-col gap-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[10px] text-outline uppercase tracking-wider">SHIFT DUTY PERFORMANCE</span>
              <span className="text-primary font-extrabold">90%</span>
            </div>
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full" style={{ width: '90%' }}></div>
            </div>
            <p className="text-[11px] text-outline font-semibold mt-1">
              Overtime Premium Hours: <span className="text-on-surface font-bold">2.0 Hours</span>
            </p>
          </div>
        </div>

        {/* Card 3: Attendance Timeline */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Attendance Timeline</h3>
            <p className="text-[11px] text-outline font-medium mt-0.5">Chronological sequence of today's events</p>
          </div>

          <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center text-center p-4">
            <span className="material-symbols-outlined text-[48px] text-outline/60 mb-2">
              fingerprint
            </span>
            <p className="text-xs font-bold text-on-surface">Awaiting biometric Check-In</p>
            <p className="text-[10px] text-outline max-w-xs mt-1">
              Clock in from biometric tab to start shift tracking
            </p>
          </div>
        </div>

      </div>

      {/* 3. Row 2 Grid: Earnings History & Overtime, Task Status Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Earnings History & Overtime */}
        <div className="md:col-span-2 bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/40 pb-3">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Earnings History & Overtime</h3>
              <p className="text-[11px] text-outline font-medium">Visual track of basic wages + accumulated shift overtime bonuses.</p>
            </div>
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Past 6 Payslips</span>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold text-outline">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-primary inline-block"></span>
              <span>Net Earnings (₹)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              <span>Overtime Premium (₹)</span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-48 flex items-end justify-between gap-4 pt-4 px-2">
            {[
              { month: 'Feb', net: 18500, ot: 2000 },
              { month: 'Mar', net: 19000, ot: 2500 },
              { month: 'Apr', net: 19000, ot: 1800 },
              { month: 'May', net: 20000, ot: 3000 },
              { month: 'Jun', net: 19500, ot: 2200 },
              { month: 'Jul', net: 21500, ot: 2800 }
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full max-w-[36px] flex items-end justify-center gap-1 h-32">
                  <div
                    className="w-1/2 bg-primary rounded-t-sm transition-all"
                    style={{ height: `${(item.net / 25000) * 100}%` }}
                    title={`Net: ₹${item.net}`}
                  ></div>
                  <div
                    className="w-1/2 bg-emerald-500 rounded-t-sm transition-all"
                    style={{ height: `${(item.ot / 5000) * 100}%` }}
                    title={`Overtime: ₹${item.ot}`}
                  ></div>
                </div>
                <span className="text-[10px] font-bold text-outline">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Task Status Matrix */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-4">
          <div className="border-b border-outline-variant/40 pb-3">
            <h3 className="text-sm font-bold text-on-surface">Task Status Matrix</h3>
            <p className="text-[11px] text-outline font-medium">Active queue ratio of tasks assigned on your CNC desk.</p>
          </div>

          <div className="flex flex-col items-center justify-center my-2">
            {/* Donut Chart Visualization */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-surface-container"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-primary"
                  strokeDasharray={`${(completedTasks.length / (tasks.length || 1)) * 100}, 100`}
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center text-center">
                <span className="text-2xl font-black text-on-surface">{pendingTasks.length}</span>
                <span className="text-[9px] font-bold text-outline uppercase">Active Queue</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-outline-variant/40 pt-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
              <span className="text-outline font-medium">Completed ({completedTasks.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-surface-container border border-outline-variant"></span>
              <span className="text-outline font-medium">Pending ({pendingTasks.length})</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WorkerDashboard;
