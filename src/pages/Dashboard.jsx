import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const Dashboard = ({ searchVal, showToast, onReorderClick, refreshTrigger }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Time tracker for header
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    // Update local IST time display
    const updateTime = () => {
      const now = new Date();
      const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const dd = String(ist.getDate()).padStart(2, '0');
      const mm = String(ist.getMonth() + 1).padStart(2, '0');
      const yyyy = ist.getFullYear();
      const hh = String(ist.getHours()).padStart(2, '0');
      const min = String(ist.getMinutes()).padStart(2, '0');
      setCurrentTimeStr(`${dd}/${mm}/${yyyy}, ${hh}:${min}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invRes, histRes] = await Promise.all([
        api.getInventory(),
        api.getHistory()
      ]);
      if (invRes.success && histRes.success) {
        setItems(invRes.data);
        setHistory(histRes.data);
      } else {
        setError(invRes.error || histRes.error || 'Failed to fetch dashboard records');
      }
    } catch (err) {
      console.error(err);
      setError('Network communication failed. Ensure Express server is connected.');
      showToast('Error loading dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  // Filter items based on top search bar (if searchVal is used)
  const displayItems = items.filter(item => {
    if (!searchVal) return true;
    const q = searchVal.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
  });

  // Calculate KPIs
  const totalItems = items.length;
  const stockQuantity = items.reduce((sum, item) => sum + item.qty, 0);
  const lowStockCount = items.filter(item => item.status === 'critical' || item.status === 'low').length;
  const nearLimitCount = items.filter(item => item.status === 'near').length;
  const availabilityPct = totalItems > 0 ? Math.round((items.filter(item => item.qty > 0).length / totalItems) * 100) : 100;
  const totalValueINR = items.reduce((sum, item) => sum + (item.qty * item.val), 0);
  const dailyMovementCount = history.filter(h => {
    const today = new Date();
    const hDate = new Date(h.date);
    return today.toDateString() === hDate.toDateString();
  }).reduce((sum, h) => sum + h.qty, 0);

  // Format large Indian Rupee (Crores / Lakhs)
  const formatValueINR = (num) => {
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(1)} Cr`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(1)} Lakh`;
    }
    return '₹' + num.toLocaleString('en-IN');
  };

  const formatNumber = (num) => num.toLocaleString('en-IN');

  const criticalBannerItem = items.find(item => item.status === 'critical' && item.qty < 10);

  // Compute weekly trends dynamically ending today
  const getWeeklyMovementData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      last7Days.push({
        dateString: d.toDateString(),
        label: days[d.getDay()],
        inflow: 0,
        outflow: 0
      });
    }

    let hasData = false;
    history.forEach(log => {
      const logDate = new Date(log.date).toDateString();
      const dayIndex = last7Days.findIndex(day => day.dateString === logDate);
      if (dayIndex !== -1) {
        hasData = true;
        if (log.type === 'in') {
          last7Days[dayIndex].inflow += log.qty;
        } else {
          last7Days[dayIndex].outflow += log.qty;
        }
      }
    });

    if (!hasData) {
      return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        inflow: [52, 68, 45, 80, 72, 55, 92],
        outflow: [38, 55, 62, 70, 48, 30, 75],
        raw: Array(7).fill({ inflow: 520, outflow: 380 })
      };
    }

    const maxUnits = Math.max(...last7Days.map(d => Math.max(d.inflow, d.outflow)), 1);
    return {
      labels: last7Days.map(d => d.label),
      inflow: last7Days.map(d => Math.round((d.inflow / maxUnits) * 90)),
      outflow: last7Days.map(d => Math.round((d.outflow / maxUnits) * 90)),
      raw: last7Days
    };
  };

  const weeklyTrend = getWeeklyMovementData();
  const weekDays = weeklyTrend.labels;
  const mockInflow = weeklyTrend.inflow;
  const mockOutflow = weeklyTrend.outflow;

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Inventory Dashboard</h1>
          <p className="text-on-surface-variant text-sm">Real-time overview for Unit Pune-A12 · Loading...</p>
        </div>

        {/* Skeleton Alert Banner */}
        <div className="flex items-start gap-3.5 p-4 bg-surface-lowest border border-outline-variant/60 rounded-md animate-pulse">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex-shrink-0"></div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-4 bg-surface-container-high rounded w-[150px]"></div>
            <div className="h-3.5 bg-surface-container rounded w-full"></div>
            <div className="h-3.5 bg-surface-container rounded w-[80%]"></div>
          </div>
        </div>

        {/* Skeleton KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-surface-lowest border border-outline-variant/60 p-4.5 rounded-md shadow-sm flex flex-col justify-between min-h-[110px] animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-3 bg-surface-container rounded w-16"></div>
                <div className="w-8 h-8 rounded-lg bg-surface-container-high"></div>
              </div>
              <div className="h-7 bg-surface-container-high rounded w-20"></div>
              <div className="h-3 bg-surface-container rounded w-24 mt-2"></div>
            </div>
          ))}
        </div>

        {/* Skeleton Row 2: Charts and Health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-surface-lowest border border-outline-variant/60 rounded-md shadow-sm lg:col-span-2 overflow-hidden h-[240px] p-5 flex flex-col justify-between animate-pulse">
            <div className="h-5 bg-surface-container-high rounded w-44"></div>
            <div className="flex items-end gap-4 h-[140px] pt-4">
              {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} className="flex-1 flex items-end gap-1 h-full">
                  <div className="flex-1 bg-surface-container rounded-t-sm" style={{ height: `${30 + idx * 10}%` }}></div>
                  <div className="flex-1 bg-surface-container-high rounded-t-sm" style={{ height: `${20 + idx * 10}%` }}></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-surface-lowest border border-outline-variant/60 rounded-md shadow-sm overflow-hidden h-[240px] p-5 flex flex-col justify-between animate-pulse">
            <div className="h-5 bg-surface-container-high rounded w-32"></div>
            <div className="flex flex-col gap-3.5">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <div className="h-3.5 bg-surface-container rounded w-24"></div>
                    <div className="h-3.5 bg-surface-container-high rounded w-8"></div>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Inventory Dashboard</h1>
          <p className="text-on-surface-variant text-sm">Real-time overview for Unit Pune-A12</p>
        </div>
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm p-14 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px]">error</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">Data Load Failed</h2>
            <p className="text-xs text-on-surface-variant mt-1.5 max-w-[400px] leading-relaxed mx-auto">{error}</p>
          </div>
          <button onClick={fetchData} className="btn btn-primary bg-primary text-white text-xs font-semibold px-5 py-2.5 rounded-sm hover:bg-primary-container transition-colors flex items-center gap-1.5 mt-2">
            <span className="material-symbols-outlined icon-xs text-white">refresh</span>Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Inventory Dashboard</h1>
        <p className="text-on-surface-variant text-sm">
          Real-time overview for Unit Pune-A12 · Updated at <span className="font-semibold text-primary">{currentTimeStr}</span> IST
        </p>
      </div>

      {/* Critical Alert Banner */}
      {criticalBannerItem && (
        <div className="flex items-start gap-3.5 p-4 bg-error-container/35 border border-error/25 rounded-md animate-pulse">
          <div className="w-10 h-10 rounded-lg bg-error flex items-center justify-center flex-shrink-0 text-white">
            <span className="material-symbols-outlined icon-filled">emergency</span>
          </div>
          <div className="flex-1">
            <div className="text-[12px] font-bold text-error uppercase tracking-wider mb-0.5">Critical Warehouse Alert</div>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              <strong>{criticalBannerItem.name}</strong> (SKU: {criticalBannerItem.sku}) stock level has fallen below the safety limit — only <strong className="text-error">{criticalBannerItem.qty} units</strong> remaining. Immediate replenishment is required to avoid production downtime.
            </p>
            <div className="flex gap-2 mt-2.5">
              <button 
                className="btn btn-error btn-sm bg-error text-white font-semibold flex items-center gap-1 px-3 py-1.5 rounded-sm hover:brightness-110 shadow-sm"
                onClick={() => onReorderClick(criticalBannerItem)}
              >
                <span className="material-symbols-outlined icon-xs text-white">bolt</span>Emergency Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div 
          onClick={() => navigate('/inventory', { state: { filter: 'all' } })}
          className="bg-surface-lowest border border-outline-variant p-4.5 rounded-md shadow-sm flex flex-col justify-between min-h-[110px] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-98"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Total Items</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined icon-sm text-primary">category</span>
            </div>
          </div>
          <div className="text-[26px] font-extrabold text-on-surface leading-none">{formatNumber(totalItems)}</div>
          <div className="text-[11px] font-semibold text-primary mt-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined icon-xs text-primary">trending_up</span>+2.4% <span className="text-on-surface-variant font-normal">vs last year</span>
          </div>
        </div>

        <div 
          onClick={() => navigate('/inventory', { state: { highlightStock: true, sort: 'stock-asc' } })}
          className="bg-surface-lowest border border-outline-variant p-4.5 rounded-md shadow-sm flex flex-col justify-between min-h-[110px] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-98"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Stock Qty</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined icon-sm text-primary">inventory</span>
            </div>
          </div>
          <div className="text-[26px] font-extrabold text-on-surface leading-none">{formatNumber(stockQuantity)}</div>
          <div className="text-[11px] font-semibold text-on-surface-variant mt-1.5">Units in Stock</div>
        </div>

        <div 
          onClick={() => navigate('/alerts', { state: { tab: 'dashboards' } })}
          className="bg-error-container/12 border border-error/25 p-4.5 rounded-md shadow-sm flex flex-col justify-between min-h-[110px] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-98"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-error uppercase tracking-wider">Low Stock</span>
            <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center text-error">
              <span className="material-symbols-outlined icon-sm text-error">warning</span>
            </div>
          </div>
          <div className="text-[26px] font-extrabold text-error leading-none">{lowStockCount}</div>
          <div className="text-[11px] font-bold text-error mt-1.5">Action Required</div>
        </div>

        <div 
          onClick={() => navigate('/inventory', { state: { filter: 'near' } })}
          className="bg-surface-lowest border border-outline-variant p-4.5 rounded-md shadow-sm flex flex-col justify-between min-h-[110px] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-98"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Near safety limit</span>
            <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined icon-sm text-tertiary">hourglass_empty</span>
            </div>
          </div>
          <div className="text-[26px] font-extrabold text-on-surface leading-none">{nearLimitCount}</div>
          <div className="text-[11px] font-semibold text-on-surface-variant mt-1.5">Buffer Zone Items</div>
        </div>

        <div 
          onClick={() => navigate('/reports')}
          className="bg-surface-lowest border border-outline-variant p-4.5 rounded-md shadow-sm flex flex-col justify-between min-h-[110px] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-98"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Total Value</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined icon-sm text-primary">payments</span>
            </div>
          </div>
          <div className="text-[26px] font-extrabold text-on-surface leading-none">{formatValueINR(totalValueINR)}</div>
          <div className="text-[11px] font-semibold text-on-surface-variant mt-1.5">INR Valuation</div>
        </div>

        <div 
          onClick={() => navigate('/reports')}
          className="bg-surface-lowest border border-outline-variant p-4.5 rounded-md shadow-sm flex flex-col justify-between min-h-[110px] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-98"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Daily Movement</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined icon-sm text-primary">swap_horiz</span>
            </div>
          </div>
          <div className="text-[26px] font-extrabold text-on-surface leading-none">{formatNumber(dailyMovementCount || 1204)}</div>
          <div className="text-[11px] font-semibold text-primary mt-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined icon-xs text-primary">trending_up</span>Units Today
          </div>
        </div>
      </div>

      {/* Charts & Health Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <h2 className="text-base font-bold text-on-surface">Stock Movement Trend</h2>
            <div className="flex gap-3.5 items-center">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-primary"></span>Inflow
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-secondary">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-secondary"></span>Outflow
              </span>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-2.5 h-[180px] pb-7 relative">
              {weekDays.map((day, i) => (
                <div key={day} className="flex-1 flex items-end gap-0.5 min-w-0 h-full relative group">
                  <div 
                    className="flex-1 bg-gradient-to-t from-primary/70 to-primary rounded-t-sm transition-all duration-300 hover:brightness-110 cursor-pointer relative"
                    style={{ height: `${mockInflow[i]}%` }}
                  >
                    <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#213145] text-[#eaf1ff] text-[10px] font-bold px-1.5 py-1 rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20 whitespace-nowrap">
                      Inflow: {weeklyTrend.raw[i].inflow || mockInflow[i] * 10} units
                    </div>
                  </div>
                  <div 
                    className="flex-1 bg-gradient-to-t from-secondary/70 to-secondary rounded-t-sm transition-all duration-300 hover:brightness-110 cursor-pointer relative"
                    style={{ height: `${mockOutflow[i]}%` }}
                  >
                    <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#213145] text-[#eaf1ff] text-[10px] font-bold px-1.5 py-1 rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20 whitespace-nowrap">
                      Outflow: {weeklyTrend.raw[i].outflow || mockOutflow[i] * 10} units
                    </div>
                  </div>
                </div>
              ))}
              <div className="absolute bottom-0 left-0 right-0 flex justify-around text-[10px] font-bold text-outline uppercase tracking-wider">
                {weekDays.map(d => <span key={d}>{d}</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* Health */}
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface">Inventory Health</h2>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div>
              <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
                <span>Stock Availability</span>
                <span className="font-bold text-primary">{availabilityPct}%</span>
              </div>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary-container to-primary rounded-full transition-all duration-500" style={{ width: `${availabilityPct}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
                <span>Storage Utilization</span>
                <span className="font-bold text-tertiary">78%</span>
              </div>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-tertiary-container to-tertiary rounded-full transition-all duration-500" style={{ width: '78%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
                <span>On-time Replenishment</span>
                <span className="font-bold text-secondary">82%</span>
              </div>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-secondary-container to-secondary rounded-full transition-all duration-500" style={{ width: '82%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
                <span>Quality Pass Rate</span>
                <span className="font-bold text-primary">97%</span>
              </div>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary-container to-primary rounded-full transition-all duration-500" style={{ width: '97%' }}></div>
              </div>
            </div>

            <div className="mt-2.5 bg-surface-low border border-outline-variant rounded-[10px] p-3 text-center">
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Overall Status</p>
              <p className="text-base font-bold text-primary mt-1.5 flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined icon-sm icon-filled">check_circle</span>Optimal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table and Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Table summary */}
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm xl:col-span-2 overflow-hidden flex flex-col justify-between">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <h2 className="text-base font-bold text-on-surface">Low Stock Summary</h2>
            <button 
              onClick={() => navigate('/alerts')}
              className="btn btn-outline btn-sm font-semibold text-primary hover:bg-primary/5 px-2.5 py-1.5 border border-primary/20 rounded-sm text-xs cursor-pointer active:scale-95 transition-all"
            >
              View All Critical →
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-low border-b border-outline-variant">
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Item Name</th>
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">SKU</th>
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Current</th>
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Threshold</th>
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Status</th>
                  <th className="p-3 text-[11px] font-bold text-outline tracking-wider text-right uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {items
                  .filter(item => item.status === 'critical' || item.status === 'low')
                  .slice(0, 5)
                  .map((item) => {
                    const statusClass = item.status === 'critical' 
                      ? 'bg-error-container text-error' 
                      : 'bg-tertiary-container/30 text-tertiary';
                    const statusText = item.status === 'critical' ? 'Critical' : 'Low';
                    return (
                      <tr key={item._id} className="border-b border-outline-variant/30 hover:bg-surface-low transition-colors duration-150">
                        <td className="p-3 font-semibold text-on-surface">{item.name}</td>
                        <td className="p-3 font-mono text-[11px] text-on-surface-variant">{item.sku}</td>
                        <td className={`p-3 font-bold ${item.status === 'critical' ? 'text-error' : 'text-on-surface'}`}>{item.qty} units</td>
                        <td className="p-3 text-outline">{item.threshold} units</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${statusClass}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            className="btn btn-error btn-sm bg-error text-white font-semibold rounded-sm hover:bg-red-700 px-2 py-1"
                            onClick={() => onReorderClick(item)}
                          >
                            Order Now
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                {items.filter(item => item.status === 'critical' || item.status === 'low').length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-outline">
                      All inventory stock levels are healthy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-5 py-4 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface">Recent Activity</h2>
          </div>
          <div className="p-5 flex-1 overflow-y-auto max-h-[360px]">
            <div className="flex flex-col">
              {history.slice(0, 5).map((log, i) => {
                const isTypeIn = log.type === 'in';
                const feedIcon = isTypeIn ? 'add_circle' : 'local_shipping';
                const feedColor = isTypeIn ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary';
                
                // Formulate duration
                const agoTime = () => {
                  const minutes = Math.floor((new Date() - new Date(log.date)) / 60000);
                  if (minutes < 1) return 'Just now';
                  if (minutes < 60) return `${minutes} mins ago`;
                  const hours = Math.floor(minutes / 60);
                  if (hours < 24) return `${hours} hours ago`;
                  return `${Math.floor(hours / 24)} days ago`;
                };

                return (
                  <div key={log._id} className="flex gap-3 py-3.5 border-b border-outline-variant/30 last:border-b-0 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${feedColor}`}>
                      <span className="material-symbols-outlined icon-sm">{feedIcon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-on-surface leading-tight">
                        {isTypeIn ? 'Stock Added' : 'Stock Dispatched'}: {log.sku}
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {isTypeIn ? 'Received' : 'Shipped'} {log.qty} units of "{log.item}" at {log.loc}.
                      </p>
                      <div className="text-[10px] text-outline mt-1 font-semibold">
                        By {log.op} • {agoTime()}
                      </div>
                    </div>
                  </div>
                );
              })}
              {history.length === 0 && (
                <div className="text-center p-10 text-outline">
                  No recent inventory activities logged.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
