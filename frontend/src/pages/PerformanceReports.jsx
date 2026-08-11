import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const PerformanceReports = ({ searchVal, showToast, refreshTrigger }) => {
  const [kpi, setKpi] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [taskDist, setTaskDist] = useState([]);
  const [taskTrend, setTaskTrend] = useState([]);
  const [heatmap, setHeatmap] = useState({ dates: [], workers: [] });
  const [rawTasks, setRawTasks] = useState([]);
  const [rawAttendance, setRawAttendance] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const isInitialLoad = useRef(true);

  // Detail Modal State
  const [detailModal, setDetailModal] = useState(null);

  const getInitialDates = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const past = new Date(today);
    past.setMonth(past.getMonth() - 3);
    return {
      from: `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-01`,
      to: `${yyyy}-${mm}-${dd}`
    };
  };

  const initialDates = getInitialDates();
  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);

  const fetchData = async () => {
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      showToast?.('From date cannot be after To date', 'error');
      return;
    }

    try {
      if (isInitialLoad.current) setLoading(true);
      setError(null);
      const params = { from: dateFrom, to: dateTo };
      const [kpiRes, workersRes, distRes, trendRes, heatmapRes, tasksRes, attendanceRes] = await Promise.all([
        api.getPerformanceKPI(params),
        api.getWorkerPerformance(params),
        api.getTaskDistribution(params),
        api.getTaskTrend({ ...params, granularity: 'monthly' }),
        api.getAttendanceHeatmap(params),
        api.getTasks(params),
        api.getAttendance(params)
      ]);

      if (kpiRes && kpiRes.success) setKpi(kpiRes.data);
      if (workersRes && workersRes.success) setWorkers(workersRes.data || []);
      if (distRes && distRes.success) setTaskDist(distRes.data || []);
      if (trendRes && trendRes.success) setTaskTrend(trendRes.data || []);
      if (heatmapRes && heatmapRes.success) setHeatmap(heatmapRes.data || { dates: [], workers: [] });
      if (tasksRes && tasksRes.success) setRawTasks(tasksRes.data || []);
      if (attendanceRes && attendanceRes.success) setRawAttendance(attendanceRes.data || []);
    } catch (err) {
      console.error(err);
      if (isInitialLoad.current) {
        setError('Failed to load performance data. Check server connection.');
        showToast?.('Error loading performance reports', 'error');
      }
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, refreshTrigger]);

  const handleExportCSV = async () => {
    try {
      const res = await api.getPerformanceExport({ from: dateFrom, to: dateTo });
      if (!res || !res.success || !res.data || !res.data.length) {
        showToast?.('No performance data available to export', 'error');
        return;
      }
      const headers = Object.keys(res.data[0]);
      const csvRows = [headers.join(',')];
      res.data.forEach(row => {
        csvRows.push(headers.map(h => `"${row[h] ?? ''}"`).join(','));
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Performance_Report_${dateFrom}_to_${dateTo}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast?.('CSV exported successfully!', 'success');
    } catch {
      showToast?.('Export failed', 'error');
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const formatDateString = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fmt = (n) => Math.round(n ?? 0).toLocaleString('en-IN');

  const gradeCls = (g) => {
    if (g === 'A+' || g === 'A') return 'bg-primary/10 text-primary';
    if (g === 'B+' || g === 'B') return 'bg-tertiary/10 text-tertiary';
    if (g === 'C') return 'bg-secondary/10 text-secondary';
    return 'bg-error/10 text-error';
  };

  const heatCls = (status) => {
    if (status === 'Present') return 'bg-primary/80 text-white';
    if (status === 'Absent') return 'bg-error/70 text-white';
    if (status === 'Leave') return 'bg-secondary text-white';
    return 'bg-surface-container text-outline';
  };

  const filteredWorkers = workers.filter(w =>
    !searchVal || (w.name && w.name.toLowerCase().includes(searchVal.toLowerCase()))
  );

  // Donut chart for task distribution
  const totalTasks = taskDist.reduce((s, d) => s + Number(d.value || 0), 0);
  let accPct = 0;
  const donutSegs = taskDist.map(d => {
    const pct = totalTasks > 0 ? (d.value / totalTasks) * 100 : 0;
    const seg = {
      ...d,
      pct: Math.round(pct),
      dasharray: `${(pct / 100) * 389.6} 389.6`,
      dashoffset: -((accPct / 100) * 389.6)
    };
    accPct += pct;
    return seg;
  });

  // Task trend chart
  const trendMax = Math.max(...taskTrend.map(t => t.total), 1);
  const monthLabels = taskTrend.map(t => {
    const d = new Date((t.date || '2025-01') + '-01');
    return isNaN(d.getTime()) ? t.date : d.toLocaleString('default', { month: 'short' });
  });

  // Score bar for worker performance
  const ScoreBar = ({ score, width = '100%' }) => (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ width, backgroundColor: 'var(--surface-container)' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{
        width: `${Math.min(100, Math.max(0, score || 0))}%`,
        background: score >= 80 ? 'var(--primary)' : score >= 60 ? 'var(--tertiary)' : score >= 40 ? '#e8a800' : 'var(--error)'
      }} />
    </div>
  );

  // -------------------------------------------------------------
  // DRILL-DOWN MODAL HANDLERS (AUDITABILITY FOR PERFORMANCE METRICS)
  // -------------------------------------------------------------
  const openActiveWorkersModal = () => {
    setDetailModal({
      title: 'Active Workers Breakdown',
      subtitle: `Total Active Workers in Database: ${workers.length}`,
      formula: `Active Workers = Total registered worker documents with status = 'Active'`,
      type: 'worker_list',
      kpis: [
        { label: 'Active Workers', value: `${workers.length} Workers`, color: 'text-primary' },
        { label: 'Total Tasks Assigned', value: `${workers.reduce((s, w) => s + w.totalTasks, 0)} Tasks`, color: 'text-on-surface' },
        { label: 'Avg Attendance Rate', value: `${workers.length > 0 ? Math.round(workers.reduce((s, w) => s + w.attendanceRate, 0) / workers.length) : 0}%`, color: 'text-outline' }
      ],
      rows: workers
    });
  };

  const openTotalTasksModal = () => {
    setDetailModal({
      title: 'Total Tasks Breakdown',
      subtitle: `Tasks created in date range: ${formatDateString(dateFrom)} to ${formatDateString(dateTo)}`,
      formula: `Total Tasks = Sum of all MongoDB task records matching date filter (${rawTasks.length} tasks)`,
      type: 'task_list',
      kpis: [
        { label: 'Total Tasks', value: `${kpi ? kpi.totalTasks : rawTasks.length} Tasks`, color: 'text-tertiary' },
        { label: 'Completed Tasks', value: `${kpi ? kpi.completedTasks : 0} Completed`, color: 'text-primary' },
        { label: 'Active Tasks', value: `${kpi ? kpi.inProgressTasks + kpi.pendingTasks : 0} In Progress/Pending`, color: 'text-secondary' }
      ],
      rows: rawTasks
    });
  };

  const openCompletionRateModal = () => {
    const completedTasksList = rawTasks.filter(t => t.status === 'Completed');
    setDetailModal({
      title: 'Task Completion Rate Breakdown',
      subtitle: `Calculated from completed tasks ÷ total tasks in date range`,
      formula: `Completion Rate = Completed Tasks (${completedTasksList.length}) ÷ Total Tasks (${rawTasks.length}) × 100 = ${kpi ? kpi.completionRate : 0}%`,
      type: 'task_list',
      kpis: [
        { label: 'Completion Rate', value: `${kpi ? kpi.completionRate : 0}%`, color: 'text-primary' },
        { label: 'Completed Tasks', value: `${completedTasksList.length} Tasks`, color: 'text-primary' },
        { label: 'Total Tasks Evaluated', value: `${rawTasks.length} Tasks`, color: 'text-on-surface' }
      ],
      rows: completedTasksList
    });
  };

  const openAttendanceRateModal = () => {
    const presentRecords = rawAttendance.filter(a => a.status === 'Present');
    setDetailModal({
      title: 'Overall Attendance Rate Breakdown',
      subtitle: `Attendance presence rate in date range: ${formatDateString(dateFrom)} to ${formatDateString(dateTo)}`,
      formula: `Attendance Rate = Present Records (${presentRecords.length}) ÷ Total Attendance Logs (${rawAttendance.length}) × 100 = ${kpi ? kpi.attendanceRate : 0}%`,
      type: 'attendance_list',
      kpis: [
        { label: 'Attendance Rate', value: `${kpi ? kpi.attendanceRate : 0}%`, color: 'text-tertiary' },
        { label: 'Present Records', value: `${presentRecords.length} Logs`, color: 'text-primary' },
        { label: 'Total Attendance Logs', value: `${rawAttendance.length} Logs`, color: 'text-on-surface' }
      ],
      rows: rawAttendance
    });
  };

  const openInProgressModal = () => {
    const inProgressList = rawTasks.filter(t => t.status === 'In Progress');
    setDetailModal({
      title: 'In Progress Tasks Breakdown',
      subtitle: `Active tasks currently being executed in date range`,
      formula: `In Progress Tasks = Count of MongoDB task records with status = 'In Progress'`,
      type: 'task_list',
      kpis: [
        { label: 'In Progress Tasks', value: `${inProgressList.length} Tasks`, color: 'text-secondary' },
        { label: 'Total Tasks', value: `${rawTasks.length} Tasks`, color: 'text-on-surface' }
      ],
      rows: inProgressList
    });
  };

  const openPendingModal = () => {
    const pendingList = rawTasks.filter(t => t.status === 'Pending');
    setDetailModal({
      title: 'Pending Tasks Breakdown',
      subtitle: `Tasks awaiting start in date range`,
      formula: `Pending Tasks = Count of MongoDB task records with status = 'Pending'`,
      type: 'task_list',
      kpis: [
        { label: 'Pending Tasks', value: `${pendingList.length} Tasks`, color: 'text-secondary' },
        { label: 'Total Tasks', value: `${rawTasks.length} Tasks`, color: 'text-on-surface' }
      ],
      rows: pendingList
    });
  };

  const openOverdueModal = () => {
    const now = new Date();
    const overdueList = rawTasks.filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < now);
    setDetailModal({
      title: 'Overdue Tasks Breakdown',
      subtitle: `Uncompleted tasks past their due date`,
      formula: `Overdue Tasks = Tasks where (Due Date < Today) and (Status !== 'Completed')`,
      type: 'task_list',
      kpis: [
        { label: 'Overdue Tasks', value: `${overdueList.length} Tasks`, color: 'text-error' },
        { label: 'Total Tasks Evaluated', value: `${rawTasks.length} Tasks`, color: 'text-on-surface' }
      ],
      rows: overdueList
    });
  };

  const openAvgCompletionModal = () => {
    const completedWithDates = rawTasks.filter(t => t.status === 'Completed' && t.createdAt && t.updatedAt);
    setDetailModal({
      title: 'Average Task Completion Duration Breakdown',
      subtitle: `Time taken to complete tasks from assignment to final resolution`,
      formula: `Avg Completion = Sum of (Completion Time − Creation Time in days) ÷ Completed Tasks Count (${completedWithDates.length}) = ${kpi ? kpi.avgCompletionDays : 0} Days`,
      type: 'task_list',
      kpis: [
        { label: 'Avg Completion Time', value: `${kpi ? kpi.avgCompletionDays : 0} Days`, color: 'text-primary' },
        { label: 'Completed Tasks Evaluated', value: `${completedWithDates.length} Tasks`, color: 'text-on-surface' }
      ],
      rows: completedWithDates
    });
  };

  const openTrendMonthModal = (trendItem) => {
    if (!trendItem) return;
    const mDateStr = trendItem.date;
    const mTasks = rawTasks.filter(t => {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === mDateStr;
    });

    setDetailModal({
      title: `Task Trend Breakdown — ${mDateStr}`,
      subtitle: `Tasks created/processed in ${mDateStr} (${mTasks.length} tasks)`,
      formula: `Month Total (${trendItem.total}) = Completed (${trendItem.completed}) + In Progress (${trendItem.inProgress}) + Pending (${trendItem.pending})`,
      type: 'task_list',
      kpis: [
        { label: 'Completed Tasks', value: `${trendItem.completed} Tasks`, color: 'text-primary' },
        { label: 'In Progress Tasks', value: `${trendItem.inProgress} Tasks`, color: 'text-tertiary' },
        { label: 'Pending Tasks', value: `${trendItem.pending} Tasks`, color: 'text-secondary' }
      ],
      rows: mTasks
    });
  };

  const openTaskDistModal = (distLabel) => {
    const now = new Date();
    let matching = [];
    if (distLabel === 'Completed') matching = rawTasks.filter(t => t.status === 'Completed');
    else if (distLabel === 'In Progress') matching = rawTasks.filter(t => t.status === 'In Progress');
    else if (distLabel === 'Pending') matching = rawTasks.filter(t => t.status === 'Pending');
    else if (distLabel === 'Overdue') matching = rawTasks.filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < now);

    setDetailModal({
      title: `Task Distribution — ${distLabel}`,
      subtitle: `Filter: Status = '${distLabel}'`,
      formula: `Distribution Share = Status Count (${matching.length}) ÷ Total Tasks (${rawTasks.length}) × 100`,
      type: 'task_list',
      kpis: [
        { label: `${distLabel} Tasks`, value: `${matching.length} Tasks`, color: 'text-primary' },
        { label: 'Total Tasks', value: `${rawTasks.length} Tasks`, color: 'text-on-surface' }
      ],
      rows: matching
    });
  };

  const openWorkerDetailModal = (workerObj) => {
    const workerTasks = rawTasks.filter(t =>
      t.assignedTo && (t.assignedTo._id ? t.assignedTo._id.toString() === workerObj._id.toString() : t.assignedTo.toString() === workerObj._id.toString())
    );
    const workerAtt = rawAttendance.filter(a =>
      a.worker && (a.worker._id ? a.worker._id.toString() === workerObj._id.toString() : a.worker.toString() === workerObj._id.toString())
    );

    setDetailModal({
      title: `Worker Performance Breakdown — ${workerObj.name}`,
      subtitle: `Role: ${workerObj.role} · Weighted Performance Score: ${workerObj.performanceScore}% (Grade: ${workerObj.grade})`,
      formula: `Performance Score = 40% Completion Rate (${workerObj.completionRate}%) + 30% Attendance (${workerObj.attendanceRate}%) + 20% No-Overdue + 10% Volume`,
      type: 'task_list',
      kpis: [
        { label: 'Performance Score', value: `${workerObj.performanceScore}% (${workerObj.grade})`, color: 'text-primary' },
        { label: 'Completed / Total Tasks', value: `${workerObj.completed} / ${workerObj.totalTasks}`, color: 'text-on-surface' },
        { label: 'Attendance Rate', value: `${workerObj.attendanceRate}%`, color: 'text-tertiary' }
      ],
      rows: workerTasks
    });
  };

  const openHeatmapCellModal = (workerName, dateStr, status) => {
    const recs = rawAttendance.filter(a => {
      const d = new Date(a.date).toISOString().split('T')[0];
      const wName = a.worker ? a.worker.name : 'Worker';
      return d === dateStr && wName === workerName;
    });

    setDetailModal({
      title: `Attendance Record — ${workerName}`,
      subtitle: `Date: ${formatDateString(dateStr)} · Logged Status: ${status}`,
      formula: `Status verified from MongoDB Attendance record for ${workerName}`,
      type: 'attendance_list',
      kpis: [
        { label: 'Logged Status', value: status, color: status === 'Present' ? 'text-primary' : status === 'Absent' ? 'text-error' : 'text-secondary' },
        { label: 'Date', value: formatDateString(dateStr), color: 'text-on-surface' }
      ],
      rows: recs
    });
  };

  const handleModalExportCSV = () => {
    if (!detailModal || !detailModal.rows || detailModal.rows.length === 0) {
      showToast?.('No rows to export from breakdown modal', 'warning');
      return;
    }

    let headers = [];
    let rows = [];

    if (detailModal.type === 'worker_list') {
      headers = ['Worker Name', 'Role', 'Total Tasks', 'Completed', 'Completion Rate (%)', 'Attendance Rate (%)', 'Performance Score', 'Grade'];
      rows = detailModal.rows.map(w => [
        `"${(w.name || '').replace(/"/g, '""')}"`,
        `"${(w.role || '').replace(/"/g, '""')}"`,
        w.totalTasks || 0,
        w.completed || 0,
        w.completionRate || 0,
        w.attendanceRate || 0,
        w.performanceScore || 0,
        `"${w.grade || 'N/A'}"`
      ]);
    } else if (detailModal.type === 'attendance_list') {
      headers = ['Date', 'Worker Name', 'Status', 'Check In', 'Check Out', 'Location'];
      rows = detailModal.rows.map(a => [
        `"${formatDateString(a.date)}"`,
        `"${((a.worker && a.worker.name) || 'Worker').replace(/"/g, '""')}"`,
        `"${a.status || 'N/A'}"`,
        `"${a.checkInTime || 'N/A'}"`,
        `"${a.checkOutTime || 'N/A'}"`,
        `"${(a.location || 'Pune').replace(/"/g, '""')}"`
      ]);
    } else {
      headers = ['Task Title', 'Assigned Worker', 'Status', 'Priority', 'Due Date', 'Created Date'];
      rows = detailModal.rows.map(t => [
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${((t.assignedTo && t.assignedTo.name) || 'Unassigned').replace(/"/g, '""')}"`,
        `"${t.status || 'Pending'}"`,
        `"${t.priority || 'Medium'}"`,
        `"${formatDateString(t.dueDate)}"`,
        `"${formatDateString(t.createdAt)}"`
      ]);
    }

    const csvString = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${detailModal.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast?.('Breakdown CSV exported successfully!', 'success');
  };

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Performance Reports</h1>
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm p-14 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px]">error</span>
          </div>
          <h2 className="text-lg font-bold text-on-surface">Reports Loading Failed</h2>
          <p className="text-xs text-on-surface-variant max-w-[400px]">{error}</p>
          <button onClick={fetchData} className="btn bg-primary text-white text-xs font-semibold px-5 py-2.5 rounded-sm hover:bg-primary-container transition-colors flex items-center gap-1.5 mt-2">
            <span className="material-symbols-outlined icon-xs text-white">refresh</span>Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Performance Reports</h1>
          <p className="text-on-surface-variant text-sm">Worker productivity & task analytics · Unit Pune-A12</p>
        </div>
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="flex items-center gap-2.5 text-xs text-outline font-semibold">
            <span className="material-symbols-outlined icon-sm text-outline">date_range</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface" />
            <span>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface" />
          </div>
          <div className="flex gap-2">
            <button className="btn flex items-center gap-1.5 px-3 py-1.5 border border-primary/20 hover:bg-primary/5 text-primary text-xs font-semibold rounded-sm transition-colors" onClick={handleExportPDF}>
              <span className="material-symbols-outlined icon-xs text-primary">picture_as_pdf</span>Export PDF
            </button>
            <button className="btn flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-sm hover:bg-primary-container transition-colors" onClick={handleExportCSV}>
              <span className="material-symbols-outlined icon-xs text-white">download</span>Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* KPI Tiles (Clickable for drill-down) */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm animate-pulse">
              <div className="h-3 bg-surface-container rounded w-24 mb-3" />
              <div className="h-7 bg-surface-container-high rounded w-16 mb-2" />
              <div className="h-3 bg-surface-container rounded w-20" />
            </div>
          ))}
        </div>
      ) : kpi && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPITile onClick={openActiveWorkersModal} label="Active Workers" value={fmt(kpi.totalWorkers)} icon="groups" color="primary" sub="Currently active" />
            <KPITile onClick={openTotalTasksModal} label="Total Tasks" value={fmt(kpi.totalTasks)} icon="task_alt" color="tertiary" sub={`${fmt(kpi.completedTasks)} completed`} />
            <KPITile onClick={openCompletionRateModal} label="Completion Rate" value={`${kpi.completionRate}%`} icon="trending_up" color="primary" sub="Tasks completed on time" trend={kpi.completionRate >= 70 ? 'up' : 'down'} />
            <KPITile onClick={openAttendanceRateModal} label="Attendance Rate" value={`${kpi.attendanceRate}%`} icon="calendar_month" color="tertiary" sub="Overall presence rate" trend={kpi.attendanceRate >= 80 ? 'up' : 'down'} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPITile onClick={openInProgressModal} label="In Progress" value={fmt(kpi.inProgressTasks)} icon="pending_actions" color="secondary" sub="Currently active tasks" />
            <KPITile onClick={openPendingModal} label="Pending" value={fmt(kpi.pendingTasks)} icon="hourglass_empty" color="secondary" sub="Awaiting start" />
            <KPITile onClick={openOverdueModal} label="Overdue Tasks" value={fmt(kpi.overdueTasks)} icon="warning" color="error" sub="Past due date" trend="down" />
            <KPITile onClick={openAvgCompletionModal} label="Avg Completion" value={`${kpi.avgCompletionDays}d`} icon="schedule" color="primary" sub="Days per task" />
          </div>
        </>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-low border border-outline-variant rounded-md p-1 w-fit">
        {[['overview', 'Overview'], ['workers', 'Worker Leaderboard'], ['heatmap', 'Attendance Heatmap']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-xs font-semibold rounded-sm transition-all ${activeTab === key ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && !loading && (
        <div className="flex flex-col gap-5">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Task Trend Bar Chart */}
            <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm lg:col-span-2 overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-on-surface">Task Completion Trend</h2>
                  <p className="text-[11px] text-outline">Click any month bar to inspect its task list</p>
                </div>
                <div className="flex gap-3.5 items-center">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-primary"><span className="w-2.5 h-2.5 rounded-[3px] bg-primary" />Completed</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-tertiary"><span className="w-2.5 h-2.5 rounded-[3px] bg-tertiary" />In Progress</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-secondary"><span className="w-2.5 h-2.5 rounded-[3px] bg-secondary" />Pending</span>
                </div>
              </div>
              <div className="p-5">
                {taskTrend.length > 0 ? (
                  <div className="flex items-end gap-2 h-[200px] pb-8 relative">
                    {taskTrend.map((t, idx) => (
                      <div
                        key={t.date}
                        onClick={() => openTrendMonthModal(t)}
                        className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                        title={`Click to view tasks for ${t.date}`}
                      >
                        <div className="w-full flex items-end gap-0.5 justify-center">
                          <div className="w-2 md:w-3 bg-gradient-to-t from-primary/70 to-primary rounded-t-sm group-hover:brightness-125 transition-all"
                            style={{ height: `${(t.completed / trendMax) * 100}%`, minHeight: t.completed ? '4px' : 0 }}>
                            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#213145] text-[#eaf1ff] text-[10px] font-bold px-1.5 py-1 rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 whitespace-nowrap">
                              {t.completed} done / {t.total} total (Click for breakdown)
                            </div>
                          </div>
                          <div className="w-2 md:w-3 bg-gradient-to-t from-tertiary/70 to-tertiary rounded-t-sm"
                            style={{ height: `${(t.inProgress / trendMax) * 100}%`, minHeight: t.inProgress ? '4px' : 0 }} />
                          <div className="w-2 md:w-3 bg-gradient-to-t from-secondary/70 to-secondary rounded-t-sm"
                            style={{ height: `${(t.pending / trendMax) * 100}%`, minHeight: t.pending ? '4px' : 0 }} />
                        </div>
                      </div>
                    ))}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-around text-[9px] md:text-[10px] font-bold text-outline uppercase tracking-wider font-mono">
                      {monthLabels.map((m, i) => (
                        <span key={i} onClick={() => openTrendMonthModal(taskTrend[i])} className="cursor-pointer hover:text-primary transition-colors">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-outline text-sm">No task data in selected range</div>
                )}
              </div>
            </div>

            {/* Task Distribution Donut */}
            <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant">
                <h2 className="text-base font-bold text-on-surface">Task Distribution</h2>
                <p className="text-[11px] text-outline">Click any status slice to view matching tasks</p>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-6 flex-wrap justify-center">
                  <div className="relative w-40 h-40 flex-shrink-0">
                    <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                      <circle cx="80" cy="80" r="62" fill="none" stroke="var(--surface-container-high)" strokeWidth="22" />
                      {donutSegs.map(seg => (
                        <circle
                          key={seg.label}
                          onClick={() => openTaskDistModal(seg.label)}
                          cx="80"
                          cy="80"
                          r="62"
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="22"
                          strokeDasharray={seg.dasharray}
                          strokeDashoffset={seg.dashoffset}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-extrabold text-on-surface">{fmt(totalTasks)}</span>
                      <span className="text-[10px] font-bold text-outline uppercase">Total</span>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-2 min-w-[120px] text-xs">
                    {donutSegs.map(seg => (
                      <div
                        key={seg.label}
                        onClick={() => openTaskDistModal(seg.label)}
                        className="p-1 rounded hover:bg-surface-low cursor-pointer transition-colors group"
                        title={`Click to view ${seg.label} tasks`}
                      >
                        <div className="flex items-center justify-between font-medium">
                          <span className="flex items-center gap-1.5 text-on-surface group-hover:text-primary transition-colors">
                            <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: seg.color }} />{seg.label}
                          </span>
                          <span className="font-bold text-on-surface">{seg.value}</span>
                        </div>
                        <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden mt-1">
                          <div className="h-full" style={{ backgroundColor: seg.color, width: `${seg.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top 5 Performers Quick View */}
          <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-on-surface">Top Performers</h2>
                <p className="text-[11px] text-outline">Click a worker to view performance breakdown</p>
              </div>
              <button onClick={() => setActiveTab('workers')} className="text-xs font-semibold text-primary hover:underline">View All →</button>
            </div>
            <div className="p-5 flex flex-col">
              {filteredWorkers.slice(0, 5).map((w, i) => (
                <div
                  key={w._id}
                  onClick={() => openWorkerDetailModal(w)}
                  className="flex items-center gap-3 py-2.5 px-2 border-b border-outline-variant/30 last:border-0 hover:bg-surface-low rounded cursor-pointer transition-colors group"
                  title={`Click to view performance details for ${w.name}`}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold ${i < 3 ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-outline'}`}>{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">{w.name}</p>
                    <span className="text-[10px] text-outline">{w.role}</span>
                  </div>
                  <div className="w-24"><ScoreBar score={w.performanceScore} /></div>
                  <div className="text-right min-w-[60px]">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${gradeCls(w.grade)}`}>{w.grade} · {w.performanceScore}%</span>
                  </div>
                </div>
              ))}
              {filteredWorkers.length === 0 && <p className="text-center text-outline text-xs py-6">No workers found</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'workers' && !loading && (
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface">Worker Performance Leaderboard</h2>
            <p className="text-[11px] text-outline">Click any worker row to view task & attendance breakdown</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-low border-b border-outline-variant">
                  {['#', 'Worker', 'Role', 'Tasks', 'Done', 'Overdue', 'Completion', 'Attendance', 'Score', 'Grade'].map(h => (
                    <th key={h} className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((w, i) => (
                  <tr
                    key={w._id}
                    onClick={() => openWorkerDetailModal(w)}
                    className="border-b border-outline-variant/30 hover:bg-surface-low cursor-pointer transition-colors group"
                    title={`Click to view detailed worker performance for ${w.name}`}
                  >
                    <td className="p-3"><div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${i < 3 ? 'bg-primary text-white' : 'bg-surface-container text-outline'}`}>{i + 1}</div></td>
                    <td className="p-3 font-semibold text-on-surface group-hover:text-primary transition-colors">{w.name}</td>
                    <td className="p-3 text-outline">{w.role}</td>
                    <td className="p-3 font-bold text-on-surface">{w.totalTasks}</td>
                    <td className="p-3 font-bold text-primary">{w.completed}</td>
                    <td className="p-3 font-bold text-error">{w.overdue}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16"><ScoreBar score={w.completionRate} /></div>
                        <span className="font-bold text-on-surface">{w.completionRate}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16"><ScoreBar score={w.attendanceRate} /></div>
                        <span className="font-bold text-on-surface">{w.attendanceRate}%</span>
                      </div>
                    </td>
                    <td className="p-3 font-extrabold text-primary">{w.performanceScore}</td>
                    <td className="p-3"><span className={`text-[10px] font-bold px-2.5 py-1 rounded ${gradeCls(w.grade)}`}>{w.grade}</span></td>
                  </tr>
                ))}
                {filteredWorkers.length === 0 && (
                  <tr><td colSpan="10" className="p-10 text-center text-outline">No workers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'heatmap' && !loading && (
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-on-surface">Attendance Heatmap</h2>
              <p className="text-[11px] text-outline">Click any date cell to view attendance details</p>
            </div>
            <div className="flex gap-3 items-center text-[11px] font-bold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/80" />Present</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-error/70" />Absent</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-secondary" />Leave</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-surface-container" />No Record</span>
            </div>
          </div>
          <div className="overflow-x-auto p-5">
            {heatmap.dates && heatmap.dates.length > 0 ? (
              <table className="text-[10px] border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left font-bold text-outline uppercase tracking-wider sticky left-0 bg-surface-lowest z-10 min-w-[120px]">Worker</th>
                    {heatmap.dates.map(d => {
                      const dt = new Date(d);
                      return <th key={d} className="p-1.5 text-center font-bold text-outline min-w-[32px]">
                        <div>{dt.getDate()}</div>
                        <div className="text-[8px] opacity-60">{dt.toLocaleString('default', { month: 'short' })}</div>
                      </th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.workers.map(row => (
                    <tr key={row.workerId}>
                      <td className="p-2 font-semibold text-on-surface sticky left-0 bg-surface-lowest z-10 whitespace-nowrap">{row.workerName}</td>
                      {heatmap.dates.map(d => (
                        <td key={d} className="p-1">
                          <div
                            onClick={() => openHeatmapCellModal(row.workerName, d, row.days[d])}
                            className={`w-7 h-7 rounded flex items-center justify-center text-[8px] font-bold cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${heatCls(row.days[d])}`}
                            title={`${row.workerName} · ${d} · ${row.days[d]} (Click for details)`}
                          >
                            {row.days[d] === 'Present' ? 'P' : row.days[d] === 'Absent' ? 'A' : row.days[d] === 'Leave' ? 'L' : '–'}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center text-outline text-sm">No attendance records found for the selected date range.</div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PERFORMANCE BREAKDOWN DRILL-DOWN MODAL */}
      {/* ------------------------------------------------------------- */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-lowest border border-outline-variant rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-low">
              <div>
                <h3 className="text-lg font-bold text-on-surface">{detailModal.title}</h3>
                <p className="text-xs text-outline mt-0.5">{detailModal.subtitle}</p>
              </div>
              <button
                onClick={() => setDetailModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined icon-sm">close</span>
              </button>
            </div>

            {/* Modal Calculation Formula Bar */}
            <div className="px-6 py-3 bg-primary/5 border-b border-primary/10 flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined icon-xs text-primary">functions</span>
                Formula: <span className="font-normal text-on-surface">{detailModal.formula}</span>
              </span>
              <button
                onClick={handleModalExportCSV}
                className="btn btn-outline btn-xs px-2.5 py-1 border border-primary/20 hover:bg-primary/10 text-primary text-[11px] font-bold rounded-sm flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined icon-xs">download</span>Export Breakdown CSV
              </button>
            </div>

            {/* Modal KPI Summary Cards */}
            {detailModal.kpis && detailModal.kpis.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-4 border-b border-outline-variant/30 bg-surface-lowest">
                {detailModal.kpis.map((kpiItem, idx) => (
                  <div key={idx} className="bg-surface-low border border-outline-variant/50 p-3 rounded text-center">
                    <div className="text-[10px] font-bold uppercase text-outline tracking-wider">{kpiItem.label}</div>
                    <div className={`text-base font-extrabold mt-1 ${kpiItem.color}`}>{kpiItem.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Source Records Data Table */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-2 text-[11px] font-bold text-outline uppercase tracking-wider">
                Contributing MongoDB Records ({detailModal.rows ? detailModal.rows.length : 0})
              </div>

              {!detailModal.rows || detailModal.rows.length === 0 ? (
                <div className="py-12 text-center text-xs text-outline border border-dashed border-outline-variant rounded">
                  No source database records found for this performance metric.
                </div>
              ) : detailModal.type === 'worker_list' ? (
                <div className="overflow-x-auto border border-outline-variant rounded">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-low border-b border-outline-variant font-bold text-outline uppercase tracking-wider text-[10px]">
                        <th className="p-2.5">Worker Name</th>
                        <th className="p-2.5">Role</th>
                        <th className="p-2.5">Tasks</th>
                        <th className="p-2.5">Done</th>
                        <th className="p-2.5">Completion Rate</th>
                        <th className="p-2.5">Attendance Rate</th>
                        <th className="p-2.5 text-right">Performance Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.rows.map((w, idx) => (
                        <tr key={w._id || idx} className="border-b border-outline-variant/20 hover:bg-surface-low">
                          <td className="p-2.5 font-bold text-on-surface">{w.name}</td>
                          <td className="p-2.5 text-outline">{w.role}</td>
                          <td className="p-2.5 font-bold text-on-surface">{w.totalTasks}</td>
                          <td className="p-2.5 font-bold text-primary">{w.completed}</td>
                          <td className="p-2.5 font-bold text-on-surface">{w.completionRate}%</td>
                          <td className="p-2.5 font-bold text-on-surface">{w.attendanceRate}%</td>
                          <td className="p-2.5 text-right font-extrabold text-primary">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${gradeCls(w.grade)}`}>{w.grade} · {w.performanceScore}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : detailModal.type === 'attendance_list' ? (
                <div className="overflow-x-auto border border-outline-variant rounded">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-low border-b border-outline-variant font-bold text-outline uppercase tracking-wider text-[10px]">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Worker Name</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Check In</th>
                        <th className="p-2.5">Check Out</th>
                        <th className="p-2.5 text-right">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.rows.map((a, idx) => (
                        <tr key={a._id || idx} className="border-b border-outline-variant/20 hover:bg-surface-low">
                          <td className="p-2.5 text-outline">{formatDateString(a.date)}</td>
                          <td className="p-2.5 font-bold text-on-surface">{(a.worker && a.worker.name) || 'Worker'}</td>
                          <td className="p-2.5 font-bold uppercase text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded ${a.status === 'Present' ? 'bg-primary/10 text-primary' : a.status === 'Absent' ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'}`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-outline">{a.checkInTime || 'N/A'}</td>
                          <td className="p-2.5 text-outline">{a.checkOutTime || 'N/A'}</td>
                          <td className="p-2.5 text-right text-outline">{a.location || 'Pune-A12'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto border border-outline-variant rounded">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-low border-b border-outline-variant font-bold text-outline uppercase tracking-wider text-[10px]">
                        <th className="p-2.5">Task Title</th>
                        <th className="p-2.5">Assigned Worker</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Priority</th>
                        <th className="p-2.5">Due Date</th>
                        <th className="p-2.5 text-right">Created Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.rows.map((t, idx) => (
                        <tr key={t._id || idx} className="border-b border-outline-variant/20 hover:bg-surface-low">
                          <td className="p-2.5 font-bold text-on-surface">{t.title}</td>
                          <td className="p-2.5 text-outline">{(t.assignedTo && t.assignedTo.name) || 'Unassigned'}</td>
                          <td className="p-2.5 font-bold uppercase text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded ${t.status === 'Completed' ? 'bg-primary/10 text-primary' : t.status === 'In Progress' ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-container text-outline'}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="p-2.5 uppercase font-bold text-[10px] text-outline">{t.priority || 'Medium'}</td>
                          <td className="p-2.5 text-outline">{formatDateString(t.dueDate)}</td>
                          <td className="p-2.5 text-right text-outline">{formatDateString(t.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-outline-variant bg-surface-low flex items-center justify-between">
              <span className="text-[11px] text-outline">Source: Live MongoDB performance query</span>
              <button
                onClick={() => setDetailModal(null)}
                className="btn btn-primary px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-sm hover:bg-primary-container transition-colors"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// KPI Tile Component (Clickable for drill-down)
const KPITile = ({ label, value, icon, color, sub, trend, onClick }) => (
  <div
    onClick={onClick}
    className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-150 group relative"
    title="Click to view contributing MongoDB records"
  >
    <div className="flex items-center justify-between mb-2">
      <div className="text-[11px] font-bold text-outline uppercase tracking-wider">{label}</div>
      <span className={`material-symbols-outlined icon-sm text-${color} group-hover:scale-110 transition-transform`}>{icon}</span>
    </div>
    <div className={`text-2xl font-extrabold text-${color === 'error' ? 'error' : 'on-surface'}`}>{value}</div>
    <div className="text-[11px] mt-1.5 flex items-center justify-between">
      <span className="flex items-center gap-1">
        {trend && <span className={`material-symbols-outlined icon-xs ${trend === 'up' ? 'text-primary' : 'text-error'}`}>{trend === 'up' ? 'trending_up' : 'trending_down'}</span>}
        <span className="text-on-surface-variant font-normal">{sub}</span>
      </span>
      <span className="text-[10px] text-primary/80 font-normal underline group-hover:text-primary">View ↗</span>
    </div>
  </div>
);

export default PerformanceReports;
