import { useState, useEffect } from 'react';
import { api } from '../services/api';

const Tasks = ({ showToast }) => {
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [detailsTask, setDetailsTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    status: 'Pending'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksRes, workersRes] = await Promise.all([
        api.getTasks(),
        api.getWorkers()
      ]);

      if (tasksRes.success) {
        setTasks(tasksRes.data);
      } else {
        setError(tasksRes.error || 'Failed to fetch tasks list');
      }

      if (workersRes.success) {
        setWorkers(workersRes.data.filter(w => w.status === 'Active'));
      }
    } catch (err) {
      console.error(err);
      setError('Connection refused. Ensure Express server is connected.');
      showToast('Error loading tasks information', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Overdue Task Calculation Helper
  const isTaskOverdue = (task) => {
    if (task.status === 'Completed' || !task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Dashboard calculations
  const totalTasks = tasks.length;
  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const overdueCount = tasks.filter(t => isTaskOverdue(t)).length;

  const handleOpenAddModal = () => {
    setEditTask(null);
    setFormData({
      title: '',
      description: '',
      assignedTo: workers.length > 0 ? workers[0]._id : '',
      dueDate: '',
      status: 'Pending'
    });
    setTaskModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditTask(task);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      assignedTo: task.assignedTo?._id || task.assignedTo || (workers.length > 0 ? workers[0]._id : ''),
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      status: task.status || 'Pending'
    });
    setTaskModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return showToast('Task Title is required', 'error');
    if (!formData.assignedTo) return showToast('Please assign this task to a worker', 'error');

    if (formData.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(formData.dueDate);
      selected.setHours(0, 0, 0, 0);
      if (selected < today && formData.status !== 'Completed') {
        if (!window.confirm('The selected due date is in the past. Allocate this as an overdue task?')) {
          return;
        }
      }
    }

    try {
      let res;
      if (editTask) {
        res = await api.updateTask(editTask._id, formData);
      } else {
        res = await api.createTask(formData);
      }

      if (res.success) {
        showToast(editTask ? 'Task updated successfully' : 'New task allocated successfully', 'success');
        setTaskModalOpen(false);
        fetchData();
        // If updating active details modal, refresh it
        if (detailsTask && detailsTask._id === editTask?._id) {
          setDetailsTask({ ...detailsTask, ...formData, assignedTo: workers.find(w => w._id === formData.assignedTo) });
        }
      } else {
        showToast(res.error || 'Operation failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save task', 'error');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await api.deleteTask(id);
      if (res.success) {
        showToast('Task removed from registry', 'success');
        fetchData();
      } else {
        showToast(res.error || 'Failed to delete task', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to server', 'error');
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const res = await api.updateTask(task._id, { ...task, status: newStatus });
      if (res.success) {
        showToast(`Task status updated to ${newStatus}`, 'success');
        fetchData();
        if (detailsTask && detailsTask._id === task._id) {
          setDetailsTask(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    }
  };

  const handleTileClick = (filterName) => {
    if (statusFilter === filterName) {
      setStatusFilter('All');
    } else {
      setStatusFilter(filterName);
    }
  };

  // Filtering
  const filteredTasks = tasks.filter(t => {
    let matchStatus = true;
    if (statusFilter === 'Overdue') {
      matchStatus = isTaskOverdue(t);
    } else if (statusFilter !== 'All') {
      matchStatus = t.status === statusFilter;
    }
    
    const matchQuery = !searchQuery || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assignedTo?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchQuery;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed': return 'bg-primary/10 text-primary border border-primary/20';
      case 'In Progress': return 'bg-tertiary/10 text-tertiary border border-tertiary/20';
      default: return 'bg-secondary/10 text-secondary border border-secondary/20';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Task Allocation</h1>
          <p className="text-on-surface-variant text-sm">Assign and supervise staff tasks in real-time · Unit Pune-A12</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="btn btn-primary bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-sm hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-sm uppercase tracking-wider cursor-pointer"
        >
          <span className="material-symbols-outlined icon-xs text-white">add</span>Assign New Task
        </button>
      </div>

      {/* Interactive KPI Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Tasks */}
        <div 
          onClick={() => handleTileClick('All')}
          className={`bg-surface-lowest border p-4 rounded-md shadow-sm flex flex-col justify-between min-h-[105px] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-98 ${statusFilter === 'All' ? 'border-primary ring-2 ring-primary/10' : 'border-outline-variant'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Total Allocated</span>
            <div className="w-8 h-8 rounded-lg bg-surface-variant/40 flex items-center justify-center text-outline">
              <span className="material-symbols-outlined icon-sm">assignment</span>
            </div>
          </div>
          <div className="text-[24px] font-extrabold text-on-surface leading-none">{totalTasks}</div>
          <span className="text-[10px] text-outline mt-1 font-semibold">Active workload</span>
        </div>

        {/* Pending Tasks */}
        <div 
          onClick={() => handleTileClick('Pending')}
          className={`bg-surface-lowest border p-4 rounded-md shadow-sm flex flex-col justify-between min-h-[105px] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-98 ${statusFilter === 'Pending' ? 'border-secondary ring-2 ring-secondary/10' : 'border-outline-variant'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Pending</span>
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined icon-sm">schedule</span>
            </div>
          </div>
          <div className="text-[24px] font-extrabold text-on-surface leading-none">{pendingCount}</div>
          <span className="text-[10px] text-secondary font-bold uppercase">To Be Started</span>
        </div>

        {/* In Progress Tasks */}
        <div 
          onClick={() => handleTileClick('In Progress')}
          className={`bg-surface-lowest border p-4 rounded-md shadow-sm flex flex-col justify-between min-h-[105px] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-98 ${statusFilter === 'In Progress' ? 'border-tertiary ring-2 ring-tertiary/10' : 'border-outline-variant'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">In Progress</span>
            <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined icon-sm">trending_flat</span>
            </div>
          </div>
          <div className="text-[24px] font-extrabold text-on-surface leading-none">{inProgressCount}</div>
          <span className="text-[10px] text-tertiary font-bold uppercase">Underway</span>
        </div>

        {/* Completed Tasks */}
        <div 
          onClick={() => handleTileClick('Completed')}
          className={`bg-surface-lowest border p-4 rounded-md shadow-sm flex flex-col justify-between min-h-[105px] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-98 ${statusFilter === 'Completed' ? 'border-primary ring-2 ring-primary/10' : 'border-outline-variant'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined icon-sm">check_circle</span>
            </div>
          </div>
          <div className="text-[24px] font-extrabold text-on-surface leading-none">{completedCount}</div>
          <span className="text-[10px] text-primary font-bold uppercase">Success registry</span>
        </div>

        {/* Overdue Tasks */}
        <div 
          onClick={() => handleTileClick('Overdue')}
          className={`bg-surface-lowest border p-4 rounded-md shadow-sm flex flex-col justify-between min-h-[105px] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-98 ${statusFilter === 'Overdue' ? 'border-error ring-2 ring-error/10' : 'border-outline-variant'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Overdue Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center text-error">
              <span className="material-symbols-outlined icon-sm">warning</span>
            </div>
          </div>
          <div className="text-[24px] font-extrabold text-error leading-none">{overdueCount}</div>
          <span className="text-[10px] text-error font-bold uppercase flex items-center gap-0.5">Needs action</span>
        </div>
      </div>

      {/* Filters & Actions Panel */}
      <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:max-w-[320px]">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            type="text"
            placeholder="Search tasks or staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['All', 'Pending', 'In Progress', 'Completed', 'Overdue'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 border border-outline-variant text-[11px] font-bold rounded-full uppercase transition-all whitespace-nowrap cursor-pointer ${statusFilter === f ? 'bg-primary/10 text-primary border-primary' : 'bg-surface-lowest text-on-surface-variant hover:border-primary'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-xs text-outline font-bold uppercase tracking-wider">Loading tasks registry...</p>
          </div>
        ) : error ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-4">
            <span className="material-symbols-outlined text-[48px] text-error">error</span>
            <p className="text-sm font-bold text-on-surface">Failed to load Tasks</p>
            <p className="text-xs text-outline">{error}</p>
            <button onClick={fetchData} className="btn bg-primary text-white text-xs px-4 py-2 rounded-sm hover:bg-primary-container">Retry</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-low border-b border-outline-variant">
                  <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Task Details</th>
                  <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Assigned Staff</th>
                  <th className="p-3.5 text-[11px] font-bold text-outline uppercase tracking-wider">Due Date</th>
                  <th className="p-3.5 text-[11px] font-bold text-outline tracking-wider uppercase">Status</th>
                  <th className="p-3.5 text-[11px] font-bold text-outline tracking-wider uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(t => {
                  const overdue = isTaskOverdue(t);
                  return (
                    <tr key={t._id} className="border-b border-outline-variant/30 hover:bg-surface-low transition-colors duration-150">
                      <td className="p-3.5">
                        <button
                          onClick={() => setDetailsTask(t)}
                          className="font-bold text-on-surface hover:text-primary hover:underline text-[13px] text-left cursor-pointer focus:outline-none block"
                        >
                          {t.title}
                        </button>
                        <p className="text-outline text-[11px] mt-0.5 max-w-[340px] truncate" title={t.description}>{t.description || 'No description provided.'}</p>
                      </td>
                      <td className="p-3.5 font-semibold text-on-surface-variant">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-outline text-[18px]">account_circle</span>
                          {t.assignedTo?.name || 'Unassigned'}
                        </div>
                      </td>
                      <td className="p-3.5 font-medium text-outline">
                        <div className="flex flex-col gap-0.5">
                          <span>{formatDate(t.dueDate)}</span>
                          {overdue && (
                            <span className="text-error font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[10px] icon-filled">warning</span> Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${getStatusBadgeClass(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {t.status !== 'Completed' && (
                            <button
                              onClick={() => handleStatusChange(t, t.status === 'Pending' ? 'In Progress' : 'Completed')}
                              className="btn border border-primary/20 hover:bg-primary/5 text-primary font-bold px-2.5 py-1 text-[10px] uppercase rounded-sm cursor-pointer"
                            >
                              {t.status === 'Pending' ? 'Start' : 'Complete'}
                            </button>
                          )}
                          <button
                            onClick={() => setDetailsTask(t)}
                            className="w-7 h-7 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="w-7 h-7 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                            title="Edit Task"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTask(t._id)}
                            className="w-7 h-7 rounded hover:bg-surface-container flex items-center justify-center text-error transition-colors cursor-pointer"
                            title="Delete Task"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-16 text-center text-outline font-semibold">
                      No active task allocations match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Details & Progress Tracking Modal Overlay */}
      {detailsTask && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[500] flex items-center justify-center p-6 transition-all duration-300">
          <div className="bg-surface-lowest rounded-lg shadow-xl w-full max-w-[500px] max-h-[90vh] overflow-y-auto animate-scale-up border border-outline-variant/50">
            <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-outline uppercase tracking-wider">Task Profile & Timeline</span>
                <h2 className="text-lg font-bold text-on-surface mt-0.5">Detailed Tracking</h2>
              </div>
              <button 
                className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors cursor-pointer" 
                onClick={() => setDetailsTask(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 text-left">
              {/* Task Title & Description */}
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[16px] font-bold text-on-surface leading-snug">{detailsTask.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${getStatusBadgeClass(detailsTask.status)}`}>
                    {detailsTask.status}
                  </span>
                </div>
                <p className="text-on-surface-variant text-[12px] bg-surface-low p-3.5 border border-outline-variant/30 rounded-sm leading-relaxed mt-1 whitespace-pre-wrap">
                  {detailsTask.description || 'No detailed task guidelines provided.'}
                </p>
                <div className="flex items-center gap-4 text-xs font-semibold text-outline mt-1">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    <span>Due: {formatDate(detailsTask.dueDate)}</span>
                  </div>
                  {isTaskOverdue(detailsTask) && (
                    <span className="text-error font-extrabold uppercase text-[10px] tracking-wider flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px] icon-filled">warning</span> Overdue
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Tracking Timeline */}
              <div className="flex flex-col gap-3">
                <h4 className="text-[11px] font-bold text-outline uppercase tracking-wider">Progress Timeline</h4>
                <div className="bg-surface-low border border-outline-variant/30 rounded-md p-5 mt-1">
                  <div className="flex items-center justify-between relative px-2.5">
                    {/* Visual Progress Bar Connection Line */}
                    <div className="absolute left-[30px] right-[30px] top-[18px] h-[3px] bg-outline-variant -z-10 rounded-full">
                      <div 
                        className="h-full bg-primary transition-all duration-300 rounded-full"
                        style={{ 
                          width: detailsTask.status === 'Completed' ? '100%' : detailsTask.status === 'In Progress' ? '50%' : '0%' 
                        }}
                      />
                    </div>

                    {/* Step 1: Allocated */}
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">assignment</span>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface">Allocated</span>
                    </div>

                    {/* Step 2: Started */}
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 ${
                        detailsTask.status === 'In Progress' || detailsTask.status === 'Completed'
                          ? 'bg-tertiary text-white'
                          : 'bg-surface-container text-outline border border-outline-variant'
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface">Started</span>
                    </div>

                    {/* Step 3: Finished */}
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 ${
                        detailsTask.status === 'Completed'
                          ? 'bg-primary text-white font-semibold'
                          : 'bg-surface-container text-outline border border-outline-variant'
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface">Finished</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Worker Assignment contact card */}
              <div className="flex flex-col gap-2">
                <h4 className="text-[11px] font-bold text-outline uppercase tracking-wider">Assigned Staff</h4>
                <div className="bg-surface-low border border-outline-variant/40 rounded-md p-3.5 flex items-center justify-between mt-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <span className="material-symbols-outlined">badge</span>
                    </div>
                    <div>
                      <p className="font-bold text-xs text-on-surface">{detailsTask.assignedTo?.name || 'Unassigned Worker'}</p>
                      <p className="text-[11px] text-outline mt-0.5">
                        {detailsTask.assignedTo?.role || 'Staff Member'} · {detailsTask.assignedTo?.phone || 'No phone record'}
                      </p>
                    </div>
                  </div>
                  {detailsTask.assignedTo?.phone && (
                    <a 
                      href={`tel:${detailsTask.assignedTo.phone}`}
                      className="w-8 h-8 rounded-full border border-outline-variant hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
                      title="Contact worker"
                    >
                      <span className="material-symbols-outlined text-[16px]">call</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="border-t border-outline-variant pt-4 flex items-center justify-between gap-3 mt-4">
                <div>
                  {detailsTask.status !== 'Completed' && (
                    <button
                      onClick={() => handleStatusChange(detailsTask, detailsTask.status === 'Pending' ? 'In Progress' : 'Completed')}
                      className="btn btn-primary bg-primary text-white text-[11px] font-bold px-4 py-2 rounded-sm hover:bg-primary-container transition-all flex items-center gap-1.5 uppercase tracking-wider cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-white">
                        {detailsTask.status === 'Pending' ? 'play_arrow' : 'check'}
                      </span>
                      {detailsTask.status === 'Pending' ? 'Start Task' : 'Complete Task'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDetailsTask(null);
                      handleOpenEditModal(detailsTask);
                    }}
                    className="btn border border-outline-variant hover:bg-surface-low text-on-surface-variant text-[11px] font-bold px-3 py-2 rounded-sm transition-all cursor-pointer"
                  >
                    Edit Details
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteTask(detailsTask._id);
                      setDetailsTask(null);
                    }}
                    className="btn border border-error/20 hover:bg-error/5 text-error text-[11px] font-bold px-3 py-2 rounded-sm transition-all cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal overlay (Add / Edit allocation) */}
      {taskModalOpen && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[500] flex items-center justify-center p-6 transition-all duration-300">
          <div className="bg-surface-lowest rounded-lg shadow-xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface">
                {editTask ? 'Edit Task Allocation' : 'Assign New Task'}
              </h2>
              <button 
                className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors cursor-pointer" 
                onClick={() => setTaskModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="p-6 flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Task Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Assemble PCB batch #2045"
                    className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed task guidelines..."
                    rows="2.5"
                    className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Assign To Worker</label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                      className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                      required
                    >
                      <option value="" disabled>Select Staff</option>
                      {workers.map(w => (
                        <option key={w._id} value={w._id}>{w.name} ({w.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Due Date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Task Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-2.5">
                <button 
                  type="button" 
                  className="btn btn-ghost px-4 py-2 text-xs font-semibold rounded-sm border border-outline-variant hover:bg-surface-low transition-colors cursor-pointer" 
                  onClick={() => setTaskModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary px-4 py-2 bg-primary text-white flex items-center gap-1.5 rounded-sm hover:bg-primary-container font-semibold text-xs transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined icon-xs text-white">save</span>Save Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
