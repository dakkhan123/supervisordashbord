const Worker = require('../models/Worker');

class WorkerService {
  async getAllWorkers(queryParams) {
    const { status, role } = queryParams || {};
    let query = {};
    if (status) query.status = status;
    if (role) query.role = role;
    return await Worker.find(query).sort({ createdAt: -1 });
  }

  async getWorkerById(id) {
    const worker = await Worker.findById(id);
    if (!worker) {
      const error = new Error('Worker not found');
      error.statusCode = 404;
      throw error;
    }
    return worker;
  }

  async createWorker(workerData) {
    return await Worker.create(workerData);
  }

  async updateWorker(id, workerData) {
    const worker = await Worker.findByIdAndUpdate(id, workerData, {
      new: true,
      runValidators: true
    });
    if (!worker) {
      const error = new Error('Worker not found');
      error.statusCode = 404;
      throw error;
    }
    return worker;
  }

  async deleteWorker(id) {
    const worker = await Worker.findByIdAndDelete(id);
    if (!worker) {
      const error = new Error('Worker not found');
      error.statusCode = 404;
      throw error;
    }
    return true;
  }
}

module.exports = new WorkerService();
