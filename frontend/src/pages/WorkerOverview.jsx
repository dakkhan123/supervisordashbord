import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const WorkerOverview = ({ searchVal, showToast, user }) => {
  const userRole = user?.role || '';
  const canEditSalary = userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'supervisor';
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [editWorker, setEditWorker] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  // Forms
  const [workerForm, setWorkerForm] = useState({
    name: '',
    phone: '',
    role: 'Worker',
    salary: 15000,
    status: 'Active',
    dateOfJoining: new Date().toISOString().split('T')[0]
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    status: 'Pending'
  });

  const isInitialLoad = useRef(true);

  // Fetch all necessary data
  const fetchData = async () => {
    try {
      if (isInitialLoad.current) setLoading(true);
      setError(null);

      // Fetch workers list, performance leaderboard, tasks, and attendance
      const [workersRes, perfRes, tasksRes, attendanceRes] = await Promise.all([
        api.getWorkers(),
        api.getWorkerPerformance(),
        api.getTasks(),
        api.getAttendance()
      ]);

      if (workersRes.success) {
        setWorkers(workersRes.data);
        // Default select first worker if none selected
        if (workersRes.data.length > 0 && !selectedWorkerId) {
          setSelectedWorkerId(workersRes.data[0]._id);
        }
      } else {
        setError(workersRes.error || 'Failed to fetch workers directory');
      }

      if (perfRes.success) {
        setPerformanceData(perfRes.data);
      }

      if (tasksRes.success) {
        setTasks(tasksRes.data);
      }

      if (attendanceRes.success) {
        setAttendance(attendanceRes.data);
      }

    } catch (err) {
      console.error(err);
      setError('Connection refused. Ensure the backend Express server is running.');
      showToast('Error loading staff details', 'error');
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditWorker(null);
    setWorkerForm({
      name: '',
      username: '',
      password: '',
      phone: '',
      role: 'Worker',
      salary: 15000,
      status: 'Active',
      dateOfJoining: new Date().toISOString().split('T')[0]
    });
    setWorkerModalOpen(true);
  };

  const handleOpenEditModal = (worker) => {
    setEditWorker(worker);
    setWorkerForm({
      name: worker.name || '',
      username: worker.user?.username || (worker.name ? worker.name.toLowerCase().replace(/\s+/g, '') : ''),
      password: '',
      phone: worker.phone || '',
      role: worker.role || 'Worker',
      salary: worker.salary || 15000,
      status: worker.status || 'Active',
      dateOfJoining: worker.dateOfJoining ? new Date(worker.dateOfJoining).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setWorkerModalOpen(true);
  };


  const handleWorkerSubmit = async (e) => {
    e.preventDefault();
    if (!workerForm.name.trim()) return showToast('Name is required', 'error');
    if (canEditSalary && workerForm.salary < 0) return showToast('Salary cannot be negative', 'error');

    try {
      let res;
      const formPayload = { ...workerForm };
      if (!canEditSalary) {
        delete formPayload.salary;
      }
      if (editWorker) {
        res = await api.updateWorker(editWorker._id, formPayload);
      } else {
        res = await api.createWorker(formPayload);
      }

      if (res.success) {
        showToast(editWorker ? 'Worker profile updated successfully' : 'New worker profile registered', 'success');
        setWorkerModalOpen(false);
        fetchData();
      } else {
        showToast(res.error || 'Operation failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save worker profile', 'error');
    }
  };

  const handleToggleStatus = async (worker) => {
    const newStatus = worker.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await api.updateWorker(worker._id, { ...worker, status: newStatus });
      if (res.success) {
        showToast(`Worker status updated to ${newStatus}`, 'success');
        fetchData();
      } else {
        showToast(res.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to server', 'error');
    }
  };

  const handleResetPassword = async (worker) => {
    const newPass = window.prompt(`Enter new password for ${worker.name}:`, 'Worker@123');
    if (!newPass) return;
    try {
      const res = await api.resetWorkerPassword(worker._id, newPass);
      if (res.success) {
        showToast(`Password for ${worker.name} reset successfully`, 'success');
      } else {
        showToast(res.error || 'Failed to reset password', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error resetting password', 'error');
    }
  };

  const handleOpenDeleteConfirm = (worker) => {
    setWorkerToDelete(worker);
    setDeleteConfirmOpen(true);
  };


  const handleDeleteWorker = async () => {
    if (!workerToDelete) return;
    try {
      const res = await api.deleteWorker(workerToDelete._id);
      if (res.success) {
        showToast('Worker profile removed from registry', 'success');
        setDeleteConfirmOpen(false);
        // Clear selected if deleted
        if (selectedWorkerId === workerToDelete._id) {
          setSelectedWorkerId(null);
        }
        setWorkerToDelete(null);
        fetchData();
      } else {
        showToast(res.error || 'Failed to delete worker', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to server', 'error');
    }
  };

  const handleOpenAddTaskModal = () => {
    setTaskForm({
      title: '',
      description: '',
      dueDate: '',
      status: 'Pending'
    });
    setTaskModalOpen(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return showToast('Task Title is required', 'error');
    
    try {
      const res = await api.createTask({
        ...taskForm,
        assignedTo: selectedWorkerId
      });
      if (res.success) {
        showToast('New task assigned successfully', 'success');
        setTaskModalOpen(false);
        fetchData();
      } else {
        showToast(res.error || 'Failed to create task', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to allocate task', 'error');
    }
  };

  // Helper formatting functions
  const fmt = (n) => (n ?? 0).toLocaleString('en-IN');
  const formatSalary = (s) => `₹${fmt(s)}`;
  
  const getStatusBadge = (status) => {
    return status === 'Active' 
      ? 'bg-primary/10 text-primary border border-primary/20' 
      : 'bg-outline/10 text-outline border border-outline/20';
  };

  const getGradeBadge = (g) => {
    if (g === 'A+' || g === 'A') return 'bg-primary/10 text-primary border border-primary/20';
    if (g === 'B+' || g === 'B') return 'bg-tertiary/10 text-tertiary border border-tertiary/20';
    if (g === 'C') return 'bg-secondary/10 text-secondary border border-secondary/20';
    return 'bg-error/10 text-error border border-error/20';
  };

  const getTaskStatusBadge = (status) => {
    switch (status) {
      case 'Completed': return 'bg-primary/10 text-primary border border-primary/20';
      case 'In Progress': return 'bg-tertiary/10 text-tertiary border border-tertiary/20';
      default: return 'bg-secondary/10 text-secondary border border-secondary/20';
    }
  };

  const isTaskOverdue = (task) => {
    if (task.status === 'Completed' || !task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Filter & Search matching workers
  const filteredWorkers = workers.filter(w => {
    const matchesSearch = !searchVal || w.name.toLowerCase().includes(searchVal.toLowerCase());
    const matchesRole = roleFilter === 'All' || w.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || w.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate Selected Worker data
  const selectedWorker = workers.find(w => w._id === selectedWorkerId);
  const selectedWorkerPerf = performanceData.find(p => p._id === selectedWorkerId);
  const selectedWorkerTasks = tasks.filter(t => t.assignedTo?._id === selectedWorkerId || t.assignedTo === selectedWorkerId);
  const selectedWorkerAttendance = attendance.filter(a => a.worker?._id === selectedWorkerId || a.worker === selectedWorkerId);

  // Derived metrics for selected worker
  const totalTasks = selectedWorkerTasks.length;
  const completedTasks = selectedWorkerTasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = selectedWorkerTasks.filter(t => t.status === 'In Progress').length;
  const pendingTasks = selectedWorkerTasks.filter(t => t.status === 'Pending').length;
  const overdueTasksCount = selectedWorkerTasks.filter(isTaskOverdue).length;

  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Attendance stats for selected worker
  const workerPresentDays = selectedWorkerAttendance.filter(a => a.status === 'Present').length;
  const workerAbsentDays = selectedWorkerAttendance.filter(a => a.status === 'Absent').length;
  const workerLeaveDays = selectedWorkerAttendance.filter(a => a.status === 'Leave').length;
  const totalAttendanceRecords = workerPresentDays + workerAbsentDays + workerLeaveDays;
  const workerAttendanceRate = totalAttendanceRecords > 0 ? Math.round((workerPresentDays / totalAttendanceRecords) * 100) : 0;

  // Productivity Score and Grade (calculate locally if inactive or missing from leaderboard)
  const perfScore = selectedWorkerPerf?.performanceScore ?? (() => {
    // 40% completion rate + 30% attendance + 20% no-overdue + 10% volume
    const overdueScore = totalTasks > 0 ? Math.max(0, 100 - (overdueTasksCount / totalTasks) * 100) : 100;
    const volumeScore = Math.min(100, totalTasks * 10);
    return Math.round(
      taskCompletionRate * 0.4 +
      workerAttendanceRate * 0.3 +
      overdueScore * 0.2 +
      volumeScore * 0.1
    );
  })();

  const getGrade = (score) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  };

  const grade = selectedWorkerPerf?.grade ?? getGrade(perfScore);

  const getGradeStatement = (g) => {
    if (g === 'A+' || g === 'A') return 'Exemplary Workload Delivery';
    if (g === 'B+' || g === 'B') return 'Strong Operating Efficiency';
    if (g === 'C') return 'Average Operational Output';
    return 'Requires Attention and Supervision';
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in min-h-[calc(100vh-100px)]">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Staff Overview & Profile</h1>
          <p className="text-on-surface-variant text-sm">Supervise individual worker performance, attendances, and task histories · Unit Pune-A12</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="btn btn-primary bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-sm hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-sm uppercase tracking-wider cursor-pointer"
        >
          <span className="material-symbols-outlined icon-xs text-white">person_add</span>Register New Staff
        </button>
      </div>

      {loading ? (
        <div className="p-20 text-center flex flex-col items-center justify-center gap-3 bg-surface-lowest border border-outline-variant rounded-md shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-xs text-outline font-bold uppercase tracking-wider">Loading staff database...</p>
        </div>
      ) : error ? (
        <div className="p-16 text-center flex flex-col items-center justify-center gap-4 bg-surface-lowest border border-outline-variant rounded-md shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-error">error</span>
          <p className="text-sm font-bold text-on-surface">Failed to load Staff Registry</p>
          <p className="text-xs text-outline">{error}</p>
          <button onClick={fetchData} className="btn bg-primary text-white text-xs px-4 py-2 rounded-sm hover:bg-primary-container">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
          
          {/* LEFT COLUMN: Searchable Worker Directory List */}
          <div className="lg:col-span-1 flex flex-col gap-4 w-full min-w-0">
            <div className="bg-surface-lowest border border-outline-variant rounded-md p-4 shadow-sm flex flex-col gap-3">
              <h3 className="text-xs font-extrabold text-outline uppercase tracking-wider">Staff Directory</h3>
              
              {/* Dropdown Filters */}
              <div className="flex gap-3 w-full mt-1">
                <div className="flex-1 min-w-0">
                  <label className="text-[9px] font-bold text-outline uppercase">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 bg-surface-low border border-outline-variant rounded-sm text-[11px] text-on-surface font-semibold outline-none"
                  >
                    <option value="All">All Roles</option>
                    <option value="Worker">Worker</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[9px] font-bold text-outline uppercase">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 bg-surface-low border border-outline-variant rounded-sm text-[11px] text-on-surface font-semibold outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Workers scrollable list */}
            <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm max-h-[600px] overflow-y-auto flex flex-col">
              {filteredWorkers.map(w => {
                const isSelected = w._id === selectedWorkerId;
                const perf = performanceData.find(p => p._id === w._id);
                return (
                  <div
                    key={w._id}
                    onClick={() => setSelectedWorkerId(w._id)}
                    className={`flex items-center justify-between p-3.5 border-b border-outline-variant/30 last:border-b-0 cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-primary/10 border-l-4 border-l-primary' 
                        : 'hover:bg-surface-low'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        w.status === 'Active' 
                          ? 'bg-primary/15 text-primary border border-primary/30' 
                          : 'bg-outline/10 text-outline border border-outline/20'
                      }`}>
                        {w.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-on-surface truncate">{w.name}</p>
                        <p className="text-[10px] text-outline mt-0.5 truncate">{w.role} · {w.status}</p>
                      </div>
                    </div>
                    {w.status === 'Active' && perf && (
                      <span className="text-[11px] font-extrabold px-2 py-0.5 bg-surface-low text-primary border border-outline-variant/50 rounded-md">
                        {perf.performanceScore}%
                      </span>
                    )}
                  </div>
                );
              })}
              {filteredWorkers.length === 0 && (
                <div className="p-10 text-center text-outline text-xs font-semibold">
                  No staff members found matching criteria.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Profile details, summary modules, and productivity metrics */}
          <div className="lg:col-span-2 flex flex-col gap-6 w-full min-w-0">
            {selectedWorker ? (
              <div className="flex flex-col gap-6 animate-fade-in">
                
                {/* Worker Profile Header Card */}
                <div className="bg-surface-lowest border border-outline-variant rounded-md p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
                    <div className="w-18 h-18 rounded-full bg-gradient-to-br from-primary-container to-tertiary-container text-white flex items-center justify-center font-extrabold text-2xl shadow-sm border border-primary/20">
                      {selectedWorker.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 justify-center md:justify-start">
                        <h2 className="text-xl font-extrabold text-on-surface">{selectedWorker.name}</h2>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${getStatusBadge(selectedWorker.status)}`}>
                          {selectedWorker.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-outline mt-1">{selectedWorker.role} · Unit Pune-A12</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-4 text-[12px] text-on-surface-variant font-medium">
                        <p className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-outline text-[16px]">call</span>
                          {selectedWorker.phone || 'No phone record'}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-outline text-[16px]">payments</span>
                          Base salary: <strong className="text-on-surface">{canEditSalary && selectedWorker.salary !== undefined ? formatSalary(selectedWorker.salary) : '••••••'}</strong>
                        </p>
                        <p className="flex items-center gap-1.5 sm:col-span-2 mt-1">
                          <span className="material-symbols-outlined text-outline text-[16px]">calendar_today</span>
                          Joined: <strong className="text-on-surface">{formatDate(selectedWorker.dateOfJoining)}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Panel */}
                  <div className="flex flex-wrap gap-2 items-center justify-center md:justify-end w-full md:w-auto">
                    <button
                      onClick={() => handleToggleStatus(selectedWorker)}
                      className={`btn px-3 py-1.5 text-[10px] font-bold uppercase rounded-sm border cursor-pointer transition-all flex items-center gap-1 ${
                        selectedWorker.status === 'Active' 
                          ? 'border-error/20 hover:bg-error/5 text-error' 
                          : 'border-primary/20 hover:bg-primary/5 text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {selectedWorker.status === 'Active' ? 'do_not_disturb_on' : 'check_circle'}
                      </span>
                      {selectedWorker.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleResetPassword(selectedWorker)}
                      className="btn border border-amber-500/30 hover:bg-amber-500/10 text-amber-700 text-[10px] font-bold px-3 py-1.5 rounded-sm transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">lock_reset</span>Reset Pass
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(selectedWorker)}
                      className="btn border border-outline-variant hover:bg-surface-low text-on-surface-variant text-[10px] font-bold px-3 py-1.5 rounded-sm transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>Edit Profile
                    </button>
                    <button
                      onClick={() => handleOpenDeleteConfirm(selectedWorker)}
                      className="btn border border-error/20 hover:bg-error/5 text-error text-[10px] font-bold px-3 py-1.5 rounded-sm transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>Delete Staff
                    </button>
                  </div>

                </div>

                {/* Performance and Attendance Summary Row */}
                <div className="flex flex-col md:flex-row gap-6 w-full">
                  
                  {/* Performance Summary Module */}
                  <div className="flex-1 min-w-0 bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Performance Summary</span>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${getGradeBadge(grade)}`}>
                        Grade {grade}
                      </span>
                    </div>

                    <div className="flex items-center gap-5 my-2">
                      <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 80 80" className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-container-high)" strokeWidth="6" />
                          <circle 
                            cx="40" 
                            cy="40" 
                            r="34" 
                            fill="none" 
                            stroke={perfScore >= 80 ? 'var(--primary)' : perfScore >= 60 ? 'var(--tertiary)' : 'var(--error)'} 
                            strokeWidth="6"
                            strokeDasharray={`${(perfScore / 100) * 213.6} 213.6`} 
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-lg font-extrabold text-on-surface">{perfScore}%</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-extrabold text-sm text-on-surface">{getGradeStatement(grade)}</h4>
                        <p className="text-[11px] text-outline mt-1">Weighted metric calculating task delivery success rates and active compliance records.</p>
                      </div>
                    </div>

                    <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${perfScore}%` }} />
                    </div>
                  </div>

                  {/* Attendance Summary Module */}
                  <div className="flex-1 min-w-0 bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Attendance Summary</span>
                      <span className="text-[11px] font-extrabold text-primary uppercase">{workerAttendanceRate}% Attendance Rate</span>
                    </div>

                    {/* Stacked counts */}
                    <div className="grid grid-cols-3 gap-2 text-center text-outline text-[11px] font-bold py-2 bg-surface-low border border-outline-variant/30 rounded-sm">
                      <div className="border-r border-outline-variant/30">
                        <p className="text-primary font-extrabold text-sm">{workerPresentDays}</p>
                        <p className="text-[9px] uppercase tracking-wider mt-0.5 text-outline">Present</p>
                      </div>
                      <div className="border-r border-outline-variant/30">
                        <p className="text-error font-extrabold text-sm">{workerAbsentDays}</p>
                        <p className="text-[9px] uppercase tracking-wider mt-0.5 text-outline">Absent</p>
                      </div>
                      <div>
                        <p className="text-secondary font-extrabold text-sm">{workerLeaveDays}</p>
                        <p className="text-[9px] uppercase tracking-wider mt-0.5 text-outline">Leave</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex flex-col gap-1">
                      <div className="w-full bg-surface-low border border-outline-variant/30 h-2.5 rounded-full overflow-hidden flex">
                        {workerPresentDays > 0 && (
                          <div className="bg-primary h-full" style={{ width: `${(workerPresentDays / (totalAttendanceRecords || 1)) * 100}%` }} />
                        )}
                        {workerAbsentDays > 0 && (
                          <div className="bg-error h-full" style={{ width: `${(workerAbsentDays / (totalAttendanceRecords || 1)) * 100}%` }} />
                        )}
                        {workerLeaveDays > 0 && (
                          <div className="bg-secondary h-full" style={{ width: `${(workerLeaveDays / (totalAttendanceRecords || 1)) * 100}%` }} />
                        )}
                        {totalAttendanceRecords === 0 && (
                          <div className="w-full h-full bg-surface-variant/20" />
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Task Completion & Productivity Metrics Row */}
                <div className="flex flex-col md:flex-row gap-6 w-full">
                  
                  {/* Task Completion Summary Module */}
                  <div className="flex-1 min-w-0 bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Task Completion Summary</span>
                      <span className="text-[11px] font-extrabold text-primary uppercase">{taskCompletionRate}% Completed</span>
                    </div>

                    {/* Completion rate bar */}
                    <div className="w-full bg-surface-low border border-outline-variant/30 h-3 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${taskCompletionRate}%` }} />
                    </div>

                    {/* Workload breakdown */}
                    <div className="grid grid-cols-4 gap-1.5 text-center mt-1">
                      <div className="p-2 bg-surface-low rounded-sm">
                        <span className="block text-xs font-extrabold text-on-surface">{totalTasks}</span>
                        <span className="text-[8px] font-bold uppercase text-outline">Assigned</span>
                      </div>
                      <div className="p-2 bg-surface-low rounded-sm">
                        <span className="block text-xs font-extrabold text-primary">{completedTasks}</span>
                        <span className="text-[8px] font-bold uppercase text-outline">Completed</span>
                      </div>
                      <div className="p-2 bg-surface-low rounded-sm">
                        <span className="block text-xs font-extrabold text-tertiary">{inProgressTasks}</span>
                        <span className="text-[8px] font-bold uppercase text-outline">Underway</span>
                      </div>
                      <div className="p-2 bg-surface-low rounded-sm">
                        <span className="block text-xs font-extrabold text-error">{overdueTasksCount}</span>
                        <span className="text-[8px] font-bold uppercase text-outline">Overdue</span>
                      </div>
                    </div>
                  </div>

                  {/* Productivity Metrics Module */}
                  <div className="flex-1 min-w-0 bg-surface-lowest border border-outline-variant rounded-md p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Productivity Metrics</span>
                      <span className="text-[11px] font-bold text-outline font-mono">Real-Time Data</span>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-on-surface-variant font-medium">Overdue Rate</span>
                        <span className={`font-bold ${overdueTasksCount > 0 ? 'text-error' : 'text-primary'}`}>
                          {totalTasks > 0 ? Math.round((overdueTasksCount / totalTasks) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-on-surface-variant font-medium">Weekly Logged Shifts</span>
                        <span className="font-bold text-on-surface">
                          {selectedWorkerAttendance.filter(a => {
                            const date = new Date(a.date);
                            const now = new Date();
                            const diff = now - date;
                            return diff <= 7 * 24 * 60 * 60 * 1000;
                          }).length} Shifts
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-on-surface-variant font-medium">Pending Workload Volume</span>
                        <span className="font-bold text-secondary">{pendingTasks + inProgressTasks} Tasks</span>
                      </div>
                    </div>

                    <div className="bg-surface-low border border-outline-variant/30 rounded-sm p-3 flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-outline font-semibold">Active tasks on registry:</span>
                      <strong className="text-primary font-extrabold">{totalTasks - completedTasks} outstanding</strong>
                    </div>
                  </div>

                </div>

                {/* Assigned Tasks Section */}
                <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Active Task Registry</h3>
                    <button
                      onClick={handleOpenAddTaskModal}
                      className="btn border border-primary/20 hover:bg-primary/5 text-primary text-[10px] font-bold px-3 py-1.5 rounded-sm uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">add_task</span>Assign Task
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface-low border-b border-outline-variant">
                          <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Task Guidelines</th>
                          <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Due Date</th>
                          <th className="p-3 text-[11px] font-bold text-outline uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedWorkerTasks.map(t => {
                          const overdue = isTaskOverdue(t);
                          return (
                            <tr key={t._id} className="border-b border-outline-variant/30 hover:bg-surface-low transition-colors">
                              <td className="p-3">
                                <p className="font-bold text-on-surface text-[12px]">{t.title}</p>
                                <p className="text-[10px] text-outline mt-0.5 truncate max-w-[400px]" title={t.description}>
                                  {t.description || 'No detailed guidelines.'}
                                </p>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium text-on-surface-variant">{formatDate(t.dueDate)}</span>
                                  {overdue && (
                                    <span className="text-error font-extrabold text-[8px] uppercase tracking-wider flex items-center gap-0.5">
                                      <span className="material-symbols-outlined text-[10px] icon-filled">warning</span> Overdue
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${getTaskStatusBadge(t.status)}`}>
                                  {t.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {selectedWorkerTasks.length === 0 && (
                          <tr>
                            <td colSpan="3" className="p-8 text-center text-outline text-xs font-semibold">
                              No tasks assigned to this worker.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Attendance Registry Logs */}
                <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-outline-variant">
                    <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Recent Attendance Registry</h3>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {selectedWorkerAttendance.length > 0 ? (
                      <div className="flex flex-col">
                        {selectedWorkerAttendance.slice(0, 10).map(a => (
                          <div key={a._id} className="flex items-center justify-between p-3.5 border-b border-outline-variant/20 hover:bg-surface-low">
                            <span className="font-bold text-xs text-on-surface">{formatDate(a.date)}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              a.status === 'Present' ? 'bg-primary/10 text-primary border border-primary/20' :
                              a.status === 'Absent' ? 'bg-error/10 text-error border border-error/20' :
                              'bg-secondary/10 text-secondary border border-secondary/20'
                            }`}>
                              {a.status === 'Present' ? 'Checked In' : a.status === 'Absent' ? 'Checked Out / Absent' : a.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p-8 text-center text-outline text-xs font-semibold">No attendance shifts logged for this worker.</p>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm p-20 text-center flex flex-col items-center justify-center gap-4 min-h-[400px]">
                <div className="w-16 h-16 rounded-full bg-surface-low border border-outline-variant flex items-center justify-center text-outline">
                  <span className="material-symbols-outlined text-[36px]">engineering</span>
                </div>
                <h3 className="text-base font-bold text-on-surface">No Worker Selected</h3>
                <p className="text-xs text-outline max-w-[320px]">Select a staff member from the directory list on the left to verify profile information, track completion scores, and view task workloads.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Register/Edit Worker Modal */}
      {workerModalOpen && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[500] flex items-center justify-center p-6 transition-all duration-300">
          <div className="bg-surface-lowest rounded-lg shadow-xl w-full max-w-[460px] max-h-[90vh] overflow-y-auto animate-scale-up border border-outline-variant/50">
            <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface">
                {editWorker ? 'Edit Staff Profile' : 'Register New Staff'}
              </h2>
              <button 
                className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors cursor-pointer" 
                onClick={() => setWorkerModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleWorkerSubmit}>
              <div className="p-6 flex flex-col gap-4 text-left font-sans">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={workerForm.name}
                    onChange={(e) => setWorkerForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Ramesh Deshmukh"
                    className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Worker Login ID (Username)</label>
                    <input
                      type="text"
                      value={workerForm.username || ''}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="e.g. ram.patil"
                      className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">
                      {editWorker ? 'Set New Password (Optional)' : 'Worker Password'}
                    </label>
                    <input
                      type="password"
                      value={workerForm.password || ''}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder={editWorker ? 'Leave blank to keep current' : 'e.g. Worker@123'}
                      className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    value={workerForm.phone}
                    onChange={(e) => setWorkerForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  />
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">System Role</label>
                    <select
                      value={workerForm.role}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                    >
                      <option value="Worker">Worker</option>
                      <option value="Supervisor">Supervisor</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Base Salary (INR/Month)</label>
                    <input
                      type={canEditSalary ? "number" : "text"}
                      value={canEditSalary ? (workerForm.salary ?? '') : '••••••'}
                      onChange={(e) => canEditSalary && setWorkerForm(prev => ({ ...prev, salary: Number(e.target.value) }))}
                      min={canEditSalary ? "0" : undefined}
                      className={`w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium ${!canEditSalary ? 'opacity-60 cursor-not-allowed' : ''}`}
                      required
                      disabled={!canEditSalary}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Status</label>
                  <select
                    value={workerForm.status}
                    onChange={(e) => setWorkerForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Date of Joining</label>
                  <input
                    type="date"
                    value={workerForm.dateOfJoining}
                    onChange={(e) => setWorkerForm(prev => ({ ...prev, dateOfJoining: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-2.5">
                <button 
                  type="button" 
                  className="btn btn-ghost px-4 py-2 text-xs font-semibold rounded-sm border border-outline-variant hover:bg-surface-low transition-colors cursor-pointer" 
                  onClick={() => setWorkerModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary px-4 py-2 bg-primary text-white flex items-center gap-1.5 rounded-sm hover:bg-primary-container font-semibold text-xs transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined icon-xs text-white">save</span>Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && workerToDelete && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[500] flex items-center justify-center p-6 transition-all duration-300">
          <div className="bg-surface-lowest rounded-lg shadow-xl w-full max-w-[420px] animate-scale-up border border-outline-variant/50">
            <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between">
              <h2 className="text-lg font-bold text-error flex items-center gap-2">
                <span className="material-symbols-outlined text-error">warning</span>Confirm Deletion
              </h2>
              <button 
                className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors cursor-pointer" 
                onClick={() => setDeleteConfirmOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6">
              <p className="text-xs text-on-surface-variant leading-relaxed text-left">
                Are you sure you want to permanently delete the profile of <strong>{workerToDelete.name}</strong>? This will clean up their database record. This action is irreversible.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-2.5 font-sans">
              <button 
                type="button" 
                className="btn btn-ghost px-4 py-2 text-xs font-semibold rounded-sm border border-outline-variant hover:bg-surface-low transition-colors cursor-pointer" 
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-error px-4 py-2 bg-error text-white flex items-center gap-1.5 rounded-sm hover:bg-red-700 font-semibold text-xs transition-colors cursor-pointer"
                onClick={handleDeleteWorker}
              >
                <span className="material-symbols-outlined icon-xs text-white">delete</span>Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[500] flex items-center justify-center p-6 transition-all duration-300">
          <div className="bg-surface-lowest rounded-lg shadow-xl w-full max-w-[450px] max-h-[90vh] overflow-y-auto animate-scale-up border border-outline-variant/50">
            <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface">Assign Task to {selectedWorker.name}</h2>
              <button 
                className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors cursor-pointer" 
                onClick={() => setTaskModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleTaskSubmit}>
              <div className="p-6 flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Task Title</label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Replenish Rack B-10 inventory"
                    className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Guidelines & Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide details for this specific task allocation..."
                    rows="3"
                    className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Due Date</label>
                    <input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-surface-on-variant uppercase tracking-wider">Initial Status</label>
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
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
                  <span className="material-symbols-outlined icon-xs text-white">save</span>Allocate Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerOverview;
