const express = require('express');
const router = express.Router();
const escalationController = require('../controllers/escalationController');

router.route('/')
  .get(escalationController.getAllEscalations)
  .post(escalationController.createEscalation);

router.route('/:id')
  .get(escalationController.getEscalationById)
  .put(escalationController.updateEscalation)
  .delete(escalationController.deleteEscalation);

module.exports = router;
