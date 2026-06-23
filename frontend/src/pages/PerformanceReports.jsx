import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const PerformanceReports = ({ searchVal, showToast, refreshTrigger }) => {
  const [kpi, setKpi] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [taskDist, setTaskDist] = useState([]);
  const [taskTrend, setTaskTrend] = useState([]);
  const [heatmap, setHeatmap] = useState({ dates: [], workers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const isInitialLoad = useRef(true);

  const getInitialDates = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const past = new Date(today);
    past.setMonth(past.getMonth() - 3);
    return {
      from: `${past.getFullYear()}-${String(past.getMonth()+1).padStart(2,'0')}-01`,
      to: `${yyyy}-${mm}-${dd}`
    };
  };

  const initialDates = getInitialDates();
  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);

  const fetchData = async () => {
    try {
      if (isInitialLoad.current) setLoading(true);
      setError(null);
      const params = { from: dateFrom, to: dateTo };
      const [kpiRes, workersRes, distRes, trendRes, heatmapRes] = await Promise.all([
        api.getPerformanceKPI(params),
        api.getWorkerPerformance(params),
        api.getTaskDistribution(params),
        api.getTaskTrend({ ...params, granularity: 'monthly' }),
        api.getAttendanceHeatmap(params)
      ]);
      if (kpiRes.success) setKpi(kpiRes.data);
      if (workersRes.success) setWorkers(workersRes.data);
      if (distRes.success) setTaskDist(distRes.data);
      if (trendRes.success) setTaskTrend(trendRes.data);
      if (heatmapRes.success) setHeatmap(heatmapRes.data);
    } catch (err) {
      console.error(err);
      if (isInitialLoad.current) {
        setError('Failed to load performance data. Check server connection.');
        showToast('Error loading performance reports', 'error');
      }
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  };

  useEffect(() => { fetchData(); }, [dateFrom, dateTo, refreshTrigger]);

  const handleExportCSV = async () => {
    try {
      const res = await api.getPerformanceExport({ from: dateFrom, to: dateTo });
      if (!res.success || !res.data.length) { showToast('No data to export', 'error'); return; }
      const headers = Object.keys(res.data[0]);
      const csvRows = [headers.join(',')];
      res.data.forEach(row => {
        csvRows.push(headers.map(h => `"${row[h] ?? ''}"`).join(','));
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `performance_report_${dateFrom}_${dateTo}.csv`;
      a.click(); URL.revokeObjectURL(url);
      showToast('CSV exported successfully!', 'success');
    } catch { showToast('Export failed', 'error'); }
  };

  const handleExportPDF = () => { window.print(); };

  const fmt = (n) => (n ?? 0).toLocaleString('en-IN');
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
    !searchVal || w.name.toLowerCase().includes(searchVal.toLowerCase())
  );

  // Donut chart for task distribution
  const totalTasks = taskDist.reduce((s, d) => s + d.value, 0);
  let accPct = 0;
  const donutSegs = taskDist.map(d => {
    const pct = totalTasks > 0 ? (d.value / totalTasks) * 100 : 0;
    const seg = {
      ...d, pct: Math.round(pct),
      dasharray: `${(pct / 100) * 389.6} 389.6`,
      dashoffset: -((accPct / 100) * 389.6)
    };
    accPct += pct;
    return seg;
  });

  // Task trend chart
  const trendMax = Math.max(...taskTrend.map(t => t.total), 1);
  const monthLabels = taskTrend.map(t => {
    const d = new Date(t.date + '-01');
    return d.toLocaleString('default', { month: 'short' });
  });

  // Score bar for worker performance
  const ScoreBar = ({ score, width = '100%' }) => (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ width, backgroundColor: 'var(--surface-container)' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{
        width: `${score}%`,
        background: score >= 80 ? 'var(--primary)' : score >= 60 ? 'var(--tertiary)' : score >= 40 ? '#e8a800' : 'var(--error)'
      }} />
    </div>
  );

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

      {/* KPI Tiles */}
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
            <KPITile label="Active Workers" value={fmt(kpi.totalWorkers)} icon="groups" color="primary" sub="Currently active" />
            <KPITile label="Total Tasks" value={fmt(kpi.totalTasks)} icon="task_alt" color="tertiary" sub={`${fmt(kpi.completedTasks)} completed`} />
            <KPITile label="Completion Rate" value={`${kpi.completionRate}%`} icon="trending_up" color="primary" sub="Tasks completed on time" trend={kpi.completionRate >= 70 ? 'up' : 'down'} />
            <KPITile label="Attendance Rate" value={`${kpi.attendanceRate}%`} icon="calendar_month" color="tertiary" sub="Overall presence rate" trend={kpi.attendanceRate >= 80 ? 'up' : 'down'} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPITile label="In Progress" value={fmt(kpi.inProgressTasks)} icon="pending_actions" color="secondary" sub="Currently active tasks" />
            <KPITile label="Pending" value={fmt(kpi.pendingTasks)} icon="hourglass_empty" color="secondary" sub="Awaiting start" />
            <KPITile label="Overdue Tasks" value={fmt(kpi.overdueTasks)} icon="warning" color="error" sub="Past due date" trend="down" />
            <KPITile label="Avg Completion" value={`${kpi.avgCompletionDays}d`} icon="schedule" color="primary" sub="Days per task" />
          </div>
        </>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-low border border-outline-variant rounded-md p-1 w-fit">
        {[['overview','Overview'],['workers','Worker Leaderboard'],['heatmap','Attendance Heatmap']].map(([key, label]) => (
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
                <h2 className="text-base font-bold text-on-surface">Task Completion Trend</h2>
                <div className="flex gap-3.5 items-center">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-primary"><span className="w-2.5 h-2.5 rounded-[3px] bg-primary" />Completed</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-tertiary"><span className="w-2.5 h-2.5 rounded-[3px] bg-tertiary" />In Progress</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-secondary"><span className="w-2.5 h-2.5 rounded-[3px] bg-secondary" />Pending</span>
                </div>
              </div>
              <div className="p-5">
                {taskTrend.length > 0 ? (
                  <div className="flex items-end gap-2 h-[200px] pb-8 relative">
                    {taskTrend.map((t, i) => (
                      <div key={t.date} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                        <div className="w-full flex items-end gap-0.5 justify-center">
                          <div className="w-2 md:w-3 bg-gradient-to-t from-primary/70 to-primary rounded-t-sm hover:brightness-110 cursor-pointer"
                            style={{ height: `${(t.completed / trendMax) * 100}%`, minHeight: t.completed ? '4px' : 0 }}>
                            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#213145] text-[#eaf1ff] text-[10px] font-bold px-1.5 py-1 rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 whitespace-nowrap">
                              {t.completed} done / {t.total} total
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
                      {monthLabels.map((m, i) => <span key={i}>{m}</span>)}
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
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-6 flex-wrap justify-center">
                  <div className="relative w-40 h-40 flex-shrink-0">
                    <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                      <circle cx="80" cy="80" r="62" fill="none" stroke="var(--surface-container-high)" strokeWidth="22" />
                      {donutSegs.map(seg => (
                        <circle key={seg.label} cx="80" cy="80" r="62" fill="none" stroke={seg.color} strokeWidth="22"
                          strokeDasharray={seg.dasharray} strokeDashoffset={seg.dashoffset} />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold text-on-surface">{fmt(totalTasks)}</span>
                      <span className="text-[10px] font-bold text-outline uppercase">Total</span>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-2 min-w-[120px] text-xs">
                    {donutSegs.map(seg => (
                      <div key={seg.label}>
                        <div className="flex items-center justify-between font-medium">
                          <span className="flex items-center gap-1.5 text-on-surface">
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
              <h2 className="text-base font-bold text-on-surface">Top Performers</h2>
              <button onClick={() => setActiveTab('workers')} className="text-xs font-semibold text-primary hover:underline">View All →</button>
            </div>
            <div className="p-5 flex flex-col">
              {filteredWorkers.slice(0, 5).map((w, i) => (
                <div key={w._id} className="flex items-center gap-3 py-2.5 border-b border-outline-variant/30 last:border-0">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold ${i < 3 ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-outline'}`}>{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-on-surface">{w.name}</p>
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
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-low border-b border-outline-variant">
                  {['#','Worker','Role','Tasks','Done','Overdue','Completion','Attendance','Score','Grade'].map(h => (
                    <th key={h} className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((w, i) => (
                  <tr key={w._id} className="border-b border-outline-variant/30 hover:bg-surface-low transition-colors">
                    <td className="p-3"><div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${i < 3 ? 'bg-primary text-white' : 'bg-surface-container text-outline'}`}>{i + 1}</div></td>
                    <td className="p-3 font-semibold text-on-surface">{w.name}</td>
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
            <h2 className="text-base font-bold text-on-surface">Attendance Heatmap</h2>
            <div className="flex gap-3 items-center text-[11px] font-bold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/80" />Present</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-error/70" />Absent</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-secondary" />Leave</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-surface-container" />No Record</span>
            </div>
          </div>
          <div className="overflow-x-auto p-5">
            {heatmap.dates.length > 0 ? (
              <table className="text-[10px] border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left font-bold text-outline uppercase tracking-wider sticky left-0 bg-surface-lowest z-10 min-w-[120px]">Worker</th>
                    {heatmap.dates.map(d => {
                      const dt = new Date(d);
                      return <th key={d} className="p-1.5 text-center font-bold text-outline min-w-[32px]">
                        <div>{dt.getDate()}</div>
                        <div className="text-[8px] opacity-60">{dt.toLocaleString('default',{month:'short'})}</div>
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
                          <div className={`w-7 h-7 rounded flex items-center justify-center text-[8px] font-bold ${heatCls(row.days[d])}`}
                            title={`${row.workerName} · ${d} · ${row.days[d]}`}>
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
    </div>
  );
};

// KPI Tile Component
const KPITile = ({ label, value, icon, color, sub, trend }) => (
  <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:-translate-y-0.5 transition-all duration-150">
    <div className="flex items-center justify-between mb-2">
      <div className="text-[11px] font-bold text-outline uppercase tracking-wider">{label}</div>
      <span className={`material-symbols-outlined icon-sm text-${color}`}>{icon}</span>
    </div>
    <div className={`text-2xl font-extrabold text-${color === 'error' ? 'error' : 'on-surface'}`}>{value}</div>
    <div className="text-[11px] mt-1.5 flex items-center gap-1">
      {trend && <span className={`material-symbols-outlined icon-xs ${trend === 'up' ? 'text-primary' : 'text-error'}`}>{trend === 'up' ? 'trending_up' : 'trending_down'}</span>}
      <span className="text-on-surface-variant font-normal">{sub}</span>
    </div>
  </div>
);

export default PerformanceReports;
