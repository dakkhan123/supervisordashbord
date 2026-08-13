import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const drawDocHeader = (doc, title, subtitle) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // Navy Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SmartOps Management System', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(title, 14, 20);

  // Subtitle / Date
  if (subtitle) {
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(subtitle, 14, 35);
  }
};

const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')} | SmartOps Enterprise Audit`, 14, pageHeight - 6);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  }
};

/**
 * Generate PDF report for Inventory Catalog
 */
export const generateInventoryPDF = (items = [], filename) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawDocHeader(doc, 'Inventory Stock Catalog Report', `Total Items: ${items.length} | Export Date: ${formatDate(new Date())}`);

  const tableHeaders = [['#', 'Item Name', 'SKU', 'Category', 'Stock Qty', 'Min Threshold', 'Location', 'Price (INR)', 'Status']];
  const tableRows = items.map((item, idx) => [
    idx + 1,
    item.name || 'N/A',
    item.sku || 'N/A',
    item.cat || item.category || 'General',
    item.qty ?? 0,
    item.threshold ?? 0,
    item.loc || item.location || 'Warehouse',
    `₹${(item.val ?? item.price ?? 0).toLocaleString('en-IN')}`,
    (item.qty ?? 0) === 0 ? 'Out of Stock' : (item.qty ?? 0) <= (item.threshold ?? 0) ? 'Low Stock' : 'In Stock'
  ]);

  autoTable(doc, {
    startY: 40,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  addFooter(doc);
  const name = filename || `SmartOps_Inventory_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(name);
};

/**
 * Generate PDF report for Stock Alerts
 */
export const generateAlertsPDF = (alerts = [], filename) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawDocHeader(doc, 'Inventory Stock Alerts Audit Report', `Active Alerts Count: ${alerts.length} | Export Date: ${formatDate(new Date())}`);

  const tableHeaders = [['#', 'Item Name', 'SKU', 'Category', 'Current Qty', 'Min Threshold', 'Severity', 'Status', 'Alert Date']];
  const tableRows = alerts.map((alert, idx) => [
    idx + 1,
    alert.itemName || alert.item || 'N/A',
    alert.sku || 'N/A',
    alert.category || alert.cat || 'N/A',
    alert.qty ?? 0,
    alert.threshold ?? 0,
    (alert.severity || 'high').toUpperCase(),
    alert.muted ? 'Muted' : 'Active',
    formatDate(alert.createdAt || alert.date)
  ]);

  autoTable(doc, {
    startY: 40,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [185, 28, 28], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [254, 242, 242] }
  });

  addFooter(doc);
  const name = filename || `SmartOps_Stock_Alerts_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(name);
};

/**
 * Generate PDF report for Attendance Records
 */
export const generateAttendancePDF = (history = [], selectedDate, filename) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateText = selectedDate ? formatDate(selectedDate) : formatDate(new Date());
  drawDocHeader(doc, 'Worker Attendance & Geofence Logs Report', `Log Date: ${dateText} | Total Records: ${history.length}`);

  const tableHeaders = [['#', 'Worker Name', 'Role', 'Date', 'Check In', 'Check Out', 'Work Hours', 'Status', 'Geofence / Location']];
  const tableRows = history.map((record, idx) => [
    idx + 1,
    record.worker?.name || record.workerName || record.name || 'N/A',
    record.worker?.role || record.role || 'Worker',
    formatDate(record.date),
    record.checkIn || 'N/A',
    record.checkOut || 'N/A',
    record.hoursWorked ? `${record.hoursWorked} hrs` : 'N/A',
    record.status || 'Present',
    record.geofenced ? 'Geofenced (Verified)' : record.location || 'On-site'
  ]);

  autoTable(doc, {
    startY: 40,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [240, 253, 250] }
  });

  addFooter(doc);
  const name = filename || `SmartOps_Attendance_Export_${selectedDate || new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(name);
};

/**
 * Generate PDF report for Performance & KPI Metrics
 */
export const generatePerformancePDF = (perfData = [], dateFrom, dateTo, filename) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const rangeText = `Date Filter: ${dateFrom ? formatDate(dateFrom) : 'Beginning'} to ${dateTo ? formatDate(dateTo) : 'Current Date'}`;
  drawDocHeader(doc, 'Worker Performance & KPI Audit Report', `${rangeText} | Workers Audited: ${perfData.length}`);

  const tableHeaders = [['#', 'Worker Name', 'Role', 'Total Tasks', 'Completed', 'In Progress', 'Overdue', 'Completion Rate', 'Attendance Rate', 'Perf Score', 'Grade']];
  const tableRows = perfData.map((w, idx) => [
    idx + 1,
    w.name || w['Worker Name'] || 'N/A',
    w.role || w['Role'] || 'Worker',
    w.totalTasks ?? w['Total Tasks'] ?? 0,
    w.completed ?? w['Completed'] ?? 0,
    w.inProgress ?? w['In Progress'] ?? 0,
    w.overdue ?? w['Overdue'] ?? 0,
    `${w.completionRate ?? w['Completion Rate (%)'] ?? 0}%`,
    `${w.attendanceRate ?? w['Attendance Rate (%)'] ?? 0}%`,
    w.performanceScore ?? w['Performance Score'] ?? 0,
    w.grade || w['Grade'] || 'N/A'
  ]);

  autoTable(doc, {
    startY: 40,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  addFooter(doc);
  const name = filename || `Performance_Report_${dateFrom || 'all'}_to_${dateTo || 'today'}.pdf`;
  doc.save(name);
};

/**
 * Generate PDF report for Inventory Operations & Reports
 */
export const generateReportsPDF = (history = [], items = [], dateFrom, dateTo, summaryMetrics = {}, filename) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const rangeText = `Filter Period: ${dateFrom ? formatDate(dateFrom) : 'All Time'} to ${dateTo ? formatDate(dateTo) : 'Current Date'}`;
  drawDocHeader(doc, 'Inventory Operations & Financial Audit Report', `${rangeText} | Total Transactions: ${history.length}`);

  // Summary Metrics Box
  let startY = 34;
  if (summaryMetrics && Object.keys(summaryMetrics).length > 0) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 34, 269, 18, 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    const m = summaryMetrics;
    const txt1 = `Total Inflow: ${m.totalInflow ?? 0} units`;
    const txt2 = `Total Outflow: ${m.totalOutflow ?? 0} units`;
    const txt3 = `Purchases: ₹${(m.totalPurchaseVal ?? 0).toLocaleString('en-IN')}`;
    const txt4 = `GST Tax: ₹${(m.totalGSTVal ?? 0).toLocaleString('en-IN')}`;
    const txt5 = `Asset Valuation: ₹${(m.totalAssetVal ?? 0).toLocaleString('en-IN')}`;

    doc.text(`${txt1}   |   ${txt2}   |   ${txt3}   |   ${txt4}   |   ${txt5}`, 18, 45);
    startY = 56;
  }

  const tableHeaders = [['#', 'Date', 'Item Name', 'SKU', 'Type', 'Qty', 'GST %', 'Operator', 'Location', 'Value (INR)']];
  const tableRows = history.map((h, idx) => [
    idx + 1,
    formatDate(h.date),
    h.item || 'N/A',
    h.sku || 'N/A',
    h.type === 'in' ? 'Inflow' : 'Outflow',
    h.qty ?? 0,
    `${h.gst ?? 18}%`,
    h.op || 'System',
    h.loc || 'Warehouse',
    `₹${(h.val ?? 0).toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    startY: startY,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  addFooter(doc);
  const name = filename || `Inventory_Report_${dateFrom || 'all'}_to_${dateTo || 'today'}.pdf`;
  doc.save(name);
};

/**
 * Generate PDF report for Modal Breakdown details
 */
export const generateBreakdownPDF = (modalTitle = 'Breakdown Audit', headers = [], rows = [], filename) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawDocHeader(doc, `Breakdown Report: ${modalTitle}`, `Export Date: ${formatDate(new Date())} | Total Records: ${rows.length}`);

  const formattedRows = rows.map((row, idx) => {
    if (Array.isArray(row)) return [idx + 1, ...row.map(val => String(val).replace(/^"|"$/g, ''))];
    return [idx + 1, ...Object.values(row)];
  });

  const formattedHeaders = [['#', ...headers]];

  autoTable(doc, {
    startY: 40,
    head: formattedHeaders,
    body: formattedRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  addFooter(doc);
  const sanitize = (modalTitle || 'Breakdown_Report').replace(/[^a-zA-Z0-9]/g, '_');
  const name = filename || `${sanitize}.pdf`;
  doc.save(name);
};
