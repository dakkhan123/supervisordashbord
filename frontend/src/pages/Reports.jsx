import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const Reports = ({ showToast, refreshTrigger }) => {
  const [history, setHistory] = useState([]);
  const [items, setItems] = useState([]);
  const [restockRequests, setRestockRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isInitialLoad = useRef(true);

  // Drill-down detail modal state
  const [detailModal, setDetailModal] = useState(null);

  // Default range: 2025-01-01 to today (covering all seeded & new transaction data)
  const getInitialDates = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return {
      from: '2025-01-01',
      to: `${yyyy}-${mm}-${dd}`
    };
  };

  const initialDates = getInitialDates();
  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);
  const [filterType, setFilterType] = useState('all');

  const fetchData = async () => {
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      showToast?.('From date cannot be after To date', 'error');
      return;
    }

    try {
      if (isInitialLoad.current) {
        setLoading(true);
      }
      setError(null);
      const params = {
        from: dateFrom,
        to: dateTo,
        type: filterType !== 'all' ? filterType : undefined
      };
      const [historyRes, inventoryRes, restockRes] = await Promise.all([
        api.getHistory(params),
        api.getInventory(),
        api.getRestockRequests()
      ]);

      if (historyRes && historyRes.success && inventoryRes && inventoryRes.success) {
        setHistory(historyRes.data || []);
        setItems(inventoryRes.data || []);
        if (restockRes && restockRes.success) {
          setRestockRequests(restockRes.data || []);
        }
      } else {
        if (isInitialLoad.current) {
          setError((historyRes && historyRes.error) || (inventoryRes && inventoryRes.error) || 'Failed to retrieve transaction reports');
        }
      }
    } catch (err) {
      console.error(err);
      if (isInitialLoad.current) {
        setError('Connection refused. Verify local database server status.');
        showToast?.('Error loading transaction history logs', 'error');
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
    if (!history || history.length === 0) {
      showToast?.('No transaction logs to export for selected date range', 'warning');
      return;
    }

    const headers = ['Date', 'Item', 'SKU', 'Type', 'Quantity', 'GST Rate (%)', 'Operator', 'Location', 'Value (INR)'];
    const rows = history.map(h => [
      `"${formatDateString(h.date)}"`,
      `"${(h.item || '').replace(/"/g, '""')}"`,
      `"${(h.sku || '').replace(/"/g, '""')}"`,
      `"${h.type === 'in' ? 'Inflow' : 'Outflow'}"`,
      h.qty || 0,
      h.gst || 18,
      `"${(h.op || 'System').replace(/"/g, '""')}"`,
      `"${(h.loc || '').replace(/"/g, '""')}"`,
      h.val || 0
    ]);

    const csvString = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Inventory_Report_${dateFrom}_to_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast?.('CSV exported successfully!', 'success');
  };

  // Math metrics based strictly on filtered history logs from MongoDB
  const inLogs = history.filter(h => h.type === 'in');
  const outLogs = history.filter(h => h.type === 'out');

  const totalInflow = inLogs.reduce((sum, h) => sum + Number(h.qty || 0), 0);
  const totalOutflow = outLogs.reduce((sum, h) => sum + Number(h.qty || 0), 0);
  const netStockChange = totalInflow - totalOutflow;

  // Calculate GST and Valuation Summary from real database transactions
  const totalPurchaseVal = inLogs.reduce((sum, h) => sum + Number(h.val || 0), 0);
  const totalGSTVal = inLogs.reduce((sum, h) => sum + (Number(h.val || 0) * (Number(h.gst || 18) / 100)), 0);
  const totalSalesVal = outLogs.reduce((sum, h) => sum + (Number(h.val || 0) * (1 + (Number(h.gst || 18) / 100))), 0);

  // Total Asset Value dynamically from current MongoDB inventory catalog items
  const totalAssetVal = items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.val || 0)), 0);

  // Helper date formatter
  const formatDateString = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatINR = (num) => '₹' + Math.round(num || 0).toLocaleString('en-IN');
  const formatNumber = (num) => Math.round(num || 0).toLocaleString('en-IN');

  const formatAssetValINR = (num) => {
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lakh`;
    }
    return '₹' + Math.round(num || 0).toLocaleString('en-IN');
  };

  const getHeaderDateLabel = () => {
    const today = new Date();
    const monthName = today.toLocaleString('default', { month: 'long' });
    const year = today.getFullYear();
    const fyStart = today.getMonth() >= 3 ? year : year - 1;
    const fyEnd = String(fyStart + 1).slice(-2);
    return `${monthName} ${year} (FY ${fyStart}–${fyEnd})`;
  };

  // Monthly Stock Movement aggregated strictly from history logs
  const getMonthlyTrend = () => {
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const inflowByMonth = Array(12).fill(0);
    const outflowByMonth = Array(12).fill(0);
    const logsByMonth = Array(12).fill(null).map(() => []);

    let hasData = false;
    history.forEach(log => {
      const d = new Date(log.date);
      const m = d.getMonth();
      if (!isNaN(m)) {
        hasData = true;
        logsByMonth[m].push(log);
        if (log.type === 'in') {
          inflowByMonth[m] += Number(log.qty || 0);
        } else {
          outflowByMonth[m] += Number(log.qty || 0);
        }
      }
    });

    const maxValVal = Math.max(...inflowByMonth, ...outflowByMonth, 1);
    const scale = maxValVal > 1000 ? 1000 : 1;
    const suffix = scale === 1000 ? 'k' : '';

    return {
      hasData,
      months: monthsName,
      inflow: inflowByMonth.map(v => Math.round(v / scale)),
      outflow: outflowByMonth.map(v => Math.round(v / scale)),
      rawInflow: inflowByMonth,
      rawOutflow: outflowByMonth,
      logsByMonth,
      maxVal: maxValVal,
      suffix
    };
  };

  const trendData = getMonthlyTrend();
  const months = trendData.months;
  const inflowData = trendData.inflow;
  const outflowData = trendData.outflow;
  const maxVal = Math.max(...inflowData, ...outflowData, 1);
  const trendSuffix = trendData.suffix;

  // Dynamic category distribution donut properties strictly from MongoDB items
  const totalUnits = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const categoriesList = Array.from(new Set(items.map(item => item.cat).filter(Boolean)));
  const palette = ['#006a6a', '#00687a', '#545f73', '#00a3a3', '#bcc7de', '#d0bcff', '#e8def8'];

  const categoryBreakdown = categoriesList.map((catName, idx) => {
    const catItems = items.filter(item => item.cat === catName);
    const units = catItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const pct = totalUnits > 0 ? Math.round((units / totalUnits) * 100) : 0;
    return {
      name: catName,
      units,
      pct,
      color: palette[idx % palette.length],
      items: catItems
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

  // Calculate top moving items strictly from history logs
  const getTopMoversList = () => {
    const movesMap = {};
    history.forEach(log => {
      if (!log.sku) return;
      if (!movesMap[log.sku]) {
        movesMap[log.sku] = { name: log.item || log.sku, sku: log.sku, moves: 0, inflow: 0, outflow: 0 };
      }
      movesMap[log.sku].moves += Number(log.qty || 0);
      if (log.type === 'in') {
        movesMap[log.sku].inflow += Number(log.qty || 0);
      } else {
        movesMap[log.sku].outflow += Number(log.qty || 0);
      }
    });

    return Object.values(movesMap)
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
  };

  const topMovers = getTopMoversList();
  const rankCls = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';

  // Replenishment Performance calculated strictly from MongoDB inventory & restock records
  const getReplenishmentData = () => {
    if (categoriesList.length === 0) return [];

    return categoriesList.map(catName => {
      const catItems = items.filter(i => i.cat === catName);
      const catSkus = new Set(catItems.map(i => i.sku));
      
      const gstSum = catItems.reduce((sum, item) => sum + Number(item.gst || 18), 0);
      const avgCatGst = catItems.length > 0 ? Math.round(gstSum / catItems.length) : 18;

      const catRestocks = restockRequests.filter(r => catSkus.has(r.sku) && r.status === 'approved' && r.resolvedAt);

      if (catRestocks.length === 0) {
        return {
          cat: catName,
          onTime: 'N/A',
          avgLead: 'N/A',
          gstRate: `${avgCatGst}%`,
          grade: 'N/A',
          gradeBadge: 'badge-near'
        };
      }

      let totalDays = 0;
      let onTimeCount = 0;
      catRestocks.forEach(r => {
        const created = new Date(r.createdAt);
        const resolved = new Date(r.resolvedAt);
        const days = Math.max(0, (resolved - created) / (1000 * 60 * 60 * 24));
        totalDays += days;
        if (days <= 3) onTimeCount++;
      });

      const avgLead = (totalDays / catRestocks.length).toFixed(1);
      const onTimePct = Math.round((onTimeCount / catRestocks.length) * 100);
      let grade = 'B';
      let gradeBadge = 'badge-low';
      if (onTimePct >= 90) { grade = 'A+'; gradeBadge = 'badge-ok'; }
      else if (onTimePct >= 80) { grade = 'A'; gradeBadge = 'badge-ok'; }
      else if (onTimePct >= 70) { grade = 'B+'; gradeBadge = 'badge-near'; }

      return {
        cat: catName,
        onTime: `${onTimePct}%`,
        avgLead: `${avgLead} Days`,
        gstRate: `${avgCatGst}%`,
        grade,
        gradeBadge
      };
    });
  };

  const replenishmentList = getReplenishmentData();

  // -------------------------------------------------------------
  // DRILL-DOWN MODAL HANDLERS (WHERE THAT NUMBER CAME FROM)
  // -------------------------------------------------------------
  const openInflowModal = () => {
    setDetailModal({
      title: 'Total Inflow (MTD) Breakdown',
      subtitle: `Filtered Date Range: ${formatDateString(dateFrom)} to ${formatDateString(dateTo)}`,
      formula: `Total Inflow = Sum of all 'IN' transaction quantities (${inLogs.length} transactions)`,
      type: 'transaction_list',
      kpis: [
        { label: 'Total Inflow Quantity', value: `${formatNumber(totalInflow)} Units`, color: 'text-primary' },
        { label: 'Total IN Transactions', value: `${inLogs.length} Records`, color: 'text-on-surface' },
        { label: 'Total Purchase Cost', value: formatINR(totalPurchaseVal), color: 'text-on-surface' }
      ],
      rows: inLogs
    });
  };

  const openOutflowModal = () => {
    setDetailModal({
      title: 'Total Outflow (MTD) Breakdown',
      subtitle: `Filtered Date Range: ${formatDateString(dateFrom)} to ${formatDateString(dateTo)}`,
      formula: `Total Outflow = Sum of all 'OUT' transaction quantities (${outLogs.length} transactions)`,
      type: 'transaction_list',
      kpis: [
        { label: 'Total Outflow Quantity', value: `${formatNumber(totalOutflow)} Units`, color: 'text-error' },
        { label: 'Total OUT Transactions', value: `${outLogs.length} Records`, color: 'text-on-surface' },
        { label: 'Outflow Base Value', value: formatINR(outLogs.reduce((s, h) => s + Number(h.val || 0), 0)), color: 'text-on-surface' }
      ],
      rows: outLogs
    });
  };

  const openNetChangeModal = () => {
    setDetailModal({
      title: 'Net Stock Change Breakdown',
      subtitle: `Filtered Date Range: ${formatDateString(dateFrom)} to ${formatDateString(dateTo)}`,
      formula: `Net Stock Change = Total Inflow (${formatNumber(totalInflow)}) − Total Outflow (${formatNumber(totalOutflow)}) = ${netStockChange >= 0 ? '+' : ''}${formatNumber(netStockChange)} Units`,
      type: 'transaction_list',
      kpis: [
        { label: 'Net Stock Change', value: `${netStockChange >= 0 ? '+' : ''}${formatNumber(netStockChange)} Units`, color: netStockChange >= 0 ? 'text-primary' : 'text-error' },
        { label: 'Inflow Transactions', value: `${inLogs.length} IN`, color: 'text-primary' },
        { label: 'Outflow Transactions', value: `${outLogs.length} OUT`, color: 'text-error' }
      ],
      rows: history
    });
  };

  const openPurchaseValModal = () => {
    setDetailModal({
      title: 'Total Purchase Value (MTD) Breakdown',
      subtitle: `Pre-GST acquisition costs in date range: ${formatDateString(dateFrom)} to ${formatDateString(dateTo)}`,
      formula: `Total Purchase Value = Sum of (Quantity × Unit Cost) for all ${inLogs.length} IN transactions`,
      type: 'transaction_list',
      kpis: [
        { label: 'Total Purchase Value', value: formatINR(totalPurchaseVal), color: 'text-on-surface' },
        { label: 'Estimated GST (18%)', value: formatINR(totalGSTVal), color: 'text-outline' },
        { label: 'Gross Purchase (Incl GST)', value: formatINR(totalPurchaseVal + totalGSTVal), color: 'text-primary' }
      ],
      rows: inLogs
    });
  };

  const openGSTModal = () => {
    const gstRows = inLogs.map(h => ({
      ...h,
      gstAmount: Number(h.val || 0) * (Number(h.gst || 18) / 100)
    }));
    setDetailModal({
      title: 'IGST / CGST + SGST Tax Breakdown',
      subtitle: `Calculated strictly from actual stored GST rates across ${inLogs.length} IN transactions`,
      formula: `Total GST = Sum of [Pre-GST Value × (GST Rate / 100)] for each acquisition transaction`,
      type: 'gst_list',
      kpis: [
        { label: 'Total Calculated GST', value: formatINR(totalGSTVal), color: 'text-primary' },
        { label: 'Pre-GST Purchase Base', value: formatINR(totalPurchaseVal), color: 'text-on-surface' },
        { label: 'Contributing Inflows', value: `${inLogs.length} Records`, color: 'text-outline' }
      ],
      rows: gstRows
    });
  };

  const openSalesValModal = () => {
    const salesRows = outLogs.map(h => ({
      ...h,
      salesVal: Number(h.val || 0) * (1 + (Number(h.gst || 18) / 100))
    }));
    setDetailModal({
      title: 'Total Sales Value (MTD) Breakdown',
      subtitle: `Gross sales valuation for stock outflow transactions in date range`,
      formula: `Total Sales Value = Sum of [Outflow Value × (1 + GST Rate / 100)] across ${outLogs.length} OUT transactions`,
      type: 'sales_list',
      kpis: [
        { label: 'Total Sales Value (Incl GST)', value: formatINR(totalSalesVal), color: 'text-primary' },
        { label: 'Outflow Pre-GST Base', value: formatINR(outLogs.reduce((s, h) => s + Number(h.val || 0), 0)), color: 'text-on-surface' },
        { label: 'Outflow Transactions', value: `${outLogs.length} Records`, color: 'text-outline' }
      ],
      rows: salesRows
    });
  };

  const openAssetValModal = () => {
    const catalogRows = items.map(item => ({
      ...item,
      totalVal: Number(item.qty || 0) * Number(item.val || 0)
    }));
    setDetailModal({
      title: 'Total Inventory Asset Value Breakdown',
      subtitle: `Valuation of current stock catalog stored in MongoDB (${items.length} items)`,
      formula: `Total Asset Value = Sum of (Item Stock Quantity × Unit Price in INR)`,
      type: 'catalog_list',
      kpis: [
        { label: 'Total Asset Valuation', value: formatAssetValINR(totalAssetVal), color: 'text-primary' },
        { label: 'Total Inventory Items', value: `${items.length} Catalog Items`, color: 'text-on-surface' },
        { label: 'Total Inventory Units', value: `${formatNumber(totalUnits)} Units`, color: 'text-outline' }
      ],
      rows: catalogRows
    });
  };

  const openCategoryModal = (catName) => {
    const catObj = categoryBreakdown.find(c => c.name === catName);
    if (!catObj) return;
    setDetailModal({
      title: `Category Breakdown — ${catName}`,
      subtitle: `Active inventory catalog items in category: ${catName}`,
      formula: `Category Percentage = Category Units (${formatNumber(catObj.units)}) ÷ Total Inventory Units (${formatNumber(totalUnits)}) × 100 = ${catObj.pct}%`,
      type: 'catalog_list',
      kpis: [
        { label: 'Category Share', value: `${catObj.pct}%`, color: 'text-primary' },
        { label: 'Category Total Units', value: `${formatNumber(catObj.units)} Units`, color: 'text-on-surface' },
        { label: 'Items in Category', value: `${catObj.items.length} Items`, color: 'text-outline' }
      ],
      rows: catObj.items.map(i => ({ ...i, totalVal: Number(i.qty || 0) * Number(i.val || 0) }))
    });
  };

  const openMonthModal = (monthIdx) => {
    const mName = months[monthIdx];
    const mLogs = trendData.logsByMonth[monthIdx] || [];
    const mIn = trendData.rawInflow[monthIdx] || 0;
    const mOut = trendData.rawOutflow[monthIdx] || 0;

    setDetailModal({
      title: `Monthly Stock Movement Breakdown — ${mName}`,
      subtitle: `Transactions recorded in ${mName} (${mLogs.length} total transactions)`,
      formula: `Month Inflow (${formatNumber(mIn)}) − Month Outflow (${formatNumber(mOut)}) = Net (${formatNumber(mIn - mOut)})`,
      type: 'transaction_list',
      kpis: [
        { label: 'Month Inflow', value: `${formatNumber(mIn)} Units`, color: 'text-primary' },
        { label: 'Month Outflow', value: `${formatNumber(mOut)} Units`, color: 'text-error' },
        { label: 'Total Transactions', value: `${mLogs.length} Records`, color: 'text-on-surface' }
      ],
      rows: mLogs
    });
  };

  const openTopMoverModal = (sku, itemName) => {
    const skuLogs = history.filter(h => h.sku === sku);
    const skuIn = skuLogs.filter(h => h.type === 'in').reduce((s, h) => s + Number(h.qty || 0), 0);
    const skuOut = skuLogs.filter(h => h.type === 'out').reduce((s, h) => s + Number(h.qty || 0), 0);
    setDetailModal({
      title: `Top Mover Item Breakdown — ${itemName}`,
      subtitle: `SKU: ${sku} · Filtered Date Range: ${formatDateString(dateFrom)} to ${formatDateString(dateTo)}`,
      formula: `Total Movements = Inflow (${formatNumber(skuIn)}) + Outflow (${formatNumber(skuOut)}) = ${formatNumber(skuIn + skuOut)} Units`,
      type: 'transaction_list',
      kpis: [
        { label: 'Total Item Movements', value: `${formatNumber(skuIn + skuOut)} Units`, color: 'text-primary' },
        { label: 'Inflow Units', value: `${formatNumber(skuIn)} Units`, color: 'text-primary' },
        { label: 'Outflow Units', value: `${formatNumber(skuOut)} Units`, color: 'text-error' }
      ],
      rows: skuLogs
    });
  };

  const openReplenishmentModal = (catName) => {
    const catItems = items.filter(i => i.cat === catName);
    const catSkus = new Set(catItems.map(i => i.sku));
    const catRestocks = restockRequests.filter(r => catSkus.has(r.sku));

    setDetailModal({
      title: `Replenishment Performance — ${catName}`,
      subtitle: `Restock requests for items in category: ${catName}`,
      formula: `On-Time Rate = (Requests Resolved <= 3 Days) ÷ Total Approved Requests × 100`,
      type: 'restock_list',
      kpis: [
        { label: 'Total Restock Requests', value: `${catRestocks.length} Requests`, color: 'text-primary' },
        { label: 'Approved Requests', value: `${catRestocks.filter(r => r.status === 'approved').length}`, color: 'text-primary' },
        { label: 'Pending Requests', value: `${catRestocks.filter(r => r.status === 'pending').length}`, color: 'text-outline' }
      ],
      rows: catRestocks
    });
  };

  const openSingleLogModal = (log) => {
    setDetailModal({
      title: `Stock Transaction Detail — ${log.item}`,
      subtitle: `Transaction SKU: ${log.sku} · Recorded on ${formatDateString(log.date)}`,
      formula: `Transaction Monetary Value = Quantity (${log.qty}) × Unit Value = ${formatINR(log.val)}`,
      type: 'transaction_list',
      kpis: [
        { label: 'Transaction Type', value: log.type === 'in' ? 'INFLOW (+)' : 'OUTFLOW (-)', color: log.type === 'in' ? 'text-primary' : 'text-error' },
        { label: 'Quantity', value: `${log.qty} Units`, color: 'text-on-surface' },
        { label: 'Total Value', value: formatINR(log.val), color: 'text-primary' }
      ],
      rows: [log]
    });
  };

  const handleModalExportCSV = () => {
    if (!detailModal || !detailModal.rows || detailModal.rows.length === 0) {
      showToast?.('No rows to export from breakdown modal', 'warning');
      return;
    }

    let headers = [];
    let rows = [];

    if (detailModal.type === 'catalog_list') {
      headers = ['Item Name', 'SKU', 'Category', 'Stock Qty', 'Unit Price (INR)', 'Total Asset Value (INR)', 'Location', 'GST %'];
      rows = detailModal.rows.map(r => [
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.sku || '').replace(/"/g, '""')}"`,
        `"${(r.cat || '').replace(/"/g, '""')}"`,
        r.qty || 0,
        r.val || 0,
        r.totalVal || (r.qty * r.val) || 0,
        `"${(r.loc || '').replace(/"/g, '""')}"`,
        r.gst || 18
      ]);
    } else if (detailModal.type === 'restock_list') {
      headers = ['Created Date', 'Item Name', 'SKU', 'Quantity', 'Supplier', 'Status', 'Operator', 'Resolved Date'];
      rows = detailModal.rows.map(r => [
        `"${formatDateString(r.createdAt)}"`,
        `"${(r.itemName || '').replace(/"/g, '""')}"`,
        `"${(r.sku || '').replace(/"/g, '""')}"`,
        r.qty || 0,
        `"${(r.supplier || '').replace(/"/g, '""')}"`,
        `"${r.status || 'pending'}"`,
        `"${(r.op || 'System').replace(/"/g, '""')}"`,
        `"${r.resolvedAt ? formatDateString(r.resolvedAt) : 'Pending'}"`
      ]);
    } else {
      headers = ['Date', 'Item', 'SKU', 'Type', 'Quantity', 'GST Rate (%)', 'Operator', 'Location', 'Value (INR)'];
      rows = detailModal.rows.map(h => [
        `"${formatDateString(h.date)}"`,
        `"${(h.item || '').replace(/"/g, '""')}"`,
        `"${(h.sku || '').replace(/"/g, '""')}"`,
        `"${h.type === 'in' ? 'Inflow' : 'Outflow'}"`,
        h.qty || 0,
        h.gst || 18,
        `"${(h.op || 'System').replace(/"/g, '""')}"`,
        `"${(h.loc || '').replace(/"/g, '""')}"`,
        h.val || 0
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

      {/* KPI Stat Tiles (Clickable for drill-down) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Inflow Tile */}
        <div
          onClick={openInflowModal}
          className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-150 group relative"
          title="Click to view contributing IN transactions"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Total Inflow (MTD)</span>
            <span className="material-symbols-outlined text-xs text-outline group-hover:text-primary transition-colors">info</span>
          </div>
          <div className="text-2xl font-extrabold text-on-surface">{formatNumber(totalInflow)}</div>
          <div className="text-[11px] font-semibold text-primary mt-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined icon-xs text-primary">trending_up</span>Units MTD in date range
            </span>
            <span className="text-[10px] text-primary/80 font-normal underline group-hover:text-primary">View Breakdown ↗</span>
          </div>
        </div>

        {/* Total Outflow Tile */}
        <div
          onClick={openOutflowModal}
          className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:border-error/50 hover:shadow-md cursor-pointer transition-all duration-150 group relative"
          title="Click to view contributing OUT transactions"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Total Outflow (MTD)</span>
            <span className="material-symbols-outlined text-xs text-outline group-hover:text-error transition-colors">info</span>
          </div>
          <div className="text-2xl font-extrabold text-on-surface">{formatNumber(totalOutflow)}</div>
          <div className="text-[11px] font-semibold text-error mt-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined icon-xs text-error">trending_down</span>Units MTD in date range
            </span>
            <span className="text-[10px] text-error/80 font-normal underline group-hover:text-error">View Breakdown ↗</span>
          </div>
        </div>

        {/* Net Stock Change Tile */}
        <div
          onClick={openNetChangeModal}
          className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-150 group relative"
          title="Click to view Inflow vs Outflow calculation breakdown"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Net Stock Change</span>
            <span className="material-symbols-outlined text-xs text-outline group-hover:text-primary transition-colors">info</span>
          </div>
          <div className="text-2xl font-extrabold text-primary">{netStockChange >= 0 ? '+' : ''}{formatNumber(netStockChange)}</div>
          <div className="text-[11px] text-on-surface-variant mt-1.5 flex items-center justify-between">
            <span>units accumulated in range</span>
            <span className="text-[10px] text-primary/80 font-normal underline group-hover:text-primary">View Breakdown ↗</span>
          </div>
        </div>
      </div>

      {/* GST Summary Tiles (Clickable for drill-down) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Purchase Value Tile */}
        <div
          onClick={openPurchaseValModal}
          className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-150 group relative"
          title="Click to view acquisition line items"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Total Purchase Value (MTD)</span>
            <span className="material-symbols-outlined text-xs text-outline group-hover:text-primary transition-colors">info</span>
          </div>
          <div className="text-xl font-extrabold text-on-surface">{formatINR(totalPurchaseVal)}</div>
          <div className="text-[11px] text-on-surface-variant mt-1.5 flex items-center justify-between">
            <span>Pre-GST Value</span>
            <span className="text-[10px] text-primary/80 font-normal underline group-hover:text-primary">View ↗</span>
          </div>
        </div>

        {/* IGST / CGST+SGST Tile */}
        <div
          onClick={openGSTModal}
          className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-150 group relative"
          title="Click to view line-item GST calculations"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">IGST / CGST+SGST (MTD)</span>
            <span className="material-symbols-outlined text-xs text-outline group-hover:text-primary transition-colors">info</span>
          </div>
          <div className="text-xl font-extrabold text-on-surface">{formatINR(totalGSTVal)}</div>
          <div className="text-[11px] text-on-surface-variant mt-1.5 flex items-center justify-between">
            <span>Stored GST Calculation</span>
            <span className="text-[10px] text-primary/80 font-normal underline group-hover:text-primary">View ↗</span>
          </div>
        </div>

        {/* Total Sales Value Tile */}
        <div
          onClick={openSalesValModal}
          className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-150 group relative"
          title="Click to view sales line items"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Total Sales Value (MTD)</span>
            <span className="material-symbols-outlined text-xs text-outline group-hover:text-primary transition-colors">info</span>
          </div>
          <div className="text-xl font-extrabold text-on-surface">{formatINR(totalSalesVal)}</div>
          <div className="text-[11px] font-semibold text-primary mt-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined icon-xs text-primary">trending_up</span>Incl. GST
            </span>
            <span className="text-[10px] text-primary/80 font-normal underline group-hover:text-primary">View ↗</span>
          </div>
        </div>

        {/* Total Asset Value Tile */}
        <div
          onClick={openAssetValModal}
          className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-150 group relative"
          title="Click to view itemized catalog valuation"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Total Asset Value</span>
            <span className="material-symbols-outlined text-xs text-outline group-hover:text-primary transition-colors">info</span>
          </div>
          <div className="text-xl font-extrabold text-on-surface">{formatAssetValINR(totalAssetVal)}</div>
          <div className="text-[11px] text-on-surface-variant mt-1.5 flex items-center justify-between">
            <span>INR Valuation (Current)</span>
            <span className="text-[10px] text-primary/80 font-normal underline group-hover:text-primary">View ↗</span>
          </div>
        </div>
      </div>

      {/* Monthly Chart and Donut chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-on-surface">Monthly Stock Movement</h2>
              <p className="text-[11px] text-outline">Click any month bar to inspect its exact transactions</p>
            </div>
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
            {!trendData.hasData && (
              <div className="text-center text-xs text-outline mb-3 italic">
                No stock movement transactions recorded in selected date range.
              </div>
            )}
            <div className="flex items-end gap-2 h-[200px] pb-8 relative">
              {months.map((m, i) => (
                <div
                  key={m}
                  onClick={() => openMonthModal(i)}
                  className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                  title={`Click to view transactions for ${m}`}
                >
                  <div className="w-full flex items-end gap-0.5 justify-center">
                    <div
                      className="w-2 md:w-3.5 bg-gradient-to-t from-primary/70 to-primary rounded-t-sm group-hover:brightness-125 transition-all relative"
                      style={{ height: `${(inflowData[i] / maxVal) * 100}%` }}
                    >
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#213145] text-[#eaf1ff] text-[10px] font-bold px-1.5 py-1 rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20 whitespace-nowrap">
                        Inflow: {trendData.rawInflow[i]}{trendSuffix || ' units'} (Click for details)
                      </div>
                    </div>
                    <div
                      className="w-2 md:w-3.5 bg-gradient-to-t from-secondary/70 to-secondary rounded-t-sm group-hover:brightness-125 transition-all relative"
                      style={{ height: `${(outflowData[i] / maxVal) * 100}%` }}
                    >
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#213145] text-[#eaf1ff] text-[10px] font-bold px-1.5 py-1 rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20 whitespace-nowrap">
                        Outflow: {trendData.rawOutflow[i]}{trendSuffix || ' units'} (Click for details)
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="absolute bottom-0 left-0 right-0 flex justify-around text-[9px] md:text-[10px] font-bold text-outline uppercase tracking-wider font-mono">
                {months.map((m, idx) => (
                  <span
                    key={m}
                    onClick={() => openMonthModal(idx)}
                    className="cursor-pointer hover:text-primary transition-colors"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Category breakdown donut */}
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface">Category Breakdown</h2>
            <p className="text-[11px] text-outline">Click any category to inspect item catalog details</p>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {categoryBreakdown.length === 0 ? (
              <div className="p-8 text-center text-xs text-outline">
                No inventory catalog records found.
              </div>
            ) : (
              <div className="flex items-center gap-6 flex-wrap justify-center md:justify-start">
                <div className="relative w-40 h-40 flex-shrink-0">
                  <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="62" fill="none" stroke="var(--surface-container-high)" strokeWidth="22" />
                    {donutSegments.map((seg) => (
                      <circle
                        key={seg.name}
                        onClick={() => openCategoryModal(seg.name)}
                        cx="80"
                        cy="80"
                        r="62"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="22"
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-extrabold text-on-surface">{formatNumber(totalUnits)}</span>
                    <span className="text-[10px] font-bold text-outline uppercase">Total Units</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-2.5 min-w-[120px] text-xs">
                  {categoryBreakdown.map((cat) => (
                    <div
                      key={cat.name}
                      onClick={() => openCategoryModal(cat.name)}
                      className="p-1.5 rounded hover:bg-surface-low cursor-pointer transition-colors group"
                      title={`Click to view catalog items in ${cat.name}`}
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="flex items-center gap-1.5 text-on-surface group-hover:text-primary transition-colors">
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
            )}
          </div>
        </div>
      </div>

      {/* Top Movers + Replenish grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-on-surface">Top Moving Items</h2>
              <p className="text-[11px] text-outline">Click an item row to inspect its movement logs</p>
            </div>
            <span className="px-2 py-0.5 rounded-full border border-outline-variant/30 text-[10px] font-bold text-outline">
              Date Range
            </span>
          </div>
          <div className="p-5 flex flex-col">
            {topMovers.length === 0 ? (
              <div className="py-8 text-center text-xs text-outline">
                No top moving items found in selected date range.
              </div>
            ) : (
              topMovers.map((m, i) => (
                <div
                  key={m.sku}
                  onClick={() => openTopMoverModal(m.sku, m.name)}
                  className="flex items-center gap-3 py-2.5 px-2 border-b border-outline-variant/30 last:border-0 font-sans hover:bg-surface-low rounded cursor-pointer transition-colors group"
                  title={`Click to view transaction history for ${m.name}`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${rankCls(i) ? 'bg-primary text-white font-extrabold shadow-sm' : 'bg-surface-container text-outline'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-on-surface group-hover:text-primary transition-colors">{m.name}</p>
                    <span className="text-[10px] font-mono text-outline">{m.sku}</span>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-primary">{formatNumber(m.moves)} units</p>
                    <span className={`text-[10px] font-bold ${m.trend === 'up' ? 'text-primary' : 'text-error'}`}>{m.change}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Grades table */}
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-5 py-4 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface">Replenishment Performance</h2>
            <p className="text-[11px] text-outline">Click a row to inspect restock request records</p>
          </div>
          <div className="overflow-x-auto flex-1">
            {replenishmentList.length === 0 ? (
              <div className="p-8 text-center text-xs text-outline">
                No replenishment performance data available.
              </div>
            ) : (
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
                  {replenishmentList.map((row, idx) => (
                    <tr
                      key={row.cat}
                      onClick={() => openReplenishmentModal(row.cat)}
                      className={`border-b ${idx === replenishmentList.length - 1 ? 'border-b-0' : 'border-outline-variant/30'} hover:bg-surface-low cursor-pointer transition-colors`}
                      title={`Click to view restock requests for ${row.cat}`}
                    >
                      <td className="p-3 font-semibold text-on-surface">{row.cat}</td>
                      <td className="p-3">{row.onTime}</td>
                      <td className="p-3">{row.avgLead}</td>
                      <td className="p-3">{row.gstRate}</td>
                      <td className="p-3 text-right">
                        <span className={`badge ${row.gradeBadge}`}>{row.grade}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Movement Log */}
      <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-on-surface">Detailed Movement Log</h2>
            <p className="text-[11px] text-outline">Click any row to view individual transaction details</p>
          </div>
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
                    <tr
                      key={log._id}
                      onClick={() => openSingleLogModal(log)}
                      className="border-b border-outline-variant/30 hover:bg-surface-low cursor-pointer transition-colors group"
                      title="Click to view detailed log summary"
                    >
                      <td className="p-3 text-outline">{formatDateString(log.date)}</td>
                      <td className="p-3 font-semibold text-on-surface group-hover:text-primary transition-colors">{log.item}</td>
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
                      <td className="p-3 text-outline">{log.op || 'System'}</td>
                      <td className="p-3 text-outline">{log.loc || 'N/A'}</td>
                      <td className="p-3 text-right font-semibold text-on-surface">{formatINR(log.val)}</td>
                    </tr>
                  );
                }))}
              {!loading && history.length === 0 && (
                <tr>
                  <td colSpan="9" className="p-10 text-center text-outline font-sans">
                    No movement logs found for the selected range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* METRIC BREAKDOWN DRILL-DOWN MODAL */}
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
                {detailModal.kpis.map((kpi, idx) => (
                  <div key={idx} className="bg-surface-low border border-outline-variant/50 p-3 rounded text-center">
                    <div className="text-[10px] font-bold uppercase text-outline tracking-wider">{kpi.label}</div>
                    <div className={`text-base font-extrabold mt-1 ${kpi.color}`}>{kpi.value}</div>
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
                  No source database records found for this metric calculation.
                </div>
              ) : detailModal.type === 'catalog_list' ? (
                <div className="overflow-x-auto border border-outline-variant rounded">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-low border-b border-outline-variant font-bold text-outline uppercase tracking-wider text-[10px]">
                        <th className="p-2.5">Item Name</th>
                        <th className="p-2.5">SKU</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Stock Qty</th>
                        <th className="p-2.5">Unit Price</th>
                        <th className="p-2.5 text-right">Total Asset Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.rows.map((row, idx) => (
                        <tr key={row._id || idx} className="border-b border-outline-variant/20 hover:bg-surface-low">
                          <td className="p-2.5 font-bold text-on-surface">{row.name}</td>
                          <td className="p-2.5 font-mono text-[11px] text-outline">{row.sku}</td>
                          <td className="p-2.5 text-on-surface">{row.cat}</td>
                          <td className="p-2.5 font-bold text-primary">{formatNumber(row.qty)}</td>
                          <td className="p-2.5 text-on-surface">{formatINR(row.val)}</td>
                          <td className="p-2.5 text-right font-extrabold text-on-surface">{formatINR(row.totalVal || (row.qty * row.val))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : detailModal.type === 'restock_list' ? (
                <div className="overflow-x-auto border border-outline-variant rounded">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-low border-b border-outline-variant font-bold text-outline uppercase tracking-wider text-[10px]">
                        <th className="p-2.5">Created Date</th>
                        <th className="p-2.5">Item Name</th>
                        <th className="p-2.5">SKU</th>
                        <th className="p-2.5">Qty</th>
                        <th className="p-2.5">Supplier</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Operator</th>
                        <th className="p-2.5 text-right">Resolved Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.rows.map((r, idx) => (
                        <tr key={r._id || idx} className="border-b border-outline-variant/20 hover:bg-surface-low">
                          <td className="p-2.5 text-outline">{formatDateString(r.createdAt)}</td>
                          <td className="p-2.5 font-bold text-on-surface">{r.itemName}</td>
                          <td className="p-2.5 font-mono text-[11px] text-outline">{r.sku}</td>
                          <td className="p-2.5 font-bold text-primary">{r.qty}</td>
                          <td className="p-2.5 text-on-surface">{r.supplier || 'N/A'}</td>
                          <td className="p-2.5 uppercase font-bold text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded ${r.status === 'approved' ? 'bg-primary/10 text-primary' : r.status === 'rejected' ? 'bg-error/10 text-error' : 'bg-surface-container text-outline'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-outline">{r.op || 'System'}</td>
                          <td className="p-2.5 text-right text-outline">{r.resolvedAt ? formatDateString(r.resolvedAt) : 'Pending'}</td>
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
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5">SKU</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Quantity</th>
                        <th className="p-2.5">GST %</th>
                        <th className="p-2.5">Operator</th>
                        <th className="p-2.5 text-right">Base Value (₹)</th>
                        {detailModal.type === 'gst_list' && <th className="p-2.5 text-right">Calculated GST (₹)</th>}
                        {detailModal.type === 'sales_list' && <th className="p-2.5 text-right">Gross Sales (₹)</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.rows.map((log, idx) => {
                        const isIn = log.type === 'in';
                        return (
                          <tr key={log._id || idx} className="border-b border-outline-variant/20 hover:bg-surface-low">
                            <td className="p-2.5 text-outline">{formatDateString(log.date)}</td>
                            <td className="p-2.5 font-bold text-on-surface">{log.item}</td>
                            <td className="p-2.5 font-mono text-[11px] text-outline">{log.sku}</td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isIn ? 'bg-primary/10 text-primary' : 'bg-error-container text-error'}`}>
                                {isIn ? 'Inflow' : 'Outflow'}
                              </span>
                            </td>
                            <td className={`p-2.5 font-bold ${isIn ? 'text-primary' : 'text-error'}`}>
                              {isIn ? '+' : '−'}{formatNumber(log.qty)}
                            </td>
                            <td className="p-2.5 text-outline">{log.gst || 18}%</td>
                            <td className="p-2.5 text-outline">{log.op || 'System'}</td>
                            <td className="p-2.5 text-right font-semibold text-on-surface">{formatINR(log.val)}</td>
                            {detailModal.type === 'gst_list' && (
                              <td className="p-2.5 text-right font-bold text-primary">{formatINR(log.gstAmount)}</td>
                            )}
                            {detailModal.type === 'sales_list' && (
                              <td className="p-2.5 text-right font-bold text-primary">{formatINR(log.salesVal)}</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-outline-variant bg-surface-low flex items-center justify-between">
              <span className="text-[11px] text-outline">Source: Live MongoDB database query</span>
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

export default Reports;
