import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const WorkerRegistrationRequests = ({ showToast }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [salary, setSalary] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const res = await api.getPendingRegistrations();
      if (res.success) {
        setRequests(res.data || []);
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to fetch pending worker registrations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApproveModal = (reqItem) => {
    setSelectedReq(reqItem);
    setActionType('approve');
    setSalary('18000');
  };

  const handleOpenRejectModal = (reqItem) => {
    setSelectedReq(reqItem);
    setActionType('reject');
    setRejectionReason('');
  };

  const handleConfirmAction = async () => {
    if (!selectedReq || !actionType) return;

    if (actionType === 'approve') {
      const numSal = Number(salary);
      if (isNaN(numSal) || numSal <= 0) {
        if (showToast) showToast('Monthly Salary is required and must be a positive number.', 'error');
        return;
      }

      try {
        setSubmitting(true);
        const res = await api.approveRegistration(selectedReq._id, numSal);
        if (res.success) {
          if (showToast) showToast('Worker approved & activated! Approval email sent.', 'success');
          setSelectedReq(null);
          setActionType(null);
          fetchPendingRequests();
        } else {
          if (showToast) showToast(res.error || 'Approval failed', 'error');
        }
      } catch (err) {
        console.error(err);
        if (showToast) showToast('Error approving worker', 'error');
      } finally {
        setSubmitting(false);
      }
    } else if (actionType === 'reject') {
      if (!rejectionReason.trim()) {
        if (showToast) showToast('Supervisor comment/reason is required for rejection.', 'error');
        return;
      }
      try {
        setSubmitting(true);
        const res = await api.rejectRegistration(selectedReq._id, rejectionReason.trim());
        if (res.success) {
          if (showToast) showToast('Worker registration request rejected.', 'success');
          setSelectedReq(null);
          setActionType(null);
          fetchPendingRequests();
        } else {
          if (showToast) showToast(res.error || 'Rejection failed', 'error');
        }
      } catch (err) {
        console.error(err);
        if (showToast) showToast('Error rejecting worker', 'error');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesSearch = !searchQuery ||
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6 text-on-surface font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">Worker Registration Requests</h1>
          <p className="text-xs text-outline font-medium mt-0.5">
            Review pending worker applications, assign monthly salaries, and activate accounts.
          </p>
        </div>
        <button
          onClick={fetchPendingRequests}
          className="btn border border-outline-variant hover:bg-surface-low text-on-surface-variant font-bold px-4 py-2 rounded-sm text-xs flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh Requests
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-lowest border border-outline-variant rounded-md p-4 shadow-sm">
        <div className="text-xs font-bold text-outline uppercase tracking-wider">
          Pending Applications ({filteredRequests.length})
        </div>

        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            type="text"
            placeholder="Search name, username, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface-low border border-outline-variant rounded-sm text-xs text-on-surface outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Requests Directory */}
      {loading ? (
        <div className="py-16 text-center text-xs font-semibold text-outline">Loading pending registrations...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-16 text-center text-xs font-semibold text-outline">No pending worker registration requests.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => (
            <div
              key={req._id}
              className="bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm flex flex-col justify-between gap-4 hover:border-primary/50 transition-all"
            >
              <div>
                <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3 mb-3">
                  <div className="w-12 h-12 rounded-full border border-outline-variant overflow-hidden bg-surface-low flex-shrink-0 flex items-center justify-center">
                    {req.photo ? (
                      <img src={req.photo} alt={req.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[28px] text-outline">account_circle</span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-on-surface">{req.fullName}</h3>
                    <span className="text-[11px] text-primary font-bold">@{req.username}</span>
                  </div>

                  <span className="ml-auto text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    {req.status}
                  </span>
                </div>

                <div className="bg-surface-low p-3 rounded border border-outline-variant/40 flex flex-col gap-1.5 text-xs text-outline">
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <strong className="text-on-surface font-mono">{req.email}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Mobile Number:</span>
                    <strong className="text-on-surface font-mono">{req.mobile}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Department:</span>
                    <strong className="text-primary font-bold">{req.department}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Joining Date:</span>
                    <strong className="text-on-surface">{new Date(req.joiningDate).toLocaleDateString()}</strong>
                  </div>
                </div>
              </div>

              <div className="border-t border-outline-variant/40 pt-3 flex items-center justify-between">
                <span className="text-[10px] text-outline font-mono">
                  Applied: {new Date(req.createdAt).toLocaleDateString()}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenRejectModal(req)}
                    className="btn border border-error/40 hover:bg-error/10 text-error text-[11px] font-bold py-1 px-3 rounded-sm uppercase tracking-wider cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleOpenApproveModal(req)}
                    className="btn bg-primary hover:bg-primary-container text-white text-[11px] font-bold py-1 px-3 rounded-sm shadow-sm uppercase tracking-wider cursor-pointer"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {selectedReq && actionType && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-lowest border border-outline-variant rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-5 text-on-surface animate-scale-up">
            <div className="flex items-start justify-between border-b border-outline-variant/40 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-on-surface">
                  {actionType === 'approve' ? 'Approve Worker Registration' : 'Reject Worker Registration'}
                </h3>
                <p className="text-xs text-outline mt-0.5">
                  Worker: <strong className="text-on-surface">{selectedReq.fullName}</strong> (@{selectedReq.username})
                </p>
              </div>
              <button
                onClick={() => { setSelectedReq(null); setActionType(null); }}
                className="w-7 h-7 rounded hover:bg-surface-low text-on-surface-variant flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {actionType === 'approve' ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-outline leading-relaxed">
                  Approving will activate the worker account and dispatch an email with login credentials.
                </p>

                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Monthly Salary (Required ₹) *
                  </label>
                  <input
                    type="number"
                    min="1000"
                    placeholder="e.g. 18000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm font-bold text-primary outline-none focus:border-primary font-mono"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-outline leading-relaxed">
                  Rejecting will decline the registration request and notify the applicant via email.
                </p>

                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Rejection Reason (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide optional reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary resize-none"
                  ></textarea>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-outline-variant/40 pt-4">
              <button
                type="button"
                onClick={() => { setSelectedReq(null); setActionType(null); }}
                className="btn border border-outline-variant text-outline hover:text-on-surface text-xs font-bold py-2 px-4 rounded-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmAction}
                className={`btn text-white text-xs font-bold py-2 px-4 rounded-sm shadow-sm uppercase tracking-wider cursor-pointer disabled:opacity-50 ${
                  actionType === 'approve' ? 'bg-primary hover:bg-primary-container' : 'bg-error hover:bg-error/90'
                }`}
              >
                {submitting ? 'Processing...' : actionType === 'approve' ? 'Approve & Activate Worker' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerRegistrationRequests;
