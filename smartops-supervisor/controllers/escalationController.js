const escalationService = require('../services/escalationService');

class EscalationController {
  async getAllEscalations(req, res, next) {
    try {
      const escalations = await escalationService.getAllEscalations();
      res.status(200).json({ success: true, count: escalations.length, data: escalations });
    } catch (err) {
      next(err);
    }
  }

  async getEscalationById(req, res, next) {
    try {
      const escalation = await escalationService.getEscalationById(req.params.id);
      res.status(200).json({ success: true, data: escalation });
    } catch (err) {
      next(err);
    }
  }

  async createEscalation(req, res, next) {
    try {
      const escalation = await escalationService.createEscalation(req.body);
      res.status(201).json({ success: true, data: escalation });
    } catch (err) {
      next(err);
    }
  }

  async updateEscalation(req, res, next) {
    try {
      const escalation = await escalationService.updateEscalation(req.params.id, req.body);
      res.status(200).json({ success: true, data: escalation });
    } catch (err) {
      next(err);
    }
  }

  async deleteEscalation(req, res, next) {
    try {
      await escalationService.deleteEscalation(req.params.id);
      res.status(200).json({ success: true, data: {} });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EscalationController();
