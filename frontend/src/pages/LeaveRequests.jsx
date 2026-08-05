import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const LeaveRequests = ({ showToast }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject' | 'view'
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const res = await api.getAllLeaveRequests();
      if (res.success) {
        setRequests(res.data || []);
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to fetch worker leave requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenActionModal = (reqItem, type) => {
    setSelectedReq(reqItem);
    setActionType(type);
    setComment(reqItem.supervisorComment || '');
  };

  const handleConfirmAction = async () => {
    if (!selectedReq || !actionType) return;

    if (actionType === 'reject' && (!comment || !comment.trim())) {
      if (showToast) showToast('Supervisor comment is mandatory when rejecting a leave request.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      let res;
      if (actionType === 'approve') {
        res = await api.approveLeaveRequest(selectedReq._id, comment.trim());
      } else if (actionType === 'reject') {
        res = await api.rejectLeaveRequest(selectedReq._id, comment.trim());
      }

      if (res && res.success) {
        if (showToast) {
          showToast(
            actionType === 'approve'
              ? 'Leave request approved! Attendance updated automatically.'
              : 'Leave request rejected.',
            'success'
          );
        }
        setSelectedReq(null);
        setActionType(null);
        setComment('');
        fetchLeaveRequests();
      } else {
        if (showToast) showToast(res.error || 'Action failed', 'error');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error processing leave request action', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const workerName = r.workerId?.name || '';
    const empId = r.workerId?.employeeId || '';
    const matchesSearch = !searchQuery || 
      workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6 text-on-surface font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">Leave Request Directory</h1>
          <p className="text-xs text-outline font-medium mt-0.5">
            Review worker leave and half-day applications, approve/reject with comments, and sync attendance automatically.
          </p>
        </div>
        <button
          onClick={fetchLeaveRequests}
          className="btn border border-outline-variant hover:bg-surface-low text-on-surface-variant font-bold px-4 py-2 rounded-sm text-xs flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh Directory
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-lowest border border-outline-variant rounded-md p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <span className="font-bold text-outline uppercase tracking-wider">Status Filter:</span>
          {['All', 'Pending', 'Approved', 'Rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface-low text-outline border-outline-variant hover:text-on-surface'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            type="text"
            placeholder="Search worker name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface-low border border-outline-variant rounded-sm text-xs text-on-surface outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Directory Content */}
      {loading ? (
        <div className="py-16 text-center text-xs font-semibold text-outline">Loading worker leave requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-16 text-center text-xs font-semibold text-outline">No leave requests match your criteria.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => {
            const worker = req.workerId || {};
            const isPending = req.status === 'Pending';
            const isApproved = req.status === 'Approved';
            const isRejected = req.status === 'Rejected';

            return (
              <div
                key={req._id}
                className="bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm flex flex-col justify-between gap-4 hover:border-primary/50 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-outline-variant/30 pb-3 mb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-on-surface">{worker.name || 'Worker'}</h3>
                      <span className="text-[11px] text-outline font-medium">
                        ID: <strong className="text-on-surface">{worker.employeeId || 'EMP-N/A'}</strong> · Department: <strong className="text-on-surface">{worker.department || 'Operations'}</strong>
                      </span>
                    </div>

                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                      isApproved
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : isRejected
                        ? 'bg-error/10 text-error border border-error/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-primary font-extrabold uppercase tracking-wider">{req.leaveType}</span>
                      {req.leaveType === 'Half Day Leave' && (
                        <span className="text-amber-400 text-[11px] font-bold bg-amber-400/10 px-2 py-0.5 rounded">
                          {req.halfDaySession}
                        </span>
                      )}
                    </div>

                    <div className="bg-surface-low p-3 rounded border border-outline-variant/40 flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-medium text-outline">
                        <span>Leave Dates:</span>
                        <strong className="text-on-surface">
                          {new Date(req.fromDate).toLocaleDateString()} — {new Date(req.toDate).toLocaleDateString()}
                        </strong>
                      </div>

                      <div className="mt-1 pt-1 border-t border-outline-variant/30">
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Reason</span>
                        <p className="text-xs text-on-surface font-medium leading-relaxed">{req.reason}</p>
                      </div>

                      {req.attachment && (
                        <div className="mt-1 text-[11px]">
                          <a
                            href={req.attachment}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary font-bold hover:underline flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">attachment</span>
                            View Attachment Document
                          </a>
                        </div>
                      )}
                    </div>

                    {req.supervisorComment && (
                      <div className={`p-2.5 rounded text-xs border mt-1 ${
                        isRejected ? 'bg-error/5 border-error/20 text-error' : 'bg-surface-low border-outline-variant text-on-surface'
                      }`}>
                        <strong className="block text-[10px] uppercase font-bold text-outline">Supervisor Remarks:</strong>
                        {req.supervisorComment}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-outline-variant/40 pt-3 flex items-center justify-between">
                  <span className="text-[10px] text-outline font-mono">
                    Submitted: {new Date(req.createdAt).toLocaleDateString()}
                  </span>

                  {isPending ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenActionModal(req, 'reject')}
                        className="btn border border-error/40 hover:bg-error/10 text-error text-[11px] font-bold py-1 px-3 rounded-sm uppercase tracking-wider cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleOpenActionModal(req, 'approve')}
                        className="btn bg-primary hover:bg-primary-container text-white text-[11px] font-bold py-1 px-3 rounded-sm shadow-sm uppercase tracking-wider cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-outline italic">Processed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approval / Rejection Action Modal */}
      {selectedReq && actionType && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-lowest border border-outline-variant rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-5 text-on-surface animate-scale-up">
            <div className="flex items-start justify-between border-b border-outline-variant/40 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-on-surface">
                  {actionType === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
                </h3>
                <p className="text-xs text-outline mt-0.5">
                  Worker: <strong className="text-on-surface">{selectedReq.workerId?.name}</strong> ({selectedReq.leaveType})
                </p>
              </div>
              <button
                onClick={() => { setSelectedReq(null); setActionType(null); }}
                className="w-7 h-7 rounded hover:bg-surface-low text-on-surface-variant flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="bg-surface-low p-3 rounded text-xs text-outline flex flex-col gap-1">
                <span>Requested Dates: <strong className="text-on-surface">{new Date(selectedReq.fromDate).toLocaleDateString()} — {new Date(selectedReq.toDate).toLocaleDateString()}</strong></span>
                <span>Reason: <strong className="text-on-surface">{selectedReq.reason}</strong></span>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Supervisor Comment {actionType === 'reject' ? '(Mandatory)' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    actionType === 'reject'
                      ? 'State reasons for rejection (Required)...'
                      : 'Add optional approval remarks...'
                  }
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary resize-none"
                  required={actionType === 'reject'}
                ></textarea>
              </div>
            </div>

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
                {submitting ? 'Processing...' : actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;
