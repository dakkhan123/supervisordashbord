import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const formatTaskDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const WorkerTasks = ({ showToast }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);

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

  return (
    <div className="flex flex-col gap-6 text-on-surface font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-on-surface">Assigned Tasks Overview</h2>
          <p className="text-xs text-outline font-medium mt-0.5">
            View all tasks assigned to your account, due dates, priority levels, and assignment dates.
          </p>
        </div>
        <button
          onClick={fetchMyTasks}
          className="btn border border-outline-variant hover:bg-surface-low text-on-surface-variant font-bold px-4 py-2 rounded-sm text-xs flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh List
        </button>
      </div>

      {/* Task List Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-semibold text-outline">Loading your assigned tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="py-16 text-center text-xs font-semibold text-outline">No tasks currently assigned to you.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => {
            const assignedDate = task.assignedDate || task.createdAt;
            const progressVal = task.progressPercent !== undefined ? task.progressPercent : (task.progress || 0);

            return (
              <div
                key={task._id}
                className="bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm hover:border-primary transition-all flex flex-col justify-between gap-4 cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      task.priority === 'Urgent' || task.priority === 'Critical' || task.priority === 'High'
                        ? 'bg-error/10 text-error border border-error/20'
                        : 'bg-primary/10 text-primary border border-primary/20'
                    }`}>
                      {task.priority || 'Medium'} Priority
                    </span>

                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      task.status === 'Completed' || task.status === 'Submitted for Verification'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : task.status === 'In Progress' || task.status === 'Started'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-surface-low text-outline border border-outline-variant'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-on-surface line-clamp-1">{task.title || task.name}</h3>
                  <p className="text-xs text-outline mt-1 line-clamp-2">{task.description || 'No description provided.'}</p>

                  {/* Progress Indicator */}
                  <div className="flex flex-col gap-1 mt-3">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-outline uppercase tracking-wider text-[10px]">Progress</span>
                      <span className="text-primary font-mono">{progressVal}%</span>
                    </div>
                    <div className="w-full bg-surface-low border border-outline-variant/60 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressVal}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-outline-variant/40 pt-3 flex flex-col gap-1.5 text-xs text-outline font-medium">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Assigned Date:</span>
                    <span className="font-bold text-on-surface font-mono">
                      {formatTaskDate(assignedDate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Due Date:</span>
                    <span className="font-bold text-primary font-mono">
                      {formatTaskDate(task.dueDate)}
                    </span>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <span className="text-[11px] font-extrabold text-primary hover:underline flex items-center gap-1">
                      View Details &rarr;
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Read-Only Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-lowest border border-outline-variant rounded-lg max-w-lg w-full p-6 shadow-xl flex flex-col gap-5 text-on-surface animate-scale-up">
            <div className="flex items-start justify-between border-b border-outline-variant/40 pb-3">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  selectedTask.priority === 'Urgent' || selectedTask.priority === 'High'
                    ? 'bg-error/10 text-error border border-error/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {selectedTask.priority || 'Medium'} Priority
                </span>
                <h3 className="text-xl font-extrabold text-on-surface mt-2">{selectedTask.title || selectedTask.name}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="w-7 h-7 rounded hover:bg-surface-low text-on-surface-variant flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Description</label>
                <p className="text-xs text-on-surface font-medium leading-relaxed bg-surface-low p-3 rounded border border-outline-variant/30">
                  {selectedTask.description || 'No detailed description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-surface-low p-3.5 rounded border border-outline-variant/40 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-0.5">Current Status</span>
                  <span className="font-extrabold text-primary">{selectedTask.status}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-0.5">Progress</span>
                  <span className="font-extrabold text-on-surface font-mono">{selectedTask.progressPercent || selectedTask.progress || 0}%</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-0.5">Assigned Date</span>
                  <span className="font-bold text-on-surface font-mono">
                    {formatTaskDate(selectedTask.assignedDate || selectedTask.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-0.5">Target Due Date</span>
                  <span className="font-bold text-primary font-mono">
                    {formatTaskDate(selectedTask.dueDate)}
                  </span>
                </div>
              </div>

              {selectedTask.department && (
                <div className="flex justify-between items-center text-xs px-1 text-outline">
                  <span>Assigned Department:</span>
                  <span className="font-bold text-on-surface">{selectedTask.department}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-outline-variant/40 pt-4 mt-1">
              <button
                onClick={() => setSelectedTask(null)}
                className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold py-2 px-4 rounded-sm shadow-sm cursor-pointer uppercase tracking-wider"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerTasks;
