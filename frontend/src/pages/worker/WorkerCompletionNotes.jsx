import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const WorkerCompletionNotes = ({ showToast }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected task state for submitting completion report
  const [selectedTask, setSelectedTask] = useState(null);
  const [summary, setSummary] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [issuesFaced, setIssuesFaced] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const res = await api.getMyTasks();
      if (res.success) {
        setTasks(res.data || []);
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to fetch assigned tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCompletionModal = (task) => {
    setSelectedTask(task);
    setSummary(task.completionNotes?.summary || '');
    setWorkPerformed(task.completionNotes?.workPerformed || '');
    setIssuesFaced(task.completionNotes?.issuesFaced || '');
    setAttachmentUrl(task.completionNotes?.attachmentUrl || '');
  };

  const handleSubmitCompletionNotes = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (!summary.trim() || !workPerformed.trim()) {
      if (showToast) showToast('Please enter both a summary and detailed work performed description.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.submitCompletionNotes(selectedTask._id, {
        summary: summary.trim(),
        workPerformed: workPerformed.trim(),
        issuesFaced: issuesFaced.trim(),
        attachmentUrl: attachmentUrl.trim()
      });

      if (res.success) {
        if (showToast) showToast('Completion notes submitted! Task marked as completed for verification.', 'success');
        setSelectedTask(null);
        fetchMyTasks();
      } else {
        if (showToast) showToast(res.error || 'Failed to submit completion notes', 'error');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error submitting completion report', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-on-surface font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-on-surface">Completion Notes & Verification</h2>
          <p className="text-xs text-outline font-medium mt-0.5">
            Submit work completion reports, document work logs, attach proof files, and notify your supervisor for task sign-off.
          </p>
        </div>
        <button
          onClick={fetchMyTasks}
          className="btn border border-outline-variant hover:bg-surface-low text-on-surface-variant font-bold px-4 py-2 rounded-sm text-xs flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh Tasks
        </button>
      </div>

      {/* Task Cards */}
      {loading ? (
        <div className="py-16 text-center text-xs font-semibold text-outline">Loading task completion data...</div>
      ) : tasks.length === 0 ? (
        <div className="py-16 text-center text-xs font-semibold text-outline">No assigned tasks available for completion notes.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const hasNotes = task.completionNotes && (task.completionNotes.summary || task.completionNotes.workPerformed);
            const isCompleted = task.status === 'Completed' || task.status === 'Submitted for Verification';

            return (
              <div
                key={task._id}
                className="bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-extrabold text-on-surface truncate">{task.title || task.name}</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      isCompleted
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <p className="text-xs text-outline line-clamp-2 mb-3">{task.description || 'No description provided.'}</p>

                  {/* Saved Completion Notes Preview */}
                  {hasNotes ? (
                    <div className="bg-surface-low p-3 rounded border border-outline-variant/40 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Submitted Report</span>
                        <span className="text-[10px] text-outline font-mono">
                          {task.completionNotes.submittedAt ? new Date(task.completionNotes.submittedAt).toLocaleDateString() : 'Recorded'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-on-surface">{task.completionNotes.summary}</p>
                      <p className="text-[11px] text-outline line-clamp-2 font-medium">{task.completionNotes.workPerformed}</p>
                      {task.completionNotes.issuesFaced && (
                        <p className="text-[10px] text-amber-400 font-medium">Remarks: {task.completionNotes.issuesFaced}</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-surface-low/40 p-3 rounded border border-dashed border-outline-variant/40 text-center text-xs text-outline font-medium">
                      📝 No completion notes submitted yet. Click below to submit work report.
                    </div>
                  )}
                </div>

                <div className="border-t border-outline-variant/40 pt-3 flex items-center justify-between">
                  <span className="text-[11px] text-outline font-medium">
                    Progress: <strong className="text-primary">{task.progressPercent || task.progress || 0}%</strong>
                  </span>
                  <button
                    onClick={() => handleOpenCompletionModal(task)}
                    className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold py-1.5 px-3 rounded-sm shadow-sm flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                  >
                    <span className="material-symbols-outlined text-[16px]">note_add</span>
                    {hasNotes ? 'Edit Completion Notes' : 'Submit Completion'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion Notes Submission Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-lowest border border-outline-variant rounded-lg max-w-xl w-full p-6 shadow-xl flex flex-col gap-5 text-on-surface animate-scale-up">
            <div className="flex items-start justify-between border-b border-outline-variant/40 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-on-surface">{selectedTask.title || selectedTask.name}</h3>
                <p className="text-xs text-outline mt-0.5">Submit final work completion notes for supervisor approval</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="w-7 h-7 rounded hover:bg-surface-low text-on-surface-variant flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitCompletionNotes} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Summary of Work Done (Required)</label>
                <input
                  type="text"
                  placeholder="e.g. Completed inventory auditing and stock replenishment for Bay B"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Detailed Work Performed (Required)</label>
                <textarea
                  rows={4}
                  placeholder="Provide detailed description of operations carried out, components checked, or batch quantities logged."
                  value={workPerformed}
                  onChange={(e) => setWorkPerformed(e.target.value)}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary resize-none"
                  required
                ></textarea>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Issues Faced / Additional Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Minor delay due to tool recalibration"
                  value={issuesFaced}
                  onChange={(e) => setIssuesFaced(e.target.value)}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Attachment Link / Documentation URL (Optional)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[16px]">link</span>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/..."
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-outline-variant/40 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
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
                  {submitting ? 'Submitting...' : 'Submit & Complete Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerCompletionNotes;
