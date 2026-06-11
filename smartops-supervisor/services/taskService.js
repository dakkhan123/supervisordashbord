const Task = require('../models/Task');

class TaskService {
  async getAllTasks(queryParams) {
    const { status, assignedTo } = queryParams || {};
    let query = {};
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    return await Task.find(query).populate('assignedTo').sort({ createdAt: -1 });
  }

  async getTaskById(id) {
    const task = await Task.findById(id).populate('assignedTo');
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }
    return task;
  }

  async createTask(taskData) {
    return await Task.create(taskData);
  }

  async updateTask(id, taskData) {
    const task = await Task.findByIdAndUpdate(id, taskData, {
      new: true,
      runValidators: true
    }).populate('assignedTo');
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }
    return task;
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
