import { useState, useEffect } from 'react';
import { api } from '../services/api';

const Attendance = ({ showToast }) => {
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [allHistory, setAllHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Tab state: 'dashboard', 'logger', 'history', 'reports'
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'reports' || activeTab === 'dashboard') {
      fetchHistoryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleLogAttendance = async (workerId, status) => {
    try {
      const res = await api.logAttendance({
        worker: workerId,
        date: selectedDate,
        status
      });

      if (res.success) {
        showToast('Attendance logged successfully', 'success');
        // Refresh logs
        const updatedRes = await api.getAttendance({ date: selectedDate });
        if (updatedRes.success) {
          setAttendance(updatedRes.data);
        }
        if (activeTab === 'dashboard') {
          fetchHistoryData();
        }
      } else {
        showToast(res.error || 'Failed to update attendance', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to server', 'error');
    }
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm('Are you sure you want to delete this historical attendance entry?')) return;
    try {
      const res = await api.deleteAttendance(id);
      if (res.success) {
        showToast('Attendance record deleted successfully', 'success');
        fetchHistoryData();
        fetchData();
      } else {
        showToast(res.error || 'Failed to delete record', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to server', 'error');
    }
  };

  // Resolve status for each worker today
  const getWorkerStatus = (workerId) => {
    const record = attendance.find(a => a.worker?._id === workerId || a.worker === workerId);
    return record ? record.status : 'No Record';
  };

  // Calculations for today
  const activeWorkerCount = workers.length;
  const presentCount = workers.filter(w => getWorkerStatus(w._id) === 'Present').length;
  const absentCount = workers.filter(w => getWorkerStatus(w._id) === 'Absent').length;
  const leaveCount = workers.filter(w => getWorkerStatus(w._id) === 'Leave').length;
  const loggedCount = presentCount + absentCount + leaveCount;
  const presenceRate = loggedCount > 0 ? Math.round((presentCount / loggedCount) * 100) : 0;
  const compliancePct = activeWorkerCount > 0 ? Math.round((loggedCount / activeWorkerCount) * 100) : 0;

  // Formatting classes
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Present': return 'bg-primary/10 text-primary border border-primary/20';
      case 'Absent': return 'bg-error/10 text-error border border-error/20';
      case 'Leave': return 'bg-secondary/10 text-secondary border border-secondary/20';
      default: return 'bg-surface-container text-outline border border-outline-variant/50';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Historical filtering
  const filteredHistory = allHistory.filter(h => {
    const wName = h.worker?.name || '';
    const matchSearch = !historySearch || wName.toLowerCase().includes(historySearch.toLowerCase());
    const matchStatus = historyStatusFilter === 'All' || h.status === historyStatusFilter;
    return matchSearch && matchStatus;
  });

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!workers.length) return showToast('No workers data to export', 'error');
    
    const headers = ['Worker Name', 'Role', 'Phone Number', 'Shifts Present', 'Shifts Absent', 'Shifts On Leave', 'Attendance Rate (%)'];
    const csvRows = [headers.join(',')];

    workers.forEach(w => {
      const wHistory = allHistory.filter(h => (h.worker?._id || h.worker) === w._id);
      const pCount = wHistory.filter(h => h.status === 'Present').length;
      const aCount = wHistory.filter(h => h.status === 'Absent').length;
      const lCount = wHistory.filter(h => h.status === 'Leave').length;
      const total = pCount + aCount + lCount;
      const rate = total > 0 ? Math.round((pCount / total) * 100) : 0;

      csvRows.push([
        `"${w.name}"`,
        `"${w.role}"`,
        `"${w.phone || 'N/A'}"`,
        pCount,
        aCount,
        lCount,
        rate
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Report_Export_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance report CSV download started', 'success');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Attendance Registry</h1>
          <p className="text-on-surface-variant text-sm">Monitor daily staff check-ins and log shifts · Unit Pune-A12</p>
        </div>

        {/* Date Picker (Shared for Logger/Dashboard context) */}
        <div className="flex items-center gap-2 text-xs text-outline font-semibold bg-surface-lowest border border-outline-variant p-2 rounded-sm shadow-sm">
          <span className="material-symbols-outlined icon-sm text-outline">calendar_month</span>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2 py-1 outline-none text-on-surface font-semibold bg-transparent cursor-pointer"
          />
        </div>
      </div>

      {/* Tabs Menu Panel */}
      <div className="flex border-b border-outline-variant/60">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
          { id: 'logger', label: 'Daily Attendance (Logger)', icon: 'how_to_reg' },
          { id: 'history', label: 'Attendance History', icon: 'history' },
          { id: 'reports', label: 'Attendance Reports', icon: 'summarize' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4.5 py-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === t.id 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-on-surface-variant hover:text-primary hover:bg-surface-low/30'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading & Error Overlays */}
      {loading && activeTab !== 'history' && activeTab !== 'reports' ? (
        <div className="p-20 text-center flex flex-col items-center justify-center gap-3 bg-surface-lowest border border-outline-variant rounded-md shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-xs text-outline font-bold uppercase tracking-wider">Loading attendance sheets...</p>
        </div>
      ) : error ? (
        <div className="p-16 text-center flex flex-col items-center justify-center gap-4 bg-surface-lowest border border-outline-variant rounded-md shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-error">error</span>
          <p className="text-sm font-bold text-on-surface">Failed to load Attendance</p>
          <p className="text-xs text-outline">{error}</p>
          <button onClick={fetchData} className="btn bg-primary text-white text-xs px-4 py-2 rounded-sm hover:bg-primary-container">Retry</button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* 1. DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6">
              {/* Compliance & Mark State Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Check-in Compliance meter */}
                <div className="bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Logging Compliance Meter</span>
                    <span className="text-xs font-extrabold text-primary uppercase">{compliancePct}% Marked</span>
                  </div>
                  <div className="w-full bg-surface-low border border-outline-variant/30 h-3 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${compliancePct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-on-surface-variant">
                    <span>Marked Logs: {loggedCount} / {activeWorkerCount} workers</span>
                    <span className="text-outline">{activeWorkerCount - loggedCount} Pending</span>
                  </div>
                </div>

                {/* Distribution Stacked Bar */}
                <div className="bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm flex flex-col gap-4">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Attendance Distribution Today</span>
                  <div className="w-full h-3.5 bg-surface-low rounded-full overflow-hidden flex border border-outline-variant/30">
                    {presentCount > 0 && (
                      <div className="bg-primary h-full" style={{ width: `${(presentCount / (loggedCount || 1)) * 100}%` }} title={`Present: ${presentCount}`} />
                    )}
                    {absentCount > 0 && (
                      <div className="bg-error h-full" style={{ width: `${(absentCount / (loggedCount || 1)) * 100}%` }} title={`Absent: ${absentCount}`} />
                    )}
                    {leaveCount > 0 && (
                      <div className="bg-secondary h-full" style={{ width: `${(leaveCount / (loggedCount || 1)) * 100}%` }} title={`On Leave: ${leaveCount}`} />
                    )}
                    {loggedCount === 0 && (
                      <div className="w-full h-full bg-surface-variant/20" title="No logs marked" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-outline">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary block"></span>Present: {presentCount}</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-error block"></span>Absent: {absentCount}</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-secondary block"></span>Leave: {leaveCount}</span>
                  </div>
                </div>
              </div>

              {/* KPI Summary Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm flex flex-col justify-between min-h-[105px]">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Total Active Staff</span>
                  <div className="text-[24px] font-extrabold text-on-surface leading-none mt-2">{activeWorkerCount}</div>
                  <span className="text-[10px] text-outline mt-1 font-semibold">Registered in Unit</span>
                </div>

                <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm flex flex-col justify-between min-h-[105px]">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Present Today</span>
                  <div className="text-[24px] font-extrabold text-primary leading-none mt-2">{presentCount}</div>
                  <span className="text-[10px] text-primary mt-1 font-bold uppercase">Marked in shift</span>
                </div>

                <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm flex flex-col justify-between min-h-[105px]">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Absent / Leave</span>
                  <div className="text-[24px] font-extrabold text-error leading-none mt-2">{absentCount} <span className="text-sm font-normal text-outline">/ {leaveCount} leave</span></div>
                  <span className="text-[10px] text-error mt-1 font-semibold">Absence records</span>
                </div>

                <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm flex flex-col justify-between min-h-[105px]">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Presence Rate</span>
                  <div className="text-[24px] font-extrabold text-primary leading-none mt-2">{presenceRate}%</div>
                  <span className="text-[10px] text-outline mt-1 font-semibold">Of marked logs today</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. DAILY LOGGER TAB */}
          {activeTab === 'logger' && (
            <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-low border-b border-outline-variant">
                      <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Worker Details</th>
                      <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Role</th>
                      <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Daily Status</th>
                      <th className="p-3.5 text-[11px] font-bold text-outline tracking-wider uppercase text-right">Quick Mark Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map(w => {
                      const status = getWorkerStatus(w._id);
                      return (
                        <tr key={w._id} className="border-b border-outline-variant/30 hover:bg-surface-low transition-colors duration-150">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20">
                                {w.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-on-surface text-[13px]">{w.name}</p>
                                <p className="text-[10px] text-outline mt-0.5">{w.phone || 'No phone record'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-semibold text-on-surface-variant">{w.role}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${getStatusBadgeClass(status)}`}>
                              {status === 'Present' ? 'Checked In' : status === 'Absent' ? 'Checked Out / Absent' : status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleLogAttendance(w._id, 'Present')}
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-sm border cursor-pointer transition-all ${status === 'Present' ? 'bg-primary border-primary text-white font-extrabold shadow-sm' : 'bg-surface-lowest text-on-surface-variant hover:border-primary border-outline-variant/30'}`}
                              >
                                Check In
                              </button>
                              <button
                                onClick={() => handleLogAttendance(w._id, 'Absent')}
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-sm border cursor-pointer transition-all ${status === 'Absent' ? 'bg-error border-error text-white font-extrabold shadow-sm' : 'bg-surface-lowest text-on-surface-variant hover:border-error border-outline-variant/30'}`}
                              >
                                Check Out
                              </button>
                              <button
                                onClick={() => handleLogAttendance(w._id, 'Leave')}
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-sm border cursor-pointer transition-all ${status === 'Leave' ? 'bg-secondary border-secondary text-white font-extrabold shadow-sm' : 'bg-surface-lowest text-on-surface-variant hover:border-secondary border-outline-variant/30'}`}
                              >
                                On Leave
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {workers.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-16 text-center text-outline font-semibold">
                          No active worker profiles found in registry.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. ATTENDANCE HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-4">
              {/* History Queries */}
              <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="relative w-full md:max-w-[320px]">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                  <input
                    type="text"
                    placeholder="Search history by worker name..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                  {['All', 'Present', 'Absent', 'Leave'].map(f => (
                    <button
                      key={f}
                      onClick={() => setHistoryStatusFilter(f)}
                      className={`px-3 py-1.5 border border-outline-variant text-[11px] font-bold rounded-full uppercase transition-all whitespace-nowrap cursor-pointer ${historyStatusFilter === f ? 'bg-primary/10 text-primary border-primary' : 'bg-surface-lowest text-on-surface-variant hover:border-primary'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* History Table */}
              <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
                {historyLoading ? (
                  <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-xs text-outline font-bold uppercase tracking-wider">Loading history sheets...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface-low border-b border-outline-variant">
                          <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Shift Date</th>
                          <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Worker</th>
                          <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Logged Status</th>
                          <th className="p-3.5 text-[11px] font-bold text-outline tracking-wider uppercase text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map(h => (
                          <tr key={h._id} className="border-b border-outline-variant/30 hover:bg-surface-low transition-colors duration-150">
                            <td className="p-3.5 font-bold text-on-surface">{formatDate(h.date)}</td>
                            <td className="p-3.5 font-semibold text-on-surface-variant">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-outline text-[18px]">account_circle</span>
                                {h.worker?.name || 'Unknown Worker'}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${getStatusBadgeClass(h.status)}`}>
                                {h.status === 'Present' ? 'Checked In' : h.status === 'Absent' ? 'Checked Out' : h.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => handleDeleteLog(h._id)}
                                className="w-7 h-7 rounded hover:bg-surface-container flex items-center justify-center text-error transition-colors cursor-pointer ml-auto"
                                title="Delete Log entry"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredHistory.length === 0 && (
                          <tr>
                            <td colSpan="4" className="p-16 text-center text-outline font-semibold">
                              No historical attendance logs match the current filters.
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

          {/* 4. REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="flex flex-col gap-5">
              {/* Reports Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-outline font-semibold uppercase tracking-wider">Aggregated Worker Scorecards</span>
                <button
                  onClick={handleExportCSV}
                  className="btn btn-outline border border-outline-variant hover:bg-surface-low text-on-surface-variant text-xs font-bold px-4 py-2.5 rounded-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined icon-xs">download</span>Export Reports (CSV)
                </button>
              </div>

              {/* Workers Grid Scorecard */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workers.map(w => {
                  const wHistory = allHistory.filter(h => (h.worker?._id || h.worker) === w._id);
                  const pCount = wHistory.filter(h => h.status === 'Present').length;
                  const aCount = wHistory.filter(h => h.status === 'Absent').length;
                  const lCount = wHistory.filter(h => h.status === 'Leave').length;
                  const total = pCount + aCount + lCount;
                  const rate = total > 0 ? Math.round((pCount / total) * 100) : 0;

                  return (
                    <div key={w._id} className="bg-surface-lowest border border-outline-variant p-4.5 rounded-md shadow-sm flex flex-col justify-between gap-4">
                      {/* Name Card */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20">
                          {w.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-on-surface">{w.name}</h4>
                          <p className="text-[10px] text-outline mt-0.5">{w.role}</p>
                        </div>
                      </div>

                      {/* Score metrics */}
                      <div className="grid grid-cols-3 gap-2 text-center text-outline text-[11px] font-semibold py-2.5 bg-surface-low border border-outline-variant/30 rounded-sm">
                        <div className="border-r border-outline-variant/30">
                          <p className="text-primary font-bold">{pCount}</p>
                          <p className="text-[9px] uppercase tracking-wider mt-0.5 text-outline">Present</p>
                        </div>
                        <div className="border-r border-outline-variant/30">
                          <p className="text-error font-bold">{aCount}</p>
                          <p className="text-[9px] uppercase tracking-wider mt-0.5 text-outline">Absent</p>
                        </div>
                        <div>
                          <p className="text-secondary font-bold">{lCount}</p>
                          <p className="text-[9px] uppercase tracking-wider mt-0.5 text-outline">Leave</p>
                        </div>
                      </div>

                      {/* Progress Bar & rate */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-outline uppercase tracking-wider">
                          <span>Presence Rate</span>
                          <span className={`${rate >= 80 ? 'text-primary' : 'text-error'}`}>{rate}%</span>
                        </div>
                        <div className="w-full bg-surface-low border border-outline-variant/30 h-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${rate >= 80 ? 'bg-primary' : 'bg-error'}`} style={{ width: `${rate}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default Attendance;
