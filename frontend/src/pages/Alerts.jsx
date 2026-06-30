import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';

const Alerts = ({ showToast, onReorderClick, refreshTrigger, triggerRefresh }) => {
  const location = useLocation();
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [resolvedAlerts, setResolvedAlerts] = useState([]);
  const [restockRequests, setRestockRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestActionLoading, setRequestActionLoading] = useState(null);
  const isInitialLoad = useRef(true);

  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (location.state && location.state.tab) {
      return location.state.tab;
    }
    return 'dashboards';
  });

  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    if (location.state && location.state.tab) {
      setActiveSubTab(location.state.tab);
    }
  }, [location.state]);

  const hasAudited = useRef(false);

  const fetchData = async (runAudit = false) => {
    try {
      // Only show loading skeleton on first fetch
      if (isInitialLoad.current) {
        setLoading(true);
      }
      setError(null);

      // Only audit once per page mount to avoid repeated expensive audit calls
      if (runAudit) {
        await api.auditAlerts();
      }

      const [activeRes, resolvedRes, requestsRes] = await Promise.all([
        api.getActiveAlerts(),
        api.getAlertHistory(),
        api.getRestockRequests()
      ]);

      if (activeRes.success && resolvedRes.success) {
        setActiveAlerts(activeRes.data);
        setResolvedAlerts(resolvedRes.data);
      } else {
        if (isInitialLoad.current) {
          setError(activeRes.error || resolvedRes.error || 'Failed to retrieve alert datasets');
        }
      }

      if (requestsRes.success) {
        setRestockRequests(requestsRes.data);
      }
    } catch (err) {
      console.error(err);
      if (isInitialLoad.current) {
        setError('Network communication failed. Ensure Express server is connected.');
        showToast('Error loading stock alerts', 'error');
      }
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  };

  const handleApproveRequest = async (id) => {
    setRequestActionLoading(id + '_approve');
    try {
      const res = await api.approveRestockRequest(id);
      if (res.success) {
        showToast('Restock request approved. Stock replenished successfully.', 'success');
        fetchData();
        if (triggerRefresh) triggerRefresh();
      } else {
        showToast(res.error || 'Failed to approve restock request', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while approving request', 'error');
    } finally {
      setRequestActionLoading(null);
    }
  };

  const handleRejectRequest = async (id) => {
    setRequestActionLoading(id + '_reject');
    try {
      const res = await api.rejectRestockRequest(id);
      if (res.success) {
        showToast('Restock request rejected.', 'success');
        fetchData();
        if (triggerRefresh) triggerRefresh();
      } else {
        showToast(res.error || 'Failed to reject restock request', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while rejecting request', 'error');
    } finally {
      setRequestActionLoading(null);
    }
  };

  // On mount: run audit to sync alert DB with current stock levels
  useEffect(() => {
    const runInitialFetch = async () => {
      if (!hasAudited.current) {
        hasAudited.current = true;
        await fetchData(true);
      }
    };
    runInitialFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On subsequent refreshes: re-fetch without re-auditing
  useEffect(() => {
    if (hasAudited.current) {
      fetchData(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const handleMuteAlert = async (id) => {
    try {
      const res = await api.muteAlert(id);
      if (res.success) {
        showToast('Alert warning muted successfully', 'success');
        fetchData();
        if (triggerRefresh) triggerRefresh();
      } else {
        showToast(res.error || 'Failed to mute alert', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while muting alert', 'error');
    }
  };

  const handleBatchReorder = async (alertsList) => {
    if (alertsList.length === 0) {
      return showToast('No active stock alerts found in this view', 'error');
    }

    try {
      showToast(`Placing emergency orders for ${alertsList.length} items...`, 'success');
      await Promise.all(
        alertsList.map(alert =>
          api.reorderItem({
            sku: alert.sku,
            qty: Math.max((alert.threshold - alert.qty) * 2, 100),
            priority: 'Emergency — Next Day'
          })
        )
      );
      showToast('Emergency orders placed successfully!', 'success');
      fetchData();
      if (triggerRefresh) triggerRefresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to execute bulk reorder', 'error');
    }
  };

  const handleExportCSV = () => {
    if (activeAlerts.length === 0) return showToast('No active alerts to export', 'error');
    const headers = ['SKU', 'Item Name', 'Severity', 'Current Stock', 'Safety Threshold', 'Triggered On'];
    const rows = activeAlerts.map(alert => [
      `"${alert.sku}"`,
      `"${alert.item.replace(/"/g, '""')}"`,
      `"${alert.type}"`,
      alert.qty,
      alert.threshold,
      `"${formatDateTime(alert.createdAt)}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SmartOps_Stock_Alerts_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV downloaded successfully!', 'success');
  };

  // Compile active alerts splits
  const criticalAlerts = activeAlerts.filter(a => a.type === 'critical');
  const lowAlerts = activeAlerts.filter(a => a.type === 'low');
  const pendingRequests = restockRequests.filter(r => r.status === 'pending');


  // Helper date formatter (Indian standard DD/MM/YYYY HH:MM)
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hh}:${min}`;
  };

  const categories = ['Electronics', 'Mechanical', 'Consumables', 'Raw Materials', 'Packaging'];

  // Global Loader Screen
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Low Stock Alerts</h1>
            <p className="text-on-surface-variant text-sm">Evaluating system stock boundaries...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-lowest border border-outline-variant/60 rounded-md p-4 animate-pulse flex flex-col gap-3">
              <div className="h-3 bg-surface-container rounded w-16"></div>
              <div className="h-6 bg-surface-container-high rounded w-24"></div>
            </div>
          ))}
        </div>
        <div className="h-[300px] bg-surface-lowest border border-outline-variant/60 rounded-md animate-pulse"></div>
      </div>
    );
  }

  // Global Error Screen
  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Low Stock Alerts</h1>
            <p className="text-on-surface-variant text-sm">Unit Pune-A12, Maharashtra</p>
          </div>
        </div>
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm p-14 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px]">error</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">Alerts System Load Failed</h2>
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
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Low Stock Alerts</h1>
          <p className="text-on-surface-variant text-sm">
            {activeAlerts.length.toLocaleString('en-IN')} active alerts require processing · Safety boundary: qty &le; min safety limits
          </p>
        </div>
        <div className="flex gap-2.5">
          <button 
            className="btn btn-outline flex items-center gap-2 px-4 py-2 border border-primary/20 hover:bg-primary/5 text-primary text-xs font-semibold rounded-sm transition-colors"
            onClick={handleExportCSV}
          >
            <span className="material-symbols-outlined icon-xs text-primary">download</span>Export CSV
          </button>
          <button 
            className="btn btn-error flex items-center gap-2 px-4 py-2 bg-error text-white text-xs font-semibold rounded-sm hover:bg-red-700 transition-colors"
            onClick={() => handleBatchReorder(criticalAlerts)}
            disabled={criticalAlerts.length === 0}
          >
            <span className="material-symbols-outlined icon-xs text-white">refresh</span>Order All Critical
          </button>
        </div>
      </div>

      {/* Summary Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center text-error flex-shrink-0">
            <span className="material-symbols-outlined icon-filled">priority_high</span>
          </div>
          <div>
            <div className="text-[11px] font-bold text-outline uppercase tracking-wider">Critical Stock Alerts</div>
            <div className="text-2xl font-extrabold text-error leading-none mt-1">{criticalAlerts.length}</div>
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary flex-shrink-0">
            <span className="material-symbols-outlined">arrow_downward</span>
          </div>
          <div>
            <div className="text-[11px] font-bold text-outline uppercase tracking-wider">Low Stock Alerts</div>
            <div className="text-2xl font-extrabold text-tertiary leading-none mt-1">{lowAlerts.length}</div>
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <span className="material-symbols-outlined icon-filled">task_alt</span>
          </div>
          <div>
            <div className="text-[11px] font-bold text-outline uppercase tracking-wider">Resolved MTD</div>
            <div className="text-2xl font-extrabold text-primary leading-none mt-1">{resolvedAlerts.length}</div>
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
            <span className="material-symbols-outlined">health_and_safety</span>
          </div>
          <div>
            <div className="text-[11px] font-bold text-outline uppercase tracking-wider">Safety Rate</div>
            <div className="text-2xl font-extrabold text-on-surface leading-none mt-1">
              {activeAlerts.length === 0 ? '100%' : `${Math.max(0, 100 - activeAlerts.length * 3)}%`}
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs Toggle Strip */}
      <div className="flex border-b border-outline-variant/60 items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveSubTab('dashboards')}
            className={`px-4 py-2.5 font-bold uppercase tracking-wider border-b-2 text-[11px] flex items-center gap-1.5 transition-all ${activeSubTab === 'dashboards' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-outline hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined icon-sm">dashboard</span>Stock Dashboards
          </button>
          <button
            onClick={() => setActiveSubTab('status')}
            className={`px-4 py-2.5 font-bold uppercase tracking-wider border-b-2 text-[11px] flex items-center gap-1.5 transition-all ${activeSubTab === 'status' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-outline hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined icon-sm">settings_suggest</span>Alert Status
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2.5 font-bold uppercase tracking-wider border-b-2 text-[11px] flex items-center gap-1.5 transition-all ${activeSubTab === 'history' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-outline hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined icon-sm">history</span>Alert History
          </button>
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-4 py-2.5 font-bold uppercase tracking-wider border-b-2 text-[11px] flex items-center gap-1.5 transition-all ${activeSubTab === 'requests' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-outline hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined icon-sm">assignment</span>Restock Requests
            {pendingRequests.length > 0 && (
              <span className="ml-0.5 bg-error text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 pb-1.5">
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-xs text-on-surface-variant max-w-[180px] h-[32px] cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Render sub tabs */}
      {activeSubTab === 'dashboards' && (
        <div className="flex flex-col gap-8 animate-scale-up">
          {/* 1. Critical Stock Dashboard */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3.5 bg-error-container/20 border-l-4 border-l-error border border-outline-variant/30 rounded-md">
              <div>
                <h2 className="text-sm font-extrabold text-error uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined icon-sm text-error">dangerous</span>Critical Stock Dashboard
                </h2>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Items with 0 quantity or level below 50% of the safety limit. High replenishment priority.</p>
              </div>
              <button 
                className="btn btn-error btn-sm bg-error text-white font-semibold rounded-sm px-3 py-1.5 hover:brightness-115 text-xs uppercase"
                onClick={() => handleBatchReorder(criticalAlerts)}
                disabled={criticalAlerts.length === 0}
              >
                Place Bulk Critical Orders
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {criticalAlerts.map((alert) => {
                const pct = alert.threshold > 0 ? Math.round((alert.qty / alert.threshold) * 100) : 0;
                return (
                  <div key={alert._id} className="bg-surface-lowest border border-outline-variant/65 border-l-4 border-l-error rounded-md p-4 flex flex-col gap-3.5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-on-surface">{alert.item}</h3>
                        <span className="text-[10px] font-mono text-outline">{alert.sku}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-error-container text-error">
                        Critical
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-surface-low rounded p-2 text-center text-[11px]">
                      <div>
                        <span className="text-[9px] text-outline uppercase font-semibold">Stock</span>
                        <div className="font-extrabold text-error mt-0.5">{alert.qty}</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-outline uppercase font-semibold">Limit</span>
                        <div className="font-bold text-on-surface mt-0.5">{alert.threshold}</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-outline uppercase font-semibold">Ratio</span>
                        <div className="font-bold text-outline mt-0.5">{pct}%</div>
                      </div>
                    </div>

                    <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-error rounded-full" style={{ width: `${Math.min(100, pct)}%` }}></div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <button 
                        className="btn btn-error btn-sm bg-error text-white font-semibold rounded-sm px-2.5 py-1.5 text-xs hover:brightness-105"
                        onClick={() => onReorderClick(alert)}
                      >
                        Emergency Order
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm text-outline px-2.5 py-1.5 text-xs hover:bg-surface-low rounded-sm"
                        onClick={() => handleMuteAlert(alert._id)}
                      >
                        Mute
                      </button>
                    </div>
                  </div>
                );
              })}
              {criticalAlerts.length === 0 && (
                <div className="col-span-full border border-dashed border-outline-variant/60 bg-surface-low rounded-md p-10 text-center text-xs text-outline font-semibold">
                  No critical stock warnings logged. Warehouse safety ratios are healthy.
                </div>
              )}
            </div>
          </div>

          {/* 2. Low Stock Dashboard */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3.5 bg-tertiary-container/10 border-l-4 border-l-tertiary border border-outline-variant/30 rounded-md">
              <div>
                <h2 className="text-sm font-extrabold text-tertiary uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined icon-sm text-tertiary">warning</span>Low Stock Dashboard
                </h2>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Items with quantity below the safety threshold but greater than 50% ratio. Recommended for standard replenishment.</p>
              </div>
              <button 
                className="btn btn-outline btn-sm border border-primary/20 hover:bg-primary/5 text-primary font-semibold rounded-sm px-3 py-1.5 text-xs uppercase"
                onClick={() => handleBatchReorder(lowAlerts)}
                disabled={lowAlerts.length === 0}
              >
                Replenish All Low
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {lowAlerts.map((alert) => {
                const pct = alert.threshold > 0 ? Math.round((alert.qty / alert.threshold) * 100) : 0;
                return (
                  <div key={alert._id} className="bg-surface-lowest border border-outline-variant/65 border-l-4 border-l-tertiary rounded-md p-4 flex flex-col gap-3.5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-on-surface">{alert.item}</h3>
                        <span className="text-[10px] font-mono text-outline">{alert.sku}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-tertiary-container/20 text-tertiary">
                        Low Stock
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-surface-low rounded p-2 text-center text-[11px]">
                      <div>
                        <span className="text-[9px] text-outline uppercase font-semibold">Stock</span>
                        <div className="font-extrabold text-on-surface mt-0.5">{alert.qty}</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-outline uppercase font-semibold">Limit</span>
                        <div className="font-bold text-on-surface mt-0.5">{alert.threshold}</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-outline uppercase font-semibold">Ratio</span>
                        <div className="font-bold text-outline mt-0.5">{pct}%</div>
                      </div>
                    </div>

                    <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary rounded-full" style={{ width: `${Math.min(100, pct)}%` }}></div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <button 
                        className="btn btn-outline btn-sm border border-primary/20 text-primary font-semibold rounded-sm px-2.5 py-1.5 text-xs hover:bg-primary/5"
                        onClick={() => onReorderClick(alert)}
                      >
                        Replenish Stock
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm text-outline px-2.5 py-1.5 text-xs hover:bg-surface-low rounded-sm"
                        onClick={() => handleMuteAlert(alert._id)}
                      >
                        Mute
                      </button>
                    </div>
                  </div>
                );
              })}
              {lowAlerts.length === 0 && (
                <div className="col-span-full border border-dashed border-outline-variant/60 bg-surface-low rounded-md p-10 text-center text-xs text-outline font-semibold">
                  No standard low-stock alerts logged.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'status' && (
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden animate-scale-up">
          <div className="px-5 py-4 border-b border-outline-variant bg-surface-low">
            <h2 className="text-base font-bold text-on-surface">Active Alert Monitoring States</h2>
          </div>
          <div className="p-6 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-surface-low border border-outline-variant/50 rounded flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Unresolved Warnings</span>
                <span className="text-2xl font-extrabold text-on-surface">{activeAlerts.length} items</span>
                <span className="text-[11px] text-on-surface-variant">Active warnings needing reordering.</span>
              </div>
              <div className="p-4 bg-surface-low border border-outline-variant/50 rounded flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Muted Triggers</span>
                <span className="text-2xl font-extrabold text-on-surface">
                  {activeAlerts.filter(a => a.muted).length} items
                </span>
                <span className="text-[11px] text-on-surface-variant">Temporarily silenced for 24 hours.</span>
              </div>
              <div className="p-4 bg-surface-low border border-outline-variant/50 rounded flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Safety Compliance Rate</span>
                <span className="text-2xl font-extrabold text-primary">
                  {activeAlerts.length === 0 ? '100%' : `${100 - activeAlerts.length * 3}%`}
                </span>
                <span className="text-[11px] text-on-surface-variant">Ratio of healthy warehouse stocks.</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <h3 className="text-xs font-bold text-outline uppercase tracking-wider">Current Warning Monitoring Feed</h3>
              <div className="border border-outline-variant/40 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-low border-b border-outline-variant">
                      <th className="p-3 font-semibold text-outline text-[11px] uppercase">SKU</th>
                      <th className="p-3 font-semibold text-outline text-[11px] uppercase">Name</th>
                      <th className="p-3 font-semibold text-outline text-[11px] uppercase">Current Stock</th>
                      <th className="p-3 font-semibold text-outline text-[11px] uppercase">Min Limit</th>
                      <th className="p-3 font-semibold text-outline text-[11px] uppercase">Severity</th>
                      <th className="p-3 font-semibold text-outline text-[11px] uppercase">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAlerts.map(alert => (
                      <tr key={alert._id} className="border-b border-outline-variant/20 hover:bg-surface-low">
                        <td className="p-3 font-mono text-[11px] text-on-surface-variant">{alert.sku}</td>
                        <td className="p-3 font-semibold text-on-surface">{alert.item}</td>
                        <td className="p-3 font-bold text-on-surface">{alert.qty} units</td>
                        <td className="p-3 text-outline">{alert.threshold} units</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${alert.type === 'critical' ? 'bg-error-container text-error' : 'bg-tertiary-container/30 text-tertiary'}`}>
                            {alert.type}
                          </span>
                        </td>
                        <td className="p-3 text-outline">{formatDateTime(alert.createdAt)}</td>
                      </tr>
                    ))}
                    {activeAlerts.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-10 text-center text-outline">
                          All stocks are healthy and safety compliant. No active warnings found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden animate-scale-up">
          <div className="px-5 py-4 border-b border-outline-variant bg-surface-low">
            <h2 className="text-base font-bold text-on-surface">Resolved Stock Alerts History Log</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col border border-outline-variant/30 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-low border-b border-outline-variant">
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase">Item Details</th>
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase">SKU</th>
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase">Triggered Level</th>
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase">Min Limit</th>
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase">Triggered On</th>
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase">Resolved On</th>
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedAlerts.map(log => (
                    <tr key={log._id} className="border-b border-outline-variant/20 hover:bg-surface-low">
                      <td className="p-3 font-semibold text-on-surface">{log.item}</td>
                      <td className="p-3 font-mono text-[11px] text-on-surface-variant">{log.sku}</td>
                      <td className="p-3 text-error font-bold">{log.qty} units</td>
                      <td className="p-3 text-outline">{log.threshold} units</td>
                      <td className="p-3 text-outline">{formatDateTime(log.createdAt)}</td>
                      <td className="p-3 text-primary font-semibold">{formatDateTime(log.resolvedAt)}</td>
                      <td className="p-3 text-right">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                          Resolved
                        </span>
                      </td>
                    </tr>
                  ))}
                  {resolvedAlerts.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-10 text-center text-outline">
                        No historical stock alert logs resolved this MTD.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'requests' && (
        <div className="flex flex-col gap-6 animate-scale-up">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
              <div>
                <div className="text-[11px] font-bold text-outline uppercase tracking-wider">Pending Approval</div>
                <div className="text-2xl font-extrabold text-on-surface leading-none mt-1">{pendingRequests.length}</div>
              </div>
            </div>
            <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined icon-filled">check_circle</span>
              </div>
              <div>
                <div className="text-[11px] font-bold text-outline uppercase tracking-wider">Approved</div>
                <div className="text-2xl font-extrabold text-primary leading-none mt-1">
                  {restockRequests.filter(r => r.status === 'approved').length}
                </div>
              </div>
            </div>
            <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center text-error flex-shrink-0">
                <span className="material-symbols-outlined">cancel</span>
              </div>
              <div>
                <div className="text-[11px] font-bold text-outline uppercase tracking-wider">Rejected</div>
                <div className="text-2xl font-extrabold text-error leading-none mt-1">
                  {restockRequests.filter(r => r.status === 'rejected').length}
                </div>
              </div>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant bg-surface-low flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-on-surface">Restock Request Approval Queue</h2>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Review and action pending restock replenishment requests submitted by warehouse operators.
                </p>
              </div>
              {pendingRequests.length > 0 && (
                <span className="px-2.5 py-1 bg-error/10 text-error text-[11px] font-bold rounded-full uppercase">
                  {pendingRequests.length} Awaiting Action
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-low border-b border-outline-variant">
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase">Item</th>
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase">SKU</th>
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase">Qty Requested</th>
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase">Supplier</th>
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase">Submitted By</th>
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase">Date</th>
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase">Status</th>
                    <th className="p-3 font-semibold text-outline text-[11px] uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {restockRequests.map(req => (
                    <tr key={req._id} className={`border-b border-outline-variant/20 hover:bg-surface-low transition-colors ${req.status === 'pending' ? 'bg-secondary/[0.02]' : ''}`}>
                      <td className="p-3 font-semibold text-on-surface">{req.itemName}</td>
                      <td className="p-3 font-mono text-[11px] text-on-surface-variant">{req.sku}</td>
                      <td className="p-3 font-bold text-on-surface">
                        <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded font-bold">
                          {req.qty} units
                        </span>
                      </td>
                      <td className="p-3 text-on-surface-variant">{req.supplier || '—'}</td>
                      <td className="p-3 text-on-surface-variant">{req.op}</td>
                      <td className="p-3 text-outline">{formatDateTime(req.createdAt)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          req.status === 'pending'
                            ? 'bg-secondary-container text-secondary'
                            : req.status === 'approved'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-error-container text-error'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveRequest(req._id)}
                              disabled={requestActionLoading === req._id + '_approve' || requestActionLoading === req._id + '_reject'}
                              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-sm hover:bg-primary-container transition-colors disabled:opacity-50"
                            >
                              {requestActionLoading === req._id + '_approve' ? (
                                <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                              ) : (
                                <span className="material-symbols-outlined text-[13px]">check</span>
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req._id)}
                              disabled={requestActionLoading === req._id + '_approve' || requestActionLoading === req._id + '_reject'}
                              className="flex items-center gap-1 px-3 py-1.5 border border-error/30 text-error text-[11px] font-bold rounded-sm hover:bg-error/5 transition-colors disabled:opacity-50"
                            >
                              {requestActionLoading === req._id + '_reject' ? (
                                <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                              ) : (
                                <span className="material-symbols-outlined text-[13px]">close</span>
                              )}
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-outline italic">
                            {req.status === 'approved' ? `Approved ${req.resolvedAt ? formatDateTime(req.resolvedAt) : ''}` : `Rejected ${req.resolvedAt ? formatDateTime(req.resolvedAt) : ''}`}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {restockRequests.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-10 text-center text-outline">
                        No restock requests found. Requests are created when operators submit replenishment orders from the alerts dashboard.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
