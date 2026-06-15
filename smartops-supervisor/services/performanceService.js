const Task = require('../models/Task');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const Inventory = require('../models/Inventory');
const StockTransaction = require('../models/StockTransaction');

class PerformanceService {
  /**
   * Get overall KPI summary for the dashboard header tiles
   */
  async getKPISummary(from, to) {
    const dateFilter = this._buildDateFilter(from, to);

    const [workers, tasks, attendance, inventory] = await Promise.all([
      Worker.find({ status: 'Active' }),
      Task.find(dateFilter.createdAt ? { createdAt: dateFilter } : {}),
      Attendance.find(dateFilter.date ? { date: dateFilter } : {}),
      Inventory.find()
    ]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalAttendance = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'Present').length;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    // Calculate overdue tasks (past due date + not completed)
    const now = new Date();
    const overdueTasks = tasks.filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < now).length;

    // Average task completion time (for completed tasks with both createdAt and updatedAt)
    let avgCompletionDays = 0;
    const completedWithDates = tasks.filter(t => t.status === 'Completed' && t.createdAt && t.updatedAt);
    if (completedWithDates.length > 0) {
      const totalMs = completedWithDates.reduce((sum, t) => {
        return sum + (new Date(t.updatedAt) - new Date(t.createdAt));
      }, 0);
      avgCompletionDays = Math.round((totalMs / completedWithDates.length) / (1000 * 60 * 60 * 24) * 10) / 10;
    }

    return {
      totalWorkers: workers.length,
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      overdueTasks,
      completionRate,
      attendanceRate,
      avgCompletionDays,
      totalInventoryItems: inventory.length
    };
  }

  /**
   * Get per-worker performance breakdown
   */
  async getWorkerPerformance(from, to) {
    const dateFilter = this._buildDateFilter(from, to);

    const [workers, tasks, attendance] = await Promise.all([
      Worker.find({ status: 'Active' }),
      Task.find(dateFilter.createdAt ? { createdAt: dateFilter } : {}).populate('assignedTo'),
      Attendance.find(dateFilter.date ? { date: dateFilter } : {}).populate('worker')
    ]);

    const workerStats = workers.map(worker => {
      const workerTasks = tasks.filter(t => 
        t.assignedTo && t.assignedTo._id.toString() === worker._id.toString()
      );
      const completed = workerTasks.filter(t => t.status === 'Completed').length;
      const inProgress = workerTasks.filter(t => t.status === 'In Progress').length;
      const pending = workerTasks.filter(t => t.status === 'Pending').length;
      const total = workerTasks.length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Overdue tasks
      const now = new Date();
      const overdue = workerTasks.filter(t => 
        t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < now
      ).length;

      // Attendance for this worker
      const workerAttendance = attendance.filter(a => 
        a.worker && a.worker._id.toString() === worker._id.toString()
      );
      const presentDays = workerAttendance.filter(a => a.status === 'Present').length;
      const absentDays = workerAttendance.filter(a => a.status === 'Absent').length;
      const leaveDays = workerAttendance.filter(a => a.status === 'Leave').length;
      const attendanceRate = workerAttendance.length > 0 
        ? Math.round((presentDays / workerAttendance.length) * 100) 
        : 0;

      // Performance score: weighted formula
      // 40% completion rate + 30% attendance + 20% no-overdue + 10% task volume
      const overdueScore = total > 0 ? Math.max(0, 100 - (overdue / total) * 100) : 100;
      const volumeScore = Math.min(100, total * 10); // cap at 10+ tasks = 100
      const performanceScore = Math.round(
        completionRate * 0.4 + 
        attendanceRate * 0.3 + 
        overdueScore * 0.2 + 
        volumeScore * 0.1
      );

      // Grade
      let grade = 'F';
      if (performanceScore >= 90) grade = 'A+';
      else if (performanceScore >= 80) grade = 'A';
      else if (performanceScore >= 70) grade = 'B+';
      else if (performanceScore >= 60) grade = 'B';
      else if (performanceScore >= 50) grade = 'C';
      else if (performanceScore >= 40) grade = 'D';

      return {
        _id: worker._id,
        name: worker.name,
        role: worker.role,
        phone: worker.phone,
        totalTasks: total,
        completed,
        inProgress,
        pending,
        overdue,
        completionRate,
        presentDays,
        absentDays,
        leaveDays,
        attendanceRate,
        performanceScore,
        grade
      };
    });

    return workerStats.sort((a, b) => b.performanceScore - a.performanceScore);
  }

  /**
   * Get task completion trend (daily/weekly/monthly aggregation)
   */
  async getTaskTrend(from, to, granularity = 'daily') {
    const dateFilter = this._buildDateFilter(from, to);
    const tasks = await Task.find(dateFilter.createdAt ? { createdAt: dateFilter } : {});

    // Group by time bucket
    const buckets = {};
    tasks.forEach(task => {
      const date = new Date(task.createdAt);
      let key;
      if (granularity === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (granularity === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = date.toISOString().split('T')[0];
      }

      if (!buckets[key]) {
        buckets[key] = { date: key, total: 0, completed: 0, inProgress: 0, pending: 0 };
      }
      buckets[key].total++;
      if (task.status === 'Completed') buckets[key].completed++;
      else if (task.status === 'In Progress') buckets[key].inProgress++;
      else buckets[key].pending++;
    });

    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get attendance heatmap data — days × workers grid
   */
  async getAttendanceHeatmap(from, to) {
    const dateFilter = this._buildDateFilter(from, to);

    const [workers, attendance] = await Promise.all([
      Worker.find({ status: 'Active' }).sort({ name: 1 }),
      Attendance.find(dateFilter.date ? { date: dateFilter } : {}).populate('worker')
    ]);

    // Build unique date list
    const dateSet = new Set();
    attendance.forEach(a => {
      const d = new Date(a.date);
      dateSet.add(d.toISOString().split('T')[0]);
    });
    const dates = [...dateSet].sort();

    // Build heatmap grid
    const heatmap = workers.map(worker => {
      const row = {
        workerId: worker._id,
        workerName: worker.name,
        days: {}
      };
      dates.forEach(date => {
        const record = attendance.find(a => 
          a.worker && 
          a.worker._id.toString() === worker._id.toString() && 
          new Date(a.date).toISOString().split('T')[0] === date
        );
        row.days[date] = record ? record.status : 'No Record';
      });
      return row;
    });

    return { dates, workers: heatmap };
  }

  /**
   * Get task status distribution for pie/donut chart
   */
  async getTaskDistribution(from, to) {
    const dateFilter = this._buildDateFilter(from, to);
    const tasks = await Task.find(dateFilter.createdAt ? { createdAt: dateFilter } : {});

    const completed = tasks.filter(t => t.status === 'Completed').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const now = new Date();
    const overdue = tasks.filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < now).length;

    return [
      { label: 'Completed', value: completed, color: '#006a6a' },
      { label: 'In Progress', value: inProgress, color: '#00687a' },
      { label: 'Pending', value: pending, color: '#545f73' },
      { label: 'Overdue', value: overdue, color: '#ba1a1a' }
    ];
  }

  /**
   * Export performance data as CSV-ready JSON rows
   */
  async getExportData(from, to) {
    const workerPerf = await this.getWorkerPerformance(from, to);
    return workerPerf.map(w => ({
      'Worker Name': w.name,
      'Role': w.role,
      'Total Tasks': w.totalTasks,
      'Completed': w.completed,
      'In Progress': w.inProgress,
      'Pending': w.pending,
      'Overdue': w.overdue,
      'Completion Rate (%)': w.completionRate,
      'Present Days': w.presentDays,
      'Absent Days': w.absentDays,
      'Leave Days': w.leaveDays,
      'Attendance Rate (%)': w.attendanceRate,
      'Performance Score': w.performanceScore,
      'Grade': w.grade
    }));
  }

  // ── private helpers ──

  _buildDateFilter(from, to) {
    const filter = {};
    if (from || to) {
      const dateRange = {};
      if (from) dateRange.$gte = new Date(from);
      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        dateRange.$lte = endDate;
      }
      filter.$gte = dateRange.$gte;
      filter.$lte = dateRange.$lte;
    }
    return filter;
  }
}

module.exports = new PerformanceService();
