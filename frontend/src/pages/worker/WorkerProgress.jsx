import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const WorkerProgress = ({ showToast }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected task state for updating progress
  const [selectedTask, setSelectedTask] = useState(null);
  const [newProgress, setNewProgress] = useState(0);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

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

  const handleOpenProgressUpdate = (task) => {
    setSelectedTask(task);
    setNewProgress(task.progressPercent || task.progress || 0);
    setNewStatus(task.status || 'In Progress');
  };

  const handleSaveProgress = async () => {
    if (!selectedTask) return;
    try {
      setSaving(true);
      const progressVal = Number(newProgress);
      const res = await api.updateTask(selectedTask._id, {
        progressPercent: progressVal,
        progress: progressVal,
        status: newStatus
      });

      if (res.success) {
        if (showToast) showToast('Task progress saved to database!', 'success');
        setSelectedTask(null);
        fetchMyTasks();
      } else {
        if (showToast) showToast(res.error || 'Failed to update progress', 'error');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error saving task progress', 'error');
    } fontFinally: {
      setSaving(false);
    }
  };

  const handleToggleChecklist = async (taskId, itemId, currentCompleted) => {
    try {
      const res = await api.updateChecklistItem(taskId, itemId, !currentCompleted);
      if (res.success) {
        if (showToast) showToast('Checklist item updated', 'success');
        fetchMyTasks();
        if (selectedTask && selectedTask._id === taskId) {
          setSelectedTask(res.data);
        }
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error updating checklist item', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 text-on-surface font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-on-surface">Task Progress Tracker</h2>
          <p className="text-xs text-outline font-medium mt-0.5">
            Track completion percentages, toggle checklist milestones, and update real-time progress for your assigned tasks.
          </p>
        </div>
        <button
          onClick={fetchMyTasks}
          className="btn border border-outline-variant hover:bg-surface-low text-on-surface-variant font-bold px-4 py-2 rounded-sm text-xs flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh Progress
        </button>
      </div>

      {/* Task Progress Cards */}
      {loading ? (
        <div className="py-16 text-center text-xs font-semibold text-outline">Loading task progress data...</div>
      ) : tasks.length === 0 ? (
        <div className="py-16 text-center text-xs font-semibold text-outline">No assigned tasks found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const currentProg = task.progressPercent || task.progress || 0;
            const completedChecklist = task.checklist ? task.checklist.filter(c => c.isCompleted).length : 0;
            const totalChecklist = task.checklist ? task.checklist.length : 0;

            return (
              <div
                key={task._id}
                className="bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-extrabold text-on-surface truncate">{task.title || task.name}</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      task.status === 'Completed'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : task.status === 'In Progress' || task.status === 'Started'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-surface-low text-outline border border-outline-variant'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <p className="text-xs text-outline line-clamp-2 mb-3">{task.description || 'No description provided.'}</p>

                  {/* Progress Bar Display */}
                  <div className="flex flex-col gap-1.5 mb-4">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-outline">Completion Progress</span>
                      <span className="text-primary font-mono">{currentProg}%</span>
                    </div>
                    <div className="w-full bg-surface-low border border-outline-variant/60 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${currentProg}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Checklist Summary & Interactive Items */}
                  {totalChecklist > 0 && (
                    <div className="flex flex-col gap-2 bg-surface-low/50 p-3 rounded border border-outline-variant/30">
                      <div className="flex justify-between items-center text-[11px] font-bold text-outline">
                        <span>Checklist Steps</span>
                        <span>{completedChecklist} / {totalChecklist} Done</span>
                      </div>
                      <div className="flex flex-col gap-1.5 mt-1">
                        {task.checklist.map((item) => (
                          <label
                            key={item._id}
                            className="flex items-center gap-2.5 text-xs text-on-surface cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={item.isCompleted || false}
                              onChange={() => handleToggleChecklist(task._id, item._id, item.isCompleted)}
                              className="w-4 h-4 accent-primary cursor-pointer rounded"
                            />
                            <span className={item.isCompleted ? 'line-through text-outline' : 'font-medium'}>
                              {item.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action Button & Dates */}
                <div className="border-t border-outline-variant/40 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-outline font-medium">
                  <div className="flex flex-col gap-0.5">
                    <span>Assigned: <strong className="text-on-surface font-mono">{task.assignedDate || task.createdAt ? new Date(task.assignedDate || task.createdAt).toLocaleDateString() : 'N/A'}</strong></span>
                    <span>Due: <strong className="text-primary font-mono">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</strong></span>
                  </div>
                  <button
                    onClick={() => handleOpenProgressUpdate(task)}
                    className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold py-1.5 px-3 rounded-sm shadow-sm flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider self-end sm:self-auto"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    Update Progress
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Update Progress Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-lowest border border-outline-variant rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-5 text-on-surface animate-scale-up">
            <div className="flex items-start justify-between border-b border-outline-variant/40 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-on-surface">{selectedTask.title || selectedTask.name}</h3>
                <p className="text-xs text-outline mt-0.5">Adjust current completion percentage and status</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="w-7 h-7 rounded hover:bg-surface-low text-on-surface-variant flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">Task Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="Started">Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Submitted for Verification">Submitted for Verification</option>
                  <option value="Completed">Completed</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <label className="text-on-surface">Completion Percentage</label>
                  <span className="text-primary font-mono text-sm">{newProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={newProgress}
                  onChange={(e) => setNewProgress(e.target.value)}
                  className="w-full accent-primary cursor-pointer h-2 bg-surface-low rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-outline font-semibold px-0.5">
                  <span>0% (Not Started)</span>
                  <span>50% (Halfway)</span>
                  <span>100% (Finished)</span>
                </div>
              </div>

              {/* Quick Percentage Presets */}
              <div className="flex gap-2">
                {[25, 50, 75, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNewProgress(val)}
                    className={`flex-1 py-1 px-2 text-[11px] font-bold rounded border cursor-pointer transition-all ${
                      Number(newProgress) === val
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface-low text-outline border-outline-variant hover:text-on-surface'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-outline-variant/40 pt-4">
              <button
                onClick={() => setSelectedTask(null)}
                className="btn border border-outline-variant text-outline hover:text-on-surface text-xs font-bold py-2 px-4 rounded-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProgress}
                className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold py-2 px-4 rounded-sm shadow-sm uppercase tracking-wider cursor-pointer"
              >
                Save Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerProgress;
