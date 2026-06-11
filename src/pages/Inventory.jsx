import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { DeleteConfirmModal } from '../components/Modals';

const Inventory = ({ searchVal, showToast, onAddClick, onEditClick, onReorderClick, refreshTrigger }) => {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentFilter, setCurrentFilter] = useState(() => {
    if (location.state && location.state.filter) {
      return location.state.filter;
    }
    return 'all';
  });

  const [sortMode, setSortMode] = useState(() => {
    if (location.state && location.state.sort) {
      return location.state.sort;
    }
    return 'name';
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Capture navigation state updates
  useEffect(() => {
    if (location.state) {
      if (location.state.filter) {
        setCurrentFilter(location.state.filter);
      }
      if (location.state.sort) {
        setSortMode(location.state.sort);
      }
      setCurrentPage(1);
    }
  }, [location.state]);

  const PAGE_SIZE = 10;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getInventory();
      if (res.success) {
        setItems(res.data);
      } else {
        setError(res.error || 'Failed to retrieve inventory catalog');
      }
    } catch (err) {
      console.error(err);
      setError('Connection refused. Verify local database server status.');
      showToast('Error fetching inventory items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleExportCSV = () => {
    if (items.length === 0) return showToast('No items to export', 'error');
    const headers = ['Name', 'SKU', 'Category', 'Quantity', 'Safety Threshold', 'Unit Price (INR)', 'Location', 'GST Rate (%)', 'Supplier'];
    const rows = items.map(item => [
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.sku}"`,
      `"${item.cat}"`,
      item.qty,
      item.threshold,
      item.val,
      `"${item.loc}"`,
      item.gst,
      `"${(item.supplier || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SmartOps_Inventory_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV downloaded successfully!', 'success');
  };

  const handleCategoryFilter = (cat) => {
    setCurrentFilter(cat);
    setCurrentPage(1);
    setSelectedRows(new Set());
  };

  const handleSortChange = (e) => {
    setSortMode(e.target.value);
    setCurrentPage(1);
  };

  const [deleteItemData, setDeleteItemData] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleDeleteItem = (item) => {
    setDeleteItemData(item);
    setDeleteModalOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!deleteItemData) return;
    try {
      const res = await api.deleteItem(deleteItemData._id);
      if (res.success) {
        showToast('Item deleted successfully', 'success');
        setDeleteModalOpen(false);
        setDeleteItemData(null);
        fetchData();
      } else {
        showToast(res.error || 'Failed to delete item', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error during deletion', 'error');
    }
  };

  // Select Row handlers
  const toggleRow = (idx) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleAllRows = (e, pageIndices) => {
    if (e.target.checked) {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        pageIndices.forEach(idx => next.add(idx));
        return next;
      });
    } else {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        pageIndices.forEach(idx => next.delete(idx));
        return next;
      });
    }
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  const handleBulkReorder = async () => {
    if (selectedRows.size === 0) return;
    try {
      const selectedItems = Array.from(selectedRows).map(idx => filteredData[idx]);
      showToast(`Placing bulk reorders for ${selectedItems.length} items...`, 'success');
      
      await Promise.all(
        selectedItems.map(item => 
          api.reorderItem({
            sku: item.sku,
            qty: Math.max((item.threshold - item.qty) * 2, 100),
            op: 'Rajesh Kumar',
            supplier: item.supplier
          })
        )
      );
      
      showToast('Bulk reorders placed successfully!', 'success');
      clearSelection();
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Failed to execute bulk reorder', 'error');
    }
  };

  // Build filtered and sorted dataset
  const getFilteredAndSorted = () => {
    let data = [...items];

    // Sidebar search synchronization
    if (searchVal) {
      const q = searchVal.toLowerCase();
      data = data.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q));
    }

    // Category / Critical / Near filters
    if (currentFilter !== 'all') {
      if (currentFilter === 'critical') {
        data = data.filter(i => i.status === 'critical');
      } else if (currentFilter === 'near') {
        data = data.filter(i => i.status === 'near');
      } else {
        data = data.filter(i => i.cat === currentFilter);
      }
    }

    // Sorting Modes
    if (sortMode === 'name') {
      data.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'stock-asc') {
      data.sort((a, b) => a.qty - b.qty);
    } else if (sortMode === 'stock-desc') {
      data.sort((a, b) => b.qty - a.qty);
    } else if (sortMode === 'value') {
      data.sort((a, b) => (b.qty * b.val) - (a.qty * a.val));
    }

    return data;
  };

  const filteredData = getFilteredAndSorted();
  const totalItemsCount = filteredData.length;
  const totalPages = Math.ceil(totalItemsCount / PAGE_SIZE);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const paginatedData = filteredData.slice(startIdx, startIdx + PAGE_SIZE);

  // Helper arrays for Select All bindings
  const paginatedIndices = paginatedData.map((_, i) => startIdx + i);
  const isAllSelected = paginatedIndices.length > 0 && paginatedIndices.every(idx => selectedRows.has(idx));

  // Visual Stock Gauge calculations
  const getStockGauges = (item) => {
    const pct = Math.min(100, Math.round((item.qty / item.threshold) * 100));
    const color = pct < 50 ? 'bg-error' : pct < 100 ? 'bg-tertiary' : 'bg-primary';
    const textColor = pct < 50 ? 'text-error' : 'text-on-surface';
    return (
      <div className="flex items-center gap-2">
        <span className={`font-semibold min-w-[48px] ${textColor}`}>{item.qty.toLocaleString('en-IN')}</span>
        <div className="w-[80px] h-[5px] bg-surface-container-high rounded-full overflow-hidden inline-block">
          <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  // Status Badge Helper
  const getStatusBadge = (st) => {
    const badgeColors = {
      critical: 'bg-error-container text-error',
      low: 'bg-tertiary-container/30 text-tertiary',
      near: 'bg-secondary-container text-secondary',
      ok: 'bg-primary/10 text-primary'
    };
    const labels = {
      critical: 'Critical',
      low: 'Low',
      near: 'Near Limit',
      ok: 'Available'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${badgeColors[st] || 'bg-surface-container text-outline'}`}>
        {labels[st] || st}
      </span>
    );
  };

  // Format currency
  const formatINR = (num) => '₹' + num.toLocaleString('en-IN');

  const categories = [
    { key: 'all', label: 'All Items' },
    { key: 'Electronics', label: 'Electronics' },
    { key: 'Mechanical', label: 'Mechanical' },
    { key: 'Consumables', label: 'Consumables' },
    { key: 'Raw Materials', label: 'Raw Materials' },
    { key: 'Packaging', label: 'Packaging' }
  ];

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Complete Inventory List</h1>
            <p className="text-on-surface-variant text-sm">Unit Pune-A12, Maharashtra</p>
          </div>
        </div>
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm p-14 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px]">error</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">Inventory Loading Failed</h2>
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
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Complete Inventory List</h1>
          <p className="text-on-surface-variant text-sm">
            {items.length.toLocaleString('en-IN')} items across {categories.length - 1} categories · Unit Pune-A12, Maharashtra
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button className="btn btn-outline flex items-center gap-2 px-4 py-2 border border-primary/20 hover:bg-primary/5 text-primary text-xs font-semibold rounded-sm transition-colors duration-150" onClick={handleExportCSV}>
            <span className="material-symbols-outlined icon-xs text-primary">download</span>Export CSV
          </button>
          <button className="btn btn-primary flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-sm hover:bg-primary-container transition-colors duration-150" onClick={() => onAddClick()}>
            <span className="material-symbols-outlined icon-xs text-white">add</span>Add Item
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 flex-wrap mb-1 text-xs">
        <span className="font-bold text-outline uppercase tracking-wider mr-1">Filters:</span>
        {categories.map((c) => (
          <span 
            key={c.key} 
            onClick={() => handleCategoryFilter(c.key)}
            className={`cursor-pointer px-3 py-1.5 border border-outline-variant text-[12px] font-semibold rounded-full transition-all duration-150 hover:border-primary hover:text-primary ${currentFilter === c.key ? 'bg-primary/8 text-primary border-primary' : 'bg-surface-lowest text-on-surface-variant'}`}
          >
            {c.label}
          </span>
        ))}
        <span 
          onClick={() => handleCategoryFilter('critical')}
          className={`cursor-pointer px-3 py-1.5 border border-error/30 text-[12px] font-semibold text-error rounded-full transition-all duration-150 hover:bg-error/5 flex items-center gap-1 ${currentFilter === 'critical' ? 'bg-error/10 text-error border-error' : 'bg-surface-lowest'}`}
        >
          <span className="material-symbols-outlined icon-xs text-error">warning</span>Critical Only
        </span>

        <span 
          onClick={() => handleCategoryFilter('near')}
          className={`cursor-pointer px-3 py-1.5 border border-secondary/30 text-[12px] font-semibold text-secondary rounded-full transition-all duration-150 hover:bg-secondary/5 flex items-center gap-1 ${currentFilter === 'near' ? 'bg-secondary/10 text-secondary border-secondary' : 'bg-surface-lowest'}`}
        >
          <span className="material-symbols-outlined icon-xs text-secondary">hourglass_empty</span>Near Safety Limit
        </span>

        <div className="flex-1 min-w-4 sm:min-w-0"></div>

        <select 
          value={sortMode}
          onChange={handleSortChange}
          className="px-3 py-1.5 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-xs text-on-surface-variant max-w-[180px] h-[36px]"
        >
          <option value="name">Sort: Name A–Z</option>
          <option value="stock-asc">Stock: Low to High</option>
          <option value="stock-desc">Stock: High to Low</option>
          <option value="value">Total Value (₹)</option>
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary text-white rounded-[10px] animate-scale-up">
          <span className="material-symbols-outlined text-[18px]">check_box</span>
          <span className="text-xs font-semibold">{selectedRows.size} items selected</span>
          <div className="flex-1"></div>
          <button 
            className="px-3 py-1.5 bg-white/20 text-white font-semibold rounded-sm text-xs flex items-center gap-1 hover:bg-white/30 transition-colors"
            onClick={handleBulkReorder}
          >
            <span className="material-symbols-outlined icon-xs">refresh</span>Bulk Reorder
          </button>
          <button 
            className="px-3 py-1.5 bg-white/20 text-white font-semibold rounded-sm text-xs flex items-center gap-1 hover:bg-white/30 transition-colors"
            onClick={clearSelection}
          >
            <span className="material-symbols-outlined icon-xs">close</span>Clear
          </button>
        </div>
      )}

      {/* Table Data */}
      <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-low border-b border-outline-variant">
                <th className="p-3 w-10">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={(e) => toggleAllRows(e, paginatedIndices)}
                    className="cursor-pointer"
                  />
                </th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Item</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">SKU</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Category</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Stock Level</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Location</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Total Value (₹)</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">GST</th>
                <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Status</th>
                <th className="p-3 text-[11px] font-bold text-outline tracking-wider text-right uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse border-b border-outline-variant/10">
                    <td className="p-3"><div className="w-4 h-4 bg-surface-container-high rounded"></div></td>
                    <td className="p-3">
                      <div className="flex gap-2.5 items-center">
                        <div className="w-8 h-8 rounded-lg bg-surface-container-high"></div>
                        <div className="flex flex-col gap-1.5">
                          <div className="h-3.5 bg-surface-container-high rounded w-32"></div>
                          <div className="h-3 bg-surface-container rounded w-20"></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3"><div className="h-3.5 bg-surface-container rounded w-16"></div></td>
                    <td className="p-3"><div className="h-5 bg-surface-container rounded-full w-24"></div></td>
                    <td className="p-3"><div className="h-3.5 bg-surface-container-high rounded w-20"></div></td>
                    <td className="p-3"><div className="h-3.5 bg-surface-container rounded w-16"></div></td>
                    <td className="p-3"><div className="h-3.5 bg-surface-container-high rounded w-16"></div></td>
                    <td className="p-3"><div className="h-3.5 bg-surface-container rounded w-10"></div></td>
                    <td className="p-3"><div className="h-5 bg-surface-container rounded w-16"></div></td>
                    <td className="p-3 text-right"><div className="w-16 h-6 bg-surface-container rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : (
                paginatedData.map((item, i) => {
                const globalIdx = startIdx + i;
                const isChecked = selectedRows.has(globalIdx);
                const totalVal = item.qty * item.val;
                return (
                  <tr 
                    key={item._id} 
                    className={`border-b border-outline-variant/30 hover:bg-surface-low transition-colors duration-150 ${isChecked ? 'bg-primary/5 hover:bg-primary/5' : ''}`}
                  >
                    <td className="p-3">
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => toggleRow(globalIdx)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[16px]">
                          {item.emoji || '📦'}
                        </div>
                        <div>
                          <p className="font-semibold text-on-surface leading-snug">{item.name}</p>
                          <span className="text-[10px] text-outline">Min threshold: {item.threshold.toLocaleString('en-IN')} units</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-on-surface-variant">{item.sku}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container text-on-surface-variant">
                        {item.cat === 'Electronics' ? '⚡' : item.cat === 'Mechanical' ? '⚙️' : item.cat === 'Consumables' ? '🧪' : item.cat === 'Raw Materials' ? '🟤' : '📦'} {item.cat}
                      </span>
                    </td>
                    <td className={`p-3 transition-all duration-300 ${location.state?.highlightStock ? 'bg-primary/5 font-extrabold ring-1 ring-primary/20 rounded-md scale-[1.01]' : ''}`}>
                      {getStockGauges(item)}
                    </td>
                    <td className="p-3 text-on-surface-variant text-[12px]">{item.loc}</td>
                    <td className="p-3 font-semibold text-on-surface">{formatINR(totalVal)}</td>
                    <td className="p-3 text-on-surface-variant text-[12px]">{item.gst}%</td>
                    <td className="p-3">{getStatusBadge(item.status)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          className="w-[28px] h-[28px] flex items-center justify-center rounded hover:bg-surface-container text-on-surface-variant"
                          onClick={() => onEditClick(item)}
                          title="Edit"
                        >
                          <span className="material-symbols-outlined icon-xs">edit</span>
                        </button>
                        <button 
                          className="w-[28px] h-[28px] flex items-center justify-center rounded hover:bg-surface-container text-error"
                          onClick={() => handleDeleteItem(item)}
                          title="Delete"
                        >
                          <span className="material-symbols-outlined icon-xs text-error">delete</span>
                        </button>
                        {item.status === 'critical' || item.status === 'low' ? (
                          <button 
                            className="btn btn-error btn-sm bg-error text-white font-semibold rounded-sm hover:bg-red-700 px-2.5 py-1"
                            onClick={() => onReorderClick(item)}
                          >
                            Reorder
                          </button>
                        ) : (
                          <button 
                            className="btn btn-outline btn-sm font-semibold rounded-sm hover:bg-primary/5 text-primary border border-primary/20 px-2.5 py-1"
                            onClick={() => showToast(`${item.sku} reviewed`, 'success')}
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }))}
              {!loading && filteredData.length === 0 && (
                <tr>
                  <td colSpan="10" className="p-10 text-center text-outline">
                    No inventory items matched your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-outline-variant flex items-center justify-between text-xs text-outline font-semibold">
            <span>
              Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, totalItemsCount)} of {totalItemsCount} items
            </span>
            <div className="flex gap-1.5">
              <button 
                className="w-8 h-8 rounded border border-outline-variant/30 flex items-center justify-center hover:bg-surface-low disabled:opacity-50"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => Math.abs(page - currentPage) <= 2)
                .map(page => (
                  <button 
                    key={page}
                    className={`w-8 h-8 rounded border flex items-center justify-center transition-colors duration-150 ${currentPage === page ? 'bg-primary border-primary text-white font-bold' : 'border-outline-variant/30 text-on-surface hover:bg-surface-low'}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))
              }
              <button 
                className="w-8 h-8 rounded border border-outline-variant/30 flex items-center justify-center hover:bg-surface-low disabled:opacity-50"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
      <DeleteConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteItem}
        itemName={deleteItemData ? deleteItemData.name : ''}
      />
    </div>
  );
};

export default Inventory;
