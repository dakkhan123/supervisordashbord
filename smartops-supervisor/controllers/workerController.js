const workerService = require('../services/workerService');

class WorkerController {
  async getAllWorkers(req, res, next) {
    try {
      const workers = await workerService.getAllWorkers(req.query);
      res.status(200).json({ success: true, count: workers.length, data: workers });
    } catch (err) {
      next(err);
    }
  }

  async getWorkerById(req, res, next) {
    try {
      const worker = await workerService.getWorkerById(req.params.id);
      res.status(200).json({ success: true, data: worker });
    } catch (err) {
      next(err);
    }
  }

  async createWorker(req, res, next) {
    try {
      const worker = await workerService.createWorker(req.body);
      res.status(201).json({ success: true, data: worker });
    } catch (err) {
      next(err);
    }
  }

  async updateWorker(req, res, next) {
    try {
      const worker = await workerService.updateWorker(req.params.id, req.body);
      res.status(200).json({ success: true, data: worker });
    } catch (err) {
      next(err);
    }
  }

  async deleteWorker(req, res, next) {
    try {
      await workerService.deleteWorker(req.params.id);
      res.status(200).json({ success: true, data: {} });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WorkerController();
