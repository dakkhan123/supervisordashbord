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
  
  // Tab state: 'dashboard', 'history', 'reports'
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
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  // Report query parameters
  const [reportSearch, setReportSearch] = useState('');

  // Selected attendance record for detailed view
  const [selectedRecord, setSelectedRecord] = useState(null);

  // States for worker attendance history profile modal
  const [selectedWorkerForProfile, setSelectedWorkerForProfile] = useState(null);
  const [workerHistory, setWorkerHistory] = useState([]);
  const [workerHistoryLoading, setWorkerHistoryLoading] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState('All'); // 'All', 'Today', 'This Week', 'This Month', 'Custom'
  const [timelineStartDate, setTimelineStartDate] = useState('');
  const [timelineEndDate, setTimelineEndDate] = useState('');
  const [timelineSort, setTimelineSort] = useState('newest'); // 'newest', 'oldest'

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchHistoryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Historical filtering
  const filteredHistory = allHistory.filter(h => {
    const wName = h.worker?.name || '';
    const matchSearch = !historySearch || wName.toLowerCase().includes(historySearch.toLowerCase());
    const matchStatus = historyStatusFilter === 'All' || h.status === historyStatusFilter;
    
    const recordDate = new Date(h.date).toISOString().split('T')[0];
    const matchDate = !historyDateFilter || recordDate === historyDateFilter;

    return matchSearch && matchStatus && matchDate;
  });

  // Report workers filtering
  const filteredReportWorkers = workers.filter(w =>
    !reportSearch || w.name.toLowerCase().includes(reportSearch.toLowerCase())
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

        {/* Date Picker (Shared for Dashboard context) */}
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
              {allHistory.length === 0 ? (
                <div className="p-16 text-center bg-surface-lowest border border-outline-variant rounded-md shadow-sm">
                  <span className="material-symbols-outlined text-[48px] text-outline">description_lazy</span>
                  <p className="text-sm font-bold text-on-surface mt-2">No attendance records found.</p>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}

          {/* 2. ATTENDANCE HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-4">
              {/* History Queries */}
              <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto flex-1">
                  <div className="relative w-full md:max-w-[280px]">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                    <input
                      type="text"
                      placeholder="Search history by worker name..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                    />
                  </div>
                  {/* Date Filter */}
                  <div className="flex items-center gap-2 text-xs text-outline font-semibold bg-surface-low border border-outline-variant p-2 rounded-sm shadow-sm w-full md:w-auto">
                    <span className="material-symbols-outlined icon-sm text-outline">calendar_today</span>
                    <input 
                      type="date" 
                      value={historyDateFilter} 
                      onChange={(e) => setHistoryDateFilter(e.target.value)}
                      className="px-2 py-0.5 outline-none text-on-surface font-semibold bg-transparent cursor-pointer"
                    />
                    {historyDateFilter && (
                      <button 
                        onClick={() => setHistoryDateFilter('')}
                        className="text-outline hover:text-error cursor-pointer ml-1"
                        title="Clear Date Filter"
                      >
                        <span className="material-symbols-outlined text-[16px] leading-none">close</span>
                      </button>
                    )}
                  </div>
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
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface-low border-b border-outline-variant sticky top-0 z-[5]">
                          <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider bg-surface-low">Shift Date</th>
                          <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider bg-surface-low">Worker</th>
                          <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider bg-surface-low">Logged Status</th>
                          <th className="p-3.5 text-[11px] font-bold text-outline tracking-wider uppercase text-right bg-surface-low">Actions</th>
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
                                onClick={() => setSelectedRecord(h)}
                                className="px-3 py-1.5 text-[10px] font-bold uppercase rounded-sm border border-outline-variant/30 bg-surface-lowest text-primary hover:border-primary cursor-pointer transition-all ml-auto flex items-center gap-1 inline-flex"
                                title="View Details"
                              >
                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredHistory.length === 0 && (
                          <tr>
                            <td colSpan="4" className="p-16 text-center text-outline font-semibold">
                              No attendance records found.
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

          {/* 3. REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="flex flex-col gap-5">
              {/* Reports Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-4 bg-surface-lowest border border-outline-variant rounded-md p-4 shadow-sm">
                <div className="relative w-full md:max-w-[320px]">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                  <input
                    type="text"
                    placeholder="Search workers report..."
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  />
                </div>
                <button
                  onClick={handleExportCSV}
                  className="btn btn-outline border border-outline-variant hover:bg-surface-low text-on-surface-variant text-xs font-bold px-4 py-2.5 rounded-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined icon-xs">download</span>Export Reports (CSV)
                </button>
              </div>

              {/* Workers Grid Scorecard */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReportWorkers.map(w => {
                  const wHistory = allHistory.filter(h => (h.worker?._id || h.worker) === w._id);
                  const pCount = wHistory.filter(h => h.status === 'Present').length;
                  const aCount = wHistory.filter(h => h.status === 'Absent').length;
                  const lCount = wHistory.filter(h => h.status === 'Leave').length;
                  const total = pCount + aCount + lCount;
                  const rate = total > 0 ? Math.round((pCount / total) * 100) : 0;

                  return (
                    <div 
                      key={w._id} 
                      onClick={() => handleWorkerCardClick(w)}
                      className="bg-surface-lowest border border-outline-variant p-4.5 rounded-md shadow-sm flex flex-col justify-between gap-4 cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200"
                    >
                      {/* Name Card */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20">
                          {w.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-on-surface">{w.name}</h4>
                          <p className="text-[10px] text-outline mt-0.5">{w.role} · {w.phone || 'No phone record'}</p>
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
                {filteredReportWorkers.length === 0 && (
                  <div className="col-span-full p-16 text-center text-outline font-semibold">
                    No active worker profiles found in registry.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Attendance Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[500] flex items-center justify-center p-6 transition-all duration-300 animate-fade-in">
          <div className="bg-surface-lowest rounded-lg shadow-xl w-full max-w-[500px] animate-scale-up border border-outline-variant">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">info</span>
                Attendance Log Details
              </h2>
              <button 
                className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors cursor-pointer" 
                onClick={() => setSelectedRecord(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4">
              {/* Worker Profile Card */}
              <div className="flex items-center gap-3.5 p-3.5 bg-surface-low rounded-md border border-outline-variant/30">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20 text-lg">
                  {(selectedRecord.worker?.name || 'U').charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-on-surface">{selectedRecord.worker?.name || 'Unknown Worker'}</h4>
                  <p className="text-xs text-outline mt-0.5">{selectedRecord.worker?.role || 'Staff'}</p>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-outline">Date</span>
                  <span className="text-on-surface">{formatDate(selectedRecord.date)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-outline">Status</span>
                  <span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${getStatusBadgeClass(selectedRecord.status)}`}>
                      {selectedRecord.status}
                    </span>
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-outline">Phone Number</span>
                  <span className="text-on-surface">{selectedRecord.worker?.phone || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-outline">Database ID</span>
                  <span className="text-on-surface font-mono text-[10px] break-all">{selectedRecord._id}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-outline">Logged At</span>
                  <span className="text-on-surface">{formatDateTime(selectedRecord.createdAt)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-outline">Last Updated</span>
                  <span className="text-on-surface">{formatDateTime(selectedRecord.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-outline-variant flex justify-end">
              <button 
                type="button" 
                className="btn btn-ghost px-5 py-2 text-xs font-bold rounded-sm border border-outline-variant hover:bg-surface-low cursor-pointer transition-colors" 
                onClick={() => setSelectedRecord(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Worker Detailed Attendance Profile Modal */}
      {selectedWorkerForProfile && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[500] flex items-center justify-center p-6 transition-all duration-300 animate-fade-in">
          <div className="bg-surface-lowest rounded-lg shadow-xl w-full max-w-[850px] max-h-[90vh] overflow-y-auto animate-scale-up border border-outline-variant flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between sticky top-0 bg-surface-lowest z-[10]">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">badge</span>
                HR Attendance Profile
              </h2>
              <button 
                className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors cursor-pointer" 
                onClick={() => setSelectedWorkerForProfile(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-6">
              
              {/* Profile Card & Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                
                {/* Profile card (left side, 5 cols) */}
                <div className="md:col-span-5 bg-surface-low p-5 rounded-md border border-outline-variant/30 flex flex-col items-center justify-center gap-4 text-center">
                  <UserAvatar 
                    user={{ worker: selectedWorkerForProfile }} 
                    className="w-20 h-20 rounded-full object-cover border-4 border-primary/20 shadow-md text-xl" 
                  />
                  <div>
                    <h3 className="text-base font-extrabold text-on-surface">{selectedWorkerForProfile.name}</h3>
                    <p className="text-xs text-outline mt-1 font-semibold uppercase tracking-wider">{selectedWorkerForProfile.role}</p>
                    <p className="text-[11px] text-on-surface-variant mt-2 font-mono bg-surface-lowest border border-outline-variant/40 px-2 py-1 rounded-sm select-all">
                      ID: {selectedWorkerForProfile._id}
                    </p>
                  </div>
                  {selectedWorkerForProfile.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-outline mt-1">
                      <span className="material-symbols-outlined text-[16px]">call</span>
                      {selectedWorkerForProfile.phone}
                    </div>
                  )}
                </div>

                {/* Scorecards summary (right side, 7 cols) */}
                <div className="md:col-span-7 grid grid-cols-2 gap-4">
                  {/* Attendance % Rate */}
                  <div className="col-span-2 bg-primary/5 border border-primary/20 rounded-md p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Overall Attendance Percentage</span>
                    <div className="flex items-end justify-between mt-3">
                      <div className="text-[32px] font-extrabold text-primary leading-none">
                        {(() => {
                          const wPresentCount = workerHistory.filter(h => h.status === 'Present').length;
                          const wAbsentCount = workerHistory.filter(h => h.status === 'Absent').length;
                          const wLeaveCount = workerHistory.filter(h => h.status === 'Leave').length;
                          const wTotal = wPresentCount + wAbsentCount + wLeaveCount;
                          return wTotal > 0 ? Math.round((wPresentCount / wTotal) * 100) : 0;
                        })()}%
                      </div>
                      <span className="text-xs font-semibold text-outline">Calculated from Atlas records</span>
                    </div>
                  </div>

                  {/* Summary Counts */}
                  {['Present', 'Absent', 'Leave'].map(st => {
                    const count = workerHistory.filter(h => h.status === st).length;
                    const colorClass = st === 'Present' ? 'text-primary' : st === 'Absent' ? 'text-error' : 'text-secondary';
                    const bgClass = st === 'Present' ? 'bg-primary/5 border-primary/10' : st === 'Absent' ? 'bg-error/5 border-error/10' : 'bg-secondary/5 border-secondary/10';
                    return (
                      <div key={st} className={`border rounded-md p-4 flex flex-col justify-between ${bgClass}`}>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider">{st} Logs</span>
                        <div className={`text-[24px] font-extrabold mt-3 leading-none ${colorClass}`}>{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="bg-surface-low border border-outline-variant/40 rounded-md p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs font-bold text-outline uppercase tracking-wider">Attendance Timeline Filters</span>
                  <div className="flex items-center gap-1.5 bg-surface-lowest border border-outline-variant p-1 rounded-sm">
                    <button 
                      onClick={() => setTimelineSort('newest')}
                      className={`px-2 py-1 text-[10px] font-bold rounded-sm cursor-pointer transition-all ${timelineSort === 'newest' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-low'}`}
                    >
                      Newest
                    </button>
                    <button 
                      onClick={() => setTimelineSort('oldest')}
                      className={`px-2 py-1 text-[10px] font-bold rounded-sm cursor-pointer transition-all ${timelineSort === 'oldest' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-low'}`}
                    >
                      Oldest
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                  {/* Quick Filters */}
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {['All', 'Today', 'This Week', 'This Month', 'Custom'].map(f => (
                      <button
                        key={f}
                        onClick={() => setTimelineFilter(f)}
                        className={`px-3 py-1.5 border border-outline-variant/60 text-[10px] font-bold rounded-sm uppercase transition-all whitespace-nowrap cursor-pointer ${timelineFilter === f ? 'bg-primary text-white border-primary' : 'bg-surface-lowest text-on-surface-variant hover:border-primary'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {/* Custom Date Inputs */}
                  {timelineFilter === 'Custom' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-outline uppercase">
                        <span>From</span>
                        <input 
                          type="date" 
                          value={timelineStartDate} 
                          onChange={(e) => setTimelineStartDate(e.target.value)}
                          className="px-2 py-1 bg-surface-lowest border border-outline-variant rounded-sm outline-none text-on-surface font-semibold cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-outline uppercase">
                        <span>To</span>
                        <input 
                          type="date" 
                          value={timelineEndDate} 
                          onChange={(e) => setTimelineEndDate(e.target.value)}
                          className="px-2 py-1 bg-surface-lowest border border-outline-variant rounded-sm outline-none text-on-surface font-semibold cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed timeline list/table */}
              <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden flex flex-col">
                {workerHistoryLoading ? (
                  <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-xs text-outline font-bold uppercase tracking-wider">Fetching logs from Atlas...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface-low border-b border-outline-variant sticky top-0 z-[5]">
                          <th className="p-3 text-[10px] font-bold text-outline uppercase tracking-wider bg-surface-low">Date & Day</th>
                          <th className="p-3 text-[10px] font-bold text-outline uppercase tracking-wider bg-surface-low">Status</th>
                          <th className="p-3 text-[10px] font-bold text-outline uppercase tracking-wider bg-surface-low">Shift</th>
                          <th className="p-3 text-[10px] font-bold text-outline uppercase tracking-wider bg-surface-low">Check-in</th>
                          <th className="p-3 text-[10px] font-bold text-outline uppercase tracking-wider bg-surface-low">Check-out</th>
                          <th className="p-3 text-[10px] font-bold text-outline uppercase tracking-wider bg-surface-low">Hours</th>
                          <th className="p-3 text-[10px] font-bold text-outline uppercase tracking-wider bg-surface-low">Supervisor</th>
                          <th className="p-3 text-[10px] font-bold text-outline uppercase tracking-wider bg-surface-low">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredTimeline().map(h => (
                          <tr key={h._id} className="border-b border-outline-variant/30 hover:bg-surface-low transition-colors duration-150">
                            <td className="p-3">
                              <p className="font-bold text-on-surface">{formatDate(h.date)}</p>
                              <p className="text-[9px] text-outline mt-0.5">{getDayOfWeek(h.date)}</p>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${getStatusBadgeClass(h.status)}`}>
                                {h.status}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-on-surface-variant">{h.shift || 'General'}</td>
                            <td className="p-3 font-semibold text-on-surface-variant">{h.checkInTime || '-'}</td>
                            <td className="p-3 font-semibold text-on-surface-variant">{h.checkOutTime || '-'}</td>
                            <td className="p-3 font-semibold text-on-surface-variant">
                              {h.workingHours ? `${h.workingHours} hrs` : '-'}
                            </td>
                            <td className="p-3 font-semibold text-on-surface-variant">{h.supervisorName || '-'}</td>
                            <td className="p-3 text-outline italic font-medium max-w-[120px] truncate" title={h.remarks}>
                              {h.remarks || '-'}
                            </td>
                          </tr>
                        ))}
                        {getFilteredTimeline().length === 0 && (
                          <tr>
                            <td colSpan="8" className="p-10 text-center text-outline font-semibold">
                              No attendance records found for the selected filter criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-outline-variant flex justify-end sticky bottom-0 bg-surface-lowest z-[10]">
              <button 
                type="button" 
                className="btn btn-ghost px-5 py-2 text-xs font-bold rounded-sm border border-outline-variant hover:bg-surface-low cursor-pointer transition-colors" 
                onClick={() => setSelectedWorkerForProfile(null)}
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
