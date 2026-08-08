import { useState, useEffect } from 'react';
import { api } from '../services/api';

const Salary = ({ showToast }) => {
  const [workers, setWorkers] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);

  // Tabs: 'calculator', 'history', 'analytics', 'salary-set'
  const [activeTab, setActiveTab] = useState('calculator');

  // Month selection options
  const [monthsList] = useState(() => {
    const list = [];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const d = new Date();
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

  // Approve Overtime Modal State
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [otWorkerId, setOtWorkerId] = useState('');
  const [otDays, setOtDays] = useState(1);
  const [otRemarks, setOtRemarks] = useState('');
  const [approvingOt, setApprovingOt] = useState(false);

  // History Filter state
  const [filterWorker, setFilterWorker] = useState('');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Selected Salary for Payslip Modal
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  // Fetch initial base data
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
      if (showToast) showToast('Error loading payroll data', 'error');
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

  // Handle Calculate API call
  const handleCalculate = async () => {
    if (!selectedWorkerId || !selectedMonth) return;
    try {
      setCalcLoading(true);
      const res = await api.calculateSalary(selectedWorkerId, selectedMonth);
      if (res.success && res.data) {
        setCalcData(res.data);
      } else {
        if (showToast) showToast(res.error || 'Failed to compute automatic salary', 'error');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Network error during auto salary calculation', 'error');
    } finally {
      setCalcLoading(false);
    }
  };

  useEffect(() => {
    handleCalculate();
  }, [selectedWorkerId, selectedMonth]);

  // Approve Overtime
  const handleApproveOvertime = async (e) => {
    e.preventDefault();
    if (!otWorkerId || Number(otDays) <= 0) {
      return showToast('Please select a worker and overtime days', 'error');
    }
    try {
      setApprovingOt(true);
      const res = await api.approveOvertime({
        worker: otWorkerId,
        date: new Date(),
        overtimeDays: Number(otDays),
        remarks: otRemarks || 'Approved by Supervisor'
      });

      if (res.success) {
        showToast('Overtime approved and salary recalculated!', 'success');
        setShowOvertimeModal(false);
        setOtDays(1);
        setOtRemarks('');
        fetchSalariesHistory();
        if (selectedWorkerId === otWorkerId) {
          handleCalculate();
        }
      } else {
        showToast(res.error || 'Failed to approve overtime', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error approving overtime', 'error');
    } finally {
      setApprovingOt(false);
    }
  };

  // Toggle payment status
  const handleTogglePaymentStatus = async (id, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'Paid' ? 'Pending' : 'Paid';
      const res = await api.updateSalary(id, { status: nextStatus, paymentStatus: nextStatus });
      if (res.success) {
        showToast(`Salary status updated to ${nextStatus}`, 'success');
        setSalaries(prev => prev.map(s => s._id === id ? { ...s, status: nextStatus, paymentStatus: nextStatus } : s));
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
      margin: 10,
      filename: `payslip-${selectedPayslip.worker?.name || 'worker'}-${selectedPayslip.month}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

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

  const formatINR = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num || 0);
  };

  // Filter salaries list
  const filteredSalaries = salaries.filter(s => {
    const matchesWorker = !filterWorker || (s.worker?.name && s.worker.name.toLowerCase().includes(filterWorker.toLowerCase()));
    const matchesMonth = filterMonth === 'All' || s.month === filterMonth;
    const matchesStatus = filterStatus === 'All' || s.status === filterStatus;
    return matchesWorker && matchesMonth && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-xs text-outline font-bold uppercase tracking-wider">Loading Salary Registry...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-on-surface font-sans">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-on-surface">Attendance & Salary Management</h1>
          <p className="text-xs text-outline font-medium mt-0.5">
            Review 14-metric calculations, approve overtime, and generate official pay slips.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOvertimeModal(true)}
            className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold px-4 py-2.5 rounded-sm shadow-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">more_time</span>
            Approve Overtime
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant gap-6 text-xs font-extrabold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`pb-2.5 transition-colors cursor-pointer ${activeTab === 'calculator' ? 'text-primary border-b-2 border-primary' : 'text-outline hover:text-on-surface'}`}
        >
          Salary Calculator & Breakdown
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 transition-colors cursor-pointer ${activeTab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-outline hover:text-on-surface'}`}
        >
          Salary Logs & Slips
        </button>
      </div>

      {/* 1. Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Parameter Panel */}
          <div className="lg:col-span-1 bg-surface-lowest border border-outline-variant p-5 rounded-md shadow-sm flex flex-col gap-4">
            <h2 className="text-xs font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">filter_list</span>
              Worker & Month Selection
            </h2>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Select Worker</label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest text-on-surface text-xs outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">-- Choose Worker --</option>
                  {workers.map(w => (
                    <option key={w._id} value={w._id}>{w.name} (Salary: ₹{w.salary?.toLocaleString() || 0})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Calculation Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest text-on-surface text-xs outline-none focus:border-primary cursor-pointer"
                >
                  {monthsList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attendance & Late Rules Infobox */}
            <div className="p-4 bg-surface-low border border-outline-variant rounded-sm text-[11px] text-outline flex flex-col gap-2 leading-relaxed">
              <span className="font-bold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">verified</span>
                Calculation Rules Summary
              </span>
              <p>• <strong>Per Day Salary:</strong> Monthly Salary ÷ Total Days in Month</p>
              <p>• <strong>Leave Policy:</strong> First 3 leave days free (Exempted). Deduct 1 Per Day Salary per Leave from 4th Leave onward.</p>
              <p>• <strong>Late Policy:</strong> First 3 excused. From 4th Late, each Late = Half Day deduction (0.5 × Per Day Salary).</p>
              <p>• <strong>Half Days:</strong> Each Half Day = 0.5 × Per Day Salary.</p>
              <p>• <strong>Overtime:</strong> Earns 0.5 × Per Day Salary per Overtime Day.</p>
            </div>
          </div>

          {/* Right Calculation Display Panel */}
          <div className="lg:col-span-2">
            {!selectedWorkerId ? (
              <div className="bg-surface-lowest border border-outline-variant rounded-md p-12 text-center text-xs text-outline font-semibold">
                Select a worker and month from the left panel to display automated calculation breakdown.
              </div>
            ) : calcLoading ? (
              <div className="bg-surface-lowest border border-outline-variant rounded-md p-12 text-center text-xs text-outline font-semibold flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                Computing attendance rules and salary deductions...
              </div>
            ) : calcData ? (
              <div className="bg-surface-lowest border border-outline-variant rounded-md p-6 shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">AUTOMATED CALCULATION BREAKDOWN</span>
                    <h3 className="text-xl font-black text-on-surface mt-0.5">{calcData.worker?.name || 'Worker'}</h3>
                    <p className="text-xs text-outline font-medium">Role: {calcData.worker?.role || 'Worker'} · Month: {calcData.month}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPayslip(calcData);
                    }}
                    className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold px-4 py-2 rounded-sm shadow-sm uppercase tracking-wider cursor-pointer"
                  >
                    View Salary Slip
                  </button>
                </div>

                {/* 1. Salary Parameters */}
                <div>
                  <h4 className="text-[11px] font-extrabold text-outline uppercase tracking-wider mb-2">Base Salary Parameters</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Monthly Salary</span>
                      <span className="text-sm font-extrabold text-on-surface">{formatINR(calcData.monthlySalary)}</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Total Days</span>
                      <span className="text-sm font-extrabold text-on-surface">{calcData.totalDays || calcData.totalDaysInMonth || 0} Days</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Per Day Salary</span>
                      <span className="text-sm font-extrabold text-on-surface">{formatINR(calcData.perDaySalary)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Attendance Summary */}
                <div>
                  <h4 className="text-[11px] font-extrabold text-outline uppercase tracking-wider mb-2">Attendance Summary</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Present Days</span>
                      <span className="text-sm font-extrabold text-primary">{calcData.presentDays || 0} Days</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Absent Days</span>
                      <span className="text-sm font-extrabold text-error">{calcData.absentDays || 0} Days</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Leave Days</span>
                      <span className="text-sm font-extrabold text-on-surface">{calcData.leaveDays || 0} Days</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Exempted Leave</span>
                      <span className="text-sm font-extrabold text-primary">{calcData.exemptedLeaveDays || 0} Days</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Chargeable Leave</span>
                      <span className="text-sm font-extrabold text-error">{calcData.chargeableLeaveDays || 0} Days</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Half Days</span>
                      <span className="text-sm font-extrabold text-amber-700">{calcData.halfDays || 0} Days</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Late Count</span>
                      <span className="text-sm font-extrabold text-amber-700">{calcData.lateCount || 0} Times</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Excused Late</span>
                      <span className="text-sm font-extrabold text-primary">{calcData.excusedLateCount || 0} Times</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Chargeable Late</span>
                      <span className="text-sm font-extrabold text-amber-700">{calcData.chargeableLateCount || 0} Times</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Overtime Days</span>
                      <span className="text-sm font-extrabold text-primary">{calcData.overtimeDays || 0} Days</span>
                    </div>
                  </div>
                </div>

                {/* 3. Deductions & Overtime Breakdown */}
                <div>
                  <h4 className="text-[11px] font-extrabold text-outline uppercase tracking-wider mb-2">Deductions & Earnings</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Leave Deduction</span>
                      <span className="text-sm font-extrabold text-error">-{formatINR(calcData.leaveDeduction || 0)}</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Half Day Deduction</span>
                      <span className="text-sm font-extrabold text-error">-{formatINR(calcData.halfDayDeduction || 0)}</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Late Deduction</span>
                      <span className="text-sm font-extrabold text-error">-{formatINR(calcData.lateDeduction || 0)}</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Other Deduction</span>
                      <span className="text-sm font-extrabold text-on-surface">{formatINR(calcData.otherDeduction || 0)}</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Overtime Pay</span>
                      <span className="text-sm font-extrabold text-primary">+{formatINR(calcData.overtimePay || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Final Net Calculation Box */}
                <div className="p-4 bg-surface-low border border-outline-variant rounded-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Final Net Salary</p>
                    <p className="text-2xl font-black text-on-surface mt-0.5">{formatINR(calcData.finalSalary)}</p>
                  </div>
                  <span className="material-symbols-outlined text-[36px] text-primary">check_circle</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 2. Salary History & Slips Tab */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-4">
          <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-low border-b border-outline-variant text-[11px] font-bold text-outline uppercase tracking-wider">
                  <th className="p-3.5">Worker Name</th>
                  <th className="p-3.5">Month</th>
                  <th className="p-3.5">Monthly Salary</th>
                  <th className="p-3.5">Absent Deductions</th>
                  <th className="p-3.5">Late Deductions</th>
                  <th className="p-3.5">Overtime Pay</th>
                  <th className="p-3.5">Final Salary</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-on-surface font-semibold">
                {filteredSalaries.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-outline">No salary records found.</td>
                  </tr>
                ) : (
                  filteredSalaries.map(sal => (
                    <tr key={sal._id} className="hover:bg-surface-low transition-colors duration-150">
                      <td className="p-3.5 font-bold text-on-surface">{sal.worker?.name || 'Worker'}</td>
                      <td className="p-3.5 font-mono">{sal.month}</td>
                      <td className="p-3.5 font-mono">{formatINR(sal.monthlySalary || sal.baseSalary)}</td>
                      <td className="p-3.5 font-mono text-error">-{formatINR(sal.absentDeduction)}</td>
                      <td className="p-3.5 font-mono text-error">-{formatINR(sal.lateDeduction)}</td>
                      <td className="p-3.5 font-mono text-primary">+{formatINR(sal.overtimePay)}</td>
                      <td className="p-3.5 font-mono font-black text-on-surface">{formatINR(sal.finalSalary || sal.amount)}</td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleTogglePaymentStatus(sal._id, sal.status)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border cursor-pointer ${
                            sal.status === 'Paid'
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                          }`}
                        >
                          {sal.status || 'Pending'}
                        </button>
                      </td>
                      <td className="p-3.5 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedPayslip(sal)}
                          className="p-1 rounded hover:bg-surface-low text-primary cursor-pointer"
                          title="View Salary Slip"
                        >
                          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSalary(sal._id)}
                          className="p-1 rounded hover:bg-surface-low text-error cursor-pointer"
                          title="Delete Record"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve Overtime Modal */}
      {showOvertimeModal && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-lowest border border-outline-variant rounded-md max-w-md w-full p-6 shadow-xl flex flex-col gap-4 text-on-surface">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
              <h3 className="text-base font-extrabold text-on-surface">Approve Overtime Day</h3>
              <button onClick={() => setShowOvertimeModal(false)} className="text-outline hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleApproveOvertime} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">Select Worker</label>
                <select
                  value={otWorkerId}
                  onChange={(e) => setOtWorkerId(e.target.value)}
                  className="px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest text-xs text-on-surface outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">-- Choose Worker --</option>
                  {workers.map(w => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">Overtime Days Count</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={otDays}
                  onChange={(e) => setOtDays(e.target.value)}
                  className="px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest text-xs font-mono font-bold text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">Remarks / Duty Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Approved for weekend maintenance shift"
                  value={otRemarks}
                  onChange={(e) => setOtRemarks(e.target.value)}
                  className="px-3 py-2 border border-outline-variant rounded-sm bg-surface-lowest text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={approvingOt}
                className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold py-2.5 px-4 rounded-sm shadow-sm uppercase tracking-wider cursor-pointer disabled:opacity-50 mt-1"
              >
                {approvingOt ? 'Approving...' : 'Approve Overtime'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Salary Slip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-lowest border border-outline-variant rounded-md max-w-2xl w-full p-6 shadow-xl flex flex-col gap-6 text-on-surface max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
              <h3 className="text-base font-extrabold text-on-surface">Official Salary Slip</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold px-3 py-1.5 rounded-sm uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Download PDF
                </button>
                <button onClick={() => setSelectedPayslip(null)} className="text-outline hover:text-on-surface cursor-pointer p-1">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div id="printable-payslip" className="flex flex-col gap-5 p-2 bg-surface-lowest">
              <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
                <div>
                  <h2 className="text-lg font-black text-primary">SmartOps Operations Center</h2>
                  <p className="text-xs text-outline font-semibold">Shift Salary Statement · {selectedPayslip.month}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-on-surface">{selectedPayslip.slipId || 'PAY-SLIP'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-outline font-bold uppercase text-[10px]">Worker Name</span>
                  <p className="font-extrabold text-on-surface text-sm">{selectedPayslip.worker?.name || selectedPayslip.worker?.username}</p>
                </div>
                <div>
                  <span className="text-outline font-bold uppercase text-[10px]">Employee ID</span>
                  <p className="font-extrabold text-on-surface text-sm font-mono">{selectedPayslip.worker?.employeeId || 'EMP-2026-88'}</p>
                </div>
              </div>

              {/* Calculation Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Monthly Salary</span>
                  <span className="font-extrabold text-on-surface">{formatINR(selectedPayslip.monthlySalary || selectedPayslip.baseSalary)}</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Total Days</span>
                  <span className="font-extrabold text-on-surface">{selectedPayslip.totalDays || selectedPayslip.totalDaysInMonth || 30} Days</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Per Day Salary</span>
                  <span className="font-extrabold text-on-surface">{formatINR(selectedPayslip.perDaySalary)}</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Present Days</span>
                  <span className="font-extrabold text-primary">{selectedPayslip.presentDays || 0} Days</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Absent Days</span>
                  <span className="font-extrabold text-error">{selectedPayslip.absentDays || 0} Days</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Leave Days</span>
                  <span className="font-extrabold text-on-surface">{selectedPayslip.leaveDays || 0} Days</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Exempted Leave</span>
                  <span className="font-extrabold text-primary">{selectedPayslip.exemptedLeaveDays || 0} Days</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Chargeable Leave</span>
                  <span className="font-extrabold text-error">{selectedPayslip.chargeableLeaveDays || 0} Days</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Half Days</span>
                  <span className="font-extrabold text-amber-700">{selectedPayslip.halfDays || 0} Days</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Late Count</span>
                  <span className="font-extrabold text-amber-700">{selectedPayslip.lateCount || 0} Times</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Excused Late</span>
                  <span className="font-extrabold text-primary">{selectedPayslip.excusedLateCount || 0} Times</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Chargeable Late</span>
                  <span className="text-sm font-extrabold text-amber-700">{selectedPayslip.chargeableLateCount || 0} Times</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Leave Deduction</span>
                  <span className="font-extrabold text-error">-{formatINR(selectedPayslip.leaveDeduction || 0)}</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Half Day Deduction</span>
                  <span className="font-extrabold text-error">-{formatINR(selectedPayslip.halfDayDeduction || 0)}</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Late Deduction</span>
                  <span className="font-extrabold text-error">-{formatINR(selectedPayslip.lateDeduction || 0)}</span>
                </div>
                <div className="p-2 bg-surface-low border border-outline-variant rounded-sm">
                  <span className="text-[9px] font-bold text-outline uppercase block">Overtime Pay</span>
                  <span className="font-extrabold text-primary">+{formatINR(selectedPayslip.overtimePay || 0)}</span>
                </div>
              </div>

              <div className="p-3 bg-surface-low border border-outline-variant rounded-sm flex items-center justify-between">
                <span className="text-xs font-bold text-outline uppercase">Final Net Salary</span>
                <span className="text-xl font-black text-on-surface">{formatINR(selectedPayslip.finalSalary || selectedPayslip.amount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Salary;
