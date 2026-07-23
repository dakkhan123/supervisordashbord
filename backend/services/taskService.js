const Task = require('../models/Task');
const Notification = require('../models/Notification');
const Worker = require('../models/Worker');

class TaskService {
  async getAllTasks(queryParams) {
    const { status, assignedTo, priority } = queryParams || {};
    let query = {};
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (priority) query.priority = priority;
    return await Task.find(query)
      .populate('assignedTo')
      .populate('assignedBy')
      .sort({ createdAt: -1 });
  }

  async getMyTasks(workerId, queryParams) {
    const { status } = queryParams || {};
    let query = { assignedTo: workerId };
    if (status) query.status = status;
    return await Task.find(query)
      .populate('assignedTo')
      .populate('assignedBy')
      .sort({ createdAt: -1 });
  }

  async getTaskById(id) {
    const task = await Task.findById(id)
      .populate('assignedTo')
      .populate('assignedBy');
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }
    return task;
  }

  async createTask(taskData) {
    const task = await Task.create(taskData);
    const populatedTask = await Task.findById(task._id).populate('assignedTo');

    // Auto-create notification for assigned worker
    if (task.assignedTo) {
      const workerObj = await Worker.findById(task.assignedTo);
      await Notification.create({
        worker: task.assignedTo,
        user: workerObj ? workerObj.user : null,
        title: 'New Task Assigned',
        message: `You have been assigned: ${task.title || task.name}`,
        description: task.description || 'Task assignment',
        type: 'assignment',
        taskId: task._id.toString()
      });
    }

    return populatedTask;
  }

  async updateTask(id, taskData) {
    if (taskData.status === 'Completed' && !taskData.completedAt) {
      taskData.completedAt = new Date();
      taskData.progressPercent = 100;
      taskData.progress = 100;
    }

    const task = await Task.findByIdAndUpdate(id, taskData, {
      new: true,
      runValidators: true
    }).populate('assignedTo').populate('assignedBy');

    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }
    return task;
  }

  async updateChecklistItem(taskId, itemId, isCompleted, workerId) {
    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    const item = task.checklist.id(itemId);
    if (item) {
      item.isCompleted = isCompleted;
      item.completedAt = isCompleted ? new Date() : null;
      if (workerId) item.completedBy = workerId;

      // Recalculate progressPercent
      if (task.checklist.length > 0) {
        const completedCount = task.checklist.filter(i => i.isCompleted).length;
        const progress = Math.round((completedCount / task.checklist.length) * 100);
        task.progressPercent = progress;
        task.progress = progress;
      }
      await task.save();
    }
    return await Task.findById(taskId).populate('assignedTo').populate('assignedBy');
  }

  async submitCompletionNotes(taskId, notesData) {
    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    task.completionNotes = {
      completionDate: new Date(),
      ...notesData
    };
    task.status = 'Submitted for Verification';
    task.progressPercent = 100;
    task.progress = 100;
    await task.save();

    return await Task.findById(taskId).populate('assignedTo').populate('assignedBy');
  }

  async deleteTask(id) {
    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }
    return true;
  }
}

module.exports = new TaskService();

