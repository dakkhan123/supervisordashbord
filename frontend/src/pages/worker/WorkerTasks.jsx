import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
const WorkerTasks = ({ showToast }) => {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected task modal state
  const [selectedTask, setSelectedTask] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [newProgress, setNewProgress] = useState(0);
  
  // Completion notes form state
  const [summary, setSummary] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [issuesFaced, setIssuesFaced] = useState('');
  const [submittingNotes, setSubmittingNotes] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('smartops_user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
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

  const handleOpenTask = (task) => {
    setSelectedTask(task);
    setNewStatus(task.status || 'Pending');
    setNewProgress(task.progressPercent || task.progress || 0);
    setSummary(task.completionNotes?.summary || '');
    setWorkPerformed(task.completionNotes?.workPerformed || '');
    setIssuesFaced(task.completionNotes?.issuesFaced || '');
  };

  const handleUpdateStatusAndProgress = async () => {
    if (!selectedTask) return;
    try {
      const res = await api.updateTask(selectedTask._id, {
        status: newStatus,
        progressPercent: Number(newProgress),
        progress: Number(newProgress)
      });
      if (res.success) {
        showToast('Task updated successfully', 'success');
        setSelectedTask(res.data);
        fetchMyTasks();
      } else {
        showToast(res.error || 'Failed to update task', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating task', 'error');
    }
  };

  const handleToggleChecklist = async (itemId, currentCompleted) => {
    if (!selectedTask) return;
    try {
      const res = await api.updateChecklistItem(selectedTask._id, itemId, !currentCompleted);
      if (res.success) {
        setSelectedTask(res.data);
        fetchMyTasks();
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating checklist item', 'error');
    }
  };

  const handleSubmitNotes = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (!summary.trim() || !workPerformed.trim()) {
      showToast('Please provide a summary and work performed description', 'error');
      return;
    }
    try {
      setSubmittingNotes(true);
      const res = await api.submitCompletionNotes(selectedTask._id, {
        summary,
        workPerformed,
        issuesFaced
      });
      if (res.success) {
        showToast('Completion notes submitted for verification!', 'success');
        setSelectedTask(res.data);
        fetchMyTasks();
      } else {
        showToast(res.error || 'Failed to submit notes', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error submitting completion notes', 'error');
    } finally {
      setSubmittingNotes(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-on-surface">Assigned Tasks</h2>
            <p className="text-xs text-outline font-medium mt-0.5">
              Manage your tasks, complete checklist steps, update status, and submit completion reports.
            </p>
          </div>
          <button
            onClick={fetchMyTasks}
            className="btn btn-outline border border-outline-variant text-on-surface hover:bg-surface-container font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 self-start md:self-auto cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh Tasks
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs font-semibold text-outline">Loading your assigned tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center text-xs font-semibold text-outline">No tasks currently assigned to you.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <div
                key={task._id}
                className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between gap-4 cursor-pointer"
                onClick={() => handleOpenTask(task)}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      task.priority === 'Urgent' || task.priority === 'Critical' || task.priority === 'High'
                        ? 'bg-error/10 text-error'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {task.priority || 'Medium'} Priority
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      task.status === 'Completed' || task.status === 'Submitted for Verification'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : task.status === 'In Progress' || task.status === 'Started'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-surface-container-high text-outline'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-on-surface line-clamp-1">{task.title || task.name}</h3>
                  <p className="text-xs text-outline mt-1 line-clamp-2">{task.description || 'No description provided.'}</p>
                </div>

                <div className="border-t border-outline-variant/40 pt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-outline font-semibold">Progress</span>
                    <span className="font-extrabold text-primary">{task.progressPercent || task.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${task.progressPercent || task.progress || 0}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-outline mt-1">
                    <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</span>
                    <span className="font-bold text-primary hover:underline">View & Edit &rarr;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Task Detail & Update Modal */}
        {selectedTask && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-surface border border-outline-variant rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto animate-scale-up">
              <div className="flex items-start justify-between border-b border-outline-variant/50 pb-3">
                <div>
                  <h3 className="text-xl font-extrabold text-on-surface">{selectedTask.title || selectedTask.name}</h3>
                  <p className="text-xs text-outline mt-0.5">{selectedTask.description}</p>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1 rounded hover:bg-surface-container text-outline cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Status and Progress Controls */}
              <div className="bg-surface-container/40 p-4 rounded-lg border border-outline-variant/40 flex flex-col gap-4">
                <h4 className="text-xs font-bold text-outline uppercase tracking-wider">Update Status & Progress</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface">Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="px-3 py-2 bg-surface border border-outline-variant rounded-md text-xs font-bold text-on-surface outline-none focus:border-primary"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Started">Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Submitted for Verification">Submitted for Verification</option>
                      <option value="Completed">Completed</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface">Progress ({newProgress}%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newProgress}
                      onChange={(e) => setNewProgress(e.target.value)}
                      className="accent-primary cursor-pointer mt-2"
                    />
                  </div>
                </div>

                <button
                  onClick={handleUpdateStatusAndProgress}
                  className="bg-primary text-white text-xs font-bold py-2 px-4 rounded-md hover:bg-primary-container transition-all self-end cursor-pointer"
                >
                  Save Status & Progress
                </button>
              </div>

              {/* Checklist Section */}
              {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-outline uppercase tracking-wider">Checklist Items</h4>
                  <div className="flex flex-col gap-2">
                    {selectedTask.checklist.map((item) => (
                      <label
                        key={item._id}
                        className="flex items-center gap-3 p-3 bg-surface-container/30 border border-outline-variant/30 rounded-lg cursor-pointer hover:bg-surface-container/60 transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={item.isCompleted || false}
                          onChange={() => handleToggleChecklist(item._id, item.isCompleted)}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                        <span className={`text-xs font-medium ${item.isCompleted ? 'line-through text-outline' : 'text-on-surface'}`}>
                          {item.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Completion Notes Form */}
              <form onSubmit={handleSubmitNotes} className="flex flex-col gap-3 border-t border-outline-variant/50 pt-4">
                <h4 className="text-xs font-bold text-outline uppercase tracking-wider">Submit Completion Notes</h4>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface">Summary of Work Done</label>
                  <input
                    type="text"
                    placeholder="e.g. Completed assembly of rack unit A12"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="px-3 py-2 bg-surface border border-outline-variant rounded-md text-xs font-medium text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface">Detailed Work Performed</label>
                  <textarea
                    rows={3}
                    placeholder="Describe specific steps, components used, or tests performed"
                    value={workPerformed}
                    onChange={(e) => setWorkPerformed(e.target.value)}
                    className="px-3 py-2 bg-surface border border-outline-variant rounded-md text-xs font-medium text-on-surface outline-none focus:border-primary"
                  ></textarea>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface">Issues Faced / Remarks (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Minor component shortage resolved"
                    value={issuesFaced}
                    onChange={(e) => setIssuesFaced(e.target.value)}
                    className="px-3 py-2 bg-surface border border-outline-variant rounded-md text-xs font-medium text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingNotes}
                  className="bg-emerald-600 text-white font-bold text-xs py-2.5 px-4 rounded-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 mt-1 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  {submittingNotes ? 'Submitting...' : 'Submit Notes for Verification'}
                </button>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};


export default WorkerTasks;
