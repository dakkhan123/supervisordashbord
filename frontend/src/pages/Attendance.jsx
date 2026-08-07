import { useState, useEffect } from 'react';
import { api } from '../services/api';

const Attendance = ({ showToast }) => {
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [allHistory, setAllHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);

  // Current logged in user profile
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

  // Manual record modal state
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

  // Status Badge Styling matching Task Allocation theme
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Present': return 'bg-primary/10 text-primary border border-primary/20';
      case 'Late': return 'bg-amber-500/10 text-amber-700 border border-amber-500/20';
      case 'Half Day': return 'bg-orange-500/10 text-orange-700 border border-orange-500/20';
      case 'Absent': return 'bg-error/10 text-error border border-error/20';
      case 'Leave': return 'bg-blue-500/10 text-blue-700 border border-blue-500/20';
      case 'Holiday': return 'bg-purple-500/10 text-purple-700 border border-purple-500/20';
      default: return 'bg-surface-low text-outline border border-outline-variant';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
            body { font-family: sans-serif; padding: 25px; color: #0b1c30; background-color: #fff; }
            h1 { color: #006a6a; border-bottom: 2px solid #006a6a; padding-bottom: 10px; margin-bottom: 5px; }
            .meta { font-size: 11px; color: #6d7a79; margin-bottom: 20px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #bcc9c8; padding: 8px 12px; text-align: left; font-size: 11px; }
            th { background-color: #eff4ff; font-weight: bold; text-transform: uppercase; color: #3d4949; }
            .badge { font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 9px; text-transform: uppercase; }
            .Present { background: #e6f4f4; color: #006a6a; }
            .Absent { background: #ffdad6; color: #ba1a1a; }
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

  // Submit manual log
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
    <div className="flex flex-col gap-6 text-on-surface font-body animate-fade-in">
      {/* Page Header (Matches Task Allocation Header) */}
      <div className="flex items-start justify-between flex-wrap gap-4 border-b border-outline-variant pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[32px]">co_present</span>
            Attendance Registry
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Monitor and manage daily check-ins, geofencing coordinates, and export audit reports.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-3">
          {isUserAuthorized && (
            <button
              onClick={() => setShowManualModal(true)}
              className="btn bg-primary hover:bg-primary-container text-white font-bold py-2.5 px-4 rounded-sm text-xs flex items-center gap-1.5 transition-all shadow-sm uppercase tracking-wider cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_task</span>
              Manual Correction
            </button>
          )}

          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-bold bg-surface-lowest border border-outline-variant px-3.5 py-2 rounded-sm shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="outline-none text-on-surface bg-transparent cursor-pointer font-mono font-bold"
            />
          </div>
        </div>
      </div>

      {/* Tabs Menu Panel (Matching clean white pill layout) */}
      <div className="flex bg-surface-lowest p-1.5 border border-outline-variant rounded-md shadow-sm w-fit gap-1 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Console Dashboard', icon: 'analytics' },
          { id: 'history', label: 'Shift Logs History', icon: 'receipt_long' },
          { id: 'reports', label: 'HR Summaries', icon: 'summarize' },
          { id: 'admin', label: 'Shift Timing / Holidays', icon: 'settings_timelapse' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === t.id 
                ? 'bg-primary/10 text-primary border border-primary/20 shadow-none' 
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-low border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading Overlay */}
      {loading && activeTab === 'dashboard' ? (
        <div className="p-20 text-center flex flex-col items-center justify-center gap-4 bg-surface-lowest border border-outline-variant rounded-md shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-xs text-outline font-bold uppercase tracking-wider">Syncing attendance sheets...</p>
        </div>
      ) : error ? (
        <div className="p-16 text-center flex flex-col items-center justify-center gap-4 bg-surface-lowest border border-outline-variant rounded-md shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-error">error</span>
          <p className="text-sm font-bold text-on-surface">Database Sync Failed</p>
          <p className="text-xs text-outline">{error}</p>
          <button onClick={fetchData} className="btn bg-primary text-white text-xs px-4 py-2 rounded-sm hover:bg-primary-container">Retry Sync</button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* 1. CONSOLE DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6">
              
              {/* Distribution Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Marked Compliance Meter</span>
                    <span className="text-xs font-extrabold text-primary">{compliancePct}% Logs Recorded</span>
                  </div>
                  <div className="w-full bg-surface-low h-3 rounded-full overflow-hidden border border-outline-variant">
                    <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${compliancePct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
                    <span>Logged Records: {loggedCount} / {activeWorkerCount} workers</span>
                    <span className="text-amber-600 font-bold">{activeWorkerCount - loggedCount} Pending Clock-ins</span>
                  </div>
                </div>

                <div className="bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm flex flex-col gap-4">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Attendance Status Distribution Today</span>
                  <div className="w-full h-3.5 bg-surface-low rounded-full overflow-hidden flex border border-outline-variant">
                    {presentCount > 0 && (
                      <div className="bg-primary h-full" style={{ width: `${((presentCount - lateCountToday) / (loggedCount || 1)) * 100}%` }} title={`On-Time Present`} />
                    )}
                    {lateCountToday > 0 && (
                      <div className="bg-amber-500 h-full" style={{ width: `${(lateCountToday / (loggedCount || 1)) * 100}%` }} title={`Late Arrivals`} />
                    )}
                    {absentCount > 0 && (
                      <div className="bg-error h-full" style={{ width: `${(absentCount / (loggedCount || 1)) * 100}%` }} title={`Absent`} />
                    )}
                    {leaveCount > 0 && (
                      <div className="bg-blue-500 h-full" style={{ width: `${(leaveCount / (loggedCount || 1)) * 100}%` }} title={`On Leave`} />
                    )}
                    {loggedCount === 0 && (
                      <div className="w-full h-full bg-outline-variant/40" title="No logs marked" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant flex-wrap gap-2">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary block"></span>On-Time: {presentCount - lateCountToday}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>Late: {lateCountToday}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-error block"></span>Absent: {absentCount}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 block"></span>Leave: {leaveCount}</span>
                  </div>
                </div>
              </div>

              {/* Interactive KPI Cards (Matching Task Allocation 4-tile style in Image 2) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Active Staff Registry */}
                <div className="bg-surface-lowest border border-outline-variant p-4 rounded-md shadow-sm flex flex-col justify-between min-h-[105px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Active Staff Registry</span>
                    <div className="w-8 h-8 rounded-lg bg-surface-variant/40 flex items-center justify-center text-outline">
                      <span className="material-symbols-outlined icon-sm">badge</span>
                    </div>
                  </div>
                  <div className="text-[24px] font-extrabold text-on-surface leading-none">{activeWorkerCount}</div>
                  <span className="text-[10px] text-outline font-semibold uppercase mt-1">Marked in operations</span>
                </div>

                {/* Marked Present */}
                <div className="bg-surface-lowest border border-outline-variant p-4 rounded-md shadow-sm flex flex-col justify-between min-h-[105px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Marked Present</span>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined icon-sm">check_circle</span>
                    </div>
                  </div>
                  <div className="text-[24px] font-extrabold text-primary leading-none">{presentCount}</div>
                  <span className="text-[10px] text-primary font-bold uppercase mt-1">Checked In today</span>
                </div>

                {/* Late / Absent */}
                <div className="bg-surface-lowest border border-outline-variant p-4 rounded-md shadow-sm flex flex-col justify-between min-h-[105px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Late / Absent</span>
                    <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center text-error">
                      <span className="material-symbols-outlined icon-sm">warning</span>
                    </div>
                  </div>
                  <div className="text-[24px] font-extrabold text-error leading-none">
                    {lateCountToday} <span className="text-sm font-bold text-error/80">/ {absentCount}</span>
                  </div>
                  <span className="text-[10px] text-error font-bold uppercase mt-1">Logged warnings</span>
                </div>

                {/* Daily Presence Ratio */}
                <div className="bg-surface-lowest border border-outline-variant p-4 rounded-md shadow-sm flex flex-col justify-between min-h-[105px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Daily Presence Ratio</span>
                    <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined icon-sm">analytics</span>
                    </div>
                  </div>
                  <div className="text-[24px] font-extrabold text-tertiary leading-none">{presenceRate}%</div>
                  <span className="text-[10px] text-tertiary font-bold uppercase mt-1">Compliance Score</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. SHIFT LOGS HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-4">
              
              {/* Search & Filters Panel */}
              <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full lg:flex-1">
                  
                  {/* Name Search */}
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                    <input
                      type="text"
                      placeholder="Search name/employee ID..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs text-on-surface outline-none focus:border-primary transition-all font-medium"
                    />
                  </div>

                  {/* Status filter */}
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    className="py-2 px-3 bg-surface-low border border-outline-variant rounded-sm text-xs text-on-surface outline-none focus:border-primary cursor-pointer font-bold"
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
                    className="py-2 px-3 bg-surface-low border border-outline-variant rounded-sm text-xs text-on-surface outline-none focus:border-primary cursor-pointer font-bold"
                  >
                    <option value="All">All Locations / Sites</option>
                    <option value="Pune Head Office">Pune Head Office</option>
                    <option value="Mumbai Assembly Plant">Mumbai Assembly Plant</option>
                    <option value="Noida Unit B">Noida Unit B</option>
                  </select>

                  {/* Date Picker Filter */}
                  <div className="flex items-center gap-2 bg-surface-low border border-outline-variant px-3 rounded-sm">
                    <span className="material-symbols-outlined text-[16px] text-outline">event</span>
                    <input
                      type="date"
                      value={historyDateFilter}
                      onChange={(e) => setHistoryDateFilter(e.target.value)}
                      className="outline-none text-xs text-on-surface bg-transparent cursor-pointer py-1.5 w-full font-mono font-bold"
                    />
                    {historyDateFilter && (
                      <button onClick={() => setHistoryDateFilter('')} className="text-outline hover:text-error">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Print / Export Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handlePrintLogs}
                    className="btn border border-outline-variant hover:bg-surface-low text-on-surface-variant text-xs font-bold px-4 py-2 rounded-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">print</span>
                    Print
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold px-4 py-2 rounded-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm uppercase tracking-wider"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Export CSV
                  </button>
                </div>
              </div>

              {/* History Table Container (Matches Task Allocation Table) */}
              <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
                {historyLoading ? (
                  <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-xs text-outline font-bold uppercase tracking-wider">Syncing timeline logs...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[550px] overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface-low border-b border-outline-variant sticky top-0 z-[5]">
                          <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Date</th>
                          <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Employee Details</th>
                          <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Logs (In / Out)</th>
                          <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Shift Hours</th>
                          <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">GPS Geofence</th>
                          <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Status</th>
                          {isUserAuthorized && <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map(h => (
                          <tr key={h._id} className="border-b border-outline-variant/30 hover:bg-surface-low transition-colors duration-150">
                            <td className="p-3.5 font-bold text-on-surface whitespace-nowrap">
                              {formatDate(h.date)}
                            </td>
                            <td className="p-3.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-on-surface">{h.employeeName || h.worker?.name || 'Unknown Staff'}</span>
                                <span className="text-[11px] text-outline font-mono">
                                  {h.employeeId || h.worker?.employeeId || 'N/A'} · {h.role || h.worker?.role || 'Worker'}
                                </span>
                              </div>
                            </td>
                            <td className="p-3.5 font-mono font-semibold text-on-surface-variant">
                              <div className="flex flex-col text-[11px] gap-0.5">
                                <span>In: <span className="text-primary font-bold">{h.checkInTime || '-'}</span></span>
                                <span>Out: <span className="text-error font-bold">{h.checkOutTime || '-'}</span></span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-on-surface">{h.workingHours ? `${h.workingHours} hrs` : '--'}</span>
                                {h.overtimeHours > 0 && <span className="text-[10px] text-primary font-bold">OT: +{h.overtimeHours} hrs</span>}
                              </div>
                            </td>
                            <td className="p-3.5">
                              {h.latitude && h.longitude ? (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                                  title="View Check-In coordinates on Google Maps"
                                >
                                  <span className="material-symbols-outlined text-[14px]">map</span>
                                  {h.site || 'Pune office'}
                                </a>
                              ) : (
                                <span className="text-outline">Manual Entry</span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${getStatusBadgeClass(h.status)}`}>
                                {h.status}
                              </span>
                            </td>
                            {isUserAuthorized && (
                              <td className="p-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedRecord(h)}
                                    className="w-7 h-7 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                                    title="View Details"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                                  </button>
                                  {(() => {
                                    const roleStr = (h.role || h.worker?.role || h.worker?.user?.role || '').toLowerCase();
                                    const isTargetSupervisor = roleStr === 'supervisor' || roleStr === 'admin' || roleStr === 'owner' || roleStr === 'manager';
                                    const isSelf = h.worker?.user === currentUser?.id || h.user === currentUser?.id;
                                    
                                    if (isTargetSupervisor || isSelf) {
                                      return (
                                        <span className="text-[10px] font-bold text-outline uppercase bg-surface-low px-2 py-0.5 rounded border border-outline-variant/40" title="Supervisor attendance is Read-Only">
                                          Read-Only
                                        </span>
                                      );
                                    }
                                    return (
                                      <>
                                        <button
                                          onClick={() => {
                                            setEditRecord(h);
                                            setShowEditModal(true);
                                          }}
                                          className="w-7 h-7 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                                          title="Edit Log"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">edit</span>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRecord(h._id)}
                                          className="w-7 h-7 rounded hover:bg-error/10 text-error flex items-center justify-center transition-colors cursor-pointer"
                                          title="Delete Log"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                      </>
                                    );
                                  })()}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                        {filteredHistory.length === 0 && (
                          <tr>
                            <td colSpan="7" className="p-16 text-center text-outline font-semibold italic">
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
              <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="relative w-full md:max-w-[280px]">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                  <input
                    type="text"
                    placeholder="Search by worker name..."
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs text-on-surface outline-none focus:border-primary transition-all font-medium"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-outline uppercase">Target Month:</span>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(parseInt(e.target.value, 10))}
                    className="py-1.5 px-3 bg-surface-low border border-outline-variant rounded-sm text-xs text-on-surface font-bold outline-none cursor-pointer"
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
                      className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm flex flex-col justify-between gap-4 cursor-pointer hover:border-primary hover:shadow-md transition-all duration-150"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
                          {w.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-on-surface truncate">{w.name}</h4>
                          <p className="text-[11px] text-outline mt-0.5">
                            {w.role} · ID: <span className="font-mono">{w.employeeId || 'N/A'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5 text-center text-on-surface text-[11px] font-semibold py-2.5 bg-surface-low border border-outline-variant/40 rounded-sm">
                        <div>
                          <p className="text-primary font-black">{pCount}</p>
                          <p className="text-[8px] uppercase tracking-wider text-outline">Present</p>
                        </div>
                        <div>
                          <p className="text-amber-600 font-black">{lCount}</p>
                          <p className="text-[8px] uppercase tracking-wider text-outline">Late</p>
                        </div>
                        <div>
                          <p className="text-orange-600 font-black">{hCount}</p>
                          <p className="text-[8px] uppercase tracking-wider text-outline">Half</p>
                        </div>
                        <div>
                          <p className="text-blue-600 font-black">{leaveCount}</p>
                          <p className="text-[8px] uppercase tracking-wider text-outline">Leave</p>
                        </div>
                        <div>
                          <p className="text-error font-black">{aCount}</p>
                          <p className="text-[8px] uppercase tracking-wider text-outline">Absent</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[9px] font-bold text-outline uppercase tracking-wider">
                          <span>Shift Presence Rate</span>
                          <span className={`font-bold ${rate >= 80 ? 'text-primary' : 'text-error'}`}>{rate}%</span>
                        </div>
                        <div className="w-full bg-surface-low h-2 rounded-full overflow-hidden border border-outline-variant/60">
                          <div className={`h-full rounded-full transition-all duration-300 ${rate >= 80 ? 'bg-primary' : 'bg-error'}`} style={{ width: `${rate}%` }} />
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
              <div className="bg-surface-lowest border border-outline-variant rounded-md p-6 flex flex-col gap-4 shadow-sm">
                <h3 className="text-base font-extrabold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
                  Office Shift Schedule Rules
                </h3>
                <p className="text-xs text-outline font-medium">
                  Configure default operational shift window timings and grace limits for punctuality audits.
                </p>

                <div className="flex flex-col gap-4 border-t border-outline-variant pt-4 mt-1 font-semibold text-xs text-on-surface">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-outline uppercase tracking-wider">Shift Check-In Start</label>
                      <input
                        type="text"
                        value={shiftTimings.start}
                        onChange={(e) => setShiftTimings({ ...shiftTimings, start: e.target.value })}
                        className="p-2.5 bg-surface-low border border-outline-variant rounded-sm outline-none font-mono text-center text-primary font-bold focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-outline uppercase tracking-wider">Shift Checkout End</label>
                      <input
                        type="text"
                        value={shiftTimings.end}
                        onChange={(e) => setShiftTimings({ ...shiftTimings, end: e.target.value })}
                        className="p-2.5 bg-surface-low border border-outline-variant rounded-sm outline-none font-mono text-center text-error font-bold focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-outline uppercase tracking-wider">Late Arrival Grace Threshold (Minutes)</label>
                    <input
                      type="number"
                      value={shiftTimings.grace}
                      onChange={(e) => setShiftTimings({ ...shiftTimings, grace: parseInt(e.target.value, 10) })}
                      className="p-2.5 bg-surface-low border border-outline-variant rounded-sm outline-none font-mono text-center focus:border-primary"
                    />
                  </div>

                  <button
                    onClick={() => showToast('Operational shift timings updated successfully', 'success')}
                    className="btn bg-primary hover:bg-primary-container text-white font-bold py-2.5 px-4 rounded-sm text-xs uppercase tracking-wider transition-all mt-2 w-full shadow-sm cursor-pointer"
                  >
                    Save Timing Configurations
                  </button>
                </div>
              </div>

              {/* Holidays Manager */}
              <div className="bg-surface-lowest border border-outline-variant rounded-md p-6 flex flex-col gap-4 shadow-sm">
                <h3 className="text-base font-extrabold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">holiday_village</span>
                  Company Holidays Calendar
                </h3>
                <p className="text-xs text-outline font-medium">
                  Add or edit annual office holidays that automatically bypass worker logging checks.
                </p>

                {/* Holiday list */}
                <div className="flex-1 flex flex-col gap-2 max-h-[220px] overflow-y-auto scrollbar-thin pr-1 border-t border-outline-variant pt-3">
                  {holidays.map((h, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-surface-low border border-outline-variant rounded-sm text-xs">
                      <div>
                        <p className="font-bold text-on-surface">{h.name}</p>
                        <p className="text-[10px] text-outline mt-0.5 font-mono">{formatDate(h.date)}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveHoliday(idx)}
                        className="p-1 rounded text-error hover:bg-error/10 cursor-pointer"
                        title="Remove Holiday"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add holiday form */}
                <form onSubmit={handleAddHoliday} className="grid grid-cols-2 gap-3 mt-2 border-t border-outline-variant pt-3">
                  <input
                    type="text"
                    placeholder="Holiday title..."
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    className="p-2 px-3.5 bg-surface-low border border-outline-variant rounded-sm text-xs outline-none focus:border-primary font-semibold text-on-surface"
                    required
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="p-2 px-2 bg-surface-low border border-outline-variant rounded-sm text-xs outline-none focus:border-primary font-mono cursor-pointer flex-1 text-on-surface"
                      required
                    />
                    <button
                      type="submit"
                      className="btn bg-primary hover:bg-primary-container text-white font-bold p-2.5 rounded-sm cursor-pointer"
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

      {/* Detail view Modal Overlay */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-lowest border border-outline-variant rounded-lg w-full max-w-[480px] overflow-hidden shadow-xl animate-scale-up">
            <div className="px-6 py-4 bg-surface-low border-b border-outline-variant flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-primary uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary">badge</span>
                Attendance Log Details
              </h4>
              <button onClick={() => setSelectedRecord(null)} className="w-7 h-7 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs text-on-surface font-semibold">
              <div className="flex items-center gap-3 p-3 bg-surface-low border border-outline-variant rounded-sm">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-primary text-base">
                  {(selectedRecord.employeeName || selectedRecord.worker?.name || 'S').charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-on-surface">{selectedRecord.employeeName || selectedRecord.worker?.name}</h4>
                  <p className="text-[11px] text-outline mt-0.5">{selectedRecord.role || 'Staff'} · {selectedRecord.department}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-outline-variant pt-4">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-outline">Log Date</p>
                  <p className="text-on-surface mt-0.5 font-mono font-bold">{formatDate(selectedRecord.date)}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-outline">Status Type</p>
                  <p className="mt-0.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${getStatusBadgeClass(selectedRecord.status)}`}>
                      {selectedRecord.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-outline">Shift Check-In</p>
                  <p className="text-on-surface mt-0.5 font-mono">{selectedRecord.checkInTime || '-'}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-outline">Shift Checkout</p>
                  <p className="text-on-surface mt-0.5 font-mono">{selectedRecord.checkOutTime || '-'}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-outline">Total Hours</p>
                  <p className="text-on-surface mt-0.5">{selectedRecord.workingHours ? `${selectedRecord.workingHours} hrs` : '-'}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-outline">Assigned Site</p>
                  <p className="text-on-surface mt-0.5">{selectedRecord.site || 'Pune Head Office'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] uppercase tracking-wider text-outline">GPS Address Logged</p>
                  <p className="text-on-surface-variant mt-1 leading-relaxed bg-surface-low p-2.5 border border-outline-variant rounded-sm">
                    {selectedRecord.address || 'No GPS coordinates logs available for manual entry.'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] uppercase tracking-wider text-outline">Client Metadata</p>
                  <p className="text-outline mt-1 font-mono text-[10px]">
                    IP Address: {selectedRecord.ipAddress || 'N/A'} · Device: {selectedRecord.device || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-surface-low border-t border-outline-variant flex justify-end">
              <button onClick={() => setSelectedRecord(null)} className="px-4 py-2 border border-outline-variant rounded-sm hover:bg-surface-container cursor-pointer text-xs font-bold transition-all text-on-surface">
                Close details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HR Detailed Profile View Overlay */}
      {selectedWorkerForProfile && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-lowest border border-outline-variant rounded-lg w-full max-w-[780px] max-h-[90vh] overflow-y-auto shadow-xl flex flex-col animate-scale-up text-on-surface">
            
            <div className="px-6 py-4 bg-surface-low border-b border-outline-variant flex items-center justify-between sticky top-0 z-[10]">
              <h4 className="font-extrabold text-sm text-primary uppercase tracking-wider">Employee HR Performance Sheet</h4>
              <button onClick={() => setSelectedWorkerForProfile(null)} className="w-7 h-7 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                <div className="md:col-span-5 bg-surface-low p-5 rounded-md border border-outline-variant flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-primary text-lg">
                    {selectedWorkerForProfile.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-on-surface">{selectedWorkerForProfile.name}</h3>
                    <p className="text-[11px] text-primary font-bold uppercase tracking-wider mt-1">{selectedWorkerForProfile.role}</p>
                    <p className="text-[10px] text-outline mt-2 font-mono bg-surface-lowest border border-outline-variant px-2 py-0.5 rounded select-all">
                      {selectedWorkerForProfile.employeeId || 'No ID Record'}
                    </p>
                  </div>
                </div>

                <div className="md:col-span-7 grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="col-span-2 bg-primary/10 border border-primary/20 rounded-md p-4">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Presence Percentage</span>
                    <div className="flex items-end justify-between mt-2.5">
                      <div className="text-3xl font-black text-primary leading-none">
                        {(() => {
                          const wPresentCount = workerHistory.filter(h => h.status === 'Present' || h.status === 'Late').length;
                          const wAbsentCount = workerHistory.filter(h => h.status === 'Absent').length;
                          const wLeaveCount = workerHistory.filter(h => h.status === 'Leave').length;
                          const wTotal = wPresentCount + wAbsentCount + wLeaveCount;
                          return wTotal > 0 ? Math.round((wPresentCount / wTotal) * 100) : 0;
                        })()}%
                      </div>
                      <span className="text-[10px] text-outline font-bold uppercase">Based on logged logs</span>
                    </div>
                  </div>

                  <div className="bg-surface-low border border-outline-variant rounded-md p-4">
                    <span className="text-[9px] font-bold text-outline uppercase tracking-wider">Present (On-Time)</span>
                    <div className="text-2xl font-black text-primary mt-2 leading-none">
                      {workerHistory.filter(h => h.status === 'Present').length}
                    </div>
                  </div>

                  <div className="bg-surface-low border border-outline-variant rounded-md p-4">
                    <span className="text-[9px] font-bold text-outline uppercase tracking-wider">Late Logs</span>
                    <div className="text-2xl font-black text-amber-600 mt-2 leading-none">
                      {workerHistory.filter(h => h.status === 'Late').length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Table */}
              <div className="bg-surface-lowest border border-outline-variant rounded-md overflow-hidden flex flex-col">
                {workerHistoryLoading ? (
                  <div className="p-10 text-center flex flex-col items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <p className="text-[10px] text-outline font-bold">Syncing HR DB records...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[220px] overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface-low border-b border-outline-variant sticky top-0 z-[5]">
                          <th className="p-3 text-[9px] font-bold text-outline uppercase">Date</th>
                          <th className="p-3 text-[9px] font-bold text-outline uppercase">Status</th>
                          <th className="p-3 text-[9px] font-bold text-outline uppercase">Timing (In/Out)</th>
                          <th className="p-3 text-[9px] font-bold text-outline uppercase">Hours</th>
                          <th className="p-3 text-[9px] font-bold text-outline uppercase">Site Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workerHistory.map(h => (
                          <tr key={h._id} className="border-b border-outline-variant/30 hover:bg-surface-low/50">
                            <td className="p-3 font-bold text-on-surface">
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
                            <td className="p-3 font-semibold text-on-surface">
                              {h.workingHours ? `${h.workingHours} hrs` : '-'}
                            </td>
                            <td className="p-3 text-outline font-semibold">{h.site || 'Pune'}</td>
                          </tr>
                        ))}
                        {workerHistory.length === 0 && (
                          <tr>
                            <td colSpan="5" className="p-8 text-center text-outline font-bold italic">
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

            <div className="px-6 py-3 bg-surface-low border-t border-outline-variant flex justify-end sticky bottom-0 z-[10]">
              <button onClick={() => setSelectedWorkerForProfile(null)} className="px-4 py-2 border border-outline-variant rounded-sm hover:bg-surface-container cursor-pointer text-xs font-bold text-on-surface">
                Close HR Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Check-in Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-lowest border border-outline-variant rounded-lg w-full max-w-[500px] overflow-hidden shadow-xl animate-scale-up text-on-surface">
            <div className="px-6 py-4 bg-surface-low border-b border-outline-variant flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-primary uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary">bookmark_added</span>
                Manual Shift Entry
              </h4>
              <button onClick={() => setShowManualModal(false)} className="w-7 h-7 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddManualLog} className="p-6 flex flex-col gap-4 text-xs font-bold text-on-surface-variant">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-wider text-outline">Select Employee</label>
                <select
                  value={manualWorker}
                  onChange={(e) => setManualWorker(e.target.value)}
                  className="p-3 bg-surface-low border border-outline-variant rounded-sm outline-none focus:border-primary font-bold cursor-pointer text-on-surface"
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
                  <label className="text-[9px] uppercase tracking-wider text-outline">Log Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="p-2.5 bg-surface-low border border-outline-variant rounded-sm outline-none focus:border-primary font-mono cursor-pointer text-on-surface"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-outline">Attendance Status</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value)}
                    className="p-2.5 bg-surface-low border border-outline-variant rounded-sm outline-none focus:border-primary cursor-pointer text-on-surface"
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
                  <label className="text-[9px] uppercase tracking-wider text-outline">Check-In Time</label>
                  <input
                    type="text"
                    value={manualCheckIn}
                    onChange={(e) => setManualCheckIn(e.target.value)}
                    className="p-2.5 bg-surface-low border border-outline-variant rounded-sm outline-none font-mono text-center focus:border-primary text-on-surface"
                    placeholder="e.g. 09:00 AM"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-outline">Check-Out Time</label>
                  <input
                    type="text"
                    value={manualCheckOut}
                    onChange={(e) => setManualCheckOut(e.target.value)}
                    className="p-2.5 bg-surface-low border border-outline-variant rounded-sm outline-none font-mono text-center focus:border-primary text-on-surface"
                    placeholder="e.g. 06:00 PM"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-wider text-outline">Assigned Site / Plant</label>
                <select
                  value={manualSite}
                  onChange={(e) => setManualSite(e.target.value)}
                  className="p-3 bg-surface-low border border-outline-variant rounded-sm outline-none focus:border-primary cursor-pointer text-on-surface"
                >
                  <option value="Pune Head Office">Pune Head Office</option>
                  <option value="Mumbai Assembly Plant">Mumbai Assembly Plant</option>
                  <option value="Noida Unit B">Noida Unit B</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-wider text-outline">Remarks / Approval Reason</label>
                <textarea
                  value={manualRemarks}
                  onChange={(e) => setManualRemarks(e.target.value)}
                  placeholder="Reason for manual check-in correction..."
                  className="p-3 bg-surface-low border border-outline-variant rounded-sm outline-none resize-none h-20 focus:border-primary font-medium text-on-surface"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn bg-primary hover:bg-primary-container text-white font-black py-3 px-4 rounded-sm text-xs uppercase tracking-wider transition-all mt-2 w-full flex items-center justify-center gap-2 shadow-sm cursor-pointer"
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
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-lowest border border-outline-variant rounded-lg w-full max-w-[460px] overflow-hidden shadow-xl animate-scale-up text-on-surface">
            <div className="px-6 py-4 bg-surface-low border-b border-outline-variant flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-primary uppercase tracking-wider">Edit Attendance Log</h4>
              <button onClick={() => setShowEditModal(false)} className="w-7 h-7 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer">
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
              className="p-6 flex flex-col gap-4 text-xs font-bold text-on-surface-variant"
            >
              <div className="p-3 bg-surface-low border border-outline-variant rounded-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                <span className="text-on-surface">{editRecord.employeeName || editRecord.worker?.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-outline">Status</label>
                  <select
                    value={editRecord.status}
                    onChange={(e) => setEditRecord({ ...editRecord, status: e.target.value })}
                    className="p-2.5 bg-surface-low border border-outline-variant rounded-sm outline-none cursor-pointer text-on-surface"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Leave">Leave</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-outline">Working Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editRecord.workingHours || 0}
                    onChange={(e) => setEditRecord({ ...editRecord, workingHours: e.target.value })}
                    className="p-2.5 bg-surface-low border border-outline-variant rounded-sm outline-none font-mono text-center text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-outline">Check-In</label>
                  <input
                    type="text"
                    value={editRecord.checkInTime || '-'}
                    onChange={(e) => setEditRecord({ ...editRecord, checkInTime: e.target.value })}
                    className="p-2.5 bg-surface-low border border-outline-variant rounded-sm outline-none font-mono text-center text-on-surface"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-outline">Check-Out</label>
                  <input
                    type="text"
                    value={editRecord.checkOutTime || '-'}
                    onChange={(e) => setEditRecord({ ...editRecord, checkOutTime: e.target.value })}
                    className="p-2.5 bg-surface-low border border-outline-variant rounded-sm outline-none font-mono text-center text-on-surface"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-wider text-outline">Site Location</label>
                <select
                  value={editRecord.site}
                  onChange={(e) => setEditRecord({ ...editRecord, site: e.target.value })}
                  className="p-3 bg-surface-low border border-outline-variant rounded-sm outline-none cursor-pointer text-on-surface"
                >
                  <option value="Pune Head Office">Pune Head Office</option>
                  <option value="Mumbai Assembly Plant">Mumbai Assembly Plant</option>
                  <option value="Noida Unit B">Noida Unit B</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn bg-primary hover:bg-primary-container text-white font-black py-3 px-4 rounded-sm text-xs uppercase tracking-wider transition-all mt-2 w-full shadow-sm cursor-pointer"
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
