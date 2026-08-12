import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const WorkerLeaveRequests = ({ showToast }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [leaveReasonType, setLeaveReasonType] = useState('Personal Leave');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const getDurationText = (req) => {
    if (!req) return '';
    if (req.leaveType === 'Half Day Leave') {
      return '0.5 Day';
    }
    const from = new Date(req.fromDate);
    const to = new Date(req.toDate);
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
  };

  // Form State
  const [form, setForm] = useState({
    leaveType: 'Full Day Leave',
    reason: 'Personal Leave',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    halfDaySession: 'First Half',
    attachment: ''
  });

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const res = await api.getMyLeaveRequests();
      if (res.success) {
        setRequests(res.data || []);
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to fetch leave requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      if (showToast) showToast('Please enter a reason for your leave request.', 'error');
      return;
    }

    if (!form.fromDate || !form.toDate) {
      if (showToast) showToast('Please select both From and To dates.', 'error');
      return;
    }

    if (new Date(form.fromDate) > new Date(form.toDate)) {
      if (showToast) showToast('From Date cannot be later than To Date.', 'error');
      return;
    }

    const from = new Date(form.fromDate);
    const to = new Date(form.toDate);
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive count

    if (diffDays > 10) {
      if (showToast) showToast('The maximum duration for a leave request is 10 days. For longer leaves, please contact your supervisor personally.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        leaveType: form.leaveType,
        reason: form.reason.trim(),
        fromDate: form.fromDate,
        toDate: form.toDate,
        halfDaySession: form.leaveType === 'Half Day Leave' ? form.halfDaySession : 'N/A',
        attachment: form.attachment.trim()
      };

      const res = await api.createLeaveRequest(payload);
      if (res.success) {
        if (showToast) showToast('Leave request submitted to supervisor!', 'success');
        setCreateModalOpen(false);
        setForm({
          leaveType: 'Full Day Leave',
          reason: 'Personal Leave',
          fromDate: new Date().toISOString().split('T')[0],
          toDate: new Date().toISOString().split('T')[0],
          halfDaySession: 'First Half',
          attachment: ''
        });
        setLeaveReasonType('Personal Leave');
        fetchMyRequests();
      } else {
        if (showToast) showToast(res.error || 'Failed to submit leave request', 'error');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error submitting leave request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this pending leave request?')) return;
    try {
      const res = await api.cancelLeaveRequest(id);
      if (res.success) {
        if (showToast) showToast('Leave request cancelled.', 'success');
        fetchMyRequests();
      } else {
        if (showToast) showToast(res.error || 'Failed to cancel request', 'error');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error cancelling request', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 text-on-surface font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-on-surface">Leave & Half-Day Requests</h2>
          <p className="text-xs text-outline font-medium mt-0.5">
            Apply for full day or half day leaves, track supervisor approvals, and manage submitted requests.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchMyRequests}
            className="btn border border-outline-variant hover:bg-surface-low text-on-surface-variant font-bold px-3 py-2 rounded-sm text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn bg-primary hover:bg-primary-container text-white font-bold px-4 py-2 rounded-sm text-xs flex items-center gap-1.5 shadow-sm uppercase tracking-wider cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Apply For Leave
          </button>
        </div>
      </div>

      {/* Requests Directory */}
      {loading ? (
        <div className="py-16 text-center text-xs font-semibold text-outline">Loading your leave requests...</div>
      ) : requests.length === 0 ? (
        <div className="py-16 text-center text-xs font-semibold text-outline">No leave requests submitted yet. Click 'Apply For Leave' above to create one.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((req) => {
            const isPending = req.status === 'Pending';
            const isApproved = req.status === 'Approved';
            const isRejected = req.status === 'Rejected';

            return (
              <div
                key={req._id}
                onClick={(e) => {
                  if (e.target.closest('button') || e.target.closest('a')) return;
                  setSelectedRequest(req);
                  setDetailModalOpen(true);
                }}
                className="bg-surface-lowest border border-outline-variant hover:border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-extrabold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">
                        {req.leaveType === 'Half Day Leave' ? 'timelapse' : 'event_available'}
                      </span>
                      {req.leaveType}
                    </span>

                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                      isApproved
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : isRejected
                        ? 'bg-error/10 text-error border border-error/20'
                        : isPending
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-surface-low text-outline border border-outline-variant'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="bg-surface-low p-3 rounded border border-outline-variant/30 flex flex-col gap-1.5 my-2">
                    <div className="flex justify-between items-center text-xs text-outline font-medium">
                      <span>Date Range:</span>
                      <strong className="text-on-surface">
                        {new Date(req.fromDate).toLocaleDateString()} — {new Date(req.toDate).toLocaleDateString()}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center text-xs text-outline font-medium">
                      <span>Duration:</span>
                      <strong className="text-primary font-bold">{getDurationText(req)}</strong>
                    </div>

                    <div className="flex justify-between items-center text-xs text-outline font-medium">
                      <span>Status:</span>
                      <strong className={`font-extrabold ${isApproved ? 'text-primary' : isRejected ? 'text-error' : 'text-amber-500'}`}>{req.status}</strong>
                    </div>

                    {req.leaveType === 'Half Day Leave' && req.halfDaySession !== 'N/A' && (
                      <div className="flex justify-between items-center text-xs text-outline font-medium">
                        <span>Half Day Session:</span>
                        <strong className="text-primary">{req.halfDaySession}</strong>
                      </div>
                    )}

                    <div className="mt-1 pt-1.5 border-t border-outline-variant/30">
                      <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Reason</span>
                      <p className="text-xs text-on-surface font-medium mt-0.5">{req.reason}</p>
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
                          View Attachment
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Supervisor Remarks */}
                  {req.supervisorComment && (
                    <div className={`p-2.5 rounded text-xs border ${
                      isRejected ? 'bg-error/5 border-error/20 text-error font-medium' : 'bg-surface-low border-outline-variant text-on-surface font-medium'
                    }`}>
                      <strong className="block text-[10px] uppercase font-bold text-outline">Supervisor Comment:</strong>
                      {req.supervisorComment}
                    </div>
                  )}
                </div>

                <div className="border-t border-outline-variant/40 pt-3 flex items-center justify-between">
                  <span className="text-[10px] text-outline font-mono">
                    Submitted: {new Date(req.createdAt).toLocaleDateString()}
                  </span>

                  {isPending && (
                    <button
                      onClick={() => handleCancelRequest(req._id)}
                      className="btn border border-error/30 hover:bg-error/10 text-error text-[11px] font-bold py-1 px-2.5 rounded-sm uppercase tracking-wider cursor-pointer"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Apply Leave Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-lowest border border-outline-variant rounded-lg max-w-lg w-full p-6 shadow-xl flex flex-col gap-5 text-on-surface animate-scale-up">
            <div className="flex items-start justify-between border-b border-outline-variant/40 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-on-surface">Submit Leave Request</h3>
                <p className="text-xs text-outline mt-0.5">Fill in leave details for supervisor review</p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="w-7 h-7 rounded hover:bg-surface-low text-on-surface-variant flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Leave Type</label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Full Day Leave">Full Day Leave</option>
                  <option value="Half Day Leave">Half Day Leave</option>
                </select>
              </div>

              {/* Conditional Half Day Session Choice */}
              {form.leaveType === 'Half Day Leave' && (
                <div className="flex flex-col gap-1.5 bg-surface-low p-3 rounded border border-primary/30 animate-fade-in">
                  <label className="text-xs font-bold text-primary uppercase tracking-wider">Half Day Session</label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer">
                      <input
                        type="radio"
                        name="halfDaySession"
                        value="First Half"
                        checked={form.halfDaySession === 'First Half'}
                        onChange={(e) => setForm({ ...form, halfDaySession: e.target.value })}
                        className="accent-primary cursor-pointer"
                      />
                      First Half (Morning)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer">
                      <input
                        type="radio"
                        name="halfDaySession"
                        value="Second Half"
                        checked={form.halfDaySession === 'Second Half'}
                        onChange={(e) => setForm({ ...form, halfDaySession: e.target.value })}
                        className="accent-primary cursor-pointer"
                      />
                      Second Half (Afternoon)
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">From Date</label>
                  <input
                    type="date"
                    value={form.fromDate}
                    onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                    className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">To Date</label>
                  <input
                    type="date"
                    value={form.toDate}
                    onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                    className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Reason for Leave Category</label>
                <select
                  value={leaveReasonType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLeaveReasonType(val);
                    if (val !== 'Other') {
                      setForm((prev) => ({ ...prev, reason: val }));
                    } else {
                      setForm((prev) => ({ ...prev, reason: '' }));
                    }
                  }}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Personal Leave">Personal Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Other">Other (Specify below)</option>
                </select>
              </div>

              {leaveReasonType === 'Other' && (
                <div className="flex flex-col gap-1.5 animate-fade-in">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Specify Personal Reason (Required)</label>
                  <textarea
                    rows={3}
                    placeholder="State the specific reason for your leave application..."
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary resize-none"
                    required
                  ></textarea>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Attachment URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/..."
                  value={form.attachment}
                  onChange={(e) => setForm({ ...form, attachment: e.target.value })}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-outline-variant/40 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn border border-outline-variant text-outline hover:text-on-surface text-xs font-bold py-2 px-4 rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold py-2 px-4 rounded-sm shadow-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Leave Details Modal */}
      {detailModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-lowest border border-outline-variant rounded-lg max-w-lg w-full p-6 shadow-xl flex flex-col gap-5 text-on-surface animate-scale-up">
            <div className="flex items-start justify-between border-b border-outline-variant/40 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-on-surface">Leave Request Details</h3>
                <p className="text-xs text-outline mt-0.5">Full specifications of your submitted application</p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="w-7 h-7 rounded hover:bg-surface-low text-on-surface-variant flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs font-semibold text-outline">
              <div className="grid grid-cols-2 gap-4 bg-surface-low p-4 rounded border border-outline-variant/30">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-outline">Leave Type</span>
                  <span className="text-on-surface font-extrabold flex items-center gap-1">
                    <span className="material-symbols-outlined text-primary text-[16px]">
                      {selectedRequest.leaveType === 'Half Day Leave' ? 'timelapse' : 'event_available'}
                    </span>
                    {selectedRequest.leaveType}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-outline">Status</span>
                  <span className={`font-extrabold uppercase px-2.5 py-0.5 rounded-full text-[10px] w-fit border ${
                    selectedRequest.status === 'Approved'
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : selectedRequest.status === 'Rejected'
                      ? 'bg-error/10 text-error border-error/20'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    {selectedRequest.status}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-outline">From Date</span>
                  <span className="text-on-surface font-bold">{new Date(selectedRequest.fromDate).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-outline">To Date</span>
                  <span className="text-on-surface font-bold">{new Date(selectedRequest.toDate).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-outline">Duration</span>
                  <span className="text-primary font-black">{getDurationText(selectedRequest)}</span>
                </div>
                {selectedRequest.leaveType === 'Half Day Leave' && selectedRequest.halfDaySession !== 'N/A' && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-outline">Half Day Session</span>
                    <span className="text-on-surface font-bold">{selectedRequest.halfDaySession}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 bg-surface-low p-4 rounded border border-outline-variant/30">
                <span className="text-[10px] uppercase font-bold text-outline">Reason for Leave</span>
                <p className="text-on-surface font-medium whitespace-pre-wrap leading-relaxed mt-0.5">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.attachment && (
                <div className="flex flex-col gap-1 bg-surface-low p-4 rounded border border-outline-variant/30">
                  <span className="text-[10px] uppercase font-bold text-outline">Attachment</span>
                  <a
                    href={selectedRequest.attachment}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-bold hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">attachment</span>
                    View Attached Document
                  </a>
                </div>
              )}

              {selectedRequest.supervisorComment && (
                <div className={`p-4 rounded border flex flex-col gap-1 ${
                  selectedRequest.status === 'Rejected' ? 'bg-error/5 border-error/20 text-error' : 'bg-surface-low border-outline-variant text-on-surface'
                }`}>
                  <span className="text-[10px] uppercase font-bold text-outline">Supervisor Comment</span>
                  <p className="font-medium leading-relaxed mt-0.5">{selectedRequest.supervisorComment}</p>
                </div>
              )}

              <div className="text-[10px] text-outline font-mono mt-1">
                Submitted on: {new Date(selectedRequest.createdAt).toLocaleString()}
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-outline-variant/40 pt-4 mt-2">
              <div>
                {selectedRequest.status === 'Pending' && (
                  <button
                    onClick={() => {
                      handleCancelRequest(selectedRequest._id);
                      setDetailModalOpen(false);
                    }}
                    className="btn border border-error/30 hover:bg-error/10 text-error text-xs font-bold py-2 px-4 rounded-sm uppercase tracking-wider cursor-pointer"
                  >
                    Cancel Request
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="btn bg-surface-low hover:bg-surface-container border border-outline-variant text-on-surface text-xs font-bold py-2 px-5 rounded-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerLeaveRequests;
