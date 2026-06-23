const taskService = require('../services/taskService');

class TaskController {
  async getAllTasks(req, res, next) {
    try {
      const tasks = await taskService.getAllTasks(req.query);
      res.status(200).json({ success: true, count: tasks.length, data: tasks });
    } catch (err) {
      next(err);
    }
  }

  async getTaskById(req, res, next) {
    try {
      const task = await taskService.getTaskById(req.params.id);
      res.status(200).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }

  async createTask(req, res, next) {
    try {
      const task = await taskService.createTask(req.body);
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }

  async updateTask(req, res, next) {
    try {
      const task = await taskService.updateTask(req.params.id, req.body);
      res.status(200).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }

  async deleteTask(req, res, next) {
    try {
      await taskService.deleteTask(req.params.id);
      res.status(200).json({ success: true, data: {} });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TaskController();
