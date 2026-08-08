import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const WorkerSalary = ({ showToast }) => {
  const [user, setUser] = useState(null);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSalary, setSelectedSalary] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('smartops_user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
    fetchSalaryRecords();
  }, []);

  const fetchSalaryRecords = async () => {
    try {
      setLoading(true);
      const res = await api.getMySalaries();
      if (res.success) {
        setSalaries(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedSalary(res.data[0]);
        }
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to fetch salary records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedSalary) return;
    const element = document.getElementById('printable-worker-payslip');
    const opt = {
      margin: 10,
      filename: `salary-slip-${user?.username || 'worker'}-${selectedSalary.month}.pdf`,
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

  return (
    <div className="flex flex-col gap-6 text-on-surface font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-on-surface">Salary & Earnings Statement</h2>
          <p className="text-xs text-outline font-medium mt-0.5">
            View monthly salary breakdown, attendance rules, deductions, overtime pay, and official pay slips.
          </p>
        </div>
        <button
          onClick={fetchSalaryRecords}
          className="btn border border-outline-variant hover:bg-surface-low text-on-surface-variant font-bold px-4 py-2 rounded-sm text-xs flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh Slips
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-outline font-semibold">Loading salary statements...</div>
      ) : salaries.length === 0 ? (
        <div className="py-12 text-center text-xs text-outline font-semibold">No salary records generated yet.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of Pay Stubs */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-extrabold text-on-surface mb-1">Monthly Pay Slips</h3>
            {salaries.map((sal) => (
              <div
                key={sal._id}
                onClick={() => setSelectedSalary(sal)}
                className={`p-4 border rounded-md cursor-pointer transition-all flex items-center justify-between ${
                  selectedSalary?._id === sal._id
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-surface-lowest border-outline-variant hover:border-primary'
                }`}
              >
                <div>
                  <h4 className="text-sm font-extrabold text-on-surface">{sal.month}</h4>
                  <p className="text-xs text-outline font-medium mt-0.5">
                    Final Salary: <span className="font-bold text-on-surface">{formatINR(sal.finalSalary || sal.amount || sal.netSalary)}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    sal.status === 'Paid'
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                  }`}>
                    {sal.status || 'Pending'}
                  </span>
                  <span className="text-[10px] text-outline font-mono">{sal.slipId || 'Pay Slip'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Paystub Detail View & Printable Document */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {selectedSalary ? (
              <>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold px-4 py-2 rounded-sm shadow-sm uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Download Salary Slip (PDF)
                  </button>
                </div>

                <div id="printable-worker-payslip" className="bg-surface-lowest border border-outline-variant rounded-md p-6 shadow-sm flex flex-col gap-6">
                  {/* Slip Header */}
                  <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
                    <div>
                      <span className="text-[10px] font-bold text-outline uppercase tracking-wider">OFFICIAL SALARY STATEMENT</span>
                      <h3 className="text-xl font-black text-on-surface mt-0.5">{selectedSalary.month}</h3>
                      <p className="text-xs text-outline font-medium">Worker: {selectedSalary.worker?.name || user?.username}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black px-3 py-1 rounded-full ${
                        selectedSalary.status === 'Paid'
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                      }`}>
                        {selectedSalary.status || 'Pending'}
                      </span>
                      <p className="text-[10px] text-outline mt-1 font-mono">{selectedSalary.slipId || 'PAY-SLIP'}</p>
                    </div>
                  </div>

                  {/* Complete Calculation Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Monthly Base Salary</span>
                      <span className="text-sm font-extrabold text-on-surface">{formatINR(selectedSalary.monthlySalary || selectedSalary.baseSalary)}</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Total Days in Month</span>
                      <span className="text-sm font-extrabold text-on-surface">{selectedSalary.totalDays || selectedSalary.totalDaysInMonth || 30} Days</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Per Day Salary</span>
                      <span className="text-sm font-extrabold text-on-surface">{formatINR(selectedSalary.perDaySalary)}</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Present Days</span>
                      <span className="text-sm font-extrabold text-primary">{selectedSalary.presentDays || 0} Days</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Total Leave Days</span>
                      <span className="text-sm font-extrabold text-amber-700">{selectedSalary.totalLeaveDays !== undefined ? selectedSalary.totalLeaveDays : (selectedSalary.absentDays || 0)} Days</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm bg-teal-500/10 border-teal-500/20">
                      <span className="text-[10px] font-bold text-teal-400 uppercase block">Free / Exempted Leaves</span>
                      <span className="text-sm font-extrabold text-teal-300">{selectedSalary.exemptedLeaveDays !== undefined ? selectedSalary.exemptedLeaveDays : Math.min(3, (selectedSalary.totalLeaveDays || selectedSalary.absentDays || 0))} Days (Max 3 Free)</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Deductible Leave Days</span>
                      <span className="text-sm font-extrabold text-error">{selectedSalary.deductibleLeaveDays !== undefined ? selectedSalary.deductibleLeaveDays : Math.max(0, (selectedSalary.totalLeaveDays || selectedSalary.absentDays || 0) - 3)} Days</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Leave Deduction</span>
                      <span className="text-sm font-extrabold text-error">-{formatINR(selectedSalary.leaveDeduction !== undefined ? selectedSalary.leaveDeduction : selectedSalary.absentDeduction)}</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Half Days & Deduction</span>
                      <span className="text-sm font-extrabold text-error">{selectedSalary.halfDays || 0} Half (-{formatINR(selectedSalary.halfDayDeduction || 0)})</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Late Count & Deduction</span>
                      <span className="text-sm font-extrabold text-amber-700">{selectedSalary.lateCount || 0} Late (-{formatINR(selectedSalary.lateDeduction || 0)})</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Overtime Pay</span>
                      <span className="text-sm font-extrabold text-primary">+{formatINR(selectedSalary.overtimePay)} ({selectedSalary.overtimeDays || 0} Days)</span>
                    </div>

                    <div className="p-3 bg-surface-low border border-outline-variant rounded-sm">
                      <span className="text-[10px] font-bold text-outline uppercase block">Total Deductions</span>
                      <span className="text-sm font-extrabold text-error">-{formatINR(selectedSalary.deductions)}</span>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 bg-surface-low border border-outline-variant rounded-sm flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Final Salary (Net Payout)</p>
                      <p className="text-2xl font-black text-on-surface mt-0.5">
                        {formatINR(selectedSalary.finalSalary || selectedSalary.amount || selectedSalary.netSalary)}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-[36px] text-primary">verified</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-surface-lowest border border-outline-variant rounded-md p-12 text-center text-xs text-outline font-semibold">
                Select a pay stub from the left to view detailed calculation breakdown.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerSalary;
