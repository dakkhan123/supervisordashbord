const restockRequestService = require('../services/restockRequestService');

class RestockRequestController {
  // @desc    Get all restock requests
  // @route   GET /api/restock-requests
  async getAllRequests(req, res, next) {
    try {
      const requests = await restockRequestService.getAllRequests();
      res.status(200).json({
        success: true,
        count: requests.length,
        data: requests
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Create new restock request
  // @route   POST /api/restock-requests
  async createRequest(req, res, next) {
    try {
      const request = await restockRequestService.createRequest(req.body);
      res.status(201).json({
        success: true,
        data: request
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Approve a restock request
  // @route   PUT /api/restock-requests/:id/approve
  async approveRequest(req, res, next) {
    try {
      const request = await restockRequestService.approveRequest(req.params.id, req.body.op);
      res.status(200).json({
        success: true,
        data: request
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Reject a restock request
  // @route   PUT /api/restock-requests/:id/reject
  async rejectRequest(req, res, next) {
    try {
      const request = await restockRequestService.rejectRequest(req.params.id);
      res.status(200).json({
        success: true,
        data: request
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RestockRequestController();
