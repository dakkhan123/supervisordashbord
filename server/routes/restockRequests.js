const express = require('express');
const router = express.Router();
const restockRequestController = require('../controllers/restockRequestController');

router.route('/')
  .get(restockRequestController.getAllRequests)
  .post(restockRequestController.createRequest);

router.put('/:id/approve', restockRequestController.approveRequest);
router.put('/:id/reject', restockRequestController.rejectRequest);

module.exports = router;
