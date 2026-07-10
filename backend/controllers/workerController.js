const workerService = require('../services/workerService');

class WorkerController {
  async getAllWorkers(req, res, next) {
    try {
      let workers = await workerService.getAllWorkers(req.query);
      const userRole = req.user ? req.user.role : '';
      const isAuthorized = userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'supervisor';
      
      if (!isAuthorized) {
        workers = workers.map(w => {
          const obj = w.toObject ? w.toObject() : JSON.parse(JSON.stringify(w));
          delete obj.salary;
          return obj;
        });
      }
      res.status(200).json({ success: true, count: workers.length, data: workers });
    } catch (err) {
      next(err);
    }
  }

  async getWorkerById(req, res, next) {
    try {
      let worker = await workerService.getWorkerById(req.params.id);
      const userRole = req.user ? req.user.role : '';
      const isAuthorized = userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'supervisor';
      
      if (!isAuthorized) {
        const obj = worker.toObject ? worker.toObject() : JSON.parse(JSON.stringify(worker));
        delete obj.salary;
        worker = obj;
      }
      res.status(200).json({ success: true, data: worker });
    } catch (err) {
      next(err);
    }
  }

  async createWorker(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      const isAuthorized = userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'supervisor';
      
      // If not authorized, block requests attempting to set the salary field
      if (req.body.salary !== undefined && !isAuthorized) {
        return res.status(403).json({
          message: 'Access denied: Cannot edit salary'
        });
      }

      let worker = await workerService.createWorker(req.body);
      
      if (!isAuthorized) {
        const obj = worker.toObject ? worker.toObject() : JSON.parse(JSON.stringify(worker));
        delete obj.salary;
        worker = obj;
      }
      res.status(201).json({ success: true, data: worker });
    } catch (err) {
      next(err);
    }
  }

  async updateWorker(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : '';
      const isAuthorized = userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'supervisor';
      
      // If not authorized, block requests attempting to modify the salary field
      if (req.body.salary !== undefined && !isAuthorized) {
        return res.status(403).json({
          message: 'Access denied: Cannot edit salary'
        });
      }

      let worker = await workerService.updateWorker(req.params.id, req.body);
      
      if (!isAuthorized) {
        const obj = worker.toObject ? worker.toObject() : JSON.parse(JSON.stringify(worker));
        delete obj.salary;
        worker = obj;
      }
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

