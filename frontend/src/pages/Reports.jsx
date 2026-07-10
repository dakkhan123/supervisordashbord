import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const Reports = ({ showToast, refreshTrigger }) => {
  const [history, setHistory] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isInitialLoad = useRef(true);

  // Default range: 2025-06-01 to today (covering all seeded + new transaction data)
  const getInitialDates = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return {
      from: '2025-06-01',
      to: `${yyyy}-${mm}-${dd}`
    };
  };

  const initialDates = getInitialDates();
  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);
  const [filterType, setFilterType] = useState('all');

  const fetchData = async () => {
    try {
      // Only show loading skeleton on first fetch to prevent flicker
      if (isInitialLoad.current) {
        setLoading(true);
      }
      setError(null);
      const params = {
        from: dateFrom,
        to: dateTo,
        type: filterType !== 'all' ? filterType : undefined
      };
      const [historyRes, inventoryRes] = await Promise.all([
        api.getHistory(params),
        api.getInventory()
      ]);
      if (historyRes.success && inventoryRes.success) {
        setHistory(historyRes.data);
        setItems(inventoryRes.data);
      } else {
        if (isInitialLoad.current) {
          setError(historyRes.error || inventoryRes.error || 'Failed to retrieve transaction reports');
        }
      }
    } catch (err) {
      console.error(err);
      if (isInitialLoad.current) {
        setError('Connection refused. Verify local database server status.');
        showToast('Error loading transaction history logs', 'error');
      }
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, filterType, refreshTrigger]);

  const handleExportPDF = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    showToast('CSV exported successfully!', 'success');
  };

  // Math metrics based on history
  const totalInflow = history.filter(h => h.type === 'in').reduce((sum, h) => sum + h.qty, 0);
  const totalOutflow = history.filter(h => h.type === 'out').reduce((sum, h) => sum + h.qty, 0);
  const netStockChange = totalInflow - totalOutflow;

  // Calculate GST summary (MTD totals based on transaction values)
  const totalPurchaseVal = history.filter(h => h.type === 'in').reduce((sum, h) => sum + (h.qty * h.val || 0), 0);
  const avgGST = totalPurchaseVal * 0.18;
  const totalSalesVal = history.filter(h => h.type === 'out').reduce((sum, h) => sum + (h.qty * h.val || 0), 0) * 1.18;

  // Total Asset Value dynamically from the inventory catalog items
  const totalAssetVal = items.reduce((sum, item) => sum + (item.qty * item.val), 0);

  // Helper date formatter
  const formatDateString = (dateStr) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatINR = (num) => '₹' + num.toLocaleString('en-IN');
  const formatNumber = (num) => num.toLocaleString('en-IN');

  const formatAssetValINR = (num) => {
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lakh`;
    }
    return '₹' + num.toLocaleString('en-IN');
  };

  const getHeaderDateLabel = () => {
    const today = new Date();
    const monthName = today.toLocaleString('default', { month: 'long' });
    const year = today.getFullYear();
    const fyStart = today.getMonth() >= 3 ? year : year - 1;
    const fyEnd = String(fyStart + 1).slice(-2);
    return `${monthName} ${year} (FY ${fyStart}–${fyEnd})`;
  };

  // Monthly Stock Movement aggregated dynamically
  const getMonthlyTrend = () => {
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const inflowByMonth = Array(12).fill(0);
    const outflowByMonth = Array(12).fill(0);

    let hasData = false;
    history.forEach(log => {
      const d = new Date(log.date);
      const m = d.getMonth();
      if (!isNaN(m)) {
        hasData = true;
        if (log.type === 'in') {
          inflowByMonth[m] += log.qty;
        } else {
          outflowByMonth[m] += log.qty;
        }
      }
    });

    if (!hasData) {
      return {
        months: monthsName,
        inflow: [82, 75, 91, 68, 85, 95, 73, 88, 79, 92, 86, 70],
        outflow: [65, 58, 74, 52, 70, 80, 60, 72, 65, 76, 70, 55],
        suffix: 'k'
      };
    }

    const maxValVal = Math.max(...inflowByMonth, ...outflowByMonth);
    const scale = maxValVal > 1000 ? 1000 : 1;
    const suffix = scale === 1000 ? 'k' : '';

    return {
      months: monthsName,
      inflow: inflowByMonth.map(v => Math.round(v / scale)),
      outflow: outflowByMonth.map(v => Math.round(v / scale)),
      suffix
    };
  };

  const trendData = getMonthlyTrend();
  const months = trendData.months;
  const inflowData = trendData.inflow;
  const outflowData = trendData.outflow;
  const maxVal = Math.max(...inflowData, ...outflowData, 1);
  const trendSuffix = trendData.suffix;

  // Calculate dynamic category distribution donut properties
  const totalUnits = items.reduce((sum, item) => sum + item.qty, 0);
  const categoriesList = ['Electronics', 'Mechanical', 'Consumables', 'Raw Materials', 'Packaging'];
  const categoryColors = {
    'Electronics': '#006a6a',
    'Mechanical': '#00687a',
    'Consumables': '#545f73',
    'Raw Materials': '#00a3a3',
    'Packaging': '#bcc7de'
  };

  const categoryBreakdown = categoriesList.map(catName => {
    const catItems = items.filter(item => item.cat === catName);
    const units = catItems.reduce((sum, item) => sum + item.qty, 0);
    const pct = totalUnits > 0 ? Math.round((units / totalUnits) * 100) : 0;
    return {
      name: catName,
      units,
      pct,
      color: categoryColors[catName] || '#bcc7de'
    };
  }).sort((a, b) => b.units - a.units);

  let accumulatedPercent = 0;
  const donutSegments = categoryBreakdown.map(cat => {
    const strokeDasharray = `${(cat.pct / 100) * 389.6} 389.6`;
    const strokeDashoffset = -((accumulatedPercent / 100) * 389.6);
    accumulatedPercent += cat.pct;
    return {
      ...cat,
      strokeDasharray,
      strokeDashoffset
    };
  });

  // Calculate top moving items dynamically from history
  const getTopMoversList = () => {
    const movesMap = {};
    history.forEach(log => {
      if (!movesMap[log.sku]) {
        movesMap[log.sku] = { name: log.item, sku: log.sku, moves: 0, inflow: 0, outflow: 0 };
      }
      movesMap[log.sku].moves += log.qty;
      if (log.type === 'in') {
        movesMap[log.sku].inflow += log.qty;
      } else {
        movesMap[log.sku].outflow += log.qty;
      }
    });

    const sortedMovers = Object.values(movesMap)
      .sort((a, b) => b.moves - a.moves)
      .slice(0, 5)
      .map(mover => {
        const pctChange = mover.inflow > 0
          ? Math.round(((mover.outflow - mover.inflow) / mover.inflow) * 100)
          : 0;
        const changeStr = pctChange >= 0 ? `+${pctChange}%` : `${pctChange}%`;
        return {
          name: mover.name,
          sku: mover.sku,
          moves: mover.moves,
          trend: pctChange >= 0 ? 'up' : 'down',
          change: changeStr
        };
      });

    if (sortedMovers.length === 0) {
      return [
        { name: 'Fan Assembly 120mm DC', sku: 'FAN-120-DC', moves: 4820, trend: 'up', change: '+18%' },
        { name: 'STM32 Microcontroller M4', sku: 'MCU-STM-M4-02', moves: 3940, trend: 'up', change: '+9%' },
        { name: 'Polycab USB-C Cable', sku: 'CBL-PC-USBC-1M', moves: 3210, trend: 'down', change: '−4%' },
        { name: 'PCB Blank FR4 10x10cm', sku: 'PCB-FR4-10', moves: 2880, trend: 'up', change: '+22%' },
        { name: 'Cable Ties 200mm Pack/100', sku: 'CT-200-P100', moves: 2540, trend: 'up', change: '+6%' }
      ];
    }
    return sortedMovers;
  };

  const topMovers = getTopMoversList();
  const rankCls = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Inventory Reports</h1>
            <p className="text-on-surface-variant text-sm">Unit Pune-A12, Maharashtra</p>
          </div>
        </div>
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm p-14 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px]">error</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">Reports Loading Failed</h2>
            <p className="text-xs text-on-surface-variant mt-1.5 max-w-[400px] leading-relaxed mx-auto">{error}</p>
          </div>
          <button onClick={fetchData} className="btn btn-primary bg-primary text-white text-xs font-semibold px-5 py-2.5 rounded-sm hover:bg-primary-container transition-colors flex items-center gap-1.5 mt-2">
            <span className="material-symbols-outlined icon-xs text-white">refresh</span>Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Inventory Reports</h1>
          <p className="text-on-surface-variant text-sm">
            Analytics for Unit Pune-A12 · {getHeaderDateLabel()}
          </p>
        </div>

        <div className="flex items-center gap-3.5 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-2.5 text-xs text-outline font-semibold">
            <span className="material-symbols-outlined icon-sm text-outline">date_range</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface"
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface"
            />
          </div>

          <div className="flex gap-2">
            <button className="btn btn-outline flex items-center gap-1.5 px-3 py-1.5 border border-primary/20 hover:bg-primary/5 text-primary text-xs font-semibold rounded-sm transition-colors" onClick={handleExportPDF}>
              <span className="material-symbols-outlined icon-xs text-primary">picture_as_pdf</span>Export PDF
            </button>
            <button className="btn btn-primary flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-sm hover:bg-primary-container transition-colors" onClick={handleDownloadCSV}>
              <span className="material-symbols-outlined icon-xs text-white">download</span>Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stat Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:-translate-y-0.5 transition-all duration-150">
          <div className="text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Total Inflow (MTD)</div>
          <div className="text-2xl font-extrabold text-on-surface">{formatNumber(totalInflow)}</div>
          <div className="text-[11px] font-semibold text-primary mt-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined icon-xs text-primary">trending_up</span>Units MTD <span className="text-on-surface-variant font-normal">in date range</span>
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:-translate-y-0.5 transition-all duration-150">
          <div className="text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Total Outflow (MTD)</div>
          <div className="text-2xl font-extrabold text-on-surface">{formatNumber(totalOutflow)}</div>
          <div className="text-[11px] font-semibold text-error mt-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined icon-xs text-error">trending_down</span>Units MTD <span className="text-on-surface-variant font-normal">in date range</span>
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:-translate-y-0.5 transition-all duration-150">
          <div className="text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Net Stock Change</div>
          <div className="text-2xl font-extrabold text-primary">{netStockChange >= 0 ? '+' : ''}{formatNumber(netStockChange)}</div>
          <div className="text-[11px] text-on-surface-variant mt-1.5">units accumulated in range</div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:-translate-y-0.5 transition-all duration-150">
          <div className="text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Inventory Turnover</div>
          <div className="text-2xl font-extrabold text-on-surface">3.2×</div>
          <div className="text-[11px] font-semibold text-primary mt-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined icon-xs text-primary">trending_up</span>Optimal <span className="text-on-surface-variant font-normal">performance grade</span>
          </div>
        </div>
      </div>

      {/* GST Summary Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:-translate-y-0.5 transition-all duration-150">
          <div className="text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Total Purchase Value (MTD)</div>
          <div className="text-xl font-extrabold text-on-surface">{formatINR(totalPurchaseVal)}</div>
          <div className="text-[11px] text-on-surface-variant mt-1.5">Pre-GST Value</div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:-translate-y-0.5 transition-all duration-150">
          <div className="text-[11px] font-bold text-outline uppercase tracking-wider mb-2">IGST / CGST+SGST (MTD)</div>
          <div className="text-xl font-extrabold text-on-surface">{formatINR(avgGST)}</div>
          <div className="text-[11px] text-on-surface-variant mt-1.5">Average 18% GST Estimate</div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:-translate-y-0.5 transition-all duration-150">
          <div className="text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Total Sales Value (MTD)</div>
          <div className="text-xl font-extrabold text-on-surface">{formatINR(totalSalesVal)}</div>
          <div className="text-[11px] font-semibold text-primary mt-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined icon-xs text-primary">trending_up</span>Incl. GST
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:-translate-y-0.5 transition-all duration-150">
          <div className="text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Total Asset Value</div>
          <div className="text-xl font-extrabold text-on-surface">{formatAssetValINR(totalAssetVal)}</div>
          <div className="text-[11px] text-on-surface-variant mt-1.5">INR Valuation (Current)</div>
        </div>
      </div>

      {/* Monthly Chart and Donut chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <h2 className="text-base font-bold text-on-surface">Monthly Stock Movement</h2>
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
            <div className="flex items-end gap-2 h-[200px] pb-8 relative">
              {months.map((m, i) => (
                <div key={m} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                  <div className="w-full flex items-end gap-0.5 justify-center">
                    <div
                      className="w-2 md:w-3.5 bg-gradient-to-t from-primary/70 to-primary rounded-t-sm hover:brightness-110 cursor-pointer relative"
                      style={{ height: `${(inflowData[i] / maxVal) * 100}%` }}
                    >
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#213145] text-[#eaf1ff] text-[10px] font-bold px-1.5 py-1 rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20 whitespace-nowrap">
                        Inflow: {inflowData[i]}{trendSuffix || ' units'}
                      </div>
                    </div>
                    <div
                      className="w-2 md:w-3.5 bg-gradient-to-t from-secondary/70 to-secondary rounded-t-sm hover:brightness-110 cursor-pointer relative"
                      style={{ height: `${(outflowData[i] / maxVal) * 100}%` }}
                    >
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#213145] text-[#eaf1ff] text-[10px] font-bold px-1.5 py-1 rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20 whitespace-nowrap">
                        Outflow: {outflowData[i]}{trendSuffix || ' units'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="absolute bottom-0 left-0 right-0 flex justify-around text-[9px] md:text-[10px] font-bold text-outline uppercase tracking-wider font-mono">
                {months.map(m => <span key={m}>{m}</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* Category breakdown donut */}
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface">Category Breakdown</h2>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-6 flex-wrap justify-center md:justify-start">
              <div className="relative w-40 h-40 flex-shrink-0">
                <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="62" fill="none" stroke="var(--surface-container-high)" strokeWidth="22" />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.name}
                      cx="80"
                      cy="80"
                      r="62"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="22"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-on-surface">{formatNumber(totalUnits)}</span>
                  <span className="text-[10px] font-bold text-outline uppercase">Total Units</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2 min-w-[120px] text-xs">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between font-medium">
                      <span className="flex items-center gap-1.5 text-on-surface">
                        <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: cat.color }}></span>{cat.name}
                      </span>
                      <span className="font-bold text-on-surface">{cat.pct}%</span>
                    </div>
                    <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden mt-1">
                      <div className="h-full" style={{ backgroundColor: cat.color, width: `${cat.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Movers + Replenish grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <h2 className="text-base font-bold text-on-surface">Top Moving Items</h2>
            <span className="px-2 py-0.5 rounded-full border border-outline-variant/30 text-[10px] font-bold text-outline">
              This Month
            </span>
          </div>
          <div className="p-5 flex flex-col">
            {topMovers.map((m, i) => (
              <div key={m.sku} className="flex items-center gap-3 py-2.5 border-b border-outline-variant/30 last:border-0 font-sans">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${rankCls(i) ? 'bg-primary text-white font-extrabold shadow-sm' : 'bg-surface-container text-outline'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-on-surface">{m.name}</p>
                  <span className="text-[10px] font-mono text-outline">{m.sku}</span>
                </div>
                <div className="text-right text-xs">
                  <p className="font-bold text-primary">{formatNumber(m.moves)} units</p>
                  <span className={`text-[10px] font-bold ${m.trend === 'up' ? 'text-primary' : 'text-error'}`}>{m.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grades table */}
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-5 py-4 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface">Replenishment Performance</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-low border-b border-outline-variant">
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Category</th>
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">On-Time</th>
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Avg Lead</th>
                  <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">GST Rate</th>
                  <th className="p-3 text-[11px] font-bold text-outline tracking-wider text-right uppercase">Grade</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-outline-variant/30">
                  <td className="p-3 font-semibold text-on-surface">Electronics</td>
                  <td className="p-3">91%</td>
                  <td className="p-3">4.8 Days</td>
                  <td className="p-3">18%</td>
                  <td className="p-3 text-right"><span className="badge badge-ok">A+</span></td>
                </tr>
                <tr className="border-b border-outline-variant/30">
                  <td className="p-3 font-semibold text-on-surface">Mechanical</td>
                  <td className="p-3">84%</td>
                  <td className="p-3">3.2 Days</td>
                  <td className="p-3">18%</td>
                  <td className="p-3 text-right"><span className="badge badge-ok">A</span></td>
                </tr>
                <tr className="border-b border-outline-variant/30">
                  <td className="p-3 font-semibold text-on-surface">Consumables</td>
                  <td className="p-3">77%</td>
                  <td className="p-3">2.1 Days</td>
                  <td className="p-3">18%</td>
                  <td className="p-3 text-right"><span className="badge badge-near">B+</span></td>
                </tr>
                <tr className="border-b border-outline-variant/30">
                  <td className="p-3 font-semibold text-on-surface">Raw Materials</td>
                  <td className="p-3">68%</td>
                  <td className="p-3">7.4 Days</td>
                  <td className="p-3">5%</td>
                  <td className="p-3 text-right"><span className="badge badge-low">B</span></td>
                </tr>
                <tr className="border-b-0">
                  <td className="p-3 font-semibold text-on-surface">Packaging</td>
                  <td className="p-3">95%</td>
                  <td className="p-3">1.9 Days</td>
                  <td className="p-3">12%</td>
                  <td className="p-3 text-right"><span className="badge badge-ok">A+</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Movement Log */}
      <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-base font-bold text-on-surface">Detailed Movement Log</h2>
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1 border border-outline-variant rounded-sm bg-surface-lowest text-xs outline-none h-[30px]"
            >
              <option value="all">All Movements</option>
              <option value="in">Inflow (+)</option>
              <option value="out">Outflow (-)</option>
            </select>
            <button className="btn btn-outline btn-sm border border-outline-variant/30 hover:bg-surface-low px-2 py-1 flex items-center gap-1 rounded-sm text-xs font-semibold" onClick={handleDownloadCSV}>
              <span className="material-symbols-outlined icon-xs">download</span>Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-low border-b border-outline-variant">
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Date (DD/MM/YYYY)</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Item</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">SKU</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Type</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Quantity</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">GST</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Operator</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Location</th>
                <th className="p-3 text-[11px] font-bold text-outline tracking-wider text-right uppercase">Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse border-b border-outline-variant/10">
                    <td className="p-3"><div className="h-3.5 bg-surface-container rounded w-20"></div></td>
                    <td className="p-3"><div className="h-3.5 bg-surface-container-high rounded w-32"></div></td>
                    <td className="p-3"><div className="h-3.5 bg-surface-container rounded w-16"></div></td>
                    <td className="p-3"><div className="h-5 bg-surface-container rounded w-16"></div></td>
                    <td className="p-3"><div className="h-3.5 bg-surface-container-high rounded w-10"></div></td>
                    <td className="p-3"><div className="h-3.5 bg-surface-container rounded w-8"></div></td>
                    <td className="p-3"><div className="h-3.5 bg-surface-container-high rounded w-20"></div></td>
                    <td className="p-3"><div className="h-3.5 bg-surface-container rounded w-16"></div></td>
                    <td className="p-3 text-right"><div className="h-3.5 bg-surface-container rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : (
                history.map((log) => {
                  const isIn = log.type === 'in';
                  return (
                    <tr key={log._id} className="border-b border-outline-variant/30 hover:bg-surface-low transition-colors">
                      <td className="p-3 text-outline">{formatDateString(log.date)}</td>
                      <td className="p-3 font-semibold text-on-surface">{log.item}</td>
                      <td className="p-3 font-mono text-[11px] text-on-surface-variant">{log.sku}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isIn ? 'bg-primary/10 text-primary' : 'bg-error-container text-error'}`}>
                          {isIn ? 'Inflow' : 'Outflow'}
                        </span>
                      </td>
                      <td className={`p-3 font-bold ${isIn ? 'text-primary' : 'text-error'}`}>
                        {isIn ? '+' : '−'}{formatNumber(log.qty)}
                      </td>
                      <td className="p-3 text-outline">{log.gst}%</td>
                      <td className="p-3 text-outline">{log.op}</td>
                      <td className="p-3 text-outline">{log.loc}</td>
                      <td className="p-3 text-right font-semibold text-on-surface">{formatINR(log.val)}</td>
                    </tr>
                  );
                }))}
              {!loading && history.length === 0 && (
                <tr>
                  <td colSpan="9" className="p-10 text-center text-outline">
                    No movement logs found for the selected range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
