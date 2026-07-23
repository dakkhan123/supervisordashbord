const taskService = require('../services/taskService');
const Worker = require('../models/Worker');

class TaskController {
  async getAllTasks(req, res, next) {
    try {
      // If user is a Worker, restrict to their assigned tasks
      if (req.user && req.user.role && req.user.role.toLowerCase() === 'worker') {
        const workerId = req.user.workerId;
        const tasks = await taskService.getMyTasks(workerId, req.query);
        return res.status(200).json({ success: true, count: tasks.length, data: tasks });
      }
      const tasks = await taskService.getAllTasks(req.query);
      res.status(200).json({ success: true, count: tasks.length, data: tasks });
    } catch (err) {
      next(err);
    }
  }

  async getMyTasks(req, res, next) {
    try {
      const workerId = req.user ? req.user.workerId : req.query.workerId;
      const tasks = await taskService.getMyTasks(workerId, req.query);
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
      const taskData = { ...req.body };
      if (!taskData.assignedBy) {
        if (req.user && req.user.workerId) {
          taskData.assignedBy = req.user.workerId;
        } else {
          // Fallback for seed scripts, tests, or legacy integrations
          if (taskData.assignedTo) {
            taskData.assignedBy = taskData.assignedTo;
          } else {
            const fallbackWorker = await Worker.findOne();
            if (fallbackWorker) {
              taskData.assignedBy = fallbackWorker._id;
            }
          }
        }
      }
      const task = await taskService.createTask(taskData);
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

  async updateChecklistItem(req, res, next) {
    try {
      const { taskId, itemId } = req.params;
      const { isCompleted } = req.body;
      const workerId = req.user ? req.user.workerId : null;
      const task = await taskService.updateChecklistItem(taskId, itemId, isCompleted, workerId);
      res.status(200).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }

  async submitCompletionNotes(req, res, next) {
    try {
      const task = await taskService.submitCompletionNotes(req.params.id, req.body);
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

