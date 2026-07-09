import { useState, useEffect } from 'react';
import { api } from '../services/api';

const Salary = ({ showToast }) => {
  const [workers, setWorkers] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);

  // Tabs: 'calculator', 'history', 'analytics'
  const [activeTab, setActiveTab] = useState('calculator');

  // Month selection options (last 12 months)
  const [monthsList] = useState(() => {
    const list = [];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const d = new Date();
    // Allow selecting from current month backwards
    for (let i = 0; i < 12; i++) {
      list.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
      d.setMonth(d.getMonth() - 1);
    }
    return list;
  });

  // Calculator State
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(monthsList[0]);
  const [calcData, setCalcData] = useState(null);

  // Editable Form Fields (initialized from calculated values)
  const [formFields, setFormFields] = useState({
    baseSalary: 0,
    tasksCompleted: 0,
    tasksIncentive: 0,
    overtimeHours: 0,
    overtimeRate: 150,
    deductions: 0,
    advances: 0,
    status: 'Pending',
    notes: ''
  });

  // History Filter state
  const [filterWorker, setFilterWorker] = useState('');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Selected Salary for Payslip Modal
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  // Fetch initial base data (workers and history)
  const fetchBaseData = async () => {
    try {
      setLoading(true);
      const [workersRes, salariesRes] = await Promise.all([
        api.getWorkers(),
        api.getSalaries()
      ]);

      if (workersRes.success) {
        setWorkers(workersRes.data.filter(w => w.status === 'Active'));
      }
      if (salariesRes.success) {
        setSalaries(salariesRes.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading payroll data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalariesHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.getSalaries();
      if (res.success) {
        setSalaries(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'analytics') {
      fetchSalariesHistory();
    }
  }, [activeTab]);

  // Load calculations when worker/month changes in Calculator tab
  const handleCalculate = async () => {
    if (!selectedWorkerId || !selectedMonth) return;
    try {
      setCalcLoading(true);
      const res = await api.calculateSalary(selectedWorkerId, selectedMonth);
      if (res.success && res.data) {
        setCalcData(res.data);
        const { calculations, attendance } = res.data;
        setFormFields({
          baseSalary: calculations.baseSalary,
          tasksCompleted: calculations.tasksCompleted,
          tasksIncentive: calculations.tasksIncentive,
          overtimeHours: calculations.overtimeHours,
          overtimeRate: calculations.overtimeRate,
          deductions: attendance.absent,
          advances: calculations.advances,
          status: 'Pending',
          notes: `Payroll for ${selectedMonth}`
        });
      } else {
        showToast(res.error || 'Failed to compute automatic salary', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error during auto salary calculation', 'error');
    } finally {
      setCalcLoading(false);
    }
  };

  useEffect(() => {
    handleCalculate();
  }, [selectedWorkerId, selectedMonth]);

  // Compute live amount based on editable fields
  const getLiveNetSalary = () => {
    const { baseSalary, tasksIncentive, overtimeHours, overtimeRate, deductions, advances } = formFields;
    const deductionAmount = Math.round((Number(baseSalary) / 22) * Number(deductions));
    const net = Number(baseSalary) + Number(tasksIncentive) + (Number(overtimeHours) * Number(overtimeRate)) - deductionAmount - Number(advances);
    return Math.max(0, Math.round(net));
  };

  // Submit processed payroll
  const handleProcessPayroll = async (e) => {
    e.preventDefault();
    if (!selectedWorkerId || !selectedMonth) {
      return showToast('Please select a worker and month', 'error');
    }

    try {
      const payload = {
        worker: selectedWorkerId,
        month: selectedMonth,
        baseSalary: Number(formFields.baseSalary),
        tasksCompleted: Number(formFields.tasksCompleted),
        tasksIncentive: Number(formFields.tasksIncentive),
        overtimeHours: Number(formFields.overtimeHours),
        overtimeRate: Number(formFields.overtimeRate),
        deductions: Number(formFields.deductions),
        advances: Number(formFields.advances),
        amount: getLiveNetSalary(),
        status: formFields.status,
        notes: formFields.notes
      };

      const res = await api.createSalary(payload);
      if (res.success) {
        showToast('Payroll processed and logged successfully', 'success');
        // Reset selections
        setSelectedWorkerId('');
        setCalcData(null);
        // Refresh records list
        fetchSalariesHistory();
      } else {
        showToast(res.error || 'Failed to process payroll', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection refused when saving payroll', 'error');
    }
  };

  // Quick Action: Flip payment status
  const handleTogglePaymentStatus = async (id, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'Paid' ? 'Pending' : 'Paid';
      const res = await api.updateSalary(id, { status: nextStatus });
      if (res.success) {
        showToast(`Salary status updated to ${nextStatus}`, 'success');
        // Update local state directly
        setSalaries(prev => prev.map(s => s._id === id ? { ...s, status: nextStatus } : s));
      } else {
        showToast(res.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating payment status', 'error');
    }
  };

  // Delete payroll log
  const handleDeleteSalary = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payroll log record?')) return;
    try {
      const res = await api.deleteSalary(id);
      if (res.success) {
        showToast('Payroll record deleted', 'success');
        setSalaries(prev => prev.filter(s => s._id !== id));
      } else {
        showToast(res.error || 'Deletion failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting payroll log', 'error');
    }
  };

  // Download Payslip as PDF using html2pdf
  const handleDownloadPDF = () => {
    if (!selectedPayslip) return;
    const element = document.getElementById('printable-payslip');
    const opt = {
      margin:       10,
      filename:     `payslip-${selectedPayslip.worker?.name || 'worker'}-${selectedPayslip.month}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Load html2pdf dynamically from CDN if it is not already present on window object
    if (window.html2pdf) {
      window.html2pdf().set(opt).from(element).save();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        window.html2pdf().set(opt).from(element).save();
      };
      document.body.appendChild(script);
    }
  };

  // Filter salaries list
  const filteredSalaries = salaries.filter(s => {
    const matchesWorker = !filterWorker || (s.worker?.name && s.worker.name.toLowerCase().includes(filterWorker.toLowerCase()));
    const matchesMonth = filterMonth === 'All' || s.month === filterMonth;
    const matchesStatus = filterStatus === 'All' || s.status === filterStatus;
    return matchesWorker && matchesMonth && matchesStatus;
  });

  // Sum calculations for Analytics tab
  const getAnalytics = () => {
    let totalProcessed = salaries.length;
    let totalPaid = 0;
    let totalPending = 0;
    let totalIncentives = 0;
    let totalDeductions = 0;

    salaries.forEach(s => {
      if (s.status === 'Paid') {
        totalPaid += s.amount || 0;
      } else {
        totalPending += s.amount || 0;
      }
      totalIncentives += (s.tasksIncentive || 0) + ((s.overtimeHours || 0) * (s.overtimeRate || 0));
      const deductionAmt = Math.round(((s.baseSalary || 0) / 22) * (s.deductions || 0));
      totalDeductions += deductionAmt + (s.advances || 0);
    });

    // Payout by month data structure
    const monthsObj = {};
    salaries.forEach(s => {
      monthsObj[s.month] = (monthsObj[s.month] || 0) + (s.amount || 0);
    });

    const monthlyTrends = Object.entries(monthsObj).map(([month, val]) => ({ month, val })).slice(0, 6);

    return {
      totalProcessed,
      totalPaid,
      totalPending,
      totalIncentives,
      totalDeductions,
      monthlyTrends
    };
  };

  const analytics = getAnalytics();

  const formatINR = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-xs text-outline font-bold uppercase tracking-wider">Loading Salary Registry...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-on-surface">Salary & Payroll</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant gap-4">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition-colors ${activeTab === 'calculator' ? 'text-primary border-b-2 border-primary' : 'text-outline hover:text-on-surface'}`}
        >
          Salary Calculator
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition-colors ${activeTab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-outline hover:text-on-surface'}`}
        >
          Salary Logs & History
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition-colors ${activeTab === 'analytics' ? 'text-primary border-b-2 border-primary' : 'text-outline hover:text-on-surface'}`}
        >
          Payroll Analytics
        </button>
      </div>

      {/* Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Parameters / Input Form */}
          <div className="lg:col-span-1 bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined icon-sm text-primary">filter_list</span>Parameters
            </h2>
            
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Select Worker</label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface text-sm focus:border-primary"
                >
                  <option value="">-- Choose Worker --</option>
                  {workers.map(w => (
                    <option key={w._id} value={w._id}>{w.name} ({w.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Calculation Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface text-sm focus:border-primary"
                >
                  {monthsList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Summary of stats from backend */}
            {selectedWorkerId && calcLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-outline">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Computing automatic parameters...
              </div>
            )}

            {selectedWorkerId && calcData && !calcLoading && (
              <div className="border border-outline-variant rounded-sm bg-surface-low p-4 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Automated Stats Log</h3>
                
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-surface-lowest p-2 border border-outline-variant rounded-sm">
                    <span className="text-[9px] text-outline font-bold uppercase block">Present Days</span>
                    <span className="text-sm font-black text-primary">{calcData.attendance.present}</span>
                  </div>
                  <div className="bg-surface-lowest p-2 border border-outline-variant rounded-sm">
                    <span className="text-[9px] text-outline font-bold uppercase block">Absent Days</span>
                    <span className="text-sm font-black text-error">{calcData.attendance.absent}</span>
                  </div>
                  <div className="bg-surface-lowest p-2 border border-outline-variant rounded-sm">
                    <span className="text-[9px] text-outline font-bold uppercase block">Leave Days</span>
                    <span className="text-sm font-black text-secondary">{calcData.attendance.leave}</span>
                  </div>
                  <div className="bg-surface-lowest p-2 border border-outline-variant rounded-sm">
                    <span className="text-[9px] text-outline font-bold uppercase block">Tasks Completed</span>
                    <span className="text-sm font-black text-tertiary">{calcData.calculations.tasksCompleted}</span>
                  </div>
                </div>
                <div className="text-[10px] text-outline leading-tight font-medium">
                  * Absence deductions and completed task incentives are calculated dynamically from actual shift records.
                </div>
              </div>
            )}
          </div>

          {/* Calculator Section */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {!selectedWorkerId ? (
              <div className="flex-1 bg-surface-lowest border border-outline-variant rounded-md shadow-sm flex flex-col items-center justify-center py-20 text-center px-6">
                <span className="material-symbols-outlined text-[48px] text-outline/40">calculate</span>
                <h3 className="text-sm font-bold text-on-surface mt-4 uppercase">Select a Worker to Calculate</h3>
                <p className="text-xs text-outline mt-1 max-w-[320px]">Choose a worker from the sidebar parameter panel to load automated shift stats and run payroll calculations.</p>
              </div>
            ) : calcLoading ? (
              <div className="flex-1 bg-surface-lowest border border-outline-variant rounded-md shadow-sm flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                <p className="text-xs text-outline font-bold uppercase tracking-wider">Recalculating shift payouts...</p>
              </div>
            ) : (
              <form onSubmit={handleProcessPayroll} className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-low">
                  <div>
                    <h3 className="text-sm font-extrabold text-on-surface uppercase tracking-wider">Payroll Calculations: {calcData?.worker.name}</h3>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider mt-0.5">{calcData?.worker.role} · Base Payout: {formatINR(calcData?.worker.salary)}</p>
                  </div>
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide border border-primary/20">{selectedMonth}</span>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left Column: Earnings */}
                  <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-black text-primary uppercase tracking-wider border-b border-outline-variant pb-1.5">Earnings & Incentives</h4>

                    <div>
                      <label className="text-[10px] font-bold text-outline uppercase block mb-1">Base Monthly Wage (INR)</label>
                      <input
                        type="number"
                        disabled
                        value={formFields.baseSalary}
                        className="w-full px-3 py-2 border border-outline-variant rounded-sm bg-surface-low outline-none text-on-surface-variant font-mono text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-outline uppercase block mb-1">Tasks Completed</label>
                        <input
                          type="number"
                          min="0"
                          value={formFields.tasksCompleted}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormFields(prev => ({ 
                              ...prev, 
                              tasksCompleted: val, 
                              tasksIncentive: val * 100 // auto-update incentive amount
                            }));
                          }}
                          className="w-full px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface font-mono text-sm focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-outline uppercase block mb-1">Task Incentive (INR)</label>
                        <input
                          type="number"
                          min="0"
                          value={formFields.tasksIncentive}
                          onChange={(e) => setFormFields(prev => ({ ...prev, tasksIncentive: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface font-mono text-sm focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-outline uppercase block mb-1">Overtime (Hours)</label>
                        <input
                          type="number"
                          min="0"
                          value={formFields.overtimeHours}
                          onChange={(e) => setFormFields(prev => ({ ...prev, overtimeHours: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface font-mono text-sm focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-outline uppercase block mb-1">Hourly OT Rate (INR)</label>
                        <input
                          type="number"
                          min="0"
                          value={formFields.overtimeRate}
                          onChange={(e) => setFormFields(prev => ({ ...prev, overtimeRate: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface font-mono text-sm focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Deductions & Payout */}
                  <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-black text-error uppercase tracking-wider border-b border-outline-variant pb-1.5">Deductions & Advances</h4>

                    <div>
                      <label className="text-[10px] font-bold text-outline uppercase block mb-1">Absence Deductions (Days)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formFields.deductions}
                        onChange={(e) => setFormFields(prev => ({ ...prev, deductions: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface font-mono text-sm focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-outline uppercase block mb-1">Advances Issued (INR)</label>
                      <input
                        type="number"
                        min="0"
                        value={formFields.advances}
                        onChange={(e) => setFormFields(prev => ({ ...prev, advances: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface font-mono text-sm focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-outline uppercase block mb-1">Payment Status</label>
                        <select
                          value={formFields.status}
                          onChange={(e) => setFormFields(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface text-xs focus:border-primary"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-outline uppercase block mb-1">Notes / Payslip Memo</label>
                        <input
                          type="text"
                          value={formFields.notes}
                          onChange={(e) => setFormFields(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="e.g. Month check"
                          className="w-full px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-on-surface text-xs focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Salary Summary Panel */}
                <div className="m-5 mt-0 p-5 bg-gradient-to-br from-primary-container/10 to-primary-container/20 border border-primary/25 rounded-md flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-on-surface uppercase tracking-wide">Net Salary Payable (Live Update)</h4>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider mt-1">
                      Formula: Base ({formFields.baseSalary}) + Task Incentive ({formFields.tasksIncentive}) + Overtime ({formFields.overtimeHours * formFields.overtimeRate}) - Deductions ({Math.round((formFields.baseSalary / 22) * formFields.deductions)} for {formFields.deductions} days) - Advances ({formFields.advances})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-outline font-bold uppercase block mb-0.5">Calculated Payout</span>
                    <span className="text-2xl font-black text-primary">{formatINR(getLiveNetSalary())}</span>
                  </div>
                </div>

                {/* Submit button */}
                <div className="px-5 py-4 border-t border-outline-variant bg-surface-low flex justify-end">
                  <button
                    type="submit"
                    className="btn btn-primary bg-primary text-white hover:bg-primary-container px-6 py-2.5 rounded-sm font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined icon-sm">assignment_turned_in</span>Save & Process Payroll
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm p-5 flex flex-col gap-5">
          
          {/* Filtering bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant pb-4">
            <h2 className="text-sm font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined icon-sm text-primary">history</span>Payroll Registry
            </h2>
            
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <input
                  type="text"
                  placeholder="Search Worker..."
                  value={filterWorker}
                  onChange={(e) => setFilterWorker(e.target.value)}
                  className="px-2.5 py-1.5 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-xs text-on-surface focus:border-primary w-[160px]"
                />
              </div>

              <div>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-2.5 py-1.5 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-xs text-on-surface focus:border-primary"
                >
                  <option value="All">All Months</option>
                  {monthsList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 border border-outline-variant rounded-sm bg-surface-lowest outline-none text-xs text-on-surface focus:border-primary"
                >
                  <option value="All">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Data Table */}
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-[10px] text-outline font-bold uppercase tracking-wider">Refreshing logs...</span>
            </div>
          ) : filteredSalaries.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-[40px] text-outline/30">folder_open</span>
              <p className="text-xs text-outline font-bold uppercase mt-3">No processed salaries found</p>
              <p className="text-[10px] text-outline/80 mt-1">Try relaxing filters or calculate and process a payroll log using the calculator tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant text-[10px] text-outline font-bold uppercase tracking-widest bg-surface-low">
                    <th className="p-3">Worker / Role</th>
                    <th className="p-3">Calculation Month</th>
                    <th className="p-3">Wage Breakdown (Base + Incentives - Deductions)</th>
                    <th className="p-3 text-right">Net Payout</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant text-xs">
                  {filteredSalaries.map(s => {
                    const grossEarnings = (s.baseSalary || 0) + (s.tasksIncentive || 0) + ((s.overtimeHours || 0) * (s.overtimeRate || 0));
                    const totalDeductions = (s.deductions || 0) + (s.advances || 0);
                    return (
                      <tr key={s._id} className="hover:bg-surface-low/30 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-on-surface">{s.worker?.name || 'Deleted Worker'}</div>
                          <div className="text-[10px] text-outline font-semibold uppercase">{s.worker?.role || 'Worker'}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-on-surface">{s.month}</td>
                        <td className="p-3 leading-relaxed">
                          <div className="font-mono text-[10.5px]">
                            Base: <span className="font-bold text-on-surface">{formatINR(s.baseSalary || 0)}</span> · 
                            Incentive: <span className="font-bold text-primary">+{formatINR(s.tasksIncentive || 0)}</span> · 
                            OT: <span className="font-bold text-primary">+{formatINR((s.overtimeHours || 0) * (s.overtimeRate || 0))}</span>
                          </div>
                          <div className="font-mono text-[10.5px] text-outline mt-0.5">
                            Deductions: <span className="font-bold text-error">-{formatINR(Math.round(((s.baseSalary || 0) / 22) * (s.deductions || 0)))} ({s.deductions || 0} days)</span> · 
                            Advances: <span className="font-bold text-error">-{formatINR(s.advances || 0)}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-primary text-[13px]">{formatINR(s.amount)}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleTogglePaymentStatus(s._id, s.status)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors inline-block hover:cursor-pointer ${
                              s.status === 'Paid' 
                                ? 'bg-primary/8 text-primary border-primary/20 hover:bg-primary/20' 
                                : 'bg-[#e29314]/8 text-[#e29314] border-[#e29314]/20 hover:bg-[#e29314]/20'
                            }`}
                          >
                            {s.status}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedPayslip(s)}
                              title="View and Print Payslip"
                              className="btn-icon p-1 text-primary hover:bg-primary/10 rounded transition-colors hover:cursor-pointer"
                            >
                              <span className="material-symbols-outlined icon-sm">receipt_long</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSalary(s._id)}
                              title="Delete Record"
                              className="btn-icon p-1 text-error hover:bg-error/10 rounded transition-colors hover:cursor-pointer"
                            >
                              <span className="material-symbols-outlined icon-sm">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="flex flex-col gap-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Total Processed Logs</span>
              <span className="text-2xl font-black text-on-surface">{analytics.totalProcessed}</span>
              <span className="text-[10px] text-outline block mt-1">Months on file</span>
            </div>

            <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Total Paid (Disbursed)</span>
              <span className="text-2xl font-black text-primary">{formatINR(analytics.totalPaid)}</span>
              <span className="text-[10px] text-primary/80 font-bold block mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined icon-xs">check_circle</span>Completed Payments
              </span>
            </div>

            <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Total Pending Payout</span>
              <span className="text-2xl font-black text-[#e29314]">{formatINR(analytics.totalPending)}</span>
              <span className="text-[10px] text-[#e29314]/80 font-bold block mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined icon-xs">pending</span>Awaiting supervisor check
              </span>
            </div>

            <div className="bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Total Incentives & OT Paid</span>
              <span className="text-2xl font-black text-tertiary">{formatINR(analytics.totalIncentives)}</span>
              <span className="text-[10px] text-outline block mt-1">Performance rewards</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend Chart */}
            <div className="lg:col-span-2 bg-surface-lowest border border-outline-variant rounded-md shadow-sm flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant">
                <h3 className="text-sm font-extrabold text-on-surface uppercase tracking-wider">Payroll Expenditures Trend</h3>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-end">
                {analytics.monthlyTrends.length === 0 ? (
                  <div className="text-center py-16 text-outline text-xs uppercase font-bold">No trend data available</div>
                ) : (
                  <div className="flex items-end gap-6 h-[220px] pb-6 relative">
                    {analytics.monthlyTrends.map(t => {
                      const maxVal = Math.max(...analytics.monthlyTrends.map(x => x.val)) || 1;
                      const heightPct = (t.val / maxVal) * 100;
                      return (
                        <div key={t.month} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                          <div 
                            style={{ height: `${heightPct}%` }}
                            className="w-10 bg-gradient-to-t from-primary/75 to-primary rounded-t-sm hover:brightness-105 transition-all duration-150 relative cursor-pointer"
                          >
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#213145] text-white text-[10px] font-bold px-2 py-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow-md pointer-events-none">
                              {formatINR(t.val)}
                            </div>
                          </div>
                          <span className="absolute bottom-0 text-[10px] font-bold text-outline mt-2 tracking-wide uppercase font-mono">{t.month}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Component breakdown summary */}
            <div className="lg:col-span-1 bg-surface-lowest border border-outline-variant rounded-md shadow-sm p-5 flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-on-surface uppercase tracking-wider border-b border-outline-variant pb-2">Component Analysis</h3>
              
              <div className="flex flex-col gap-4 mt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold text-outline uppercase mb-1">
                    <span>Base Wages</span>
                    <span className="text-on-surface font-mono font-black">
                      {formatINR(salaries.reduce((acc, s) => acc + (s.baseSalary || 0), 0))}
                    </span>
                  </div>
                  <div className="w-full bg-surface-low h-2.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-outline uppercase mb-1">
                    <span>Task Incentives</span>
                    <span className="text-on-surface font-mono font-black">
                      {formatINR(salaries.reduce((acc, s) => acc + (s.tasksIncentive || 0), 0))}
                    </span>
                  </div>
                  <div className="w-full bg-surface-low h-2.5 rounded-full overflow-hidden">
                    <div className="bg-tertiary h-full rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-outline uppercase mb-1">
                    <span>Overtime Hours</span>
                    <span className="text-on-surface font-mono font-black">
                      {formatINR(salaries.reduce((acc, s) => acc + ((s.overtimeHours || 0) * (s.overtimeRate || 0)), 0))}
                    </span>
                  </div>
                  <div className="w-full bg-surface-low h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#a066ff] h-full rounded-full" style={{ width: '8%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-outline uppercase mb-1">
                    <span>Deductions & Advances</span>
                    <span className="text-on-surface font-mono font-black text-error">
                      -{formatINR(analytics.totalDeductions)}
                    </span>
                  </div>
                  <div className="w-full bg-surface-low h-2.5 rounded-full overflow-hidden">
                    <div className="bg-error h-full rounded-full" style={{ width: '12%' }}></div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-outline leading-normal mt-4 bg-surface-low p-3 rounded-sm border border-outline-variant">
                * Breakdowns help evaluate aggregate payroll disbursements. Adjust shift parameters in the Calculator tab to fix incorrect entries.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Modal Component */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-xl max-w-[620px] w-full max-h-[90vh] overflow-y-auto flex flex-col p-6 animate-scale-up">
            
            {/* Payslip Card Content */}
            <div id="printable-payslip" className="flex flex-col gap-6 p-4 border border-outline-variant bg-surface-lowest rounded-sm">
              
              {/* Receipt Header */}
              <div className="flex items-center justify-between border-b border-outline-variant pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-container to-tertiary-container rounded-[8px] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px] text-white">inventory_2</span>
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-on-surface uppercase tracking-wider">SmartOps Production</h2>
                    <p className="text-[9px] text-outline font-bold uppercase tracking-widest">Pune Hub A12 · payroll</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-black text-primary uppercase block">Payslip Log</span>
                  <span className="font-mono text-[10px] font-bold text-outline uppercase">{selectedPayslip.month}</span>
                </div>
              </div>

              {/* Worker & Meta details */}
              <div className="grid grid-cols-2 gap-4 bg-surface-low p-4 rounded-sm text-xs border border-outline-variant">
                <div>
                  <span className="text-[9px] font-bold text-outline uppercase block mb-0.5">Employee Name</span>
                  <span className="font-black text-on-surface block">{selectedPayslip.worker?.name || 'Deleted worker'}</span>
                  <span className="text-[10px] text-outline font-bold uppercase block mt-1">{selectedPayslip.worker?.role || 'Staff'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-outline uppercase block mb-0.5">Disbursement Info</span>
                  <span className="font-bold block">SmartOps Auto-calculated</span>
                  <span className="text-[10px] text-outline mt-1 block">Date Issued: {new Date(selectedPayslip.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Earnings Table */}
              <div className="flex flex-col gap-2">
                <h4 className="text-[10px] font-bold text-outline uppercase tracking-wider border-b border-outline-variant pb-1">Earnings & Additions</h4>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-outline">Base Monthly Salary</span>
                  <span className="font-mono font-bold">{formatINR(selectedPayslip.baseSalary || 0)}</span>
                </div>
                {selectedPayslip.tasksIncentive > 0 && (
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-outline">Completed Tasks Incentive ({selectedPayslip.tasksCompleted} tasks)</span>
                    <span className="font-mono text-primary font-bold">+{formatINR(selectedPayslip.tasksIncentive)}</span>
                  </div>
                )}
                {selectedPayslip.overtimeHours > 0 && (
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-outline">Overtime Hours ({selectedPayslip.overtimeHours} hrs @ {formatINR(selectedPayslip.overtimeRate)}/hr)</span>
                    <span className="font-mono text-primary font-bold">+{formatINR(selectedPayslip.overtimeHours * selectedPayslip.overtimeRate)}</span>
                  </div>
                )}
              </div>

              {/* Deductions Table */}
              {(selectedPayslip.deductions > 0 || selectedPayslip.advances > 0) && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-bold text-outline uppercase tracking-wider border-b border-outline-variant pb-1">Deductions & Advances</h4>
                  {selectedPayslip.deductions > 0 && (
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-outline">Absence Payout Penalties ({selectedPayslip.deductions} days)</span>
                      <span className="font-mono text-error font-bold">-{formatINR(Math.round(((selectedPayslip.baseSalary || 0) / 22) * (selectedPayslip.deductions || 0)))}</span>
                    </div>
                  )}
                  {selectedPayslip.advances > 0 && (
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-outline">Salary Advances Reclaimed</span>
                      <span className="font-mono text-error font-bold">-{formatINR(selectedPayslip.advances)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Total Card */}
              <div className="mt-2 p-4 bg-primary/5 border border-primary/20 rounded-sm flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-outline uppercase block">Net Payout Amount</span>
                  <span className="text-[10px] text-outline font-semibold">Processed payment currency: INR</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-primary font-mono">{formatINR(selectedPayslip.amount)}</span>
                  <span className={`block text-[9px] font-bold uppercase mt-0.5 ${selectedPayslip.status === 'Paid' ? 'text-primary' : 'text-[#e29314]'}`}>{selectedPayslip.status}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 mt-4 border-t border-outline-variant text-[10px] text-outline uppercase font-bold text-center">
                <div>
                  <div className="border-b border-outline-variant/60 h-10 mb-2"></div>
                  Supervisor Signature
                </div>
                <div>
                  <div className="border-b border-outline-variant/60 h-10 mb-2"></div>
                  Employee Signature
                </div>
              </div>

              {/* Note details */}
              {selectedPayslip.notes && (
                <div className="text-[10px] text-outline italic text-center mt-2">
                  Memo: "{selectedPayslip.notes}"
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-outline-variant">
              <button
                onClick={handleDownloadPDF}
                className="btn btn-outline border border-primary/20 text-primary hover:bg-primary/5 px-4 py-2 rounded-sm font-semibold text-xs flex items-center gap-1.5 hover:cursor-pointer"
              >
                <span className="material-symbols-outlined icon-sm">download</span>Download PDF
              </button>
              <button
                onClick={() => {
                  const content = document.getElementById('printable-payslip').innerHTML;
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>SmartOps Payout Payslip - \${selectedPayslip.worker?.name}</title>
                        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                        <style>
                          body { font-family: sans-serif; background-color: white; padding: 20px; }
                          #printable-payslip { border: 1px solid #e5e7eb; padding: 20px; border-radius: 4px; }
                          .text-primary { color: #006a6a !important; }
                          .bg-primary { background-color: #006a6a !important; }
                        </style>
                      </head>
                      <body>
                        <div class="max-w-2xl mx-auto">\${content}</div>
                        <script>
                          window.onload = function() { window.print(); window.close(); }
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
                className="btn btn-outline border border-primary/20 text-primary hover:bg-primary/5 px-4 py-2 rounded-sm font-semibold text-xs flex items-center gap-1.5 hover:cursor-pointer"
              >
                <span className="material-symbols-outlined icon-sm">print</span>Print Payslip
              </button>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="btn btn-primary bg-primary text-white hover:bg-primary-container px-4 py-2 rounded-sm font-semibold text-xs hover:cursor-pointer"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Salary;
