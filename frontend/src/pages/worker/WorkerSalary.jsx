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
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to fetch salary records', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-on-surface">Salary & Earnings</h2>
          <p className="text-xs text-outline font-medium mt-0.5">
            View your monthly pay stubs, base salary breakdown, overtime incentives, deductions, and payout status.
          </p>
        </div>
        <button
          onClick={fetchSalaryRecords}
          className="btn btn-outline border border-outline-variant text-on-surface hover:bg-surface-container font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh Slips
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-outline font-semibold">Loading salary records...</div>
      ) : salaries.length === 0 ? (
        <div className="py-12 text-center text-xs text-outline font-semibold">No salary records generated yet.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of Pay Stubs */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-extrabold text-on-surface mb-1">Monthly Pay Stubs</h3>
            {salaries.map((sal) => (
              <div
                key={sal._id}
                onClick={() => setSelectedSalary(sal)}
                className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                  selectedSalary?._id === sal._id
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-surface border-outline-variant hover:border-primary/50'
                }`}
              >
                <div>
                  <h4 className="text-sm font-extrabold text-on-surface">{sal.month}</h4>
                  <p className="text-xs text-outline font-medium mt-0.5">
                    Net: <span className="font-bold text-on-surface">₹{(sal.amount || sal.netSalary || 0).toLocaleString()}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    sal.status === 'Paid'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    {sal.status}
                  </span>
                  <span className="text-[10px] text-outline">{sal.slipId || 'Pay Stub'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Paystub Detail View */}
          <div className="lg:col-span-2">
            {selectedSalary ? (
              <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Official Pay Stub</span>
                    <h3 className="text-xl font-black text-on-surface mt-0.5">{selectedSalary.month}</h3>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-black px-3 py-1 rounded-full ${
                      selectedSalary.status === 'Paid'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {selectedSalary.status}
                    </span>
                    <p className="text-[10px] text-outline mt-1 font-mono">{selectedSalary.slipId || 'PAY-STUB'}</p>
                  </div>
                </div>

                {/* Earnings & Deductions Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-extrabold text-outline uppercase tracking-wider">Earnings</h4>
                    <div className="flex justify-between text-xs py-1 border-b border-outline-variant/30">
                      <span className="text-outline">Base Salary</span>
                      <span className="font-bold text-on-surface">₹{(selectedSalary.baseSalary || selectedSalary.amount || 0).toLocaleString()}</span>
                    </div>
                    {selectedSalary.overtimePay > 0 && (
                      <div className="flex justify-between text-xs py-1 border-b border-outline-variant/30">
                        <span className="text-outline">Overtime Premium</span>
                        <span className="font-bold text-emerald-600">+₹{selectedSalary.overtimePay.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedSalary.bonus > 0 && (
                      <div className="flex justify-between text-xs py-1 border-b border-outline-variant/30">
                        <span className="text-outline">Shift Bonus</span>
                        <span className="font-bold text-emerald-600">+₹{selectedSalary.bonus.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-extrabold text-outline uppercase tracking-wider">Deductions</h4>
                    {selectedSalary.deductions > 0 ? (
                      <div className="flex justify-between text-xs py-1 border-b border-outline-variant/30">
                        <span className="text-outline">Absence / Tax Deductions</span>
                        <span className="font-bold text-error">-₹{selectedSalary.deductions.toLocaleString()}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-outline italic">No deductions applied for this pay cycle.</p>
                    )}
                  </div>
                </div>

                {/* Total Net Payout */}
                <div className="p-4 bg-surface-container border border-outline-variant rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Total Net Pay</p>
                    <p className="text-2xl font-black text-on-surface mt-0.5">
                      ₹{(selectedSalary.amount || selectedSalary.netSalary || 0).toLocaleString()}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[32px] text-emerald-600">verified</span>
                </div>

                {selectedSalary.remarks && (
                  <div className="text-xs text-outline bg-surface-container/30 p-3 rounded-lg border border-outline-variant/30">
                    <span className="font-bold text-on-surface">Remarks: </span>
                    {selectedSalary.remarks}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-surface border border-outline-variant rounded-xl p-12 text-center text-xs text-outline font-semibold">
                Select a pay stub from the left to view detailed breakdown.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerSalary;
