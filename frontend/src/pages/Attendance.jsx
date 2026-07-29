import { useState, useEffect } from 'react';
import { api } from '../services/api';
import UserAvatar from '../components/UserAvatar';

const Attendance = ({ showToast }) => {
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [allHistory, setAllHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);

  // Current logged in user profile (to verify Admin/Supervisor controls)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('smartops_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Tab state: 'dashboard', 'history', 'reports', 'admin'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Daily Logger Date (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // History query parameters
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('All');
  const [historySiteFilter, setHistorySiteFilter] = useState('All');
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  // Report query parameters
  const [reportSearch, setReportSearch] = useState('');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);

  // Selected attendance record for detailed view
  const [selectedRecord, setSelectedRecord] = useState(null);

  // States for worker attendance history profile modal
  const [selectedWorkerForProfile, setSelectedWorkerForProfile] = useState(null);
  const [workerHistory, setWorkerHistory] = useState([]);
  const [workerHistoryLoading, setWorkerHistoryLoading] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState('All');
  const [timelineStartDate, setTimelineStartDate] = useState('');
  const [timelineEndDate, setTimelineEndDate] = useState('');
  const [timelineSort, setTimelineSort] = useState('newest');

  // Manual record modal state (Approvals / corrections)
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualWorker, setManualWorker] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualCheckIn, setManualCheckIn] = useState('09:00 AM');
  const [manualCheckOut, setManualCheckOut] = useState('06:00 PM');
  const [manualStatus, setManualStatus] = useState('Present');
  const [manualSite, setManualSite] = useState('Pune Head Office');
  const [manualRemarks, setManualRemarks] = useState('');

  // Edit record modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);

  // Shift & Holidays manager state
  const [holidays, setHolidays] = useState([
    { name: 'Independence Day', date: '2026-08-15' },
    { name: 'Gandhi Jayanti', date: '2026-10-02' },
    { name: 'Diwali', date: '2026-11-08' },
    { name: 'Christmas', date: '2026-12-25' }
  ]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  const [shiftTimings, setShiftTimings] = useState({
    start: '09:00 AM',
    end: '06:00 PM',
    grace: 15
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [workersRes, attendanceRes] = await Promise.all([
        api.getWorkers(),
        api.getAttendance({ date: selectedDate })
      ]);

      if (workersRes.success) {
        setWorkers(workersRes.data.filter(w => w.status === 'Active'));
      } else {
        setError(workersRes.error || 'Failed to fetch workers registry');
      }

      if (attendanceRes.success) {
        setAttendance(attendanceRes.data);
      }
    } catch (err) {
      console.error(err);
      setError('Connection refused. Ensure Express server is connected.');
      showToast('Error loading attendance registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.getAttendance({});
      if (res.success) {
        setAllHistory(res.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading historical records', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    fetchHistoryData();
  }, [activeTab]);

  // Resolve status for each worker today
  const getWorkerStatus = (workerId) => {
    const record = attendance.find(a => a.worker?._id === workerId || a.worker === workerId);
    return record ? record.status : 'No Record';
  };

  // Calculations for today
  const activeWorkerCount = workers.length;
  const presentCount = workers.filter(w => getWorkerStatus(w._id) === 'Present' || getWorkerStatus(w._id) === 'Late').length;
  const lateCountToday = workers.filter(w => getWorkerStatus(w._id) === 'Late').length;
  const absentCount = workers.filter(w => getWorkerStatus(w._id) === 'Absent').length;
  const leaveCount = workers.filter(w => getWorkerStatus(w._id) === 'Leave').length;
  const loggedCount = presentCount + absentCount + leaveCount;
  const presenceRate = loggedCount > 0 ? Math.round((presentCount / loggedCount) * 100) : 0;
  const compliancePct = activeWorkerCount > 0 ? Math.round((loggedCount / activeWorkerCount) * 100) : 0;

  // Formatting classes
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Present': return 'bg-teal-500/10 text-teal-400 border border-teal-500/20';
      case 'Late': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Half Day': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Absent': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'Leave': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Holiday': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      default: return 'bg-slate-800 text-slate-400 border border-slate-700/50';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Historical filtering
  const filteredHistory = allHistory.filter(h => {
    const wName = h.employeeName || h.worker?.name || '';
    const wId = h.employeeId || h.worker?.employeeId || '';
    const matchSearch = !historySearch || 
      wName.toLowerCase().includes(historySearch.toLowerCase()) ||
      wId.toLowerCase().includes(historySearch.toLowerCase());
    
    const matchStatus = historyStatusFilter === 'All' || h.status === historyStatusFilter;
    const matchSite = historySiteFilter === 'All' || h.site === historySiteFilter;
    
    const recordDate = new Date(h.date).toISOString().split('T')[0];
    const matchDate = !historyDateFilter || recordDate === historyDateFilter;

    return matchSearch && matchStatus && matchSite && matchDate;
  });

  // Report workers filtering
  const filteredReportWorkers = workers.filter(w =>
    !reportSearch || w.name.toLowerCase().includes(reportSearch.toLowerCase()) || (w.employeeId && w.employeeId.toLowerCase().includes(reportSearch.toLowerCase()))
  );

  const handleWorkerCardClick = async (worker) => {
    setSelectedWorkerForProfile(worker);
    setTimelineFilter('All');
    setTimelineStartDate('');
    setTimelineEndDate('');
    setTimelineSort('newest');
    setWorkerHistoryLoading(true);
    try {
      const res = await api.getAttendance({ worker: worker._id });
      if (res.success) {
        setWorkerHistory(res.data);
      } else {
        showToast(res.error || 'Failed to fetch attendance profile', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection refused. Ensure server is connected.', 'error');
    } finally {
      setWorkerHistoryLoading(false);
    }
  };

  const getDayOfWeek = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'long' });
  };

  const getFilteredTimeline = () => {
    let filtered = [...workerHistory];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (timelineFilter === 'Today') {
      filtered = filtered.filter(h => {
        const recordDate = new Date(h.date);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      });
    } else if (timelineFilter === 'This Week') {
      const startOfWeek = new Date(today);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(h => {
        const recordDate = new Date(h.date);
        return recordDate >= startOfWeek;
      });
    } else if (timelineFilter === 'This Month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      filtered = filtered.filter(h => {
        const recordDate = new Date(h.date);
        return recordDate >= startOfMonth;
      });
    } else if (timelineFilter === 'Custom') {
      if (timelineStartDate) {
        const start = new Date(timelineStartDate);
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter(h => new Date(h.date) >= start);
      }
      if (timelineEndDate) {
        const end = new Date(timelineEndDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(h => new Date(h.date) <= end);
      }
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return timelineSort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!filteredHistory.length) return showToast('No history records match current filters to export', 'error');
    
    const headers = ['Date', 'Employee ID', 'Employee Name', 'Role', 'Department', 'Check-In', 'Check-Out', 'Working Hours', 'Status', 'Site', 'GPS Coordinates', 'Address', 'Device', 'IP Address'];
    const csvRows = [headers.join(',')];

    filteredHistory.forEach(h => {
      const dateStr = new Date(h.date).toISOString().split('T')[0];
      const name = h.employeeName || h.worker?.name || 'N/A';
      const id = h.employeeId || h.worker?.employeeId || 'N/A';
      const role = h.role || h.worker?.role || 'Worker';
      const dept = h.department || h.worker?.department || 'Operations';
      const gps = h.latitude && h.longitude ? `${h.latitude};${h.longitude}` : 'N/A';
      const addr = h.address ? `"${h.address.replace(/"/g, '""')}"` : 'N/A';

      csvRows.push([
        dateStr,
        `"${id}"`,
        `"${name}"`,
        `"${role}"`,
        `"${dept}"`,
        h.checkInTime || '-',
        h.checkOutTime || '-',
        h.workingHours || 0,
        h.status,
        `"${h.site || 'Pune'}"`,
        `"${gps}"`,
        addr,
        h.device || '-',
        h.ipAddress || '-'
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SmartOps_Attendance_Export_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance report CSV download started', 'success');
  };

  // Print Layout Handler
  const handlePrintLogs = () => {
    if (!filteredHistory.length) return showToast('No history records to print', 'error');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>SmartOps Attendance Registry Report</title>
          <style>
            body { font-family: sans-serif; padding: 25px; color: #1e293b; background-color: #fff; }
            h1 { color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 5px; }
            .meta { font-size: 11px; color: #64748b; margin-bottom: 20px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 11px; }
            th { background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; color: #475569; }
            .badge { font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 9px; text-transform: uppercase; }
            .Present { background: #d1fae5; color: #065f46; }
            .Absent { background: #fee2e2; color: #991b1b; }
            .Late { background: #fef3c7; color: #92400e; }
            .Half-Day { background: #ffedd5; color: #9a3412; }
            .Leave { background: #dbeafe; color: #1e40af; }
          </style>
        </head>
        <body>
          <h1>SmartOps Daily Attendance Report</h1>
          <div class="meta">Generated on: ${new Date().toLocaleString('en-IN')} · Record Count: ${filteredHistory.length}</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Role & Department</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Worked Hours</th>
                <th>Status</th>
                <th>Site Location</th>
              </tr>
            </thead>
            <tbody>
              ${filteredHistory.map(h => `
                <tr>
                  <td>${new Date(h.date).toLocaleDateString('en-IN')}</td>
                  <td>${h.employeeId || h.worker?.employeeId || 'N/A'}</td>
                  <td>${h.employeeName || h.worker?.name || 'N/A'}</td>
                  <td>${h.role || h.worker?.role || 'Worker'} (${h.department || h.worker?.department || 'Ops'})</td>
                  <td>${h.checkInTime || '-'}</td>
                  <td>${h.checkOutTime || '-'}</td>
                  <td>${h.workingHours ? `${h.workingHours} hrs` : '-'}</td>
                  <td><span class="badge ${h.status.replace(/\s+/g, '-')}">${h.status}</span></td>
                  <td>${h.site || 'Pune Head Office'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
    showToast('Sent attendance log to printer', 'success');
  };

  // Submit manual log (correction approval)
  const handleAddManualLog = async (e) => {
    e.preventDefault();
    if (!manualWorker) return showToast('Please select an employee profile', 'error');

    const selectedWorkerObj = workers.find(w => w._id === manualWorker);

    try {
      setLoading(true);
      const res = await api.logAttendance({
        worker: manualWorker,
        date: new Date(manualDate),
        checkInTime: manualCheckIn,
        checkOutTime: manualCheckOut,
        status: manualStatus,
        remarks: manualRemarks || 'Manual correction added',
        employeeId: selectedWorkerObj.employeeId || '',
        employeeName: selectedWorkerObj.name || '',
        role: selectedWorkerObj.role || 'Worker',
        department: selectedWorkerObj.department || 'Operations',
        site: manualSite,
        supervisorName: currentUser?.username || 'Supervisor'
      });

      if (res.success) {
        showToast('Manual attendance correction recorded!', 'success');
        setShowManualModal(false);
        setManualWorker('');
        setManualRemarks('');
        fetchData();
      } else {
        showToast(res.error || 'Failed to log manual entry', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('API request failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete attendance record
  const handleDeleteRecord = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) return;
    try {
      setLoading(true);
      const res = await api.deleteAttendance(id);
      if (res.success) {
        showToast('Attendance log deleted successfully', 'success');
        fetchHistoryData();
        fetchData();
      } else {
        showToast(res.error || 'Failed to delete record', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection to server refused.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Manage Holidays handlers
  const handleAddHoliday = (e) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate) return;
    setHolidays([...holidays, { name: newHolidayName, date: newHolidayDate }]);
    setNewHolidayName('');
    setNewHolidayDate('');
    showToast('Company holiday added successfully', 'success');
  };

  const handleRemoveHoliday = (idx) => {
    setHolidays(holidays.filter((_, i) => i !== idx));
    showToast('Holiday removed', 'success');
  };

  const isUserAuthorized = currentUser?.role?.toLowerCase() === 'owner' || currentUser?.role?.toLowerCase() === 'supervisor' || currentUser?.role?.toLowerCase() === 'admin';

  return (
    <div className="flex flex-col gap-6 text-white font-sans">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-400 text-[32px]">co_present</span>
            Attendance Registry
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Monitor and manage daily check-ins, geofencing coordinates, and export audit reports.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-3">
          {isUserAuthorized && (
            <button
              onClick={() => setShowManualModal(true)}
              className="btn bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_task</span>
              Manual Correction
            </button>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl shadow-inner">
            <span className="material-symbols-outlined text-[16px] text-teal-400">calendar_month</span>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="outline-none text-slate-200 bg-transparent cursor-pointer font-mono font-bold"
            />
          </div>
        </div>
      </div>

      {/* Tabs Menu Panel */}
      <div className="flex bg-slate-950/40 p-1 border border-slate-800/80 rounded-2xl w-fit">
        {[
          { id: 'dashboard', label: 'Console Dashboard', icon: 'analytics' },
          { id: 'history', label: 'Shift Logs History', icon: 'receipt_long' },
          { id: 'reports', label: 'HR Summaries', icon: 'summarize' },
          { id: 'admin', label: 'Shift Timing / Holidays', icon: 'settings_timelapse' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === t.id 
                ? 'bg-teal-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading Overlay */}
      {loading && activeTab === 'dashboard' ? (
        <div className="p-20 text-center flex flex-col items-center justify-center gap-4 bg-slate-900/40 border border-slate-800 rounded-3xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Syncing attendance sheets...</p>
        </div>
      ) : error ? (
        <div className="p-16 text-center flex flex-col items-center justify-center gap-4 bg-slate-900/40 border border-slate-800 rounded-3xl">
          <span className="material-symbols-outlined text-[48px] text-rose-500">error</span>
          <p className="text-sm font-bold text-white">Database Sync Failed</p>
          <p className="text-xs text-slate-400">{error}</p>
          <button onClick={fetchData} className="btn bg-teal-600 text-white text-xs px-4 py-2 rounded-lg">Retry Sync</button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* 1. CONSOLE DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6">
              
              {/* Distribution Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marked Compliance Meter</span>
                    <span className="text-xs font-black text-teal-400">{compliancePct}% Logs Recorded</span>
                  </div>
                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${compliancePct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>Logged Records: {loggedCount} / {activeWorkerCount} workers</span>
                    <span className="text-amber-400">{activeWorkerCount - loggedCount} Pending Clock-ins</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Status Distribution Today</span>
                  <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                    {presentCount > 0 && (
                      <div className="bg-teal-500 h-full" style={{ width: `${((presentCount - lateCountToday) / (loggedCount || 1)) * 100}%` }} title={`On-Time Present`} />
                    )}
                    {lateCountToday > 0 && (
                      <div className="bg-amber-500 h-full" style={{ width: `${(lateCountToday / (loggedCount || 1)) * 100}%` }} title={`Late Arrivals`} />
                    )}
                    {absentCount > 0 && (
                      <div className="bg-red-500 h-full" style={{ width: `${(absentCount / (loggedCount || 1)) * 100}%` }} title={`Absent`} />
                    )}
                    {leaveCount > 0 && (
                      <div className="bg-blue-500 h-full" style={{ width: `${(leaveCount / (loggedCount || 1)) * 100}%` }} title={`On Leave`} />
                    )}
                    {loggedCount === 0 && (
                      <div className="w-full h-full bg-slate-800" title="No logs marked" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 flex-wrap gap-2">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-500 block"></span>On-Time: {presentCount - lateCountToday}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>Late: {lateCountToday}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 block"></span>Absent: {absentCount}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 block"></span>Leave: {leaveCount}</span>
                  </div>
                </div>
              </div>

              {/* KPI Scorecards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl shadow-md flex flex-col justify-between gap-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Staff Registry</span>
                  <div className="text-3xl font-black text-white leading-none mt-2">{activeWorkerCount}</div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Marked in operations</span>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl shadow-md flex flex-col justify-between gap-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Marked Present</span>
                  <div className="text-3xl font-black text-teal-400 leading-none mt-2">{presentCount}</div>
                  <span className="text-[10px] text-teal-400/80 font-bold uppercase">Checked In today</span>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl shadow-md flex flex-col justify-between gap-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Late / Absent</span>
                  <div className="text-3xl font-black text-amber-500 leading-none mt-2">
                    {lateCountToday} <span className="text-sm font-bold text-red-400">/ {absentCount}</span>
                  </div>
                  <span className="text-[10px] text-rose-400 font-bold uppercase">Logged warnings</span>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl shadow-md flex flex-col justify-between gap-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daily Presence Ratio</span>
                  <div className="text-3xl font-black text-teal-400 leading-none mt-2">{presenceRate}%</div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Compliance Score</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. SHIFT LOGS HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-4">
              
              {/* History Search & Filters toolbar */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full lg:flex-1">
                  
                  {/* Name Search */}
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">search</span>
                    <input
                      type="text"
                      placeholder="Search name/employee ID..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-teal-500 transition-all font-medium"
                    />
                  </div>

                  {/* Status filter */}
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    className="py-2 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 outline-none focus:border-teal-500 cursor-pointer font-bold"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Present">Present (On-Time)</option>
                    <option value="Late">Late Check-In</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Leave">On Leave</option>
                    <option value="Absent">Absent</option>
                  </select>

                  {/* Site filter */}
                  <select
                    value={historySiteFilter}
                    onChange={(e) => setHistorySiteFilter(e.target.value)}
                    className="py-2 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 outline-none focus:border-teal-500 cursor-pointer font-bold"
                  >
                    <option value="All">All Locations / Sites</option>
                    <option value="Pune Head Office">Pune Head Office</option>
                    <option value="Mumbai Assembly Plant">Mumbai Assembly Plant</option>
                    <option value="Noida Unit B">Noida Unit B</option>
                  </select>

                  {/* Date Picker Filter */}
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 rounded-xl">
                    <span className="material-symbols-outlined text-[16px] text-slate-500">event</span>
                    <input
                      type="date"
                      value={historyDateFilter}
                      onChange={(e) => setHistoryDateFilter(e.target.value)}
                      className="outline-none text-xs text-slate-300 bg-transparent cursor-pointer py-1.5 w-full font-mono"
                    />
                    {historyDateFilter && (
                      <button onClick={() => setHistoryDateFilter('')} className="text-slate-500 hover:text-rose-400">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Print/Export buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handlePrintLogs}
                    className="btn border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">print</span>
                    Print
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="btn bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Export CSV
                  </button>
                </div>
              </div>

              {/* History Table Container */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
                {historyLoading ? (
                  <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Syncing timeline logs...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[550px] overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-slate-800 sticky top-0 z-[5] backdrop-blur-md">
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee Details</th>
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logs (In / Out)</th>
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shift Hours</th>
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">GPS Geofence</th>
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                          {isUserAuthorized && <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Edit Logs</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map(h => (
                          <tr key={h._id} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                            <td className="p-4 font-bold text-white whitespace-nowrap">
                              {formatDate(h.date)}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-200">{h.employeeName || h.worker?.name || 'Unknown Staff'}</span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {h.employeeId || h.worker?.employeeId || 'N/A'} · {h.role || h.worker?.role || 'Worker'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 font-mono font-semibold text-slate-300">
                              <div className="flex flex-col text-[10px] gap-0.5">
                                <span>In: <span className="text-teal-400 font-bold">{h.checkInTime || '-'}</span></span>
                                <span>Out: <span className="text-rose-400 font-bold">{h.checkOutTime || '-'}</span></span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-white">{h.workingHours ? `${h.workingHours} hrs` : '--'}</span>
                                {h.overtimeHours > 0 && <span className="text-[9px] text-emerald-400 font-bold">OT: +{h.overtimeHours} hrs</span>}
                              </div>
                            </td>
                            <td className="p-4">
                              {h.latitude && h.longitude ? (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 font-bold hover:underline"
                                  title="View Check-In coordinates on Google Maps"
                                >
                                  <span className="material-symbols-outlined text-[14px]">map</span>
                                  {h.site || 'Pune office'}
                                </a>
                              ) : (
                                <span className="text-slate-500">Manual Entry</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${getStatusBadgeClass(h.status)}`}>
                                {h.status}
                              </span>
                            </td>
                            {isUserAuthorized && (
                              <td className="p-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditRecord(h);
                                      setShowEditModal(true);
                                    }}
                                    className="p-1.5 rounded-lg border border-slate-800 hover:border-teal-500 hover:text-teal-400 transition-all cursor-pointer"
                                    title="Edit Log"
                                  >
                                    <span className="material-symbols-outlined text-[16px] leading-none">edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRecord(h._id)}
                                    className="p-1.5 rounded-lg border border-slate-800 hover:border-rose-500 hover:text-rose-400 transition-all cursor-pointer"
                                    title="Delete Log"
                                  >
                                    <span className="material-symbols-outlined text-[16px] leading-none">delete</span>
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                        {filteredHistory.length === 0 && (
                          <tr>
                            <td colSpan="7" className="p-16 text-center text-slate-500 font-bold italic">
                              No history entries matched the search filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. HR SUMMARIES TAB */}
          {activeTab === 'reports' && (
            <div className="flex flex-col gap-5">
              
              {/* Reports Query Bar */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="relative w-full md:max-w-[280px]">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">search</span>
                  <input
                    type="text"
                    placeholder="Search by worker name..."
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-teal-500 transition-all font-medium"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Target Month:</span>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(parseInt(e.target.value, 10))}
                    className="py-1.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-bold outline-none cursor-pointer"
                  >
                    {[
                      { num: 1, name: 'January' },
                      { num: 2, name: 'February' },
                      { num: 3, name: 'March' },
                      { num: 4, name: 'April' },
                      { num: 5, name: 'May' },
                      { num: 6, name: 'June' },
                      { num: 7, name: 'July' },
                      { num: 8, name: 'August' },
                      { num: 9, name: 'September' },
                      { num: 10, name: 'October' },
                      { num: 11, name: 'November' },
                      { num: 12, name: 'December' }
                    ].map(m => (
                      <option key={m.num} value={m.num}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Workers report summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReportWorkers.map(w => {
                  const wHistory = allHistory.filter(h => {
                    const recordWorkerId = h.worker?._id || h.worker;
                    const recMonth = new Date(h.date).getMonth() + 1;
                    return recordWorkerId === w._id && recMonth === reportMonth;
                  });

                  const pCount = wHistory.filter(h => h.status === 'Present').length;
                  const lCount = wHistory.filter(h => h.status === 'Late').length;
                  const hCount = wHistory.filter(h => h.status === 'Half Day').length;
                  const leaveCount = wHistory.filter(h => h.status === 'Leave').length;
                  const aCount = wHistory.filter(h => h.status === 'Absent').length;
                  
                  const activeDays = pCount + lCount + hCount + aCount;
                  const rate = activeDays > 0 ? Math.round(((pCount + lCount + hCount * 0.5) / activeDays) * 100) : 0;

                  return (
                    <div 
                      key={w._id}
                      onClick={() => handleWorkerCardClick(w)}
                      className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl shadow-md flex flex-col justify-between gap-4 cursor-pointer hover:border-teal-500 hover:bg-slate-900/95 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-500/10 border-2 border-teal-500/20 flex items-center justify-center font-bold text-teal-400">
                          {w.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-white truncate">{w.name}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {w.role} · ID: <span className="font-mono">{w.employeeId || 'N/A'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5 text-center text-slate-300 text-[11px] font-semibold py-2.5 bg-slate-950 rounded-xl">
                        <div>
                          <p className="text-teal-400 font-black">{pCount}</p>
                          <p className="text-[8px] uppercase tracking-wider text-slate-500">Present</p>
                        </div>
                        <div>
                          <p className="text-amber-400 font-black">{lCount}</p>
                          <p className="text-[8px] uppercase tracking-wider text-slate-500">Late</p>
                        </div>
                        <div>
                          <p className="text-orange-400 font-black">{hCount}</p>
                          <p className="text-[8px] uppercase tracking-wider text-slate-500">Half</p>
                        </div>
                        <div>
                          <p className="text-blue-400 font-black">{leaveCount}</p>
                          <p className="text-[8px] uppercase tracking-wider text-slate-500">Leave</p>
                        </div>
                        <div>
                          <p className="text-red-400 font-black">{aCount}</p>
                          <p className="text-[8px] uppercase tracking-wider text-slate-500">Absent</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          <span>Shift Presence Rate</span>
                          <span className={`font-bold ${rate >= 80 ? 'text-teal-400' : 'text-rose-400'}`}>{rate}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
                          <div className={`h-full rounded-full transition-all duration-300 ${rate >= 80 ? 'bg-teal-500' : 'bg-rose-500'}`} style={{ width: `${rate}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. ADMIN SHIFT TIMING & HOLIDAYS TAB */}
          {activeTab === 'admin' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Shift Timing Config */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-lg">
                <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-teal-400 text-[20px]">schedule</span>
                  Office Shift Schedule Rules
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Configure default operational shift window timings and grace limits for punctuality audits.
                </p>

                <div className="flex flex-col gap-4 border-t border-slate-800/50 pt-4 mt-1 font-semibold text-xs text-slate-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest">Shift Check-In Start</label>
                      <input
                        type="text"
                        value={shiftTimings.start}
                        onChange={(e) => setShiftTimings({ ...shiftTimings, start: e.target.value })}
                        className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none font-mono text-center text-teal-400 font-bold focus:border-teal-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest">Shift Checkout End</label>
                      <input
                        type="text"
                        value={shiftTimings.end}
                        onChange={(e) => setShiftTimings({ ...shiftTimings, end: e.target.value })}
                        className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none font-mono text-center text-rose-400 font-bold focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest">Late Arrival Grace Threshold (Minutes)</label>
                    <input
                      type="number"
                      value={shiftTimings.grace}
                      onChange={(e) => setShiftTimings({ ...shiftTimings, grace: parseInt(e.target.value, 10) })}
                      className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none font-mono text-center focus:border-teal-500"
                    />
                  </div>

                  <button
                    onClick={() => showToast('Operational shift timings updated successfully', 'success')}
                    className="btn bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all mt-2 w-full"
                  >
                    Save Timing Configurations
                  </button>
                </div>
              </div>

              {/* Holidays Manager */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-lg">
                <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-teal-400 text-[20px]">holiday_village</span>
                  Company Holidays Calendar
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Add or edit annual office holidays that automatically bypass worker logging checks.
                </p>

                {/* Holiday list */}
                <div className="flex-1 flex flex-col gap-2 max-h-[220px] overflow-y-auto scrollbar-thin pr-1 border-t border-slate-800/50 pt-3">
                  {holidays.map((h, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                      <div>
                        <p className="font-bold text-white">{h.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{formatDate(h.date)}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveHoliday(idx)}
                        className="p-1 rounded text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        title="Remove Holiday"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add holiday form */}
                <form onSubmit={handleAddHoliday} className="grid grid-cols-2 gap-3 mt-2 border-t border-slate-800/40 pt-3">
                  <input
                    type="text"
                    placeholder="Holiday title..."
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    className="p-2 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none focus:border-teal-500 font-semibold"
                    required
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="p-2 px-2 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none focus:border-teal-500 font-mono cursor-pointer flex-1"
                      required
                    />
                    <button
                      type="submit"
                      className="btn bg-teal-600 hover:bg-teal-500 text-white font-bold p-2.5 rounded-xl cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] leading-none">add</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Detail view Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-[480px] overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-5 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-teal-400">badge</span>
                Attendance Log Details
              </h4>
              <button onClick={() => setSelectedRecord(null)} className="w-[30px] h-[30px] rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4.5 text-xs text-slate-300 font-semibold">
              <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center font-bold text-teal-400 text-base">
                  {(selectedRecord.employeeName || selectedRecord.worker?.name || 'S').charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{selectedRecord.employeeName || selectedRecord.worker?.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{selectedRecord.role || 'Staff'} · {selectedRecord.department}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Log Date</p>
                  <p className="text-white mt-0.5 font-mono">{formatDate(selectedRecord.date)}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Status Type</p>
                  <p className="mt-0.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${getStatusBadgeClass(selectedRecord.status)}`}>
                      {selectedRecord.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Shift Check-In</p>
                  <p className="text-white mt-0.5 font-mono">{selectedRecord.checkInTime || '-'}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Shift Checkout</p>
                  <p className="text-white mt-0.5 font-mono">{selectedRecord.checkOutTime || '-'}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Total Hours</p>
                  <p className="text-white mt-0.5">{selectedRecord.workingHours ? `${selectedRecord.workingHours} hrs` : '-'}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Assigned Site</p>
                  <p className="text-white mt-0.5">{selectedRecord.site || 'Pune Head Office'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">GPS Address Logged</p>
                  <p className="text-slate-300 mt-1 leading-relaxed bg-slate-950 p-2.5 border border-slate-800 rounded-lg">
                    {selectedRecord.address || 'No GPS coordinates logs available for manual entry.'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Client Metadata</p>
                  <p className="text-slate-400 mt-1 font-mono text-[10px]">
                    IP Address: {selectedRecord.ipAddress || 'N/A'} · Device: {selectedRecord.device || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800 flex justify-end">
              <button onClick={() => setSelectedRecord(null)} className="px-4 py-2 border border-slate-800 rounded-xl hover:bg-slate-800 cursor-pointer text-xs font-bold transition-all">
                Close details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HR Detailed Profile View */}
      {selectedWorkerForProfile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-[780px] max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-scale-up">
            
            <div className="px-6 py-5 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-[10]">
              <h4 className="font-extrabold text-sm text-teal-400 uppercase tracking-widest">Employee HR Performance Sheet</h4>
              <button onClick={() => setSelectedWorkerForProfile(null)} className="w-[30px] h-[30px] rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                <div className="md:col-span-5 bg-slate-950/60 p-5 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center font-bold text-teal-400 text-lg">
                    {selectedWorkerForProfile.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">{selectedWorkerForProfile.name}</h3>
                    <p className="text-[10px] text-teal-300 font-bold uppercase tracking-wider mt-1">{selectedWorkerForProfile.role}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded select-all">
                      {selectedWorkerForProfile.employeeId || 'No ID Record'}
                    </p>
                  </div>
                </div>

                <div className="md:col-span-7 grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="col-span-2 bg-teal-950/20 border border-teal-900/30 rounded-xl p-4">
                    <span className="text-[9px] font-bold text-teal-400 uppercase tracking-widest">Presence Percentage</span>
                    <div className="flex items-end justify-between mt-2.5">
                      <div className="text-3xl font-black text-teal-400 leading-none">
                        {(() => {
                          const wPresentCount = workerHistory.filter(h => h.status === 'Present' || h.status === 'Late').length;
                          const wAbsentCount = workerHistory.filter(h => h.status === 'Absent').length;
                          const wLeaveCount = workerHistory.filter(h => h.status === 'Leave').length;
                          const wTotal = wPresentCount + wAbsentCount + wLeaveCount;
                          return wTotal > 0 ? Math.round((wPresentCount / wTotal) * 100) : 0;
                        })()}%
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Based on logged logs</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-4">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Present (On-Time)</span>
                    <div className="text-2xl font-black text-teal-400 mt-2 leading-none">
                      {workerHistory.filter(h => h.status === 'Present').length}
                    </div>
                  </div>

                  <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-4">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Late Logs</span>
                    <div className="text-2xl font-black text-amber-400 mt-2 leading-none">
                      {workerHistory.filter(h => h.status === 'Late').length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                {workerHistoryLoading ? (
                  <div className="p-10 text-center flex flex-col items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-400"></div>
                    <p className="text-[10px] text-slate-500 font-bold">Syncing HR DB records...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[220px] overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 sticky top-0 z-[5]">
                          <th className="p-3 text-[9px] font-bold text-slate-500 uppercase bg-slate-900">Date</th>
                          <th className="p-3 text-[9px] font-bold text-slate-500 uppercase bg-slate-900">Status</th>
                          <th className="p-3 text-[9px] font-bold text-slate-500 uppercase bg-slate-900">Timing (In/Out)</th>
                          <th className="p-3 text-[9px] font-bold text-slate-500 uppercase bg-slate-900">Hours</th>
                          <th className="p-3 text-[9px] font-bold text-slate-500 uppercase bg-slate-900">Site Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workerHistory.map(h => (
                          <tr key={h._id} className="border-b border-slate-800/40 hover:bg-slate-900/50">
                            <td className="p-3 font-bold text-slate-300">
                              {formatDate(h.date)}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${getStatusBadgeClass(h.status)}`}>
                                {h.status}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-semibold text-[10px]">
                              {h.checkInTime || '-'} / {h.checkOutTime || '-'}
                            </td>
                            <td className="p-3 font-semibold text-slate-300">
                              {h.workingHours ? `${h.workingHours} hrs` : '-'}
                            </td>
                            <td className="p-3 text-slate-400 font-semibold">{h.site || 'Pune'}</td>
                          </tr>
                        ))}
                        {workerHistory.length === 0 && (
                          <tr>
                            <td colSpan="5" className="p-8 text-center text-slate-500 font-bold italic">
                              No log history on database.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800 flex justify-end sticky bottom-0 z-[10]">
              <button onClick={() => setSelectedWorkerForProfile(null)} className="px-4 py-2 border border-slate-800 rounded-xl hover:bg-slate-800 cursor-pointer text-xs font-bold">
                Close HR Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Check-in Modal (Corrections / Approvals) */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-[500px] overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-5 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-teal-400">bookmark_added</span>
                Manual Shift Entry
              </h4>
              <button onClick={() => setShowManualModal(false)} className="w-[30px] h-[30px] rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddManualLog} className="p-6 flex flex-col gap-4 text-xs font-bold text-slate-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-slate-500">Select Employee</label>
                <select
                  value={manualWorker}
                  onChange={(e) => setManualWorker(e.target.value)}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-teal-500 font-bold cursor-pointer"
                  required
                >
                  <option value="">Choose worker from registry...</option>
                  {workers.map(w => (
                    <option key={w._id} value={w._id}>{w.name} ({w.employeeId || 'No ID'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500">Log Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-teal-500 font-mono cursor-pointer"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500">Attendance Status</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value)}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="Present">Present (On-Time)</option>
                    <option value="Late">Late Check-In</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Leave">On Leave</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500">Check-In Time</label>
                  <input
                    type="text"
                    value={manualCheckIn}
                    onChange={(e) => setManualCheckIn(e.target.value)}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none font-mono text-center focus:border-teal-500"
                    placeholder="e.g. 09:00 AM"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500">Check-Out Time</label>
                  <input
                    type="text"
                    value={manualCheckOut}
                    onChange={(e) => setManualCheckOut(e.target.value)}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none font-mono text-center focus:border-teal-500"
                    placeholder="e.g. 06:00 PM"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-slate-500">Assigned Site / Plant</label>
                <select
                  value={manualSite}
                  onChange={(e) => setManualSite(e.target.value)}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="Pune Head Office">Pune Head Office</option>
                  <option value="Mumbai Assembly Plant">Mumbai Assembly Plant</option>
                  <option value="Noida Unit B">Noida Unit B</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-slate-500">Remarks / Approval Reason</label>
                <textarea
                  value={manualRemarks}
                  onChange={(e) => setManualRemarks(e.target.value)}
                  placeholder="Reason for manual check-in correction..."
                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl outline-none resize-none h-20 focus:border-teal-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn bg-teal-600 hover:bg-teal-500 text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all mt-2 w-full flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Approve Shift Correction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Log Modal */}
      {showEditModal && editRecord && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-[460px] overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-5 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-teal-400 uppercase tracking-widest">Edit Attendance Log</h4>
              <button onClick={() => setShowEditModal(false)} className="w-[30px] h-[30px] rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setLoading(true);
                  const res = await api.logAttendance({
                    _id: editRecord._id,
                    worker: editRecord.worker?._id || editRecord.worker,
                    date: editRecord.date,
                    checkInTime: editRecord.checkInTime,
                    checkOutTime: editRecord.checkOutTime,
                    workingHours: parseFloat(editRecord.workingHours || 0),
                    status: editRecord.status,
                    site: editRecord.site,
                    remarks: editRecord.remarks || 'Updated by admin'
                  });

                  if (res.success) {
                    showToast('Log updated successfully!', 'success');
                    setShowEditModal(false);
                    fetchHistoryData();
                    fetchData();
                  } else {
                    showToast(res.error || 'Update failed', 'error');
                  }
                } catch (err) {
                  console.error(err);
                  showToast('Connection to server refused.', 'error');
                } finally {
                  setLoading(false);
                }
              }}
              className="p-6 flex flex-col gap-4 text-xs font-bold text-slate-300"
            >
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">person</span>
                <span className="text-white">{editRecord.employeeName || editRecord.worker?.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500">Status</label>
                  <select
                    value={editRecord.status}
                    onChange={(e) => setEditRecord({ ...editRecord, status: e.target.value })}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Leave">Leave</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500">Working Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editRecord.workingHours || 0}
                    onChange={(e) => setEditRecord({ ...editRecord, workingHours: e.target.value })}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none font-mono text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500">Check-In</label>
                  <input
                    type="text"
                    value={editRecord.checkInTime || '-'}
                    onChange={(e) => setEditRecord({ ...editRecord, checkInTime: e.target.value })}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none font-mono text-center"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500">Check-Out</label>
                  <input
                    type="text"
                    value={editRecord.checkOutTime || '-'}
                    onChange={(e) => setEditRecord({ ...editRecord, checkOutTime: e.target.value })}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none font-mono text-center"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-slate-500">Site Location</label>
                <select
                  value={editRecord.site}
                  onChange={(e) => setEditRecord({ ...editRecord, site: e.target.value })}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl outline-none cursor-pointer"
                >
                  <option value="Pune Head Office">Pune Head Office</option>
                  <option value="Mumbai Assembly Plant">Mumbai Assembly Plant</option>
                  <option value="Noida Unit B">Noida Unit B</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn bg-teal-600 hover:bg-teal-500 text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all mt-2 w-full shadow-md cursor-pointer"
              >
                Save Attendance Modifications
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
